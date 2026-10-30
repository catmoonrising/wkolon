module.exports=(pack,api)=>({adept({mastery=false}={}){
 const c=require('./farseeing-fixtures.cjs')(pack,api).adept({mastery});c.name='Cryokinesis';
 for(const l of c.levels){for(const p of l.forcePowers||[])if(p.powerId==='power:farseeing')p.powerId='power:cryokinesis';if(l.talent?.choice==='power:farseeing')l.talent.choice='power:cryokinesis';for(const choice of l.classChoices||[])if(choice.choice==='power:farseeing')choice.choice='power:cryokinesis';}
 api.validateCharacter(c,pack);if(api.derive(c,pack).issues.length)throw Error('Invalid Cryokinesis fixture');return c;
}});
