import {endTurnEffects,startTurnEffects} from './effect-duration.js';
import {escapeHTML as escape} from './wiki-content.js';

// The shared action transaction owns source/action/FP/copy costs and rollback.
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,list)=>object(v)&&Object.keys(v).sort().join()===list;
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
export const outgoingPowerRule=(pack,id)=>pack.rules.outgoingMaintainedPowers?.find(r=>r.powerId===id);
export function outgoingTarget(pack,value={},eligible=true){
 const rule=outgoingPowerRule(pack,'power:cryokinesis');
 if(!rule||!object(value)||Object.keys(value).some(k=>!['name','distance','lineOfSight','unattended','mechanical','dr','condition'].includes(k))||typeof eligible!=='boolean')throw new Error('Invalid object declaration');
 const target={name:value.name===undefined?'':value.name,distance:value.distance===undefined?0:value.distance,lineOfSight:value.lineOfSight===undefined?false:value.lineOfSight,unattended:value.unattended===undefined?false:value.unattended,mechanical:value.mechanical===undefined?false:value.mechanical,dr:value.dr??null,condition:value.condition??null};
 if(typeof target.name!=='string'||target.name.trim().length>100||/[\r\n\0]/.test(target.name)||typeof target.distance!=='number'||!Number.isFinite(target.distance)||target.distance<0||target.distance>1000000000||['lineOfSight','unattended','mechanical'].some(k=>typeof target[k]!=='boolean')||target.dr!==null&&!integer(target.dr,0,100000)||target.condition!==null&&!integer(target.condition,0,5))throw new Error('Invalid object declaration');
 target.name=target.name.trim();
 if(eligible&&(!target.name||!target.unattended||!target.lineOfSight||target.distance>rule.range))throw new Error('Choose an unattended object within '+rule.range+' squares and Line of Sight');
 return target;
}
function canonicalTarget(pack,target){
 if(!keys(target,'condition,distance,dr,lineOfSight,mechanical,name,unattended'))return false;
 try{return Object.entries(outgoingTarget(pack,target)).every(([k,v])=>target[k]===v);}catch{return false;}
}
export function validateOutgoingSnapshot(pack,snapshot){
 if(!keys(snapshot,'powerId,target')||!outgoingPowerRule(pack,snapshot.powerId)||!canonicalTarget(pack,snapshot.target))throw new Error('Invalid outgoing power snapshot');
 return snapshot.target;
}
export function validateOutgoingUpkeepSnapshot(pack,snapshot){
 if(!keys(snapshot,'effectId,enhanced,family,powerId,target,turn')||snapshot.family!=='outgoing'||!uuid(snapshot.effectId)||!outgoingPowerRule(pack,snapshot.powerId)||typeof snapshot.enhanced!=='boolean'||!integer(snapshot.turn,1,1000000000)||!canonicalTarget(pack,snapshot.target))throw new Error('Invalid outgoing upkeep snapshot');
 return snapshot.target;
}
const validCheck=check=>keys(check,'bonus,natural,total')&&integer(check.natural,1,20)&&integer(check.bonus,-100000,100000)&&integer(check.total,-100000,100000)&&check.natural+check.bonus===check.total;
const sameTarget=(a,b)=>object(a)&&object(b)&&Object.keys(a).sort().join()===Object.keys(b).sort().join()&&Object.entries(a).every(([k,v])=>b[k]===v);
const sameSnapshot=(a,b)=>object(a)&&object(b)&&Object.keys(a).sort().join()===Object.keys(b).sort().join()&&Object.entries(a).every(([k,v])=>k==='target'?sameTarget(v,b[k]):b[k]===v);
export function validateOutgoingPowerState(c,pack,bad){
 const rows=c.outgoingPowerEffects;
 if(rows!==undefined){
  if(!c.actionState||!Array.isArray(rows)||rows.length>1000||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>[...(c.resistancePowerEffects||[]),...(c.shieldPowerEffects||[])].some(other=>other.id===r?.id))){bad('outgoing power effects');return;}
  for(const row of rows){
   const rule=outgoingPowerRule(pack,row?.powerId);
   if(!keys(row,'ended,endsRemaining,enhanced,id,maintained,maxTier,pending,powerId,target,tier')||!rule||!uuid(row.id)||!canonicalTarget(pack,row.target)||!integer(row.maxTier,1,rule.thresholds.length)||!integer(row.tier,1,row.maxTier)||typeof row.enhanced!=='boolean'||typeof row.maintained!=='boolean'||!integer(row.endsRemaining,1,2)||typeof row.ended!=='boolean'||row.ended&&row.endsRemaining!==1){bad('outgoing power effect');return;}
   if(row.pending!==null&&(!row.maintained||!keys(row.pending,'check,damage')||!integer(row.pending.damage,1,1000000000)||row.pending.check!==null&&!validCheck(row.pending.check))){bad('outgoing concentration check');return;}
  }
 }
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const o=step.options||{},activation=o.outgoingPowerSnapshot,upkeep=o.maintenancePowerSnapshot?.family==='outgoing'?o.maintenancePowerSnapshot:undefined,resolution=o.outgoingPowerResolution,rule=outgoingPowerRule(pack,o.effectPowerId);
  try{
   if(o.outgoing!==undefined){
    const copy=c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===o.powerId);
    if(step.action!=='power'||!outgoingPowerRule(pack,o.effectPowerId??copy?.powerId))throw new Error();
    if(step.status==='queued')outgoingTarget(pack,o.outgoing,false);
   }
   if(activation===undefined&&upkeep===undefined){if(rule||resolution!==undefined||o.outgoing!==undefined&&step.status!=='queued')throw new Error();continue;}
   if(activation!==undefined&&upkeep!==undefined||step.status==='queued'||!rule||!integer(step.result?.check?.total,-100000,100000))throw new Error();
   if(o.effectDC!==undefined&&o.effectDC!==null&&!rule.thresholds.some(t=>t.dc===o.effectDC))throw new Error();
   if(activation!==undefined){validateOutgoingSnapshot(pack,activation);if(step.action!=='power'||activation.powerId!==rule.powerId)throw new Error();}
   else {validateOutgoingUpkeepSnapshot(pack,upkeep);if(step.action!=='maintain-power'||upkeep.powerId!==rule.powerId||upkeep.effectId!==o.effectId||upkeep.turn!==step.turn||step.result.enhanceAllowed)throw new Error();}
   if(step.result.outcomeAllowed!==undefined||step.result.rerollAllowed||step.result.effectChoiceAllowed&&rule.thresholds.filter(t=>t.dc<=step.result.check.total).length<2||step.result.enhanceAllowed&&!outgoingPowerTier(pack,rule.powerId,step.result.check.total,o.effectDC??null))throw new Error();
   if(step.status==='waiting'){
    if(resolution!==undefined||!step.result.fpAllowed&&!step.result.enhanceAllowed&&!step.result.effectChoiceAllowed)throw new Error();
    if(upkeep){const row=rows?.find(r=>r.id===upkeep.effectId);if(!row||row.powerId!==upkeep.powerId||row.enhanced!==upkeep.enhanced||!sameTarget(upkeep.target,row.target)||upkeep.turn!==c.actionState.turn)throw new Error();}
   }else{
    if(!keys(resolution,'effectId,enhanced,phase,status,tier,total')||!['applied','failed','released'].includes(resolution.status)||resolution.phase!==(upkeep?'upkeep':'activation')||resolution.effectId!==(upkeep?upkeep.effectId:step.id)||resolution.total!==step.result.check.total||typeof resolution.enhanced!=='boolean'||!integer(resolution.tier,0,rule.thresholds.length)||resolution.status==='applied'!==(resolution.tier>0)||resolution.status==='released'&&(!upkeep||step.result.fpAllowed||step.result.enhanceAllowed||step.result.effectChoiceAllowed!==undefined)||upkeep&&resolution.enhanced!==upkeep.enhanced||!upkeep&&resolution.status==='failed'&&resolution.enhanced)throw new Error();
    if(resolution.status!=='released'&&resolution.tier!==outgoingPowerTier(pack,rule.powerId,step.result.check.total,o.effectDC??null))throw new Error();
   }
  }catch{bad('outgoing power saved result');}
 }
}

export function outgoingPowerSnapshot(c,pack,selection){
 const target=outgoingTarget(pack,selection);
 if((c.outgoingPowerEffects?.length||0)>=1000)throw new Error('Too many ongoing power effects');
 return {powerId:'power:cryokinesis',target};
}
export function outgoingPowerTier(pack,id,total,effectDC=null){
 const rule=outgoingPowerRule(pack,id);
 if(!rule||!integer(total,-100000,100000)||effectDC!==null&&!rule.thresholds.some(t=>t.dc===effectDC))throw new Error('Invalid outgoing power check');
 return rule.thresholds.filter(t=>t.dc<=total&&(effectDC===null||t.dc<=effectDC)).length;
}
export function outgoingPowerResult(pack,check,snapshot,{enhanced=false,effectDC=null,upkeep=false}={}){
 const target=validateOutgoingSnapshot(pack,snapshot),rule=outgoingPowerRule(pack,snapshot.powerId),tier=outgoingPowerTier(pack,snapshot.powerId,check?.total,effectDC);
 if(typeof enhanced!=='boolean'||typeof upkeep!=='boolean'||enhanced&&!tier&&!upkeep)throw new Error('Outgoing enhancement unavailable');
 if(!tier)return {text:target.name+': '+(upkeep?'Cryokinesis released':'No effect'),html:'',applied:false,tier:0,drPenalty:0,conditionSteps:0};
 const drPenalty=rule.thresholds[tier-1].drPenalty+(enhanced?rule.enhancement.drPenalty:0),conditionSteps=!upkeep&&target.mechanical?rule.initialConditionSteps:0;
 const declaredDRAfter=target.dr===null?null:Math.max(0,target.dr-drPenalty),declaredConditionAfter=conditionSteps&&target.condition!==null?Math.min(5,target.condition+conditionSteps):null;
 const ceasesFunctioning=conditionSteps>0&&target.condition!==null&&target.condition<5&&declaredConditionAfter===5;
 const text=target.name+': DR -'+drPenalty+(conditionSteps?'; Condition -'+conditionSteps:'')+(ceasesFunctioning?'; Disabled until repaired':'');
 const details=(declaredDRAfter===null?'':'Declared DR '+target.dr+' → '+declaredDRAfter)+(declaredConditionAfter===null?'':(declaredDRAfter===null?'':'; ')+'Declared Condition '+target.condition+' → '+declaredConditionAfter);
 const html=`<p>${escape(text)}</p>${details?`<details><summary>Object</summary>${escape(details)}</details>`:''}<details><summary>Duration</summary>Until the end of your next turn</details>${conditionSteps?'<details><summary>Condition</summary>An object moved to the bottom ceases to function until repaired, but is otherwise unharmed.</details>':''}`;
 return {text,html,applied:true,tier,drPenalty,conditionSteps,duration:rule.duration,...(declaredDRAfter===null?{}:{declaredDRAfter}),...(declaredConditionAfter===null?{}:{declaredConditionAfter}),...(ceasesFunctioning?{ceasesFunctioning:true}:{})};
}
const saveResolution=(step,effectId,phase,status,check,tier,enhanced)=>{step.options.outgoingPowerResolution={effectId,phase,status,total:check.total,tier,enhanced};};
function unresolvedStep(c,id){
 const step=c.actionState?.plan.find(s=>s.id===id);
 if(!uuid(id)||!step||step.status==='done'||step.options.outgoingPowerResolution!==undefined)throw new Error('Outgoing power already resolved or unavailable');
 return step;
}
export function finishOutgoingPower(c,pack,id,check,snapshot,{enhanced=false,effectDC=null}={}){
 const step=unresolvedStep(c,id);validateOutgoingSnapshot(pack,snapshot);
 if(step.action!=='power'||effectDC!==(step.options.effectDC??null)||step.options.effectPowerId!==snapshot.powerId||!sameSnapshot(step.options.outgoingPowerSnapshot,snapshot)||step.result?.check&&step.result.check.total!==check.total||c.outgoingPowerEffects?.some(r=>r.id===id))throw new Error('Outgoing power snapshot changed');
 const result=outgoingPowerResult(pack,check,snapshot,{enhanced,effectDC});
 if(result.applied){
  if((c.outgoingPowerEffects?.length||0)>=1000)throw new Error('Too many ongoing power effects');
  c.outgoingPowerEffects??=[];c.outgoingPowerEffects.push({id,powerId:snapshot.powerId,target:structuredClone(snapshot.target),maxTier:outgoingPowerTier(pack,snapshot.powerId,check.total),tier:result.tier,enhanced,endsRemaining:2,ended:false,maintained:false,pending:null});
 }
 saveResolution(step,id,'activation',result.applied?'applied':'failed',check,result.tier,enhanced);return result;
}
export function outgoingMaintenancePlan(c,d,pack,id){
 const row=c.outgoingPowerEffects?.find(r=>r.id===id),rule=outgoingPowerRule(pack,row?.powerId);
 if(!row||!rule||row.pending||c.actionState?.ended||d.incapacitated||d.helpless||!d.skills.find(s=>s.id==='skill:use-the-force')?.available||!d.forcePowers.some(p=>p.id===row.powerId))throw new Error('Outgoing maintenance unavailable');
 return {row,rule,name:pack.forcePowers.find(p=>p.id===row.powerId).name};
}
export function finishOutgoingUpkeep(c,pack,id,check,snapshot,{effectDC=null}={}){
 const step=unresolvedStep(c,id);validateOutgoingUpkeepSnapshot(pack,snapshot);
 const row=c.outgoingPowerEffects?.find(r=>r.id===snapshot.effectId);
 if(step.action!=='maintain-power'||effectDC!==(step.options.effectDC??null)||step.options.effectPowerId!==snapshot.powerId||!sameSnapshot(step.options.maintenancePowerSnapshot,snapshot)||snapshot.turn!==c.actionState.turn||!row||row.pending||row.powerId!==snapshot.powerId||row.enhanced!==snapshot.enhanced||!sameTarget(snapshot.target,row.target)||step.result?.check&&step.result.check.total!==check.total)throw new Error('Outgoing upkeep changed');
 const result=outgoingPowerResult(pack,check,{powerId:snapshot.powerId,target:snapshot.target},{enhanced:snapshot.enhanced,effectDC,upkeep:true});
 if(result.applied){row.maxTier=outgoingPowerTier(pack,row.powerId,check.total);row.tier=result.tier;row.endsRemaining=2;row.ended=false;row.maintained=true;}
 else removeOutgoingPower(c,row.id,{resolving:true});
 saveResolution(step,row.id,'upkeep',result.applied?'applied':'failed',check,result.tier,snapshot.enhanced);return result;
}
function releaseSteps(c,id,row){
 const steps=(c.actionState?.plan||[]).filter(s=>s.status==='waiting'&&s.action==='maintain-power'&&s.options.maintenancePowerSnapshot?.family==='outgoing'&&s.options.maintenancePowerSnapshot.effectId===id);
 for(const step of steps){const snapshot=step.options.maintenancePowerSnapshot;if(!keys(snapshot,'effectId,enhanced,family,powerId,target,turn')||snapshot.powerId!==row.powerId||snapshot.enhanced!==row.enhanced||!sameTarget(snapshot.target,row.target)||!integer(snapshot.turn,1,1000000000)||!integer(step.result?.check?.total,-100000,100000))throw new Error('Invalid pending outgoing upkeep');}
 return steps;
}
export function removeOutgoingPower(c,id,{resolving=false}={}){
 const row=c.outgoingPowerEffects?.find(r=>r.id===id);if(!row)throw new Error('Outgoing power unavailable');
 const steps=resolving?[]:releaseSteps(c,id,row);
 for(const step of steps){saveResolution(step,id,'upkeep','released',step.result.check,0,step.options.maintenancePowerSnapshot.enhanced);step.status='done';step.result.fpAllowed=false;step.result.enhanceAllowed=false;delete step.result.effectChoiceAllowed;step.result.text+='; released';}
 c.outgoingPowerEffects=c.outgoingPowerEffects.filter(r=>r.id!==id);if(!c.outgoingPowerEffects.length)delete c.outgoingPowerEffects;
}
export function clearOutgoingPowers(c){const rows=[...(c.outgoingPowerEffects||[])];for(const row of rows)releaseSteps(c,row.id,row);for(const row of rows)removeOutgoingPower(c,row.id);}
function changeTurn(c,resolver){
 if(!c.outgoingPowerEffects)return;
 if(pendingOutgoingChecks(c).length)throw new Error('Resolve outgoing concentration first');
 const next=resolver(c.outgoingPowerEffects),kept=new Set(next.map(r=>r.id));
 const expired=c.outgoingPowerEffects.filter(row=>!kept.has(row.id));
 for(const row of expired)releaseSteps(c,row.id,row);
 for(const row of expired)removeOutgoingPower(c,row.id);
 if(next.length)c.outgoingPowerEffects=next;else delete c.outgoingPowerEffects;
}
export const endOutgoingPowerTurn=c=>changeTurn(c,endTurnEffects);
export const startOutgoingPowerTurn=c=>changeTurn(c,startTurnEffects);
export function advanceOutgoingTime(c,rounds){if(!integer(rounds,0,1000000000))throw new Error('Invalid elapsed rounds');if(rounds>0&&pendingOutgoingChecks(c).length)throw new Error('Resolve outgoing concentration first');if(rounds>=2)clearOutgoingPowers(c);}
export const pendingOutgoingChecks=c=>(c.outgoingPowerEffects||[]).filter(r=>r.pending);
export function requireOutgoingDamageChecks(c,damage){
 if(!integer(damage,0,1000000000)||pendingOutgoingChecks(c).length)throw new Error('Resolve outgoing concentration first');
 const rows=(c.outgoingPowerEffects||[]).filter(r=>r.maintained&&damage>0);
 for(const row of rows)row.pending={damage,check:null};return rows.map(r=>r.id);
}
export function recordOutgoingDamageCheck(c,id,check){
 const row=c.outgoingPowerEffects?.find(r=>r.id===id);
 if(!row?.pending||row.pending.check||!validCheck(check))throw new Error('Invalid outgoing concentration roll');
 row.pending.check={natural:check.natural,bonus:check.bonus,total:check.total};
}
export function finishOutgoingDamageCheck(c,pack,id,fpBonus=0){
 const row=c.outgoingPowerEffects?.find(r=>r.id===id),rule=outgoingPowerRule(pack,row?.powerId);
 if(!row?.pending?.check||!rule||!integer(fpBonus,0,1000))throw new Error('Outgoing concentration roll unavailable');
 const dc=rule.damageCheck.baseDC+row.pending.damage,total=row.pending.check.total+fpBonus,success=total>=dc;
 if(success)row.pending=null;else removeOutgoingPower(c,id);return {dc,total,success};
}
export function activeOutgoingPowers(c,pack){return (c.outgoingPowerEffects||[]).map(row=>({...row,rule:outgoingPowerRule(pack,row.powerId),name:pack.forcePowers.find(p=>p.id===row.powerId).name,drPenalty:outgoingPowerRule(pack,row.powerId).thresholds[row.tier-1].drPenalty+(row.enhanced?outgoingPowerRule(pack,row.powerId).enhancement.drPenalty:0)}));}
