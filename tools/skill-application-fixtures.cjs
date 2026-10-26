module.exports=(pack,api)=>{
 const finish=c=>{api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(c.name+': '+issues.join('; '));return c;};
 function duros(){const c=api.newCharacter(pack,{classId:'class:scoundrel'});c.name='Applications and crafting';c.species='species:duros';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:14,int:12,wis:12,cha:14};c.trainedSkills=['skill:deception','skill:mechanics','skill:pilot','skill:perception','skill:stealth','skill:use-computer'];c.levels[0].feats=[{id:'feat:veteran-spacer'}];c.levels[0].talent={id:'talent:bomb-thrower'};
 c.levels.push({classId:'class:scoundrel',hpRoll:4,feats:[{id:'feat:skill-focus',choice:'skill:mechanics'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:scoundrel',hpRoll:4,feats:[{id:'feat:master-of-disguise'}],talent:{id:'talent:knack'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});c.currentHP=api.derive(c,pack).hp;return finish(c);}
 return {duros};
};
