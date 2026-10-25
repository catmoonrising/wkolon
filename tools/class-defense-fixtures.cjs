module.exports=(pack,api)=>{
 const {newCharacter,derive,validateCharacter}=api;
 const row=(name,talent=null)=>({classId:'class:'+name,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 const finish=c=>{validateCharacter(c,pack);const issues=derive(c,pack).issues;if(issues.length)throw Error(c.name+': '+issues.join('; '));return c;};
 function adept(talent='psychic-citadel',levels=1){
  const c=newCharacter(pack,{classId:'class:jedi'});c.name='Psychic Citadel';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:10,wis:14,cha:14};c.trainedSkills=['skill:use-the-force','skill:perception','skill:mechanics'];c.levels[0].feats=[{id:'feat:weapon-focus',choice:'lightsabers'},{id:'feat:skill-focus',choice:'skill:use-the-force'}];c.levels[0].talent={id:'talent:equilibrium'};
  for(let n=2;n<=7;n++)c.levels.push(row('jedi',n===3?'force-recovery':n===5?'force-focus':n===7?'force-intuition':null));
  c.levels[1].feats=[{id:'feat:weapon-finesse'}];c.levels[2].feats=[{id:'feat:force-boon'}];c.levels[3].feats=[{id:'feat:skill-focus',choice:'skill:mechanics'}];c.levels[5].feats=[{id:'feat:cunning-attack'},{id:'feat:strong-in-the-force'}];c.levels[3].abilityIncreases=['dex','wis'];
  c.levels.push(row('force-adept',talent||'force-perception'));c.levels[7].abilityIncreases=['dex','wis'];
  for(let n=2;n<=levels;n++)c.levels.push(row('force-adept',n===3?'force-treatment':null));
  if(levels>=2){c.levels[8].feats=[{id:'feat:improved-defenses'}];c.levels[8].classChoices=[{id:'classchoice:force-point-recovery'}];}
  return finish(c);
 }
 function droid(talent='defensive-electronics',levels=1){
  const c=newCharacter(pack,{classId:'class:soldier'});c.name='Defensive Electronics';c.species='species:custom-droid';
  api.chooseSpeciesOption(c,pack,'degree','degree-4');api.chooseSpeciesOption(c,pack,'size','medium');api.chooseSpeciesOption(c,pack,'language','basic');api.setGenerationMethod(c,'manual',pack);
  for(const [i,a]of api.activeAbilities(c,pack).entries()){api.setPoolScore(c,i,[14,14,14,12,10][i],pack);api.assignScore(c,a,i,pack);}
  api.prepareDroidSystems(c,pack);api.chooseDroidArm(c,pack,1,'equipment:hand');api.chooseDroidArm(c,pack,2,'equipment:hand');c.trainedSkills=['skill:use-computer','skill:mechanics','skill:endurance','skill:initiative'];c.levels[0].feats=[{id:'feat:weapon-proficiency-heavy-weapons'}];c.levels[0].talent={id:'talent:armored-defense'};c.levels.push(row('soldier'),row('soldier'));c.levels[1].feats=[{id:'feat:weapon-focus',choice:'rifles'}];c.levels[2].feats=[{id:'feat:toughness'}];c.levels[2].talent={id:'talent:weapon-specialization',choice:'rifles'};
  const cls=pack.classes.find(r=>r.id==='class:independent-droid');c.levels.push({...row('independent-droid',talent||'droid-smash'),entryDeclarations:Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true]))});c.levels[3].abilityIncreases=['str','dex'];
  for(let n=2;n<=levels;n++)c.levels.push(row('independent-droid',n===3?'enhanced-manipulation':null));
  if(levels>=3)c.levels[5].feats=[{id:'feat:improved-defenses'}];
  return finish(c);
 }
 function hunter(feat=true){
  const c=newCharacter(pack,{classId:'class:noble'});c.name='Droid Hunter';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:12,wis:10,cha:14};c.trainedSkills=['skill:deception','skill:gather-information','skill:initiative','skill:perception','skill:persuasion','skill:pilot','skill:treat-injury','skill:use-computer'];c.levels[0].feats=[{id:feat?'feat:droid-hunter':'feat:improved-defenses'},{id:'feat:skill-focus',choice:'skill:persuasion'}];c.levels[0].talent={id:'talent:bolster-ally'};
  c.inventory=['blaster-pistol','ion-pistol','blaster-rifle','knife','ion-grenade'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));return finish(c);
 }
 return {adept,droid,hunter};
};
