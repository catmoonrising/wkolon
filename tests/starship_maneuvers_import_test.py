import copy,importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('starship_maneuver_import',ROOT/'tools/import-starship-maneuvers.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
load=lambda p:json.loads((ROOT/p).read_text())
class StarshipManeuverImport(unittest.TestCase):
 def test_idempotence_pinned_sources_and_homebrew_exclusion(self):
  m,c,index,pins=[load(p) for p in ['data/mechanics.json','data/wiki-catalog.json','data/reference-index.json','tools/reviewed-revisions.json']];rebuilt=module.build(m,c,index,pins);self.assertEqual(rebuilt,(m,c,pins));self.assertEqual(json.loads(module.append((ROOT/'data/mechanics.json').read_text(),m)),m)
  self.assertEqual(len(m['starshipManeuvers']),27);refs={r['name']:r for r in index['records']}
  for r in m['starshipManeuvers']:
   ref=refs[r['name']];self.assertNotIn(ref['id'],index['excluded']);self.assertNotIn(r['name'],index['excluded']);self.assertEqual(pins[r['name']],ref['source']['revision'])
 def test_intercept_scope_does_not_import_the_same_named_force_power(self):
  index=load('data/reference-index.json');ref=next(r for r in index['records'] if r['name']=='Intercept');article=load(ref['path'])['article'];scoped,section=module.scope(article,'Intercept');text=module.text(scoped['blocks']);self.assertEqual(section,'Starship Maneuver');self.assertIn('initiate a Dogfight',text);self.assertNotIn('telekinetically hurl',text)
 def test_first_import_preserves_existing_mechanics_except_tactics_capacity(self):
  m,c,index,pins=[load(p) for p in ['data/mechanics.json','data/wiki-catalog.json','data/reference-index.json','tools/reviewed-revisions.json']];original=copy.deepcopy(m);original.pop('starshipManeuvers');original['sources']=[s for s in original['sources'] if not s['id'].startswith('source:wiki-starship-maneuver-')];feat=next(f for f in original['feats'] if f['id']=='feat:starship-tactics');feat['effects']=[];feat['automation']='manual';rebuilt,_,_=module.build(original,c,index,pins);self.assertEqual(rebuilt,m);self.assertEqual(json.loads(module.append(json.dumps(original,indent=2)+'\n',rebuilt)),m)
