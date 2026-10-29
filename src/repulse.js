import {opposedDisplacementPlan,displacementPowerRule} from './force-thrust.js';
import {evalExpr} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

const object=v=>v&&typeof v==='object'&&!Array.isArray(v),integer=(v,min=-100000,max=100000)=>Number.isInteger(v)&&v>=min&&v<=max;
export const repulsePowerRule=(pack,id)=>{const r=displacementPowerRule(pack,id);return r?.kind==='adjacent-displacement'?r:null;};
export const newRepulseTarget=()=>({name:'',strengthCheck:0,baseAttack:0,size:'medium',stable:false,collisionAt:null});
export function repulseSelection(pack,value={targets:[]}){
 const rule=repulsePowerRule(pack,'power:repulse');
 if(!rule||!object(value)||Object.keys(value).some(k=>k!=='targets')||!Array.isArray(value.targets)||value.targets.length>100)throw new Error('Invalid Repulse targets');
 return value.targets.map(v=>{
  if(!object(v)||Object.keys(v).some(k=>!Object.hasOwn(newRepulseTarget(),k)))throw new Error('Invalid Repulse target');
  const t={...newRepulseTarget(),...v};
  if(typeof t.name!=='string'||t.name.trim().length>100||/[\r\n\0]/.test(t.name)||!integer(t.strengthCheck)||!integer(t.baseAttack,0,1000)||typeof t.size!=='string'||!Object.hasOwn(rule.sizeModifiers,t.size)||typeof t.stable!=='boolean'||t.collisionAt!==null&&!integer(t.collisionAt,1))throw new Error('Invalid Repulse target');
  return {...t,name:t.name.trim()};
 });
}
export function repulsePowerSnapshot(pack,selection){return {powerId:'power:repulse',targets:repulseSelection(pack,selection)};}
function validSnapshot(pack,snapshot){
 if(!object(snapshot)||Object.keys(snapshot).sort().join()!=='powerId,targets'||snapshot.powerId!=='power:repulse')return false;
 try{const targets=repulseSelection(pack,{targets:snapshot.targets});return targets.every((t,i)=>Object.keys(snapshot.targets[i]).sort().join()==='baseAttack,collisionAt,name,size,stable,strengthCheck'&&Object.entries(t).every(([k,v])=>snapshot.targets[i][k]===v));}catch{return false;}
}
function plans(pack,check,snapshot,enhanced){
 if(!validSnapshot(pack,snapshot)||!integer(check?.total)||typeof enhanced!=='boolean')throw new Error('Invalid Repulse result');
 return snapshot.targets.map(t=>opposedDisplacementPlan(repulsePowerRule(pack,snapshot.powerId),check.total,t,enhanced));
}
function renderResult(pack,check,snapshot,resolution){
 if(!object(resolution)||Object.keys(resolution).sort().join()!=='damage,enhanced,powerId'||resolution.powerId!==snapshot?.powerId||!Array.isArray(resolution.damage)||resolution.damage.length!==snapshot.targets.length)throw new Error('Invalid saved Repulse result');
 const rule=repulsePowerRule(pack,snapshot.powerId),rows=plans(pack,check,snapshot,resolution.enhanced).map((p,i)=>{
  const damage=resolution.damage[i],dice=rule.collision.dice+(resolution.enhanced?rule.enhancement.collisionDice:0);
  if(p.collision?!integer(damage,dice,dice*rule.collision.die):damage!==0)throw new Error('Invalid Repulse collision roll');
  return {...p,index:i,name:snapshot.targets[i].name||'Target '+(i+1),damage,...(p.collision?{expression:dice+'d'+rule.collision.die}:{})};
 });
 const collisions=rows.filter(r=>r.collision),damage=collisions.reduce((sum,r)=>sum+r.damage,0),text=rows.length+' targets, '+rows.filter(r=>r.pushed).length+' pushed'+(collisions.length?'; '+collisions.length+(collisions.length===1?' collision, ':' collisions, ')+damage+' damage':''),signed=n=>n>=0?'+'+n:String(n);
 const html=rows.length?`<table class="routine-result repulse-result"><thead><tr><th>Target</th><th>Strength</th><th title="Squares" aria-label="Push (squares)">Push</th><th>Collision</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escape(r.name)}</td><td>${r.opposed}</td><td>${r.pushed}</td><td>${r.collision?r.damage:'No'}</td></tr>`).join('')}</tbody></table><details><summary>Calculations</summary><div>Use the Force ${check.total}</div>${rows.map((r,i)=>{const t=snapshot.targets[i];return `<div>${escape(r.name)}: Strength ${t.strengthCheck}, BAB ${signed(t.baseAttack)}, size ${signed(rule.sizeModifiers[t.size])}, stability ${t.stable?rule.stabilityBonus:0}${resolution.enhanced?', FP -'+rule.enhancement.opponentPenalty:''} = ${r.opposed}; margin ${r.margin}${r.pushed?', 1 + floor('+r.margin+' / '+rule.marginPerSquare+') = '+r.pushed:''}${t.collisionAt===null?'':'; larger object at '+t.collisionAt+' squares'}${r.collision?'; '+r.expression+' = '+r.damage:''}</div>`;}).join('')}</details>`:'';
 return {text,html,targets:rows,damageType:'unspecified',resolution};
}
export function resolveRepulse(pack,check,snapshot,{enhanced=false,roller=evalExpr}={}){
 const rule=repulsePowerRule(pack,snapshot?.powerId),p=plans(pack,check,snapshot,enhanced),dice=rule.collision.dice+(enhanced?rule.enhancement.collisionDice:0),damage=p.map(row=>{
  if(!row.collision)return 0;
  const roll=roller(dice+'d'+rule.collision.die);
  if(!integer(roll?.value,dice,dice*rule.collision.die))throw new Error('Invalid Repulse collision roll');
  return roll.value;
 });
 return renderResult(pack,check,snapshot,{powerId:snapshot.powerId,enhanced,damage});
}
export function finishRepulse(c,pack,id,check,snapshot,options){
 const step=c.actionState?.plan.find(s=>s.id===id);
 if(!step||step.action!=='power'||step.status==='done'||step.options.repulsePowerResolution!==undefined)throw new Error('Repulse already resolved or unavailable');
 const result=resolveRepulse(pack,check,snapshot,options);
 step.options.repulsePowerResolution=structuredClone(result.resolution);return result;
}
export function savedRepulseResult(step,pack){
 if(step?.status!=='done'||!step.options?.repulsePowerResolution)return null;
 return renderResult(pack,step.result.check,step.options.repulsePowerSnapshot,step.options.repulsePowerResolution);
}
export function validateRepulse(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const o=step.options||{},snapshot=o.repulsePowerSnapshot,resolution=o.repulsePowerResolution,copy=c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===o.powerId);
  try{
   if(o.repulse!==undefined){if(step.action!=='power'||!repulsePowerRule(pack,o.effectPowerId??copy?.powerId))throw new Error();repulseSelection(pack,o.repulse);}
   if(snapshot===undefined){if(o.effectPowerId==='power:repulse'||resolution!==undefined)throw new Error();continue;}
   if(step.action!=='power'||step.status==='queued'||o.effectPowerId!=='power:repulse'||!validSnapshot(pack,snapshot)||!integer(step.result?.check?.total)||step.result.effectChoiceAllowed)throw new Error();
   if(step.status==='done'){if(!resolution)throw new Error();renderResult(pack,step.result.check,snapshot,resolution);}else if(resolution!==undefined)throw new Error();
  }catch{bad('Repulse saved targets or result');}
 }
}
