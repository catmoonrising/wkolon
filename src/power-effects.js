import {opportunityPowerRule,opportunityPowerTier,finishOpportunityPower} from './opportunity-powers.js';
import {displacementPowerRule,finishForceThrust} from './force-thrust.js';
import {thresholdPowerRule,thresholdPowerTier,finishThresholdPower} from './threshold-powers.js';
import {offensivePowerRule,offensivePowerTier,resolveOffensivePower} from './offensive-powers.js';
import {negatingPowerRule,finishNegatingPower} from './negating-powers.js';
import {balanceAfterDamage} from './balance.js';
import {derive} from './rules.js';
import {resistancePowerRule,resistancePowerTier,finishResistancePower} from './resistance-powers.js';
import {shieldPowerRule,shieldPowerTier,finishShieldPower} from './shield-powers.js';
import {ragePowerRule,ragePowerTier,finishRagePower,activeRagePowers,hasRageTechnique} from './rage-powers.js';
import {selfPowerRule,selfPowerTier,finishSelfPower} from './self-power-effects.js';
import {movementPowerRule,movementPowerTier,finishMovementPower,activeMovementPowers} from './movement-powers.js';
import {spendDestinyPoint} from './heroic-traits.js';
export const reviewedPowerRule=(pack,id)=>opportunityPowerRule(pack,id)||displacementPowerRule(pack,id)||offensivePowerRule(pack,id)||thresholdPowerRule(pack,id)||negatingPowerRule(pack,id)||resistancePowerRule(pack,id)||selfPowerRule(pack,id)||movementPowerRule(pack,id)||ragePowerRule(pack,id)||shieldPowerRule(pack,id);
export const reviewedPowerTier=(pack,id,total)=>opportunityPowerRule(pack,id)?opportunityPowerTier(pack,id,total):displacementPowerRule(pack,id)?1:thresholdPowerRule(pack,id)?thresholdPowerTier(pack,id,total):offensivePowerRule(pack,id)?offensivePowerTier(pack,id,total):resistancePowerRule(pack,id)?resistancePowerTier(pack,id,total):shieldPowerRule(pack,id)?shieldPowerTier(pack,id,total):ragePowerRule(pack,id)?ragePowerTier(pack,id,total):movementPowerRule(pack,id)?movementPowerTier(pack,id,total):selfPowerTier(pack,id,total);
export function finishPowerEffectResult(c,d,pack,id,powerId,check,enhanced=false,destiny=false,options={}){
 if(displacementPowerRule(pack,powerId))return finishForceThrust(pack,check,options.forceThrustSnapshot,{enhanced,roller:options.roller});
 if(offensivePowerRule(pack,powerId))return resolveOffensivePower(pack,powerId,check,{enhanced,snapshot:options.offensivePowerSnapshot,effectDC:options.effectDC,roller:options.roller});
 return {text:finishPowerEffect(c,d,pack,id,powerId,check,enhanced,destiny,options)};
}
export function finishPowerEffect(c,d,pack,id,powerId,check,enhanced=false,destiny=false,options={}){
 if(opportunityPowerRule(pack,powerId)){const row=finishOpportunityPower(c,pack,id,powerId,check,{enhanced,formAllowed:options.formAllowed,effectDC:options.effectDC});return row?'AoO +'+opportunityPowerRule(pack,powerId).thresholds[row.tier-1].attack+' Force'+(row.formAllowed?'; +1 damage die':'')+(enhanced?'; Move 1 square without provoking':''):'No effect';}
 if(displacementPowerRule(pack,powerId))return finishForceThrust(pack,check,options.forceThrustSnapshot,{enhanced,roller:options.roller}).text;
 if(offensivePowerRule(pack,powerId))return resolveOffensivePower(pack,powerId,check,{enhanced,snapshot:options.offensivePowerSnapshot,effectDC:options.effectDC,roller:options.roller}).text;
 if(thresholdPowerRule(pack,powerId)){const result=finishThresholdPower(c,d,pack,powerId,check,options.incoming,{enhanced,effectDC:options.effectDC,stepId:id});if(result.damage?.balanceCheckRequired)result.text+='; '+balanceAfterDamage(c,derive(c,pack),pack,options.roller).text;return result.text;}
 if(negatingPowerRule(pack,powerId)){const result=finishNegatingPower(c,d,pack,powerId,check,options.incoming,{heal:enhanced});if(result.damage?.balanceCheckRequired)result.text+='; '+balanceAfterDamage(c,derive(c,pack),pack,options.roller).text;return result.text;}
 if(resistancePowerRule(pack,powerId)){const row=finishResistancePower(c,pack,id,powerId,check);return row?'DR '+resistancePowerRule(pack,powerId).thresholds[row.tier-1].dr:'No effect';}
 if(shieldPowerRule(pack,powerId)){const row=finishShieldPower(c,pack,id,powerId,check,enhanced);return row?'SR '+row.sr:'No effect';}
 if(ragePowerRule(pack,powerId)){const row=finishRagePower(c,pack,id,powerId,check,{enhanced,focusAllowed:options.focusAllowed??hasRageTechnique(d.ctx,pack)});if(!row)return 'No effect';const effect=activeRagePowers(c,pack).find(s=>s.id===id);return 'Melee attack/damage +'+effect.bonus+' Rage'+(enhanced?'; encounter':'');}
 if(!movementPowerRule(pack,powerId))return finishSelfPower(c,pack,id,powerId,check,enhanced);
 if(!movementPowerTier(pack,powerId,check.total))return 'No effect';
 if(destiny)spendDestinyPoint(c,d);
 finishMovementPower(c,pack,id,powerId,check,{enhanced,destiny});
 const effect=activeMovementPowers(c,pack).find(s=>s.id===id);
 return `Speed +${effect.speedBonus}; Jump +${effect.jumpBonus} Force${destiny?'; Destiny Point -1; Jump without check':''}`;
}
