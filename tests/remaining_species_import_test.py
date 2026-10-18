import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('remaining_species_import',ROOT/'tools/import-remaining-species.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
load=lambda name:json.loads((ROOT/name).read_text())

class RemainingSpeciesImport(unittest.TestCase):
    def test_import_is_idempotent_and_only_appends_species_and_sources(self):
        m,c,index,pins,groups=[load(p) for p in ['data/mechanics.json','data/wiki-catalog.json','data/reference-index.json','tools/reviewed-revisions.json','data/shard-system-groups.json']]
        rebuilt=module.build(m,c,index,pins,groups)
        self.assertEqual(rebuilt,(m,c,pins))
        ids={'species:replica-droid','species:shard','species:sorcerer-of-rhand'}
        original=json.loads(json.dumps(m));original['species']=[s for s in m['species'] if s['id'] not in ids]
        original['sources']=[s for s in m['sources'] if s['title'] not in ['Replica Droid','Shard','Sorcerer of Rhand','Category:Communications Systems','Category:Sensor Systems']]
        updated,_,_=module.build(original,c,index,pins,groups)
        self.assertEqual(updated,m)
        self.assertEqual(json.loads(module.append(json.dumps(original,indent=2)+'\n',updated)),m)
        refs={r['name']:r for r in index['records']}
        for name in ['Replica Droid','Shard','Sorcerer of Rhand']:
            self.assertNotIn(name,index['excluded']);self.assertNotIn(refs[name]['id'],index['excluded'])
            self.assertEqual(pins[name],refs[name]['source']['revision'])
            self.assertEqual(sum(r['name']==name and r['kind']=='species' for r in c['records']),1)

    def test_shard_allowed_systems_follow_pinned_memberships_without_allowing_locomotion_or_processors(self):
        m=load('data/mechanics.json');groups=load('data/shard-system-groups.json')
        shard=next(s for s in m['species'] if s['id']=='species:shard')
        allowed=set(shard['droidBody']['allowedSystems']);equipment={e['id']:e for e in m['equipment']}
        self.assertIn('equipment:hand',allowed);self.assertIn('equipment:internal-comlink',allowed);self.assertIn('equipment:improved-sensor-package',allowed)
        for id in allowed:self.assertNotIn(equipment[id]['droidSystem']['category'],['processor','locomotion'])
        self.assertEqual([g['source']['revision'] for g in groups['records']],[4334,4338])
        self.assertEqual([len(g['members']) for g in groups['records']],[7,6])
