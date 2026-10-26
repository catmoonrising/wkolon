// Noble 7 (Influence tree for Charlatan entry) / Charlatan 3: Innocuous, then Improved Soft Cover (or Gambler).
module.exports=(pack,{newCharacter,derive,validateCharacter})=>{
 const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:4,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 function charlatan(soft=true){
  const c=newCharacter(pack,{classId:'class:noble'});c.name='Improved Soft Cover';c.abilityMethod='manual';c.abilities={str:10,dex:14,con:12,int:13,wis:10,cha:16};
  c.trainedSkills=['skill:deception','skill:persuasion','skill:gather-information','skill:perception','skill:initiative','skill:pilot','skill:use-computer','skill:knowledge-galactic-lore'];
  c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:persuasion'},{id:'feat:skill-focus',choice:'skill:deception'}];c.levels[0].talent={id:'talent:presence'};
  for(let n=2;n<=7;n++)c.levels.push(row('noble',n===3?'weaken-resolve':n===5?'demand-surrender':n===7?'fluster':null));
  c.levels[1].feats=[{id:'feat:linguist'}];c.levels[2].feats=[{id:'feat:skill-focus',choice:'skill:gather-information'}];c.levels[3].feats=[{id:'feat:weapon-proficiency-rifles'}];c.levels[3].abilityIncreases=['cha','dex'];c.levels[5].feats=[{id:'feat:skill-focus',choice:'skill:perception'},{id:'feat:weapon-proficiency-advanced-melee-weapons'}];
  c.levels.push(row('charlatan','innocuous'),row('charlatan'),row('charlatan',soft?'improved-soft-cover':'gambler'));c.levels[8].feats=[{id:'feat:skill-focus',choice:'skill:initiative'}];c.levels[7].abilityIncreases=['cha','dex'];
  validateCharacter(c,pack);const issues=derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;
 }
 return {charlatan};
};
