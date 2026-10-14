#!/usr/bin/env python3
"""Inventory sourcebook pages and exclude the entire Homebrew category tree.

This is a coverage queue, not an authorization to turn prose into mechanics.
Refresh: python tools/discover-books.py
Rebuild captured coverage: python tools/discover-books.py --offline
"""
import argparse
import importlib.util
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOOK_ROOT = 'Category:Reference Books'
HOMEBREW_ROOT = 'Category:Homebrew Content'
COLLECTIONS = ['species', 'classes', 'skills', 'feats', 'talents', 'equipment',
               'destinies', 'backgrounds', 'forcePowers']


def descendants(categories, root):
    """Traverse subcategories once, including shared branches and cycles."""
    pending, visited, pages = [root], set(), set()
    while pending:
        title = pending.pop()
        if title in visited:
            continue
        visited.add(title)
        for member in categories[title]:
            if member['ns'] == 0:
                pages.add(member['title'])
            elif member['ns'] == 14:
                pending.append(member['title'])
    return pages, visited


def mapped_sources(node):
    if isinstance(node, dict):
        for key, value in node.items():
            if key == 'sourceId' and isinstance(value, str):
                yield value
            elif key == 'sourceIds' and isinstance(value, list):
                yield from value
            else:
                yield from mapped_sources(value)
    elif isinstance(node, list):
        for value in node:
            yield from mapped_sources(value)


def capture_categories(fetch):
    categories = {}
    def capture(title):
        if title not in categories:
            categories[title] = sorted(fetch(title), key=lambda m:(m['ns'], m['title']))
        return categories[title]
    for member in capture(BOOK_ROOT):
        if member['ns'] == 14:
            capture(member['title'])
    pending, visited = [HOMEBREW_ROOT], set()
    while pending:
        title = pending.pop()
        if title in visited:
            continue
        visited.add(title)
        pending.extend(m['title'] for m in capture(title)
                       if m['ns'] == 14 and m['title'] not in visited)
    return categories


def coverage(snapshot, pack, reference=None):
    categories = snapshot['categories']
    excluded, excluded_categories = descendants(categories, HOMEBREW_ROOT)
    books = sorted(m['title'] for m in categories[BOOK_ROOT] if m['ns'] == 14)
    if not books:
        raise ValueError('No sourcebook categories found')
    sources = {s['id']: s['title'] for s in pack['sources']}
    imported = {sources[r['sourceId']] for r in pack['rulePages']}
    for record in (reference or {}).get('records', []):
        imported.add(record['name'])
        imported.update(record.get('aliases', []))
    excluded.update((reference or {}).get('excluded', []))
    mapped = {sources[s] for key in COLLECTIONS for record in pack.get(key, [])
              for s in mapped_sources(record)}
    mapped.update(sources[s] for s in mapped_sources(pack['rules']))
    leaked = sorted((imported | mapped) & excluded)
    if leaked:
        raise ValueError('Embedded Homebrew requires removal: ' + ', '.join(leaked))
    result = []
    for category in books:
        candidates = {m['title'] for m in categories[category] if m['ns'] == 0}
        pages = sorted(candidates - excluded)
        result.append(dict(book=category.removeprefix('Category:'), category=category,
            excluded=sorted(candidates & excluded), pages=[dict(title=title,
                status='mapped' if title in mapped else 'reference' if title in imported else 'unimported')
                for title in pages]))
    unique = {page['title'] for book in result for page in book['pages']}
    return dict(schemaVersion=1, capturedAt=snapshot['capturedAt'],
                bookRoot=BOOK_ROOT, homebrewRoot=HOMEBREW_ROOT,
                excludedCategories=sorted(excluded_categories),
                excludedPages=sorted(excluded), uniquePages=len(unique),
                uniqueImportedPages=len(unique & imported), uniqueMappedPages=len(unique & mapped), books=result)


def markdown(result):
    lines = ['# Wiki coverage', '',
        'Captured ' + result['capturedAt'] + '.', '',
        'Direct page membership in the wiki’s [Reference Books categories](https://swse.miraheze.org/wiki/Category:Reference_Books) supplies the review queue. '
        'Pages in [Homebrew Content](https://swse.miraheze.org/wiki/Category:Homebrew_Content) or any of its descendant categories are excluded, even when also tagged with a sourcebook.', '',
        '**Mapped** means at least one reviewed mechanic uses the page; it does not mean every rule on that page is automated. '
        '**Reference** means embedded text without a reviewed mechanical mapping. '
        '**Unimported** means no embedded article. Category membership supplies candidates; individual revisions, official sections and contradictions still need review.', '',
        f"Embedded text: **{result['uniqueImportedPages']:,} / {result['uniquePages']:,} pages ({result['uniqueImportedPages']/result['uniquePages']:.1%})**. "
        f"At least one mapped mechanic: **{result['uniqueMappedPages']:,} / {result['uniquePages']:,} pages ({result['uniqueMappedPages']/result['uniquePages']:.1%})**. "
        'A mechanical mapping alone does not count as embedded text.', '',
        '| Source | Pages | Mapped | Reference | Unimported | Excluded |',
        '| --- | ---: | ---: | ---: | ---: | ---: |']
    for book in result['books']:
        counts = {status:sum(p['status'] == status for p in book['pages'])
                  for status in ['mapped', 'reference', 'unimported']}
        lines.append(f"| {book['book']} | {len(book['pages'])} | {counts['mapped']} | {counts['reference']} | {counts['unimported']} | {len(book['excluded'])} |")
    lines += ['', f"{result['uniquePages']:,} distinct candidate pages across {len(result['books'])} sources. Shared pages appear in more than one row. "
        f"The exclusion tree contains {len(result['excludedPages']):,} pages in {len(result['excludedCategories'])} categories.", '',
        'Rebuild with `python tools/discover-books.py` or `--offline` after a captured refresh. '
        'The complete title/status queue and category snapshot are saved under `.build/`; this report adds no unreviewed options to the character sheet.', '']
    return '\n'.join(lines)


def refresh():
    spec = importlib.util.spec_from_file_location('wiki_fetch', ROOT / 'tools/wiki-articles.py')
    wiki = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(wiki)
    def fetch(title):
        members, continuation = [], {}
        while True:
            reply = wiki.api(action='query', list='categorymembers', cmtitle=title,
                             cmlimit=500, **continuation)
            members.extend(reply['query']['categorymembers'])
            continuation = reply.get('continue', {})
            if not continuation:
                break
        print('Captured', title, len(members), flush=True)
        return members
    categories = capture_categories(fetch)
    return dict(schemaVersion=1, capturedAt=datetime.now(timezone.utc).isoformat(), categories=categories)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--offline', action='store_true')
    parser.add_argument('--snapshot', type=Path, default=ROOT / '.build/wiki-category-snapshot.json')
    parser.add_argument('--output', type=Path, default=ROOT / '.build/official-book-coverage.json')
    parser.add_argument('--report', type=Path, default=ROOT / 'docs/wiki-coverage.md')
    args = parser.parse_args()
    if args.offline:
        snapshot = json.loads(args.snapshot.read_text())
    else:
        snapshot = refresh()
        args.snapshot.parent.mkdir(parents=True, exist_ok=True)
        args.snapshot.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
    reference_path = ROOT / 'data/reference-index.json'
    reference = json.loads(reference_path.read_text()) if reference_path.exists() else None
    result = coverage(snapshot, json.loads((ROOT / 'data/core.json').read_text()), reference)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    args.report.write_text(markdown(result))
    print('Inventoried', result['uniquePages'], 'distinct candidates; report:', args.report)


if __name__ == '__main__':
    main()
