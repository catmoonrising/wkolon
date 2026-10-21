import {ragePowerRule,ragePowerTier,finishRagePower,activeRagePowers,hasRageTechnique} from './rage-powers.js';
import {selfPowerRule,selfPowerTier,finishSelfPower} from './self-power-effects.js';
import {movementPowerRule,movementPowerTier,finishMovementPower,activeMovementPowers} from './movement-powers.js';
import {spendDestinyPoint} from './heroic-traits.js';
export const reviewedPowerRule=(pack,id)=>selfPowerRule(pack,id)||movementPowerRule(pack,id)||ragePowerRule(pack,id);
export const reviewedPowerTier=(pack,id,total)=>ragePowerRule(pack,id)?ragePowerTier(pack,id,total):movementPowerRule(pack,id)?movementPowerTier(pack,id,total):selfPowerTier(pack,id,total);
export function finishPowerEffect(c,d,pack,id,powerId,check,enhanced=false,destiny=false,options={}){
 if(ragePowerRule(pack,powerId)){const row=finishRagePower(c,pack,id,powerId,check,{enhanced,focusAllowed:options.focusAllowed??hasRageTechnique(d.ctx,pack)});if(!row)return 'No effect';const effect=activeRagePowers(c,pack).find(s=>s.id===id);return 'Melee attack/damage +'+effect.bonus+' Rage'+(enhanced?'; encounter':'');}
 if(!movementPowerRule(pack,powerId))return finishSelfPower(c,pack,id,powerId,check,enhanced);
 if(!movementPowerTier(pack,powerId,check.total))return 'No effect';
 if(destiny)spendDestinyPoint(c,d);
 finishMovementPower(c,pack,id,powerId,check,{enhanced,destiny});
 const effect=activeMovementPowers(c,pack).find(s=>s.id===id);
 return `Speed +${effect.speedBonus}; Jump +${effect.jumpBonus} Force${destiny?'; Destiny Point -1; Jump without check':''}`;
}
