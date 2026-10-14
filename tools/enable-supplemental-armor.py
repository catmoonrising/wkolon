#!/usr/bin/env python3
"""Compile reviewed supplemental armor facts from captured official references."""
import json,re,copy
from pathlib import Path
root=Path(__file__).resolve().parents[1];m=json.loads((root/'data/mechanics.json').read_text());cat=json.loads((root/'data/wiki-catalog.json').read_text());index=json.loads((root/'data/reference-index.json').read_text());capture=json.loads((root/'.build/reference/capture.json').read_text());reviewed=json.loads((root/'tools/reviewed-revisions.json').read_text())
slug=lambda x:re.sub(r'[^a-z0-9]+','-',x.lower()).strip('-')
existing={r.get('family')or r['name'] for r in m['equipment']};sources={s['id']:s for s in cat['sources']};pages={p['id']:p for p in cat['rulePages']};records={r['id']:r for r in cat['records']}
for entry in index['records']:
 if entry['kind']!='armor' or entry['name']=='Energy Shields':continue
 name=entry['name'];
 if reviewed.get(name)!=entry['source']['revision']:raise ValueError('Review required: '+name)
 raw=capture['pages'][name]['revisions'][0]['slots']['main']['content'];part=None
 if name=='Orbalisk Armor':
  part='Jedi Academy Training Manual';raw=raw.split('<tab name="'+part+'">')[1].split('</tab>')[0]
 def field(label):
  for line in raw.splitlines():
   if not line.startswith("'''"):continue
   plain=re.sub(r'\[\[([^\]|]+)(?:\|([^\]]+))?\]\]',lambda z:z[2]or z[1],line).replace("'''",'').replace('\xa0',' ')
   left,sep,right=plain.partition(':')
   if sep and left.strip()==label:return right.strip()
  return None
 def number(label,default=None):
  value=field(label)
  if value is None:return default
  if value=='-':return None
  match=re.match(r'[+]?(\d[\d,]*(?:\.\d+)?)',value)
  if not match:raise ValueError((name,label,value))
  return float(match[1].replace(',','')) if '.' in match[1] else int(match[1].replace(',',''))
 category=field('Type').replace(' Armor','').lower()
 sid='source:wiki-'+slug(name)+(('-'+slug(part)) if part else '')
 source=copy.deepcopy(entry['source']);source['id']=sid;source['section']=part
 if part:source['url']+='#'+part.replace(' ','_')
 if sid in sources:
  source=sources[sid]
  assert source['revision']==entry['source']['revision'],(name,'requires existing pin review')
 sources[sid]=source
 rid='rule:'+slug(name)+(('-'+slug(part)) if part else '')
 data=json.loads((root/entry['path']).read_text());blocks=data['article']['blocks']
 if part:
  start=next(i for i,b in enumerate(blocks) if isinstance(b,dict) and b['tag']=='h4' and ''.join(c for c in b['children'] if isinstance(c,str))==part)
  end=next((i for i in range(start+1,len(blocks)) if isinstance(blocks[i],dict) and blocks[i]['tag']=='h4'),len(blocks));blocks=blocks[start+1:end]
 # Bulk-local links use the separate library; core presentation links must remain
 # ordinary wiki links until the reviewed pack has matching rule pages.
 def clean(node):
  if isinstance(node,str):return node
  return {k:([clean(c) for c in v] if k=='children' else v) for k,v in node.items() if k!='referenceId'}
 if rid not in pages:pages[rid]={'id':rid,'name':name,'sourceId':sid,'article':{'sourceId':sid,'blocks':[clean(n) for n in blocks]}}
 catalog_id='catalog:armor-'+slug(name)
 if catalog_id not in records:records[catalog_id]={'id':catalog_id,'name':name,'kind':'armor','ruleId':rid,'sourceId':sid,'books':entry['books'],'mechanicsIds':[]}
 reviewed[source['title']]=source['revision']
 if not any(s['id']==sid for s in m['sources']):m['sources'].append(source)
 if name in existing:continue
 item={'id':'equipment:'+slug(name),'name':name,'sourceId':sid,'kind':'armor','cost':number('Cost'),'weight':number('Weight'),'category':category,'armorBonus':number('Bonus to Reflex Defense',0),'fortitudeBonus':number('Bonus to Fortitude Defense',0),'maxDex':number('Maximum Dexterity Bonus'),'skillBonuses':{},'availability':[a for a in ['licensed','restricted','military','illegal','rare'] if a in (field('Availability')or'').lower()]}
 if name in ['Blinding Helmet','Shield Gauntlet','Thinsuit']:item['armorSlot']='tandem'
 if name in ['Heavy Pressure Suit','Medium Pressure Suit','Light Pressure Suit']:item['speedPenalty']=2 if name=='Light Pressure Suit' else 1
 if name=='Marine Armor':item['magneticSolesPenalty']=2
 if name=='Vacuum Pod':item['abilityBonuses']={'str':4}
 if name=='Venom Assault Armor':item['abilityBonuses']={'str':2}
 if name=='Orbalisk Armor':item.update(skillPenaltyExempt=True,armorDR={'amount':10,'damageTypes':['all'],'lightsaber':True})
 if name in ['Microbe Armor','Republic Heavy Armor']:item['armorDR']={'amount':2,'damageTypes':['energy','fire'] if name=='Microbe Armor' else ['energy'],'lightsaber':False}
 if "Beskar'gam" in name or name=='Imperial Knight Armor':item['allowsLightsaberDR']=True
 skill={
 'Camo Armor':[('stealth',10,'hiding',None)],'Camo Scout Armor':[('stealth',5,'always',None)],
 'Shadowsuit':[('stealth',5,'darkness',None)],'Seatrooper Armor':[('swim',2,'always',None)],
 'Half-Vest':[('stealth',5,'concealArmor',None)],'Vacuum Pod':[('mechanics',2,'always','heavy')],
 'Katarn-Class Commando Armor':[('perception',2,'always','heavy')],
 'Republic Combat Armor':[],
 }.get(name,[])
 if skill:item['skillEffects']=[dict(skillId='skill:'+s,amount=n,when=when,**({'proficiency':prof}if prof else {}))for s,n,when,prof in skill]
 if name=='Knighthunter Armor':item['conditionalDefenses']=[dict(defense='will',against='use-the-force',amount=5,type='equipment')]
 if name=='Thinsuit':item['conditionalDefenses']=[dict(defense='fortitude',against='extreme-temperatures',amount=5,type='untyped')]
 # The body text grants these built-in bonuses without an armor-proficiency clause.
 if name in ['AV-1C Combat Armor','AV-1S Scout Armor','Heavy Powered Battle Armor','Light Powered Battle Armor','Powered Battle Armor','Knighthunter Armor','Model 210 Personal Armor']:
  item.setdefault('skillEffects',[]).append(dict(skillId='skill:perception',amount=2,when='always'))
 if name=='Neo-Crusader Light Armor':
  item.update(name=name+' (Web Enhancements)',id=item['id']+'-web-enhancements',family=name,variant='Web Enhancements')
  item['availability']=['military','rare']
  older=copy.deepcopy(item);older.update(id='equipment:neo-crusader-light-armor-kotor',name=name+' (Knights of the Old Republic Campaign Guide)',variant='Knights of the Old Republic Campaign Guide',cost=None,availability=['rare']);m['equipment'].append(older)
 m['equipment'].append(item)
cat['sources']=sorted(sources.values(),key=lambda s:s['id']);cat['rulePages']=sorted(pages.values(),key=lambda p:p['id']);cat['records']=sorted(records.values(),key=lambda r:(r['kind'],r['name']))
for path,data in [('data/mechanics.json',m),('data/wiki-catalog.json',cat),('tools/reviewed-revisions.json',reviewed)]:
 (root/path).write_text(json.dumps(data,ensure_ascii=False,indent=2 if path!='data/wiki-catalog.json' else None,separators=None if path!='data/wiki-catalog.json' else(',',':'))+'\n')
print('Armor records',sum(r['kind']=='armor'for r in m['equipment']))
