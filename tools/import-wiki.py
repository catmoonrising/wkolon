#!/usr/bin/env python3
"""Import pinned wiki presentation, never infer executable mechanics from prose.

Network refresh: python tools/import-wiki.py
Repeat captured import: python tools/import-wiki.py --offline
Compile reviewed mechanics: python tools/compile-core.py
"""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / '.build'
CATEGORIES = {
    'Species': 'species', 'Feats': 'feat', 'Talent Trees': 'talentTree',
    'Weapons': 'weapon', 'Armor': 'armor', 'General Equipment': 'gear',
    'Force Powers': 'forcePower', 'Prestige Classes': 'prestigeClass',
}
SKILLS = ['Acrobatics', 'Climb', 'Deception', 'Endurance', 'Gather Information',
    'Initiative', 'Jump', 'Knowledge', 'Mechanics', 'Perception', 'Persuasion',
    'Pilot', 'Ride', 'Stealth', 'Survival', 'Swim', 'Treat Injury', 'Use Computer', 'Use the Force']
CLASSES = ['Jedi', 'Noble', 'Scoundrel', 'Scout', 'Soldier']


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


wiki = module('wiki_fetch', 'wiki-articles.py')
presentation = module('wiki_presentation', 'compile-wiki-articles.py')


def slug(value):
    return re.sub(r'[^a-z0-9]+', '-', value.lower()).strip('-')


def text(node):
    return node if isinstance(node, str) else ''.join(text(c) for c in node['children'])


def heading(node, rank=None):
    return isinstance(node, dict) and node['tag'] in {'h2', 'h3', 'h4', 'h5'} and (rank is None or node['tag'] == 'h' + str(rank))


def section(blocks, name):
    start = next((i for i, n in enumerate(blocks) if heading(n) and text(n).strip() == name), None)
    if start is None:
        raise ValueError('Missing section: ' + name)
    rank = int(blocks[start]['tag'][1])
    end = next((i for i in range(start + 1, len(blocks)) if heading(blocks[i]) and int(blocks[i]['tag'][1]) <= rank), len(blocks))
    result = blocks[start + 1:end]
    if not any(text(n).strip() for n in result):
        raise ValueError('Empty section: ' + name)
    return result


def core_talents(blocks):
    """Headings, not guessed talent names or prose, determine section boundaries."""
    scope = None
    for i, n in enumerate(blocks):
        if heading(n, 2):
            label = re.sub(r'\s+', '', text(n)).lower()
            scope = 'core' if label == 'coretalents' else None
        elif scope == 'core' and heading(n, 3):
            yield text(n).strip(), section(blocks, text(n).strip())


def category(name):
    members, continuation = [], {}
    while True:
        result = wiki.api(action='query', list='categorymembers', cmtitle='Category:' + name,
            cmlimit='500', **continuation)
        members.extend(result['query']['categorymembers'])
        continuation = result.get('continue', {})
        if not continuation:
            return members


def discover():
    core = {m['title'] for m in category('Core Rulebook') if m['ns'] == 0}
    return {name: sorted(m['title'] for m in category(name) if m['ns'] == 0 and m['title'] in core)
        for name in CATEGORIES}


def compile_catalog(inventory, pages, redirects, baseline):
    sources, rule_pages, records = {}, {}, {}
    aliases = {r['from']: r for r in redirects}

    def source(title, part=None):
        p = pages[title]
        rev = p['revisions'][0]
        sid = 'source:wiki-' + slug(title) + ('-' + slug(part) if part else '')
        fragment = '#' + quote(part.replace(' ', '_')) if part else ''
        raw = rev['slots']['main']['content']
        sources[sid] = dict(id=sid, title=title, section=part, revision=rev['revid'], timestamp=rev['timestamp'],
            sha256=hashlib.sha256(raw.encode()).hexdigest(),
            url=f"https://swse.miraheze.org/w/index.php?oldid={rev['revid']}" + fragment,
            history='https://swse.miraheze.org/w/index.php?title=' + quote(title) + '&action=history')
        return sid

    targets = {title: 'rule:' + slug(title) for title in pages if not title.startswith('Category:')}
    targets.update({r['name']: r['id'] for r in baseline.get('rulePages', [])})
    # Local links to individual talents resolve to their section, not the whole tree.
    for title in inventory['Talent Trees']:
        blocks = presentation.article(ROOT, title, pages, lambda _: 'unused', {})['blocks']
        for name, _ in core_talents(blocks):
            targets[name] = 'rule:' + slug(name)
    for old in baseline['sources']:
        if old.get('section'):
            name = next((r['name'] for kind in ['feats','talents'] for r in baseline[kind] if r['sourceId'] == old['id']), old['section'])
            targets[name] = 'rule:' + slug(name)
    for alias in redirects:
        if alias['from'] in targets:
            continue
        if alias.get('tofragment') in targets:
            targets[alias['from']] = targets[alias['tofragment']]
        elif alias['to'] in targets:
            targets[alias['from']] = targets[alias['to']]

    def add_page(name, title=None, part=None, rule_id=None):
        title = title or name
        alias = aliases.get(title, {})
        part = part or alias.get('tofragment')
        title = alias.get('to', title)
        rid = rule_id or targets.get(name, 'rule:' + slug(name))
        full = presentation.article(ROOT, title, pages, source, targets)
        blocks = section(full['blocks'], part) if part else full['blocks']
        first = next((n for n in blocks if text(n).strip()), None)
        if part and (first is None or not text(first).strip().startswith('Reference Book')):
            # A Core talent inherits the tree's book attribution, not the next
            # talent's reference or an unrelated Additional section's book.
            inherited = next((n for n in full['blocks'] if isinstance(n, dict) and n['tag'] == 'p'
                and text(n).strip().startswith('Reference Book')), None)
            if inherited:
                blocks = [inherited] + blocks
        sid = source(title, part)
        rule_pages[rid] = dict(id=rid, name=name, sourceId=sid, article=dict(sourceId=sid, blocks=blocks))
        return rid, sid

    def add_record(kind, name, title=None, part=None, **extra):
        rid, sid = add_page(name, title, part)
        raw = pages[title or name]['revisions'][0]['slots']['main']['content']
        # Book labels are provenance, not precedence decisions. Species may contain variants.
        books = sorted(set(re.findall(r'\[\[([^\]|]+)(?:\|[^\]]*)?\]\]', '\n'.join(
            line for line in raw.splitlines() if 'Reference Book' in line))))
        record = dict(id='catalog:' + slug(kind) + '-' + slug(name), name=name, kind=kind,
            ruleId=rid, sourceId=sid, books=['Core Rulebook'] if kind == 'talent' else books, **extra)
        records[record['id']] = record

    for category_name, kind in CATEGORIES.items():
        for name in inventory.get(category_name, []):
            add_record(kind, name)
            if kind == 'talentTree':
                blocks = rule_pages[targets[name]]['article']['blocks']
                raw = pages[name]['revisions'][0]['slots']['main']['content']
                class_ids = ['class:' + slug(c) for c in CLASSES if '[[Category:' + c + ' Talent Trees]]' in raw]
                for talent, _ in core_talents(blocks):
                    add_record('talent', talent, name, talent, tree='tree:' + slug(name.replace(' Talent Tree','')),
                        classIds=class_ids)
    for name in SKILLS:
        add_record('skill', name)
    for name in CLASSES:
        add_record('class', name)
    add_record('feat', 'Weapon Proficiency')

    # Retain previously available supplement references and stable link IDs.
    for old in baseline.get('rulePages', []):
        src = next(s for s in baseline['sources'] if s['id'] == old['sourceId'])
        add_page(old['name'], src['title'], src.get('section'), old['id'])
    for kind in ['species', 'feats', 'talents', 'equipment', 'classes']:
        for r in baseline[kind]:
            src = next(s for s in baseline['sources'] if s['id'] == r['sourceId'])
            add_page(r['name'], src['title'], src.get('section'), 'rule:' + slug(r['name']))
    collections = {'species':'species', 'class':'classes', 'skill':'skills', 'feat':'feats',
        'talent':'talents', 'weapon':'equipment', 'armor':'equipment', 'gear':'equipment'}
    old_sources = {s['id']:s for s in baseline['sources']}
    for item in records.values():
        item['mechanicsIds'] = []
        for r in baseline.get(collections.get(item['kind'], ''), []):
            same_name = r['name'] == item['name']
            same_skill_family = item['kind'] == 'skill' and item['name'] == 'Knowledge' and r['name'].startswith('Knowledge (')
            same_source_family = item['kind'] in {'feat','gear'} and old_sources[r['sourceId']]['title'] == sources[item['sourceId']]['title']
            if same_name or same_skill_family or same_source_family:
                item['mechanicsIds'].append(r['id'])

    # Downloaded sources can link to rules outside this batch. Keep those as wiki links.
    def prune(node):
        if isinstance(node, str):
            return
        if node.get('ruleId') not in rule_pages:
            node.pop('ruleId', None)
        for child in node['children']:
            prune(child)
    for page in rule_pages.values():
        for node in page['article']['blocks']:
            prune(node)
    return dict(schemaVersion=1, book='Core Rulebook',
        sources=sorted(sources.values(), key=lambda r:r['id']),
        records=sorted(records.values(), key=lambda r:(r['kind'], r['name'])),
        rulePages=sorted(rule_pages.values(), key=lambda r:r['id']))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true', help='Use captured snapshots and pinned parse files')
    args = parser.parse_args()
    baseline = json.loads((ROOT / 'data/core.json').read_text())
    inventory_path = BUILD / 'import/inventory.json'
    inventory_path.parent.mkdir(parents=True, exist_ok=True)
    if args.offline:
        inventory = json.loads(inventory_path.read_text())
        snapshots = [json.loads(path.read_text()) for path in [BUILD / 'core-import-snapshot.json', BUILD / 'core-import-extra-snapshot.json']]
    else:
        inventory = discover()
        inventory_path.write_text(json.dumps(inventory, indent=2) + '\n')
        titles = set(SKILLS + CLASSES + ['Weapon Proficiency'])
        titles.update(name for names in inventory.values() for name in names)
        titles.update(s['title'] for s in baseline['sources'])
        snapshots = [wiki.snapshot(sorted(titles), 'core-import-snapshot.json')]
    pages = {p['title']:p for snap in snapshots for p in snap['query']['pages']}
    redirects = [r for snap in snapshots for r in snap['query'].get('redirects', [])]
    if not args.offline:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            list(pool.map(wiki.fetch_parse, pages.values()))
    catalog = compile_catalog(inventory, pages, redirects, baseline)
    (ROOT / 'data/wiki-catalog.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('Imported', {kind:sum(r['kind'] == kind for r in catalog['records']) for kind in sorted({r['kind'] for r in catalog['records']})})


if __name__ == '__main__':
    main()
