import {activeOutgoingPowers,outgoingMaintenancePlan} from './outgoing-powers.js';
import {activeShieldPowers,shieldMaintenancePlan,renewShieldPower} from './shield-powers.js';
import {activeResistancePowers,resistanceMaintenancePlan,renewResistancePower} from './resistance-powers.js';
export const maintainedPowers=(c,pack)=>[...activeShieldPowers(c,pack).map(s=>({...s,family:'shield'})),...activeResistancePowers(c,pack).map(s=>({...s,family:'resistance'})),...activeOutgoingPowers(c,pack).map(s=>({...s,family:'outgoing'}))];
export function powerMaintenancePlan(c,d,pack,id){
 if(c.outgoingPowerEffects?.some(s=>s.id===id))return {...outgoingMaintenancePlan(c,d,pack,id),family:'outgoing'};
 if(c.shieldPowerEffects?.some(s=>s.id===id))return {...shieldMaintenancePlan(c,d,pack,id),family:'shield'};
 return {...resistanceMaintenancePlan(c,d,pack,id),family:'resistance'};
}
export function renewMaintainedPower(c,id,family){
 if(family==='shield')renewShieldPower(c,id);else if(family==='resistance')renewResistancePower(c,id);else throw new Error('Power maintenance unavailable');
}

export const availableMaintenancePowers=(c,pack)=>[...(c.shieldPowerEffects||[]).filter(s=>s.untilTurn===c.actionState?.turn).map(s=>({...s,family:'shield',name:pack.forcePowers.find(p=>p.id===s.powerId).name})),...(c.resistancePowerEffects||[]).filter(s=>s.untilTurn===c.actionState?.turn).map(s=>({...s,family:'resistance',name:pack.forcePowers.find(p=>p.id===s.powerId).name})),...activeOutgoingPowers(c,pack).map(s=>({...s,family:'outgoing'}))];
export const nextTurnMaintainedPowers=(c,pack)=>maintainedPowers(c,pack).filter(s=>s.family!=='outgoing'||s.ended||s.endsRemaining>1);
