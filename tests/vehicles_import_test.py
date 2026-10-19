import copy,hashlib,importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('vehicle_import',ROOT/'tools/import-vehicles.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
load=lambda p:json.loads((ROOT/p).read_text())
class VehicleImport(unittest.TestCase):
 def inputs(self):return [load(p) for p in ['data/mechanics.json','data/wiki-catalog.json','data/reference-index.json','tools/reviewed-revisions.json','data/vehicle-redirects.json']]
 def test_idempotence_official_provenance_and_missing_page_report(self):
  m,c,index,pins,redirects=self.inputs();new_m,new_c,new_pins,report=module.build(m,c,index,pins,redirects);self.assertEqual((new_m,new_c,new_pins),(m,c,pins));self.assertEqual(report,load('data/vehicle-catalog-report.json'));self.assertEqual(len(m['vehicles']),471);self.assertEqual([p['name'] for p in report['pending']],['The Crimson Axe']);self.assertTrue(all(p['reason']=='redlink' for p in report['pending']));self.assertEqual(json.loads(module.append((ROOT/'data/mechanics.json').read_text(),m)),m)
  refs={r['id']:r for r in index['records']}
  for v in m['vehicles']:
   ref=refs[v['referenceId']];self.assertEqual(v['name'],ref['name']);self.assertNotIn(v['name'],index['excluded']);self.assertNotIn(v['referenceId'],index['excluded']);self.assertEqual(pins[v['name']],ref['source']['revision']);self.assertNotIn('article',v)
 def test_first_import_adds_the_collection_without_changing_any_existing_mechanics(self):
  m,c,index,pins,redirects=self.inputs();original=copy.deepcopy(m);original.pop('vehicles');rebuilt,_,_,_=module.build(original,c,index,pins,redirects);self.assertEqual(rebuilt,m);self.assertEqual(json.loads(module.append(json.dumps(original,indent=2)+'\n',rebuilt)),m)
 def test_redirects_are_pinned_and_cannot_be_silently_retargeted(self):
  m,c,index,pins,redirects=self.inputs();self.assertEqual(len(redirects['records']),3)
  for r in redirects['records']:self.assertEqual(hashlib.sha256(r['content'].encode()).hexdigest(),r['sha256']);self.assertGreater(r['revision'],0)
  bad=copy.deepcopy(redirects);bad['records'][0]['target']='An invented vehicle'
  with self.assertRaises(AssertionError):module.build(m,c,index,pins,bad)
