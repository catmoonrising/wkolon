module.exports=(pack,api)=>{
 function droid(){const c=require('./class-defense-fixtures.cjs')(pack,api).droid('droid-smash');c.name='Droid Smash';const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});c.inventory.push(item('vibroblade'),item('force-pike'),item('force-pike',{twoHanded:true}),item('knife'),item('blaster-pistol'),item('vibro-axe'));api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;}
 return {droid};
};
