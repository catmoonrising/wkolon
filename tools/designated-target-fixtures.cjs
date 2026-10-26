module.exports=(pack,api)=>{
 const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}),item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
 const finish=c=>{api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(c.name+': '+issues.join('; '));return c;};
 function scout(){const c=require('./movement-sense-fixtures.cjs')(pack,api).runner();c.name='Spotter';c.levels[0].talent={id:'talent:spotter'};c.inventory=[item('blaster-pistol'),item('frag-grenade')];return finish(c);}
 function droid(){const c=require('./class-defense-fixtures.cjs')(pack,api).droid('target-acquisition');c.name='Target Acquisition';c.inventory.push(item('blaster-rifle'),item('knife'),item('frag-grenade'));return finish(c);}
 function mercenary(){const c=require('./awareness-family-fixtures.cjs')(pack,api).mercenary();c.name="Mercenary's Teamwork and Swarm Attack";c.levels.push(row('soldier'),row('soldier','mercenary-s-teamwork'));c.levels[5].feats=[{id:'feat:swarm-attack'},{id:'feat:martial-arts-i'}];return finish(c);}
 function infiltrator(){
  const c=api.newCharacter(pack,{classId:'class:scout'});c.name='Knowledge is Strength';c.species='species:bothan';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:14,int:12,wis:12,cha:12};c.trainedSkills=['skill:perception','skill:stealth','skill:endurance','skill:initiative','skill:mechanics','skill:knowledge-galactic-lore'];c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:stealth'}];c.levels[0].talent={id:'talent:improved-stealth'};
  for(let n=2;n<=7;n++)c.levels.push(row('scout',n===3?'hidden-movement':n===5?'acute-senses':n===7?'improved-initiative':null));
  c.levels[1].feats=[{id:'feat:skill-focus',choice:'skill:perception'}];c.levels[2].feats=[{id:'feat:coordinated-attack'}];c.levels[3].feats=[{id:'feat:skill-focus',choice:'skill:mechanics'}];c.levels[3].abilityIncreases=['str','dex'];c.levels[5].feats=[{id:'feat:toughness'},{id:'feat:skill-focus',choice:'skill:initiative'}];c.levels.push(row('infiltrator','spynet-agent'),row('infiltrator'),row('infiltrator','knowledge-is-strength'));c.levels[7].talent.manualRequirements=true;c.levels[7].abilityIncreases=['str','dex'];c.levels[8].feats=[{id:'feat:improved-damage-threshold'}];c.inventory=[item('blaster-pistol'),item('frag-grenade')];return finish(c);
 }
 return {scout,droid,mercenary,infiltrator};
};
