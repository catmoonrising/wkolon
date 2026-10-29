module.exports=(pack,api)=>({adept({mastery=false}={}){
 const c=require('./force-track-fixtures.cjs')(pack,api).adept({mastery});c.name='Farseeing';
 for(const l of c.levels){for(const p of l.forcePowers||[])if(p.powerId==='power:force-track')p.powerId='power:farseeing';if(l.talent?.choice==='power:force-track')l.talent.choice='power:farseeing';for(const choice of l.classChoices||[])if(choice.choice==='power:force-track')choice.choice='power:farseeing';}
 api.validateCharacter(c,pack);if(api.derive(c,pack).issues.length)throw Error('Invalid Farseeing fixture');return c;
}});
