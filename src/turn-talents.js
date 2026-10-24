import {resolveEquipment} from './equipment.js';
import {fullAttackGrip} from './full-attacks.js';
import {ambiguityValue} from './house-rules.js';
import {activeLightsabers} from './power-activation.js';
import {conditionalDefenseLabel} from './defensive-combat.js';

// Lightsaber Defense counts ignited Lightsabers; other records name one wielded weapon.
export function turnTalentWeapons(c,pack,rule){return rule.weaponGroup==='lightsabers'?activeLightsabers(c,pack):c.inventory.filter(e=>e.equipped&&e.carried!==false&&e.id===rule.weaponId);}
export function lightsaberDefenseBonus(c,pack,ctx,base,id){
 const rule=pack.rules.lightsaberDefenseStyle;if(!base||!rule||rule.turnTalentId!==id||!ctx.talents.some(t=>t.id===rule.talentId&&!ctx.inactiveTalents.has(t.id)))return base;
 const weapons=activeLightsabers(c,pack);if(weapons.length!==rule.weaponCount||!fullAttackGrip(resolveEquipment(weapons[0],pack,c),weapons[0],pack,ctx.size).oneHanded)return base;
 return base+Math.min(rule.amount,Math.max(0,rule.maximum-base));
}

export function validateTurnTalents(c,pack,bad){
 if(c.turnTalents===undefined)return;
 const rows=c.turnTalents;
 if(!Array.isArray(rows)||rows.length>(pack.rules.turnTalentActions||[]).length||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='amount,id'||!pack.rules.turnTalentActions?.some(rule=>rule.id===r.id)||![1,2,3,4,6].includes(r.amount)))bad('turn talents');
}
export function activeTurnTalents(c,pack,ctx){
 const unarmed=ambiguityValue(c,pack,'ambiguity:lightsaber-defense-weapon-change')==='require-weapon'&&!activeLightsabers(c,pack).length;
 return (c.turnTalents||[]).flatMap(s=>{
  const rule=pack.rules.turnTalentActions.find(r=>r.id===s.id);
  if(!rule||unarmed&&rule.weaponGroup==='lightsabers')return [];
  if(rule.ambiguityId&&ambiguityValue(c,pack,rule.ambiguityId)==='require-weapon'&&!turnTalentWeapons(c,pack,rule).length)return [];
  const count=ctx.talents.filter(t=>t.id===rule.talentId&&!ctx.inactiveTalents.has(t.id)).length;
  const doubled=!!rule.doubleTalentId&&ctx.talents.some(t=>t.id===rule.doubleTalentId&&!ctx.inactiveTalents.has(t.id));
  const base=Math.min(s.amount,Math.min(rule.maximum,count*rule.amountPerSelection)*(doubled?2:1)),amount=lightsaberDefenseBonus(c,pack,ctx,base,rule.id);
  return amount?[{...s,amount,rule,name:pack.talents.find(t=>t.id===rule.talentId).name}]:[];
 });
}
// Awareness-conditional rows feed conditional Defenses; plain typed bonuses join the base totals.
export function turnTalentEffects(c,pack,ctx,{flatFooted,helpless}){
 return flatFooted||helpless?[]:activeTurnTalents(c,pack,ctx).filter(s=>s.rule.effect.target==='conditionalDefense').map(s=>({...s.rule.effect,amount:s.amount}));
}
export const turnTalentDefenseBonuses=(c,pack,ctx)=>activeTurnTalents(c,pack,ctx).filter(s=>s.rule.effect.target==='defenseBonus').map(s=>({...s.rule.effect,amount:s.amount}));
export const turnTalentBenefit=(rule,amount)=>'Reflex +'+amount+(rule.effect.target==='defenseBonus'?' '+rule.effect.type[0].toUpperCase()+rule.effect.type.slice(1):' ('+conditionalDefenseLabel(rule.effect)+')');
export function turnTalentPlan(c,d,pack,id){
 const rule=pack.rules.turnTalentActions?.find(r=>r.id===id),has=id=>d.ctx.talents.some(t=>t.id===id&&!d.ctx.inactiveTalents.has(t.id));
 if(!rule||!has(rule.talentId))throw new Error('Talent unavailable');
 if(d.incapacitated||d.helpless)throw new Error('Actions unavailable while helpless');
 const weapons=rule.weaponGroup||rule.weaponId?turnTalentWeapons(c,pack,rule):[];
 if((rule.weaponGroup||rule.weaponId)&&!weapons.length)throw new Error(rule.weaponGroup==='lightsabers'?'Requires an activated, wielded Lightsaber':'Requires a wielded '+pack.equipment.find(e=>e.id===rule.weaponId).name);
 const rank=d.ctx.talents.filter(t=>t.id===rule.talentId&&!d.ctx.inactiveTalents.has(t.id)).length;
 const amount=Math.min(rule.maximum,rank*rule.amountPerSelection)*(rule.doubleTalentId&&has(rule.doubleTalentId)&&weapons.length>=rule.doubleWeaponCount?2:1);
 if((c.turnTalents?.find(r=>r.id===id)?.amount||0)>=amount)throw new Error('Already active');
 return {rule,amount,bonus:lightsaberDefenseBonus(c,pack,d.ctx,amount,id)};
}
export function applyTurnTalent(c,id,amount){c.turnTalents=(c.turnTalents||[]).filter(r=>r.id!==id);c.turnTalents.push({id,amount});}
export function clearTurnTalents(c){delete c.turnTalents;}
