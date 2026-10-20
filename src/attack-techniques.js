import {clearTurnTalents} from './turn-talents.js';
import {clearFollowUps,nextCombatantTurn} from './attack-follow-ups.js';
import {resolveEquipment} from './equipment.js';
import {ambiguityValue} from './house-rules.js';

export const extraDamageDice=(dice,extra=0)=>dice?.replace(/^(\d+)d/,(all,n)=>(Number(n)+extra)+'d')??dice;

export function powerAttackState(c,pack,{bab,owned}){
 const selected=c.powerAttack||0;
 const reason=!owned?'Requires Power Attack':selected>bab?'Power Attack exceeds base attack bonus':'';
 return {owned,selected,maximum:bab,available:!reason,reason,amount:reason?0:selected};
}

export function powerAttackBonuses(w,entry,pack,speciesSize,state){
 const target=entry.targetKind||'creature',melee=w.mode==='melee';
 const size=pack.rules.weaponSizeOrder.indexOf(w.size)-pack.rules.weaponSizeOrder.indexOf(speciesSize);
 const twoHanded=!w.unarmed&&size>=0&&(size===1||entry.twoHanded);
 const penalty=melee?-state.amount:0;
 const damage=melee&&!pack.rules.powerAttack.excludedDamageTargets.includes(target)?state.amount*(twoHanded?pack.rules.powerAttack.twoHandedMultiplier:1):0;
 return {penalty,damage,target,twoHanded};
}

export function declarePowerAttack(c,d,amount){
 if(!Number.isInteger(amount)||amount<0||amount>d.bab)throw new Error('Power Attack must be from 0 to '+d.bab);
 if(amount&&(!d.powerAttack.owned||d.incapacitated))throw new Error('Power Attack unavailable');
 c.powerAttack=amount;
}

export function startNextTurn(c){
 clearTurnTalents(c);
 nextCombatantTurn(c);
 clearBracing(c);
 if(c.defenseStance!==undefined)c.defenseStance='none';
 if(c.meleeDefense!==undefined)c.meleeDefense=0;
 if(c.chargeReflexPenalty!==undefined)c.chargeReflexPenalty=0;
 if(c.chargePath?.acrobatics!==undefined)c.chargePath.acrobatics=null;
 if(c.fullAttackPenalties!==undefined)c.fullAttackPenalties={twoWeapons:0,doubleAttack:0,tripleAttack:0};
 if(c.mightySwing!==undefined)c.mightySwing=false;
 if(c.powerAttack!==undefined)c.powerAttack=0;
 if(c.flurry!==undefined)c.flurry=false;
}

export function weaponSettingIssue(w,entry,pack,autofire){
 return autofire&&w.damageEffect==='stun'&&!w.autofireOnly&&pack.rules.weaponSettings.mutuallyExclusive.includes('stun')?'Stun and Autofire cannot be combined':'';
}

export function changeWeaponSetting(entry,pack,key,value){
 const w=pack.equipment.find(w=>w.id===entry.id);
 if(!w)throw new Error('Weapon unavailable');
 if(key==='damageSetting'&&w.stunDamage&&['normal','stun'].includes(value)){
  entry.damageSetting=value;
  if(value==='stun'&&w.autofire&&!w.autofireOnly){entry.fireMode='single';if(entry.attackTechnique==='burst-fire')entry.attackTechnique='normal';}
 }else if(key==='fireMode'&&w.autofire&&!w.autofireOnly&&['single','autofire'].includes(value)){
  entry.fireMode=value;delete entry.attackTechnique;
  if(value==='autofire'&&entry.damageSetting==='stun')entry.damageSetting='normal';
 }else throw new Error('Weapon setting unavailable');
}

export function bracingState(w,entry,pack,c,technique){
 const rule=pack.rules.bracing;
 const reason=!w.autofireOnly?'Requires an autofire-only weapon':!rule.groups.includes(w.group)?'Requires Heavy Weapons, Rifles or Pistols':entry.stockPosition==='folded'?'Requires an extended stock':w.group==='pistols'&&(!w.retractableStock||entry.stockPosition==='none')?'Requires an extended retractable stock':'';
 const available=!reason,active=available&&!!entry.braced;
 const lowStrength=technique?.selected==='burst-fire'&&technique.penalty===pack.rules.attackTechniques.find(t=>t.id==='burst-fire').lowAbilityPenalty;
 const penalty=active&&!(lowStrength&&ambiguityValue(c,pack,'ambiguity:bracing-burst-fire')==='burst-penalty')?rule.penalty:null;
 return {available,active,reason,penalty};
}

export function clearAiming(c){for(const e of c.inventory)if(e.aimed!==undefined)e.aimed=false;}

export function clearBracing(c){for(const e of c.inventory)if(e.braced!==undefined)e.braced=false;}

export function declareBracing(c,pack,uid,on){
 const entry=c.inventory.find(e=>e.uid===uid);
 if(!entry||typeof on!=='boolean')throw new Error('Weapon unavailable');
 const state=bracingState(resolveEquipment(entry,pack,c),entry,pack,c);
 if(on&&(!state.available||c.condition===5||c.currentHP===0||c.recovery?.dead))throw new Error(state.reason||'Bracing unavailable');
 if(on)clearFollowUps(c);
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
  const reason=!owned?`Requires ${name}`:t.mode!==w.mode?`${name} requires a ${t.mode} weapon`:!proficient?`${name} requires proficiency`:!w.damage?`${name} requires weapon damage`:t.requiresLightOrLightsaber&&!light&&w.group!=='lightsabers'?`${name} requires a Light Melee Weapon or Lightsaber`:t.requiresAutofire&&!w.autofire?`${name} requires autofire`:t.requiresAutofire&&weaponSettingIssue(w,entry,pack,true)?weaponSettingIssue(w,entry,pack,true):!t.requiresAutofire&&(w.areaType||w.autofireOnly)?`${name} requires a single-target attack`:'';
  return [{...t,name,available:!reason,reason,ruleId:'rule:'+t.id}];
 });
 const technique=choices.find(t=>t.id===selected);
 const autofire=technique?technique.requiresAutofire:!!w.autofireOnly||entry.fireMode==='autofire';
 const settingIssue=weaponSettingIssue(w,entry,pack,autofire);
 const available=(selected==='normal'||!!technique?.available)&&!settingIssue;
 const low=technique&&scores[technique.ability]<technique.minimum&&!(technique.lightException&&light);
 return {choices,selected,available,issue:available?'':settingIssue||technique?.reason||'Unknown attack technique',
  penalty:technique?(low?technique.lowAbilityPenalty:technique.penalty):0,
  extraDice:technique?.extraDice||0,shots:technique?.shots,
  autofire,
  areaType:technique?null:w.autofireOnly||entry.fireMode==='autofire'?'burst':w.areaType};
}

export function validateAttackTechnique(entry,pack,bad,unarmed=false){
 if(entry.attackTechnique===undefined)return;
 const weapon=pack.equipment.find(w=>w.id===entry.id);
 if(weapon?.droidSystem?.appendageDamage)unarmed=true;
 if(!['normal',...pack.rules.attackTechniques.filter(t=>!unarmed||t.mode==='melee').map(t=>t.id)].includes(entry.attackTechnique)||!unarmed&&(weapon?.kind!=='weapon'||weapon.unarmed))bad('attack technique');
}
