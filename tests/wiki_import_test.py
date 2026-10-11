import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / filename)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


importer = load('catalog_import', 'import-wiki.py')
compiler = load('catalog_compile', 'compile-core.py')


class WikiImportTests(unittest.TestCase):
    def test_talent_sections_do_not_import_additional_talents_or_neighbour_text(self):
        def h(rank, label):
            return dict(tag='h' + str(rank), children=[label])
        blocks = [h(2, 'Core Talents'), h(3, 'First'), 'First effect.',
            h(3, 'Second'), 'Prerequisite: First', 'Second effect.',
            h(2, 'Additional Weapon Specialization Talents'), h(3, 'Supplement'), 'Other book.']
        talents = dict(importer.core_talents(blocks))
        self.assertEqual(set(talents), {'First', 'Second'})
        self.assertNotIn('Second effect.', talents['First'])
        self.assertNotIn('Other book.', talents['Second'])
        self.assertRaisesRegex(ValueError, 'Missing section', importer.section, blocks, 'Missing')

    def test_discovery_follows_continuation_without_dropping_the_last_page(self):
        responses = [
            {'query': {'categorymembers': [{'ns': 0, 'title': 'First'}]},
                'continue': {'continue': '-||', 'cmcontinue': 'next'}},
            {'query': {'categorymembers': [{'ns': 0, 'title': 'Last'}]}}]
        with patch.object(importer.wiki, 'api', side_effect=responses) as request:
            self.assertEqual([r['title'] for r in importer.category('Core Rulebook')], ['First', 'Last'])
            self.assertEqual(request.call_args_list[1].kwargs['cmcontinue'], 'next')

    def test_offline_compilation_is_reproducible_and_cannot_promote_imported_text(self):
        mechanics = json.loads((ROOT / 'data/mechanics.json').read_text())
        catalog = json.loads((ROOT / 'data/wiki-catalog.json').read_text())
        reviewed = json.loads((ROOT / 'tools/reviewed-revisions.json').read_text())
        pack = compiler.compile_pack(mechanics, catalog, reviewed)
        self.assertEqual(pack, json.loads((ROOT / 'data/core.json').read_text()))
        self.assertEqual(pack['version'], mechanics['version'])
        self.assertEqual(pack['feats'], [dict(r, article=next(p['article'] for p in pack['rulePages'] if p['name'] == r['name'])) for r in mechanics['feats']])
        lightning = next(r for r in pack['catalog']['records'] if r['name'] == 'Force Lightning')
        self.assertEqual(lightning['status'], 'reference')
        self.assertNotIn('forcePower:force-lightning', {r['id'] for r in pack['feats']})
        mechanics['sources'][0]['revision'] += 1
        self.assertRaisesRegex(ValueError, 'Review required', compiler.compile_pack, mechanics, catalog, reviewed)

    def test_text_refresh_cannot_change_a_reviewed_mechanical_source(self):
        mechanics = json.loads((ROOT / 'data/mechanics.json').read_text())
        catalog = json.loads((ROOT / 'data/wiki-catalog.json').read_text())
        reviewed = json.loads((ROOT / 'tools/reviewed-revisions.json').read_text())
        article = next(p for p in catalog['rulePages'] if p['name'] == 'Human')
        source = next(s for s in catalog['sources'] if s['id'] == article['sourceId'])
        source['revision'] += 1
        self.assertRaisesRegex(ValueError, 'Changed mechanical source', compiler.compile_pack, mechanics, catalog, reviewed)
