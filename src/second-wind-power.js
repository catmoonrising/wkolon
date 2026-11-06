import {restorePowerCopy} from './force-powers.js';
// Second Wind returns a suite copy without spending FP or activating the power.
export const secondWindPowers=d=>d.forcefulRecovery?d.forcePowers.filter(p=>p.spent):[];
export function secondWindPowerPlan(c,d,id){
 if(id!==undefined&&typeof id!=='string')throw new Error('Invalid recovered power');
 const powers=secondWindPowers(d);
 if(!powers.length){if(id)throw new Error('Choose a spent power');return null;}
 if(id===undefined&&powers.length===1)id=powers[0].copyId;
 const power=powers.find(p=>p.copyId===id),copy=power&&c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===id&&p.spent);
 if(!copy)throw new Error('Choose a spent power');
 return {copyId:power.copyId,name:power.name};
}
export function restoreSecondWindPower(c,d,plan){
 if(plan)restorePowerCopy(c,d,plan.copyId);
}
