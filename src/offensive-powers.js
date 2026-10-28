import {validPowerEffectLimit as validOffensivePowerLimit} from './power-effect-choices.js';
export {validPowerEffectLimit as validOffensivePowerLimit,choosePowerEffectTier as chooseOffensivePowerTier,powerEffectChoice as offensivePowerChoice} from './power-effect-choices.js';
import {defenseRangeRows} from './combat.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

export const offensivePowerRule=(pack,id)=>pack.rules.offensivePowerEffects?.find(r=>r.powerId===id);
export const historicalManualPower=(pack,id,options)=>!!(pack.rules.resistancePowers?.find(r=>r.powerId===id&&r.kind==='defense')||pack.rules.mentalPowerEffects?.find(r=>r.powerId===id)||pack.rules.conditionPowerEffects?.find(r=>r.powerId===id)||pack.rules.opportunityPowers?.find(r=>r.powerId===id)||pack.rules.displacementPowers?.find(r=>r.powerId===id)||offensivePowerRule(pack,id)||pack.rules.thresholdPowers?.find(r=>r.powerId===id))&&options.effectPowerId===undefined&&options.offensivePowerSnapshot===undefined&&options.forceThrustSnapshot===undefined&&options.mentalPowerSnapshot===undefined&&options.resistForceSnapshot===undefined;
export function offensivePowerTier(pack,id,total,effectDC=null){
 const rule=offensivePowerRule(pack,id);
 if(!rule||!Number.isInteger(total))return null;
 return rule.thresholds?rule.thresholds.filter(t=>total>=t.dc&&(effectDC===null||t.dc<=effectDC)).at(-1)||null:{dice:rule.dice};
}
export function offensivePowerSnapshot(d,pack,powerId){
 const heroicLevel=[...d.ctx.classLevels].filter(([id])=>{const cls=pack.classes.find(c=>c.id===id);return cls&&(cls.classType===undefined||['heroic','prestige'].includes(cls.classType));}).reduce((n,[,level])=>n+level,0);
 return {powerId,heroicLevel};
}
const validSnapshot=(snapshot,pack)=>snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)&&Object.keys(snapshot).sort().join()==='heroicLevel,powerId'&&!!offensivePowerRule(pack,snapshot.powerId)&&Number.isInteger(snapshot.heroicLevel)&&snapshot.heroicLevel>=0&&snapshot.heroicLevel<=1000;
export function validateOffensivePowerSnapshots(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const snapshot=step.options?.offensivePowerSnapshot;
  if(step.options?.effectDC!==undefined&&step.action==='power'){const copy=c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===step.options.powerId);if(!validOffensivePowerLimit(pack,step.status==='queued'?copy?.powerId:step.options.effectPowerId??copy?.powerId,step.options.effectDC))bad('power effect tier');}
  if(step.result?.effectChoiceAllowed!==undefined&&![...(pack.rules.thresholdPowers||[]),...(pack.rules.opportunityPowers||[]),...(pack.rules.conditionPowerEffects||[])].some(r=>r.powerId===step.options?.effectPowerId)&&(!snapshot||!offensivePowerRule(pack,snapshot.powerId)?.thresholds))bad('power effect choice');
  if(snapshot===undefined){if(offensivePowerRule(pack,step.options?.effectPowerId))bad('offensive power snapshot');continue;}
  if(step.action!=='power'||step.status==='queued'||!validSnapshot(snapshot,pack)||snapshot.powerId!==step.options.effectPowerId)bad('offensive power snapshot');
 }
}
const range=r=>r.lo===null?'≤ '+r.hi:r.hi===null?'≥ '+r.lo:String(r.lo);
export function resolveOffensivePower(pack,powerId,check,{enhanced=false,snapshot,effectDC=null,roller=evalExpr}={}){
 const rule=offensivePowerRule(pack,powerId);
 if(!validOffensivePowerLimit(pack,powerId,effectDC))throw new Error('Power effect unavailable');
 if(!rule||!validSnapshot(snapshot,pack)||snapshot.powerId!==powerId||typeof enhanced!=='boolean'||!Number.isInteger(check?.total)||Math.abs(check.total)>100000)throw new Error('Invalid offensive power result');
 const tier=offensivePowerTier(pack,powerId,check.total,effectDC);
 if(!tier)return {text:'No effect',html:'',rows:[]};
 const dice=tier.dice+(enhanced?rule.enhancement.dice||0:0),flat=enhanced&&rule.enhancement.halfHeroicLevel?Math.floor(snapshot.heroicLevel/2):0,expression=dice+'d'+rule.die+(flat?'+'+flat:'');
 const roll=roller(expression);
 if(!Number.isInteger(roll?.value)||roll.value<dice+flat||roll.value>dice*rule.die+flat)throw new Error('Invalid power damage roll');
 // A Use the Force check is not a weapon attack roll. Compare the final total
 // directly; no automatic miss/hit, minimum attack-roll total, or critical.
 const total=check.total-(rule.inclusive?0:1),rows=defenseRangeRows([{total,damage:roll.value,areaType:rule.area?(rule.areaShape||'cone'):null,halfOnMiss:!!rule.halfOnMiss,naturalHit:false,naturalMiss:false,failedArea:false}]).map(r=>({...r,prone:!!rule.proneOnHit&&r.hi!==null,...(rule.pushOnHit?{pushSquares:r.hi!==null?rule.pushOnHit.squares:0}:{}),...(rule.ignited?{ignited:r.hi!==null,fireAttackBonus:r.hi!==null?check.total:null}:{}),...(rule.conditionOnHit?{conditionSteps:r.hi===null?0:rule.conditionOnHit+(enhanced?rule.enhancement.conditionSteps||0:0)}:{})}));
 const defense=rule.defense==='fortitude'?'Fortitude':'Reflex',sizeThresholds=Object.entries(rule.sizeModifiers||{}).map(([size,bonus])=>({size,bonus,maximum:check.total-bonus})),sizes=sizeThresholds.map(r=>r.size[0].toUpperCase()+r.size.slice(1)+' ≤ '+r.maximum).join(', ');
 const targetScope=enhanced&&rule.enhancement.targetScope||rule.targetScope,pushText=rule.pushOnHit?'Hit targets: push '+rule.pushOnHit.squares+' square away from you without provoking Attacks of Opportunity':'',scopeText=targetScope==='all-adjacent-enemies'?'All adjacent enemies':targetScope==='one-adjacent-target'?'One adjacent target':'';
 const ion=rule.damageType==='ion',fire=rule.damageType==='fire',signed=n=>n>=0?'+'+n:String(n),fireText=rule.ignited?'Hit targets catch Fire, Fire attack '+signed(check.total):'',selectionText=enhanced&&rule.enhancement.conditionTargets?'Choose '+rule.enhancement.conditionTargets+' hit target, CT -'+rule.enhancement.conditionSteps:'',persistent=rule.persistentDamageCondition,conditionText=persistent?'CT from this damage is persistent until DC '+persistent.dc+' Treat Injury (Surgery)':'';
 const text=rows.map(r=>defense+' '+range(r)+': '+r.damage+(ion?' Ion':fire?' Fire':'')+(rule.proneOnHit?(r.prone?', Prone':''):'')+(rule.pushOnHit&&r.pushSquares?', Push '+r.pushSquares+' square away from you':'')+(rule.conditionOnHit?', CT '+(r.conditionSteps?'-'+r.conditionSteps:0):'')+(rule.area?' (Evasion '+r.evasion+', Cover '+r.cover+')':'')).join('; ')+(scopeText?'; '+scopeText:'')+(pushText?'; '+pushText:'')+(sizes?'; Size hit limits: '+sizes:'')+(conditionText?'; '+conditionText:'')+(fireText?'; '+fireText:'')+(selectionText?'; '+selectionText:'')+'; '+expression+' = '+roll.value;
 const html=`<table class="routine-result"><thead><tr><th title="${escape(sizes?'Use the printed size adjustment; raw Fortitude hit limits: '+sizes:'Target '+defense+', including applicable modifiers')}">${defense}</th><th title="${ion?'Raw Ion damage before target DR, SR, HP halving and Ion threshold effects':fire?'Raw Fire damage before target DR, SR and immunity':'Before target DR, SR and damage-type effects'}">${ion?'Ion damage':fire?'Fire damage':rule.area?'Force damage':'Damage'}</th>${rule.conditionOnHit?'<th title="Steps caused by the power; damage-threshold effects apply separately">CT</th>':''}${rule.area?'<th>Evasion</th><th>Cover</th>':''}${rule.proneOnHit?'<th>Prone</th>':''}${rule.pushOnHit?'<th>Push</th>':''}${rule.ignited?'<th>Fire attack</th>':''}</tr></thead><tbody>${rows.map(r=>`<tr><td>${range(r)}</td><td>${r.damage}</td>${rule.conditionOnHit?`<td>${r.conditionSteps?'-'+r.conditionSteps:0}</td>`:''}${rule.area?`<td>${r.evasion}</td><td>${r.cover}</td>`:''}${rule.proneOnHit?`<td>${r.prone?'Yes':'No'}</td>`:''}${rule.pushOnHit?`<td>${r.pushSquares?r.pushSquares+' square away from you':'No'}</td>`:''}${rule.ignited?`<td>${r.ignited?signed(r.fireAttackBonus):'No'}</td>`:''}</tr>`).join('')}</tbody></table>${scopeText?`<details><summary>Targets</summary>${escape(scopeText)}</details>`:''}${pushText?`<details><summary>Movement</summary>${escape(pushText)}</details>`:''}${conditionText?`<details><summary>Condition</summary>${escape(conditionText)}</details>`:''}${fireText?`<details><summary>Fire</summary>${escape(fireText)}</details>`:''}${selectionText?`<details><summary>Condition</summary>${escape(selectionText)}</details>`:''}<details><summary>Rolls</summary>${roll.display} = ${totalHtml(roll)}</details>${sizes?`<details><summary>Size</summary><table><thead><tr><th>Size</th><th>Fortitude to hit</th></tr></thead><tbody>${sizeThresholds.map(r=>`<tr><td>${escape(r.size[0].toUpperCase()+r.size.slice(1))}</td><td>≤ ${r.maximum}</td></tr>`).join('')}</tbody></table></details>`:''}`;
 return {text,html,rows,sizeThresholds,expression,damage:roll.value,damageType:rule.damageType||'force',...(targetScope?{targetScope}:{}),...(rule.pushOnHit?{pushOnHit:{...rule.pushOnHit}}:{}),...(rule.ignited?{fireAttackBonus:check.total}:{}),...(enhanced&&rule.enhancement.conditionTargets?{selectedConditionTargets:rule.enhancement.conditionTargets,conditionSteps:rule.enhancement.conditionSteps}:{}),...(persistent?{persistentDamageCondition:{...persistent}}:{})};
}
