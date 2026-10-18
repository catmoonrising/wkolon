import {automationBadge} from './feature-status.js';
import {articleText,renderArticle,escapeHTML as escape} from './wiki-content.js';
import {learnStarshipManeuver,removeStarshipManeuver,setStarshipManeuverSpent} from './starship-maneuvers.js';
const title=s=>s.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
export function createStarshipManeuvers(pack,{current,derived,changed,error}){
 const queries=new Map();
 function results(level){
  const c=current(),row=derived().rows[level],chosen=c.levels[level].starshipManeuvers||[],free=(row.maneuverChoices||0)-chosen.length,q=(queries.get(c.id)||'').toLocaleLowerCase().trim();
  return `<div class="table-scroll"><table class="power-library"><thead><tr><th></th><th>Maneuver</th><th>Time</th><th>Descriptors</th></tr></thead><tbody>${pack.starshipManeuvers.filter(r=>(r.name+' '+articleText(r.article)).toLocaleLowerCase().includes(q)).map(r=>`<tr><td><button type="button" data-learn-maneuver="${r.id}" data-maneuver-level="${level}" ${free<=0||row.valid===false?'disabled':''}>Select</button></td><td><details><summary>${escape(r.name)}${automationBadge(r)}</summary>${renderArticle(r.article)}</details></td><td>${escape(r.actionText)}</td><td>${r.descriptors.map(title).join(', ')}</td></tr>`).join('')}</tbody></table></div>`;
 }
 function library(level){
  const c=current(),row=derived().rows[level],chosen=c.levels[level].starshipManeuvers||[];if(!row?.maneuverChoices&&!chosen.length)return '';
  return `<section data-maneuver-library="${level}"><div class="power-picks"><span>${chosen.length} / ${row.maneuverChoices||0}</span>${chosen.map(p=>`<span class="power-pick">${escape(pack.starshipManeuvers.find(r=>r.id===p.maneuverId).name)} <button type="button" data-remove-maneuver="${p.id}" aria-label="Remove ${escape(pack.starshipManeuvers.find(r=>r.id===p.maneuverId).name)}">×</button></span>`).join('')}</div><input type="search" data-maneuver-search placeholder="Search" aria-label="Search Starship Maneuvers" value="${escape(queries.get(c.id)||'')}"><div class="actions"><button type="button" data-maneuver-fold="fold">Fold all</button><button type="button" data-maneuver-fold="unfold">Unfold all</button></div><div data-maneuver-results>${results(level)}</div></section>`;
 }
 return {library,
  manager(level=0){const c=current(),levels=c.levels.map((_,i)=>i).filter(i=>derived().rows[i].maneuverChoices||c.levels[i].starshipManeuvers?.length);if(!levels.includes(level))level=levels[0]??0;return `<select data-maneuver-manage-level aria-label="Maneuver learning level">${levels.map(i=>`<option value="${i}" ${i===level?'selected':''}>Level ${i+1}</option>`).join('')}</select>${library(level)}`;},
  sheet(){const c=current(),d=derived(),rules=pack.rulePages.find(r=>r.id==='rule:starship-maneuver-starship-maneuvers');return `<div class="actions"><button type="button" data-action="manage-maneuvers" ${d.maneuverSlots||c.levels.some(l=>l.starshipManeuvers?.length)?'':'disabled'}>Manage</button></div><details><summary>Mechanics</summary>${renderArticle(rules.article)}</details><div class="power-suite">${d.starshipManeuvers.map(r=>`<div class="power-copy ${r.spent?'spent':''}"><input type="checkbox" data-maneuver-spent="${r.copyId}" ${r.spent?'checked':''} aria-label="${escape(r.name)} spent"><details><summary>${escape(r.name)}${automationBadge(r)}</summary>${renderArticle(r.article)}</details></div>`).join('')}</div>`;},
  input(el){if(!el.hasAttribute('data-maneuver-search'))return false;queries.set(current().id,el.value);const root=el.closest('[data-maneuver-library]');root.querySelector('[data-maneuver-results]').innerHTML=results(Number(root.dataset.maneuverLibrary));return true;},
  change(el){if(!el.hasAttribute('data-maneuver-spent'))return false;try{setStarshipManeuverSpent(current(),derived(),el.dataset.maneuverSpent,el.checked);changed();}catch(e){error(e.message);}return true;},
  click(el){try{
   if(el.hasAttribute('data-learn-maneuver'))learnStarshipManeuver(current(),derived(),pack,Number(el.dataset.maneuverLevel),el.dataset.learnManeuver);
   else if(el.hasAttribute('data-remove-maneuver'))removeStarshipManeuver(current(),el.dataset.removeManeuver);
   else if(el.hasAttribute('data-maneuver-fold')){el.closest('[data-maneuver-library]').querySelectorAll('details').forEach(r=>r.open=el.dataset.maneuverFold==='unfold');return true;}
   else return false;
   changed();return true;
  }catch(e){error(e.message);return true;}}
 };
}
