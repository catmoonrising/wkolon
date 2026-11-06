// Whole legal builds against the unchanged catalog, including acquisition order.
module.exports=(pack,api)=>{
 const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
 const feat=(id,choice)=>({id:'feat:'+id,...(choice?{choice}:{})});
 const talent=(id,choice)=>({id:'talent:'+id,...(choice?{choice}:{})});
 const row=(cls,t=null)=>({classId:'class:'+cls,hpRoll:Math.floor(pack.classes.find(x=>x.id==='class:'+cls).hitDie/2)+1,feats:[],talent:t,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 const finish=c=>{c.currentHP=api.derive(c,pack).hp;api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(c.name+': '+issues.join('; '));return c;};
 function skills(c,force=false){
  const d=api.derive(c,pack),cls=pack.classes.find(x=>x.id===c.levels[0].classId),count=cls.trainedSkills+d.mods.int+(c.species==='species:human'?1:0);
  c.trainedSkills=[...(force?['skill:use-the-force']:[]),...cls.skills].filter((x,i,a)=>a.indexOf(x)===i).slice(0,count);
 }
 function soldier({species='human'}={}){
  const c=api.newCharacter(pack,{classId:'class:soldier'});c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:14,dex:18,con:14,int:14,wis:12,cha:12};c.name='Soldier';
  for(let i=2;i<=7;i++)c.levels.push(row('soldier'));
  c.levels[0].feats=[feat('toughness'),...(species==='human'?[feat('weapon-proficiency-advanced-melee-weapons')]:[])];c.levels[1].feats=[feat('weapon-focus','simple-weapons')];c.levels[2].feats=[feat('melee-defense')];c.levels[3].feats=[feat('rapid-strike')];c.levels[5].feats=[feat('weapon-finesse'),feat('double-attack','simple-weapons')];
  c.levels[0].talent=talent('hammerblow');c.levels[2].talent=talent('devastating-attack','simple-weapons');c.levels[4].talent=talent('weapon-specialization','simple-weapons');c.levels[6].talent=talent('tough-as-nails');c.levels[3].abilityIncreases=['str','dex'];skills(c);return c;
 }
 function extend(c,cls,talents){
  for(let n=1;n<=2*talents.length-1;n++){
   const r=row(cls,n%2===1?talent(talents[(n-1)/2]):null),level=c.levels.length+1;
   if(level%4===0)r.abilityIncreases=['str','dex'];
   if(level%3===0)r.feats=[feat(level===9?'improved-defenses':'skill-focus',level===9?undefined:'skill:initiative')];
   c.levels.push(r);
  }
  return c;
 }
 function duelist({elegance=false,selections=2}={}){
  const c=soldier();c.name=elegance?'Master of Elegance':'Advanced Melee Proficiency';c.levels[5].feats=[feat('weapon-finesse'),feat('double-attack','advanced-melee-weapons')];
  extend(c,'melee-duelist',elegance?['single-weapon-flourish-i','master-of-elegance']:Array(selections).fill('multiattack-proficiency-advanced-melee-weapons'));
  if(c.levels[8])c.levels[8].feats=[feat('double-attack','simple-weapons')];if(elegance)c.levels[7].talent.manualRequirements=true;
  c.inventory=[item('knife'),item('vibroblade'),item('force-pike',{twoHanded:true}),item('blaster-pistol',{distance:1,shotsRemaining:100})];return finish(c);
 }
 function gladiator({selections=2}={}){
  const c=soldier();c.name='Exotic Proficiency';c.levels[0].feats=[feat('weapon-proficiency-advanced-melee-weapons'),feat('exotic-weapon-proficiency','equipment:amphistaff')];c.levels[2].feats=[feat('improved-damage-threshold')];
  extend(c,'gladiator',['exotic-weapons-master',...Array(selections).fill('multiattack-proficiency-exotic-weapons')]);
  c.levels[8].feats=[feat('double-attack','equipment:amphistaff')];c.inventory=[item('amphistaff',{twoHanded:true,weaponMode:'spear'}),item('atlatl'),item('bowcaster',{twoHanded:true,distance:1}),item('vibroblade')];return finish(c);
 }
 function martial({selections=2}={}){
  const c=soldier();c.name='Flurry of Blows';c.levels[0].feats=[feat('martial-arts-i'),feat('echani-training')];c.levels[1].feats=[feat('melee-defense')];c.levels[2].feats=[feat('martial-arts-ii')];c.levels[3].feats=[feat('weapon-focus','simple-weapons')];
  extend(c,'martial-arts-master',Array(selections).fill('flurry-of-blows'));c.inventory=[item('knife')];return finish(c);
 }
 function knight(){
  const c=soldier();c.name='Knight Armor Mastery';c.levels[0].feats=[feat('force-sensitivity'),feat('toughness')];c.levels[1].feats=[feat('weapon-focus','simple-weapons')];c.levels[2].feats=[feat('weapon-proficiency-lightsabers')];c.levels[2].talent=talent('expert-grappler');c.levels[4].talent=talent('counterpunch');skills(c,true);
  extend(c,'imperial-knight',['knight-armor-mastery']);c.levels[7].talent.manualRequirements=true;const cls=pack.classes.find(x=>x.id==='class:imperial-knight');c.levels[7].entryDeclarations=Object.fromEntries(cls.entrySpecials.map(x=>[x.id,true]));
  c.inventory=[item('battle-armor'),item('lightsaber')];return finish(c);
 }
 function gunslinger({species='human'}={}){
  const c=soldier({species});c.name=species==='human'?'Concealment talents':'Wookiee Blind Shot';c.levels[0].feats=[feat('point-blank-shot'),...(species==='human'?[feat('precise-shot')]:[])];c.levels[1].feats=[feat(species==='human'?'quick-draw':'precise-shot')];c.levels[2].feats=[feat('toughness')];c.levels[3].feats=[feat(species==='human'?'weapon-focus':'quick-draw',species==='human'?'simple-weapons':undefined)];c.levels[2].talent=talent('expert-grappler');c.levels[4].talent=talent('counterpunch');
  extend(c,'gunslinger',['acute-senses','keen-shot','blind-shot']);c.inventory=[item('blaster-pistol',{distance:1,shotsRemaining:100}),item('blaster-rifle',{twoHanded:true,distance:1,shotsRemaining:50}),item('bowcaster',{twoHanded:true,distance:1}),item('knife')];return finish(c);
 }
 function hammer({species='human'}={}){
  const c=api.newCharacter(pack,{classId:'class:soldier'});c.name='Hammerblow';c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:16,dex:18,con:12,int:10,wis:10,cha:10};c.levels[0].talent=talent('hammerblow');c.levels[0].feats=[feat('weapon-finesse'),...(species==='human'?[feat('toughness')]:[])];skills(c);return finish(c);
 }
 return {duelist,gladiator,martial,knight,gunslinger,hammer,item,finish};
};
