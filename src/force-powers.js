import {powerActivationIssue} from './power-activation.js';
// Power effects stay in pinned articles. These operations track individual suite copies.
import {clearFollowUps} from './attack-follow-ups.js';
import {clearAiming,clearBracing,startNextTurn} from './attack-techniques.js';
export function powerCopy(c,id){return c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===id);}
export function usePower(c,d,pack,id,natural){
 const power=d.forcePowers.find(p=>p.copyId===id),copy=powerCopy(c,id);
 const issue=powerActivationIssue(c,d,pack,power);
 if(!copy||copy.spent||issue)throw new Error(issue||'Power unavailable');
 if(!Number.isInteger(natural)||natural<1||natural>20)throw new Error('Invalid power roll');
 clearFollowUps(c);clearAiming(c);clearBracing(c);
 if(['standard-action','move-action','full-round-action'].includes(power.action))delete c.routineProgress;
 copy.spent=true;
 if(power.descriptors.includes('dark-side'))c.darkSideScore=Math.min(d.scores.wis,(c.darkSideScore||0)+1);
 if(natural===pack.rules.forcePowerRecovery.naturalRoll)c.forcePowerRecoveryPending=true;
 return power;
}
export function recoverPower(c,d,pack,id){
 const power=d.forcePowers.find(p=>p.copyId===id),copy=powerCopy(c,id),cost=pack.rules.forcePowerRecovery.forcePointCost;
 if(!power||!copy?.spent||d.forceCurrent<cost||d.incapacitated)throw new Error('Cannot recover power');
 clearFollowUps(c);clearAiming(c);clearBracing(c);
 c.forcePoints=d.forceCurrent-cost;copy.spent=false;return power;
}
export function recoverSuite(c,d,{endTurn=false}={}){
 if(endTurn&&!c.forcePowerRecoveryPending)throw new Error('No turn-end recovery pending');
 if(endTurn){clearBracing(c);if(c.mightySwing!==undefined)c.mightySwing=false;}
 else startNextTurn(c);
 const ids=new Set(d.forcePowers.map(p=>p.copyId));
 for(const l of c.levels)for(const p of l.forcePowers||[])if(ids.has(p.id))p.spent=false;
 c.forcePowerRecoveryPending=false;
}

export function take10Power(c,d,pack,id){
 const power=d.forcePowers.find(p=>p.copyId===id);if(!power?.take10)throw new Error('Power Mastery required');
 return usePower(c,d,pack,id,10);
}

export function useAdeptPower(c,d,pack,id,naturals){
 const power=d.forcePowers.find(p=>p.copyId===id);
 if(!power?.adept||d.forceCurrent<1)throw new Error('Force Power Adept unavailable');
 if(!Array.isArray(naturals)||naturals.length!==2||naturals.some(n=>!Number.isInteger(n)||n<1||n>20))throw new Error('Invalid power checks');
 const selected=Math.max(...naturals),used=usePower(c,d,pack,id,selected);
 c.forcePoints=d.forceCurrent-1;
 return {power:used,naturals:[...naturals],selected};
}
