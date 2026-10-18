import {UNARMED_ID} from './feature-choices.js';
import {naturalAttackId} from './attack-refs.js';

export function increaseNaturalDie(damage,steps,pack){
 if(!steps)return damage==='1'?'1d1':damage;
 const match=/^(\d+)d(\d+)$/.exec(damage),count=match?Number(match[1]):1,die=match?Number(match[2]):Number(damage),order=pack.rules.unarmed.naturalDieSteps;
 const index=order.indexOf(die);
 if(index<0)throw new Error('Unsupported natural damage die');
 const next=order[Math.min(order.length-1,index+steps)];
 return next===1?String(count):`${count}d${next}`;
}
export function naturalWeapons(c,species,pack,steps=0){
 return (species.naturalWeapons||[]).map(profile=>({
  id:UNARMED_ID,uid:naturalAttackId(c.id,profile.id),name:profile.name,kind:'weapon',group:'simple-weapons',mode:'melee',size:species.size,unarmed:true,natural:true,naturalWeaponId:profile.id,
  damage:increaseNaturalDie(profile.damageBySize?.[species.size]??profile.damage,steps,pack),damageType:profile.damageType,sourceId:species.sourceId,article:species.article,
 }));
}

export function validateNaturalModifiers(c,pack,bad){
 if(c.naturalModifiers===undefined)return;
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),ids=new Set(pack.species.flatMap(s=>(s.naturalWeapons||[]).map(w=>w.id)));
 if(!object(c.naturalModifiers)||Object.keys(c.naturalModifiers).length>ids.size)bad('natural attack modifiers');
 for(const [id,v]of Object.entries(c.naturalModifiers)){
  if(!ids.has(id)||!object(v)||Object.keys(v).some(k=>!['attackMod','damageMod','attackTechnique','targetKind'].includes(k))||!['attackMod','damageMod'].every(k=>Number.isInteger(v[k])&&v[k]>=-100&&v[k]<=100)||v.attackTechnique!==undefined&&!['normal','rapid-strike'].includes(v.attackTechnique)||v.targetKind!==undefined&&!['creature','object','vehicle'].includes(v.targetKind))bad('natural attack modifiers');
 }
}
export function setNaturalModifier(c,pack,id,key,value){
 const next={...c,naturalModifiers:{...c.naturalModifiers,[id]:{attackMod:0,damageMod:0,...c.naturalModifiers?.[id],[key]:value}}};
 validateNaturalModifiers(next,pack,message=>{throw new Error('Invalid '+message);});c.naturalModifiers=next.naturalModifiers;
}
