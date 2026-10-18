#!/usr/bin/env python3
"""Add the three remaining official species from pinned primary articles."""
import argparse,copy,importlib.util,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
generic=module('remaining_equipment','import-equipment.py')
def clean(v):return [clean(n) for n in v] if isinstance(v,list) else generic.clean(v)
def build(mechanics,catalog,index,pins,groups):
 m=copy.deepcopy(mechanics);c=copy.deepcopy(catalog);pins=copy.deepcopy(pins);sources={r['id']:r for r in c['sources']};pages={r['id']:r for r in c['rulePages']};records={r['id']:r for r in c['records']};refs={r['name']:r for r in index['records']}
 def register(source,article):
  sid=source['id'];sources[sid]=source
  old=next((r for r in m['sources'] if r['id']==sid),None)
  if old is None:m['sources'].append(source)
  else:assert old==source
  if source['title'] in pins:assert pins[source['title']]==source['revision']
  pins[source['title']]=source['revision'];rid='rule:'+sid.removeprefix('source:wiki-');pages[rid]=dict(id=rid,name=source['title'].removeprefix('Category:'),sourceId=sid,article=dict(sourceId=sid,blocks=clean(article['blocks'])));return rid
 group_names=set()
 for group in groups['records']:register(group['source'],group['article']);group_names.update(group['members'])
 allowed=[r['id'] for r in m['equipment'] if r.get('droidSystem') and (r['droidSystem']['category'] in ['appendage','armor'] or r['id']=='equipment:compartment-space' or r.get('family')=='Translator Unit' or (r.get('family') or r['name']) in group_names)]
 languages=copy.deepcopy(next(s for s in m['species'] if s['id']=='species:custom-droid')['creationChoices'][-1]['options'])
 common=dict(defenses={},bonusFeats=0,bonusSkills=0,conditionalFocus=None,reminders=[],automation='partial',size='medium',speed=6)
 profiles={
  'Replica Droid':dict(abilityAdjustments=dict(str=2,dex=2,cha=-2),languages=['Binary'],isDroid=True,noConstitution=True,heuristicProcessor=False,droidDegree=4,droidTalentTrees=['tree:4th-degree-droid'],maintenance=False,forceRestrictions=dict(forbidSensitivity=True,forbidChecks=True),forbiddenClasses=['class:jedi'],conditionalFocus='skill:deception',droidBody=dict(processor='equipment:basic-processor',speed='species',bonusSystems=['equipment:internal-comlink','equipment:darkvision-package','equipment:diagnostics-package','equipment:improved-sensor-package','equipment:compartment-space','equipment:translator-unit-dc-15'],bonusSystemCount=2),creationChoices=[dict(id='size',name='Size',kind='size',options=[dict(id='medium',name='Medium',size='medium',speed=6,adjustments={}),dict(id='small',name='Small',size='small',speed=4,adjustments={})]),dict(id='language',name='Native language',kind='spokenLanguage',options=languages)]),
  'Shard':dict(abilityAdjustments=dict(wis=2,dex=-2),languages=['Basic','Binary'],speed=None,usesDroidSystems=True,cybernetic=True,repairOnly=True,startingTrainedSkills=['skill:use-computer'],droidBody=dict(speed='manual',allowedSystems=allowed,sourceIds=[r['source']['id'] for r in groups['records']])),
  'Sorcerer of Rhand':dict(abilityAdjustments=dict(int=4,wis=2,str=-2,dex=-2,cha=-2),languages=['Basic'],startingFeats=['feat:force-sensitivity'],bonusForceTraining=dict(requiredDescriptor='dark-side',fraction=.5,forbiddenDescriptors=['light-side']),skillRerolls=[dict(skill='skill:persuasion',when='intimidate',keep='best')],conditionalDefenses=[dict(defense='will',against='persuasion',amount=5,type='untyped')],gmQualities=dict(minimum=1,maximum=3))
 }
 for name,profile in profiles.items():
  ref=refs[name];assert ref['kind']=='species' and ref['id'] not in index['excluded'] and name not in index['excluded'];pin=json.loads((ROOT/ref['path']).read_text());assert pin['source']==ref['source'];sid='source:wiki-'+generic.slug(name);source={**ref['source'],'id':sid,'section':None};rid=register(source,pin['article']);item={**copy.deepcopy(common),**profile,'id':'species:'+generic.slug(name),'name':name,'sourceId':sid}
  old=next((r for r in m['species'] if r['id']==item['id']),None)
  if old is None:m['species'].append(item)
  else:assert old==item,item['id']
  existing=next((r for r in c['records'] if r['kind']=='species' and r['name']==name),None);cid=existing['id'] if existing else 'catalog:species-'+generic.slug(name);records[cid]=dict(id=cid,name=name,kind='species',sourceId=sid,ruleId=rid,books=ref['books'],mechanicsIds=[item['id']])
 c['sources']=sorted(sources.values(),key=lambda r:r['id']);c['rulePages']=sorted(pages.values(),key=lambda r:r['id']);c['records']=sorted(records.values(),key=lambda r:(r['kind'],r['name']))
 return m,c,pins
def append(original,updated):
 old=json.loads(original)
 for key in old:
  if key not in ['sources','species']:assert old[key]==updated[key],key
 for key in ['sources','species']:
  assert updated[key][:len(old[key])]==old[key],key;added=updated[key][len(old[key]):]
  if not added:continue
  start=original.index('[',original.index('"'+key+'":'));_,end=json.JSONDecoder().raw_decode(original,start);prefix=original[:end-1].rstrip()+(',' if old[key] else '');original=prefix+'\n'+',\n'.join('    '+json.dumps(r,ensure_ascii=False,separators=(',',':')) for r in added)+'\n  '+original[end-1:]
 assert json.loads(original)==updated;return original
def main():
 cli=argparse.ArgumentParser(description=__doc__);cli.add_argument('--apply',action='store_true');args=cli.parse_args();load=lambda p:json.loads((ROOT/p).read_text());m,c,p=build(load('data/mechanics.json'),load('data/wiki-catalog.json'),load('data/reference-index.json'),load('tools/reviewed-revisions.json'),load('data/shard-system-groups.json'));print('Species profiles',len(m['species']))
 if args.apply:
  path=ROOT/'data/mechanics.json';path.write_text(append(path.read_text(),m));(ROOT/'data/wiki-catalog.json').write_text(json.dumps(c,ensure_ascii=False,separators=(',',':'))+'\n');(ROOT/'tools/reviewed-revisions.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
