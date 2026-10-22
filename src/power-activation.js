import {pendingResistanceChecks} from './resistance-powers.js';
import {resolveEquipment} from './equipment.js';

export function activeLightsabers(c,pack){return c.inventory.filter(e=>e.equipped&&e.carried!==false&&e.activated!==false&&resolveEquipment(e,pack,c).group==='lightsabers');}
export function powerActivationIssue(c,d,pack,power){
 if(pendingResistanceChecks(c).length)return 'Resolve or release Energy Resistance maintenance';
 if(!power||power.spent||d.incapacitated||!d.skills.find(s=>s.id==='skill:use-the-force')?.available)return 'Power unavailable';
 const rule=pack.forcePowers.find(r=>r.id===power.id);if(!rule||!powerActions(rule).includes(power.action))return 'Power action unavailable';
 if(power.descriptors.includes(pack.rules.lightsaberFormPowers.descriptor)&&!activeLightsabers(c,pack).length)return 'Requires an activated, wielded Lightsaber';
 return '';
}
export function powerActions(power){return power.actions||[power.action];}
export function setPowerAction(c,pack,id,action){
 const copy=c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===id),power=copy&&pack.forcePowers.find(p=>p.id===copy.powerId);
 if(!power||!powerActions(power).includes(action))throw new Error('Power action unavailable');
 copy.action=action;
}
