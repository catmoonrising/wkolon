import {thresholdForContext} from './defense-abilities.js';
import {shieldProtection} from './energy-shields.js';
import {armorProtection} from './armor.js';
import {protectedDamage} from './combat.js';
import {recoveryState,setDead,recordKnockout} from './recovery.js';
import {ambiguityValue} from './house-rules.js';

export function damageOutcome(c,d,pack,amount,{type='normal',ignoreDR=false,spendForcePoint=false,energy=false,fire=false,lightsaber=false,otherDamage=false,requiresUseTheForce=false,against=[]}={}){
 if(!Array.isArray(against)||against.some(a=>typeof a!=='string'||!d.thresholdContext?.bonuses.some(r=>r.against===a)))throw new Error('Invalid damage context');
 if(typeof requiresUseTheForce!=='boolean')throw new Error('Invalid Use the Force damage declaration');
 if(!['normal','stun','ion'].includes(type))throw new Error('Unknown damage type');
 if(recoveryState(c).dead)throw new Error('Character is dead or destroyed');
 const rule=pack.rules.incomingDamage,isDroid=!!pack.species.find(s=>s.id===c.species)?.isDroid;
 const immunity=type==='stun'&&isDroid;
 // General attack protection is resolved before the HP-only halving. The
 // threshold comparison retains penetrating damage before that halving.
 const shield=shieldProtection(c,d,pack,{energy,fire,lightsaber,otherDamage});
 const protection=protectedDamage({...armorProtection(c,d,{energy,fire,lightsaber,ignoreDR}),sr:shield.sr},amount,pack.rules.combat,ignoreDR);
 if(immunity)return {type,immune:true,hpDamage:0,srBlocked:0,drBlocked:0,srAfter:c.protection.sr,beforeHP:c.currentHP??d.hp,afterHP:c.currentHP??d.hp,conditionAfter:c.condition,conditionSteps:0,dead:false,forcePointSpent:0,canSurvive:false,knockout:false};
 const penetrating=protection.hpDamage,hpDamage=type==='normal'?penetrating:Math.floor(penetrating/rule[type].hpDivisor);
 const beforeHP=c.currentHP??d.hp,afterDamage=Math.max(0,beforeHP-hpDamage);
 const contexts=[...new Set([...against,...(requiresUseTheForce?['use-the-force']:[])])];
 const threshold=d.thresholdContext&&contexts.length?d.threshold+thresholdForContext(d.thresholdContext,contexts).total-thresholdForContext(d.thresholdContext).total:d.threshold;
 const exceeded=penetrating>0&&penetrating>=threshold;
 const wasUnconscious=c.condition===rule.helplessStep||beforeHP===0;
 const electronic=isDroid||!!c.cybernetic;
 const thresholdSteps=exceeded?(type==='normal'?rule.normalThresholdSteps:type==='stun'||electronic?rule[type].thresholdSteps:0):0;
 const conditionAfter=penetrating>0&&afterDamage===0?rule.helplessStep:Math.min(rule.helplessStep,c.condition+thresholdSteps);
 // The optional general-death reading concerns the attack reaching zero HP.
 // It leaves special-damage knockout and recovery rules otherwise intact.
 const generalDeath=ambiguityValue(c,pack,'ambiguity:stun-ion-death')==='general-death';
 const fatal=exceeded&&(type==='normal'?(afterDamage===0||wasUnconscious):generalDeath&&afterDamage===0);
 const canSurvive=fatal&&beforeHP>0&&afterDamage===0&&d.forceCurrent>=rule.forcePointCost;
 if(spendForcePoint&&fatal&&!canSurvive)throw new Error('A Force Point cannot prevent this death');
 const forcePointSpent=spendForcePoint&&canSurvive?rule.forcePointCost:0,dead=fatal&&!forcePointSpent;
 return {...protection,threshold,shieldSource:shield.source,type,immune:false,hpDamage,beforeHP,afterHP:dead?0:afterDamage,conditionAfter:dead?rule.helplessStep:conditionAfter,conditionSteps:(dead?rule.helplessStep:conditionAfter)-c.condition,dead,canSurvive,forcePointSpent,knockout:!wasUnconscious&&(conditionAfter===rule.helplessStep||afterDamage===0),balanceCheckRequired:!!c.balance?.active&&penetrating>0};
}

export function applyIncomingDamage(c,d,pack,amount,options){
 const result=damageOutcome(c,d,pack,amount,options);
 c.currentHP=result.afterHP;if(result.shieldSource)c.inventory.find(e=>e.uid===result.shieldSource).shield.sr=result.srAfter;else c.protection.sr=result.srAfter;c.condition=result.conditionAfter;
 if(result.forcePointSpent)c.forcePoints-=result.forcePointSpent;
 if(result.dead)setDead(c,true);
 else if(result.knockout)recordKnockout(c,result.type);
 return result;
}
