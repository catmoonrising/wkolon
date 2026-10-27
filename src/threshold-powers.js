import {incomingDamageDeclaration} from './damage-declarations.js';
import {damageOutcome,applyIncomingDamage} from './incoming-damage.js';
import {withDamageThresholdBonus} from './defense-abilities.js';

export const thresholdPowerRule=(pack,id)=>pack.rules.thresholdPowers?.find(r=>r.powerId===id);
export function thresholdPowerTier(pack,id,total,effectDC=null){
 const rule=thresholdPowerRule(pack,id);
 if(!rule||!Number.isInteger(total)||Math.abs(total)>100000||effectDC!==null&&!rule.thresholds.some(t=>t.dc===effectDC))throw new Error('Invalid threshold power result');
 return rule.thresholds.filter(t=>t.dc<=total&&(effectDC===null||t.dc<=effectDC)).at(-1)||null;
}
export function thresholdPowerPlan(c,d,pack,id,incoming,{forceCost=0,enhanceAsk=false}={}){
 const rule=thresholdPowerRule(pack,id);if(!rule||![0,1].includes(forceCost)||typeof enhanceAsk!=='boolean')throw new Error('Invalid threshold power plan');
 const snapshot=incomingDamageDeclaration(incoming);
 if((forceCost||enhanceAsk)&&snapshot.options.spendForcePoint)throw new Error('Choose one Force Point use');
 return {rule,incoming:snapshot,damage:damageOutcome(c,d,pack,snapshot.amount,snapshot.options)};
}
export function finishThresholdPower(c,d,pack,id,check,incoming,{enhanced=false,effectDC=null}={}){
 const rule=thresholdPowerRule(pack,id),tier=thresholdPowerTier(pack,id,check?.total,effectDC),snapshot=incomingDamageDeclaration(incoming);
 if(typeof enhanced!=='boolean'||enhanced&&(!tier||snapshot.options.spendForcePoint))throw new Error('Enhancement unavailable');
 const bonus=tier?tier.bonus+(enhanced?rule.enhancement.bonus:0):0,view=bonus?withDamageThresholdBonus(d,{amount:bonus,type:rule.type}):d;
 const damage=applyIncomingDamage(c,view,pack,snapshot.amount,snapshot.options),increase=view.threshold-d.threshold;
 if(damage.immune)return {bonus,increase,damage,text:'Immune'};
 const text=`DT ${damage.threshold}; SR -${damage.srBlocked}, DR -${damage.drBlocked}; HP ${damage.beforeHP} → ${damage.afterHP}${damage.conditionSteps?'; CT -'+damage.conditionSteps:''}${damage.dead?'; '+(d.ctx.isDroid?'Destroyed':'Dead'):damage.knockout?'; '+(d.ctx.isDroid?'Disabled':'Unconscious'):''}${damage.forcePointSpent?'; Force Points -1':''}`;
 return {bonus,increase,damage,text};
}
