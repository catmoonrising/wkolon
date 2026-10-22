import {assertDeflectionResolved} from './deflection.js';
import {clearResistancePowers} from './resistance-powers.js';
import {clearShieldPowers} from './shield-powers.js';
import {clearRagePowers} from './rage-powers.js';
import {clearMovementPowers} from './movement-powers.js';
import {clearSelfPowerEffects} from './self-power-effects.js';
import {advanceTimedTalents,ROUNDS_PER_MINUTE} from './timed-talents.js';
import {powerActivationIssue} from './power-activation.js';
// Suite operations track copies; reviewed effects resolve in the action engine.
import {clearFollowUps} from './attack-follow-ups.js';
import {clearAiming,clearBracing,startNextTurn} from './attack-techniques.js';
export function powerCopy(c,id){return c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===id);}
export function restorePowerCopy(c,d,id){
 const power=d.forcePowers.find(p=>p.copyId===id),copy=powerCopy(c,id);
 if(!power||!copy?.spent)throw new Error('Cannot recover power');
 copy.spent=false;return power;
}
export const turnEndRecoveryDue=c=>!!c.forcePowerRecoveryPending&&(c.forcePowerRecoveryTurn===undefined||c.forcePowerRecoveryTurn<=(c.actionState?.turn||1));
export function usePower(c,d,pack,id,natural,{action=null}={}){
 const power=d.forcePowers.find(p=>p.copyId===id),copy=powerCopy(c,id);
 const issue=powerActivationIssue(c,d,pack,power);
 if(!copy||copy.spent||issue)throw new Error(issue||'Power unavailable');
 if(!Number.isInteger(natural)||natural<1||natural>20)throw new Error('Invalid power roll');
 clearFollowUps(c);clearAiming(c);clearBracing(c);
 if(['standard-action','move-action','full-round-action'].includes(action||power.action))delete c.routineProgress;
 copy.spent=true;
 if(power.descriptors.includes('dark-side'))c.darkSideScore=Math.min(d.scores.wis,(c.darkSideScore||0)+1);
 if(natural===pack.rules.forcePowerRecovery.naturalRoll){if(c.actionState?.active){const due=c.actionState.turn+(c.actionState.ended?1:0);c.forcePowerRecoveryTurn=c.forcePowerRecoveryPending?Math.min(c.forcePowerRecoveryTurn??c.actionState.turn,due):due;}else delete c.forcePowerRecoveryTurn;c.forcePowerRecoveryPending=true;}
 return power;
}
export function recoverPower(c,d,pack,id){
 const power=d.forcePowers.find(p=>p.copyId===id),copy=powerCopy(c,id),cost=pack.rules.forcePowerRecovery.forcePointCost;
 if(!power||!copy?.spent||d.forceCurrent<cost||d.incapacitated)throw new Error('Cannot recover power');
 clearFollowUps(c);clearAiming(c);clearBracing(c);
 c.forcePoints=d.forceCurrent-cost;return restorePowerCopy(c,d,id);
}
export function recoverSuite(c,d,{endTurn=false}={}){
 assertDeflectionResolved(c);
 if(endTurn&&!turnEndRecoveryDue(c))throw new Error('No turn-end recovery pending');
 if(endTurn){clearBracing(c);if(c.mightySwing!==undefined)c.mightySwing=false;}
 else {clearSelfPowerEffects(c);clearShieldPowers(c);clearResistancePowers(c);clearRagePowers(c);clearMovementPowers(c);advanceTimedTalents(c,ROUNDS_PER_MINUTE);startNextTurn(c);}
 const ids=new Set(d.forcePowers.map(p=>p.copyId));
 for(const l of c.levels)for(const p of l.forcePowers||[])if(ids.has(p.id))p.spent=false;
 c.forcePowerRecoveryPending=false;delete c.forcePowerRecoveryTurn;
}

export function take10Power(c,d,pack,id,options){
 const power=d.forcePowers.find(p=>p.copyId===id);if(!power?.take10)throw new Error('Power Mastery required');
 return usePower(c,d,pack,id,10,options);
}

export function useAdeptPower(c,d,pack,id,naturals){
 const power=d.forcePowers.find(p=>p.copyId===id);
 if(!power?.adept||d.forceCurrent<1)throw new Error('Force Power Adept unavailable');
 if(!Array.isArray(naturals)||naturals.length!==2||naturals.some(n=>!Number.isInteger(n)||n<1||n>20))throw new Error('Invalid power checks');
 const selected=Math.max(...naturals),used=usePower(c,d,pack,id,selected);
 c.forcePoints=d.forceCurrent-1;
 return {power:used,naturals:[...naturals],selected};
}
