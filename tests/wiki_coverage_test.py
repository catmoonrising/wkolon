import importlib.util
import unittest
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('wiki_coverage', ROOT / 'tools/discover-books.py')
coverage = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coverage)


def page(title):
    return dict(ns=0, title=title)


def category(title):
    return dict(ns=14, title='Category:' + title)


class WikiCoverageTests(unittest.TestCase):
    def fixture(self):
        return {'Category:Reference Books': [category('One'), category('Two')],
            'Category:One': [page('Mapped'), page('Reference'), page('Missing'), page('Nested homebrew')],
            'Category:Two': [page('Mapped')],
            'Category:Homebrew Content': [category('Nested'), category('Nested')],
            'Category:Nested': [page('Nested homebrew'), category('Homebrew Content')]}

    def pack(self):
        return dict(sources=[dict(id='source:mapped', title='Mapped'), dict(id='source:reference', title='Reference')],
            rulePages=[dict(sourceId='source:reference')],
            feats=[dict(sourceId='source:mapped')], rules={})

    def test_nested_exclusions_cycles_shared_titles_and_partial_coverage(self):
        result = coverage.coverage(dict(capturedAt='fixture', categories=self.fixture()), self.pack())
        self.assertEqual(result['uniquePages'], 3)
        self.assertEqual(result['excludedPages'], ['Nested homebrew'])
        one, two = result['books']
        self.assertEqual(one['excluded'], ['Nested homebrew'])
        self.assertEqual({p['title']:p['status'] for p in one['pages']},
                         {'Mapped':'mapped', 'Reference':'reference', 'Missing':'unimported'})
        self.assertEqual(two['pages'], [dict(title='Mapped', status='mapped')])
        report = coverage.markdown(result)
        self.assertIn('does not mean every rule', report)
        self.assertIn('| One | 3 | 1 | 1 | 1 | 1 |', report)

    def test_capture_reuses_book_fetches_but_still_traverses_shared_homebrew_children(self):
        categories = self.fixture()
        categories['Category:Reference Books'].append(category('Nested'))
        counts = Counter()
        def fetch(title):
            counts[title] += 1
            return categories[title]
        captured = coverage.capture_categories(fetch)
        self.assertEqual(captured, {k:sorted(v, key=lambda m:(m['ns'],m['title'])) for k,v in categories.items()})
        self.assertTrue(all(count == 1 for count in counts.values()))

    def test_incomplete_snapshots_and_existing_homebrew_fail_closed(self):
        categories = self.fixture()
        del categories['Category:Nested']
        with self.assertRaises(KeyError):
            coverage.coverage(dict(capturedAt='fixture', categories=categories), self.pack())
        pack = self.pack()
        pack['sources'][0]['title'] = 'Nested homebrew'
        with self.assertRaisesRegex(ValueError, 'Embedded Homebrew requires removal'):
            coverage.coverage(dict(capturedAt='fixture', categories=self.fixture()), pack)

    def test_rule_mappings_count_their_source_without_importing_or_enabling_prose(self):
        pack = self.pack()
        pack['feats'] = []
        pack['rules'] = {'fixture':{'sourceIds':['source:mapped']}}
        result = coverage.coverage(dict(capturedAt='fixture', categories=self.fixture()), pack)
        self.assertEqual(result['books'][1]['pages'][0]['status'], 'mapped')
        self.assertEqual(result['uniqueImportedPages'], 1)
        self.assertEqual(result['uniqueMappedPages'], 1)

    def test_external_references_and_redirect_aliases_count_as_text_without_mechanics(self):
        reference = {'records':[{'name':'Canonical missing','aliases':['Missing']}]}
        result = coverage.coverage(dict(capturedAt='fixture', categories=self.fixture()), self.pack(), reference)
        self.assertEqual(result['uniqueImportedPages'], 2)
        self.assertEqual(result['uniqueMappedPages'], 1)
        self.assertEqual(next(p['status'] for p in result['books'][0]['pages'] if p['title']=='Missing'), 'reference')

    def test_selectable_page_coverage_deduplicates_variants_and_separates_automation(self):
        pack = self.pack()
        pack['equipment'] = [dict(sourceId='source:mapped', kind='gear', automation='manual'),
                             dict(sourceId='source:mapped', kind='gear', automation='partial')]
        reference = {'records':[dict(name='Mapped', kind='gear'), dict(name='Missing', kind='gear')]}
        result = coverage.coverage(dict(capturedAt='fixture', categories=self.fixture()), pack, reference)
        row = next(r for r in result['selectableOptions'] if r['name'] == 'General gear (included above)')
        self.assertEqual((row['entries'], row['pages'], row['totalPages']), (2, 1, 2))
        self.assertEqual((row['manual'], row['partial']), (1, 1))
        report = coverage.markdown(result)
        self.assertIn('| General gear (included above) | 2 | 1 / 2 (50.0%) |', report)
        self.assertIn('| General gear (included above) | 1 | 1 |', report)
        self.assertIn('not that the whole option is automated', report)
