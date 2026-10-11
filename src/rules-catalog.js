import {articleText,escapeHTML as escape} from './wiki-content.js';

export const CATALOG_KINDS={species:'Species',class:'Classes',prestigeClass:'Prestige classes',skill:'Skills',feat:'Feats',talent:'Talents',talentTree:'Talent trees',weapon:'Weapons',armor:'Armor',gear:'Equipment',forcePower:'Force powers'};

export function createRulesCatalog(pack) {
 const pages=new Map(pack.rulePages.map(r=>[r.id,r]));
 const records=(pack.catalog?.records||[]).map(r=>({...r,search:(r.name+' '+(r.books||[]).join(' ')+' '+articleText(pages.get(r.ruleId)?.article)).toLocaleLowerCase()}));
 let query='',kind='',builderOnly=false;
 function matches() {
  const terms=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return records.filter(r=>(!kind||r.kind===kind)&&(!builderOnly||r.status==='available')&&terms.every(term=>r.search.includes(term))).sort((a,b)=>a.name.localeCompare(b.name)||a.kind.localeCompare(b.kind));
 }
 function results() {
  const found=matches();
  return `<div class="table-scroll"><table class="rules-library"><thead><tr><th>Name</th><th>Type</th><th>Builder</th></tr></thead><tbody>${found.map(r=>`<tr><td><button type="button" class="rule-link" data-rule-page="${escape(r.ruleId)}">${escape(r.name)}</button></td><td>${escape(CATALOG_KINDS[r.kind])}</td><td>${r.status==='available'?'Available':'Reference'}</td></tr>`).join('')}</tbody></table></div><span role="status">${found.length} / ${records.length}</span>`;
 }
 return {
  matches,results,
  search:value=>{query=value;},
  filter:(value,only=false)=>{kind=value;builderOnly=only;},
  render:()=>`<div class="actions"><input id="rules-search" type="search" placeholder="Search" aria-label="Search rules" value="${escape(query)}"><select id="rules-kind" aria-label="Rule type"><option value="">All</option>${Object.entries(CATALOG_KINDS).map(([value,label])=>`<option value="${value}" ${kind===value?'selected':''}>${label}</option>`).join('')}</select><label class="checkbox"><input id="rules-builder-only" type="checkbox" ${builderOnly?'checked':''}>Builder only</label></div><p class="hint">Available: at least one builder option; some effects are manual. Reference: reading only.</p><div id="rules-results">${results()}</div>`,
 };
}
