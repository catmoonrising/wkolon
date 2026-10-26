module.exports=(pack,api)=>{
 const base=require('./class-defense-fixtures.cjs')(pack,api),charlatan=require('./charlatan-fixtures.cjs')(pack,api).charlatan;
 const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
 const finish=c=>{api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;};
 function acuity(){
  const c=base.adept();c.name='Defensive Acuity and Soresu';for(const [i,t]of [[0,'block'],[2,'deflect'],[4,'defensive-acuity'],[6,'equilibrium']])c.levels[i].talent={id:'talent:'+t};
  const cls=pack.classes.find(r=>r.id==='class:jedi-knight');c.levels[7].classId=cls.id;c.levels[7].talent={id:'talent:soresu'};c.levels[7].entryDeclarations=Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true]));c.inventory=[item('lightsaber',{activated:true}),item('knife')];c.currentHP=api.derive(c,pack).hp;return finish(c);
 }
 function talisman(citadel=false){const c=base.adept(citadel?'psychic-citadel':'force-talisman',3);c.name='Dark Side Talisman';c.levels[9].talent={id:'talent:dark-side-talisman'};c.inventory=[item('knife',{talisman:citadel?undefined:'will',darkSideTalisman:'will'})];if(citadel)delete c.inventory[0].talisman;return finish(c);}
 return {acuity,talisman,charlatan};
};
