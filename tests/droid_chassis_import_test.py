import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('chassis',ROOT/'tools/import-droid-chassis.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class ChassisImport(unittest.TestCase):
 def test_pinned_chassis_import_is_idempotent_and_keeps_unrelated_mechanics(self):
  load=lambda p:json.loads((ROOT/p).read_text())
  m,c,p=load('data/mechanics.json'),load('data/wiki-catalog.json'),load('tools/reviewed-revisions.json')
  updated,catalog,pins=module.build(m,c,load('data/reference-index.json'),p)
  self.assertEqual(updated,m);self.assertEqual(catalog,c);self.assertEqual(pins,p)
  self.assertEqual(module.append((ROOT/'data/mechanics.json').read_text(),updated),(ROOT/'data/mechanics.json').read_text())
  expected={'Medical Droid':21070,'Astromech Droid':15988,'Mechanic Droid':21068,'Protocol Droid':21087,'Service Droid':21109,'Battle Droid':16166,'Probe Droid':21085,'Labor Droid':21061}
  self.assertEqual({s['name'] for s in m['species'] if s.get('droidChassis')},set(expected))
  for name,revision in expected.items():
   self.assertEqual(pins[name],revision)
   source=next(s for s in m['sources'] if s['title']==name)
   self.assertEqual(source['revision'],revision)
   self.assertTrue(source['sha256'])
