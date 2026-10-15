import copy
import importlib.util
import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, ROOT / 'tools' / file)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


importer = module('talent_import', 'import-talents.py')
presentation = module('talent_presentation_test', 'compile-wiki-articles.py')
compiler = module('talent_compiler_test', 'compile-core.py')


def node(tag, *children):
    return dict(tag=tag, children=list(children))


class TalentImportTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pack = json.loads((ROOT / 'data/core.json').read_text())
        cls.sources = {s['id']:s for s in cls.pack['sources']}
        cls.references = {r['name']:r for r in json.loads((ROOT / 'data/reference-index.json').read_text())['records']}
        cls.parser = importer.PrerequisiteParser(cls.pack, [], cls.sources)

    def parse(self, text, choice_type=None):
        return self.parser.parse([node('p', text)], choice_type)

    def test_all_class_and_common_force_tree_sections_are_mapped_to_exact_pinned_sources(self):
        tradition_trees = {r['tree'] for r in self.pack['rules']['traditionTalentAccess']}
        titles = {self.sources[r['sourceId']]['title'] for r in self.pack['catalog']['records'] if r['kind']=='talent' and r['mechanicsIds'] and r['tree'] not in tradition_trees}
        self.assertEqual(len(titles), 146)
        sections = 0
        for title in titles:
            article = json.loads((ROOT / self.references[title]['path']).read_text())['article']
            expected = [importer.text(n).strip() for n in article['blocks'] if isinstance(n,dict) and n['tag']=='h3']
            actual = [self.sources[r['sourceId']]['section'] for r in self.pack['catalog']['records'] if r['kind']=='talent' and r['mechanicsIds'] and self.sources[r['sourceId']]['title']==title]
            self.assertCountEqual(actual,expected,title)
            sections += len(expected)
        self.assertEqual(sections,1036)
        self.assertEqual(len(self.pack['talents']),1156)  # two reviewed reprints

    def test_all_class_access_tables_match_enabled_trees(self):
        pages = {r['sourceId']:r for r in self.pack['rulePages']}
        for cls in self.pack['classes']:
            source = cls['talentAccessSourceId']
            self.assertIn(source,pages)
            found = set()
            for table in importer.nodes(pages[source]['article']['blocks']):
                if table['tag'] != 'table':continue
                for row in importer.nodes(table['children']):
                    if row['tag'] != 'tr':continue
                    cell = next((n for n in row['children'] if isinstance(n,dict) and n['tag']=='td'),None)
                    if cell is None:continue
                    for link in importer.nodes(cell['children']):
                        if link['tag']!='a':continue
                        title = importer.unquote(importer.urlparse(link['href']).path.split('/wiki/')[-1]).replace('_',' ')
                        if title.endswith(' Talent Tree'):found.add('tree:'+importer.slug(title.removesuffix(' Talent Tree')))
            self.assertEqual(found,set(cls['talentTrees']),cls['name'])

    def test_feature_names_with_conjunctions_are_not_split(self):
        for name in ['Blaster and Blade I','Friend or Foe','Adapt and Survive','Strike and Run']:
            requirement,manual,errors = self.parse(name)
            self.assertFalse(manual,name)
            self.assertEqual(requirement['requirements'],[dict(kind='talent',value='talent:'+importer.slug(name))])
        _,manual,errors = self.parse('Blaster and Blade I, Weapon Proficiency (Pistols)')
        self.assertFalse(manual)

    def test_unverified_conjunctions_keep_known_requirements_without_restricting_unknown_alternatives(self):
        req,manual,errors = self.parse('Prerequisites: Armored Augmentation I, Proficient with Armor')
        self.assertIn('talent:armored-augmentation-i',json.dumps(req))
        self.assertEqual(manual,['Prerequisites: Armored Augmentation I, Proficient with Armor'])
        req,manual,errors = self.parse('Prerequisite: Bothan, or two Talents from the Infiltration Talent Tree')
        self.assertEqual(req,dict(kind='all',requirements=[]))
        self.assertTrue(manual)
        req,manual,errors = self.parse('Trained in Mechanics and Use Computer')
        self.assertFalse(manual)
        self.assertIn('skill:mechanics',json.dumps(req));self.assertIn('skill:use-computer',json.dumps(req))

    def test_reference_inheritance_handles_rename_notices_and_does_not_steal_counseling_attribution(self):
        core = node('p','Reference Book: ',node('a','Core Rulebook'))
        other = node('p','Reference Book: ',node('a','Starships of the Galaxy'))
        blocks = [core,node('h2','Core Talents'),node('h3','First'),node('p','Effect'),node('h4','Jedi Counseling'),other,node('p','Clarification'),node('h2','Additional Talents'),node('h3','Second'),node('table','Rename notice'),other,node('p','Supplemental effect')]
        parts = list(importer.sections(dict(blocks=blocks)))
        self.assertEqual(importer.text(parts[0]['blocks'][0]),'Reference Book: Core Rulebook')
        self.assertFalse(any('Core Rulebook' in importer.text(n) for n in parts[1]['blocks']))
        self.assertEqual(presentation.talent_section(blocks,'Second','Example Talent Tree'),parts[1]['blocks'])
        inspiration = [core,node('p',"You can't use these Talents on yourself."),node('h3','First'),node('p','Effect'),node('h3','Second'),node('p','Other effect')]
        isolated = presentation.talent_section(inspiration,'First','Inspiration Talent Tree')
        self.assertIn("can't use",' '.join(importer.text(n) for n in isolated))
        self.assertNotIn('Other effect',' '.join(importer.text(n) for n in isolated))

    def test_local_link_targets_prefer_exact_page_and_section(self):
        parsed = dict(title='Fixture',revision=42,result={'parse':{'revid':42,'text':'<p><a href="/wiki/Shared_Tree#First_Choice">Read</a></p>'}})
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory);file = root/'parse.json';file.write_text(json.dumps(parsed))
            article = presentation.article(root,'Fixture',{'Fixture':{'revisions':[{'revid':42}]}},lambda _:'source:fixture',{'Shared Tree':'rule:whole-tree','Shared Tree#First Choice':'rule:first'},parse_path=file)
        self.assertEqual(article['blocks'][0]['children'][0]['ruleId'],'rule:first')

    def test_reimport_reuses_source_qualified_rule_pages_instead_of_duplicating_them(self):
        wiki = module('talent_reimport_regression','import-wiki.py')
        source = dict(id='source:qualified',title='Example Talent Tree',revision=42,section='First')
        baseline = {k:[] for k in ['species','classes','skills','feats','talents','equipment','classChoices','sources']}
        baseline['sources']=[source]
        baseline['talents']=[dict(id='talent:first',name='First',sourceId=source['id'])]
        baseline['rulePages']=[dict(id='rule:example-first',name='First',sourceId=source['id'])]
        pages = {title:dict(title=title,revisions=[dict(revid=42,timestamp='2024-01-01T00:00:00Z',slots=dict(main=dict(content='Reference Book: [[Core Rulebook]]')))]) for title in ['Example Talent Tree','Weapon Proficiency']}
        def article(root,title,pages,source,targets,**kwargs):
            return dict(sourceId=source(title),blocks=[node('p','Reference Book: Core Rulebook'),node('h3','First'),node('p','Effect')])
        with patch.object(wiki,'SKILLS',[]),patch.object(wiki,'CLASSES',[]),patch.object(wiki,'species_feats',return_value=[]),patch.object(wiki.presentation,'article',side_effect=article):
            catalog = wiki.compile_catalog({'Talent Trees':[]},pages,[],baseline)
        qualified = [r for r in catalog['rulePages'] if r['sourceId']==source['id']]
        self.assertEqual([r['id'] for r in qualified],['rule:example-first'])

    def test_same_name_never_maps_an_unreviewed_talent_from_another_tree(self):
        sources = [dict(id='source:'+s,title=s,revision=1,section='Shared') for s in ['First','Other']]
        talent = dict(id='talent:shared',name='Shared',sourceId='source:First',tree='tree:first')
        mechanics = dict(sources=sources,license={},talents=[talent])
        pages = [dict(id='rule:'+s,name='Shared',sourceId='source:'+s,article=dict(blocks=[])) for s in ['First','Other']]
        catalog = dict(sources=sources,book='Core Rulebook',rulePages=pages,records=[dict(id='catalog:other',name='Shared',kind='talent',sourceId='source:Other',tree='tree:other',mechanicsIds=[])])
        first = compiler.compile_pack(mechanics,catalog,{'First':1,'Other':1})
        self.assertEqual(first['catalog']['records'][0]['mechanicsIds'],[])
        talent['additionalTrees']=['tree:other']
        second = compiler.compile_pack(mechanics,catalog,{'First':1,'Other':1})
        self.assertEqual(second['catalog']['records'][0]['mechanicsIds'],['talent:shared'])




class TraditionImportTest(unittest.TestCase):
    def test_all_tradition_sections_and_membership_pages_have_exact_pinned_sources(self):
        pack=json.loads((ROOT/'data/core.json').read_text())
        sources={s['id']:s for s in pack['sources']}
        refs={r['name']:r for r in json.loads((ROOT/'data/reference-index.json').read_text())['records']}
        count=0
        for membership in pack['rules']['traditionTalentAccess']:
            title=next(s['title'] for t in pack['talents'] if t['tree']==membership['tree'] for s in [sources[t['sourceId']]])
            article=json.loads((ROOT/refs[title]['path']).read_text())['article']
            expected=list(importer.sections(article))
            actual=[r for r in pack['catalog']['records'] if r['kind']=='talent' and r.get('tree')==membership['tree']]
            self.assertCountEqual([r['name'] for r in expected],[r['name'] for r in actual])
            for section in expected:
                compiled=presentation.talent_section(article['blocks'],section['name'],title)
                imported=next(t for t in pack['talents'] if t['tree']==membership['tree'] and t['name']==section['name'])
                def source_tree(value):
                    if isinstance(value,list):return [source_tree(v) for v in value]
                    if isinstance(value,dict):return {k:source_tree(v) for k,v in value.items() if k not in ['ruleId','referenceId']}
                    return value
                self.assertEqual(source_tree(compiled),source_tree(imported['article']['blocks']),section['name'])
            page=next(p for p in pack['rulePages'] if p['id']==membership['ruleId'])
            self.assertEqual(sources[page['sourceId']]['revision'],refs[membership['name']]['source']['revision'])
            count+=len(expected)
        self.assertEqual(count,122)


if __name__ == '__main__':
    unittest.main()
