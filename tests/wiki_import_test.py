import importlib.util
import json
import unittest
import tempfile
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
presentation = load('wiki_presentation', 'compile-wiki-articles.py')


class WikiImportTests(unittest.TestCase):
    def test_species_trait_sections_preserve_nested_costs_without_other_traits(self):
        pack = json.loads((ROOT / 'data/core.json').read_text())
        species = next(r for r in pack['species'] if r['id'] == 'species:ithorian')
        blocks = importer.section(species['article']['blocks'], 'Bellow')
        value = ''.join(importer.text(n) for n in blocks)
        self.assertIn('Fortitude Defense', value)
        self.assertIn('each additional 1d6', value)
        self.assertNotIn('Iron Will', value)
        self.assertTrue(all(n['tag'] == 'p' for n in blocks))
        with self.assertRaisesRegex(ValueError, 'Missing section'):
            importer.section(species['article']['blocks'], 'Invented ability')

    def test_core_discovery_excludes_homebrew_even_when_core_category_is_present(self):
        def category(name):
            names = ['Official', 'Homebrew'] if name != 'Homebrew Content' else ['Homebrew']
            return [dict(title=n, ns=0) for n in names]
        with patch.object(importer, 'category', side_effect=category):
            inventory = importer.discover()
        self.assertTrue(all(names == ['Official'] for names in inventory.values()))
        page = dict(title='Homebrew', revisions=[dict(slots=dict(main=dict(content='[[Category:Homebrew Content]]')))])
        baseline = {k: [] for k in ['species', 'classes', 'feats', 'talents', 'equipment', 'sources']}
        with self.assertRaisesRegex(ValueError, 'Homebrew excluded'):
            importer.compile_catalog({'Feats': ['Homebrew'], 'Talent Trees': []}, {'Homebrew': page}, [], baseline)

    def test_core_discovery_excludes_nested_homebrew_through_shared_branches_and_cycles(self):
        def category(name):
            if name == 'Homebrew Content':
                return [dict(title='Category:Nested', ns=14)]
            if name == 'Nested':
                return [dict(title='Nested homebrew', ns=0), dict(title='Category:Homebrew Content', ns=14)]
            return [dict(title=n, ns=0) for n in ['Official', 'Nested homebrew']]
        with patch.object(importer, 'category', side_effect=category) as request:
            inventory = importer.discover()
        self.assertTrue(all(names == ['Official'] for names in inventory.values()))
        self.assertEqual(sum(call.args == ('Nested',) for call in request.call_args_list), 1)

    def test_linked_species_feats_cannot_bypass_the_nested_homebrew_exclusion(self):
        pages = {title:dict(title=title, revisions=[dict(revid=42,
            timestamp='2024-01-01T00:00:00Z', slots=dict(main=dict(content='Reference Book: [[Core Rulebook]]')))])
            for title in ['Weapon Proficiency', 'Nested homebrew']}
        baseline = {k:[] for k in ['species', 'classes', 'feats', 'talents', 'equipment', 'sources']}
        def article(root, title, pages, source, targets, **kwargs):
            return dict(sourceId=source(title), blocks=[dict(tag='p', children=[title])])
        with patch.object(importer, 'SKILLS', []), patch.object(importer, 'CLASSES', []), \
                patch.object(importer, 'species_feats', return_value=['Nested homebrew']), \
                patch.object(importer.presentation, 'article', side_effect=article):
            with self.assertRaisesRegex(ValueError, 'Homebrew excluded: Nested homebrew'):
                importer.compile_catalog({'Talent Trees':[]}, pages, [], baseline, {'Nested homebrew'})

    def test_corruption_import_keeps_destiny_and_supplement_power_tabs_separate(self):
        pages = {title: {'title': title, 'revisions': [{'revid': 42,
            'timestamp': '2024-01-01T00:00:00Z', 'slots': {'main': {'content':
            'Reference Books: [[Core Rulebook]], [[Force Unleashed Campaign Guide]]'}}}]}
            for title in ['Corruption', 'Weapon Proficiency']}
        inventory = {'Talent Trees': [], 'Force Powers': ['Corruption']}
        baseline = {k: [] for k in ['species', 'classes', 'feats', 'talents', 'equipment', 'sources']}
        baseline['rulePages'] = [dict(id='rule:corruption', name='Corruption', sourceId='source:old')]
        baseline['sources'] = [dict(id='source:old', title='Corruption')]
        def article(root, title, pages, source, targets, variant=None, tab=None):
            return dict(sourceId=source(title), blocks=[dict(tag='p', children=[tab or title])])
        with patch.object(importer, 'SKILLS', []), patch.object(importer, 'CLASSES', []), \
                patch.object(importer.presentation, 'article', side_effect=article) as parse:
            catalog = importer.compile_catalog(inventory, pages, [], baseline)
        power = next(r for r in catalog['records'] if r['kind'] == 'forcePower')
        self.assertEqual(power['books'], ['Force Unleashed Campaign Guide'])
        self.assertEqual(power['ruleId'], 'rule:corruption-force-power')
        self.assertEqual(next(s for s in catalog['sources'] if s['id'] == power['sourceId'])['section'], 'Force Power')
        self.assertEqual(next(p for p in catalog['rulePages'] if p['id'] == power['ruleId'])['article']['blocks'][0]['children'], ['Force Power'])
        self.assertEqual(next(p for p in catalog['rulePages'] if p['id'] == 'rule:corruption')['article']['blocks'][0]['children'], ['Destiny'])

    def test_book_tabs_are_scoped_and_missing_variants_fail_closed(self):
        html = '<p>Common description</p><div class="tabs-tabbox"><label data-tabpos="1">Core Rulebook</label><label data-tabpos="2">Other Book</label><div class="tabs-container"><div class="tabs-content-1"><p>Core traits</p></div><div class="tabs-content-2"><p>Other traits</p></div></div></div>'
        pages = {'Fixture': {'revisions': [{'revid': 42}]}}
        parsed = dict(title='Fixture', revision=42, result={'parse': {'revid': 42, 'text': html}})
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / '.build').mkdir()
            (root / '.build/article-fixture-parse.json').write_text(json.dumps(parsed))
            whole = presentation.article(root, 'Fixture', pages, lambda _: 'source:fixture', {})
            scoped = presentation.article(root, 'Fixture', pages, lambda _: 'source:fixture', {}, variant='Core Rulebook')
            issue = presentation.article(root, 'Fixture', pages, lambda _: 'source:fixture', {}, tab='Other Book')
            self.assertIn('Core Rulebook', json.dumps(whole))
            self.assertIn('Other Book', json.dumps(whole))
            self.assertIn('Common description', json.dumps(scoped))
            self.assertIn('Core traits', json.dumps(scoped))
            self.assertNotIn('Other traits', json.dumps(scoped))
            self.assertNotIn('Common description', json.dumps(issue))
            self.assertIn('Other traits', json.dumps(issue))
            with self.assertRaisesRegex(ValueError, 'Missing wiki variant'):
                presentation.article(root, 'Fixture', pages, lambda _: 'source:fixture', {}, variant='Missing')

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
        self.assertEqual(lightning['status'], 'available')
        self.assertEqual(lightning['mechanicsIds'], ['power:force-lightning'])
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
        # Isolate an unreviewed neighbouring section regardless of live coverage.
        mechanics['talents'] = [r for r in mechanics['talents'] if r['name'] != 'Armor Mastery']
        next(r for r in catalog['records'] if r['name'] == 'Armor Mastery')['mechanicsIds'] = []
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
