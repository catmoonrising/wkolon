import {advanceRoundEffects,ROUNDS_PER_MINUTE} from './effect-duration.js';
import {escapeHTML as escape} from './wiki-content.js';

const object=v=>v&&typeof v==='object'&&!Array.isArray(v),integer=(v,min=-100000,max=100000)=>Number.isInteger(v)&&v>=min&&v<=max,uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
const keyFor=name=>name.trim().toLowerCase();
export const farseeingPowerRule=(pack,id)=>pack.rules.divinationPowers?.find(r=>r.powerId===id);
export function farseeingSelection(pack,value={}){
 if(!object(value)||Object.keys(value).some(k=>!['name','will','dead'].includes(k)))throw new Error('Invalid Farseeing target');
 const rule=farseeingPowerRule(pack,'power:farseeing');if(!rule)throw new Error('Farseeing unavailable');
 const target={name:value.name,will:value.will??null,dead:value.dead===undefined?false:value.dead};
 if(typeof target.name!=='string'||!target.name.trim()||target.name.trim().length>100||/[\r\n\0]/.test(target.name)||target.will!==null&&!integer(target.will)||typeof target.dead!=='boolean')throw new Error('Choose a known creature and valid Will');
 target.name=target.name.trim();if(target.dead)target.will=rule.deadWill;return target;
}
const validSnapshot=(pack,s)=>{
 if(!object(s)||Object.keys(s).sort().join()!=='powerId,target'||s.powerId!=='power:farseeing'||!object(s.target)||Object.keys(s.target).sort().join()!=='dead,name,will')return false;
 try{return Object.entries(farseeingSelection(pack,s.target)).every(([k,v])=>s.target[k]===v);}catch{return false;}
};
export function farseeingPowerSnapshot(c,pack,selection){
 if(!farseeingPowerRule(pack,'power:farseeing'))throw new Error('Farseeing unavailable');
 const target=farseeingSelection(pack,selection),failure=c.farseeingFailures?.find(f=>f.key===keyFor(target.name));
 if(failure)throw new Error('Farseeing unavailable for '+failure.name+' ('+failure.rounds/ROUNDS_PER_MINUTE+' min remaining)');
 if((c.farseeingFailures?.length||0)>=1000)throw new Error('Too many Farseeing lockouts');
 return {powerId:'power:farseeing',target};
}
export function farseeingOutcome(pack,snapshot,total){
 if(!validSnapshot(pack,snapshot)||!integer(total))throw new Error('Invalid Farseeing check');
 return snapshot.target.will===null?null:total>=snapshot.target.will;
}
const validConfirmation=(p,total)=>object(p)&&Object.keys(p).sort().join()==='success,total'&&typeof p.success==='boolean'&&p.total===total;
export function farseeingResult(pack,check,snapshot,{enhanced=false,confirmation}={}){
 const rule=farseeingPowerRule(pack,snapshot?.powerId),known=farseeingOutcome(pack,snapshot,check?.total);
 if(!rule||typeof enhanced!=='boolean'||confirmation!==undefined&&(known!==null||!validConfirmation(confirmation,check.total)))throw new Error('Invalid Farseeing outcome');
 if(known===null&&!validConfirmation(confirmation,check.total))throw new Error('Confirm the Farseeing outcome');
 const success=known??confirmation.success;
 if(enhanced&&!success)throw new Error('Farseeing enhancement requires success');
 const name=snapshot.target.name,text=success?name+': '+(enhanced?'Clear mental image of surroundings and creatures or objects within '+rule.enhancement.radius+' squares':'Sense whether alive or dead, vague immediate surroundings, activity and strong emotions'):name+': No information; Farseeing unavailable for 24 hours';
 return {text,html:`<p>${escape(text)}</p>`,success,...(success?{detail:enhanced?'clear':'vague',...(enhanced?{radius:rule.enhancement.radius}:{})}:{}),resolution:{success,enhanced,total:check.total}};
}
// The shared action transaction owns FP/copy costs, final status and rollback.
export function finishFarseeing(c,pack,id,check,snapshot,{enhanced=false}={}){
 const step=c.actionState?.plan.find(s=>s.id===id),rule=farseeingPowerRule(pack,snapshot?.powerId);
 if(!uuid(id)||!step||step.action!=='power'||step.status==='done'||step.options.farseeingResolution!==undefined||!rule)throw new Error('Farseeing already resolved or unavailable');
 if(step.options.effectPowerId!==snapshot.powerId||!validSnapshot(pack,step.options.farseeingPowerSnapshot)||!Object.entries(snapshot.target).every(([k,v])=>step.options.farseeingPowerSnapshot.target[k]===v)||step.result?.check&&step.result.check.total!==check.total)throw new Error('Farseeing check or target changed');
 const result=farseeingResult(pack,check,snapshot,{enhanced,confirmation:step.options.powerOutcome});
 if(!result.success){
  if((c.farseeingFailures?.length||0)>=1000||c.farseeingFailures?.some(f=>f.key===keyFor(snapshot.target.name)))throw new Error('Farseeing failure already recorded or unavailable');
  c.farseeingFailures??=[];c.farseeingFailures.push({id,key:keyFor(snapshot.target.name),name:snapshot.target.name,rounds:rule.failureCooldownRounds});
 }
 step.options.farseeingResolution=result.resolution;return result;
}
export function validateFarseeing(c,pack,bad){
 if(c.farseeingFailures!==undefined){
  const rows=c.farseeingFailures,rule=farseeingPowerRule(pack,'power:farseeing');
  if(!rule||!Array.isArray(rows)||rows.length>1000||new Set(rows.map(r=>r?.id)).size!==rows.length||new Set(rows.map(r=>r?.key)).size!==rows.length){bad('Farseeing lockouts');return;}
  for(const r of rows){if(!object(r)||Object.keys(r).sort().join()!=='id,key,name,rounds'||!uuid(r.id)||typeof r.name!=='string'||typeof r.key!=='string'||r.key!==keyFor(r.name)||!integer(r.rounds,1,rule.failureCooldownRounds)){bad('Farseeing lockout');continue;}try{if(farseeingSelection(pack,{name:r.name}).name!==r.name)throw new Error();}catch{bad('Farseeing lockout name');}}
 }
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const o=step.options||{},snapshot=o.farseeingPowerSnapshot,resolution=o.farseeingResolution,copy=c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===o.powerId);
  try{
   if(o.farseeing!==undefined){if(step.action!=='power'||!farseeingPowerRule(pack,o.effectPowerId??copy?.powerId))throw new Error();farseeingSelection(pack,o.farseeing);}
   if(snapshot===undefined){if(o.effectPowerId==='power:farseeing'||resolution!==undefined||o.powerOutcome!==undefined||step.result?.outcomeAllowed!==undefined)throw new Error();continue;}
   if(!farseeingPowerRule(pack,snapshot.powerId)||step.action!=='power'||step.status==='queued'||o.effectPowerId!==snapshot.powerId||!validSnapshot(pack,snapshot)||!integer(step.result?.check?.total))throw new Error();
   const outcome=farseeingOutcome(pack,snapshot,step.result.check.total);
   if(step.status==='waiting'){
    if(o.powerOutcome!==undefined||resolution!==undefined||step.result.outcomeAllowed!==undefined&&(step.result.outcomeAllowed!==true||outcome!==null)||outcome===null&&!step.result.outcomeAllowed)throw new Error();
   }else{
    if(step.result.outcomeAllowed!==undefined||!object(resolution)||Object.keys(resolution).sort().join()!=='enhanced,success,total'||typeof resolution.enhanced!=='boolean')throw new Error();
    const expected=farseeingResult(pack,step.result.check,snapshot,{enhanced:resolution.enhanced,confirmation:o.powerOutcome}).resolution;
    if(Object.entries(expected).some(([k,v])=>resolution[k]!==v))throw new Error();
   }
  }catch{bad('Farseeing saved outcome');}
 }
}
export function advanceFarseeingFailures(c,rounds){if(c.farseeingFailures){c.farseeingFailures=advanceRoundEffects(c.farseeingFailures,rounds);if(!c.farseeingFailures.length)delete c.farseeingFailures;}}
export const farseeingFailures=c=>(c.farseeingFailures||[]).map(r=>({...r,minutes:r.rounds/ROUNDS_PER_MINUTE}));
export function removeFarseeingFailure(c,id){if(!c.farseeingFailures?.some(r=>r.id===id))throw new Error('Farseeing lockout unavailable');c.farseeingFailures=c.farseeingFailures.filter(r=>r.id!==id);if(!c.farseeingFailures.length)delete c.farseeingFailures;}
export function setFarseeingMinutes(c,pack,id,minutes){
 const row=c.farseeingFailures?.find(r=>r.id===id),rule=farseeingPowerRule(pack,'power:farseeing'),rounds=Math.round(minutes*ROUNDS_PER_MINUTE);
 if(!row||!rule||typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<0||Math.abs(minutes*ROUNDS_PER_MINUTE-rounds)>1e-8||rounds>rule.failureCooldownRounds)throw new Error('Invalid remaining minutes');
 if(rounds)row.rounds=rounds;else removeFarseeingFailure(c,id);
}
