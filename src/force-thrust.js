import {evalExpr,totalHtml} from './dice.js';
import {counselingEnabled} from './house-rules.js';

export const displacementPowerRule=(pack,id)=>pack.rules.displacementPowers?.find(r=>r.powerId===id);
export function forceThrustRange(d,pack){
 const r=displacementPowerRule(pack,'power:force-thrust');
 return d.ctx.classChoices?.some(c=>c.id===r.rangeTechnique.id&&!d.ctx.inactiveClasses?.has(c.classId))?r.rangeTechnique.range:r.range;
}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,min=-100000,max=100000)=>Number.isInteger(v)&&v>=min&&v<=max;
export function forceThrustTarget(pack,value,{range=12,doorEnabled=true}={}){
 const r=displacementPowerRule(pack,'power:force-thrust');
 if(!r||!object(value)||![r.range,r.rangeTechnique.range].includes(range)||typeof doorEnabled!=='boolean')throw new Error('Invalid Force Thrust target');
 const mode=value.mode??'opposed',keys=mode==='door'?['mode','distance','lineOfSight','breakDC']:['mode','distance','lineOfSight','strengthCheck','baseAttack','size','stable','collisionAt'];
 if(!['opposed','door'].includes(mode)||Object.keys(value).some(k=>!keys.includes(k)))throw new Error('Invalid Force Thrust target');
 if(typeof value.distance!=='number'||!Number.isFinite(value.distance)||value.distance<0||value.distance>range)throw new Error('Target outside Force Thrust range');
 if(value.lineOfSight!==true)throw new Error('Line of Sight required');
 const base={mode,distance:value.distance,lineOfSight:true};
 if(mode==='door'){
  if(!doorEnabled)throw new Error('Moving a Door Jedi Counseling is disabled');
  if(!integer(value.breakDC,0))throw new Error('Enter the door Break DC');
  return {...base,breakDC:value.breakDC};
 }
 if(!integer(value.strengthCheck)||!integer(value.baseAttack,0,1000)||typeof value.size!=='string'||!Object.hasOwn(r.sizeModifiers,value.size)||typeof value.stable!=='boolean'||value.collisionAt!==undefined&&value.collisionAt!==null&&!integer(value.collisionAt,1))throw new Error('Invalid opposing Strength check');
 return {...base,strengthCheck:value.strengthCheck,baseAttack:value.baseAttack,size:value.size,stable:value.stable,collisionAt:value.collisionAt??null};
}
export function forceThrustSnapshot(c,d,pack,target){
 const range=forceThrustRange(d,pack),doorEnabled=counselingEnabled(c,displacementPowerRule(pack,'power:force-thrust').door.counselingId);
 return {powerId:'power:force-thrust',range,doorEnabled,target:forceThrustTarget(pack,target,{range,doorEnabled})};
}
export function validateForceThrustSnapshot(pack,snapshot){
 if(!object(snapshot)||Object.keys(snapshot).sort().join()!=='doorEnabled,powerId,range,target'||snapshot.powerId!=='power:force-thrust')throw new Error('Invalid Force Thrust snapshot');
 const t=forceThrustTarget(pack,snapshot.target,snapshot);
 if(Object.keys(t).sort().join()!==Object.keys(snapshot.target).sort().join())throw new Error('Invalid Force Thrust snapshot');
 return t;
}
export function validateForceThrustResults(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const snapshot=step.options?.forceThrustSnapshot;
  if(snapshot===undefined){if(step.options?.effectPowerId==='power:force-thrust')bad('Force Thrust snapshot');continue;}
  try{
   validateForceThrustSnapshot(pack,snapshot);
   if(step.action!=='power'||step.status==='queued'||step.options.effectPowerId!==snapshot.powerId||!integer(step.result?.check?.total)||step.result.effectChoiceAllowed||snapshot.target.mode==='door'&&step.result.enhanceAllowed)throw new Error();
  }catch{bad('Force Thrust result');return;}
 }
}
export function finishForceThrust(pack,check,snapshot,options={}){
 const target=validateForceThrustSnapshot(pack,snapshot);
 return resolveForceThrust(pack,check,target,{...options,range:snapshot.range,doorEnabled:snapshot.doorEnabled});
}
export function resolveForceThrust(pack,check,target,{enhanced=false,range=12,doorEnabled=true,roller=evalExpr}={}){
 const r=displacementPowerRule(pack,'power:force-thrust'),t=forceThrustTarget(pack,target,{range,doorEnabled});
 if(!integer(check?.total)||typeof enhanced!=='boolean'||t.mode==='door'&&enhanced)throw new Error('Invalid Force Thrust result');
 if(t.mode==='door'){
  const opened=check.total>=t.breakDC;
  return {opened,pushed:0,collision:false,damage:0,text:opened?'Door opened':'Door intact',html:''};
 }
 const {opposed,margin,pushed,collision}=opposedDisplacementPlan(r,check.total,t,enhanced);
 const text='Strength '+opposed+'; '+(pushed?'Push '+pushed+' squares':'Not pushed');
 if(!collision)return {opposed,margin,pushed,collision:false,damage:0,text,html:''};
 const dice=r.collision.dice+(enhanced?r.enhancement.collisionDice:0),expression=dice+'d'+r.collision.die,roll=roller(expression);
 if(!integer(roll?.value,dice,dice*r.collision.die))throw new Error('Invalid Force Thrust collision roll');
 return {opposed,margin,pushed,collision:true,damage:roll.value,expression,text:text+'; Collision '+roll.value+' ('+expression+')',html:'<details><summary>Collision</summary>'+roll.display+' = '+totalHtml(roll)+'</details>'};
}

// Opposing Strength already includes its modifier. Both powers add BAB/size
// and one stability bonus, and require strict success before movement.
export function opposedDisplacementPlan(rule,total,target,enhanced=false){
 const opposed=target.strengthCheck+target.baseAttack+rule.sizeModifiers[target.size]+(target.stable?rule.stabilityBonus:0)-(enhanced?rule.enhancement.opponentPenalty:0),margin=total-opposed,pushed=margin>0?rule.baseSquares+Math.floor(margin/rule.marginPerSquare):0,collision=pushed>0&&target.collisionAt!==null&&pushed>=target.collisionAt;
 return {opposed,margin,pushed,collision};
}
