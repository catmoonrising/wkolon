// Closed data/save contracts. Effect calculations and shared runtime dispatch
// are added only after their independent preimplementation review.
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
const sameTarget=(a,b)=>Object.entries(a).every(([k,v])=>b?.[k]===v);
export function validateOutgoingPowerState(c,pack,bad){
 const rows=c.outgoingPowerEffects;
 if(rows!==undefined){
  if(!c.actionState||!Array.isArray(rows)||rows.length>1000||new Set(rows.map(r=>r?.id)).size!==rows.length){bad('outgoing power effects');return;}
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
   if(step.result.outcomeAllowed!==undefined||step.result.rerollAllowed)throw new Error();
   if(step.status==='waiting'){
    if(resolution!==undefined||!step.result.fpAllowed&&!step.result.enhanceAllowed&&!step.result.effectChoiceAllowed)throw new Error();
    if(upkeep){const row=rows?.find(r=>r.id===upkeep.effectId);if(!row||row.powerId!==upkeep.powerId||row.enhanced!==upkeep.enhanced||!sameTarget(upkeep.target,row.target)||upkeep.turn!==c.actionState.turn)throw new Error();}
   }else{
    if(!keys(resolution,'effectId,enhanced,phase,status,tier,total')||!['applied','failed','released'].includes(resolution.status)||resolution.phase!==(upkeep?'upkeep':'activation')||resolution.effectId!==(upkeep?upkeep.effectId:step.id)||resolution.total!==step.result.check.total||typeof resolution.enhanced!=='boolean'||!integer(resolution.tier,0,rule.thresholds.length)||resolution.status==='applied'!==(resolution.tier>0)||resolution.status==='released'&&(!upkeep||step.result.fpAllowed||step.result.enhanceAllowed||step.result.effectChoiceAllowed!==undefined)||upkeep&&resolution.enhanced!==upkeep.enhanced||!upkeep&&resolution.status==='failed'&&resolution.enhanced)throw new Error();
   }
  }catch{bad('outgoing power saved result');}
 }
}
