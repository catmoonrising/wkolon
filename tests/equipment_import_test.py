import copy, importlib.util, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('equipment_import',ROOT/'tools/import-equipment.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class EquipmentImport(unittest.TestCase):
    def test_explicit_fields_only(self):
        article={'blocks':[{'tag':'p','children':['The cost is 1,000 credits.']},{'tag':'p','children':[{'tag':'b','children':['Cost:']},' 30']},{'tag':'p','children':['Weight: 0.5 Kilograms']}]}
        self.assertEqual(module.fields(article),{'Cost':['30'],'Weight':['0.5 Kilograms']})
    def test_ambiguous_and_non_numeric_values_stay_unknown(self):
        self.assertIsNone(module.single(['30','50']));self.assertEqual(module.single(['30','30']),'30')
        for value in ['Varies','-','30 per meter','1,000 (base)','Not for sale']:self.assertIsNone(module.number(value))
        self.assertIsNone(module.number('Negligible',True));self.assertEqual(module.number('0.25 kg',True),.25);self.assertEqual(module.number('3,000'),3000)
    def test_cleaning_preserves_source_wording_and_wiki_links(self):
        node={'tag':'a','children':['Cover'],'href':'https://swse.miraheze.org/wiki/Cover','referenceId':'reference:cover'};before=copy.deepcopy(node)
        cleaned=module.clean(node);self.assertNotIn('referenceId',cleaned);self.assertEqual(cleaned['href'],node['href']);self.assertEqual(cleaned['children'],['Cover']);self.assertEqual(node,before)
