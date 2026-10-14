#!/usr/bin/env python3
"""Prepare an offline review batch without enabling or inventing mechanics."""
import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def text(node):
    if isinstance(node, str):
        return node
    return ''.join(text(child) for child in node.get('children', []))


def passages(blocks, label):
    # Preserve printed text. An absent labeled paragraph is not proof that
    # requirements or repeat restrictions are absent elsewhere in the article.
    return [text(block).strip() for block in blocks
            if re.match(r'^\s*' + label + r'\s*:', text(block), re.I)]


def prepare(index, mechanics, book=None, limit=None):
    sources = {source['id']: source for source in mechanics['sources']}
    enabled = {sources[feat['sourceId']]['title'] for feat in mechanics['feats']}
    excluded = set(index.get('excluded', []))
    candidates = sorted((record for record in index['records']
                         if record['kind'] == 'feat'
                         and record['name'] not in enabled
                         and record['name'] not in excluded
                         and (not book or book in record['books'])),
                        key=lambda record: record['name'].casefold())
    batch = []
    for record in candidates[:limit]:
        article = json.loads((ROOT / record['path']).read_text())
        if article['id'] != record['id'] or article['source'] != record['source']:
            raise ValueError('Reference/source mismatch: ' + record['name'])
        blocks = article['article']['blocks']
        batch.append(dict(name=record['name'], books=record['books'],
                          source=record['source'], articlePath=record['path'],
                          prerequisitePassages=passages(blocks, 'Prerequisites?'),
                          effectPassages=passages(blocks, 'Effects?'),
                          specialPassages=passages(blocks, 'Special'),
                          article=article['article'],
                          reviewStatus='pending'))
    return dict(schemaVersion=1, totalCandidates=len(candidates), records=batch)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--book', help='Exact reference-book name')
    parser.add_argument('--limit', type=int, help='Maximum records in this batch')
    parser.add_argument('--output', type=Path,
                        default=ROOT / '.build/feat-review-queue.json')
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error('--limit must be positive')
    index = json.loads((ROOT / 'data/reference-index.json').read_text())
    if args.book and not any(args.book in r['books'] for r in index['records']):
        parser.error('Unknown reference book: ' + args.book)
    result = prepare(index, json.loads((ROOT / 'data/mechanics.json').read_text()),
                     args.book, args.limit)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(f"Prepared {len(result['records'])} of {result['totalCandidates']} "
          f"remaining official feat candidates: {args.output}")


if __name__ == '__main__':
    main()
