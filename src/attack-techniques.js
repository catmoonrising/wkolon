export const extraDamageDice=(dice,extra=0)=>dice?.replace(/^(\d+)d/,(all,n)=>(Number(n)+extra)+'d')??dice;

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
