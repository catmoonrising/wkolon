#!/usr/bin/env python3
"""Enable the eight official chassis from pinned reference articles, offline."""
import argparse, copy, importlib.util, json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('remaining_species', ROOT/'tools/import-remaining-species.py')
base = importlib.util.module_from_spec(spec); spec.loader.exec_module(base)

def build(mechanics, catalog, index, pins):
 m,c,pins=copy.deepcopy(mechanics),copy.deepcopy(catalog),copy.deepcopy(pins)
 refs={r['name']:r for r in index['records']}
 def register(name):
  ref=refs[name];raw=json.loads((ROOT/ref['path']).read_text());assert raw['source']==ref['source']
  source={**ref['source'],'id':'source:wiki-'+base.generic.slug(name),'section':None}
  if name in pins:assert pins[name]==source['revision']
  pins[name]=source['revision'];rid='rule:'+base.generic.slug(name)
  for target,key,value in [(m,'sources',source),(c,'sources',source),(c,'rulePages',dict(id=rid,name=name,sourceId=source['id'],article=dict(sourceId=source['id'],blocks=base.clean(raw['article']['blocks']))))]:
   old=next((r for r in target[key] if r['id']==value['id']),None)
   if old is None:target[key].append(value)
   else:assert old==value
  return source['id'],rid,ref['books']
 def system(id,**extra):return dict(id='equipment:'+id,**extra)
 def focus(skills):return dict(id='focus',name='Skill Focus',kind='skillFocus',options=[dict(id=s,name=next(r['name'] for r in m['skills'] if r['id']=='skill:'+s),skillId='skill:'+s) for s in skills])
 def training(skills):return {**focus(skills),'id':'training','name':'Skill Training','kind':'skillTraining'}
 def featgroup(id,name,ids):return dict(id=id,name=name,kind='startingFeat',options=[dict(id=f.removeprefix('feat:'),name=next(r['name'] for r in m['feats'] if r['id']==f),featId=f) for f in ids])
 profile={
  'Medical Droid':dict(degree=1,adjust=dict(int=2,str=-2),processor='heuristic',systems=[system('walking',speed=6),system('heuristic-processor'),system('hand'),system('hand'),system('tool-mount'),system('improved-sensor-package'),system('vocabulator')],trained='treat-injury',choices=[focus(['knowledge-life-sciences','treat-injury'])]),
  'Astromech Droid':dict(degree=2,adjust=dict(int=2,cha=-2),processor='heuristic',size='small',systems=[system('wheeled',speed=6),system('walking',speed=4),system('magnetic-feet'),system('heuristic-processor'),*[system('tool-mount') for _ in range(6)],system('claw'),system('astrogation-buffer-5-memory-units'),system('diagnostics-package'),system('compartment-space',units=2)],trained='mechanics',choices=[focus(['mechanics','use-computer'])],understands=True),
  'Mechanic Droid':dict(degree=2,adjust=dict(int=2,cha=-2),processor='basic',systems=[system('walking',speed=6,alternatives=['equipment:walking','equipment:tracked','equipment:wheeled']),system('basic-processor'),system('hand'),system('hand'),*[system('tool-mount') for _ in range(4)],system('diagnostics-package'),system('compartment-space',units=2),system('vocabulator')],trained='mechanics',rerolls=[dict(skill='skill:mechanics',keep='replace')]),
  'Protocol Droid':dict(degree=3,adjust=dict(wis=2,cha=2,dex=-2),processor='basic',systems=[system('walking',speed=6),system('basic-processor'),system('hand'),system('hand'),system('translator-unit-dc-10'),system('vocabulator')],trained='persuasion',choices=[training(['knowledge-bureaucracy','knowledge-galactic-lore','knowledge-social-sciences'])]),
  'Service Droid':dict(degree=3,adjust=dict(cha=2,str=-2),processor='basic',systems=[system('walking',speed=6),system('basic-processor'),system('hand'),system('hand'),system('tool-mount'),system('vocabulator')],choices=[training(['perception','knowledge-bureaucracy','knowledge-galactic-lore'])]),
  'Battle Droid':dict(degree=4,adjust=dict(dex=2,int=-2),processor='basic',systems=[system('walking',speed=6),system('basic-processor'),system('hand'),system('hand'),system('plasteel-shell'),system('internal-comlink'),system('locked-access'),system('vocabulator')],choices=[featgroup('armor','Armor Proficiency',['feat:armor-proficiency-'+s for s in ['light','medium','heavy']]),featgroup('weapon','Weapon Proficiency',[r['id'] for r in m['feats'] if r['id'].startswith('feat:weapon-proficiency-')])]),
  'Probe Droid':dict(degree=4,adjust=dict(wis=2,cha=-2),processor='heuristic',systems=[system('hovering',speed=6),system('heuristic-processor'),system('hand'),system('tool-mount'),system('improved-sensor-package'),system('darkvision-package'),system('internal-comlink'),system('locked-access')],trained='perception',choices=[focus(['perception','stealth'])],understands=True),
  'Labor Droid':dict(degree=5,adjust=dict(str=2,int=-2),processor='basic',systems=[system('walking',speed=6),system('basic-processor'),system('claw'),system('claw'),system('durasteel-shell'),system('vocabulator')],rerolls=[dict(skill=r['id'],keep='best') for r in m['skills'] if r['ability']=='str']),
 }
 for name,p in profile.items():
  sid,rid,books=register(name);ident='species:'+base.generic.slug(name)
  systems=[];ordinal=0
  for n,row in enumerate(p['systems'],1):
   row={**row,'slot':'chassis-'+str(n)}
   if row.get('speed') is not None:ordinal+=1;row['ordinal']=ordinal
   systems.append(row)
  item=dict(id=ident,name=name,sourceId=sid,abilityAdjustments=p['adjust'],defenses={},size=p.get('size','medium'),speed=6,languages=['Binary'] if p.get('understands') else ['Basic','Binary'],bonusFeats=0,bonusSkills=0,conditionalFocus=None,reminders=[],automation='partial',isDroid=True,noConstitution=True,heuristicProcessor=p['processor']=='heuristic',droidDegree=p['degree'],droidTalentTrees=['tree:'+str(p['degree'])+{1:'st',2:'nd',3:'rd'}.get(p['degree'],'th')+'-degree-droid'],forceRestrictions=dict(forbidSensitivity=True,forbidChecks=True),forbiddenClasses=['class:jedi'],droidBody=dict(speed='species'),droidChassis=dict(systems=systems,swapTolerance=.1))
  if p.get('understands'):item['understoodLanguages']=['Basic']
  if p.get('trained'):item['startingTrainedSkills']=['skill:'+p['trained']]
  if p.get('choices'):item['creationChoices']=p['choices']
  if p.get('rerolls'):item['skillRerolls']=p['rerolls']
  if name=='Astromech Droid':item['speeds']={'walk':4}
  old=next((r for r in m['species'] if r['id']==ident),None)
  if old is None:m['species'].append(item)
  else:assert old==item
  record=dict(id='catalog:species-'+base.generic.slug(name),name=name,kind='species',sourceId=sid,ruleId=rid,books=books,mechanicsIds=[ident])
  old=next((r for r in c['records'] if r['id']==record['id']),None)
  if old is None:c['records'].append(record)
  else:assert old==record
 # No separate priced article is inventoried. Preserve the named five-unit
 # factory accessory without fabricating a price, weight or automated benefit.
 sid,rid,books=register('Astromech Droid')
 buffer=dict(id='equipment:astrogation-buffer-5-memory-units',name='Astrogation Buffer (5 Memory Units)',kind='gear',sourceId=sid,cost=None,weight=None,availability=[],automation='manual',droidSystem=dict(category='accessory',costModel='manual',weightModel='manual'))
 if not any(r['id']==buffer['id'] for r in m['equipment']):m['equipment'].append(buffer)
 buffer_record=dict(id='catalog:equipment-astrogation-buffer-5-memory-units',name=buffer['name'],kind='gear',sourceId=sid,ruleId=rid,books=books,mechanicsIds=[buffer['id']])
 if not any(r['id']==buffer_record['id'] for r in c['records']):c['records'].append(buffer_record)
 c['sources'].sort(key=lambda r:r['id']);c['rulePages'].sort(key=lambda r:r['id']);c['records'].sort(key=lambda r:(r['kind'],r['name']))
 return m,c,pins

def append(original,updated):
 old=json.loads(original)
 for key in old:
  if key not in ['sources','species','equipment']:assert old[key]==updated[key],key
 for key in ['sources','species','equipment']:
  assert updated[key][:len(old[key])]==old[key],key;added=updated[key][len(old[key]):]
  if not added:continue
  start=original.index('[',original.index('"'+key+'":'));_,end=json.JSONDecoder().raw_decode(original,start)
  original=original[:end-1].rstrip()+(',' if old[key] else '')+'\n'+',\n'.join('    '+json.dumps(r,ensure_ascii=False,separators=(',',':')) for r in added)+'\n  '+original[end-1:]
 assert json.loads(original)==updated
 return original

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args()
 load=lambda p:json.loads((ROOT/p).read_text());m,c,p=build(load('data/mechanics.json'),load('data/wiki-catalog.json'),load('data/reference-index.json'),load('tools/reviewed-revisions.json'))
 print('Droid chassis:',len([s for s in m['species'] if s.get('droidChassis')]))
 if args.apply:
  target=ROOT/'data/mechanics.json';target.write_text(append(target.read_text(),m));(ROOT/'data/wiki-catalog.json').write_text(json.dumps(c,ensure_ascii=False,separators=(',',':'))+'\n');(ROOT/'tools/reviewed-revisions.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
