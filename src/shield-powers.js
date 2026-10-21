import {actionState} from './action-economy.js';
export const shieldPowerRule=(pack,id)=>pack.rules.shieldPowers.find(r=>r.powerId===id);
export const shieldPowerTier=(pack,id,total)=>shieldPowerRule(pack,id)?.thresholds.filter(t=>total>=t.dc).length||0;
const uuid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
export const shieldPowerMaximum=(s,pack)=>shieldPowerRule(pack,s.powerId).thresholds[s.tier-1].sr+(s.enhanced?shieldPowerRule(pack,s.powerId).enhancementSR:0);
export function validateShieldPowers(c,pack,bad){
 const rows=c.shieldPowerEffects;if(rows===undefined)return;
 if(!c.actionState||!Array.isArray(rows)||rows.length>1000||new Set(rows.map(s=>s?.id)).size!==rows.length||rows.some(s=>!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join()!=='enhanced,id,maxTier,powerId,sr,tier,untilTurn,used'||!uuid(s.id)||!shieldPowerRule(pack,s.powerId)||!Number.isInteger(s.maxTier)||s.maxTier<1||s.maxTier>shieldPowerRule(pack,s.powerId).thresholds.length||!Number.isInteger(s.tier)||s.tier<1||s.tier>s.maxTier||typeof s.enhanced!=='boolean'||typeof s.used!=='boolean'||!Number.isInteger(s.sr)||s.sr<=0||s.sr>shieldPowerMaximum(s,pack)||!s.used&&s.sr!==shieldPowerMaximum(s,pack)||!Number.isInteger(s.untilTurn)||s.untilTurn<c.actionState.turn||s.untilTurn>c.actionState.turn+1))bad('shield power effects');
}
export function activeShieldPowers(c,pack){return (c.shieldPowerEffects||[]).filter(s=>s.untilTurn>actionState(c).turn).map(s=>({...s,rule:shieldPowerRule(pack,s.powerId),name:pack.forcePowers.find(p=>p.id===s.powerId).name,srMax:shieldPowerMaximum(s,pack)}));}
export function finishShieldPower(c,pack,id,powerId,check,enhanced=false){
 const rule=shieldPowerRule(pack,powerId);if(!rule||!c.actionState)throw new Error('Shield power unavailable');
 if(!uuid(id)||!Number.isInteger(check.total)||typeof enhanced!=='boolean')throw new Error('Invalid power result');
 const maxTier=shieldPowerTier(pack,powerId,check.total);if(!maxTier)return null;
 if(c.shieldPowerEffects?.some(s=>s.id===id))throw new Error('Power effect already resolved');
 if((c.shieldPowerEffects?.length||0)>=1000)throw new Error('Too many active effects');
 const row={id,powerId,maxTier,tier:maxTier,enhanced,sr:rule.thresholds[maxTier-1].sr+(enhanced?rule.enhancementSR:0),used:false,untilTurn:c.actionState.turn+1};c.shieldPowerEffects??=[];c.shieldPowerEffects.push(row);return row;
}
export function chooseShieldPowerTier(c,pack,id,tier){const row=c.shieldPowerEffects?.find(s=>s.id===id);if(!row||row.used||!Number.isInteger(tier)||tier<1||tier>row.maxTier)throw new Error('Shield effect is fixed or unavailable');row.tier=tier;row.sr=shieldPowerMaximum(row,pack);}
export function removeShieldPower(c,id){if(!c.shieldPowerEffects?.some(s=>s.id===id))throw new Error('Shield power unavailable');c.shieldPowerEffects=c.shieldPowerEffects.filter(s=>s.id!==id);if(!c.shieldPowerEffects.length)delete c.shieldPowerEffects;}
export function lockShieldPowers(c){for(const s of c.shieldPowerEffects||[])if(s.untilTurn>actionState(c).turn)s.used=true;}
export function spendShieldPower(c,id,sr){const row=c.shieldPowerEffects?.find(s=>s.id===id);if(!row||!Number.isInteger(sr)||sr<0||sr>row.sr)throw new Error('Invalid shield damage');if(!sr)removeShieldPower(c,id);else {row.sr=sr;row.used=true;}}
export function shieldMaintenancePlan(c,d,pack,id){
 const row=c.shieldPowerEffects?.find(s=>s.id===id);
 if(!row||row.untilTurn!==actionState(c).turn||d.incapacitated||d.helpless)throw new Error('Shield maintenance unavailable');
 return {row,rule:shieldPowerRule(pack,row.powerId),name:pack.forcePowers.find(p=>p.id===row.powerId).name};
}
export function renewShieldPower(c,id){const row=c.shieldPowerEffects?.find(s=>s.id===id);if(!row||row.untilTurn!==actionState(c).turn)throw new Error('Shield maintenance unavailable');row.untilTurn=actionState(c).turn+1;}
export function clearShieldPowers(c){delete c.shieldPowerEffects;}
