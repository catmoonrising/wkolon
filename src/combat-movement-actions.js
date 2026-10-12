import {derive} from './rules.js';
import {rollRoutine,routinePlan} from './combat.js';
import {clearBracing} from './attack-techniques.js';
import {movementCost,movementSegment,runningPath,planRunningAttack,planWithdraw} from './combat-movement.js';
import {escapeHTML as escape} from './wiki-content.js';

export function runningAttackView(c,pack){
 const path=runningPath(c),before=movementCost(movementSegment(path.before),pack.rules.combatMovement);
 // Movement before the attack breaks Aim/Brace before range and damage derive.
 // This view never changes saved declarations until the attack passes preflight.
 const view=before?{...c,inventory:c.inventory.map(e=>({...e,aimed:false,braced:false}))}:c;
 return derive(view,pack);
}
export function runningAttackPlan(c,pack,uid,view=runningAttackView(c,pack)){
 const p=planRunningAttack(c,view,pack,uid),routine={name:'Running Attack',steps:[{attackId:uid,count:1,attackMod:0,damageMod:0}]};
 routinePlan(routine,[p.attack]);return {...p,routine};
}
export function runningAttackIssue(c,pack,uid,view){try{runningAttackPlan(c,pack,uid,view);return '';}catch(e){return e.message;}}
export function rollRunningAttack(c,pack,uid,roller){
 const p=runningAttackPlan(c,pack,uid),result=rollRoutine(p.routine,[p.attack],pack.rules.combat,roller);
 const note=`Before ${p.path.before.squares}, after ${p.path.after.squares}; ${p.cost}/${p.maximum} squares (${p.path.mode})`;
 return {...result,aimConsumed:c.inventory.filter(e=>e.aimed).map(e=>e.uid),bracingConsumed:c.inventory.some(e=>e.braced),
  text:result.text+'; '+note,html:result.html+'<div>'+escape(note)+'</div>',movement:{before:p.before,after:p.after,cost:p.cost,maximum:p.maximum,mode:p.path.mode}};
}
export function withdraw(c,d,pack){
 const p=planWithdraw(c,d,pack);clearBracing(c);for(const e of c.inventory)if(e.aimed!==undefined)e.aimed=false;
 return {...p,text:`Withdraw: ${p.path.path.squares} squares (${p.cost}/${p.maximum} movement); only the first square is protected`};
}
