import {escapeHTML as escape} from './wiki-content.js';

export const mentalPowerRule=(pack,id)=>pack.rules.mentalPowerEffects?.find(r=>r.powerId===id);
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,min=-100000,max=100000)=>Number.isInteger(v)&&v>=min&&v<=max;
export function mentalPowerSelection(pack,value){
 const r=mentalPowerRule(pack,'power:mind-trick');
 if(!r||!object(value)||Object.keys(value).some(k=>!['mode','will','level','intelligence','communicates','safe'].includes(k)))throw new Error('Choose a Mind Trick effect');
 const selection={mode:value.mode??'hallucination',will:value.will??null,level:value.level??null,intelligence:value.intelligence??null,communicates:value.communicates??false,safe:value.safe??false};
 if(!r.modes.includes(selection.mode)||selection.will!==null&&!integer(selection.will)||[selection.level,selection.intelligence].some(v=>v!==null&&!integer(v,0,1000))||typeof selection.communicates!=='boolean'||typeof selection.safe!=='boolean')throw new Error('Invalid Mind Trick target');
 if(selection.intelligence!==null&&selection.intelligence<r.minimumIntelligence)throw new Error('Target requires Intelligence 3 or higher');
 if(selection.mode==='suggestion'&&(!selection.communicates||!selection.safe))throw new Error('Suggestion requires communication and no obvious threat to the target’s life');
 return selection;
}
export function mentalPowerSnapshot(d,pack,selection){
 return {powerId:'power:mind-trick',characterLevel:d.level,selection:mentalPowerSelection(pack,selection)};
}
export function validateMentalPowerSnapshot(pack,snapshot){
 if(!object(snapshot)||Object.keys(snapshot).sort().join()!=='characterLevel,powerId,selection'||!mentalPowerRule(pack,snapshot.powerId)||!integer(snapshot.characterLevel,0,1000))throw new Error('Invalid mental power snapshot');
 const selection=mentalPowerSelection(pack,snapshot.selection);
 if(Object.keys(snapshot.selection).sort().join()!==Object.keys(selection).sort().join()||Object.entries(selection).some(([key,value])=>snapshot.selection[key]!==value))throw new Error('Invalid mental power snapshot');
 return selection;
}
export function mentalEnhancementAvailable(snapshot,total){return snapshot.selection.mode==='suggestion'&&(snapshot.selection.will===null||total>=snapshot.selection.will);}
export function validateMentalPowers(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const snapshot=step.options?.mentalPowerSnapshot;
  if(snapshot===undefined){if(mentalPowerRule(pack,step.options?.effectPowerId))bad('mental power snapshot');continue;}
  try{validateMentalPowerSnapshot(pack,snapshot);if(step.action!=='power'||step.status==='queued'||step.options.effectPowerId!==snapshot.powerId||!integer(step.result?.check?.total)||step.result.enhanceAllowed&&!mentalEnhancementAvailable(snapshot,step.result.check.total))throw new Error();}catch{bad('mental power result');return;}
 }
}
export function resolveMentalPower(pack,check,snapshot,{enhanced=false}={}){
 const selection=validateMentalPowerSnapshot(pack,snapshot),r=mentalPowerRule(pack,snapshot.powerId);
 if(!integer(check?.total)||typeof enhanced!=='boolean'||enhanced&&!mentalEnhancementAvailable(snapshot,check.total))throw new Error('Mental power enhancement unavailable');
 const hit=selection.will===null?null:check.total>=selection.will,fearNegated=selection.mode==='fear'&&selection.level!==null&&selection.level>=snapshot.characterLevel;
 const outcomes={hallucination:'You may attempt Stealth despite target awareness',feint:'Your next attack against this target ignores its Dexterity bonus to Reflex',suggestion:'Suggestion seems reasonable to the target',fear:'Target flees from you at top Speed for 1 minute, ending if wounded'};
 const effect=outcomes[selection.mode],levelUnknown=selection.mode==='fear'&&selection.level===null,succeeded=fearNegated||hit===false?false:levelUnknown?null:hit,attitudeSteps=enhanced&&hit===true?r.enhancement.baseAttitudeSteps+Math.floor((check.total-selection.will)/r.enhancement.marginPerStep):null;
 const attitude=enhanced?(attitudeSteps===null?'On success, Attitude improves 1 step, plus 1 per 5 points above Will':'Attitude +'+attitudeSteps+' step'+(attitudeSteps===1?'':'s')):'',levelText=selection.mode==='fear'?'Requires target level below '+snapshot.characterLevel:'';
 const text=succeeded===false?'No effect'+(fearNegated?' (target level)':' (Will '+selection.will+')'):(hit===null?'Will ≤ '+check.total+': ':levelUnknown?'If target level is below '+snapshot.characterLevel+': ':'')+effect+(levelText&&!(levelUnknown&&hit!==null)?'; '+levelText:'')+(attitude?'; '+attitude:'');
 const qualified=levelUnknown?'If target level is below '+snapshot.characterLevel+': '+effect:effect;
 const rows=selection.will===null?[{maximum:check.total,effect:fearNegated?'No effect':qualified},{minimum:check.total+1,effect:'No effect'}]:[{will:selection.will,effect:succeeded===false?'No effect':qualified}];
 const html=`<table class="routine-result"><thead><tr><th>Will</th><th>Effect</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row.will??(row.maximum===undefined?'≥ '+row.minimum:'≤ '+row.maximum)}</td><td>${escape(row.effect)}</td></tr>`).join('')}</tbody></table>${levelText?`<details><summary>Fear</summary>${escape(levelText)}, ends if wounded.</details>`:''}${attitude?`<details><summary>Attitude</summary>${escape(attitude)}</details>`:''}`;
 return {text,html,rows,succeeded,mode:selection.mode,attitudeSteps,...(selection.mode==='fear'?{maximumTargetLevel:snapshot.characterLevel-1,duration:r.fear.duration,endsWhenWounded:true}:{})};
}
