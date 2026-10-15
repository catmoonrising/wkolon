#!/usr/bin/env python3
"""Review/import pinned class and common Force talents without inferred effects.

Run without --apply to write .build/talent-catalog-review.json. The cached wiki
capture and parse files come from the existing reference import pipeline.
"""
import argparse
import collections
import copy
import hashlib
import importlib.util
import json
import re
import shutil
import unicodedata
from pathlib import Path
from urllib.parse import quote, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / '.build'
GROUPS = {'advanced melee weapons':'advanced-melee-weapons','heavy weapons':'heavy-weapons','lightsabers':'lightsabers','pistols':'pistols','rifles':'rifles','simple weapons':'simple-weapons'}
ABILITIES = dict(strength='str', dexterity='dex', constitution='con', intelligence='int', wisdom='wis', charisma='cha')
SHARED_REPRINTS = {'Multiattack Proficiency (Rifles)', 'Multiattack Proficiency (Advanced Melee Weapons)'}
TREE_RULES = {'Dark Side Talent Tree','Light Side Talent Tree','Gand Findsman Talent Tree','Imperial Inquisitor Talent Tree','Gunslinger Talent Tree','Implant Talent Tree','Inspiration Talent Tree','Leadership Talent Tree','Squad Leadership Talent Tree','Squadron Leader Talent Tree','Wingman Talent Tree'}
CHOICES = {
 'Signature Item':('manual','Item','choice'),
 'Vehicle Focus':('enum','Vehicle','never'),
 'Accurate Blow':('weaponGroup','Weapon','never'),
 'Disarming Attack':('weaponGroup','Weapon','never'),
 'Force Exertion':('power','Force power','choice'),
 'Flurry Attack':('weaponGroup','Weapon','choice'),
 'Brutal Attack':('weapon','Weapon','choice'),
 'Share Force Secret':('manual','Force Secret','never'),
 'Share Force Technique':('manual','Force Technique','never'),
 'Share Jedi Talent':('manual','Talent','choice'),
 'Coordinated Leadership':('manual','Talent','never'),
 'Mandalorian Ferocity':('weaponGroup','Weapon','choice'),
 'Done It All':('manual','Talents','never'),
 'Stolen Form':('manual','Talent','choice'),
 'Squadron Maneuvers':('manual','Talent','never'),
 'Assured Skill':('skill','Skill','choice'),
 'Exceptional Skill':('skill','Skill','choice'),
 'Skill Boon':('skill','Skill','choice'),
 'Skill Confidence':('skill','Skill','choice'),
 'Skillful Recovery':('skill','Skill','choice'),
}
TRAINED_CHOICES = {'Exceptional Skill','Skill Boon','Skill Confidence','Skillful Recovery'}
MANUAL_CHOICE_REQUIREMENTS = {'Brutal Attack','Share Force Secret','Share Force Technique','Share Jedi Talent','Coordinated Leadership','Done It All','Stolen Form','Squadron Maneuvers'}
FORCE_ACTIVATION = {
 'Adversary Lore':'check', 'Entreat Aid':'forcePoint',
 'Visionary Attack':'check', 'Visionary Defense':'check',
 'WatchCircle Initiate':'check', 'Exposing Strike':'forcePoint',
 'Grenade Defense':'check', 'Dampen Presence':'check',
 'Dark Retaliation':'forcePoint',
}


def load_module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def slug(value):
    return re.sub('[^a-z0-9]+', '-', value.lower()).strip('-')


def text(node):
    return node if isinstance(node, str) else ''.join(text(c) for c in node.get('children', []))


def normalized(value):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFKC', value).replace('’', "'").replace('_', ' ')).strip().casefold()


def clean(node):
    if isinstance(node, list):
        return [clean(n) for n in node]
    if isinstance(node, dict):
        return {k:clean(v) for k,v in node.items() if k != 'referenceId'}
    return node


def nodes(items):
    for node in items:
        if isinstance(node, dict):
            yield node
            yield from nodes(node.get('children', []))


def sections(article):
    blocks = article['blocks']
    headings = [(i, text(n).strip(), int(n['tag'][1])) for i, n in enumerate(blocks) if isinstance(n, dict) and re.fullmatch('h[2-5]', n['tag'])]
    inherited = next((clean(n) for n in blocks if isinstance(n, dict) and n['tag'] == 'p' and text(n).strip().startswith('Reference Book')), None)
    scope = ''
    for start, name, rank in headings:
        if rank == 2:
            scope = name
        if rank != 3:
            continue
        end = next((i for i, _, r in headings if i > start and r <= rank), len(blocks))
        body = [clean(n) for n in blocks[start + 1:end]]
        if not any(text(n).strip() for n in body):
            raise ValueError('Empty talent: ' + name)
        # Rename notices may precede a talent's actual book. Counseling is a
        # later subheading and must not replace a Core talent's main attribution.
        main = body[:next((i for i, n in enumerate(body) if isinstance(n, dict) and n['tag'] in ['h4','h5']), len(body))]
        if inherited and not any(isinstance(n, dict) and n['tag'] == 'p' and text(n).strip().startswith('Reference Book') for n in main):
            body.insert(0, inherited)
        yield dict(name=name, scope=scope, blocks=body)


def split_top(value, separator):
    depth, result, start, i = 0, [], 0, 0
    while i < len(value):
        if value[i] == '(':
            depth += 1
        elif value[i] == ')':
            depth -= 1
        if depth == 0 and value[i:i + len(separator)].casefold() == separator:
            result.append(value[start:i].strip());start = i + len(separator);i = start;continue
        i += 1
    result.append(value[start:].strip())
    return result


def strip_outer(value):
    while value.startswith('(') and value.endswith(')'):
        depth, whole = 0, True
        for i, char in enumerate(value):
            depth += (char == '(') - (char == ')')
            if depth == 0 and i != len(value) - 1:
                whole = False;break
        if not whole:
            break
        value = value[1:-1].strip()
    return value


class PrerequisiteParser:
    def __init__(self, mechanics, rows, sources):
        self.names = collections.defaultdict(list)
        self.hrefs = collections.defaultdict(list)
        self.skills = {normalized(r['name']):r['id'] for r in mechanics['skills']}
        self.species = {normalized(r['name'].split(' (')[0]):r['name'].split(' (')[0] for r in mechanics['species']}
        features = [(kind, r) for kind, key in [('feat','feats'),('talent','talents'),('power','forcePowers')] for r in mechanics.get(key, [])]
        features += [('talent', r['record']) for r in rows if not r['existing'] and not r['reprint']]
        by_id = {r['id']:(kind,r) for kind,r in features}
        for kind, record in features:
            source = sources[record['sourceId']]
            item = (kind, record)
            self.names[normalized(record['name'])].append(item)
            self.hrefs[(normalized(source['title']), normalized(source.get('section') or ''))].append(item)
        for row in rows:
            self.hrefs[(normalized(row['treeTitle']), normalized(row['name']))].append(by_id[row['record']['id']])
        for key, items in list(self.names.items()):
            self.names[key] = list({r['id']:(kind,r) for kind,r in items}.values())
        for key, items in list(self.hrefs.items()):
            self.hrefs[key] = list({r['id']:(kind,r) for kind,r in items}.values())

    def lookup(self, href, label):
        url = urlparse(href)
        title = unquote(url.path.split('/wiki/', 1)[-1]).replace('_', ' ')
        fragment = unquote(url.fragment).replace('_', ' ')
        found = self.hrefs.get((normalized(title), normalized(fragment)), [])
        if len(found) == 1:
            return found[0]
        found = self.names.get(normalized(title), []) or self.names.get(normalized(label), [])
        return found[0] if len(found) == 1 else None

    def feature(self, item, parameter=None, choice_type=None):
        kind, record = item
        if parameter is None:
            if kind == 'talent' and record.get('repeatGroup') and record.get('weaponGroup'):
                return dict(kind='talentChoice', value=record['repeatGroup'], choice=record['weaponGroup'])
            return dict(kind=kind, value=record['id'])
        parameter = normalized(parameter).removeprefix('for ')
        if parameter == 'any':
            return self.feature(item)
        if record['id'] == 'feat:skill-focus' and parameter in self.skills:
            return dict(kind='featChoice', value=record['id'], choice=self.skills[parameter])
        if record['id'] == 'feat:weapon-focus' and parameter in GROUPS:
            return dict(kind='focusChoice', value=GROUPS[parameter])
        if kind == 'talent' and parameter in GROUPS and record.get('choiceType') == 'weaponGroup':
            return dict(kind='talentChoice', value=record['id'], choice=GROUPS[parameter])
        if kind == 'talent' and choice_type == 'skill' and parameter in ['chosen skill', 'same skill']:
            return dict(kind='talentChoice', value=record['id'], choice='$choice')
        raise ValueError('Unmapped feature option: ' + record['name'] + ' (' + parameter + ')')

    def parse(self, passages, choice_type=None):
        tokens = {}
        def render(node):
            if isinstance(node, str):
                return node
            if node['tag'] == 'a':
                label = text(node).strip()
                item = self.lookup(node.get('href',''), label)
                if item:
                    token = '@@' + str(len(tokens)) + '@@';tokens[token] = item
                    suffix = label[label.find('('):] if item[1].get('choiceType') and '(' in label and '(' not in item[1]['name'] else ''
                    return token + suffix
            return ''.join(render(c) for c in node.get('children', []))
        def skill_list(value):
            value = re.sub(r'\s+skills?$', '', value.strip(), flags=re.I)
            if normalized(value) in ['knowledge (any)', 'any knowledge', 'one knowledge skill', 'any knowledge skill']:
                return dict(kind='any', requirements=[dict(kind='trained', value=id) for name,id in self.skills.items() if name.startswith('knowledge (')])
            comma = split_top(value, ',')
            if len(comma) > 1:
                op = 'any' if comma[-1].lower().startswith('or ') else 'all'
                return dict(kind=op, requirements=[skill_list(re.sub(r'^(?:and|or)\s+', '', part, flags=re.I)) for part in comma])
            both, either = split_top(value, ' and '), split_top(value, ' or ')
            if len(both) > 1 and len(either) > 1:
                raise ValueError('Mixed skill conjunction')
            parts, op = (both, 'all') if len(both) > 1 else (either, 'any')
            if len(parts) > 1:
                return dict(kind=op, requirements=[skill_list(part) for part in parts])
            id = self.skills.get(normalized(value))
            if not id:
                raise ValueError('Unmapped skill: ' + value)
            return dict(kind='trained', value=id)
        def expression(value):
            value = strip_outer(value.strip().rstrip('.'))
            if not value or normalized(value) == 'none':
                return dict(kind='all', requirements=[])
            if choice_type == 'weaponGroup' and normalized(value) == 'weapon proficiency (chosen weapon)':
                return dict(kind='proficientChoice', value='$choice')
            if match := re.fullmatch(r'Trained\s+in\s+(.+)', value, re.I):
                try:
                    return skill_list(match[1])
                except ValueError:
                    pass
            # A feature name can itself contain 'and' or 'or'. Resolve the
            # entire feature before treating those words as conjunctions.
            match = re.fullmatch(r'(@@\d+@@)(?:\s*\((.*)\))?', value)
            if match:
                return self.feature(tokens[match[1]], match[2], choice_type)
            found = self.names.get(normalized(value), [])
            if len(found) == 1:
                return self.feature(found[0])
            parts = split_top(value, ',')
            if len(parts) > 1:
                op = 'any' if parts[-1].lower().startswith('or ') else 'all'
                return dict(kind=op, requirements=[expression(re.sub(r'^(?:and|or)\s+', '', part, flags=re.I)) for part in parts])
            both, either = split_top(value, ' and '), split_top(value, ' or ')
            if len(both) > 1 and len(either) > 1:
                raise ValueError('Mixed prerequisite conjunction')
            parts, op = (both, 'all') if len(both) > 1 else (either, 'any')
            if len(parts) > 1:
                return dict(kind=op, requirements=[expression(part) for part in parts])
            if match := re.fullmatch(r'(@@\d+@@)(?:\s*\((.*)\))?', value):
                return self.feature(tokens[match[1]], match[2], choice_type)
            if match := re.fullmatch(r'(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma)\s+(\d+)', value, re.I):
                return dict(kind='ability', value=ABILITIES[match[1].lower()], min=int(match[2]))
            if match := re.fullmatch(r'Base Attack Bonus\s+(?:of\s+)?\+?(\d+)', value, re.I):
                return dict(kind='bab', min=int(match[1]))
            if match := re.fullmatch(r'(?:Heroic|Character) Level\s+(\d+)', value, re.I):
                return dict(kind='level', min=int(match[1]))
            key = normalized(value)
            if key == 'droid':return dict(kind='droid')
            if key in ['cannot be a droid','not a droid','non-droid']:return dict(kind='nonDroid')
            if key == 'rage':return dict(kind='trait', value='rage')
            if key in self.species:return dict(kind='species', value=self.species[key])
            found = self.names.get(key, [])
            if len(found) == 1:return self.feature(found[0])
            for name, items in self.names.items():
                if len(items) == 1 and key.startswith(name + ' (') and key.endswith(')'):
                    return self.feature(items[0], key[len(name) + 2:-1], choice_type)
            raise ValueError('Unmapped prerequisite: ' + value)
        def partial(value):
            try:
                return expression(value), []
            except ValueError as error:
                value = strip_outer(value.strip().rstrip('.'))
                comma = split_top(value, ',')
                both, either = split_top(value, ' and '), split_top(value, ' or ')
                parts = comma if len(comma) > 1 and not comma[-1].lower().startswith('or ') else both if len(both) > 1 and len(either) == 1 else []
                if parts:
                    children = [partial(re.sub(r'^and\s+', '', part, flags=re.I)) for part in parts]
                    return dict(kind='all', requirements=[p for p, _ in children if p]), [e for _, errors in children for e in errors]
                # Possessing the feature is necessary even when a particular
                # secondary choice still needs confirmation. An unresolved OR
                # keeps the entire alternative manual, never just one branch.
                if match := re.fullmatch(r'(@@\d+@@)\s*\((.*)\)', value):
                    return self.feature(tokens[match[1]]), [str(error)]
                return None, [str(error)]
        result, manual, failures = [], [], []
        for passage in passages:
            value = re.sub(r'\s+', ' ', render(passage)).strip()
            value = re.sub(r'^Prerequisites?\s*:\s*', '', value, flags=re.I)
            requirement, errors = partial(value)
            if requirement:result.append(requirement)
            if errors:
                manual.append(text(passage).strip());failures.extend(errors)

        return dict(kind='all', requirements=result), manual, failures


def collect(mechanics, references, capture):
    sources = {s['id']:s for s in mechanics['sources']}
    existing = collections.defaultdict(list)
    for record in mechanics['talents']:
        source = sources[record['sourceId']]
        existing[(source['title'], source.get('section'))].append(record)
    classes = {c['name']:c for c in mechanics['classes']}
    rows, trees = [], []
    for reference in references:
        if reference['kind'] != 'talentTree':continue
        title = reference['name'];raw = capture[title]['revisions'][0]['slots']['main']['content']
        categories = re.findall(r'\[\[Category:([^]|]+)', raw)
        assigned = [name for name in classes if name + ' Talent Trees' in categories]
        common = 'Force Talent Trees' in categories
        if not assigned and not common:continue
        article = json.loads((ROOT / reference['path']).read_text())['article']
        tree = dict(name=title, id='tree:' + slug(title.removesuffix(' Talent Tree')), classes=assigned, commonForce=common, source=reference['source'], article=clean(article))
        trees.append(tree)
        scope_rules = []
        if title in TREE_RULES:
            for block in article['blocks']:
                if isinstance(block, dict) and block['tag'] == 'h3':break
                if isinstance(block, dict) and block['tag'] == 'p' and not text(block).strip().startswith('Reference Book'):
                    scope_rules.append(clean(block))
        for section in sections(article):
            matches = existing.get((title, section['name']), [])
            if len(matches) > 1:raise ValueError('Multiple mechanics for section: ' + title + '#' + section['name'])
            rows.append(dict(**section, treeTitle=title, treeId=tree['id'], source=reference['source'], scopeRules=scope_rules, commonForce=common, existing=matches[0] if matches else None, reprint=False))
    by_name = collections.defaultdict(list)
    for row in rows:by_name[row['name']].append(row)
    used = {r['id'] for r in mechanics['talents']}
    for name, group in by_name.items():
        if len(group) > 1 and name not in SHARED_REPRINTS:raise ValueError('Review identical talent name: ' + name)
        canonical = next((row for row in group if row['existing']), group[0])
        record = copy.deepcopy(canonical['existing']) if canonical['existing'] else dict(id='talent:' + slug(name), name=name, sourceId='source:wiki-' + slug(canonical['treeTitle']) + '-' + slug(name), tree=canonical['treeId'], prerequisite=dict(kind='all', requirements=[]), repeat='never', effects=[], reminder='', automation='manual')
        if not canonical['existing'] and record['id'] in used:raise ValueError('Conflicting talent ID: ' + record['id'])
        used.add(record['id'])
        additional = [row['treeId'] for row in group if row is not canonical]
        if additional:record['additionalTrees'] = list(dict.fromkeys([*record.get('additionalTrees', []), *additional]))
        for row in group:
            row['record'] = record;row['reprint'] = row is not canonical
            row['sectionSourceId'] = row['existing']['sourceId'] if row['existing'] else 'source:wiki-' + slug(row['treeTitle']) + '-' + slug(name)
            source = copy.deepcopy(row['source']);source.update(id=row['sectionSourceId'], section=row['name'], url=source['url'].split('#')[0] + '#' + quote(row['name'].replace(' ', '_')))
            sources[source['id']] = source
    parser = PrerequisiteParser(mechanics, rows, sources)
    for row in rows:
        if row['existing'] or row['reprint']:continue
        record = row['record'];name = row['name'];body_text = ' '.join(text(n) for n in row['blocks'])
        passages = [n for n in row['blocks'] if isinstance(n,dict) and n['tag'] in ['p','ul','table','dl'] and re.match(r'^Prerequisites?\s*:', text(n).strip(), re.I)]
        repeat = bool(re.search(r'(?:select|take|choose) this Talent (?:multiple times|more than once)', body_text, re.I))
        record['repeat'] = 'stack' if repeat else 'never'
        if name in CHOICES:
            record['choiceType'], record['choiceLabel'], record['repeat'] = CHOICES[name]
        prerequisite, manual, failures = parser.parse(passages, record.get('choiceType'))
        requirements = prerequisite['requirements']
        if row['commonForce']:requirements.insert(0, dict(kind='feat', value='feat:force-sensitivity'))
        if row['treeId'] == 'tree:dark-side':
            record['requiresDarkSide'] = True;requirements.insert(0, dict(kind='darkSideScore', min=1))
        if row['treeId'] == 'tree:light-side':
            record['requiresLightSide'] = True;requirements.insert(0, dict(kind='darkSideScore', min=0, max=0))
        if row['treeId'] in ['tree:gand-findsman','tree:imperial-inquisitor']:
            manual += [text(n).strip() for n in row['scopeRules']]
            if row['treeId'] == 'tree:gand-findsman':requirements.insert(0, dict(kind='feat', value='feat:force-sensitivity'))
        if name in TRAINED_CHOICES:requirements.append(dict(kind='trained', value='$choice'))
        if name == 'Force Exertion':requirements.append(dict(kind='power', value='$choice'))
        if name in ['Flurry Attack','Mandalorian Ferocity','Accurate Blow','Disarming Attack']:requirements.append(dict(kind='proficientChoice', value='$choice'))
        if name == 'Accurate Blow':
            record['choiceGroups'] = ['advanced-melee-weapons','lightsabers','simple-weapons']
            record['choiceExoticMode'] = 'melee'
        if name == 'Vehicle Focus':
            record['choiceOptions'] = [dict(id=slug(n),name=n) for n in ['Airspeeders','Capital Ships','Space Transports','Speeders','Starfighters','Walkers']]
        if name == 'Close Contact':record.update(repeat='stack',maxSelections=2)
        if name in MANUAL_CHOICE_REQUIREMENTS:
            manual += [text(n).strip() for n in row['blocks'] if isinstance(n,dict) and n['tag'] in ['p','ul'] and not text(n).strip().startswith(('Reference Book','Prerequisite')) and re.search(r'\b(?:choose|select|know|possess|already have)\b',text(n),re.I)]
        if name in ['Inspire Loyalty','Commanding Officer']:record['maxSelections'] = 3
        if name == 'Sentinel Strike':record['maxSelections'] = 5
        if name in FORCE_ACTIVATION:record['forceActivation'] = FORCE_ACTIVATION[name]
        record['prerequisite'] = prerequisite
        if manual:record['manualPrerequisites'] = list(dict.fromkeys(manual))
        row['parseFailures'] = failures
        row['prerequisitePassages'] = [text(n).strip() for n in passages]
    return rows, trees, sources


def apply_import(mechanics, rows, trees, section_sources, capture, references):
    """Enable exact captured sections, preserving all existing mechanical IDs."""
    catalog_path = ROOT / 'data/wiki-catalog.json'
    catalog = json.loads(catalog_path.read_text())
    pins_path = ROOT / 'tools/reviewed-revisions.json'
    pins = json.loads(pins_path.read_text())
    refs = {r['name']:r for r in references}
    sources = {s['id']:s for s in catalog['sources']}
    sources.update({s['id']:s for s in mechanics['sources'] if s['id'] not in sources})
    pages = {r['id']:r for r in catalog['rulePages']}
    records = {r['id']:r for r in catalog['records']}
    mechanical_sources = {s['id']:s for s in mechanics['sources']}
    extra_path = BUILD / 'core-import-extra-snapshot.json'
    extra = json.loads(extra_path.read_text())
    captures = {p['title']:p for p in extra['query']['pages']}
    presentation = load_module('talent_presentation', 'compile-wiki-articles.py')
    known_trees = {t['name']:t for t in trees}

    def register_source(source, mechanical=True):
        source = copy.deepcopy(source)
        if source['title'] in pins and pins[source['title']] != source['revision']:
            raise ValueError('Changed pinned revision: ' + source['title'])
        pins[source['title']] = source['revision']
        old = sources.get(source['id'])
        if old and any(old.get(k) != source.get(k) for k in ['title','revision','section','timestamp']):
            raise ValueError('Changed source identity: ' + source['id'])
        sources[source['id']] = source
        if mechanical and source['id'] not in mechanical_sources:mechanical_sources[source['id']] = source
        return source['id']

    def register_capture(title, revision):
        page = capture[title]
        if page['revisions'][0]['revid'] != revision:
            raise ValueError('Capture revision mismatch: ' + title)
        if title in captures and captures[title]['revisions'][0]['revid'] != revision:
            raise ValueError('Previous capture revision mismatch: ' + title)
        captures[title] = page
        digest = hashlib.sha256(title.encode()).hexdigest()[:16]
        parse_path = BUILD / 'reference' / ('parse-' + digest + '-' + str(revision) + '.json')
        parsed = json.loads(parse_path.read_text())
        if parsed['title'] != title or parsed['revision'] != revision or parsed['result']['parse']['revid'] != revision:
            raise ValueError('Parse revision mismatch: ' + title)
        shutil.copyfile(parse_path, BUILD / ('article-' + slug(title) + '-parse.json'))
        return parse_path

    for tree in trees:
        source = copy.deepcopy(tree['source'])
        source.update(id='source:wiki-' + slug(tree['name']), section=None)
        sid = register_source(source)
        register_capture(tree['name'], source['revision'])
        rid = 'rule:' + slug(tree['name'])
        pages[rid] = dict(id=rid, name=tree['name'], sourceId=sid,
            article=dict(sourceId=sid, blocks=copy.deepcopy(tree['article']['blocks'])))
        existing = next((r for r in records.values() if r['kind']=='talentTree' and r['name']==tree['name']), None)
        cid = existing['id'] if existing else 'catalog:talenttree-' + slug(tree['name'])
        records[cid] = dict(id=cid,name=tree['name'],kind='talentTree',ruleId=rid,sourceId=sid,
            books=refs[tree['name']]['books'], mechanicsIds=[])

    # The published overview tables define class access. Categories are only a
    # discovery cross-check, never a substitute for the class's explicit table.
    for cls in mechanics['classes']:
        title = sources[cls['talentAccessSourceId']]['title']
        source = copy.deepcopy(sources[cls['talentAccessSourceId']])
        parse_path = register_capture(title, source['revision'])
        sid = register_source(source)
        if title in refs:
            article = clean(json.loads((ROOT / refs[title]['path']).read_text())['article'])
        else:
            article = presentation.article(ROOT,title,capture,lambda _:sid,{},parse_path=parse_path)
        overview = set()
        for table in nodes(article['blocks']):
            if table['tag'] != 'table':continue
            for row in nodes(table['children']):
                if row['tag'] != 'tr':continue
                cell = next((c for c in row['children'] if isinstance(c,dict) and c['tag']=='td'), None)
                if cell is None:continue
                for link in nodes(cell['children']):
                    if link['tag'] != 'a':continue
                    target = unquote(urlparse(link['href']).path.split('/wiki/')[-1]).replace('_',' ')
                    if target.endswith(' Talent Tree'):
                        if target not in known_trees:raise ValueError('Unimported class tree: ' + target)
                        overview.add(known_trees[target]['id'])
        categorized = {t['id'] for t in trees if cls['name'] in t['classes']}
        if not overview or overview != categorized:
            raise ValueError('Class table/category disagreement: ' + cls['name'] + ': ' + str(overview ^ categorized))
        cls['talentTrees'] = sorted(overview)
        rid = 'rule:' + slug(title)
        pages[rid] = dict(id=rid,name=title,sourceId=sid,article=dict(sourceId=sid,blocks=article['blocks']))

    common = [t for t in trees if t['commonForce']]
    mechanics['rules']['forceTalentAccess']['trees'] = sorted(t['id'] for t in common)
    mechanics['rules']['forceTalentAccess']['sourceIds'] = list(dict.fromkeys([
        *mechanics['rules']['forceTalentAccess']['sourceIds'],
        *('source:wiki-' + slug(t['name']) for t in common)]))
    by_identity = {(sources[p['sourceId']]['title'], sources[p['sourceId']].get('section')):p['id'] for p in pages.values()}
    talents = {r['id']:r for r in mechanics['talents']}
    for row in rows:
        record = row['record']
        talents[record['id']] = copy.deepcopy(record)
        sid = register_source(section_sources[row['sectionSourceId']])
        identity = (row['treeTitle'], row['name'])
        rid = by_identity.get(identity, 'rule:talent-' + slug(row['treeTitle']) + '-' + slug(row['name']))
        # Legacy mechanics can pin the same section under another source ID.
        # Keep the established presentation and catalog IDs stable.
        if rid in pages:
            sid = pages[rid]['sourceId']
        if rid in pages and (sources[pages[rid]['sourceId']]['title'],sources[pages[rid]['sourceId']].get('section')) != identity:
            raise ValueError('Rule ID collision: ' + rid)
        blocks = copy.deepcopy(row['blocks'])
        insert = next((i + 1 for i,n in enumerate(blocks) if isinstance(n,dict) and n['tag']=='p' and text(n).strip().startswith('Reference Book')), 0)
        blocks[insert:insert] = copy.deepcopy(row['scopeRules'])
        pages[rid] = dict(id=rid,name=row['name'],sourceId=sid,article=dict(sourceId=sid,blocks=blocks))
        main = blocks[:next((i for i,n in enumerate(blocks) if isinstance(n,dict) and n['tag'] in ['h4','h5']),len(blocks))]
        reference = next((n for n in main if isinstance(n,dict) and n['tag']=='p' and text(n).strip().startswith('Reference Book')),None)
        books = sorted({text(n).strip() for n in nodes([reference] if reference else []) if n['tag']=='a'})
        if not books:raise ValueError('Missing talent book: ' + row['name'])
        existing = next((r for r in records.values() if r['kind']=='talent' and r['sourceId']==sid),None)
        cid = existing['id'] if existing else 'catalog:talent-' + slug(row['treeTitle']) + '-' + slug(row['name'])
        records[cid] = dict(id=cid,name=row['name'],kind='talent',ruleId=rid,sourceId=sid,books=books,
            tree=row['treeId'],classIds=[c['id'] for c in mechanics['classes'] if row['treeId'] in c['talentTrees']],mechanicsIds=[record['id']])

    # Exact href identities keep reprinted talent sections distinct. Never use
    # a link's display label to redirect an unrelated wiki page.
    targets = collections.defaultdict(list)
    for page in pages.values():
        source = sources[page['sourceId']]
        targets[(source['title'],source.get('section') or '')].append(page['id'])
    for page in pages.values():
        for link in nodes(page['article']['blocks']):
            if link['tag'] != 'a':continue
            url = urlparse(link['href'])
            if '/wiki/' not in url.path:continue
            title = unquote(url.path.split('/wiki/',1)[1]).replace('_',' ')
            fragment = unquote(url.fragment).replace('_',' ')
            ids = targets.get((title,fragment),[]) or targets.get((title,''),[])
            if len(ids)==1:link['ruleId']=ids[0]
    mechanics['talents'] = list(talents.values())
    mechanics['sources'] = list(mechanical_sources.values())
    catalog['sources'] = sorted(sources.values(),key=lambda s:s['id'])
    catalog['rulePages'] = sorted(pages.values(),key=lambda r:r['id'])
    catalog['records'] = sorted(records.values(),key=lambda r:(r['kind'],r['name'],r['id']))
    extra['query']['pages'] = list(captures.values())
    (ROOT / 'data/mechanics.json').write_text(json.dumps(mechanics,ensure_ascii=False,indent=2)+'\n')
    catalog_path.write_text(json.dumps(catalog,ensure_ascii=False,separators=(',',':'))+'\n')
    pins_path.write_text(json.dumps(pins,ensure_ascii=False,indent=2)+'\n')
    extra_path.write_text(json.dumps(extra,ensure_ascii=False,indent=2)+'\n')
    print('Enabled',len(talents),'talents in',len(trees),'class/common Force trees')


def main():
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('--apply', action='store_true', help='Apply the reviewed pinned import')
    cli.add_argument('--capture', type=Path, default=BUILD / 'reference/capture.json')
    args = cli.parse_args()
    mechanics = json.loads((ROOT / 'data/mechanics.json').read_text())
    references = json.loads((ROOT / 'data/reference-index.json').read_text())['records']
    capture = json.loads(args.capture.read_text())['pages']
    rows, trees, sources = collect(mechanics, references, capture)
    review = dict(schemaVersion=1, trees=[{k:v for k,v in t.items() if k!='article'} for t in trees], records=[{**{k:v for k,v in r.items() if k!='existing'},'existing':bool(r['existing'])} for r in rows])
    (BUILD / 'talent-catalog-review.json').write_text(json.dumps(review,ensure_ascii=False,indent=2)+'\n')
    new = [r for r in rows if not r['existing'] and not r['reprint']]
    stats = dict(trees=len(trees), sections=len(rows), newTalents=len(new), typedRequirements=sum(not r['record'].get('manualPrerequisites') for r in new), manualRequirements=sum(bool(r['record'].get('manualPrerequisites')) for r in new), choices=sum(bool(r['record'].get('choiceType')) for r in new), repeatable=sum(r['record']['repeat']!='never' for r in new))
    print(json.dumps(stats,indent=2))
    if args.apply:
        apply_import(mechanics, rows, trees, sources, capture, references)


if __name__ == '__main__':
    main()
