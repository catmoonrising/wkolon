import {activeShieldPowers,shieldMaintenancePlan,renewShieldPower} from './shield-powers.js';
import {activeResistancePowers,resistanceMaintenancePlan,renewResistancePower} from './resistance-powers.js';
export const maintainedPowers=(c,pack)=>[...activeShieldPowers(c,pack).map(s=>({...s,family:'shield'})),...activeResistancePowers(c,pack).map(s=>({...s,family:'resistance'}))];
export function powerMaintenancePlan(c,d,pack,id){
 if(c.shieldPowerEffects?.some(s=>s.id===id))return {...shieldMaintenancePlan(c,d,pack,id),family:'shield'};
 return {...resistanceMaintenancePlan(c,d,pack,id),family:'resistance'};
}
export function renewMaintainedPower(c,id,family){
 if(family==='shield')renewShieldPower(c,id);else if(family==='resistance')renewResistancePower(c,id);else throw new Error('Power maintenance unavailable');
}
