module.exports=(pack,api)=>{
 const base=require('./recall-power-fixtures.cjs')(pack,api);
 function hero(){const c=base.hero();c.name='Renew Vision';c.levels[0].forcePowers=['farseeing','farseeing','surge'].map(id=>({id:crypto.randomUUID(),powerId:'power:'+id,spent:true}));c.levels.push({classId:'class:jedi',hpRoll:6,feats:[{id:'feat:weapon-focus',choice:'lightsabers'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:jedi',hpRoll:6,feats:[{id:'feat:improved-defenses'}],talent:{id:'talent:renew-vision'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});api.validateCharacter(c,pack);const d=api.derive(c,pack);if(d.issues.length)throw Error(d.issues.join('; '));return c;}
 return {hero};
};
