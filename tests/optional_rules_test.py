import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('optional_compiler', ROOT / 'tools/compile-optional-rules.py')
compiler = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compiler)


class OptionalRulesTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((ROOT / 'data/optional-rules-manifest.json').read_text())
        cls.index = json.loads((ROOT / 'data/reference-index.json').read_text())

    def load(self, path):
        return json.loads((ROOT / path).read_text())

    def test_offline_rebuild_matches_embedded_catalog_and_documentation(self):
        built = compiler.compile_catalog(self.manifest, self.index, self.load)
        self.assertEqual(built, self.load('data/optional-rules.json'))
        self.assertEqual(built, self.load('data/core.json')['optionalRules'])
        self.assertEqual(compiler.documentation(built, self.manifest), (ROOT / 'docs/optional-rules.md').read_text())
        self.assertEqual(len(built['entries']), 40)
        self.assertFalse(set(r['source']['title'] for r in built['entries']) & set(self.index['excluded']))

    def test_new_optional_mentions_changed_revisions_and_missing_reviews_fail_closed(self):
        index = copy.deepcopy(self.index)
        extra = copy.deepcopy(index['records'][0])
        extra.update(name='New Optional Rule', searchText='Optional rule: newly discovered mechanics.')
        index['records'].append(extra)
        with self.assertRaisesRegex(AssertionError, 'audit needs review'):
            compiler.compile_catalog(self.manifest, index, self.load)
        manifest = copy.deepcopy(self.manifest)
        manifest['entries'][0]['revision'] += 1
        with self.assertRaises(AssertionError):
            compiler.compile_catalog(manifest, self.index, self.load)
        manifest = copy.deepcopy(self.manifest)
        manifest['audit'].pop()
        with self.assertRaisesRegex(AssertionError, 'audit needs review'):
            compiler.compile_catalog(manifest, self.index, self.load)


if __name__ == '__main__':
    unittest.main()
