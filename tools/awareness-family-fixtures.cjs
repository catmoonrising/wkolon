module.exports=(pack,api)=>{
 const {newCharacter,derive,validateCharacter}=api;
 const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 const finish=c=>{validateCharacter(c,pack);const issues=derive(c,pack).issues;if(issues.length)throw Error(c.name+': '+issues.join('; '));return c;};
 function shasa(broader=false){
  const c=newCharacter(pack,{classId:'class:scout'});c.name='Deception Awareness';c.species='species:selkath';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:10,wis:14,cha:14};
  c.trainedSkills=['skill:use-the-force','skill:endurance','skill:initiative','skill:mechanics','skill:stealth'];c.levels[0].feats=[{id:'feat:force-sensitivity'}];c.levels[0].talent={id:'talent:acute-senses'};
  c.forceTraditions=[{id:'tradition:order-of-shasa',level:1,darkSideScore:0}];c.levels.push(row('scout'),row('scout','deception-awareness'));c.levels[1].feats=[{id:'feat:skill-focus',choice:'skill:use-the-force'}];c.levels[2].feats=[{id:'feat:strong-in-the-force'}];
  if(broader){c.levels.push(row('scout'),row('scout','force-perception'));c.levels[3].feats=[{id:'feat:skill-focus',choice:'skill:mechanics'}];c.levels[3].abilityIncreases=['dex','wis'];}
  return finish(c);
 }
 function sentinel(){
  const c=newCharacter(pack,{classId:'class:jedi'});c.name='Resist the Dark Side';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:10,wis:14,cha:14};c.trainedSkills=['skill:use-the-force','skill:perception','skill:mechanics'];
  c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:use-the-force'},{id:'feat:weapon-focus',choice:'lightsabers'}];c.levels[0].talent={id:'talent:dark-side-sense'};c.levels.push(row('jedi'),row('jedi','resist-the-dark-side'));c.levels[1].feats=[{id:'feat:weapon-finesse'}];c.levels[2].feats=[{id:'feat:strong-in-the-force'}];return finish(c);
 }
 function mercenary(){
  const c=newCharacter(pack,{classId:'class:soldier'});c.name='Ally damage';c.species='species:kel-dor';c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:12,cha:10};c.trainedSkills=['skill:endurance','skill:initiative','skill:mechanics'];c.levels[0].feats=[{id:'feat:justice-seeker'}];c.levels[0].talent={id:'talent:dirty-fighting'};
  c.levels.push(row('soldier'),row('soldier','ruthless-mercenary'),row('soldier'),row('soldier','combined-mercenary-fire'));c.levels[1].feats=[{id:'feat:weapon-focus',choice:'pistols'}];c.levels[2].feats=[{id:'feat:coordinated-attack'}];c.levels[3].feats=[{id:'feat:weapon-focus',choice:'rifles'}];c.levels[3].abilityIncreases=['str','dex'];
  c.inventory=['blaster-pistol','knife','frag-grenade'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));return finish(c);
 }
 return {shasa,sentinel,mercenary};
};
