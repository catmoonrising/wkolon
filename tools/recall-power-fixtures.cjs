module.exports=(pack,api)=>{
 const base=require('./forceful-recovery-fixtures.cjs')(pack,api);
 function hero(){const c=base.hero();c.name='Recall Power';c.levels[0].talent={id:'talent:recall-power'};api.validateCharacter(c,pack);const d=api.derive(c,pack);if(d.issues.length)throw Error(d.issues.join('; '));return c;}
 return {hero};
};
