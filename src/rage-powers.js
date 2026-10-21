export const ragePowerRule=(pack,id)=>pack.rules.ragePowers.find(r=>r.powerId===id);
export const hasRageTechnique=(ctx,pack)=>!!ctx.classChoices?.some(s=>s.id===pack.rules.ragePowers[0].techniqueId&&!ctx.inactiveClasses?.has(s.classId));
const uuid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
export function validateRagePowers(c,pack,bad){
 const rows=c.ragePowerEffects;if(rows===undefined)return;
 if(!Array.isArray(rows)||rows.length>1000||new Set(rows.map(s=>s?.id)).size!==rows.length||rows.some(s=>!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join()!=='enhanced,focusAllowed,id,maxTier,powerId,tier'||!uuid(s.id)||!ragePowerRule(pack,s.powerId)||!Number.isInteger(s.maxTier)||s.maxTier<1||s.maxTier>ragePowerRule(pack,s.powerId).thresholds.length||!Number.isInteger(s.tier)||s.tier<1||s.tier>s.maxTier||typeof s.enhanced!=='boolean'||typeof s.focusAllowed!=='boolean'))bad('Rage power effects');
}
export function ragePowerTier(pack,id,total){return ragePowerRule(pack,id)?.thresholds.filter(t=>total>=t.dc).length||0;}
export function finishRagePower(c,pack,id,powerId,check,{enhanced=false,focusAllowed=false}={}){
 const rule=ragePowerRule(pack,powerId);if(!rule)throw new Error('Rage power unavailable');
 if(!uuid(id)||!Number.isInteger(check.total)||typeof enhanced!=='boolean'||typeof focusAllowed!=='boolean')throw new Error('Invalid power result');
 const maxTier=ragePowerTier(pack,powerId,check.total);if(!maxTier)return null;
 if(c.ragePowerEffects?.some(s=>s.id===id))throw new Error('Power effect already resolved');
 if((c.ragePowerEffects?.length||0)>=1000)throw new Error('Too many active effects');
 const row={id,powerId,maxTier,tier:maxTier,enhanced,focusAllowed};c.ragePowerEffects??=[];c.ragePowerEffects.push(row);return row;
}
export const activeRagePowers=(c,pack)=>(c.ragePowerEffects||[]).map(s=>{const rule=ragePowerRule(pack,s.powerId);return {...s,rule,name:pack.forcePowers.find(p=>p.id===s.powerId).name,bonus:rule.thresholds[s.tier-1].bonus};});
export const ragePowerModifiers=(c,pack)=>activeRagePowers(c,pack).map(s=>({type:s.rule.type,amount:s.bonus}));
export const rageBlockedSkills=(c,pack)=>[...new Set(activeRagePowers(c,pack).filter(s=>!s.focusAllowed).flatMap(s=>s.rule.focusSkills))];
export function chooseRagePowerTier(c,id,tier){const row=c.ragePowerEffects?.find(s=>s.id===id);if(!row||!Number.isInteger(tier)||tier<1||tier>row.maxTier)throw new Error('Invalid power tier');row.tier=tier;}
export function removeRagePower(c,id){if(!c.ragePowerEffects?.some(s=>s.id===id))throw new Error('Power effect unavailable');c.ragePowerEffects=c.ragePowerEffects.filter(s=>s.id!==id);if(!c.ragePowerEffects.length)delete c.ragePowerEffects;}
export function endRagePowerTurn(c){if(!c.ragePowerEffects)return;c.ragePowerEffects=c.ragePowerEffects.filter(s=>s.enhanced);if(!c.ragePowerEffects.length)delete c.ragePowerEffects;}
export function clearRagePowers(c){delete c.ragePowerEffects;}
