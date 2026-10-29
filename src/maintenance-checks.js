// Shared concentration dispatch. Preserve legacy resistance-only shapes/messages.
import {pendingResistanceChecks,resistancePendingMessage,resistancePowerRule,requireResistanceDamageChecks,recordResistanceDamageCheck,finishResistanceDamageCheck,removeResistancePower,clearResistancePowers} from './resistance-powers.js';
import {pendingOutgoingChecks,outgoingPowerRule,requireOutgoingDamageChecks,recordOutgoingDamageCheck,finishOutgoingDamageCheck,removeOutgoingPower,clearOutgoingPowers} from './outgoing-powers.js';
export const pendingMaintenanceChecks=c=>[...pendingResistanceChecks(c),...pendingOutgoingChecks(c)];
export const maintenancePendingMessage=c=>pendingOutgoingChecks(c).length?'Resolve or release power maintenance':resistancePendingMessage(c);
export function assertMaintenanceResolved(c){if(pendingMaintenanceChecks(c).length)throw new Error(maintenancePendingMessage(c));}
export const maintenanceCheckRule=(pack,id)=>outgoingPowerRule(pack,id)||resistancePowerRule(pack,id);
function outgoingFamily(c,id){
 const outgoing=c.outgoingPowerEffects?.some(r=>r.id===id);
 if(outgoing&&[...(c.resistancePowerEffects||[]),...(c.shieldPowerEffects||[])].some(r=>r.id===id))throw new Error('Ambiguous power effect');
 return outgoing;
}
export function requireMaintenanceDamageChecks(c,pack,damage){
 if(!c.outgoingPowerEffects?.length)return requireResistanceDamageChecks(c,pack,damage);
 if(!Number.isInteger(damage)||damage<0||damage>1000000000)throw new Error('Invalid maintenance damage');
 assertMaintenanceResolved(c);
 for(const row of c.outgoingPowerEffects||[])outgoingFamily(c,row.id);
 return [...requireResistanceDamageChecks(c,pack,damage),...requireOutgoingDamageChecks(c,damage)];
}
export function recordMaintenanceDamageCheck(c,id,check){if(outgoingFamily(c,id))recordOutgoingDamageCheck(c,id,check);else recordResistanceDamageCheck(c,id,check);}
export function finishMaintenanceDamageCheck(c,pack,id,fpBonus=0){return outgoingFamily(c,id)?finishOutgoingDamageCheck(c,pack,id,fpBonus):finishResistanceDamageCheck(c,pack,id,fpBonus);}
export function releaseMaintenancePower(c,id){if(outgoingFamily(c,id))removeOutgoingPower(c,id);else removeResistancePower(c,id);}
export function clearMaintenanceCheckPowers(c){clearOutgoingPowers(c);clearResistancePowers(c);}
