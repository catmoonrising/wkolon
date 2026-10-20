#!/usr/bin/env python3
"""Import official vehicle listings without duplicating their reference articles."""
import argparse,copy,hashlib,importlib.util,json,re
from urllib.parse import urlsplit,unquote,parse_qs
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('vehicle_equipment',ROOT/'tools/import-equipment.py');generic=importlib.util.module_from_spec(spec);spec.loader.exec_module(generic)
GROUPS={'Airspeeders':('airspeeder','AIRSPEEDER'),'Capital Ships':('capital-ship','CAPITAL SHIP'),'Space Transports':('space-transport','SPACE TRANSPORT'),'Speeders':('speeder','SPEEDER'),'Starfighters':('starfighter','STARFIGHTER'),'Walkers':('walker','WALKER'),'Tracked Vehicles':('tracked','TRACKED VEHICLE'),'Wheeled Vehicles':('wheeled','WHEELED VEHICLE'),'Space Stations':('space-station','SPACE STATION')}
def text(n):
 if isinstance(n,str):return n
 if isinstance(n,list):return ''.join(text(c) for c in n)
 return text(n.get('children',[]))
def nodes(n,tag):
 if isinstance(n,list):
  for c in n:yield from nodes(c,tag)
 elif isinstance(n,dict):
  if n.get('tag')==tag:yield n
  yield from nodes(n.get('children',[]),tag)
def build(mechanics,catalog,index,pins,redirects):
 m=copy.deepcopy(mechanics);c=copy.deepcopy(catalog);pins=copy.deepcopy(pins);refs={r['id']:r for r in index['records']};names={r['name']:r for r in index['records']};excluded=set(index['excluded']);found={};pending=[];sources={s['id']:s for s in c['sources']};records={r['id']:r for r in c['records']}
 aliases={}
 for r in redirects['records']:
  assert hashlib.sha256(r['content'].encode()).hexdigest()==r['sha256'] and re.search(r'#REDIRECT\s*\[\['+re.escape(r['target'])+r'\]\]',r['content'],re.I),r['name']
  assert r['target'] in names and r['name'] not in excluded
  aliases[r['name']]=names[r['target']]
 def official(ref):assert ref['id'] not in excluded and ref['name'] not in excluded and not any(a in excluded for a in ref['aliases'])
 def source(ref):
  official(ref);s=ref['source'];old=next((r for r in m['sources'] if r['id']==s['id']),None)
  if old is None:m['sources'].append(copy.deepcopy(s))
  else:assert old==s
  sources[s['id']]=copy.deepcopy(s)
  if s['title'] in pins:assert pins[s['title']]==s['revision']
  pins[s['title']]=s['revision'];return s['id']
 for name,(kind,header) in GROUPS.items():
  ref=names[name];official(ref);pin=json.loads((ROOT/ref['path']).read_text());assert pin['source']==ref['source'];sid=source(ref);section='';table_count=0
  for block in pin['article']['blocks']:
   if isinstance(block,dict) and re.fullmatch('h[1-6]',block.get('tag','')):section=text(block).strip()
   if not isinstance(block,dict) or block.get('tag')!='table':continue
   rows=list(nodes(block,'tr'));assert rows;heads=[text(n).strip() for n in rows[0]['children'] if isinstance(n,dict) and n.get('tag')=='th'];assert heads[:3]==[header,'CHALLENGE LEVEL','SIZE'],(name,heads);table_count+=1
   for row in rows[1:]:
    cells=[n for n in row['children'] if isinstance(n,dict) and n.get('tag')=='td'];assert len(cells)>=3,(name,text(row));links=list(nodes(cells[0],'a'));assert links,(name,text(cells[0]))
    for link in links:
     rid=link.get('referenceId');target=refs.get(rid)
     if not target:
      # The pinned library has already excluded Homebrew; never synthesize a
      # vehicle from an unresolved external/page link.
      url=urlsplit(link.get('href',''));title=unquote(url.path.split('/wiki/')[-1]).replace('_',' ')
      if title in excluded:continue
      target=aliases.get(title)
      if target is None:pending.append(dict(parent=name,name=text(link).strip(),url=link['href'],reason='redlink' if parse_qs(url.query).get('redlink')==['1'] else 'unresolved'));continue
     rid=target['id'];official(target);vid='vehicle:'+generic.slug(target['name']);listing=dict(type=kind,size=text(cells[2]).strip() or None,challengeLevel=text(cells[1]).strip() or None,sourceId=sid,section=section,url=link['href'])
     if vid not in found:found[vid]=dict(id=vid,name=target['name'],sourceId=source(target),referenceId=rid,automation='manual',listings=[])
     else:assert found[vid]['referenceId']==rid
     if listing not in found[vid]['listings']:found[vid]['listings'].append(listing)
  assert table_count>0,name
 assert len(found)==471,len(found)
 ref=names['Stock Starships'];official(ref);pin=json.loads((ROOT/ref['path']).read_text());assert pin['source']==ref['source'];sid=source(ref);tables=list(nodes(pin['article']['blocks'],'table'));assert len(tables)==2
 header=next(nodes(tables[0],'tr'));assert [text(c).strip() for c in header['children'] if isinstance(c,dict) and c.get('tag')=='th'][:2]==['STOCK SHIP','SIZE']
 stock=[]
 for row in nodes(tables[0],'tr'):
  cells=[text(n).strip() for n in row['children'] if isinstance(n,dict) and n.get('tag')=='td']
  if not cells:continue
  assert len(cells)==11,cells
  name,size=cells[:2];vid='vehicle:stock-'+generic.slug(name);assert vid not in found
  found[vid]=dict(id=vid,name='Stock '+name,sourceId=sid,referenceId=ref['id'],automation='manual',stockTemplate=name,listings=[dict(type='stock',size=size,challengeLevel=None,sourceId=sid,section='Stock Starships',url='https://swse.miraheze.org/wiki/Stock_Starships')]);stock.append(name)
 assert len(stock)==12 and len(set(stock))==12
 second=[text(next(n for n in row['children'] if isinstance(n,dict) and n.get('tag')=='td')).strip() for row in nodes(tables[1],'tr') if any(isinstance(n,dict) and n.get('tag')=='td' for n in row['children'])];assert second==stock
 items=sorted(found.values(),key=lambda r:r['name']);assert len(items)==483,len(items)
 if 'vehicles' in m:assert [v for v in m['vehicles'] if not v.get('stockTemplate')]==[v for v in items if not v.get('stockTemplate')]
 m['vehicles']=items
 for item in items:
  ref=refs[item['referenceId']];cid='catalog:vehicle-'+item['id'][8:];records[cid]=dict(id=cid,name=item['name'],kind='vehicle',sourceId=item['sourceId'],referenceId=ref['id'],books=ref['books'],mechanicsIds=[item['id']])
 c['sources']=sorted(sources.values(),key=lambda s:s['id']);c['records']=sorted(records.values(),key=lambda r:(r['kind'],r['name']));return m,c,pins,dict(schemaVersion=1,pending=pending)
def append(original,updated):
 old=json.loads(original);original=generic.append_mechanics(original,{**old,'sources':updated['sources']})
 if 'vehicles' not in old:
  end=original.rfind('}');original=original[:end].rstrip()+',\n  "vehicles": '+json.dumps(updated['vehicles'],ensure_ascii=False,separators=(',',':'))+'\n'+original[end:]
 elif old['vehicles']!=updated['vehicles']:
  assert all(v in updated['vehicles'] for v in old['vehicles']);start=original.index('[',original.index('\"vehicles\":'));_,end=json.JSONDecoder().raw_decode(original,start);original=original[:start]+json.dumps(updated['vehicles'],ensure_ascii=False,separators=(',',':'))+original[end:]
 assert json.loads(original)==updated;return original
def main():
 cli=argparse.ArgumentParser(description=__doc__);cli.add_argument('--apply',action='store_true');args=cli.parse_args();load=lambda p:json.loads((ROOT/p).read_text());m,c,p,report=build(load('data/mechanics.json'),load('data/wiki-catalog.json'),load('data/reference-index.json'),load('tools/reviewed-revisions.json'),load('data/vehicle-redirects.json'));print('Vehicle pages:',len(m['vehicles']),'unwritten listings:',len(report['pending']))
 if args.apply:
  path=ROOT/'data/mechanics.json';path.write_text(append(path.read_text(),m));(ROOT/'data/wiki-catalog.json').write_text(json.dumps(c,ensure_ascii=False,separators=(',',':'))+'\n');(ROOT/'tools/reviewed-revisions.json').write_text(json.dumps(p,ensure_ascii=False,indent=2)+'\n');(ROOT/'data/vehicle-catalog-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
if __name__=='__main__':main()
