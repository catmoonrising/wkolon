module.exports=(pack,api)=>{
 function scout(){const c=require('./movement-sense-fixtures.cjs')(pack,api).runner();c.name='Hidden Eyes';c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:perception'},{id:'feat:running-attack'}];c.levels[0].talent={id:'talent:hidden-eyes'};c.levels.push({classId:'class:scout',hpRoll:5,feats:[{id:'feat:skill-focus',choice:'skill:mechanics'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:scout',hpRoll:5,feats:[{id:'feat:improved-defenses'}],talent:{id:'talent:acute-senses'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;}
 return {scout};
};
