import {validPowerEffectLimit} from './power-effect-choices.js';
import {escapeHTML as escape} from './wiki-content.js';

export const conditionPowerRule=(pack,id)=>pack.rules.conditionPowerEffects?.find(r=>r.powerId===id);
export function conditionPowerTier(pack,id,total,effectDC=null){const rule=conditionPowerRule(pack,id);return rule?.thresholds?rule.thresholds.filter(t=>total>=t.dc&&(effectDC===null||t.dc<=effectDC)).at(-1)||null:rule?.effect||null;}
export function validateConditionPowerResults(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  if(step.options?.technometry!==undefined){const copy=c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===step.options.powerId);try{if(step.action!=='power'||conditionPowerRule(pack,step.options.effectPowerId??copy?.powerId)?.kind!=='memory-access')throw new Error();technometrySelection(step.options.technometry);}catch{bad('Technometry selection');}}
  const snapshot=step.options?.conditionPowerSnapshot;if(snapshot!==undefined&&(step.action!=='power'||step.status==='queued'||!validConditionSnapshot(snapshot,pack)||snapshot.powerId!==step.options.effectPowerId))bad('condition power snapshot');
  const r=conditionPowerRule(pack,step.options?.effectPowerId);if(!r)continue;
  const result=step.result;
  if(['wall-movement','memory-access'].includes(r.kind)&&(snapshot?.powerId!==r.powerId||!validConditionSnapshot(snapshot,pack)))bad('condition power snapshot');
  if(step.action!=='power'||step.status==='queued'||!Number.isInteger(result?.check?.total)||result.enhanceAllowed&&!conditionPowerTier(pack,r.powerId,result.check.total,step.options.effectDC??null)||result.effectChoiceAllowed&&(r.thresholds?.filter(t=>t.dc<=result.check.total).length??0)<2)bad('condition power result');
 }
}
export function resolveConditionPower(pack,id,check,{enhanced=false,effectDC=null,snapshot,enhancementChoice}={}){
 const r=conditionPowerRule(pack,id);
 if(!r||!Number.isInteger(check?.total)||Math.abs(check.total)>100000||typeof enhanced!=='boolean'||!validPowerEffectLimit(pack,id,effectDC))throw new Error('Invalid condition power result');
 if(['wall-movement','memory-access'].includes(r.kind)&&(!validConditionSnapshot(snapshot,pack)||snapshot.powerId!==id))throw new Error('Invalid condition power snapshot');
 const choices=r.enhancement?.choices||[];if(enhanced&&choices.length?!choices.some(x=>x.id===enhancementChoice):enhancementChoice!==undefined)throw new Error('Choose an enhancement');
 const tier=conditionPowerTier(pack,id,check.total,effectDC);if(enhanced&&r.quickening)throw new Error('Power has no post-check enhancement');if(!tier)return {text:'No effect',html:'',rows:[]};
 if(r.kind==='memory-access')return resolveTechnometry(r,check.total,snapshot.selection,enhanced);
 if(r.kind==='object-transport'){
  const improvement=enhanced?r.enhancement.choices.find(x=>x.id===enhancementChoice):null,sizes=r.sizeOrder,maximumSize=sizes[Math.min(sizes.length-1,sizes.indexOf(tier.maximumSize)+(improvement?.sizeCategories||0))],size=maximumSize==='colossal-frigate'?'Colossal (Frigate)':maximumSize==='colossal-cruiser'?'Colossal (Cruiser)':maximumSize[0].toUpperCase()+maximumSize.slice(1),distance=tier.distance*(improvement?.distanceMultiplier||1);
  const target='One held or unattended object within 6 squares and Line of Sight, or one Vehicle you occupy',contents='Everything contained within the object is transported as well',text='Transport a '+size+' or smaller object up to '+distance+' squares; '+contents;
  return {text,html:`<table class="routine-result"><thead><tr><th>Maximum size</th><th>Distance</th></tr></thead><tbody><tr><td>${size}</td><td>${distance} squares</td></tr></tbody></table><details><summary>Target</summary>${escape(target)}</details><details><summary>Contents</summary>${escape(contents)}</details>`,maximumSize,distance,contentsTransported:r.contentsTransported,targetScope:r.targetScope,...(enhanced?{enhancementChoice}:{})};
 }
 if(r.kind==='energy-drain'){
  const sizes=['fine','diminutive','tiny','small','medium','large','huge','gargantuan','colossal'],maximumSize=sizes[Math.min(sizes.indexOf(r.enhancement.maximumSize),sizes.indexOf(tier.maximumSize)+(enhanced?r.enhancement.sizeCategories:0))],size=maximumSize[0].toUpperCase()+maximumSize.slice(1),generator=tier.generator;
  const effect='Drain all Energy Cells powering a '+size+' or smaller weapon or object',replacement='The object cannot be used until its Energy Cells are replaced',supply=generator?'If the object is powered by a Power Generator, drain all power from that generator instead':'Power Generators require the DC 35 effect';
  const text=effect+'; '+replacement+'; '+supply;
  return {text,html:`<table class="routine-result"><thead><tr><th>Maximum size</th><th>Effect</th></tr></thead><tbody><tr><td>${size}</td><td>Drain Energy Cells</td></tr></tbody></table><details><summary>Replacement</summary>${escape(replacement)}</details><details><summary>Power Generator</summary>${escape(supply)}</details>`,maximumSize,drainsEnergyCells:true,generator,replacementRequired:r.replacementRequired};
 }
 if(r.kind==='wall-movement'){
  const squares=Math.floor(snapshot.speed*tier.speedMultiplier)+tier.extraSquares+(enhanced?r.enhancement.extraSquares:0),text='Move up to '+squares+' squares along a wall; Fall if you are not on the ground when this movement ends';
  return {text,html:`<p>${escape(text)}</p><details><summary>Speed</summary>${snapshot.speed} squares</details>`,squares,baseSpeed:snapshot.speed,duration:r.duration,fallsWithoutGround:r.fallsWithoutGround};
 }
 if(r.kind==='vision-denial'){
  const effect='Flat-Footed, other creatures have Concealment from this target',immune='Creatures that do not rely on eyesight are immune',duration='Until the start of your next turn',rows=[{maximum:check.total,flatFooted:true,concealmentFromOtherCreatures:true},{minimum:check.total+1,flatFooted:false,concealmentFromOtherCreatures:false}];
  const text='Reflex ≤ '+check.total+': '+effect+'; '+duration+'; '+immune;
  const html=`<table class="routine-result"><thead><tr><th>Reflex</th><th>Effect</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.maximum===undefined?'≥ '+row.minimum:'≤ '+row.maximum}</td><td>${row.flatFooted?escape(effect):'No effect'}</td></tr>`).join('')}</tbody></table><details><summary>Duration</summary>${escape(duration)}</details><details><summary>Immunity</summary>${escape(immune)}</details>`;
  return {text,html,rows,duration:r.duration,immunity:r.immunity};
 }
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

function validConditionSnapshot(s,pack){
 if(!s||typeof s!=='object'||Array.isArray(s))return false;
 const kind=conditionPowerRule(pack,s.powerId)?.kind;
 if(kind==='wall-movement')return Object.keys(s).sort().join()==='powerId,speed'&&Number.isInteger(s.speed)&&s.speed>=0&&s.speed<=100000;
 if(kind!=='memory-access'||Object.keys(s).sort().join()!=='powerId,selection')return false;
 try{const selection=technometrySelection(s.selection);return Object.keys(s.selection).sort().join()==='effect,target,will'&&Object.entries(selection).every(([k,v])=>s.selection[k]===v);}catch{return false;}
}
export function conditionPowerSnapshot(d,pack,id,selection){
 if(conditionPowerRule(pack,id)?.kind==='memory-access')return {powerId:id,selection:technometrySelection(selection)};
 if(conditionPowerRule(pack,id)?.kind!=='wall-movement')return null;
 if(d.speedUnknown||!Number.isInteger(d.speed)||d.speed<0||d.speed>100000)throw new Error('Choose a known Speed');
 return {powerId:id,speed:d.speed};
}

export function technometrySelection(value={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['target','effect','will'].includes(k)))throw new Error('Invalid Technometry target');
 const selection={target:value.target??'device',effect:value.effect??'information',will:value.will??null};
 if(!['device','droid'].includes(selection.target)||!['information','senses','defense','flee'].includes(selection.effect)||selection.target!=='droid'&&selection.effect!=='information'||selection.will!==null&&(!Number.isInteger(selection.will)||Math.abs(selection.will)>100000))throw new Error('Invalid Technometry target');
 return selection;
}
export function conditionEnhancementAvailable(pack,id,total,snapshot,effectDC=null){
 return conditionPowerRule(pack,id)?.kind==='memory-access'?validConditionSnapshot(snapshot,pack)&&(snapshot.selection.will===null||total>=snapshot.selection.will):!!conditionPowerTier(pack,id,total,effectDC);
}
function resolveTechnometry(rule,total,selection,enhanced){
 const {effect,will,target}=selection,success=will===null?null:total>=will,additional=enhanced?rule.enhancement.pieces:0,rounds=enhanced?rule.enhancement.rounds:0;
 if(success===false)return {text:'No effect',html:'',success:false,informationPieces:0};
 if(effect==='information'){
  const pieces=will===null?null:rule.information.pieces+Math.floor((total-will)/rule.information.margin)+additional,formula=(rule.information.pieces+additional)+' + floor(('+total+' - Will) / '+rule.information.margin+')',text=(success===null?'Will ≤ '+total+': ':'')+(pieces===null?formula+' pieces of information':pieces+' piece'+(pieces===1?'':'s')+' of information');
  return {text,html:`<p>${escape(text)}</p><details><summary>Information</summary>As Access Information (Use Computer), from the target’s memory</details>`,success,target,informationPieces:pieces,...(will===null?{maximumWill:total,informationFormula:formula}:{}),additionalPieces:additional};
 }
 const deadline=rounds?'Until one round after the end of your next turn':'Until the end of your next turn',fleeTurns=rule.fleeTurns+rounds,description=effect==='senses'?'You may make Stealth checks against this Droid even though it is aware of you':effect==='defense'?'The Droid is denied its Dexterity bonus to Reflex against your next attack':'On its next '+fleeTurns+' turns, the Droid does nothing except flee from you at top speed',duration=effect==='flee'?'Target’s next '+fleeTurns+' turns':deadline,text=(success===null?'Will ≤ '+total+': ':'')+description+'; '+duration;
 return {text,html:`<p>${escape(description)}</p>${success===null?`<details><summary>Will</summary>≤ ${total}</details>`:''}<details><summary>Duration</summary>${escape(duration)}</details>`,success,target,effect,...(will===null?{maximumWill:total}:{}),...(effect==='flee'?{fleeTurns}:{duration:rule.duration,extraRounds:rounds,...(effect==='defense'?{attacks:1}:{casterStealthPermission:true})})};
}
