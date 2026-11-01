module.exports=(pack,api)=>{
 const finish=c=>{api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(c.name+': '+issues.join('; '));return c;};
 const fill=(c,required)=>{c.trainedSkills=required;const need=Number(/choose (\d+) starting trained/.exec(api.derive(c,pack).issues.join(';'))?.[1]??required.length);const cls=pack.classes.find(k=>k.id===c.levels[0].classId);for(const id of cls.skills)if(c.trainedSkills.length<need&&!c.trainedSkills.includes(id)&&id!=='skill:use-the-force')c.trainedSkills=[...c.trainedSkills,id];c.trainedSkills=c.trainedSkills.slice(0,need);};
 const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
 function noble(species,feat,talentChoice,trained,classId='class:noble'){const c=api.newCharacter(pack,{classId});c.name='Force Point dice';c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:12,dex:14,con:14,int:12,wis:12,cha:14};c.levels[0].feats=feat?[{id:'feat:'+feat}]:[];c.levels[0].talent=classId==='class:noble'?{id:'talent:skill-boon',choice:talentChoice}:{id:'talent:acute-senses'};fill(c,trained);c.currentHP=api.derive(c,pack).hp;return finish(c);}
 const twilek=(boon='skill:deception')=>noble('twi-lek','imperceptible-liar',boon,['skill:deception','skill:persuasion','skill:perception','skill:gather-information']);
 const monCalamari=(boon='skill:persuasion')=>noble('mon-calamari','sharp-senses',boon,['skill:deception','skill:persuasion','skill:perception','skill:gather-information']);
 const rodian=()=>noble('rodian','master-tracker',null,['skill:survival','skill:perception'],'class:scout');
 const ithorian=()=>noble('ithorian','nature-specialist',null,['skill:knowledge-life-sciences','skill:perception'],'class:scout');
 function strong(boon='skill:persuasion'){const c=twilek(boon);const level=x=>({classId:'class:noble',hpRoll:4,talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...x});c.levels.push(level({feats:[{id:'feat:skill-focus',choice:'skill:deception'}]}),level({feats:[{id:'feat:strong-in-the-force'}],talent:{id:'talent:skill-boon',choice:'skill:perception'}}));c.currentHP=api.derive(c,pack).hp;return finish(c);}
 function weapon(species,feat,weaponId){const c=api.newCharacter(pack,{classId:'class:soldier'});c.name='Force Point attacks';c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:10,wis:12,cha:12};c.levels[0].feats=[{id:'feat:'+feat}];c.levels[0].talent={id:'talent:armored-defense'};fill(c,['skill:initiative']);c.inventory=[item(weaponId),item('blaster-pistol')];c.currentHP=api.derive(c,pack).hp;return finish(c);}
 const gungan=(w='atlatl')=>weapon('gungan','gungan-weapon-master',w);
 const wookiee=()=>weapon('wookiee','bowcaster-marksman','bowcaster');
 return {twilek,strong,monCalamari,rodian,ithorian,gungan,wookiee};
};
