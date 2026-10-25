import {endRegenerativeHealing} from './recovery.js';
import {incomingDamageDeclaration} from './damage-declarations.js';
import {applyIncomingDamage,damageOutcome} from './incoming-damage.js';
export const negatingPowerRule=(pack,id)=>(pack.rules.negatingPowers||[]).find(r=>r.powerId===id);
export const pendingNegation=c=>c.actionState?.plan.find(p=>p.status==='waiting'&&p.action==='power'&&p.options.effectPowerId==='power:negate-energy');
export function assertNegationResolved(c){if(pendingNegation(c))throw new Error('Resolve Negate Energy first');}
export function validateNegatingPowers(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const rule=negatingPowerRule(pack,step.options?.effectPowerId);if(!rule||step.status==='queued')continue;
  try{
   if(step.action!=='power'||!step.result?.check||step.result.check.total!==step.result.check.natural+step.result.check.bonus||step.options.aware!==true||step.status==='waiting'&&!c.levels.flatMap(l=>l.forcePowers||[]).some(p=>p.id===step.options.powerId&&p.powerId===rule.powerId))throw new Error();
   const {amount,options}=incomingDamageDeclaration(step.options.incoming);
   if(!options.energy&&!options.sonic||step.result.fpAllowed||step.status==='waiting'&&(!step.result.enhanceAllowed||step.result.check.total<amount))throw new Error();
  }catch{bad('negating power result');return;}
 }
}
export function negateEnergyPlan(c,d,pack,powerId,incoming,{forceCost=0}={}){
 const rule=negatingPowerRule(pack,powerId);if(!rule)throw new Error('Power cannot negate incoming damage');
 const snapshot=incomingDamageDeclaration(incoming);
 if(!snapshot.options.energy&&!snapshot.options.sonic)throw new Error('Requires an Energy attack');
 if(forceCost&&snapshot.options.spendForcePoint)throw new Error('Only one Force Point per round');
 const damage=damageOutcome(c,d,pack,snapshot.amount,snapshot.options);
 return {rule,incoming:snapshot,damage};
}
export function finishNegatingPower(c,d,pack,powerId,check,incoming,{heal=false}={}){
 const rule=negatingPowerRule(pack,powerId),snapshot=incomingDamageDeclaration(incoming);
 if(!rule||!Number.isInteger(check?.total)||typeof heal!=='boolean'||!snapshot.options.energy&&!snapshot.options.sonic)throw new Error('Invalid negation result');
 if(check.total<snapshot.amount){
  if(heal)throw new Error('Healing requires successful negation');
  const damage=applyIncomingDamage(c,d,pack,snapshot.amount,snapshot.options);
  return {negated:false,damage,text:`Not negated; SR -${damage.srBlocked}, DR -${damage.drBlocked}; HP ${damage.beforeHP} → ${damage.afterHP}${damage.dead?'; '+(d.ctx.isDroid?'Destroyed':'Dead'):''}${damage.forcePointSpent?'; Force Points -1':''}`};
 }
 if(!heal)return {negated:true,healed:0,text:'Negated'};
 const before=c.currentHP??d.hp,after=before+Math.min(snapshot.amount,Math.max(0,d.hp-before));c.currentHP=after;if(after>=d.hp)endRegenerativeHealing(c);
 return {negated:true,healed:after-before,text:`Negated; HP ${before} → ${after}`};
}
