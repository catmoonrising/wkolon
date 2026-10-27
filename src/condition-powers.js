import {validPowerEffectLimit} from './power-effect-choices.js';
import {escapeHTML as escape} from './wiki-content.js';

export const conditionPowerRule=(pack,id)=>pack.rules.conditionPowerEffects?.find(r=>r.powerId===id);
export function conditionPowerTier(pack,id,total,effectDC=null){const rule=conditionPowerRule(pack,id);return rule?.thresholds?rule.thresholds.filter(t=>total>=t.dc&&(effectDC===null||t.dc<=effectDC)).at(-1)||null:rule?.effect||null;}
export function validateConditionPowerResults(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const r=conditionPowerRule(pack,step.options?.effectPowerId);if(!r)continue;
  const result=step.result;
  if(step.action!=='power'||step.status==='queued'||!Number.isInteger(result?.check?.total)||result.enhanceAllowed&&!conditionPowerTier(pack,r.powerId,result.check.total,step.options.effectDC??null)||result.effectChoiceAllowed&&(r.thresholds?.filter(t=>t.dc<=result.check.total).length??0)<2)bad('condition power result');
 }
}
export function resolveConditionPower(pack,id,check,{enhanced=false,effectDC=null}={}){
 const r=conditionPowerRule(pack,id);
 if(!r||!Number.isInteger(check?.total)||Math.abs(check.total)>100000||typeof enhanced!=='boolean'||!validPowerEffectLimit(pack,id,effectDC))throw new Error('Invalid condition power result');
 const tier=conditionPowerTier(pack,id,check.total,effectDC);if(!tier)return {text:'No effect',html:'',rows:[]};
 if(r.kind!=='speed-reduction'){
  const defense='Will',maximum=check.total,penalty=enhanced?r.enhancement.defensePenaltyOnHit||0:0;
  const effect=r.kind==='action-limit'?(tier.action?'Only 1 '+tier.action[0].toUpperCase()+tier.action.slice(1)+' Action on its next turn':'No Actions on its next turn'):'Attack -'+tier.attackPenalty;
  const duration=r.kind==='attack-penalty'?(enhanced?'All target attacks until the start of its next turn':'Triggering attack'):r.duration;
  const detail=r.kind==='attack-penalty'?'If the triggering attack misses, you may make the attacker reroll against another creature adjacent to the attacker, also at -'+r.missReroll.attackPenalty:'';
  const defenseText=penalty?'All target Defenses -'+penalty+' until the beginning of your next turn':'';
  const rows=[{maximum,effect,defensePenalty:penalty},{minimum:maximum+1,effect:'No effect',defensePenalty:0}];
  const text=defense+' ≤ '+maximum+': '+effect+(r.kind==='attack-penalty'?'; '+duration:'')+(defenseText?'; '+defenseText:'')+(detail?'; '+detail:'');
  const html=`<table class="routine-result"><thead><tr><th>${defense}</th><th>Effect</th>${penalty?'<th>Defenses</th>':''}</tr></thead><tbody>${rows.map(row=>`<tr><td>${row.maximum===undefined?'≥ '+row.minimum:'≤ '+row.maximum}</td><td>${escape(row.effect)}</td>${penalty?`<td>${row.defensePenalty?'-'+row.defensePenalty:'No effect'}</td>`:''}</tr>`).join('')}</tbody></table>${detail?`<details><summary>Reroll</summary>${escape(detail)}</details>`:''}<details><summary>Duration</summary>${escape(r.kind==='attack-penalty'?duration:'Target’s next turn')}${defenseText?'; '+escape(defenseText):''}</details>`;
  return {text,html,rows,duration,...(r.kind==='action-limit'?{action:tier.action,defensePenaltyOnHit:penalty,...(penalty?{defenseDuration:r.enhancement.duration}:{})}:{attackPenalty:tier.attackPenalty,missReroll:{...r.missReroll}})};
 }
 const maximum=check.total+(enhanced?r.enhancement.defensePenalty:0),rows=[{maximum,speedReduction:tier.speedReduction,heavyLoad:true},{minimum:maximum+1,speedReduction:0,heavyLoad:false}],sizeThresholds=Object.entries(r.sizeModifiers).map(([size,bonus])=>({size,maximum:maximum-bonus}));
 const skills=r.heavyLoad.skills.map(id=>pack.skills.find(s=>s.id===id).name).join(', '),text='Fortitude ≤ '+maximum+': Speed -'+tier.speedReduction+', Heavy Load until your next turn; '+skills+' '+r.heavyLoad.skillPenalty+(enhanced?'; Fortitude -'+r.enhancement.defensePenalty+' against this power':'');
 const html=`<table class="routine-result"><thead><tr><th>Fortitude</th><th>Speed</th><th>Heavy Load</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.maximum===undefined?'≥ '+row.minimum:'≤ '+row.maximum}</td><td>${row.speedReduction?'-'+row.speedReduction:'No effect'}</td><td>${row.heavyLoad?'Yes':'No'}</td></tr>`).join('')}</tbody></table><details><summary>Heavy Load</summary>${escape(skills)} ${r.heavyLoad.skillPenalty}, until the beginning of your next turn.</details><details><summary>Size</summary><table><thead><tr><th>Size</th><th>Fortitude to hit</th></tr></thead><tbody>${sizeThresholds.map(s=>`<tr><td>${escape(s.size[0].toUpperCase()+s.size.slice(1))}</td><td>≤ ${s.maximum}</td></tr>`).join('')}</tbody></table></details>`;
 return {text,html,rows,sizeThresholds,speedReduction:tier.speedReduction,duration:r.duration};
}
