import {advanceRoundEffects,ROUNDS_PER_MINUTE} from './effect-duration.js';
import {validPowerEffectLimit} from './power-effect-choices.js';
import {escapeHTML as escape} from './wiki-content.js';

const object=x=>x&&typeof x==='object'&&!Array.isArray(x),uuid=x=>typeof x==='string'&&/^[a-f0-9-]{36}$/.test(x);
const validNames=q=>Array.isArray(q)&&q.length>=1&&q.length<=2&&q.every(s=>typeof s==='string'&&s.length>=1&&s.length<=100&&s===s.trim())&&new Set(q).size===q.length;
export const trackingPowerRule=(pack,id)=>pack.rules.trackingPowers?.find(r=>r.powerId===id);
export const trackingPowerTier=(pack,id,total,dc=null)=>trackingPowerRule(pack,id)?.thresholds.filter(t=>total>=t.dc&&(dc===null||t.dc<=dc)).at(-1)||null;
export function trackingPowerSnapshot(pack,id,selection={}){
 if(!trackingPowerRule(pack,id))return undefined;
 if(!object(selection)||Object.keys(selection).some(k=>!['quarry','second'].includes(k))||typeof selection.quarry!=='string'||selection.second!==undefined&&typeof selection.second!=='string')throw new Error('Choose a quarry');
 const quarries=[selection.quarry.trim(),...(selection.second?.trim()?[selection.second.trim()]:[])];
 if(!validNames(quarries))throw new Error('Choose distinct quarry names, up to 100 characters');
 return {powerId:id,quarries};
}
const validSnapshot=(s,pack)=>object(s)&&Object.keys(s).sort().join()==='powerId,quarries'&&!!trackingPowerRule(pack,s.powerId)&&validNames(s.quarries);
export function validateTrackingPowers(c,pack,bad){
 if(c.trackingPowerEffects!==undefined){
  const rows=c.trackingPowerEffects;
  if(!Array.isArray(rows)||rows.length>1000||new Set(rows.map(r=>r?.id)).size!==rows.length){bad('tracking powers');return;}
  for(const s of rows){const r=trackingPowerRule(pack,s?.powerId);if(!object(s)||Object.keys(s).sort().join()!=='enhanced,id,powerId,quarries,rounds,tier'||!uuid(s.id)||!r||typeof s.enhanced!=='boolean'||!validNames(s.quarries)||s.quarries.length>(s.enhanced?r.enhancement.targets:r.targets)||!Number.isInteger(s.tier)||s.tier<1||s.tier>r.thresholds.length||!Number.isInteger(s.rounds)||s.rounds<1||s.rounds>r.durationRounds){bad('tracking power effect');return;}}
 }
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const snapshot=step.options?.trackingPowerSnapshot;
  if(snapshot===undefined){if(trackingPowerRule(pack,step.options.effectPowerId))bad('tracking power snapshot');}
  else if(!validSnapshot(snapshot,pack)||step.action!=='power'||step.status==='queued'||snapshot.powerId!==step.options.effectPowerId)bad('tracking power snapshot');
  if(step.options?.tracking!==undefined){const copy=c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===step.options.powerId);try{if(!trackingPowerRule(pack,step.options.effectPowerId??copy?.powerId))throw new Error();trackingPowerSnapshot(pack,step.options.effectPowerId??copy?.powerId,step.options.tracking);}catch{bad('tracking quarry selection');}}
 }
}
export function activeTrackingPowers(c,pack){return (c.trackingPowerEffects||[]).map(s=>({...s,name:pack.forcePowers.find(p=>p.id===s.powerId).name,minutes:s.rounds/ROUNDS_PER_MINUTE,trailMinutes:trackingPowerRule(pack,s.powerId).thresholds[s.tier-1].trailMinutes}));}
export function finishTrackingPower(c,pack,id,powerId,check,{enhanced=false,snapshot,effectDC=null}={}){
 const r=trackingPowerRule(pack,powerId);
 if(!r||!uuid(id)||!validSnapshot(snapshot,pack)||snapshot.powerId!==powerId||!Number.isInteger(check?.total)||Math.abs(check.total)>100000||typeof enhanced!=='boolean'||!validPowerEffectLimit(pack,powerId,effectDC))throw new Error('Invalid tracking power result');
 if(c.trackingPowerEffects?.some(s=>s.id===id))throw new Error('Power effect already resolved');
 const tier=trackingPowerTier(pack,powerId,check.total,effectDC);if(!tier)return {text:'No effect',html:''};
 if((c.trackingPowerEffects?.length||0)>=1000)throw new Error('Too many active effects');
 const quarries=snapshot.quarries.slice(0,enhanced?r.enhancement.targets:r.targets),row={id,powerId,tier:r.thresholds.indexOf(tier)+1,quarries:[...quarries],rounds:r.durationRounds,enhanced};
 c.trackingPowerEffects??=[];c.trackingPowerEffects.push(row);
 const text='Track '+quarries.join(', ')+' without Survival checks for up to 1 hour; trail up to '+tier.trailMinutes+' min old, in Line of Sight';
 return {text,html:`<p>${escape('Track '+quarries.join(', '))}</p><details><summary>Tracking</summary>${escape('Without Survival checks for up to 1 hour; requires a trail up to '+tier.trailMinutes+' min old in Line of Sight')}</details>`,quarries:[...quarries],durationRounds:r.durationRounds,trailMinutes:tier.trailMinutes};
}
export function advanceTrackingPowers(c,rounds){if(c.trackingPowerEffects){c.trackingPowerEffects=advanceRoundEffects(c.trackingPowerEffects,rounds);if(!c.trackingPowerEffects.length)delete c.trackingPowerEffects;}}
export function clearTrackingPowers(c){delete c.trackingPowerEffects;}
export function removeTrackingPower(c,id){if(!c.trackingPowerEffects?.some(s=>s.id===id))throw new Error('Tracking unavailable');c.trackingPowerEffects=c.trackingPowerEffects.filter(s=>s.id!==id);if(!c.trackingPowerEffects.length)delete c.trackingPowerEffects;}
export function setTrackingMinutes(c,pack,id,minutes){
 const row=c.trackingPowerEffects?.find(s=>s.id===id),r=trackingPowerRule(pack,row?.powerId),rounds=Math.round(minutes*ROUNDS_PER_MINUTE);
 if(!row||!r||typeof minutes!=='number'||!Number.isFinite(minutes)||minutes<0||Math.abs(minutes*ROUNDS_PER_MINUTE-rounds)>1e-8||rounds>r.durationRounds)throw new Error('Invalid remaining minutes');
 if(rounds)row.rounds=rounds;else removeTrackingPower(c,id);
}
export function followTrackingQuarry(c,pack,id,index){
 const s=activeTrackingPowers(c,pack).find(s=>s.id===id);
 if(!s||!Number.isInteger(index)||index<0||index>=s.quarries.length)throw new Error('Tracking unavailable');
 return {text:'Track '+s.quarries[index]+', no Survival check; '+s.minutes+' min remaining, trail up to '+s.trailMinutes+' min old in Line of Sight'};
}
