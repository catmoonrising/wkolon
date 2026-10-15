import {runningPath,withdrawPath,movementCost,movementSpeed,planWithdraw} from './combat-movement.js';
import {runningAttackIssue} from './combat-movement-actions.js';
import {escapeHTML as escape} from './wiki-content.js';

const number=(key,value,label)=>`<input type="number" min="0" max="100000" data-movement="${key}" value="${value}" aria-label="${escape(label)}">`;
const modes=(key,value,d)=>{
 const options=[['normal','Normal'],...Object.keys(d.speeds).map(k=>[k,k[0].toUpperCase()+k.slice(1)])];
 if(!options.some(([k])=>k===value))options.push([value,value+' (unavailable)']);
 return options.length>1?`<label>Move <select data-movement="${key}.mode">${options.map(([k,name])=>`<option value="${escape(k)}" ${value===k?'selected':''}>${escape(name)}</option>`).join('')}</select></label>`:'';
};
const reference=id=>`<a href="https://swse.miraheze.org/wiki/${id==='running-attack'?'Running_Attack':'Withdraw'}" data-rule-page="rule:${id}" aria-label="${id==='running-attack'?'Running Attack':'Withdraw'} mechanics">ⓘ</a>`;
const labels=[['diagonal','Diagonal','Diagonal squares without difficult terrain or low objects'],['difficult','Difficult','Nondiagonal squares with difficult terrain or low objects'],['diagonalDifficult','Both','Squares that are diagonal and have difficult terrain or low objects']];
function terrain(key,segments,headers,id){
 return `<details id="${id}"><summary>Terrain</summary><div class="movement-terrain-grid" style="grid-template-columns:max-content repeat(${headers.length},minmax(0,1fr))"><span></span>${headers.map(h=>`<strong>${h}</strong>`).join('')}${labels.map(([k,label,title])=>`<span title="${title}">${label}</span>${segments.map(([name,p],i)=>number(key+'.'+name+'.'+k,p[k],headers[i]+' '+label)).join('')}`).join('')}</div></details>`;
}
export function runningCostLabel(c,d,pack){
 const p=runningPath(c),cost=movementCost(p.before,pack.rules.combatMovement)+movementCost(p.after,pack.rules.combatMovement);
 let speed;try{speed=movementSpeed(d,p.mode);}catch{speed='-';}
 return `${cost}/${speed} squares`;
}
export function runningAttackControls(c,d,pack,a,scope='',view){
 if(!d.ctx.feats.some(f=>f.id===pack.rules.combatMovement.running.featId))return '';
 const p=runningPath(c),issue=runningAttackIssue(c,pack,a.uid,view),id=scope+'running-'+a.uid;
 return `<details id="${id}"><summary>Running Attack</summary><div class="actions">${modes('runningAttack',p.mode,d)}<label>Before ${number('runningAttack.before.squares',p.before.squares,'Running Attack squares before attack')}</label><label>After ${number('runningAttack.after.squares',p.after.squares,'Running Attack squares after attack')}</label><span data-running-cost title="Movement cost / Speed">${runningCostLabel(c,d,pack)}</span><button data-combat="running-attack" data-attack-id="${a.uid}" title="${escape(issue||'One weapon attack; move before and after')}" ${issue?'disabled':''}>Running Attack</button>${reference('running-attack')}</div>${terrain('runningAttack',[['before',p.before],['after',p.after]],['Before','After'],id+'-terrain')}</details>`;
}
export function withdrawIssue(c,d,pack){try{planWithdraw(c,d,pack);return '';}catch(e){return e.message;}}
export function withdrawCostLabel(c,d,pack){
 const p=withdrawPath(c),cost=movementCost(p.path,pack.rules.combatMovement);let speed;try{speed=Math.floor(movementSpeed(d,p.mode)*pack.rules.combatMovement.withdraw.speedMultiplier);}catch{speed='-';}
 return `${cost}/${speed} squares`;
}
export function withdrawControls(c,d,pack,scope=''){
 const p=withdrawPath(c),issue=withdrawIssue(c,d,pack),id=scope+'withdraw';
 return `<details id="${id}"><summary>Withdraw</summary><div class="actions">${modes('withdraw',p.mode,d)}<label>Squares ${number('withdraw.path.squares',p.path.squares,'Withdraw squares')}</label><span data-withdraw-cost title="Movement cost / half Speed">${withdrawCostLabel(c,d,pack)}</span></div><label class="checkbox" title="First square clears every threatened area by the shortest possible route"><input type="checkbox" data-movement="withdraw.clearThreats" ${p.clearThreats?'checked':''}>Clear threats in 1 square</label><div class="actions"><button data-combat="withdraw" title="${escape(issue||'Move Action; only the first square avoids attacks of opportunity')}" ${issue?'disabled':''}>Withdraw</button>${reference('withdraw')}</div>${terrain('withdraw',[['path',p.path]],['Squares'],id+'-terrain')}</details>`;
}
