export const powerEffectChoiceRule=(pack,id)=>pack.rules.offensivePowerEffects?.find(r=>r.powerId===id)||pack.rules.thresholdPowers?.find(r=>r.powerId===id)||pack.rules.opportunityPowers?.find(r=>r.powerId===id)||pack.rules.conditionPowerEffects?.find(r=>r.powerId===id);
export const powerEffectLabel=rule=>rule.kind==='wall-movement'?'Movement':rule.kind==='action-limit'?'Restriction':rule.kind==='speed-reduction'?'Speed':rule.kind==='opportunity'?'AoO':rule.kind==='damage-threshold'?'Threshold':'Damage';
export const powerEffectTierLabel=(rule,tier)=>rule.kind==='wall-movement'?(tier.speedMultiplier===0.5?'Half Speed':'Speed'+(tier.extraSquares?' +'+tier.extraSquares:'')):rule.kind==='action-limit'?(tier.action?'1 '+tier.action[0].toUpperCase()+tier.action.slice(1)+' Action':'No Actions'):rule.kind==='speed-reduction'?'-'+tier.speedReduction+' square'+(tier.speedReduction===1?'':'s'):['damage-threshold','opportunity'].includes(rule.kind)?'+'+(rule.kind==='opportunity'?tier.attack:tier.bonus)+' Force':tier.dice+'d'+rule.die;
export const validPowerEffectLimit=(pack,id,dc)=>dc===null||powerEffectChoiceRule(pack,id)?.thresholds?.some(t=>t.dc===dc)===true;
export function choosePowerEffectTier(c,pack,stepId,dc){
 const step=c.actionState?.plan.find(p=>p.id===stepId),rule=powerEffectChoiceRule(pack,step?.options.effectPowerId);
 if(step?.status!=='waiting'||!step.result?.effectChoiceAllowed||!rule?.thresholds||!validPowerEffectLimit(pack,rule.powerId,dc)||dc!==null&&dc>step.result.check.total)throw new Error('Power effect unavailable');
 step.options.effectDC=dc;
}
export function powerEffectChoice(step,pack){
 if(!step?.result?.effectChoiceAllowed)return '';const rule=powerEffectChoiceRule(pack,step.options.effectPowerId);if(!rule?.thresholds)return '';
 const rows=rule.thresholds.filter(t=>t.dc<=step.result.check.total),selected=rows.some(r=>r.dc===step.options.effectDC)?step.options.effectDC:null;
 return `<label>${powerEffectLabel(rule)}<select data-offensive-power-tier="${step.id}"><option value="" ${selected===null?'selected':''}>Highest</option>${rows.map(r=>`<option value="${r.dc}" ${selected===r.dc?'selected':''}>${powerEffectTierLabel(rule,r)}</option>`).join('')}</select></label>`;
}
