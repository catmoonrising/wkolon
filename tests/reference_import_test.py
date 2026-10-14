import importlib.util
import json
import unittest
from pathlib import Path
from unittest.mock import patch
import tempfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('reference_import', ROOT / 'tools/import-reference-library.py')
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)


class ReferenceImportTests(unittest.TestCase):
    def test_candidates_merge_books_and_exclude_nested_homebrew(self):
        snapshot = {'categories':{'Category:Reference Books':[{'ns':14,'title':'Category:One'},{'ns':14,'title':'Category:Two'}],
            'Category:One':[{'ns':0,'title':'Shared'},{'ns':0,'title':'Homebrew'}],
            'Category:Two':[{'ns':0,'title':'Shared'}],
            'Category:Homebrew Content':[{'ns':14,'title':'Category:Nested'}],
            'Category:Nested':[{'ns':0,'title':'Homebrew'},{'ns':14,'title':'Category:Homebrew Content'}]}}
        books, excluded = reference.candidates(snapshot)
        self.assertEqual(books, {'Shared':['One','Two']})
        self.assertEqual(excluded, {'Homebrew'})

    def test_homebrew_redirect_and_explicit_reference_fail_closed(self):
        def page(title, raw):
            return {'title':title,'revisions':[{'revid':1,'timestamp':'2026-01-01T00:00:00Z','slots':{'main':{'content':raw}}}]}
        self.assertTrue(reference.is_homebrew(page('Unofficial',''), {'Unofficial'}))
        self.assertTrue(reference.is_homebrew(page('Mixed','Reference Book: [[Homebrew Content]]'), set()))
        self.assertTrue(reference.is_homebrew(page('Mixed','[[Category:Homebrew_Content]]'), set()))
        self.assertFalse(reference.is_homebrew(page('Official','Reference Book: [[Core Rulebook]]'), set()))

    def test_ids_and_parse_paths_do_not_collide_on_punctuation_or_revisions(self):
        self.assertNotEqual(reference.identity('A-B'), reference.identity('A B'))
        first={'title':'A-B','revisions':[{'revid':1}]}
        second={'title':'A-B','revisions':[{'revid':2}]}
        self.assertNotEqual(reference.parse_path(first), reference.parse_path(second))

    def test_compile_preserves_full_text_pins_and_records_unfetched_and_excluded_titles(self):
        page={'title':'Official','revisions':[{'revid':42,'timestamp':'2026-01-01T00:00:00Z','slots':{'main':{'content':'Reference Book: [[One]]'}}}]}
        homebrew={'title':'Unofficial','revisions':[{'revid':43,'timestamp':'2026-01-01T00:00:00Z','slots':{'main':{'content':'Reference Book: [[Homebrew Content]]'}}}]}
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'.build/reference').mkdir(parents=True)
            path=root/'.build/reference/parse.json';path.write_text('{}')
            with patch.object(reference,'ROOT',root),patch.object(reference,'OUTPUT',root/'data/reference'),patch.object(reference,'parse_path',return_value=path),patch.object(reference.presentation,'article',return_value={'sourceId':'source:reference-'+reference.digest('Official')[:16],'blocks':[{'tag':'p','children':['Exact wording.']}]}) as article:
                result=reference.compile_library({'capturedAt':'fixture'}, {'Official':['One'],'Alias':['Two'],'Missing':['One'],'Bad alias':['One']}, {'Official':page,'Unofficial':homebrew}, {'Alias':'Official','Bad alias':'Unofficial'}, set(), {})
            self.assertEqual(len(result['records']),1)
            record=result['records'][0]
            self.assertEqual(record['books'],['One','Two'])
            self.assertEqual(record['searchText'],'Exact wording.')
            self.assertEqual(record['source']['revision'],42)
            self.assertEqual(result['pending'],[{'title':'Missing','error':'Not fetched'}])
            self.assertEqual(result['excluded'],['Bad alias'])
            saved=json.loads((root/record['path']).read_text())
            self.assertEqual(saved['article']['blocks'][0]['children'],['Exact wording.'])

    def test_partial_homebrew_sections_and_bare_tab_notices_are_removed(self):
        def node(tag, text):
            return {'tag':tag,'children':[text]}
        notice={'tag':'table','children':[{'tag':'a','href':'https://swse.miraheze.org/wiki/Homebrew_Content','children':['Homebrew Content']}]}
        blocks=[node('p','Official rule'),node('h2','Homebrew Talents'),notice,node('h3','Unofficial Talent'),node('p','Unofficial effect'),node('h2','Official next section'),node('p','Homebrew intoxicants are a pastime.')]
        clean=reference.presentation.official_blocks(blocks)
        self.assertEqual(clean,[blocks[0],blocks[5],blocks[6]])
        tabs=[node('h4','Official NPCs'),node('table','Official NPC'),notice,node('table','Homebrew NPC'),node('h4','Vehicles'),node('table','Official ship')]
        self.assertEqual(reference.presentation.official_blocks(tabs),[tabs[0],tabs[1],tabs[4],tabs[5]])
