module.exports=(pack,api)=>({adept({mastery=false,shaded=false}={}){
 const c=require('./stagger-fixtures.cjs')(pack,api).adept({mastery});c.name='Rend';
 for(const l of c.levels){
  for(const p of l.forcePowers||[])if(p.powerId==='power:stagger')p.powerId='power:rend';
  if(l.talent?.choice==='power:stagger')l.talent.choice='power:rend';
  for(const choice of l.classChoices||[])if(choice.choice==='power:stagger')choice.choice='power:rend';
 }
 if(shaded){c.forceTraditions=[{id:'tradition:aing-tii-monk',level:1,darkSideScore:0}];c.levels[6].talent={id:'talent:many-shades-of-the-force',choice:'power:rend'};}
 api.validateCharacter(c,pack);if(api.derive(c,pack).issues.length)throw Error('Invalid Rend fixture');return c;
}});
