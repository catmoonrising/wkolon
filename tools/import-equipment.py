#!/usr/bin/env python3
"""Enable official pinned equipment without inferring activated mechanics.

Only explicit, unambiguous stat paragraphs supply purchase facts. Multi-profile
or absent values stay null. Weapon attacks remain Manual until separately reviewed.
"""
import argparse, copy, json, re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def text(n):
    if isinstance(n,str):return n
    if isinstance(n,list):return ''.join(map(text,n))
    return text(n.get('children',[]))
def fields(article):
    found={}
    def visit(nodes):
        for node in nodes:
            if not isinstance(node,dict):continue
            if node['tag']=='p':
                match=re.fullmatch(r'(Weapon Type|Size|Cost|Weight|Type|Availability|Damage):\s*(.*)',text(node).replace('\xa0',' ').strip())
                if match:found.setdefault(match[1],[]).append(match[2].strip())
            else:visit(node.get('children',[]))
    visit(article['blocks']);return found
def single(values):
    values=list(dict.fromkeys(values or []));return values[0] if len(values)==1 else None
def number(value,weight=False):
    if not value:return None
    pattern=r'(\d[\d,]*(?:\.\d+)?)\s*(?:Kilograms?|kg)\.?' if weight else r'(\d[\d,]*(?:\.\d+)?)\s*(?:Credits?)?'
    match=re.fullmatch(pattern,value,re.I)
    if not match:return None
    n=float(match[1].replace(',',''));return int(n) if n.is_integer() else n
def slug(name):return re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
def clean(node):
    if isinstance(node,str):return node
    return {k:([clean(c) for c in v] if k=='children' else v) for k,v in node.items() if k!='referenceId'}
def append_mechanics(original,updated):
    old=json.loads(original)
    for key in old:
        if key not in ['sources','equipment'] and old[key]!=updated[key]:raise ValueError('Existing mechanics changed: '+key)
    for key in ['sources','equipment']:
        if updated[key][:len(old[key])]!=old[key]:raise ValueError('Existing records changed: '+key)
        added=updated[key][len(old[key]):]
        if not added:continue
        start=original.index('[',original.index('"'+key+'":'))
        _,end=json.JSONDecoder().raw_decode(original,start)
        prefix=original[:end-1].rstrip()
        if old[key]:prefix+=','
        original=prefix+'\n'+',\n'.join('    '+json.dumps(r,ensure_ascii=False,separators=(',',':')) for r in added)+'\n  '+original[end-1:]
    assert json.loads(original)==updated
    return original
GROUPS={'Pistols':('pistols','ranged'),'Rifles':('rifles','ranged'),'Heavy Weapons':('heavy-weapons','ranged'),'Lightsabers':('lightsabers','melee'),'Advanced Melee Weapons':('advanced-melee-weapons','melee'),'Simple Weapons (Melee)':('simple-weapons','melee'),'Simple Weapons (Ranged)':('simple-weapons','ranged'),'Exotic Weapons (Melee)':('exotic-melee','melee'),'Exotic Weapons (Ranged)':('exotic-ranged','ranged'),'Grenades':('simple-weapons','ranged')}
def build(mechanics,catalog,index,reviewed):
    m=copy.deepcopy(mechanics);cat=copy.deepcopy(catalog);reviewed=copy.deepcopy(reviewed)
    existing={r.get('family') or r['name'] for r in m['equipment']}
    ids={r['id'] for r in m['equipment']};sources={r['id']:r for r in cat['sources']};pages={r['id']:r for r in cat['rulePages']};records={r['id']:r for r in cat['records']};report=[]
    for entry in index['records']:
        if entry['kind'] not in ['weapon','gear']:continue
        if entry['name'] in existing and any(r['kind']==entry['kind'] and r['name']==entry['name'] for r in records.values()):continue
        name=entry['name'];data=json.loads((ROOT/entry['path']).read_text());assert data['source']==entry['source']
        f=fields(data['article']);sid='source:wiki-'+slug(name);rid='rule:'+slug(name);eid='equipment:'+slug(name)
        if eid in ids and name not in existing:raise ValueError('Equipment ID collision: '+name)
        source={**entry['source'],'id':sid,'section':None}
        if sid in sources:
            assert all(sources[sid].get(k)==source.get(k) for k in ['title','revision','section','timestamp']),name
            source=sources[sid]
        sources[sid]=source
        if rid in pages:assert pages[rid]['sourceId']==sid,name
        else:pages[rid]={'id':rid,'name':name,'sourceId':sid,'article':{'sourceId':sid,'blocks':[clean(n) for n in data['article']['blocks']]}}
        if name in existing:
            matches=[r['id'] for r in m['equipment'] if (r.get('family') or r['name'])==name]
            cid='catalog:'+entry['kind']+'-'+slug(name)
            records[cid]={'id':cid,'name':name,'kind':entry['kind'],'ruleId':rid,'sourceId':sid,'books':entry['books'],'mechanicsIds':matches}
            continue
        item={'id':eid,'name':name,'sourceId':sid,'kind':entry['kind'],'cost':number(single(f.get('Cost'))),'weight':number(single(f.get('Weight')),True),'availability':[],'automation':'manual'}
        if item['cost'] is None:item['purchasePending']=True
        availability=single(f.get('Availability'))
        if availability:item['availability']=[v for v in ['licensed','restricted','military','illegal','rare'] if re.search(r'\b'+v+r'\b',availability,re.I)]
        if entry['kind']=='weapon':
            group,mode=GROUPS.get(single(f.get('Weapon Type')),(None,None))
            size=single(f.get('Size'));damage=single(f.get('Damage'))
            item.update(manualAttack=True,group=group,mode=mode,size=size.lower() if size and size.lower() in m['rules']['weaponSizeOrder'] else None,damage=damage if damage and re.fullmatch(r'\d+d\d+',damage) else None,damageType=single(f.get('Type')))
        m['equipment'].append(item);ids.add(eid);existing.add(name)
        if not any(s['id']==sid for s in m['sources']):m['sources'].append(source)
        reviewed[source['title']]=source['revision']
        cid='catalog:'+entry['kind']+'-'+slug(name)
        if cid not in records:records[cid]={'id':cid,'name':name,'kind':entry['kind'],'ruleId':rid,'sourceId':sid,'books':entry['books'],'mechanicsIds':[eid]}
        else:
            assert records[cid]['sourceId']==sid,name
            if eid not in records[cid]['mechanicsIds']:records[cid]['mechanicsIds'].append(eid)
        report.append({'id':eid,'name':name,'kind':entry['kind'],'cost':item['cost'],'weight':item['weight'],'availability':item['availability'],'fields':f})
    cat['sources']=sorted(sources.values(),key=lambda s:s['id']);cat['rulePages']=sorted(pages.values(),key=lambda r:r['id']);cat['records']=sorted(records.values(),key=lambda r:(r['kind'],r['name']))
    return m,cat,reviewed,report
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--apply',action='store_true');args=parser.parse_args()
    load=lambda p:json.loads((ROOT/p).read_text())
    m,c,r,report=build(load('data/mechanics.json'),load('data/wiki-catalog.json'),load('data/reference-index.json'),load('tools/reviewed-revisions.json'))
    (ROOT/'.build').mkdir(exist_ok=True);(ROOT/'.build/equipment-import-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print('New records:',len(report),'weapons:',sum(x['kind']=='weapon' for x in report),'gear:',sum(x['kind']=='gear' for x in report));print('Unknown/multiple prices:',sum(x['cost'] is None for x in report),'weights:',sum(x['weight'] is None for x in report))
    if args.apply:
        for path,data in [('data/mechanics.json',m),('data/wiki-catalog.json',c),('tools/reviewed-revisions.json',r)]:
            target=ROOT/path
            target.write_text(append_mechanics(target.read_text(),data) if path=='data/mechanics.json' else json.dumps(data,ensure_ascii=False,indent=2 if path!='data/wiki-catalog.json' else None,separators=None if path!='data/wiki-catalog.json' else(',',':'))+'\n')
if __name__=='__main__':main()
