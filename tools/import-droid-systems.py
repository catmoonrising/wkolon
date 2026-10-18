#!/usr/bin/env python3
"""Import official pinned Droid System options and explicit pricing models.

Effects and complex upgrade prices stay Manual unless separately reviewed.
Category membership supplies discovery, never permission to import Homebrew.
"""
import argparse,copy,importlib.util,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def module(name,file):
 spec=importlib.util.spec_from_file_location(name,ROOT/'tools'/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
generic=module('system_equipment','import-equipment.py')
text=generic.text;slug=generic.slug
def clean(value):return [clean(n) for n in value] if isinstance(value,list) else generic.clean(value)
LOCOMOTIONS={
 'Walking':([4,6,8],10,'normal',0,True),
 'Wheeled':([6,8,10],5,'double',0,False),
 'Tracked':([4,6,8],20,'ignore',-5,True),
 'Hovering':([6,6,6],100,'ignore',0,True),
 'Flying':([9,12,12],200,'ignore',0,True),
 'Stationary':([0,0,0],0,'normal',0,True),
}
APPENDAGES={'Claw':[None,'1','1d2','1d3','1d4','1d6','1d8','2d6','2d8'],'Hand':[None,None,'1','1d2','1d3','1d4','1d6','1d8','2d6'],'Tool Mount':[None,None,'1','1d2','1d3','1d4','1d6','1d8','2d6'],'Instrument':[None,None,None,'1','1d2','1d3','1d4','1d6','1d8'],'Probe':[None,None,None,None,'1','1d2','1d3','1d4','1d6']}
SIZES=['fine','diminutive','tiny','small','medium','large','huge','gargantuan','colossal']
# Only independently reviewed effects. Other installed items retain Manual.
EXTERNAL={'Droid Caller','Droid Command Station','Droid Battle Station','Droid Oil Bath','Droid Recharge Station','Earphone Binary-to-Basic Translator','Remote Processor','Personality Downloader','Remote Starship Starter'}
UPGRADES={'Extra Legs','Jump Servos','Magnetic Feet','Exclusive','Limited','Gyroscopic Stabilizers','Climbing Claws','Magnetic Hands','Projectile Appendage','Quick-Release Coupling','Remote Limb Control','Rocket Arm','Stabilized','Telescopic'}
CORE_ARMOR=[('Plasteel Shell','light',400,2,5,2,[]),('Quadanium Shell','light',900,3,4,3,[]),('Durasteel Shell','light',1600,4,4,8,[]),('Quadanium Plating','light',2500,5,3,10,['licensed']),('Durasteel Plating','light',3600,6,3,12,['licensed']),('Quadanium Battle Armor','medium',4900,7,3,7,['restricted']),('Duranium Plating','medium',6400,8,2,16,['restricted']),('Durasteel Battle Armor','medium',9600,8,3,8,['restricted']),('Mandalorian Steel Shell','heavy',8100,9,3,9,['military','rare']),('Duranium Battle Armor','heavy',10000,10,2,10,['military']),('Neutronium Plating','heavy',12100,11,1,20,['military'])]
DROID_ARMOR={'Duravlex Shell':('light',1000,4,3,10,['licensed']),'Laminanium Plating':('light',3000,4,3,15,['military']),'Crystadurium Plating':('heavy',50000,10,2,30,['military','rare']),'Laminanium Heavy Plating':('heavy',20000,12,2,15,['military','rare'])}

def select_scope(article):
 blocks=article['blocks']
 for i,n in enumerate(blocks):
  if isinstance(n,dict) and n['tag'] in ['h2','h3','h4','h5'] and text(n).strip()=='Droid System':
   depth=int(n['tag'][1]);end=next((j for j in range(i+1,len(blocks)) if isinstance(blocks[j],dict) and blocks[j]['tag'] in ['h2','h3','h4','h5'] and int(blocks[j]['tag'][1])<=depth),len(blocks));return dict(blocks=blocks[i+1:end]),'Droid System'
 return article,None

def formula(value,weight=False):
 if value is None:return None,'manual'
 v=value.replace('\xa0',' ').replace('×','x').strip().rstrip('.')
 if weight:v=re.sub(r'\s*(?:Kilograms?|kg)$','',v,flags=re.I).strip()
 if v.startswith('(') and v.endswith(')'):v=v[1:-1].strip()
 if re.fullmatch(r'\d[\d,]*(?:\.\d+)?',v):return float(v.replace(',','')),'flat'
 match=re.fullmatch(r'(\d[\d,]*(?:\.\d+)?)\s*x\s*Cost Factor(?:\s*x\s*(?:\(Base Speed Squared\)|Base Speed Squared|Speed Squared))?',v,re.I)
 if match:return float(match[1].replace(',','')),'locomotion' if 'Speed' in v else 'factor'
 return None,'manual'

def table_rows(article):
 def walk(n,tag):
  if isinstance(n,dict):
   if n['tag']==tag:yield n
   for c in n['children']:yield from walk(c,tag)
 for table in article['blocks']:
  if not isinstance(table,dict) or table['tag']!='table':continue
  for row in walk(table,'tr'):
   cells=[n for n in row['children'] if isinstance(n,dict) and n['tag'] in ['td','th']]
   yield [text(n).strip().replace('\xa0',' ') for n in cells]

def variants(name,article,base):
 rows=list(table_rows(article));result=[]
 if name in ['Remote Processor','Remote Receiver','Translator Unit','Hardened Systems','Shield Generator System']:
  for row in rows:
   if len(row)<3:continue
   key=row[0].removeprefix(name).strip()
   if name.startswith('Remote ') and not re.search(r'\d.*km',key,re.I):continue
   if name=='Translator Unit' and not re.fullmatch(r'DC\s*\d+',key,re.I):continue
   if name=='Hardened Systems' and not re.fullmatch(r'[x×]\s*[2-5]',key,re.I):continue
   if name=='Shield Generator System' and not re.search(r'\b(?:SR\s*)?(?:5|10|15|20)\b',key):continue
   cost,cm=formula(row[1]);weight,wm=formula(row[2],True)
   if cost is None:continue
   record=copy.deepcopy(base);record.update(id=base['id']+'-'+slug(key),family=name,variant=key,cost=cost,weight=weight);record['droidSystem'].update(costModel=cm,weightModel='accessory' if wm=='factor' else wm)
   if len(row)>3:record['availability']=[k for k in ['licensed','restricted','military','illegal','rare'] if re.search(r'\b'+k+r'\b',row[3],re.I)]
   result.append(record)
 if name=='Holographic Image Disguiser':
  for key,cost in [('Standard',20000),('Advanced',40000)]:
   record=copy.deepcopy(base);record.update(id=base['id']+'-'+slug(key),family=name,variant=key,cost=cost,weight=20);record['droidSystem'].update(costModel='factor',weightModel='accessory');result.append(record)
 return result or [base]

def build(mechanics,catalog,index,pins,tables,members):
 m=copy.deepcopy(mechanics);cat=copy.deepcopy(catalog);pins=copy.deepcopy(pins);refs={r['name']:r for r in index['records']};sources={r['id']:r for r in cat['sources']};pages={r['id']:r for r in cat['rulePages']};records={r['id']:r for r in cat['records']};known={r['id'] for r in m['equipment']};mechanical_sources={r['id'] for r in m['sources']};report=[]
 def register(source,article):
  old=sources.get(source['id']);assert old is None or all(old.get(k)==source.get(k) for k in ['title','revision','section','timestamp']),source['id'];sources[source['id']]=source
  if source['id'] not in mechanical_sources:m['sources'].append(source);mechanical_sources.add(source['id'])
  if source['title'] in pins:assert pins[source['title']]==source['revision'],source['title']
  pins[source['title']]=source['revision'];rid='rule:'+source['id'].removeprefix('source:wiki-');pages[rid]=dict(id=rid,name=source['title'].removeprefix('Category:'),sourceId=source['id'],article=dict(sourceId=source['id'],blocks=clean(article['blocks'])));return rid
 for record in tables['records']:register(record['source'],record['article'])
 names=members['all'];assert len(names)==109 and len(set(names))==109
 for name in names:
  entry=refs[name];assert entry['id'] not in index['excluded'] and name not in index['excluded'];pin=json.loads((ROOT/entry['path']).read_text());assert pin['source']==entry['source'];article,scope=select_scope(pin['article']);sid='source:wiki-droid-system-'+slug(name);source={**entry['source'],'id':sid,'section':scope};rid=register(source,article)
  fields=generic.fields(article);cost,cm=formula(generic.single(fields.get('Cost')));weight,wm=formula(generic.single(fields.get('Weight')),True)
  category='accessory' if name in members['accessory'] else 'appendage' if name in members['appendage'] else 'locomotion' if name in members['locomotion'] else 'accessory'
  if name in ['Basic Processor','Heuristic Processor']:category='processor'
  if name in EXTERNAL:category='external'
  if name in UPGRADES:category='upgrade'
  model=dict(category=category,costModel=cm,weightModel='accessory' if wm=='factor' and name in members['accessory'] else wm)
  base=dict(id='equipment:'+slug(name),name=name,kind='gear',sourceId=sid,cost=cost,weight=weight,availability=[k for k in ['licensed','restricted','military','illegal','rare'] if re.search(r'\b'+k+r'\b',generic.single(fields.get('Availability')) or '',re.I)],automation='manual',droidSystem=model)
  if name in LOCOMOTIONS:
   speeds,base_cost,terrain,climb,climb_allowed=LOCOMOTIONS[name];base.update(cost=base_cost);model.update(costModel='locomotion' if name!='Stationary' else 'flat',movement=dict(small=speeds[0],medium=speeds[1],large=speeds[2],terrain=terrain,climbPenalty=climb,climbAllowed=climb_allowed))
  if name in ['Basic Processor','Heuristic Processor']:model['processor']=name.split()[0].lower()
  if name in APPENDAGES:model['appendageDamage']=dict(zip(SIZES,APPENDAGES[name]))
  if name=='Multifunction Apparatus':model['appendageDamage']={};model['category']='appendage'
  if name in ['Improved Sensor Package','Darkvision Package']:model['vision']='darkvision' if name=='Darkvision Package' else 'low-light'
  if name=='Improved Sensor Package':base['skillBonuses']={'skill:perception':2}
  if name=='Compartment Space':base.update(cost=50,weight=None);model.update(costModel='capacity',capacityBySize={'small':5,'medium':10,'large':20,'huge':50,'gargantuan':500,'colossal':5000})
  if cm=='locomotion' and name not in LOCOMOTIONS:base['cost']=None;model['costModel']='manual'
  if name in DROID_ARMOR:
   kind,cost,armor,dex,weight,availability=DROID_ARMOR[name];base.update(kind='armor',category=kind,cost=cost,weight=weight,armorBonus=armor,fortitudeBonus=0,maxDex=dex,skillBonuses={},availability=availability,automation='partial');model.update(category='armor',costModel='factor',weightModel='accessory',builtIn=True)
  group=[]
  for item in variants(name,article,base):
   if item['id'] in known:
    existing=next(r for r in m['equipment'] if r['id']==item['id']);assert existing==item,item['id']
   else:m['equipment'].append(item);known.add(item['id']);report.append(item)
   group.append(item['id'])
  cid='catalog:droid-system-'+slug(name);records[cid]=dict(id=cid,name=name,kind='armor' if base['kind']=='armor' else 'gear',sourceId=sid,ruleId=rid,books=entry['books'],mechanicsIds=group)
 category=next(r for r in tables['records'] if r['source']['title']=='Category:Droid Accessories');sid=category['source']['id'];rid='rule:'+sid.removeprefix('source:wiki-')
 for name,kind,cost,armor,dex,weight,availability in CORE_ARMOR:
  eid='equipment:'+slug(name);item=dict(id=eid,name=name,kind='armor',category=kind,sourceId=sid,cost=cost,weight=weight,armorBonus=armor,fortitudeBonus=0,maxDex=dex,skillBonuses={},availability=availability,automation='partial',droidSystem=dict(category='armor',costModel='factor',weightModel='accessory',builtIn=True))
  if eid not in known:m['equipment'].append(item);known.add(eid);report.append(item)
  else:assert next(r for r in m['equipment'] if r['id']==eid)==item
  cid='catalog:droid-system-'+slug(name);records[cid]=dict(id=cid,name=name,kind='armor',sourceId=sid,ruleId=rid,books=['Core Rulebook'],mechanicsIds=[eid])
 cat['sources']=sorted(sources.values(),key=lambda r:r['id']);cat['rulePages']=sorted(pages.values(),key=lambda r:r['id']);cat['records']=sorted(records.values(),key=lambda r:(r['kind'],r['name']))
 return m,cat,pins,report

def main():
 cli=argparse.ArgumentParser(description=__doc__);cli.add_argument('--apply',action='store_true');args=cli.parse_args();load=lambda p:json.loads((ROOT/p).read_text())
 m,c,p,report=build(load('data/mechanics.json'),load('data/wiki-catalog.json'),load('data/reference-index.json'),load('tools/reviewed-revisions.json'),load('data/droid-system-tables.json'),load('data/droid-system-members.json'))
 (ROOT/'.build/droid-system-import-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print('New Droid System profiles',len(report),'unknown costs',sum(r['cost'] is None for r in report),'unknown weights',sum(r['weight'] is None for r in report))
 if args.apply:
  path=ROOT/'data/mechanics.json';path.write_text(generic.append_mechanics(path.read_text(),m));(ROOT/'data/wiki-catalog.json').write_text(json.dumps(c,ensure_ascii=False,separators=(',',':'))+'\n');(ROOT/'tools/reviewed-revisions.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
