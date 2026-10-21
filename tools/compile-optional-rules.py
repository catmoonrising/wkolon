#!/usr/bin/env python3
"""Build the optional-rules documentation from reviewed, pinned library passages.

No prose is interpreted as executable mechanics. Runs entirely offline.
"""
import copy
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
KEYWORDS = re.compile(r'\boptional(?:ly)?\b|\bvariant rules?\b', re.I)


def compile_catalog(manifest, index, load):
    records = {r['name']: r for r in index['records']}
    excluded = set(index['excluded'])
    entries, ids = [], set()
    for row in manifest['entries']:
        record = records[row['page']]
        assert row['page'] not in excluded and record['source']['revision'] == row['revision'], row['page']
        assert row['id'] not in ids
        ids.add(row['id'])
        page = load(record['path'])
        assert page['source'] == record['source']
        original, blocks = page['article']['blocks'], []
        for start, end in row['ranges']:
            assert 0 <= start < end <= len(original), row['name']
            for i in range(start, end):
                block = copy.deepcopy(original[i])
                if str(i) in row.get('children', {}):
                    assert block['tag'] in ['ul', 'ol']
                    children = [block['children'][j] for j in row['children'][str(i)]]
                    assert all(child['tag'] == 'li' for child in children)
                    block['children'] = children
                blocks.append(block)
        entry = {k: copy.deepcopy(row[k]) for k in ['id', 'name', 'books', 'status', 'note', 'counselingId'] if k in row}
        entry.update(referenceId=record['id'], source=copy.deepcopy(record['source']),
                     article=dict(sourceId=record['source']['id'], blocks=blocks))
        entries.append(entry)
    # A future import containing a new optional/variant passage needs review,
    # including false positives such as optional missile fire-link equipment.
    hits = {r['name']: r for r in index['records'] if KEYWORDS.search(r['searchText'])}
    audit = {r['page']: r for r in manifest['audit']}
    assert hits.keys() == audit.keys(), 'Optional-rules audit needs review: ' + str(hits.keys() ^ audit.keys())
    for title, row in audit.items():
        assert row['revision'] == hits[title]['source']['revision'], title
        assert bool(row.get('entries')) != bool(row.get('excluded')), title
        assert all(id in ids for id in row.get('entries', [])), title
    return dict(schemaVersion=1, libraryCapturedAt=index['capturedAt'],
                libraryArticles=len(index['records']), auditedArticles=len(audit),
                license=copy.deepcopy(index['license']), entries=entries)


def documentation(catalog, manifest):
    lines = ['# Optional rules', '',
             'This catalog documents official optional and variant rules in the pinned SWSE wiki library. '
             'It includes campaign alternatives such as Destiny, Backgrounds, Legacies, and protocols. '
             'Ordinary equipment choices, adventure variants, and wiki Homebrew are excluded.', '',
             f"Coverage: {catalog['libraryArticles']} imported articles, "
             f"{catalog['auditedArticles']} optional/variant keyword hits reviewed, "
             f"{len(catalog['entries'])} documented rules. This is coverage of the captured library, "
             'not a claim to have checked every printed sourcebook page. The wiki has no dedicated '
             'optional-rules category in the captured category inventory.', '',
             'The House Rules module embeds the selected passages verbatim, preserving tables and wiki links. '
             'Display punctuation follows the site conventions; pinned source files remain unchanged. '
             'All passages are included in the offline app shell, without visiting each reference first.', '',
             'Manual means the optional mechanic is documented but has no dedicated automation. '
             'Partial means existing selection or tracking is available. Automatic entries share the existing '
             'Jedi Counseling setting, including its default. Reading this catalog changes no character rules. '
             'Other Jedi Counseling interpretations and Ambiguities remain in their own tabs.', '',
             'Rebuild: `python tools/compile-optional-rules.py`, then `python tools/compile-core.py`. '
             'The manifest pins revisions and exact block ranges. New optional/variant mentions or changed '
             'source revisions fail the audit until reviewed.', '',
             '| Rule | Source | Support |', '| --- | --- | --- |']
    for row in catalog['entries']:
        lines.append(f"| {row['name']} | [{row['source']['title']}]({row['source']['url']}) | {row['status'].capitalize()} |")
    lines += ['', '## Reviewed exclusions', '', '| Article | Reason |', '| --- | --- |']
    for row in manifest['audit']:
        if 'excluded' in row:
            lines.append(f"| {row['page']} | {row['excluded']} |")
    lines += ['', 'Source: SWSE wiki contributors, CC BY-SA 4.0. Excerpt selection and presentation are adaptations. '
              'Revision URLs and the original library attribution accompany every entry in the catalog.', '']
    return '\n'.join(lines)


def main():
    manifest = json.loads((ROOT / 'data/optional-rules-manifest.json').read_text())
    index = json.loads((ROOT / 'data/reference-index.json').read_text())
    catalog = compile_catalog(manifest, index, lambda path: json.loads((ROOT / path).read_text()))
    (ROOT / 'data/optional-rules.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',', ':')) + '\n')
    (ROOT / 'docs/optional-rules.md').write_text(documentation(catalog, manifest))
    print('Compiled', len(catalog['entries']), 'optional rules; reviewed', catalog['auditedArticles'], 'articles')


if __name__ == '__main__':
    main()
