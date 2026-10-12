import {startNextRound} from './opportunity.js';
import {counselingEnabled,ambiguityValue} from './house-rules.js';
import {evalExpr} from './dice.js';
import {clearBracing,startNextTurn} from './attack-techniques.js';

const empty=()=>({secondWindsSpent:0,secondWindEncounter:false,ragesSpent:0,rageRounds:0,persistent:[],naturalHealingUsed:false,unconsciousRetry:false,stunUnconscious:false,dead:false,limbs:[]});
export const recoveryState=c=>({...empty(),...c.recovery});
const state=c=>{c.recovery??={};Object.assign(c.recovery,recoveryState(c));return c.recovery;};
const causes=Object.freeze({'rage':'Rage','second-wind':'Second Wind','injury':'Injury','limb-loss':'Lost limb','other':'Other'});
export const persistentName=p=>Object.hasOwn(causes,p)?causes[p]:undefined;
export function validateRecovery(c,bad){
 if(c.recovery===undefined)return;
 const r=c.recovery,integer=n=>Number.isInteger(n)&&n>=0&&n<=100000;
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).some(k=>!Object.keys(empty()).includes(k))||!['secondWindsSpent','ragesSpent','rageRounds'].every(k=>integer(r[k]))||typeof r.secondWindEncounter!=='boolean'||!Array.isArray(r.persistent)||new Set(r.persistent).size!==r.persistent.length||r.persistent.some(p=>!persistentName(p))||['naturalHealingUsed','unconsciousRetry','stunUnconscious','dead'].some(k=>r[k]!==undefined&&typeof r[k]!=='boolean'))bad('recovery state');
 if(r.limbs!==undefined&&(!Array.isArray(r.limbs)||r.limbs.length>20||new Set(r.limbs.map(l=>l?.id)).size!==r.limbs.length||r.limbs.some(l=>!l||Object.keys(l).some(k=>!['id','name','days','persistent'].includes(k))||typeof l.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(l.id)||typeof l.name!=='string'||!l.name.trim()||l.name.length>100||typeof l.persistent!=='boolean'||!Number.isInteger(l.days)||l.days<1||l.days>10)))bad('limb regeneration');
}
export function recoveryDetails(c,pack,{species,hp,scores,mods,classFortitude,extraSecondWinds,extraRages,rageBonus,forceRecovery}){
 const r=recoveryState(c),rule=pack.rules.secondWind;
 const base=counselingEnabled(c,rule.multipleUsesTopic)?Math.max(1,1+classFortitude+mods.con):rule.dailyUses;
 const daily=base*(1+extraSecondWinds),remaining=Math.max(0,daily-r.secondWindsSpent);
 const current=c.currentHP??hp,able=c.condition<5&&current>0&&!r.dead;
 const exhaustion=!remaining&&counselingEnabled(c,rule.exhaustionTopic);
 const windReason=species.isDroid?'Droids regain HP through repair':!able?'Cannot take a Swift Action':current>hp*rule.maximumHitPointFraction?'HP above half maximum':r.secondWindEncounter?'Used this encounter':!remaining&&!exhaustion?'No daily uses remaining':'';
 const rage=species.rage?{active:r.rageRounds>0,rounds:r.rageRounds,duration:Math.max(1,species.rage.durationBase+mods.con),bonus:species.rage.bonus+rageBonus,daily:species.rage.dailyUses+extraRages,remaining:Math.max(0,species.rage.dailyUses+extraRages-r.ragesSpent)}:null;
 return {secondWind:{daily,remaining,healing:Math.max(Math.floor(hp*rule.hitPointFraction),scores.con),forceDice:forceRecovery?Math.min(rule.forceRecovery.maxDice,c.forcePoints):0,exhaustion,reason:windReason,available:!windReason},rage,persistent:r.persistent,recoverable:able&&c.condition>0&&!r.persistent.length,naturalHealing:{amount:c.levels.length*(species.naturalHealingMultiplier||1),used:r.naturalHealingUsed,available:!species.isDroid&&!r.dead},unconscious:{available:!species.isDroid&&!r.dead&&(c.condition===5||current===0),retry:r.unconsciousRetry,modifier:mods.con},dead:r.dead,limbs:r.limbs};
}
const persistent=(c,cause)=>{const r=state(c);c.condition=Math.min(5,c.condition+1);if(!r.persistent.includes(cause))r.persistent.push(cause);};
export function catchSecondWind(c,d,pack,roll=evalExpr){
 const wind=d.recovery.secondWind;if(!wind.available)throw new Error(wind.reason);
 const forceRoll=wind.forceDice?roll(`${wind.forceDice}d${pack.rules.secondWind.forceRecovery.die}`):null;
 const extra=forceRoll?.value??0;
 if(!Number.isFinite(extra)||extra<0)throw new Error('Invalid Force Recovery roll');
 clearBracing(c);
 const before=c.currentHP??d.hp,r=state(c);
 c.currentHP=Math.min(d.hp,before+wind.healing+extra);r.secondWindsSpent++;r.secondWindEncounter=true;
 if(wind.exhaustion)persistent(c,'second-wind');
 return {healed:c.currentHP-before,forceRecovery:extra,forceRoll,exhaustion:wind.exhaustion};
}
export function startRage(c,d){
 const rage=d.recovery.rage;
 if(!rage||rage.active||!rage.remaining||d.incapacitated)throw new Error('Rage unavailable');
 clearBracing(c);
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
 clearBracing(c);
 c.condition--;
}
export function removePersistent(c,cause){
 const r=state(c);r.persistent=r.persistent.filter(p=>p!==cause);
}
export function newEncounter(c){startNextTurn(c);startNextRound(c);state(c).secondWindEncounter=false;}
export function newDay(c,pack){
 startNextTurn(c);startNextRound(c);
 const r=state(c);r.secondWindsSpent=0;r.ragesSpent=0;r.naturalHealingUsed=false;
 const regrown=[];
 if(pack?.species.find(s=>s.id===c.species)?.limbRegeneration&&!r.dead){
  r.limbs=r.limbs.filter(l=>{l.days--;if(l.days)return true;regrown.push(l.name);return false;});
  if(!r.limbs.some(l=>l.persistent))r.persistent=r.persistent.filter(p=>p!=='limb-loss');
 }
 return regrown;
}
export function setPersistent(c,cause,on){
 if(!persistentName(cause))throw new Error('Unknown persistent condition');
 const r=state(c);if(on&&!r.persistent.includes(cause))r.persistent.push(cause);else if(!on)removePersistent(c,cause);
}
export function setDead(c,on){
 state(c).dead=on;
 if(on){startNextTurn(c);c.currentHP=0;c.condition=5;state(c).rageRounds=0;state(c).stunUnconscious=false;}
}
export function receiveHealing(c,d,pack,amount){
 if(!Number.isInteger(amount)||amount<1||amount>100000)throw new Error('Enter healing from 1 to 100,000');
 if(d.recovery.dead)throw new Error('Requires revival, not ordinary healing');
 const before=c.currentHP??d.hp,unconscious=c.condition===5||before===0;
 const additive=!unconscious||ambiguityValue(c,pack,'ambiguity:unconscious-healing')==='add';
 c.currentHP=Math.min(d.hp,(additive?before:0)+amount);
 if(unconscious){c.condition=4;state(c).unconsciousRetry=false;state(c).stunUnconscious=false;}
 return {before,after:c.currentHP,revived:unconscious};
}
export function restEightHours(c,d,pack){
 if(!d.recovery.naturalHealing.available)throw new Error('Natural rest unavailable');
 startNextTurn(c);startNextRound(c);
 if(recoveryState(c).rageRounds)endRage(c);
 const r=state(c),rule=pack.rules.naturalHealing;
 r.persistent=r.persistent.filter(p=>!rule.removablePersistent.includes(p));
 const before=c.currentHP??d.hp;let healed=0;
 if(!r.persistent.length){
  if(!r.naturalHealingUsed){receiveHealing(c,d,pack,d.recovery.naturalHealing.amount);healed=c.currentHP-before;r.naturalHealingUsed=true;}
  if((c.currentHP??d.hp)>0){c.condition=0;r.unconsciousRetry=false;r.stunUnconscious=false;}
 }
 return {healed,before,after:c.currentHP??d.hp,blocked:!!r.persistent.length};
}
export function checkConsciousness(c,d,pack,roller=evalExpr){
 if(!d.recovery.unconscious.available)throw new Error('Consciousness check unavailable');
 const rule=pack.rules.unconsciousRecovery,mod=d.recovery.unconscious.modifier;
 const rolled=roller(`1d20${mod>=0?'+':''}${mod}`),natural=rolled.d20?.[0];
 if(!Number.isInteger(natural)||natural<1||natural>20||!Number.isFinite(rolled.value))throw new Error('Invalid Constitution check');
 const fatal=natural===rule.fatalNatural||rolled.value<=rule.dc-rule.deathFailureMargin;
 const dead=fatal&&!(recoveryState(c).stunUnconscious&&rule.stunNoFatalCheck),success=!fatal&&rolled.value>=rule.dc;
 const r=state(c);
 if(dead)setDead(c,true);
 else if(success){c.currentHP=Math.min(d.hp,(c.currentHP??d.hp)+d.level);c.condition=4;r.unconsciousRetry=false;r.stunUnconscious=false;}
 else {r.unconsciousRetry=true;setPersistent(c,'injury',true);c.condition=5;}
 return {rolled,success,dead};
}
export function recordKnockout(c,type='normal'){
 clearBracing(c);
 if(c.recovery===undefined&&type!=='stun')return;
 const r=state(c);r.stunUnconscious=type==='stun';r.unconsciousRetry=false;
}
export function loseLimb(c,pack,name,roller=evalExpr,persistentInjury=true){
 const trait=pack.species.find(s=>s.id===c.species)?.limbRegeneration,r=recoveryState(c);
 if(!trait||r.dead||r.limbs.length>=20)throw new Error('Limb regeneration unavailable');
 if(typeof name!=='string'||!name.trim()||name.trim().length>100)throw new Error('Enter a limb name');
 if(typeof persistentInjury!=='boolean')throw new Error('Invalid persistent injury');
 const rolled=roller(`1d${trait.die}`);
 if(!Number.isInteger(rolled.value)||rolled.value<1||rolled.value>trait.die)throw new Error('Invalid regeneration roll');
 state(c).limbs.push({id:crypto.randomUUID(),name:name.trim(),days:rolled.value,persistent:persistentInjury});if(persistentInjury)setPersistent(c,'limb-loss',true);
 return {rolled,name:name.trim()};
}
export function removeLimb(c,id){
 const r=state(c);r.limbs=r.limbs.filter(l=>l.id!==id);
 if(!r.limbs.some(l=>l.persistent))removePersistent(c,'limb-loss');
}
export function setLimbPersistent(c,id,on){
 const r=state(c),limb=r.limbs.find(l=>l.id===id);if(!limb)return;
 limb.persistent=on;setPersistent(c,'limb-loss',r.limbs.some(l=>l.persistent));
}
