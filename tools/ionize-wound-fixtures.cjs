module.exports=(pack,api)=>({
 adept({mastery=false,shaded=false,choice='ionize'}={}){
  if(!['ionize','wound'].includes(choice))throw Error('Unknown power');const c=require('./offensive-power-fixtures.cjs')(pack,api).adept({mastery});c.name='Ionize and Wound';c.levels[0].forcePowers[0].powerId='power:ionize';c.levels[0].forcePowers[1].powerId='power:wound';c.levels[7].forcePowers[0].powerId='power:ionize';c.levels[7].talent.choice='power:'+choice;if(mastery)c.levels[8].classChoices[0].choice='power:'+choice;
  if(shaded){c.forceTraditions=[{id:'tradition:aing-tii-monk',level:1,darkSideScore:0}];c.levels[6].talent={id:'talent:many-shades-of-the-force',choice:'power:wound'};}
  api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;
 }
});
