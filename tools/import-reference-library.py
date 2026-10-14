#!/usr/bin/env python3
"""Resume revision-pinned imports from all official sourcebook categories.

python tools/import-reference-library.py [--limit 100] [--offline]
Refresh categories separately with tools/discover-books.py. No mechanics change.
"""
import argparse
import concurrent.futures
import hashlib
import importlib.util
import json
import re
import time
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / '.build/reference'
OUTPUT = ROOT / 'data/reference'


def module(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


wiki = module('reference_fetch', 'wiki-articles.py')
presentation = module('reference_presentation', 'compile-wiki-articles.py')
coverage = module('reference_coverage', 'discover-books.py')


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def identity(title):
    return 'reference:' + digest(title)[:16]


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n')
    tmp.replace(path)


def candidates(snapshot):
    categories = snapshot['categories']
    excluded, _ = coverage.descendants(categories, coverage.HOMEBREW_ROOT)
    books = {}
    for book in categories[coverage.BOOK_ROOT]:
        if book['ns'] != 14:
            continue
        for member in categories[book['title']]:
            if member['ns'] == 0 and member['title'] not in excluded:
                books.setdefault(member['title'], []).append(book['title'].removeprefix('Category:'))
    return {title: sorted(set(values)) for title, values in sorted(books.items())}, excluded


def is_homebrew(page, excluded):
    raw = page['revisions'][0]['slots']['main']['content']
    return page['title'] in excluded or bool(re.search(r'\[\[Category:Homebrew[ _]Content(?:\|[^\]]*)?\]\]', raw, re.I)) or any(
        'homebrew' in line.lower() for line in raw.splitlines() if 'Reference Book' in line)


def source(page):
    rev = page['revisions'][0]
    return dict(id='source:reference-' + digest(page['title'])[:16], title=page['title'],
        revision=rev['revid'], timestamp=rev['timestamp'],
        sha256=digest(rev['slots']['main']['content']),
        url=f"https://swse.miraheze.org/w/index.php?oldid={rev['revid']}",
        history='https://swse.miraheze.org/w/index.php?title=' + quote(page['title']) + '&action=history')


def parse_path(page):
    return BUILD / ('parse-' + digest(page['title'])[:16] + '-' + str(page['revisions'][0]['revid']) + '.json')


def fetch_parse(page):
    path = parse_path(page)
    if path.exists():
        parsed = json.loads(path.read_text())
        if parsed['title'] == page['title'] and parsed['revision'] == page['revisions'][0]['revid']:
            return
    old_path = ROOT / '.build' / ('article-' + wiki.slug(page['title']) + '-parse.json')
    if old_path.exists():
        old = json.loads(old_path.read_text())
        if old.get('title') == page['title'] and old.get('revision') == page['revisions'][0]['revid']:
            write_json(path, old)
            return
    rev = page['revisions'][0]['revid']
    result = wiki.api(action='parse', oldid=rev, prop='text|sections', disabletoc=1, disableeditsection=1)
    if result['parse']['revid'] != rev:
        raise ValueError('Parse revision mismatch: ' + page['title'])
    write_json(path, dict(title=page['title'], revision=rev, result=result))


def kind(page):
    raw = page['revisions'][0]['slots']['main']['content']
    categories = set(re.findall(r'\[\[Category:([^\]|]+)', raw))
    kinds = {'Species':'species', 'Feats':'feat', 'Talent Trees':'talentTree',
        'Weapons':'weapon', 'Armor':'armor', 'General Equipment':'gear',
        'Force Powers':'forcePower', 'Prestige Classes':'prestigeClass', 'Skills':'skill'}
    found = {value for key, value in kinds.items() if key in categories}
    return next(iter(found)) if len(found) == 1 else 'reference'


def compile_library(snapshot, book_map, pages, aliases, excluded, failures):
    """Compile captured references; unresolved or excluded titles stay explicit."""
    records, excluded_titles, pending = [], list(excluded), []
    ready = {title: page for title, page in pages.items() if parse_path(page).exists() and not is_homebrew(page, excluded)}
    # Only whole-page targets: sections and tabs retain their wiki fragment link.
    targets = {title: identity(title) for title in ready}
    for alias, target in aliases.items():
        if target in ready:
            targets[alias] = identity(target)
    def convert_links(node):
        if isinstance(node, str):
            return
        if node.get('ruleId', '').startswith('reference:'):
            node['referenceId'] = node.pop('ruleId')
        for child in node['children']:
            convert_links(child)
    canonical_books = {}
    for title, books in book_map.items():
        target = aliases.get(title, title)
        page = pages.get(target)
        if page and is_homebrew(page, excluded):
            excluded_titles.append(title)
        elif target not in ready:
            pending.append(dict(title=title, error=failures.get(target, failures.get(title, 'Not fetched'))))
        else:
            canonical_books.setdefault(target, set()).update(books)
    for title, books in sorted(canonical_books.items()):
        page = ready[title]
        src = source(page)
        article = presentation.article(ROOT, title, ready, lambda _:src['id'], targets, parse_path=parse_path(page))
        for block in article['blocks']:
            convert_links(block)
        value = dict(schemaVersion=1, id=identity(title), name=title, source=src, article=article)
        encoded = json.dumps(value, ensure_ascii=False, separators=(',', ':')) + '\n'
        filename = digest(encoded) + '.json'
        OUTPUT.mkdir(parents=True, exist_ok=True)
        path = OUTPUT / filename
        if not path.exists():
            path.write_text(encoded)
        text = lambda n: n if isinstance(n, str) else ' '.join(text(c) for c in n['children'])
        search = re.sub(r'\s+', ' ', ' '.join(text(n) for n in article['blocks'])).strip()
        record_aliases = sorted(name for name in book_map if name != title and aliases.get(name) == title)
        records.append(dict(id=value['id'], name=title, aliases=record_aliases, kind=kind(page), books=sorted(books),
            source=src, path='data/reference/' + filename, searchText=search))
    index = dict(schemaVersion=1, capturedAt=snapshot['capturedAt'],
        license=dict(name='CC BY-SA 4.0', url='https://creativecommons.org/licenses/by-sa/4.0/',
            attribution='Star Wars Saga Edition wiki contributors',
            changes='Official wiki wording and formatting retained; marked Homebrew sections, images, scripts, comments and site navigation omitted.'),
        records=records, pending=pending, excluded=sorted(set(excluded_titles)),
        candidates=len(book_map))
    write_json(ROOT / 'data/reference-index.json', index)
    return index


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--limit', type=int, default=0, help='Maximum additional title captures; zero means all')
    parser.add_argument('--workers', type=int, default=3, choices=range(1, 5))
    args = parser.parse_args()
    BUILD.mkdir(parents=True, exist_ok=True)
    if not (ROOT / '.build/wiki-category-snapshot.json').exists():
        raise SystemExit('Capture source categories first: python3 tools/discover-books.py')
    snapshot = json.loads((ROOT / '.build/wiki-category-snapshot.json').read_text())
    book_map, excluded = candidates(snapshot)
    capture_path = BUILD / 'capture.json'
    if args.offline and not capture_path.exists():
        raise SystemExit('Offline import needs captured revisions; run this importer online first')
    capture = json.loads(capture_path.read_text()) if capture_path.exists() else dict(pages={}, aliases={}, failures={})
    pages, aliases, failures = capture['pages'], capture['aliases'], capture['failures']
    wanted = [title for title in book_map if aliases.get(title, title) not in pages]
    if args.limit:
        wanted = wanted[:args.limit]
    started = time.monotonic()
    if not args.offline:
        for start in range(0, len(wanted), 40):
            batch = wanted[start:start + 40]
            response = wiki.api(action='query', prop='revisions', titles='|'.join(batch), rvslots='main', rvprop='ids|timestamp|content', redirects=1)
            for entry in response['query'].get('normalized', []) + response['query'].get('redirects', []):
                aliases[entry['from']] = entry['to']
            # Resolve redirect chains without silently accepting cycles.
            for alias in list(aliases):
                seen, target = {alias}, aliases[alias]
                while target in aliases:
                    if target in seen:
                        raise ValueError('Redirect cycle: ' + alias)
                    seen.add(target)
                    target = aliases[target]
                aliases[alias] = target
            for page in response['query']['pages']:
                if not page.get('revisions'):
                    failures[page['title']] = 'Wiki page missing'
                else:
                    pages[page['title']] = page
            write_json(capture_path, capture)
            print('Captured', min(start+40, len(wanted)), '/', len(wanted), 'new titles', flush=True)
        parse_wanted = [p for p in pages.values() if not is_homebrew(p, excluded) and not parse_path(p).exists()]
        def fetch(page):
            try:
                fetch_parse(page)
                return page['title'], None
            except Exception as error:
                return page['title'], str(error)
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            for count, (title, error) in enumerate(pool.map(fetch, parse_wanted), 1):
                if error:
                    failures[title] = error
                else:
                    failures.pop(title, None)
                print('Parsed', count, '/', len(parse_wanted), title, 'ERROR '+error if error else '', flush=True)
                if count % 25 == 0:
                    write_json(capture_path, capture)
        write_json(capture_path, capture)
    index = compile_library(snapshot, book_map, pages, aliases, excluded, failures)
    print(json.dumps(dict(imported=len(index['records']), pending=len(index['pending']), excluded=len(index['excluded']), elapsedSeconds=round(time.monotonic()-started,1))), flush=True)


if __name__ == '__main__':
    main()
