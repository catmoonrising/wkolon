import {powerCopy,restorePowerCopy} from './force-powers.js';
export const powerRecoveryRule=(pack,id)=>pack.rules.powerRecoveryActions?.find(r=>r.id===id);
export const ownsPowerRecovery=(d,rule)=>!!rule&&d.ctx.talents.some(t=>t.id===rule.talentId&&!d.ctx.inactiveTalents.has(t.id));
export function validatePowerRecoveries(c,pack,bad){
 if(c.powerRecoveriesUsed===undefined)return;
 const rows=c.powerRecoveriesUsed;
 if(!Array.isArray(rows)||rows.length>(pack.rules.powerRecoveryActions?.length||0)||new Set(rows).size!==rows.length||rows.some(id=>powerRecoveryRule(pack,id)?.frequency!=='encounter'))bad('power recoveries');
}
export function powerRecoveryActionPlan(c,d,pack,id){
 const rule=powerRecoveryRule(pack,id);
 if(!ownsPowerRecovery(d,rule)||d.incapacitated||d.helpless)throw new Error('Talent unavailable');
 if(c.powerRecoveriesUsed?.includes(id))throw new Error('Already used this encounter');
 const copies=d.forcePowers.filter(p=>p.id===rule.powerId&&p.spent&&powerCopy(c,p.copyId)?.spent);
 if(!copies.length)throw new Error('No spent uses');
 return {rule,copies};
}
export function applyPowerRecoveryAction(c,d,plan){
 for(const p of plan.copies)restorePowerCopy(c,d,p.copyId);
 (c.powerRecoveriesUsed??=[]).push(plan.rule.id);
}
export function clearPowerRecoveries(c){delete c.powerRecoveriesUsed;}
