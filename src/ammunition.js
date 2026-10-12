import {clearBracing} from './attack-techniques.js';

export function ammunitionProfile(entry,pack){
 const profiles=pack.equipment.find(w=>w.id===entry.id)?.ammunitionProfiles;
 return profiles?.find(p=>p.id===(entry.ammoProfile??profiles[0].id));
}

export function ammunitionState(entry,pack,autofire=false,shotCost,{flatFooted=false}={}){
 const profile=ammunitionProfile(entry,pack);
 if(!profile)return null;
 const cost=shotCost??(autofire?pack.rules.ammunition.autofireShots:1);
 const freeReloads=profile.reloadAction==='free-action'&&!!entry.freeReloads&&!flatFooted;
 return {...profile,remaining:entry.shotsRemaining??null,cost,freeReloads,available:freeReloads||cost<=profile.capacity&&(entry.shotsRemaining===undefined||entry.shotsRemaining>=cost)};
}

export function validateAmmunition(entry,pack,bad){
 const profile=ammunitionProfile(entry,pack);
 if(entry.ammoProfile!==undefined&&(!profile||typeof entry.ammoProfile!=='string'))bad('ammunition profile');
 if(entry.shotsRemaining!==undefined&&(!profile||!Number.isInteger(entry.shotsRemaining)||entry.shotsRemaining<0||entry.shotsRemaining>profile.capacity))bad('loaded shots');
 if(entry.freeReloads!==undefined&&(profile?.reloadAction!=='free-action'||typeof entry.freeReloads!=='boolean'))bad('free reloads');
}

// Records a supplied reload. It never creates supplies, debits an assumed
// battery, or invents a conversion for partially used packs across weapons.
export function reloadWeapon(c,pack,uid){
 const entry=c.inventory.find(e=>e.uid===uid),profile=entry&&ammunitionProfile(entry,pack);
 if(!profile)throw new Error('Weapon cannot be reloaded.');
 if(profile.reloadAction==='free-action'&&c.flatFooted)throw new Error('Free Actions are unavailable while flat-footed.');
 entry.shotsRemaining=profile.capacity;
 clearBracing(c);
 for(const item of c.inventory)if(pack.equipment.find(r=>r.id===item.id)?.kind==='weapon')item.aimed=false;
 return profile;
}

export function spendAttackResources(c,result){
 // Check all references and quantities before making any change.
 const spending=(result.ammunitionSpent||[]).map(({uid,shots,reloadShots=0})=>{
  const entry=c.inventory.find(e=>e.uid===uid);
  if(!entry||!Number.isInteger(shots)||shots<0||!Number.isInteger(reloadShots)||reloadShots<0||!Number.isInteger(entry.shotsRemaining)||entry.shotsRemaining+reloadShots<shots||reloadShots&&(entry.freeReloads!==true||c.flatFooted||reloadShots!==Math.max(0,shots-entry.shotsRemaining)))throw new Error('Ammunition changed; roll again.');
  return {entry,shots,reloadShots};
 });
 for(const {entry,shots,reloadShots} of spending)entry.shotsRemaining+=reloadShots-shots;
 for(const uid of result.aimConsumed||[]){const entry=c.inventory.find(e=>e.uid===uid);if(entry)entry.aimed=false;}
 if(result.mightySwingConsumed)c.mightySwing=false;
 if(result.bracingConsumed)clearBracing(c);
 if(result.fullAttackPenalties)c.fullAttackPenalties={...result.fullAttackPenalties};
}
