// Actual catalog access, including the Imperial Knight's declared membership requirement.
module.exports=function(pack,newCharacter){
 const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
 const row=(cls,talent=null,extra={})=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});
 const make=cls=>{const c=newCharacter(pack,{classId:'class:'+cls});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:12,wis:14,cha:12};return c;};
 const knight=make('jedi');knight.name="Knight's Morale";knight.trainedSkills=['skill:use-the-force','skill:initiative','skill:knowledge-galactic-lore'];knight.levels[0].feats=[{id:'feat:armor-proficiency-light'},{id:'feat:armor-proficiency-medium'}];for(let n=2;n<=7;n++)knight.levels.push(row('jedi'));const cls=pack.classes.find(c=>c.id==='class:imperial-knight');knight.levels.push(row('imperial-knight','knight-s-morale',{entryDeclarations:Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true]))}));knight.inventory=[item('lightsaber'),item('knife')];
 const cause=make('scoundrel');cause.name='For the Cause';cause.trainedSkills=['skill:acrobatics','skill:deception','skill:gather-information','skill:perception','skill:pilot'];cause.levels[0].talent={id:'talent:make-an-example'};cause.levels.push(row('scoundrel'),row('scoundrel','for-the-cause'));cause.inventory=[item('blaster-pistol'),item('knife')];
 return {knight,cause};
};
