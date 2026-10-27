import {extraDamageDice} from './attack-techniques.js';

export const opportunityPowerRule=(pack,id)=>pack.rules.opportunityPowers?.find(r=>r.powerId===id);
export const opportunityPowerTier=(pack,id,total,dc=null)=>opportunityPowerRule(pack,id)?.thresholds.filter(t=>total>=t.dc&&(dc===null||t.dc<=dc)).length||0;
export const hasOpportunityForm=(ctx,pack)=>!!ctx.talents?.some(t=>t.id===pack.rules.opportunityPowers[0].formTalentId&&!ctx.inactiveTalents?.has(t.id));
export function validateOpportunityPowers(c,pack,bad){
 const rows=c.opportunityPowerEffects;if(rows===undefined)return;
 if(!c.actionState||!Array.isArray(rows)||rows.length>1000||new Set(rows.map(s=>s?.id)).size!==rows.length||rows.some(s=>!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join()!=='enhanced,formAllowed,id,maxTier,powerId,tier'||typeof s.id!=='string'||!/^[a-f0-9-]{36}$/.test(s.id)||!opportunityPowerRule(pack,s.powerId)||!Number.isInteger(s.maxTier)||s.maxTier<1||s.maxTier>opportunityPowerRule(pack,s.powerId).thresholds.length||!Number.isInteger(s.tier)||s.tier<1||s.tier>s.maxTier||typeof s.enhanced!=='boolean'||typeof s.formAllowed!=='boolean'))bad('opportunity power effects');
}
export function activeOpportunityPowers(c,pack){return (c.opportunityPowerEffects||[]).map(s=>({...s,rule:opportunityPowerRule(pack,s.powerId),name:pack.forcePowers.find(p=>p.id===s.powerId).name,attack:opportunityPowerRule(pack,s.powerId).thresholds[s.tier-1].attack}));}
export function finishOpportunityPower(c,pack,id,powerId,check,{enhanced=false,formAllowed=false,effectDC=null}={}){
 const rule=opportunityPowerRule(pack,powerId);
 if(!rule||!c.actionState||typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id)||!Number.isInteger(check?.total)||typeof enhanced!=='boolean'||typeof formAllowed!=='boolean')throw new Error('Invalid opportunity power result');
 const maxTier=opportunityPowerTier(pack,powerId,check.total);if(!maxTier)return null;
 if(c.opportunityPowerEffects?.some(s=>s.id===id))throw new Error('Power effect already resolved');
 if((c.opportunityPowerEffects?.length||0)>=1000)throw new Error('Too many active effects');
 if(effectDC!==null&&!rule.thresholds.some(t=>t.dc===effectDC))throw new Error('Invalid opportunity power tier');
 const row={id,powerId,maxTier,tier:opportunityPowerTier(pack,powerId,check.total,effectDC),enhanced,formAllowed};c.opportunityPowerEffects??=[];c.opportunityPowerEffects.push(row);return row;
}
export function chooseOpportunityPowerTier(c,id,tier){const row=c.opportunityPowerEffects?.find(s=>s.id===id);if(!row||!Number.isInteger(tier)||tier<1||tier>row.maxTier)throw new Error('Invalid opportunity power tier');row.tier=tier;}
export function removeOpportunityPower(c,id){if(!c.opportunityPowerEffects?.some(s=>s.id===id))throw new Error('Power effect unavailable');c.opportunityPowerEffects=c.opportunityPowerEffects.filter(s=>s.id!==id);if(!c.opportunityPowerEffects.length)delete c.opportunityPowerEffects;}
export function clearOpportunityPowers(c){delete c.opportunityPowerEffects;}
export const opportunityPowerAttackModifiers=(c,pack)=>activeOpportunityPowers(c,pack).filter(s=>s.attack).map(s=>({amount:s.attack,type:s.rule.type,name:s.name}));
export const opportunityPowerDice=(c,pack,ctx)=>hasOpportunityForm(ctx,pack)?activeOpportunityPowers(c,pack).filter(s=>s.formAllowed).reduce((n,s)=>n+s.rule.formDamageDice,0):0;
export const opportunityPowerMovement=(c,pack)=>Math.max(0,...activeOpportunityPowers(c,pack).filter(s=>s.enhanced).map(s=>s.rule.enhancement.movementSquares));
export function withOpportunityPowerDice(attack,extra){
 if(!extra)return attack;
 const add=key=>typeof attack[key]==='string'?{[key]:/^\d+d1(?!\d)/.test(attack.damage)&&/^\d+(?:[+-]|$)/.test(attack[key])?attack[key].replace(/^\d+/,n=>Number(n)+extra):extraDamageDice(attack[key],extra)}:{};
 return {...attack,...Object.assign({},...['damage','damageDisplay','rollDamageDisplay','criticalDamageDisplay','rollCriticalDamageDisplay'].map(add))};
}

export function validateOpportunityPowerResults(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){const r=opportunityPowerRule(pack,step.options?.effectPowerId);if(!r)continue;const result=step.result;if(step.action!=='power'||step.status==='queued'||typeof step.options.opportunityFormAllowed!=='boolean'||!Number.isInteger(result?.check?.total)||result.enhanceAllowed&&!opportunityPowerTier(pack,r.powerId,result.check.total,step.options.effectDC??null)||result.effectChoiceAllowed&&r.thresholds.filter(t=>t.dc<=result.check.total).length<2)bad('opportunity power result');}
}
