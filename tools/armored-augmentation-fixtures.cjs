// Complete legal acquisition histories against the unchanged reviewed catalog.
module.exports=(pack,api)=>{
 const prior=require('./passive-weapon-fixtures.cjs')(pack,api),{item,finish}=prior;
 function knight(){
  const c=prior.knight();c.name='Armored Augmentation';c.levels[7].talent={id:'talent:armored-augmentation-i',manualRequirements:true};
  c.levels.push({classId:'class:imperial-knight',hpRoll:6,feats:[{id:'feat:improved-defenses'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],classChoices:[{id:'classchoice:cure-disease'}]});
  c.levels.push({classId:'class:imperial-knight',hpRoll:6,feats:[],talent:{id:'talent:armored-augmentation-ii',manualRequirements:true},startingFeat:null,abilityIncreases:[],trainedSkills:[]});
  return finish(c);
 }
 function vital(){
  const c=api.newCharacter(pack,{classId:'class:soldier'});c.name='Vital Encouragement';c.species='species:human';c.abilityMethod='manual';c.abilities={str:12,dex:12,con:12,int:10,wis:12,cha:12};
  c.levels[0].feats=[{id:'feat:force-sensitivity'},{id:'feat:toughness'}];c.levels[0].talent={id:'talent:vital-encouragement'};c.trainedSkills=['skill:use-the-force','skill:initiative','skill:endurance','skill:perception'];
  return finish(c);
 }
 return {knight,vital,item,finish};
};
