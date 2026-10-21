import {modifierTotal} from './modifiers.js';

export const movementPowerRule=(pack,id)=>pack.rules.movementPowers.find(r=>r.powerId===id);
const uuid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
export function validateMovementPowerEffects(c,pack,bad){
 const rows=c.movementPowerEffects;if(rows===undefined)return;
 if(!Array.isArray(rows)||rows.length>1000||new Set(rows.map(s=>s?.id)).size!==rows.length||rows.some(s=>!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join()!=='destiny,enhanced,id,maxTier,powerId,tier'||!uuid(s.id)||!movementPowerRule(pack,s.powerId)||!Number.isInteger(s.maxTier)||s.maxTier<1||s.maxTier>movementPowerRule(pack,s.powerId).thresholds.length||!Number.isInteger(s.tier)||s.tier<1||s.tier>s.maxTier||typeof s.enhanced!=='boolean'||typeof s.destiny!=='boolean'))bad('movement power effects');
}
export function movementPowerTier(pack,id,total){
 const rule=movementPowerRule(pack,id);if(!rule)return 0;
 return rule.thresholds.filter(t=>total>=t.dc).length;
}
// The action transaction owns point/copy spending and calls this after its final check.
export function finishMovementPower(c,pack,id,powerId,check,{enhanced=false,destiny=false}={}){
 const rule=movementPowerRule(pack,powerId);
 if(!rule)throw new Error('Movement power unavailable');
 if(!uuid(id)||!Number.isInteger(check.total)||typeof enhanced!=='boolean'||typeof destiny!=='boolean')throw new Error('Invalid power result');
 const maxTier=movementPowerTier(pack,powerId,check.total);if(!maxTier)return null;
 if(c.movementPowerEffects?.some(s=>s.id===id))throw new Error('Power effect already resolved');
 if((c.movementPowerEffects?.length||0)>=1000)throw new Error('Too many active effects');
 const state={id,powerId,maxTier,tier:maxTier,enhanced,destiny};
 c.movementPowerEffects??=[];c.movementPowerEffects.push(state);
 return state;
}
export function activeMovementPowers(c,pack){return (c.movementPowerEffects||[]).map(s=>{
 const rule=movementPowerRule(pack,s.powerId),tier=rule.thresholds[s.tier-1];
 return {...s,name:pack.forcePowers.find(p=>p.id===s.powerId).name,rule,
  jumpBonus:tier.jumpBonus+(s.enhanced?rule.enhancement.jumpBonus:0),
  speedBonus:tier.speedBonus+(s.enhanced?rule.enhancement.speedBonus:0)+(s.destiny?rule.destiny.speedBonus:0)};
});}
export function movementPowerBonuses(c,pack){
 const rows=activeMovementPowers(c,pack);
 return {speed:modifierTotal(rows.map(s=>({amount:s.speedBonus,type:s.rule.speedType}))),
  jumpModifiers:rows.map(s=>({amount:s.jumpBonus,type:s.rule.jumpType})),
  runningStart:rows.some(s=>s.rule.runningStart),jumpWithoutCheck:rows.some(s=>s.destiny&&s.rule.destiny.jumpWithoutCheck)};
}
export function chooseMovementPowerTier(c,id,tier){
 const state=c.movementPowerEffects?.find(s=>s.id===id);
 if(!state||!Number.isInteger(tier)||tier<1||tier>state.maxTier)throw new Error('Invalid power tier');
 state.tier=tier;
}
export function removeMovementPower(c,id){
 if(!c.movementPowerEffects?.some(s=>s.id===id))throw new Error('Power effect unavailable');
 c.movementPowerEffects=c.movementPowerEffects.filter(s=>s.id!==id);if(!c.movementPowerEffects.length)delete c.movementPowerEffects;
}
export function clearMovementPowers(c){delete c.movementPowerEffects;}
