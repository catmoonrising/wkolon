export const WEAPON_GROUPS = ['advanced-melee-weapons','heavy-weapons','lightsabers','pistols','rifles','simple-weapons'];
export const UNARMED_ID = 'attack:unarmed';
export function featureChoices(r,pack){
 if(r.choiceType==='power')return (pack.forcePowers||[]).map(p=>p.id);
 if(r.choiceType==='skill')return pack.skills.map(s=>s.id);
 const weapons=pack.equipment.filter(w=>w.kind==='weapon'&&!w.unarmed);
 if(r.choiceType==='weaponGroup')return [...(r.choiceGroups||WEAPON_GROUPS),...weapons.filter(w=>w.group.startsWith('exotic-')).map(w=>w.id)];
 if(r.choiceType==='weapon')return r.choiceScope==='exotic'?weapons.filter(w=>w.group.startsWith('exotic-')).map(w=>w.id):[UNARMED_ID,...weapons.map(w=>w.id)];
 return [null];
}
export function choiceName(value,pack){
 return value===UNARMED_ID?'Unarmed Attack':pack.skills.find(s=>s.id===value)?.name||pack.equipment.find(w=>w.id===value)?.name||pack.forcePowers?.find(w=>w.id===value)?.name||value.replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
}
