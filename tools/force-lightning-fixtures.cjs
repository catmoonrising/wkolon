module.exports=(pack,api)=>({
 adept({shaded=false,mastery=false}={}){
  const c=require('./offensive-power-fixtures.cjs')(pack,api).adept({mastery});c.name='Force Lightning';
  c.levels[0].forcePowers[1].powerId='power:force-lightning';c.levels[7].forcePowers[0].powerId='power:force-lightning';c.levels[7].talent.choice='power:force-lightning';
  if(mastery)c.levels[8].classChoices[0].choice='power:force-lightning';
  if(shaded){c.forceTraditions=[{id:'tradition:aing-tii-monk',level:1,darkSideScore:0}];c.levels[6].talent={id:'talent:many-shades-of-the-force',choice:'power:force-lightning'};}
  api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;
 }
});
