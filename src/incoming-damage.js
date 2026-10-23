import {assertDeflectionResolved} from './deflection.js';
import {assertNegationResolved} from './negating-powers.js';
import {resistancePowerDR,assertResistanceResolved,lockResistancePowers,requireResistanceDamageChecks,clearResistancePowers} from './resistance-powers.js';
import {activeShieldPowers,lockShieldPowers,spendShieldPower} from './shield-powers.js';
import {activeShields} from './energy-shields.js';
import {bonusHP} from './bonus-hit-points.js';
import {thresholdForContext} from './defense-abilities.js';
import {shieldProtection} from './energy-shields.js';
import {armorProtection} from './armor.js';
import {protectedDamage} from './combat.js';
import {recoveryState,setDead,recordKnockout} from './recovery.js';
import {ambiguityValue} from './house-rules.js';
import {endUnconsciousTalents} from './talent-activations.js';

export function damageOutcome(c,d,pack,amount,{type='normal',ignoreDR=false,spendForcePoint=false,energy=false,sonic=false,fire=false,cold=false,electrical=false,lightsaber=false,otherDamage=false,requiresUseTheForce=false,against=[],conditionSteps=0}={}){
 assertResistanceResolved(c);assertNegationResolved(c);assertDeflectionResolved(c);
 if(!Number.isInteger(conditionSteps)||conditionSteps<0||conditionSteps>5)throw new Error('Invalid Condition Track steps');
 if([energy,sonic,fire,cold,electrical,lightsaber,ignoreDR,otherDamage].some(v=>typeof v!=='boolean'))throw new Error('Invalid damage declaration');
 if(!Array.isArray(against)||against.some(a=>typeof a!=='string'||!d.thresholdContext?.bonuses.some(r=>r.against===a)))throw new Error('Invalid damage context');
 if(typeof requiresUseTheForce!=='boolean')throw new Error('Invalid Use the Force damage declaration');
 if(!['normal','stun','ion'].includes(type))throw new Error('Unknown damage type');
 if(recoveryState(c).dead)throw new Error('Character is dead or destroyed');
 const rule=pack.rules.incomingDamage,isDroid=!!pack.species.find(s=>s.id===c.species)?.isDroid;
 const immunity=type==='stun'&&isDroid;
 // General attack protection is resolved before the HP-only halving. The
 // threshold comparison retains penetrating damage before that halving.
 const shield=shieldProtection(c,d,pack,{energy:energy||sonic,fire,lightsaber,otherDamage});
 const ordinary=armorProtection(c,d,{energy:energy||sonic,fire,lightsaber,ignoreDR}),resistance=resistancePowerDR(c,pack,{energy,sonic,fire,cold,electrical,lightsaber,ignoreDR,listedSources:ambiguityValue(c,pack,'ambiguity:energy-resistance-damage')==='listed-sources'});
 const protection=protectedDamage({...ordinary,dr:Math.max(ordinary.dr,resistance),sr:shield.sr},amount,pack.rules.combat,ignoreDR);
 if(immunity)return {type,immune:true,bonusHPBlocked:0,bonusHPBefore:bonusHP(c),bonusHPAfter:bonusHP(c),hpDamage:0,srBlocked:0,drBlocked:0,srAfter:c.protection.sr,beforeHP:c.currentHP??d.hp,afterHP:c.currentHP??d.hp,conditionAfter:c.condition,conditionSteps:0,dead:false,forcePointSpent:0,canSurvive:false,knockout:false};
 const electronic=isDroid||!!c.cybernetic||!!pack.species.find(s=>s.id===c.species).cybernetic;
 const hpDivisor=type==='normal'||type==='ion'&&electronic&&ambiguityValue(c,pack,'ambiguity:ion-electronic-damage')==='full-electronic'?1:rule[type].hpDivisor;
 const penetrating=protection.hpDamage,hpLoss=Math.floor(penetrating/hpDivisor);
 const bonusHPBefore=bonusHP(c),bonusHPBlocked=Math.min(bonusHPBefore,hpLoss),bonusHPAfter=bonusHPBefore-bonusHPBlocked,hpDamage=hpLoss-bonusHPBlocked;
 const beforeHP=c.currentHP??d.hp,afterDamage=Math.max(0,beforeHP-hpDamage);
 const contexts=[...new Set([...against,...(requiresUseTheForce?['use-the-force']:[])])];
 const threshold=d.thresholdContext&&contexts.length?d.threshold+thresholdForContext(d.thresholdContext,contexts).total-thresholdForContext(d.thresholdContext).total:d.threshold;
 const exceeded=penetrating>0&&penetrating>=threshold;
 const wasUnconscious=c.condition===rule.helplessStep||beforeHP===0;
 const thresholdSteps=exceeded?(type==='normal'?rule.normalThresholdSteps:type==='stun'||electronic?rule[type].thresholdSteps:0):0;
 const conditionAfter=penetrating>0&&afterDamage===0?rule.helplessStep:Math.min(rule.helplessStep,c.condition+thresholdSteps+conditionSteps);
 // The optional general-death reading concerns the attack reaching zero HP.
 // It leaves special-damage knockout and recovery rules otherwise intact.
 const generalDeath=ambiguityValue(c,pack,'ambiguity:stun-ion-death')==='general-death';
 const fatal=exceeded&&(type==='normal'?(afterDamage===0||wasUnconscious):generalDeath&&afterDamage===0);
 const canSurvive=fatal&&beforeHP>0&&afterDamage===0&&d.forceCurrent>=rule.forcePointCost&&(!c.actionState?.active||!c.actionState.forceSpent);
 if(spendForcePoint&&fatal&&!canSurvive)throw new Error('A Force Point cannot prevent this death');
 const forcePointSpent=spendForcePoint&&canSurvive?rule.forcePointCost:0,dead=fatal&&!forcePointSpent;
 return {...protection,penetrating,threshold,shieldSource:shield.source,shieldKind:shield.kind,shieldBefore:shield.sr,type,immune:false,bonusHPBlocked,bonusHPBefore,bonusHPAfter,hpDamage,beforeHP,afterHP:dead?0:afterDamage,conditionAfter:dead?rule.helplessStep:conditionAfter,conditionSteps:(dead?rule.helplessStep:conditionAfter)-c.condition,dead,canSurvive,forcePointSpent,knockout:!wasUnconscious&&(conditionAfter===rule.helplessStep||afterDamage===0),balanceCheckRequired:!!c.balance?.active&&penetrating>0};
}

function commitIncomingDamage(c,d,pack,amount,options){
 const result=damageOutcome(c,d,pack,amount,options);
 if(result.immune){c.currentHP=result.afterHP;return result;}
 let equipmentShield;
 if(result.shieldKind==='equipment'){equipmentShield=c.inventory.find(e=>e.uid===result.shieldSource);if(!equipmentShield?.shield?.active||equipmentShield.shield.sr!==result.shieldBefore||!activeShields(c,pack).some(s=>s.uid===result.shieldSource))throw new Error('Shield changed; apply damage again');}
 else if(result.shieldKind==='power'&&!activeShieldPowers(c,pack).some(s=>s.id===result.shieldSource&&s.sr===result.shieldBefore))throw new Error('Shield changed; apply damage again');
 else if(result.shieldKind==='manual'&&c.protection.sr!==result.shieldBefore)throw new Error('Shield changed; apply damage again');
 if(c.bonusHP!==undefined||result.bonusHPBlocked)c.bonusHP=result.bonusHPAfter;
 c.currentHP=result.afterHP;if(amount>0)lockShieldPowers(c);if(result.shieldKind==='power')spendShieldPower(c,result.shieldSource,result.srAfter);else if(result.shieldKind==='equipment')equipmentShield.shield.sr=result.srAfter;else c.protection.sr=result.srAfter;c.condition=result.conditionAfter;
 if(result.forcePointSpent){c.forcePoints-=result.forcePointSpent;if(c.actionState?.active)c.actionState.forceSpent=true;}
 if(amount>0)lockResistancePowers(c);
 if(result.dead)setDead(c,true,pack);
 else if(result.knockout)recordKnockout(c,result.type,pack);
 endUnconsciousTalents(c,pack);
 if(result.dead||result.afterHP===0||result.conditionAfter===5||d.incapacitated||d.helpless||!d.skills?.find(s=>s.id==='skill:use-the-force')?.available)clearResistancePowers(c);
 else result.resistanceChecks=requireResistanceDamageChecks(c,pack,result.penetrating);
 return result;
}

export function applyIncomingDamage(c,d,pack,amount,options){
 const q=structuredClone(c),result=commitIncomingDamage(q,d,pack,amount,options);
 for(const key of Object.keys(c))if(!Object.hasOwn(q,key))delete c[key];Object.assign(c,q);return result;
}
