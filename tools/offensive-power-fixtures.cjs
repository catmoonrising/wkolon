module.exports=(pack,api)=>{
 const finish=c=>{api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(c.name+': '+issues.join('; '));return c;};
 function adept({mastery=false}={}){const c=require('./class-defense-fixtures.cjs')(pack,api).adept();c.name='Offensive Force powers';c.levels[0].feats[0]={id:'feat:force-training'};c.levels[0].forcePowers=['force-slam','force-blast','battle-strike'].map(id=>({id:crypto.randomUUID(),powerId:'power:'+id,spent:false}));c.levels[7].forcePowers=[{id:crypto.randomUUID(),powerId:'power:force-slam',spent:false}];c.levels[7].talent={id:'talent:force-power-adept',choice:'power:force-blast'};
 if(mastery){c.levels.push({classId:'class:force-adept',hpRoll:4,feats:[{id:'feat:improved-defenses'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],classChoices:[{id:'classchoice:force-power-mastery',choice:'power:force-slam'}]});}
 c.currentHP=api.derive(c,pack).hp;return finish(c);}
 return {adept};
};
