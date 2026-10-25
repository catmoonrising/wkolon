module.exports=(pack,newCharacter)=>{
 const row=(classId,talent,extra={})=>({classId:'class:'+classId,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});
 const items=ids=>ids.map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,...(id==='lightsaber'?{activated:true}:{}),twoHanded:false,attackMod:0,damageMod:0,distance:1}));
 const blade=newCharacter(pack,{classId:'class:jedi'});blade.name='Sentinel';blade.abilityMethod='manual';blade.abilities={str:14,dex:16,con:12,int:12,wis:12,cha:10};blade.trainedSkills=['skill:use-the-force'];blade.levels[0].talent={id:'talent:sentinel-strike'};
 blade.levels.push(row('jedi'),row('jedi','sentinel-strike'),row('scoundrel','sneak-attack',{startingFeat:{id:'feat:weapon-proficiency-pistols'}}),row('soldier','squad-superiority',{startingFeat:{id:'feat:armor-proficiency-light'}}),row('scoundrel'),row('scoundrel','opportunistic-strike'),row('scoundrel'),row('scoundrel','no-escape'));blade.inventory=items(['lightsaber','knife','blaster-pistol','frag-grenade']);
 const ship=newCharacter(pack,{classId:'class:scoundrel'});ship.name='Raider';ship.abilityMethod='manual';ship.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:12};ship.levels[0].talent={id:'talent:spacehound'};ship.levels.push(row('scoundrel'),row('scoundrel','starship-raider'));ship.inventory=items(['blaster-pistol','knife','frag-grenade']);
 return {blade,ship};
};
