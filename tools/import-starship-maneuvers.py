#!/usr/bin/env python3
"""Import selectable official Starship Maneuvers from pinned primary articles."""
import argparse,copy,importlib.util,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('maneuver_equipment',ROOT/'tools/import-equipment.py');generic=importlib.util.module_from_spec(spec);spec.loader.exec_module(generic)
def text(node):
 if isinstance(node,str):return node
 if isinstance(node,list):return ''.join(text(n) for n in node)
 return text(node.get('children',[]))
def nodes(node,tag):
 if isinstance(node,list):
  for n in node:yield from nodes(n,tag)
 elif isinstance(node,dict):
  if node.get('tag')==tag:yield node
  yield from nodes(node.get('children',[]),tag)
def scope(article,name):
 if name!='Intercept':return article,None
 blocks=article['blocks'];start=next(i for i,b in enumerate(blocks) if isinstance(b,dict) and re.fullmatch(r'h[1-6]',b.get('tag','')) and text(b).strip()=='Starship Maneuver');level=int(blocks[start]['tag'][1]);end=next((i for i in range(start+1,len(blocks)) if isinstance(blocks[i],dict) and re.fullmatch(r'h[1-6]',blocks[i].get('tag','')) and int(blocks[i]['tag'][1])<=level),len(blocks))
 return {'blocks':blocks[start:end]},'Starship Maneuver'
def build(mechanics,catalog,index,pins):
 m=copy.deepcopy(mechanics);c=copy.deepcopy(catalog);pins=copy.deepcopy(pins);refs={r['name']:r for r in index['records']};sources={s['id']:s for s in c['sources']};pages={r['id']:r for r in c['rulePages']};records={r['id']:r for r in c['records']}
 def reference(name):
  ref=refs[name];assert name not in index['excluded'] and ref['id'] not in index['excluded'];pin=json.loads((ROOT/ref['path']).read_text());assert pin['source']==ref['source'];return ref,pin
 def register(name,article,section=None):
  ref,_=reference(name);sid='source:wiki-starship-maneuver-'+generic.slug(name);source={**ref['source'],'id':sid,'section':section};sources[sid]=source
  old=next((s for s in m['sources'] if s['id']==sid),None)
  if old is None:m['sources'].append(source)
  else:assert old==source
  if name in pins:assert pins[name]==source['revision']
  pins[name]=source['revision'];rid='rule:starship-maneuver-'+generic.slug(name);pages[rid]={'id':rid,'name':name,'sourceId':sid,'article':{'sourceId':sid,'blocks':[generic.clean(n) for n in article['blocks']]}};return sid,rid
 _,parent=reference('Starship Maneuvers');register('Starship Maneuvers',parent['article']);items=[]
 for table in nodes(parent['article']['blocks'],'table'):
  for row in nodes(table,'tr'):
   cells=[n for n in row['children'] if isinstance(n,dict) and n.get('tag')=='td']
   if len(cells)!=4:continue
   name,descriptor,action=(text(n).strip() for n in cells[:3]);ref,pin=reference(name);article,section=scope(pin['article'],name)
   times=[text(n).strip().replace('\xa0',' ') for n in article['blocks'] if isinstance(n,dict) and text(n).strip().startswith('Time:')];assert times==['Time: '+action],(name,times)
   descriptors=[] if descriptor=='N/A' else [generic.slug(d.strip()) for d in descriptor.split(',')];assert all(d in ['attack-pattern','dogfight','force','gunner'] for d in descriptors)
   sid,rid=register(name,article,section);item=dict(id='maneuver:'+generic.slug(name),name=name,sourceId=sid,action=generic.slug(action),actionText=action,descriptors=descriptors,automation='manual');items.append(item);cid='catalog:starship-maneuver-'+generic.slug(name);records[cid]=dict(id=cid,name=name,kind='starshipManeuver',sourceId=sid,ruleId=rid,books=['Starships of the Galaxy'],mechanicsIds=[item['id']])
 assert len(items)==27 and len({r['id'] for r in items})==27
 if 'starshipManeuvers' in m:assert m['starshipManeuvers']==items
 else:m['starshipManeuvers']=items
 feat=next(f for f in m['feats'] if f['id']=='feat:starship-tactics');effect=dict(target='starshipManeuverSlots',amount=1,type='untyped',ability='wis',minimum=1)
 assert feat['effects'] in [[],[effect]];feat['effects']=[effect];feat['automation']='partial'
 c['sources']=sorted(sources.values(),key=lambda s:s['id']);c['rulePages']=sorted(pages.values(),key=lambda r:r['id']);c['records']=sorted(records.values(),key=lambda r:(r['kind'],r['name']))
 return m,c,pins
def append(original,updated):
 old=json.loads(original);original=generic.append_mechanics(original,{**old,'sources':updated['sources']})
 # Preserve the existing mechanics file's formatting and change only this feat.
 old_feat=next(f for f in old['feats'] if f['id']=='feat:starship-tactics');new_feat=next(f for f in updated['feats'] if f['id']==old_feat['id'])
 if old_feat!=new_feat:
  decoder=json.JSONDecoder();found=None
  for match in re.finditer(r'\{\s*"id"\s*:\s*"feat:starship-tactics"',original):found=match.start();break
  assert found is not None;_,end=decoder.raw_decode(original,found);original=original[:found]+json.dumps(new_feat,ensure_ascii=False,separators=(',',':'))+original[end:]
 if 'starshipManeuvers' not in old:
  end=original.rfind('}');original=original[:end].rstrip()+',\n  "starshipManeuvers": '+json.dumps(updated['starshipManeuvers'],ensure_ascii=False,separators=(',',':'))+'\n'+original[end:]
 assert json.loads(original)==updated;return original
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--apply',action='store_true');args=parser.parse_args();load=lambda p:json.loads((ROOT/p).read_text());m,c,p=build(load('data/mechanics.json'),load('data/wiki-catalog.json'),load('data/reference-index.json'),load('tools/reviewed-revisions.json'));print('Starship Maneuvers:',len(m['starshipManeuvers']))
 if args.apply:
  path=ROOT/'data/mechanics.json';path.write_text(append(path.read_text(),m));(ROOT/'data/wiki-catalog.json').write_text(json.dumps(c,ensure_ascii=False,separators=(',',':'))+'\n');(ROOT/'tools/reviewed-revisions.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
