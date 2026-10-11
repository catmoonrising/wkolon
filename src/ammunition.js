export function ammunitionProfile(entry,pack){
 const profiles=pack.equipment.find(w=>w.id===entry.id)?.ammunitionProfiles;
 return profiles?.find(p=>p.id===(entry.ammoProfile??profiles[0].id));
}

export function ammunitionState(entry,pack,autofire=false){
 const profile=ammunitionProfile(entry,pack);
 if(!profile)return null;
 const cost=autofire?pack.rules.ammunition.autofireShots:1;
 return {...profile,remaining:entry.shotsRemaining??null,cost,available:entry.shotsRemaining===undefined||entry.shotsRemaining>=cost};
}

export function validateAmmunition(entry,pack,bad){
 const profile=ammunitionProfile(entry,pack);
 if(entry.ammoProfile!==undefined&&(!profile||typeof entry.ammoProfile!=='string'))bad('ammunition profile');
 if(entry.shotsRemaining!==undefined&&(!profile||!Number.isInteger(entry.shotsRemaining)||entry.shotsRemaining<0||entry.shotsRemaining>profile.capacity))bad('loaded shots');
}

// Records a supplied reload. It never creates supplies, debits an assumed
// battery, or invents a conversion for partially used packs across weapons.
export function reloadWeapon(c,pack,uid){
 const entry=c.inventory.find(e=>e.uid===uid),profile=entry&&ammunitionProfile(entry,pack);
 if(!profile)throw new Error('Weapon cannot be reloaded.');
 entry.shotsRemaining=profile.capacity;
 for(const item of c.inventory)if(pack.equipment.find(r=>r.id===item.id)?.kind==='weapon')item.aimed=false;
 return profile;
}

export function spendAttackResources(c,result){
 // Check all references and quantities before making any change.
 const spending=(result.ammunitionSpent||[]).map(({uid,shots})=>{
  const entry=c.inventory.find(e=>e.uid===uid);
  if(!entry||!Number.isInteger(shots)||shots<0||!Number.isInteger(entry.shotsRemaining)||entry.shotsRemaining<shots)throw new Error('Ammunition changed; roll again.');
  return {entry,shots};
 });
 for(const {entry,shots} of spending)entry.shotsRemaining-=shots;
 for(const uid of result.aimConsumed||[]){const entry=c.inventory.find(e=>e.uid===uid);if(entry)entry.aimed=false;}
}
