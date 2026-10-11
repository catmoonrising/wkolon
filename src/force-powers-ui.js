import {articleText,renderArticle,escapeHTML as escape} from './wiki-content.js';
import {usePower,recoverPower,recoverSuite,powerCopy} from './force-powers.js';
const title=s=>s.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function createForcePowers(pack,{current,derived,changed,log,roll,error}){
 const queries=new Map();
 function picks(level){const c=current(),row=derived().rows[level],chosen=c.levels[level].forcePowers||[];
  return `<div class="power-picks"><span>${chosen.length} / ${row.powerChoices||0}</span>${chosen.map(p=>`<span class="power-pick">${escape(pack.forcePowers.find(r=>r.id===p.powerId).name)} <button type="button" data-remove-power="${p.id}" aria-label="Remove ${escape(pack.forcePowers.find(r=>r.id===p.powerId).name)}">×</button></span>`).join('')}</div>`;
 }
 function results(level){const c=current(),row=derived().rows[level],free=(row.powerChoices||0)-(c.levels[level].forcePowers||[]).length,q=(queries.get(c.id)||'').toLocaleLowerCase().trim();
  return `<div class="table-scroll"><table class="power-library"><thead><tr><th></th><th>Power</th><th>Time</th><th>Descriptors</th></tr></thead><tbody>${pack.forcePowers.filter(p=>(p.name+' '+articleText(p.article)).toLocaleLowerCase().includes(q)).map(p=>`<tr><td><button type="button" data-learn-power="${p.id}" data-power-level="${level}" ${free<=0?'disabled':''}>Select</button></td><td><details id="power-option-${level}-${p.id}"><summary>${escape(p.name)}</summary>${renderArticle(p.article)}</details></td><td>${title(p.action)}</td><td>${p.descriptors.map(title).join(', ')}</td></tr>`).join('')}</tbody></table></div>`;
 }
 function library(level){const row=derived().rows[level];if(!row?.powerChoices&&!(current().levels[level].forcePowers||[]).length)return '';
  return `<section class="power-choices" data-power-library="${level}"><h3>Force Powers</h3>${picks(level)}<input type="search" data-power-search placeholder="Search" aria-label="Search Force powers" value="${escape(queries.get(current().id)||'')}"><div class="actions"><button type="button" data-power-fold="fold">Fold all</button><button type="button" data-power-fold="unfold">Unfold all</button></div><div data-power-results>${results(level)}</div></section>`;
 }
 return {library,
  manager(level=0){const c=current(),levels=c.levels.map((_,i)=>i).filter(i=>derived().rows[i].powerChoices||(c.levels[i].forcePowers||[]).length);if(!levels.includes(level))level=levels[0]??0;return `<select data-power-manage-level aria-label="Power learning level">${levels.map(i=>`<option value="${i}" ${i===level?'selected':''}>Level ${i+1}</option>`).join('')}</select>${library(level)}`;},
  sheet(){const c=current(),d=derived();return `<div class="actions"><button type="button" data-action="manage-powers">Manage</button><button type="button" data-power-rest title="After combat" ${!d.forcePowers.some(p=>p.spent)?'disabled':''}>Rest 1 min</button>${c.forcePowerRecoveryPending?'<button type="button" data-power-end-turn>End turn</button>':''}</div><details id="force-suite-mechanics"><summary>Mechanics</summary>${renderArticle(pack.rulePages.find(r=>r.id==='rule:force-powers').article)}</details><div class="power-suite">${d.forcePowers.map(p=>`<div class="power-copy ${p.spent?'spent':''}"><input type="checkbox" data-power-spent="${p.copyId}" ${p.spent?'checked':''} aria-label="${escape(p.name)} spent"><details id="suite-${p.copyId}"><summary>${escape(p.name)}</summary>${renderArticle(p.article)}</details><button type="button" data-use-power="${p.copyId}" ${p.spent||d.incapacitated?'disabled':''}>Use</button>${p.spent?`<button type="button" data-recover-power="${p.copyId}" title="Reaction" ${d.forceCurrent<1||d.incapacitated?'disabled':''}>Recover (1 FP)</button>`:''}</div>`).join('')}</div>`;},
  input(el){if(!el.hasAttribute('data-power-search'))return false;queries.set(current().id,el.value);const root=el.closest('[data-power-library]');root.querySelector('[data-power-results]').innerHTML=results(Number(root.dataset.powerLibrary));return true;},
  change(el){if(!el.dataset.powerSpent)return false;const p=powerCopy(current(),el.dataset.powerSpent);if(p)p.spent=el.checked;changed();return true;},
  click(el){const c=current(),d=derived();try{
   if(el.dataset.learnPower){const level=Number(el.dataset.powerLevel),row=d.rows[level];if((c.levels[level].forcePowers||[]).length>=(row.powerChoices||0))return true;c.levels[level].forcePowers??=[];c.levels[level].forcePowers.push({id:crypto.randomUUID(),powerId:el.dataset.learnPower,spent:false});}
   else if(el.dataset.removePower){for(const l of c.levels)if(l.forcePowers)l.forcePowers=l.forcePowers.filter(p=>p.id!==el.dataset.removePower);}
   else if(el.dataset.powerFold){el.closest('[data-power-library]').querySelectorAll('details').forEach(r=>r.open=el.dataset.powerFold==='unfold');return true;}
   else if(el.dataset.usePower){const r=roll(d.skills.find(s=>s.id==='skill:use-the-force').total),p=usePower(c,d,pack,el.dataset.usePower,r.natural);log('roll',`${p.name}: ${r.text}`,`${escape(p.name)}: ${r.html}`);}
   else if(el.dataset.recoverPower){const p=recoverPower(c,d,pack,el.dataset.recoverPower);log('resource',`${p.name} recovered; Force Points −1`);}
   else if(el.hasAttribute('data-power-rest')){recoverSuite(c,d);log('rest','Force powers recovered (1 minute after combat)');}
   else if(el.hasAttribute('data-power-end-turn')){recoverSuite(c,d,{endTurn:true});log('resource','Force powers recovered (natural 20, end of turn)');}
   else return false;
   changed();return true;
  }catch(e){error(e.message);return true;}}
 };
}
