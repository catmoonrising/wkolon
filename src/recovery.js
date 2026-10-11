import {counselingEnabled} from './house-rules.js';
import {evalExpr} from './dice.js';

const empty=()=>({secondWindsSpent:0,secondWindEncounter:false,ragesSpent:0,rageRounds:0,persistent:[]});
export const recoveryState=c=>c.recovery??empty();
const state=c=>c.recovery??=empty();
export function validateRecovery(c,bad){
 if(c.recovery===undefined)return;
 const r=c.recovery,integer=n=>Number.isInteger(n)&&n>=0&&n<=100000;
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!Object.keys(empty()).includes(k))||!['secondWindsSpent','ragesSpent','rageRounds'].every(k=>integer(r[k]))||typeof r.secondWindEncounter!=='boolean'||!Array.isArray(r.persistent)||new Set(r.persistent).size!==r.persistent.length||r.persistent.some(p=>!['rage','second-wind'].includes(p)))bad('recovery state');
}
export function recoveryDetails(c,pack,{species,hp,scores,mods,classFortitude,extraSecondWinds,extraRages,rageBonus,forceRecovery}){
 const r=recoveryState(c),rule=pack.rules.secondWind;
 const base=counselingEnabled(c,rule.multipleUsesTopic)?Math.max(1,1+classFortitude+mods.con):rule.dailyUses;
 const daily=base*(1+extraSecondWinds),remaining=Math.max(0,daily-r.secondWindsSpent);
 const current=c.currentHP??hp,able=c.condition<5&&current>0;
 const exhaustion=!remaining&&counselingEnabled(c,rule.exhaustionTopic);
 const windReason=species.isDroid?'Droids regain HP through repair':!able?'Cannot take a Swift Action':current>hp*rule.maximumHitPointFraction?'HP above half maximum':r.secondWindEncounter?'Used this encounter':!remaining&&!exhaustion?'No daily uses remaining':'';
 const rage=species.rage?{active:r.rageRounds>0,rounds:r.rageRounds,duration:Math.max(1,species.rage.durationBase+mods.con),bonus:species.rage.bonus+rageBonus,daily:species.rage.dailyUses+extraRages,remaining:Math.max(0,species.rage.dailyUses+extraRages-r.ragesSpent)}:null;
 return {secondWind:{daily,remaining,healing:Math.max(Math.floor(hp*rule.hitPointFraction),scores.con),forceDice:forceRecovery?Math.min(rule.forceRecovery.maxDice,c.forcePoints):0,exhaustion,reason:windReason,available:!windReason},rage,persistent:r.persistent,recoverable:able&&c.condition>0&&!r.persistent.length};
}
const persistent=(c,cause)=>{const r=state(c);c.condition=Math.min(5,c.condition+1);if(!r.persistent.includes(cause))r.persistent.push(cause);};
export function catchSecondWind(c,d,pack,roll=evalExpr){
 const wind=d.recovery.secondWind;if(!wind.available)throw new Error(wind.reason);
 const forceRoll=wind.forceDice?roll(`${wind.forceDice}d${pack.rules.secondWind.forceRecovery.die}`):null;
 const extra=forceRoll?.value??0;
 if(!Number.isFinite(extra)||extra<0)throw new Error('Invalid Force Recovery roll');
 const before=c.currentHP??d.hp,r=state(c);
 c.currentHP=Math.min(d.hp,before+wind.healing+extra);r.secondWindsSpent++;r.secondWindEncounter=true;
 if(wind.exhaustion)persistent(c,'second-wind');
 return {healed:c.currentHP-before,forceRecovery:extra,forceRoll,exhaustion:wind.exhaustion};
}
export function startRage(c,d){
 const rage=d.recovery.rage;
 if(!rage||rage.active||!rage.remaining||d.incapacitated)throw new Error('Rage unavailable');
 const r=state(c);r.ragesSpent++;r.rageRounds=rage.duration;
}
export function endRage(c){
 const r=state(c);if(!r.rageRounds)return false;
 r.rageRounds=0;persistent(c,'rage');return true;
}
export function advanceRage(c){
 const r=state(c);if(!r.rageRounds)return false;
 if(r.rageRounds===1)return endRage(c);
 r.rageRounds--;return true;
}
export function recoverCondition(c,d){
 if(!d.recovery.recoverable)throw new Error('Recover unavailable');
 c.condition--;
}
export function removePersistent(c,cause){
 const r=state(c);r.persistent=r.persistent.filter(p=>p!==cause);
}
export function newEncounter(c){state(c).secondWindEncounter=false;}
export function newDay(c){const r=state(c);r.secondWindsSpent=0;r.ragesSpent=0;}
