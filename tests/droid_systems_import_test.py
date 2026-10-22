import importlib.util,json,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('droid_system_import',ROOT/'tools/import-droid-systems.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
load=lambda name:json.loads((ROOT/name).read_text())

class DroidSystemsImport(unittest.TestCase):
    def test_price_parser_preserves_formulas_and_rejects_guessed_or_negative_prices(self):
        for value,expected in [('250',(250,'flat')),('1,000 x Cost Factor',(1000,'factor')),('10 x Cost Factor x (Base Speed Squared)',(10,'locomotion'))]:
            self.assertEqual(module.formula(value),expected)
        self.assertEqual(module.formula('(5 x Cost Factor) kg',True),(5,'factor'))
        self.assertEqual(module.formula('2.5 Kilograms',True),(2.5,'flat'))
        for value in [None,'-500','Varies','Locomotion System Cost x 2','20 x Max Damage']:
            self.assertEqual(module.formula(value),(None,'manual'))

    def test_jump_servos_uses_the_droid_section_and_not_the_armor_upgrade(self):
        article={'blocks':[{'tag':'h3','children':['Armor Upgrade']},'Cost: 100',{'tag':'h4','children':['Droid System']},'Cost: Locomotion System Cost x 2',{'tag':'h3','children':['Other']},'Do not import']}
        scoped,section=module.select_scope(article)
        self.assertEqual(section,'Droid System');self.assertEqual(scoped['blocks'],['Cost: Locomotion System Cost x 2'])

    def test_every_member_is_an_official_pinned_reference_and_import_is_idempotent(self):
        m,c,index,pins,tables,members=[load(path) for path in ['data/mechanics.json','data/wiki-catalog.json','data/reference-index.json','tools/reviewed-revisions.json','data/droid-system-tables.json','data/droid-system-members.json']]
        refs={r['name']:r for r in index['records']}
        self.assertEqual(len(members['all']),109)
        for name in members['all']:
            self.assertIn(name,refs);self.assertNotIn(name,index['excluded']);self.assertNotIn(refs[name]['id'],index['excluded'])
            self.assertEqual(pins[name],refs[name]['source']['revision'])
        new_m,new_c,new_pins,added=module.build(m,c,index,pins,tables,members)
        self.assertEqual(new_m,m);self.assertEqual(new_c,c);self.assertEqual(new_pins,pins);self.assertEqual(added,[])
        self.assertEqual(sum('droidSystem' in r for r in m['equipment']),134)

    def test_appendage_damage_and_core_armor_are_table_facts(self):
        self.assertEqual(module.APPENDAGES['Hand'][4],'1d3')
        self.assertEqual(module.APPENDAGES['Claw'][4],'1d4')
        self.assertIsNone(module.APPENDAGES['Probe'][3])
        self.assertEqual(len(module.CORE_ARMOR),11)
        self.assertEqual(next(r for r in module.CORE_ARMOR if r[0]=='Neutronium Plating')[2:6],(12100,11,1,20))
