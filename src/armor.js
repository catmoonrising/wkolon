import {resolveEquipment} from './equipment.js';

export const ARMOR_CHECKS=['hiding','darkness','concealArmor','noncombat','magneticSoles','lifting','intimidating'];
export function validateArmorChecks(c,bad){
 if(c.armorChecks!==undefined&&(!c.armorChecks||typeof c.armorChecks!=='object'||Array.isArray(c.armorChecks)||Object.entries(c.armorChecks).some(([key,value])=>!ARMOR_CHECKS.includes(key)||typeof value!=='boolean')))bad('armor checks');
}
export function wornArmor(c,pack){return c.inventory.filter(e=>e.equipped&&e.carried!==false&&pack.equipment.find(r=>r.id===e.id)?.kind==='armor'&&!pack.equipment.find(r=>r.id===e.id)?.energyShield).map(e=>({...resolveEquipment(e,pack,c),uid:e.uid}));}
export const armorProficient=(armor,ctx)=>ctx.feats.some(f=>f.id==='feat:armor-proficiency-'+armor.category);
export function armorExclusive(candidate,other){return candidate.kind==='armor'&&other.kind==='armor'&&!!candidate.droidSystem?.builtIn===!!other.droidSystem?.builtIn&&(candidate.armorSlot||'body')==='body'&&(other.armorSlot||'body')==='body';}
export function armorSkillBonus(items,ctx,checks,id){
 const amounts=[];
 for(const item of items){
  if(!armorProficient(item,ctx))continue;
  amounts.push(item.skillBonuses?.[id]||0);
  for(const effect of item.skillEffects||[])if(effect.skillId===id&&(effect.when==='always'||checks?.[effect.when])&&(!effect.proficiency||ctx.feats.some(f=>f.id==='feat:armor-proficiency-'+effect.proficiency)))amounts.push(effect.amount);
 }
 return Math.max(0,...amounts);
}
export function armorPenalty(items,ctx,pack,checks,skills=false,extra=0){
 const raw=extra+items.reduce((sum,item)=>sum+(armorProficient(item,ctx)||skills&&item.skillPenaltyExempt?0:(ctx.unproficientArmorPenalties?.[item.category]??pack.rules.armorPenalties[item.category])),0);
 return checks?.noncombat&&items.some(item=>item.noncombatPenaltyDivisor)?Math.floor(raw/2):raw;
}
export function armorVision(species,items,ctx){
 if(species.vision==='darkvision')return species.vision;
 return species.vision==='low-light'||items.some(item=>item.vision==='low-light'&&(!item.visionProficiency||ctx.feats.some(f=>f.id==='feat:armor-proficiency-'+item.visionProficiency)))?'low-light':species.vision;
}
export function armorConditionalDefenses(items,ctx,defenses){
 const rows=new Map();
 for(const item of items)for(const effect of item.conditionalDefenses||[]){
  if(effect.type==='equipment'&&!armorProficient(item,ctx))continue;
  const key=effect.defense+'|'+effect.against+'|'+effect.type;
  const old=rows.get(key);
  if(effect.type==='untyped'&&old)old.amount+=effect.amount;
  else if(!old||effect.amount>old.amount)rows.set(key,{...effect});
 }
 return [...rows.values()].map(row=>({...row,total:defenses[row.defense]+row.amount}));
}
export function armorProtection(c,d,{energy=false,fire=false,lightsaber=false,ignoreDR=false}={}){
 if([energy,fire,lightsaber,ignoreDR].some(value=>typeof value!=='boolean'))throw new Error('Invalid armor damage declaration');
 const items=d.armorItems||[],allows=items.some(r=>r.allowsLightsaberDR);
 const protection=c.protection||{sr:0,srMax:0,dr:0,drBypass:''};
 const manual=lightsaber&&!allows?0:Math.max(protection.dr,d.classDR||0,d.speciesDR||0);
 const sources=items.filter(r=>r.armorDR&&(!lightsaber||r.armorDR.lightsaber||allows)&&(r.armorDR.damageTypes.includes('all')||energy&&r.armorDR.damageTypes.includes('energy')||fire&&r.armorDR.damageTypes.includes('fire')));
 return {...protection,dr:ignoreDR?0:Math.max(manual,...sources.map(r=>r.armorDR.amount))};
}

export function combineArmorDefenses(species,armor,defenses,equipmentBonuses={}){
 const groups=new Map();
 for(const row of [...species,...armor]){const key=row.defense+'|'+row.against;const group=groups.get(key)||{...row,types:{}};group.types[row.type]=row.type==='untyped'?(group.types[row.type]||0)+row.amount:Math.max(group.types[row.type]||0,row.amount);groups.set(key,group);}
 return [...groups.values()].map(({types,...row})=>{if(types.equipment!==undefined)types.equipment=Math.max(0,types.equipment-(equipmentBonuses[row.defense]||0));const amount=Object.values(types).reduce((n,v)=>n+v,0);return {...row,amount,total:defenses[row.defense]+amount};});
}

export function armorStrengthCheck(items,ctx,checks){return checks?.lifting?Math.max(0,...items.filter(item=>armorProficient(item,ctx)).map(item=>item.strengthCheckBonus||0)):0;}
export function armorCircumstance(items,checks,skill){return checks?.intimidating&&skill==='skill:persuasion'?Math.max(0,...items.map(item=>item.intimidateCircumstance||0)):0;}
