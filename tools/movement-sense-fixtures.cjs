module.exports=(pack,api)=>{
 const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
 const finish=c=>{api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(c.name+': '+issues.join('; '));return c;};
 const base=(cls,species='human')=>{
  const c=api.newCharacter(pack,{classId:'class:'+cls});c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:10,wis:14,cha:10};
  const sp=pack.species.find(r=>r.id===c.species),cl=pack.classes.find(r=>r.id==='class:'+cls),limit=Math.max(1,cl.trainedSkills+Math.floor(((10+(sp.abilityAdjustments?.int||0))-10)/2))+sp.bonusSkills;
  c.trainedSkills=(cls==='scout'?['skill:endurance','skill:initiative','skill:climb','skill:mechanics','skill:perception','skill:stealth']:['skill:endurance','skill:initiative','skill:mechanics','skill:perception']).slice(0,limit);return c;
 };
 function runner(){const c=base('scout');c.name='Fleet-Footed';c.levels[0].feats=[{id:'feat:running-attack'},{id:'feat:fleet-footed'}];c.levels[0].talent={id:'talent:acute-senses'};c.inventory=[item('blaster-pistol')];c.runningAttack={before:{squares:4},after:{squares:4}};return finish(c);}
 function agility(species='gungan'){const c=base('scout',species);c.name='Increased Agility';c.levels[0].feats=[{id:'feat:conditioning'},...(species==='human'?[{id:'feat:running-attack'}]:[])];c.levels[0].talent={id:'talent:acute-senses'};c.levels.push(row('scout'),row('scout','improved-initiative'));c.levels[1].feats=[{id:'feat:skill-focus',choice:'skill:climb'}];c.levels[2].feats=[{id:'feat:increased-agility'}];return finish(c);}
 function ewok(){const c=base('scout','ewok');c.name='Keen Scent';c.levels[0].feats=[{id:'feat:keen-scent'}];c.levels[0].talent={id:'talent:acute-senses'};return finish(c);}
 function veteran(wis=14){const c=base('soldier');c.name='Reckless';c.abilities.wis=wis;c.levels[0].feats=[{id:'feat:powerful-charge'},{id:'feat:weapon-proficiency-advanced-melee-weapons'}];c.levels[0].talent={id:'talent:tested-in-battle'};c.levels.push(row('soldier'),row('soldier','reckless'));c.levels[1].feats=[{id:'feat:weapon-focus',choice:'advanced-melee-weapons'}];c.levels[2].feats=[{id:'feat:improved-defenses'}];c.inventory=[item('vibroblade')];c.chargePath={squares:4};return finish(c);}
 return {runner,agility,ewok,veteran};
};
