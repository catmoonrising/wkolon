import {automationBadge} from './feature-status.js';
import {ABILITIES, signed} from './rules.js';
import {createListSort} from './list-sort.js';
import {escapeHTML as escape, articleText, renderArticle} from './wiki-content.js';
const title=value=>value[0].toUpperCase()+value.slice(1);
const modifiers=adjustments=>ABILITIES.filter(a=>adjustments[a]).map(a=>`${signed(adjustments[a])} ${title(a)}`).join(', ');
function abilityText(r){
 if(r.noConstitution&&(r.creationChoices||[]).some(g=>g.kind==='droidDegree'))return 'No CON; varies';
 const variable=(r.creationChoices||[]).filter(g=>g.kind==='ability').map(g=>g.options.map(o=>(Object.keys(o.adjustments).length>1?o.name+': ':'')+modifiers(o.adjustments)).join(' or '));
 return [r.noConstitution?'No CON':'',r.fixedAbilities?ABILITIES.filter(a=>!r.noConstitution||a!=='con').map(a=>a.toUpperCase()+' '+r.fixedAbilities[a]).join(', '):'',modifiers(r.abilityAdjustments),...variable].filter(Boolean).join('; ')||'-';
}
const abilityTotal=r=>Object.values(r.abilityAdjustments).reduce((n,v)=>n+v,0)+(r.creationChoices||[]).filter(g=>g.kind==='ability').reduce((sum,g)=>sum+g.options.reduce((n,o)=>n+Object.values(o.adjustments).reduce((n,v)=>n+v,0),0)/g.options.length,0);
export function speciesChoiceControls(species,groups,{legend=true}={}) {
  const active=groups.filter(g=>g.active||g.kind==='startingFeat');
  return active.length?`<fieldset class="species-choices">${legend?`<legend>${escape(species.name)}</legend>`:''}<div class="actions">${active.map(g=>`<label>${escape(g.name)}${['understoodLanguage','spokenLanguage'].includes(g.kind)?`<input type="text" maxlength="100" data-species-choice="${g.id}" list="species-languages-${g.id}" aria-label="${escape(species.name+' '+g.name)}" value="${escape(g.options.find(o=>o.id===g.selected)?.name||g.selected||'')}"><datalist id="species-languages-${g.id}">${g.options.map(o=>`<option value="${escape(o.name)}"></option>`).join('')}</datalist>`:`<select data-species-choice="${g.id}" aria-label="${escape(species.name+' '+g.name)}">${g.defaultOption===undefined?`<option value="" ${g.selected===null?'selected':''}>Choose…</option>`:''}${g.options.map(o=>`<option value="${o.id}" ${o.id===g.selected?'selected':''} ${o.available?'':'disabled'}>${escape(o.name+(g.kind==='droidDegree'?' ('+modifiers(o.adjustments)+')':''))}</option>`).join('')}</select>`}</label>`).join('')}</div></fieldset>`:'';
}
export function createSpeciesBrowser(pack) {
  let query='';const expanded=new Set();
  const text=new Map(pack.species.map(r=>[r.id,(r.name+' '+articleText(r.article)).toLocaleLowerCase()]));
  const totalSpeed=r=>r.speed+Object.values(r.speeds||{}).reduce((n,v)=>n+v,0);
  const sort=createListSort([
    {key:'name',label:'Species'},
    {key:'abilities',label:'Ability Modifiers',numeric:true,get:abilityTotal,hint:'Total ability modifiers; average across available profiles'},
    {key:'size',label:'Size',numeric:true,get:r=>pack.rules.weaponSizeOrder.indexOf(r.size)},
    {key:'speed',label:'Speed',numeric:true,get:r=>r.speed===null?null:[r.speed,totalSpeed(r)],compare:(a,b)=>a[0]-b[0]||a[1]-b[1],hint:'Squares; normal speed, then total movement speed'},
  ]);
  function results(selected) {
    const rows=sort.rows(pack.species.filter(r=>text.get(r.id).includes(query.trim().toLocaleLowerCase())));
    return `<div class="table-scroll"><table class="spell-table species-table"><thead><tr><th scope="col"></th>${sort.headers()}</tr></thead><tbody>${rows.map(r=>{
      const open=expanded.has(r.id),id='species-description-'+r.id.split(':')[1];
      const abilities=abilityText(r);
      const speed=[r.speed===null?'Manual':r.speed,...Object.entries(r.speeds||{}).map(([type,n])=>`${title(type)} ${n}`)].join(', ');
      return `<tr class="species-row ${selected===r.id?'selected':''}"><td><button type="button" data-select-species="${r.id}" aria-label="Select ${escape(r.name)}" aria-pressed="${selected===r.id}">Select</button></td><td class="nm"><a href="#${id}" class="sp-name-link" data-species-detail="${r.id}" aria-expanded="${open}" aria-controls="${id}">${escape(r.name)}</a>${automationBadge(r)}</td><td>${escape(abilities)}</td><td>${escape(title(r.size))}</td><td>${escape(speed)}</td></tr><tr class="sp-detail" id="${id}" ${open?'':'hidden'}><td colspan="5">${renderArticle(r.article)}</td></tr>`;
    }).join('')}</tbody></table>${rows.length?'':'<p role="status">No matches</p>'}</div>`;
  }
  return {
    render:(selected,groups=[],extra='')=>{
      const species=pack.species.find(r=>r.id===selected);
      const controls=speciesChoiceControls(species,groups);
      return `<div class="species-browser">${controls}${extra}<input id="species-search" type="search" placeholder="Search" aria-label="Search species" value="${escape(query)}"><div id="species-results">${results(selected)}</div></div>`;
    },
    results,
    search(value){query=value;},
    toggle(id){if(expanded.has(id))expanded.delete(id);else expanded.add(id);},
    sort(event,render){return sort.click(event,render);},
  };
}
