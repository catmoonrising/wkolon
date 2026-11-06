module.exports=(pack,api)=>{
 const hero=(choice='reflex-will')=>{
  const c=api.newCharacter(pack,{classId:'class:soldier'});c.name='Inborn Resilience';c.species='species:zabrak';c.abilityMethod='manual';c.abilities={str:12,dex:12,con:12,int:12,wis:12,cha:12};
  c.levels[0].feats=[{id:'feat:inborn-resilience',choice}];c.levels[0].talent={id:'talent:melee-smash'};const cls=pack.classes.find(k=>k.id==='class:soldier');c.trainedSkills=cls.skills.slice(0,cls.trainedSkills+1);c.currentHP=api.derive(c,pack).hp;api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;
 };return {hero};
};
