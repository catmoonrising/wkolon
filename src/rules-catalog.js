import {articleText,escapeHTML as escape} from './wiki-content.js';

export const CATALOG_KINDS={species:'Species',class:'Classes',prestigeClass:'Prestige classes',classFeature:'Class features',skill:'Skills',feat:'Feats',talent:'Talents',talentTree:'Talent trees',weapon:'Weapons',armor:'Armor',gear:'Equipment',forcePower:'Force powers',starshipManeuver:'Starship Maneuvers',reference:'Rules'};

export function createRulesCatalog(pack) {
 const pages=new Map(pack.rulePages.map(r=>[r.id,r]));
 const records=(pack.catalog?.records||[]).map(r=>({...r,search:(r.name+' '+(r.books||[]).join(' ')+' '+articleText(pages.get(r.ruleId)?.article)).toLocaleLowerCase()}));
 let query='',kind='',builderOnly=false,book='',offset=0,referenceState='idle';
 const existing=new Set(records.map(r=>r.name+'|'+r.kind));
 let books=[];
 function matches() {
  const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return records.filter(r=>(!book||r.books.includes(book))&&(!kind||r.kind===kind)&&(!builderOnly||r.status==='available')&&terms.every(term=>r.search.includes(term))).sort((a,b)=>a.name.localeCompare(b.name)||a.kind.localeCompare(b.kind));
 }
 function results() {
  const found=matches();offset=Math.min(offset,Math.max(0,Math.floor((found.length-1)/100)*100));const shown=found.slice(offset,offset+100);
  return `<div class="table-scroll"><table class="rules-library"><thead><tr><th>Name</th><th>Type</th><th>Builder</th></tr></thead><tbody>${shown.map(r=>`<tr><td><button type="button" class="rule-link" ${r.referenceId?`data-rule-reference="${escape(r.referenceId)}"`:`data-rule-page="${escape(r.ruleId)}"`}>${escape(r.name)}</button></td><td>${escape(CATALOG_KINDS[r.kind])}</td><td>${r.status==='available'?'Available':'Reference'}</td></tr>`).join('')}</tbody></table></div><span role="status">${found.length?offset+1+'–'+(offset+shown.length)+' / ':''}${found.length}</span>${found.length>100?` <button data-rules-page="prev" ${offset===0?'disabled':''}>Previous</button> <button data-rules-page="next" ${offset+100>=found.length?'disabled':''}>Next</button>`:''}${referenceState==='loading'?'<p role="status">Loading references…</p>':referenceState==='error'?'<p role="alert">Reference library unavailable. <button data-reference-retry>Retry</button></p>':''}`;
 }
 return {
  matches,results,
  search:value=>{query=value;offset=0;},
  page:direction=>{offset=Math.max(0,offset+(direction==='next'?100:-100));},
  source:value=>{book=value;offset=0;},
  referenceState:value=>{referenceState=value;},
  setReferences:index=>{
   for(const r of index.records)if(!existing.has(r.name+'|'+r.kind)){existing.add(r.name+'|'+r.kind);records.push({...r,referenceId:r.id,status:'reference',search:(r.name+' '+r.aliases.join(' ')+' '+r.books.join(' ')+' '+r.searchText).toLocaleLowerCase()});}
   books=[...new Set(records.flatMap(r=>r.books))].sort();referenceState='loaded';
  },
  filter:(value,only=false)=>{kind=value;builderOnly=only;offset=0;},
  render:()=>`<div class="actions"><input id="rules-search" type="search" placeholder="Search" aria-label="Search rules" value="${escape(query)}"><select id="rules-kind" aria-label="Rule type"><option value="">All</option>${Object.entries(CATALOG_KINDS).map(([value,label])=>`<option value="${value}" ${kind===value?'selected':''}>${label}</option>`).join('')}</select>${books.length?`<select id="rules-book" aria-label="Source book"><option value="">All sources</option>${books.map(b=>`<option value="${escape(b)}" ${book===b?'selected':''}>${escape(b)}</option>`).join('')}</select>`:''}<label class="checkbox"><input id="rules-builder-only" type="checkbox" ${builderOnly?'checked':''}>Builder only</label></div><p class="hint">Available: at least one builder option; some effects are manual. Reference: reading only.</p><div id="rules-results">${results()}</div>`,
 };
}
