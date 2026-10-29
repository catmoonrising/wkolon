module.exports=(pack,api)=>({adept({mastery=false}={}){
 const c=require('./stagger-fixtures.cjs')(pack,api).adept({mastery});c.name='Technometry';
 for(const l of c.levels){
  for(const p of l.forcePowers||[])if(p.powerId==='power:stagger')p.powerId='power:technometry';
  if(l.talent?.choice==='power:stagger')l.talent.choice='power:technometry';
  for(const choice of l.classChoices||[])if(choice.choice==='power:stagger')choice.choice='power:technometry';
 }
 c.inventory=[{id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,shotsRemaining:30}];
 api.validateCharacter(c,pack);if(api.derive(c,pack).issues.length)throw Error('Invalid Technometry fixture');return c;
}});
