import {resolveEquipment} from './equipment.js';
import {ambiguityValue} from './house-rules.js';

export const extraDamageDice=(dice,extra=0)=>dice?.replace(/^(\d+)d/,(all,n)=>(Number(n)+extra)+'d')??dice;

export function bracingState(w,entry,pack,c,technique){
 const rule=pack.rules.bracing;
 const reason=!w.autofireOnly?'Requires an autofire-only weapon':!rule.groups.includes(w.group)?'Requires Heavy Weapons, Rifles or Pistols':entry.stockPosition==='folded'?'Requires an extended stock':w.group==='pistols'&&(!w.retractableStock||entry.stockPosition==='none')?'Requires an extended retractable stock':'';
 const available=!reason,active=available&&!!entry.braced;
 const lowStrength=technique?.selected==='burst-fire'&&technique.penalty===pack.rules.attackTechniques.find(t=>t.id==='burst-fire').lowAbilityPenalty;
 const penalty=active&&!(lowStrength&&ambiguityValue(c,pack,'ambiguity:bracing-burst-fire')==='burst-penalty')?rule.penalty:null;
 return {available,active,reason,penalty};
}

export function clearBracing(c){for(const e of c.inventory)if(e.braced!==undefined)e.braced=false;}

export function declareBracing(c,pack,uid,on){
 const entry=c.inventory.find(e=>e.uid===uid);
 if(!entry||typeof on!=='boolean')throw new Error('Weapon unavailable');
 const state=bracingState(resolveEquipment(entry,pack,c),entry,pack,c);
 if(on&&(!state.available||c.condition===5||c.currentHP===0||c.recovery?.dead))throw new Error(state.reason||'Bracing unavailable');
 clearBracing(c);entry.braced=on;
 if(on)for(const e of c.inventory)if(e.aimed!==undefined)e.aimed=false;
}

export function validateBracing(c,pack,bad){
 for(const e of c.inventory)if(e.braced!==undefined&&(typeof e.braced!=='boolean'||!pack.equipment.find(w=>w.id===e.id)?.autofireOnly))bad('bracing');
 if(c.inventory.filter(e=>e.braced).length>1||c.inventory.some(e=>e.braced)&&c.inventory.some(e=>e.aimed))bad('incompatible bracing declarations');
}

export function attackTechnique(w,entry,pack,has,{proficient,scores,light}){
 const selected=entry.attackTechnique||'normal';
 const choices=pack.rules.attackTechniques.filter(t=>t.mode===w.mode||t.id===selected).flatMap(t=>{
  const owned=has(t.featId.slice(5));
  if(!owned&&t.id!==selected)return [];
  const name=pack.feats.find(f=>f.id===t.featId).name;
  const reason=!owned?`Requires ${name}`:t.mode!==w.mode?`${name} requires a ${t.mode} weapon`:!proficient?`${name} requires proficiency`:!w.damage?`${name} requires weapon damage`:t.requiresAutofire&&!w.autofire?`${name} requires autofire`:!t.requiresAutofire&&(w.areaType||w.autofireOnly)?`${name} requires a single-target attack`:'';
  return [{...t,name,available:!reason,reason,ruleId:'rule:'+t.id}];
 });
 const technique=choices.find(t=>t.id===selected);
 const available=selected==='normal'||!!technique?.available;
 const low=technique&&scores[technique.ability]<technique.minimum&&!(technique.lightException&&light);
 return {choices,selected,available,issue:available?'':technique?.reason||'Unknown attack technique',
  penalty:technique?(low?technique.lowAbilityPenalty:technique.penalty):0,
  extraDice:technique?.extraDice||0,shots:technique?.shots,
  autofire:technique?technique.requiresAutofire:!!w.autofireOnly||entry.fireMode==='autofire',
  areaType:technique?null:w.autofireOnly||entry.fireMode==='autofire'?'burst':w.areaType};
}

export function validateAttackTechnique(entry,pack,bad,unarmed=false){
 if(entry.attackTechnique===undefined)return;
 const weapon=pack.equipment.find(w=>w.id===entry.id);
 if(!['normal',...pack.rules.attackTechniques.filter(t=>!unarmed||t.mode==='melee').map(t=>t.id)].includes(entry.attackTechnique)||!unarmed&&(weapon?.kind!=='weapon'||weapon.unarmed))bad('attack technique');
}
