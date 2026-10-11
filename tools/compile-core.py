#!/usr/bin/env python3
"""Build offline from declarative, reviewed mechanics and imported presentation."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COLLECTIONS = ['species', 'classes', 'skills', 'feats', 'talents', 'equipment', 'destinies', 'backgrounds']


def compile_pack(mechanics, catalog, reviewed):
    # Text updates never authorize changes to existing mechanical mappings.
    pack = json.loads(json.dumps(mechanics))
    for source in pack['sources']:
        if reviewed.get(source['title']) != source['revision']:
            raise ValueError(f"Review required: {source['title']} revision {source['revision']}")
    sources = {s['id']: s for s in pack['sources']}
    for source in catalog['sources']:
        if source['id'] in sources and sources[source['id']] != source:
            raise ValueError('Conflicting source: ' + source['id'])
        sources[source['id']] = source
    pack['sources'] = sorted(sources.values(), key=lambda s:s['id'])
    pack['rulePages'] = catalog['rulePages']
    by_name = {r['name']: r for r in pack['rulePages']}
    typed = {r['id']:r for key in COLLECTIONS for r in pack.get(key, [])}
    for key in ['species', 'classes', 'feats', 'talents', 'equipment']:
        for r in pack[key]:
            article = by_name.get(r['name'])
            if not article:
                raise ValueError('Missing imported article: ' + r['name'])
            mechanical = sources[r['sourceId']]
            presentation = sources[article['sourceId']]
            if (mechanical['title'], mechanical['revision'], mechanical.get('section')) != (presentation['title'], presentation['revision'], presentation.get('section')):
                raise ValueError('Changed mechanical source needs review: ' + r['name'])
            r['article'] = article['article']
    records = json.loads(json.dumps(catalog['records']))
    for record in records:
        if any(id not in typed for id in record['mechanicsIds']):
            raise ValueError('Missing reviewed mechanics: ' + record['name'])
        record['status'] = 'available' if record['mechanicsIds'] else 'reference'
    pack['catalog'] = dict(schemaVersion=1, book=catalog['book'], records=records)
    pack['license']['attribution'] = 'Adapted from Star Wars Saga Edition wiki contributors. Source revisions and contributor histories are retained.'
    pack['license']['changes'] = 'Wiki wording and formatting retained in a closed presentation tree. Images, executable markup, comments, and site navigation omitted. Reviewed mechanical mappings are separate from imported reference text.'
    return pack


def main():
    pack = compile_pack(
        json.loads((ROOT / 'data/mechanics.json').read_text()),
        json.loads((ROOT / 'data/wiki-catalog.json').read_text()),
        json.loads((ROOT / 'tools/reviewed-revisions.json').read_text()))
    (ROOT / 'data/core.json').write_text(json.dumps(pack, ensure_ascii=False, separators=(',', ':')) + '\n')
    print('Compiled', {k:len(pack[k]) for k in COLLECTIONS}, 'and', len(pack['catalog']['records']), 'imported references')


if __name__ == '__main__':
    main()
