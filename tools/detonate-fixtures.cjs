module.exports=(pack,api)=>({adept({mastery=false}={}){
 const c=require('./stagger-fixtures.cjs')(pack,api).adept({mastery});c.name='Detonate';
 for(const l of c.levels){
  for(const p of l.forcePowers||[])if(p.powerId==='power:stagger')p.powerId='power:detonate';
  if(l.talent?.choice==='power:stagger')l.talent.choice='power:detonate';
  for(const choice of l.classChoices||[])if(choice.choice==='power:stagger')choice.choice='power:detonate';
 }
 api.validateCharacter(c,pack);if(api.derive(c,pack).issues.length)throw Error('Invalid Detonate fixture');return c;
}});
