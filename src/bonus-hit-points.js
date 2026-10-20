import {ambiguityValue} from './house-rules.js';

export const bonusHP=c=>c.bonusHP??0;
export function validateBonusHP(c,bad){
 if(c.bonusHP!==undefined&&(!Number.isInteger(c.bonusHP)||c.bonusHP<0||c.bonusHP>100000))bad('bonus HP');
 if(c.bonusHPTrigger!==undefined){const t=c.bonusHPTrigger;if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).join()!=='classLevel'||!Number.isInteger(t.classLevel)||t.classLevel<2||t.classLevel>10)bad('bonus HP trigger');}
}
export function grantBonusHP(c,amount){
 if(!Number.isInteger(amount)||amount<1||amount>100000)throw new Error('Invalid bonus HP grant');
 const before=bonusHP(c);c.bonusHP=Math.max(before,amount);return {before,after:c.bonusHP};
}
export function clearBonusHPTrigger(c){delete c.bonusHPTrigger;}
export function clearBonusHP(c){delete c.bonusHP;clearBonusHPTrigger(c);}
export function toughAsDurasteelLevel(c,pack,ctx,armorItems=[]){
 const rule=pack.rules.bonusHitPoints.toughAsDurasteel,level=ctx.classLevels.get(rule.classId)||0;
 return level>=rule.minimumLevel&&!ctx.inactiveClasses?.has(rule.classId)&&armorItems.every(r=>r.category===rule.armorCategory)?level:0;
}
export function recordBonusHPTrigger(c,result){
 clearBonusHPTrigger(c);
 const level=Math.max(0,...(result.results||[]).filter(r=>r.bonusHPOnDamage&&!r.naturalMiss&&!r.failedArea&&r.damage>0).map(r=>r.bonusHPOnDamage));
 if(level)c.bonusHPTrigger={classLevel:level};
}
export function toughAsDurasteelGrant(c,d,pack){
 if(!c.bonusHPTrigger||d.recovery.dead)return 0;
 const rule=pack.rules.bonusHitPoints.toughAsDurasteel;
 const level=Math.min(c.bonusHPTrigger.classLevel,d.ctx.inactiveClasses?.has(rule.classId)?0:d.ctx.classLevels.get(rule.classId)||0);
 if(level<rule.minimumLevel)return 0;
 return ambiguityValue(c,pack,rule.ambiguityId)==='table'?Math.floor(level/2)*2:level;
}
export function confirmToughAsDurasteel(c,d,pack){
 const amount=toughAsDurasteelGrant(c,d,pack);
 if(!amount)throw new Error('Requires a qualifying unarmed attack that dealt damage');
 const result=grantBonusHP(c,amount);clearBonusHPTrigger(c);return {...result,amount};
}
