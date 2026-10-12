import {derive} from './rules.js';
import {rollRoutine,routinePlan} from './combat.js';
import {opportunityContext,planOpportunity} from './opportunity.js';

export function opportunityView(c,pack){
 const distance=opportunityContext(c).distance;
 return derive({...c,inventory:c.inventory.map(e=>({...e,distance}))},pack);
}
export function opportunityPlan(c,pack,uid,view=opportunityView(c,pack)){
 const plan=planOpportunity(c,view,pack,uid);
 const routine={name:'Attack of Opportunity',steps:[{attackId:uid,count:1,attackMod:0,damageMod:0}]};
 routinePlan(routine,[plan.attack]);
 return {...plan,routine};
}
export function opportunityIssue(c,pack,uid,view){try{opportunityPlan(c,pack,uid,view);return '';}catch(e){return e.message;}}
export function rollOpportunity(c,pack,uid,roller){
 const p=opportunityPlan(c,pack,uid),result=rollRoutine(p.routine,[p.attack],pack.rules.combat,roller);
 return {...result,opportunitySpent:p.spent,opportunityPrevious:p.previous};
}
