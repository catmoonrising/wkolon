import {protectedDamage} from './combat.js';
import {recoveryState,setDead,recordKnockout} from './recovery.js';
import {ambiguityValue} from './house-rules.js';

export function damageOutcome(c,d,pack,amount,{type='normal',ignoreDR=false,spendForcePoint=false}={}){
 if(!['normal','stun','ion'].includes(type))throw new Error('Unknown damage type');
 if(recoveryState(c).dead)throw new Error('Character is dead or destroyed');
 const rule=pack.rules.incomingDamage,isDroid=!!pack.species.find(s=>s.id===c.species)?.isDroid;
 const immunity=type==='stun'&&isDroid;
 // General attack protection is resolved before the HP-only halving. The
 // threshold comparison retains penetrating damage before that halving.
 const protection=protectedDamage(c.protection,amount,pack.rules.combat,ignoreDR);
 if(immunity)return {type,immune:true,hpDamage:0,srBlocked:0,drBlocked:0,srAfter:c.protection.sr,beforeHP:c.currentHP??d.hp,afterHP:c.currentHP??d.hp,conditionAfter:c.condition,conditionSteps:0,dead:false,forcePointSpent:0,canSurvive:false,knockout:false};
 const penetrating=protection.hpDamage,hpDamage=type==='normal'?penetrating:Math.floor(penetrating/rule[type].hpDivisor);
 const beforeHP=c.currentHP??d.hp,afterDamage=Math.max(0,beforeHP-hpDamage);
 const exceeded=penetrating>0&&penetrating>=d.threshold;
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
 return {...protection,type,immune:false,hpDamage,beforeHP,afterHP:dead?0:afterDamage,conditionAfter:dead?rule.helplessStep:conditionAfter,conditionSteps:(dead?rule.helplessStep:conditionAfter)-c.condition,dead,canSurvive,forcePointSpent,knockout:!wasUnconscious&&(conditionAfter===rule.helplessStep||afterDamage===0),balanceCheckRequired:!!c.balance?.active&&penetrating>0};
}

export function applyIncomingDamage(c,d,pack,amount,options){
 const result=damageOutcome(c,d,pack,amount,options);
 c.currentHP=result.afterHP;c.protection.sr=result.srAfter;c.condition=result.conditionAfter;
 if(result.forcePointSpent)c.forcePoints-=result.forcePointSpent;
 if(result.dead)setDead(c,true);
 else if(result.knockout)recordKnockout(c,result.type);
 return result;
}
