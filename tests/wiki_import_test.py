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
        self.assertEqual(mechanics['feats'], [{k:v for k,v in r.items() if k != 'article'} for r in pack['feats']])
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

    def test_species_feat_table_does_not_fetch_links_from_benefit_text(self):
        raw = '==Example Species Feats==\n{|\n|-\n|[[First Feat]]\n|Gain [[Other Rule]].\n|-\n|[[Second Feat|Label]]\n|Benefit.\n|}\n==Other Section==\n|-\n|[[Unrelated]]'
        pages = {'Example': {'revisions': [{'slots': {'main': {'content': raw}}}]}}
        self.assertEqual(importer.species_feats(pages, ['Example']), ['First Feat', 'Second Feat'])

    def test_reviewed_mappings_promote_by_exact_source_without_reimporting_catalog(self):
        mechanics = json.loads((ROOT / 'data/mechanics.json').read_text())
        catalog = json.loads((ROOT / 'data/wiki-catalog.json').read_text())
        reviewed = json.loads((ROOT / 'tools/reviewed-revisions.json').read_text())
        hutt = next(r for r in catalog['records'] if r['name'] == 'Hutt')
        hutt['mechanicsIds'] = []
        catalog['rulePages'] = [p for p in catalog['rulePages'] if p['name'] != 'Weapon Proficiency (Heavy Weapons)']
        pack = compiler.compile_pack(mechanics, catalog, reviewed)
        self.assertEqual(next(r for r in pack['catalog']['records'] if r['name'] == 'Hutt')['mechanicsIds'], ['species:hutt'])
        weapon = next(r for r in pack['catalog']['records'] if r['name'] == 'Weapon Proficiency')
        self.assertEqual(len(weapon['mechanicsIds']), 6)
        variant = next(r for r in pack['feats'] if r['id'] == 'feat:weapon-proficiency-heavy-weapons')
        self.assertEqual(variant['article']['sourceId'], 'source:wiki-weapon-proficiency')
        # Another talent in the same tree is a different source section.
        armor = next(r for r in pack['catalog']['records'] if r['name'] == 'Armor Mastery')
        self.assertEqual(armor['status'], 'reference')
