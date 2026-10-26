module.exports=(pack,api)=>{
 const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 function elite({primitive=true,basics=true}={}){
  const c=api.newCharacter(pack,{classId:'class:soldier'});c.name='Primitive martial artist';c.species='species:gamorrean';c.abilityMethod='manual';c.abilities={str:14,dex:16,con:12,int:12,wis:10,cha:10};c.trainedSkills=['skill:endurance','skill:initiative','skill:mechanics'];c.levels[0].feats=[{id:primitive?'feat:primitive-warrior':'feat:toughness'}];c.levels[0].talent={id:'talent:armored-defense'};
  for(let n=2;n<=7;n++)c.levels.push(row('soldier',n===3?'juggernaut':n===5?'second-skin':n===7?'improved-armored-defense':null));
  c.levels[1].feats=[{id:'feat:martial-arts-i'}];c.levels[2].feats=[{id:'feat:point-blank-shot'}];c.levels[3].feats=[{id:'feat:martial-arts-ii'}];c.levels[3].abilityIncreases=['str','dex'];c.levels[5].feats=[{id:'feat:improved-defenses'},{id:'feat:martial-arts-iii'}];
  c.levels.push(row('elite-trooper',basics?'ter-s-k-si-basics':'ambush-commando'));c.levels[7].abilityIncreases=['str','dex'];
  c.inventory=['club','knife','vibroblade','blaster-pistol'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));
  api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;
 }
 return {elite};
};
