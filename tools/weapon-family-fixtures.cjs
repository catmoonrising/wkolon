// Real catalog class access supplements the isolated effect-math fixtures.
module.exports=function(pack,newCharacter,{duelist=false,talents=[],feat=null}={}){
 const c=newCharacter(pack,{classId:'class:soldier'});c.name=duelist?'Melee Duelist':'Carbineer';c.abilityMethod='manual';c.abilities={str:14,dex:16,con:12,int:14,wis:10,cha:10};c.trainedSkills=['skill:endurance','skill:initiative','skill:mechanics','skill:perception','skill:pilot','skill:swim'];
 const row=(classId,talent=null)=>({classId,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 c.levels=Array.from({length:7},()=>row('class:soldier'));c.levels[0].hpRoll=null;c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:precise-shot'}];c.levels[1].feats=[{id:'feat:quick-draw'}];c.levels[2].feats=[{id:'feat:melee-defense'}];c.levels[3].feats=[{id:'feat:rapid-strike'}];c.levels[5].feats=[{id:'feat:weapon-focus',choice:'simple-weapons'},...(feat?[{id:'feat:'+feat}]:[])];c.levels[3].abilityIncreases=['str','dex'];
 for(let i=0;i<(duelist?1:5);i++){const r=row(duelist?'class:melee-duelist':'class:gunslinger',i%2===0?talents[i/2]:null);if(i===0)r.abilityIncreases=['str','dex'];if(i===4)r.abilityIncreases=['str','dex'];c.levels.push(r);}
 c.inventory=['blaster-rifle','blaster-carbine','knife'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='knife'?{}:{shotsRemaining:20,distance:1})}));return c;
};
