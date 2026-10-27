import {incomingDamageDeclaration} from './damage-declarations.js';
import {damageOutcome,applyIncomingDamage} from './incoming-damage.js';
import {withDamageThresholdBonus} from './defense-abilities.js';

export const thresholdPowerRule=(pack,id)=>pack.rules.thresholdPowers?.find(r=>r.powerId===id);
export const pendingThresholdPower=c=>c.actionState?.plan.find(s=>s.status==='waiting'&&s.action==='power'&&s.options.effectPowerId==='power:crucitorn');
export function assertThresholdPowerResolved(c){if(pendingThresholdPower(c))throw new Error('Resolve Crucitorn first');}
export function validateThresholdPowers(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const rule=thresholdPowerRule(pack,step.options?.effectPowerId);if(!rule)continue;
  try{
   if(step.action!=='power'||step.status==='queued'||!step.result?.check||step.result.check.total!==step.result.check.natural+step.result.check.bonus||step.result.fpAllowed!==false)throw new Error();
   incomingDamageDeclaration(step.options.incoming);const tier=thresholdPowerTier(pack,rule.powerId,step.result.check.total,step.options.effectDC??null);
   if(step.result.enhanceAllowed&&!tier||step.result.effectChoiceAllowed&&rule.thresholds.filter(t=>t.dc<=step.result.check.total).length<2)throw new Error();
   if(step.status==='waiting'&&(!c.levels.flatMap(l=>l.forcePowers||[]).some(p=>p.id===step.options.powerId&&p.powerId===rule.powerId)||!step.result.enhanceAllowed&&!step.result.effectChoiceAllowed))throw new Error();
  }catch{bad('threshold power result');return;}
 }
}
export function thresholdPowerTier(pack,id,total,effectDC=null){
 const rule=thresholdPowerRule(pack,id);
 if(!rule||!Number.isInteger(total)||Math.abs(total)>100000||effectDC!==null&&!rule.thresholds.some(t=>t.dc===effectDC))throw new Error('Invalid threshold power result');
 return rule.thresholds.filter(t=>t.dc<=total&&(effectDC===null||t.dc<=effectDC)).at(-1)||null;
}
export function thresholdPowerPlan(c,d,pack,id,incoming,{forceCost=0,enhanceAsk=false}={}){
 const rule=thresholdPowerRule(pack,id);if(!rule||![0,1].includes(forceCost)||typeof enhanceAsk!=='boolean')throw new Error('Invalid threshold power plan');
 const snapshot=incomingDamageDeclaration(incoming);
 return {rule,incoming:snapshot,damage:damageOutcome(c,d,pack,snapshot.amount,snapshot.options)};
}
export function finishThresholdPower(c,d,pack,id,check,incoming,{enhanced=false,effectDC=null,stepId=null}={}){
 const rule=thresholdPowerRule(pack,id),tier=thresholdPowerTier(pack,id,check?.total,effectDC),snapshot=incomingDamageDeclaration(incoming);
 if(typeof enhanced!=='boolean'||enhanced&&!tier)throw new Error('Enhancement unavailable');
 const bonus=tier?tier.bonus+(enhanced?rule.enhancement.bonus:0):0,view=bonus?withDamageThresholdBonus(d,{amount:bonus,type:rule.type}):d;
 const q=structuredClone(c),step=q.actionState?.plan.find(s=>s.id===stepId);
 if(step?.status==='waiting'&&step.options.effectPowerId===id)step.status='done';
 const damage=applyIncomingDamage(q,view,pack,snapshot.amount,snapshot.options),increase=view.threshold-d.threshold;
 for(const key of Object.keys(c))if(!Object.hasOwn(q,key))delete c[key];Object.assign(c,q);
 if(damage.immune)return {bonus,increase,damage,text:'Immune'};
 const text=`DT ${damage.threshold}; SR -${damage.srBlocked}, DR -${damage.drBlocked}; HP ${damage.beforeHP} → ${damage.afterHP}${damage.conditionSteps?'; CT -'+damage.conditionSteps:''}${damage.dead?'; '+(d.ctx.isDroid?'Destroyed':'Dead'):damage.knockout?'; '+(d.ctx.isDroid?'Disabled':'Unconscious'):''}${damage.forcePointSpent?'; Force Points -1':''}`;
 return {bonus,increase,damage,text};
}
