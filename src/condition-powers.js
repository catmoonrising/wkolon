import {validPowerEffectLimit} from './power-effect-choices.js';
import {escapeHTML as escape} from './wiki-content.js';

export const conditionPowerRule=(pack,id)=>pack.rules.conditionPowerEffects?.find(r=>r.powerId===id);
export const conditionPowerTier=(pack,id,total,effectDC=null)=>conditionPowerRule(pack,id)?.thresholds.filter(t=>total>=t.dc&&(effectDC===null||t.dc<=effectDC)).at(-1)||null;
export function validateConditionPowerResults(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const r=conditionPowerRule(pack,step.options?.effectPowerId);if(!r)continue;
  const result=step.result;
  if(step.action!=='power'||step.status==='queued'||!Number.isInteger(result?.check?.total)||result.enhanceAllowed&&!conditionPowerTier(pack,r.powerId,result.check.total,step.options.effectDC??null)||result.effectChoiceAllowed&&r.thresholds.filter(t=>t.dc<=result.check.total).length<2)bad('condition power result');
 }
}
export function resolveConditionPower(pack,id,check,{enhanced=false,effectDC=null}={}){
 const r=conditionPowerRule(pack,id);
 if(!r||!Number.isInteger(check?.total)||Math.abs(check.total)>100000||typeof enhanced!=='boolean'||!validPowerEffectLimit(pack,id,effectDC))throw new Error('Invalid condition power result');
 const tier=conditionPowerTier(pack,id,check.total,effectDC);if(!tier)return {text:'No effect',html:'',rows:[]};
 const maximum=check.total+(enhanced?r.enhancement.defensePenalty:0),rows=[{maximum,speedReduction:tier.speedReduction,heavyLoad:true},{minimum:maximum+1,speedReduction:0,heavyLoad:false}],sizeThresholds=Object.entries(r.sizeModifiers).map(([size,bonus])=>({size,maximum:maximum-bonus}));
 const skills=r.heavyLoad.skills.map(id=>pack.skills.find(s=>s.id===id).name).join(', '),text='Fortitude ≤ '+maximum+': Speed -'+tier.speedReduction+', Heavy Load until your next turn; '+skills+' '+r.heavyLoad.skillPenalty+(enhanced?'; Fortitude -'+r.enhancement.defensePenalty+' against this power':'');
 const html=`<table class="routine-result"><thead><tr><th>Fortitude</th><th>Speed</th><th>Heavy Load</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.maximum===undefined?'≥ '+row.minimum:'≤ '+row.maximum}</td><td>${row.speedReduction?'-'+row.speedReduction:'No effect'}</td><td>${row.heavyLoad?'Yes':'No'}</td></tr>`).join('')}</tbody></table><details><summary>Heavy Load</summary>${escape(skills)} ${r.heavyLoad.skillPenalty}, until the beginning of your next turn.</details><details><summary>Size</summary><table><thead><tr><th>Size</th><th>Fortitude to hit</th></tr></thead><tbody>${sizeThresholds.map(s=>`<tr><td>${escape(s.size[0].toUpperCase()+s.size.slice(1))}</td><td>≤ ${s.maximum}</td></tr>`).join('')}</tbody></table></details>`;
 return {text,html,rows,sizeThresholds,speedReduction:tier.speedReduction,duration:r.duration};
}
