import {recoveryState} from './recovery.js';

export function conditionRecoveryPlan(c,d,pack,id){
 const rule=pack.rules.conditionRecoveryActions?.find(r=>r.id===id);
 const owned=rule?d.ctx.talents.filter(t=>t.id===rule.talentId&&!d.ctx.inactiveTalents.has(t.id)).length:0;
 if(!rule||!owned)throw new Error('Talent unavailable');
 if(d.incapacitated||d.helpless)throw new Error('Actions unavailable while helpless');
 const state=recoveryState(c),remaining=rule.dailyUsesPerSelection?Math.max(0,owned*rule.dailyUsesPerSelection-state.indomitableSpent):null;
 if(remaining===0)throw new Error('No daily uses remaining');
 const steps=Math.min(c.condition,rule.steps);
 if(!steps&&!(rule.removePersistent&&(state.persistent.length||state.limbs.some(l=>l.persistent))))throw new Error('Already in Normal State');
 return {rule,steps,remaining};
}
export function applyConditionRecovery(c,plan){
 const {rule,steps}=plan;
 c.condition-=steps;
 if(rule.dailyUsesPerSelection||rule.removePersistent){
  c.recovery=recoveryState(c);
  if(rule.dailyUsesPerSelection)c.recovery.indomitableSpent++;
  if(rule.removePersistent){c.recovery.persistent=[];for(const limb of c.recovery.limbs)limb.persistent=false;}
 }
 if(c.condition===0&&c.actionState)c.actionState.recover={count:0,lastTurn:0};
}
