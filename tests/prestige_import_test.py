import json
import re
import unittest
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]


def text(node):
    return node if isinstance(node, str) else ''.join(text(c) for c in node['children'])


def nodes(blocks, tag):
    for node in blocks:
        if isinstance(node, dict):
            if node['tag'] == tag:
                yield node
            yield from nodes(node['children'], tag)


class PrestigeImportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = json.loads((ROOT / 'data/core.json').read_text())
        cls.references = {r['name']: r for r in json.loads((ROOT / 'data/reference-index.json').read_text())['records']}
        cls.sources = {s['id']: s for s in cls.pack['sources']}

    def article(self, name):
        return json.loads((ROOT / self.references[name]['path']).read_text())['article']

    def test_printed_bab_and_force_point_bases(self):
        for cls in self.pack['classes']:
            if cls.get('classType') != 'prestige':
                continue
            with self.subTest(cls=cls['name']):
                article = self.article(cls['name'])
                table = next(t for t in nodes(article['blocks'], 'table') if 'BASE ATTACK BONUS' in text(t))
                facts = {}
                for row in nodes(table['children'], 'tr'):
                    cells = [text(c).strip() for c in row['children'] if isinstance(c, dict) and c['tag'] in ['th', 'td']]
                    for i, cell in enumerate(cells):
                        match = re.fullmatch(r'([0-9]+)(?:st|nd|rd|th)', cell)
                        if match:
                            facts[int(match[1])] = int(cells[i + 1].replace('+', ''))
                self.assertEqual(cls['bab'], [facts[i] for i in sorted(facts)])
                self.assertEqual(cls['maxLevel'], len(facts))
                if cls['name'] == 'Shaper':
                    self.assertIsNone(cls['forcePointBase'])
                else:
                    content = text({'tag': 'root', 'children': article['blocks']})
                    match = re.search(r'Force Points:? .*?([0-9]+) [+] one-half', content)
                    self.assertEqual(cls['forcePointBase'], int(match[1]))

    def test_declared_talent_trees_match_source_access_tables(self):
        for cls in self.pack['classes']:
            if cls.get('classType') != 'prestige':
                continue
            with self.subTest(cls=cls['name']):
                article = self.article(self.sources[cls['talentAccessSourceId']]['title'])
                trees = set()
                for table in nodes(article['blocks'], 'table'):
                    for row in nodes(table['children'], 'tr'):
                        cell = next((c for c in row['children'] if isinstance(c, dict) and c['tag'] == 'td'), None)
                        if cell:
                            for link in nodes(cell['children'], 'a'):
                                title = unquote(link['href'].split('/wiki/')[-1].split('#')[0]).replace('_', ' ')
                                if title.endswith(' Talent Tree'):
                                    trees.add('tree:' + re.sub(r'[^a-z0-9]+', '-', title[:-12].lower()).strip('-'))
                self.assertEqual(set(cls['talentTrees']), trees)
