export const powerEffectChoiceRule=(pack,id)=>pack.rules.offensivePowerEffects?.find(r=>r.powerId===id)||pack.rules.thresholdPowers?.find(r=>r.powerId===id);
export const validPowerEffectLimit=(pack,id,dc)=>dc===null||powerEffectChoiceRule(pack,id)?.thresholds?.some(t=>t.dc===dc)===true;
export function choosePowerEffectTier(c,pack,stepId,dc){
 const step=c.actionState?.plan.find(p=>p.id===stepId),rule=powerEffectChoiceRule(pack,step?.options.effectPowerId);
 if(step?.status!=='waiting'||!step.result?.effectChoiceAllowed||!rule?.thresholds||!validPowerEffectLimit(pack,rule.powerId,dc)||dc!==null&&dc>step.result.check.total)throw new Error('Power effect unavailable');
 step.options.effectDC=dc;
}
export function powerEffectChoice(step,pack){
 if(!step?.result?.effectChoiceAllowed)return '';const rule=powerEffectChoiceRule(pack,step.options.effectPowerId);if(!rule?.thresholds)return '';
 const rows=rule.thresholds.filter(t=>t.dc<=step.result.check.total),selected=rows.some(r=>r.dc===step.options.effectDC)?step.options.effectDC:null,threshold=rule.kind==='damage-threshold';
 return `<label>${threshold?'Threshold':'Damage'}<select data-offensive-power-tier="${step.id}"><option value="" ${selected===null?'selected':''}>Highest</option>${rows.map(r=>`<option value="${r.dc}" ${selected===r.dc?'selected':''}>${threshold?'+'+r.bonus+' Force':r.dice+'d'+rule.die}</option>`).join('')}</select></label>`;
}
