module.exports=(pack,api)=>{
 function hero({regeneration=false}={}){
  const c=api.newCharacter(pack,{classId:'class:jedi'});c.name=regeneration?'Regenerative Forceful Recovery':'Forceful Recovery';c.species='species:'+(regeneration?'trandoshan':'human');c.abilityMethod='manual';c.abilities={str:12,dex:12,con:14,int:10,wis:14,cha:12};
  c.levels[0].feats=[{id:'feat:force-training'},...(!regeneration?[{id:'feat:forceful-recovery'}]:[])];c.levels[0].talent={id:'talent:block'};
  c.levels[0].forcePowers=['surge','surge','battle-strike'].map(id=>({id:crypto.randomUUID(),powerId:'power:'+id,spent:true}));
  c.trainedSkills=['skill:use-the-force','skill:initiative',...(!regeneration?['skill:perception']:[])];
  if(regeneration)c.levels.push({classId:'class:jedi',hpRoll:6,feats:[{id:'feat:weapon-focus',choice:'lightsabers'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:jedi',hpRoll:6,feats:[{id:'feat:forceful-recovery'}],talent:{id:'talent:deflect'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});
  if(regeneration)c.levels.push({classId:'class:jedi',hpRoll:6,feats:[{id:'feat:skill-focus',choice:'skill:use-the-force'}],talent:null,startingFeat:null,abilityIncreases:['str','wis'],trainedSkills:[]},{classId:'class:jedi',hpRoll:6,feats:[],talent:{id:'talent:force-perception'},startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:jedi',hpRoll:6,feats:[{id:'feat:regenerative-healing'},{id:'feat:combat-reflexes'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
  c.currentHP=1;api.validateCharacter(c,pack);const d=api.derive(c,pack);if(d.issues.length)throw Error(d.issues.join('; '));if(!d.forcefulRecovery)throw Error('Forceful Recovery inactive');return c;
 }
 return {hero};
};
