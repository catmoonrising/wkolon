import {clearFollowUps} from './attack-follow-ups.js';
import {ambiguityValue} from './house-rules.js';
import {rollRoutine} from './combat.js';
import {evalExpr} from './dice.js';
import {recordKnockout,recoveryState} from './recovery.js';
import {clearBracing} from './attack-techniques.js';

export function bellowDetails(c,d,pack,extraDice=0,{strong=false}={}){
 const rule=pack.species.find(s=>s.id===c.species)?.bellow;
 if(!rule)return null;
 const bonus=d.bellowBonuses||{},strongAvailable=!!bonus.conditionReduction&&!recoveryState(c).strongBellowUsed;
 const reduction=strong&&strongAvailable?bonus.conditionReduction:0,baseDice=rule.damageDice+(bonus.dice||0);
 const limited=ambiguityValue(c,pack,'ambiguity:bellow-extra-dice')==='track-limit';
 const maxExtra=limited?Math.max(0,Math.floor((5-c.condition-rule.conditionCost+reduction)/rule.extraDieCost)):null;
 const valid=typeof strong==='boolean'&&(!strong||strongAvailable)&&Number.isSafeInteger(extraDice)&&extraDice>=0&&Number.isSafeInteger(extraDice+baseDice);
 const dice=valid?baseDice+extraDice:0,cost=Math.max(0,rule.conditionCost+extraDice*rule.extraDieCost-reduction);
 return {dice,cost,maxExtra,strongAvailable,strong:!!reduction,manual:dice>500,attack:d.level+d.specialAttackPenalty,available:!d.incapacitated&&!d.defensiveCombat.attacksBlocked&&valid&&(maxExtra===null||extraDice<=maxExtra),damage:`${dice}d${rule.die}`,coneSquares:rule.coneSquares};
}
export function rollBellow(c,d,pack,extraDice=0,manualDamage=null,roller=evalExpr,options={}){
 const b=bellowDetails(c,d,pack,extraDice,options);
 if(!b?.available)throw new Error('Bellow unavailable');
 if(b.manual&&(!Number.isSafeInteger(manualDamage)||manualDamage<b.dice||manualDamage>b.dice*6))throw new Error(`Enter ${b.damage} damage (${b.dice}–${Math.min(Number.MAX_SAFE_INTEGER,b.dice*6)})`);
 const attack={uid:c.id,name:'Bellow',attack:b.attack,damage:b.manual?String(manualDamage):b.damage,damageDisplay:b.manual?String(manualDamage):b.damage,areaType:'burst'};
 const result=rollRoutine({name:`Bellow (${b.damage}${b.manual?'; entered damage':''})`,steps:[{attackId:c.id,count:1,attackMod:0,damageMod:0}]},[attack],pack.rules.combat,roller,'Fortitude');
 if(b.strong)c.recovery={...recoveryState(c),strongBellowUsed:true};
 clearFollowUps(c);delete c.routineProgress;
 c.condition=Math.min(5,c.condition+b.cost);
 clearBracing(c);
 if(c.condition===5)recordKnockout(c);
 return {...result,cost:b.cost};
}
