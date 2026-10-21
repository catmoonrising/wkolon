#!/usr/bin/env python3
"""Build offline from declarative, reviewed mechanics and imported presentation."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLLECTIONS = ['species', 'classes', 'skills', 'feats', 'talents', 'equipment', 'destinies', 'backgrounds', 'forcePowers', 'starshipManeuvers', 'vehicles', 'classChoices']


def compile_pack(mechanics, catalog, reviewed, optional_rules=None):
    # Text updates never authorize changes to existing mechanical mappings.
    pack = json.loads(json.dumps(mechanics))
    if optional_rules is not None:
        pack['optionalRules'] = json.loads(json.dumps(optional_rules))
    for source in pack['sources']:
        if reviewed.get(source['title']) != source['revision']:
            raise ValueError(f"Review required: {source['title']} revision {source['revision']}")
    sources = {s['id']: s for s in pack['sources']}
    for source in catalog['sources']:
        if source['id'] in sources and sources[source['id']] != source:
            old = sources[source['id']]
            # Legacy mechanical pins omit checksums and encode URL spaces as
            # underscores. A reimport may enrich those display fields, but
            # may never change the title, revision, section, timestamp or a
            # checksum already present on both sides.
            keys = ('title', 'revision', 'section', 'timestamp')
            if (any(old.get(k) != source.get(k) for k in keys) or
                    old.get('sha256') and source.get('sha256') and old['sha256'] != source['sha256']):
                raise ValueError('Conflicting source: ' + source['id'])
        sources[source['id']] = source
    pack['sources'] = sorted(sources.values(), key=lambda s:s['id'])
    pack['rulePages'] = catalog['rulePages']
    pack['jediCounseling'] = catalog.get('jediCounseling', [])
    by_name = {r['name']: r for r in pack['rulePages']}
    def source_key(source):
        return (source['title'], source['revision'], source.get('section'))
    by_source = {source_key(sources[r['sourceId']]): r for r in pack['rulePages']}
    typed = {r['id']:r for key in COLLECTIONS for r in pack.get(key, [])}
    for key in ['species', 'classes', 'feats', 'talents', 'equipment', 'forcePowers', 'starshipManeuvers', 'classChoices']:
        for r in pack.get(key, []):
            mechanical = sources[r['sourceId']]
            article = by_source.get(source_key(mechanical)) or by_name.get(r['name'])
            if not article:
                raise ValueError('Missing imported article: ' + r['name'])
            presentation = sources[article['sourceId']]
            if (mechanical['title'], mechanical['revision'], mechanical.get('section')) != (presentation['title'], presentation['revision'], presentation.get('section')):
                raise ValueError('Changed mechanical source needs review: ' + r['name'])
            r['article'] = article['article']
    records = json.loads(json.dumps(catalog['records']))
    collections = {'species':'species', 'class':'classes', 'prestigeClass':'classes', 'classFeature':'classChoices', 'skill':'skills', 'feat':'feats',
        'talent':'talents', 'weapon':'equipment', 'armor':'equipment', 'gear':'equipment', 'forcePower':'forcePowers', 'starshipManeuver':'starshipManeuvers', 'vehicle':'vehicles'}
    for record in records:
        if any(id not in typed for id in record['mechanicsIds']):
            raise ValueError('Missing reviewed mechanics: ' + record['name'])
        # A reviewed mapping can be added after the reference import. Match its
        # exact pinned source, including section, rather than enabling prose.
        for item in pack.get(collections.get(record['kind'], ''), []):
            same_name = item['name'] == record['name']
            same_source = source_key(sources[item['sourceId']]) == source_key(sources[record['sourceId']])
            reviewed_reprint = record['kind'] == 'talent' and same_name and record.get('tree') in item.get('additionalTrees', [])
            if (same_source or reviewed_reprint or same_name and record['kind'] != 'talent') and (record['kind'] != 'vehicle' or same_name) and item['id'] not in record['mechanicsIds']:
                record['mechanicsIds'].append(item['id'])
        record['status'] = 'available' if record['mechanicsIds'] else 'reference'
    pack['catalog'] = dict(schemaVersion=1, book=catalog['book'], records=records)
    pack['license']['attribution'] = 'Adapted from Star Wars Saga Edition wiki contributors. Source revisions and contributor histories are retained.'
    pack['license']['changes'] = 'Wiki wording and formatting retained in a closed presentation tree. Marked Homebrew sections, images, executable markup, comments, and site navigation omitted. Reviewed mechanical mappings are separate from imported reference text.'
    return pack


def main():
    pack = compile_pack(
        json.loads((ROOT / 'data/mechanics.json').read_text()),
        json.loads((ROOT / 'data/wiki-catalog.json').read_text()),
        json.loads((ROOT / 'tools/reviewed-revisions.json').read_text()),
        json.loads((ROOT / 'data/optional-rules.json').read_text()))
    (ROOT / 'data/core.json').write_text(json.dumps(pack, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('Compiled', {k:len(pack[k]) for k in COLLECTIONS}, 'and', len(pack['catalog']['records']), 'imported references')


if __name__ == '__main__':
    main()
