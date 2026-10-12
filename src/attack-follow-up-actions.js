import {derive} from './rules.js';
import {rollRoutine,routinePlan} from './combat.js';
import {planCleave,planFollowThrough,followUpState,applyFollowUpClaim} from './attack-follow-ups.js';
import {clearBracing} from './attack-techniques.js';

export function cleavePlan(c,pack){
 const view=c.followUp?.moveBefore?{...c,inventory:c.inventory.map(e=>({...e,aimed:false,braced:false}))}:c;
 const p=planCleave(c,derive(view,pack),pack),routine={name:p.great?'Great Cleave':'Cleave',steps:[{attackId:p.attack.uid,count:1,attackMod:0,damageMod:0}]};
 routinePlan(routine,[p.attack]);return {...p,routine};
}
export function cleaveIssue(c,pack){try{cleavePlan(c,pack);return '';}catch(e){return e.message;}}
export function rollCleave(c,pack,roller){
 const p=cleavePlan(c,pack),result=rollRoutine(p.routine,[p.attack],pack.rules.combat,roller);
 const note=p.move?`; Follow Through ${p.state.path.squares} squares (${p.move.cost}/${p.move.maximum} movement)`:'';
 return {...result,followUpPrevious:structuredClone(followUpState(c)),followUpConsume:{ticketId:p.ticket.id,opponent:p.state.opponent,cleave:true,followThrough:!!p.move},
  text:result.text+note,html:result.html+(p.move?`<div>Follow Through: ${p.state.path.squares} squares (${p.move.cost}/${p.move.maximum} movement)</div>`:''),
  aimConsumed:c.inventory.filter(e=>e.aimed).map(e=>e.uid),bracingConsumed:c.inventory.some(e=>e.braced)};
}
export function followThrough(c,d,pack){
 const p=planFollowThrough(c,d,pack);clearBracing(c);for(const e of c.inventory)if(e.aimed!==undefined)e.aimed=false;
 applyFollowUpClaim(c,{ticketId:p.ticket.id,opponent:p.state.opponent,followThrough:true});
 return {text:`Follow Through: ${p.state.path.squares} squares (${p.cost}/${p.maximum} movement)`};
}
