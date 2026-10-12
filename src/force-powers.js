// Power effects stay in pinned articles. These operations track individual suite copies.
import {clearFollowUps} from './attack-follow-ups.js';
import {clearAiming,clearBracing,startNextTurn} from './attack-techniques.js';
export function powerCopy(c,id){return c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===id);}
export function usePower(c,d,pack,id,natural){
 const power=d.forcePowers.find(p=>p.copyId===id),copy=powerCopy(c,id),skill=d.skills.find(s=>s.id==='skill:use-the-force');
 if(!power||!copy||copy.spent||!skill?.available||d.incapacitated)throw new Error('Power unavailable');
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
