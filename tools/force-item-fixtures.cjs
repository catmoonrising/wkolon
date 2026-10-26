module.exports=(pack,api)=>{
 const base=require('./class-defense-fixtures.cjs')(pack,api);
 const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='lightsaber'?{activated:true}:{}),...extra});
 const finish=c=>{api.validateCharacter(c,pack);const issues=api.derive(c,pack).issues;if(issues.length)throw Error(issues.join('; '));return c;};
 function armed(){const c=base.adept('attune-weapon',3);c.name='Personal Force weapons';c.levels[9].talent={id:'talent:empower-weapon'};c.inventory=[item('lightsaber'),item('knife'),item('blaster-pistol')];return finish(c);}
 function talisman(){const c=base.adept('force-talisman',3);c.name='Personal talismans';c.levels[9].talent={id:'talent:greater-force-talisman'};c.inventory=[item('knife'),item('blaster-pistol')];return finish(c);}
 function citadel(){const c=base.adept('psychic-citadel',3);c.name='Citadel and talisman';c.levels[9].talent={id:'talent:force-talisman'};c.inventory=[item('knife',{talisman:'will'})];return finish(c);}
 function vahl(){const c=armed();c.forceTraditions=[{id:'tradition:ember-of-vahl',level:1,darkSideScore:0}];c.levels[0].talent={id:'talent:initiate-of-vahl'};c.levels[2].talent={id:'talent:sword-of-vahl'};return finish(c);}
 function commander(owned=true){
  const c=base.adept();c.name='Jedi Battle Commander';c.levels[0].talent={id:'talent:battle-meditation'};c.levels[2].talent={id:'talent:force-perception'};
  const cls=pack.classes.find(r=>r.id==='class:jedi-knight');c.levels[7].classId=cls.id;c.levels[7].talent={id:owned?'talent:jedi-battle-commander':'talent:force-pilot'};c.levels[7].entryDeclarations=Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true]));c.inventory=[item('lightsaber')];c.forcePoints=5;c.currentHP=api.derive(c,pack).hp;return finish(c);
 }
 return {armed,talisman,citadel,vahl,commander};
};
