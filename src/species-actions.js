import {ambiguityValue} from './house-rules.js';
import {rollRoutine} from './combat.js';
import {evalExpr} from './dice.js';
import {recordKnockout} from './recovery.js';

export function bellowDetails(c,d,pack,extraDice=0){
 const rule=pack.species.find(s=>s.id===c.species)?.bellow;
 if(!rule)return null;
 const limited=ambiguityValue(c,pack,'ambiguity:bellow-extra-dice')==='track-limit';
 const maxExtra=limited?Math.max(0,Math.floor((5-c.condition-rule.conditionCost)/rule.extraDieCost)):null;
 const valid=Number.isSafeInteger(extraDice)&&extraDice>=0&&Number.isSafeInteger(extraDice+rule.damageDice);
 const dice=valid?rule.damageDice+extraDice:0,cost=rule.conditionCost+extraDice*rule.extraDieCost;
 return {dice,cost,maxExtra,manual:dice>500,attack:d.level+d.specialAttackPenalty,available:!d.incapacitated&&valid&&(maxExtra===null||extraDice<=maxExtra),damage:`${dice}d${rule.die}`,coneSquares:rule.coneSquares};
}
export function rollBellow(c,d,pack,extraDice=0,manualDamage=null,roller=evalExpr){
 const b=bellowDetails(c,d,pack,extraDice);
 if(!b?.available)throw new Error('Bellow unavailable');
 if(b.manual&&(!Number.isSafeInteger(manualDamage)||manualDamage<b.dice||manualDamage>b.dice*6))throw new Error(`Enter ${b.damage} damage (${b.dice}–${Math.min(Number.MAX_SAFE_INTEGER,b.dice*6)})`);
 const attack={uid:c.id,name:'Bellow',attack:b.attack,damage:b.manual?String(manualDamage):b.damage,damageDisplay:b.manual?String(manualDamage):b.damage,areaType:'burst'};
 const result=rollRoutine({name:`Bellow (${b.damage}${b.manual?'; entered damage':''})`,steps:[{attackId:c.id,count:1,attackMod:0,damageMod:0}]},[attack],pack.rules.combat,roller,'Fortitude');
 c.condition=Math.min(5,c.condition+b.cost);
 if(c.condition===5)recordKnockout(c);
 return {...result,cost:b.cost};
}
