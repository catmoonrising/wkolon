import {modifierIncrease} from './modifiers.js';
import {endTurnEffects,startTurnEffects} from './effect-duration.js';

const BATTLE_STRIKE='power:battle-strike';
const strikeRows=c=>(c.selfPowerEffects||[]).filter(s=>s.powerId===BATTLE_STRIKE);
export const selfPowerRule=(pack,id)=>pack.rules.selfPowerEffects.find(r=>r.powerId===id);
export function validateSelfPowerEffects(c,pack,bad){
 if(c.selfPowerEffects===undefined)return;
 const rows=c.selfPowerEffects;
 if(!Array.isArray(rows)||rows.length>1000||new Set(rows.map(s=>s?.id)).size!==rows.length||rows.some(s=>!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join()!=='baseDice,ended,endsRemaining,enhanced,id,maxDice,powerId'||typeof s.id!=='string'||!/^[a-f0-9-]{36}$/.test(s.id)||!selfPowerRule(pack,s.powerId)||![1,2,3].includes(s.maxDice)||!Number.isInteger(s.baseDice)||s.baseDice<1||s.baseDice>s.maxDice||typeof s.enhanced!=='boolean'||![1,2].includes(s.endsRemaining)||typeof s.ended!=='boolean'))bad('self power effects');
}
export function activeSelfPowerEffects(c,pack){
 return (c.selfPowerEffects||[]).map(s=>{const rule=selfPowerRule(pack,s.powerId);return {...s,rule,name:pack.forcePowers.find(p=>p.id===s.powerId).name,dice:s.baseDice+(s.enhanced?rule.enhancementDice:0)};});
}
export function selfPowerTier(pack,powerId,total){
 const rule=selfPowerRule(pack,powerId);return rule?.thresholds.filter(t=>total>=t.dc).at(-1)?.dice||0;
}
export function finishSelfPower(c,pack,id,powerId,check,enhanced=false){
 const rule=selfPowerRule(pack,powerId);
 if(!rule)return '';
 if(!Number.isInteger(check.total)||typeof enhanced!=='boolean')throw new Error('Invalid power result');
 const dice=selfPowerTier(pack,powerId,check.total);
 if(!dice)return 'No effect';
 if(c.selfPowerEffects?.some(s=>s.id===id))throw new Error('Power effect already resolved');
 if((c.selfPowerEffects?.length||0)>=1000)throw new Error('Too many active effects');
 c.selfPowerEffects??=[];c.selfPowerEffects.push({id,powerId,maxDice:dice,baseDice:dice,enhanced,endsRemaining:2,ended:false});
 return `Attack +${rule.attackBonus} Force; +${dice+(enhanced?rule.enhancementDice:0)}d${rule.die} on hit`;
}
export function chooseSelfPowerDice(c,id,dice){
 const s=c.selfPowerEffects?.find(s=>s.id===id);
 if(!s||!Number.isInteger(dice)||dice<1||dice>s.maxDice)throw new Error('Invalid power effect');
 s.baseDice=dice;
}
export function removeSelfPowerEffect(c,id){
 if(!c.selfPowerEffects?.some(s=>s.id===id))throw new Error('Power effect unavailable');
 c.selfPowerEffects=c.selfPowerEffects.filter(s=>s.id!==id);if(!c.selfPowerEffects.length)delete c.selfPowerEffects;
}
export function battleStrike(c,pack,base=[]){
 const rows=strikeRows(c);if(!rows.length)return null;
 const rule=selfPowerRule(pack,BATTLE_STRIKE);
 return {modifier:{amount:rule.attackBonus,type:rule.type},attackBonus:modifierIncrease(base,[{amount:rule.attackBonus,type:rule.type}]),dice:rows.reduce((n,s)=>n+s.baseDice+(s.enhanced?rule.enhancementDice:0),0),die:rule.die,previous:JSON.stringify(rows)};
}
export function withBattleStrike(attack,strike){
 if(!strike)return attack;
 const extra=`+${strike.dice}d${strike.die}${attack.areaType?' (on hit)':''}`;
 function damage(row){
  const result={...row};
  for(const [key,raw]of [['damageDisplay','rollDamageDisplay'],['criticalDamageDisplay','rollCriticalDamageDisplay']])if(row[key]!==undefined){result[raw]=row[key];result[key]+=extra;}
  return result;
 }
 return {...damage(attack),attackModifierRows:[...(attack.attackModifierRows||[]),strike.modifier],battleStrike:strike,...Object.fromEntries(['unAimed','unBraced','unSwing'].filter(k=>attack[k]).map(k=>[k,damage(attack[k])]))};
}
export function checkBattleStrikeState(c,previous){if(previous!==undefined&&JSON.stringify(strikeRows(c))!==previous)throw new Error('Power effect changed; roll again');}
export function consumeBattleStrike(c){
 if(!c.selfPowerEffects)return;
 c.selfPowerEffects=c.selfPowerEffects.filter(s=>s.powerId!==BATTLE_STRIKE);if(!c.selfPowerEffects.length)delete c.selfPowerEffects;
}
export function reopenSelfPowerTurn(c){
 if(!c.selfPowerEffects?.some(s=>s.ended))return false;
 c.selfPowerEffects=c.selfPowerEffects.map(s=>({...s,ended:false}));return true;
}
export function endSelfPowerTurn(c){if(!c.selfPowerEffects)return;c.selfPowerEffects=endTurnEffects(c.selfPowerEffects);if(!c.selfPowerEffects.length)delete c.selfPowerEffects;}
export function startSelfPowerTurn(c){if(!c.selfPowerEffects)return;c.selfPowerEffects=startTurnEffects(c.selfPowerEffects);if(!c.selfPowerEffects.length)delete c.selfPowerEffects;}
export function clearSelfPowerEffects(c){delete c.selfPowerEffects;}
