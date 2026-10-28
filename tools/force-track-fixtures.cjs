module.exports=(pack,api)=>({adept({mastery=false}={}){
 const c=require('./stagger-fixtures.cjs')(pack,api).adept({mastery});c.name='Force Track';
 for(const l of c.levels){
  for(const p of l.forcePowers||[])if(p.powerId==='power:stagger')p.powerId='power:force-track';
  if(l.talent?.choice==='power:stagger')l.talent.choice='power:force-track';
  for(const choice of l.classChoices||[])if(choice.choice==='power:stagger')choice.choice='power:force-track';
 }
 api.validateCharacter(c,pack);if(api.derive(c,pack).issues.length)throw Error('Invalid Force Track fixture');return c;
}});
