import {outgoingPowerRule,finishOutgoingUpkeep,validateOutgoingUpkeepSnapshot} from './outgoing-powers.js';
import {actionState,checkForcePointAvailable} from './action-economy.js';
import {ambiguityValue} from './house-rules.js';
import {resistancePowerRule,resistancePowerTier,resistancePowerLabel,removeResistancePower} from './resistance-powers.js';

const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const keys=(v,list)=>object(v)&&Object.keys(v).sort().join()===list;
const uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
export const checkedMaintenanceRule=(pack,id)=>{const r=outgoingPowerRule(pack,id)||resistancePowerRule(pack,id);return r?.maintenanceCheck?r:null;};
export const upkeepAdeptAvailable=(c,d,pack,powerId)=>{
 const rule=checkedMaintenanceRule(pack,powerId);
 return !!rule&&ambiguityValue(c,pack,rule.upkeepAdeptAmbiguityId)==='upkeep'&&d.forcePowers.some(p=>p.id===powerId&&p.adept);
};
export function checkedMaintenancePlan(c,d,pack,maintenance,options){
 const {row,rule}=maintenance,rollMode=options.rollMode||'roll',skill=d.skills.find(s=>s.id==='skill:use-the-force');
 if(!skill?.available||!['roll','adept'].includes(rollMode))throw new Error('Upkeep check unavailable');
 if(rollMode==='adept'&&!upkeepAdeptAvailable(c,d,pack,row.powerId))throw new Error('Force Power Adept unavailable for upkeep');
 if(options.fp!==undefined&&!['none','ask'].includes(options.fp))throw new Error('Invalid upkeep Force Point choice');
 const forceCost=rollMode==='adept'?1:0;
 return {row,rule,rollMode,bonus:skill.total,forceCost,fpAllowed:rollMode==='roll'&&checkForcePointAvailable(c,d,{forceCost}),snapshot:{...(maintenance.family==='outgoing'?{family:'outgoing',target:structuredClone(row.target)}:{}),effectId:row.id,powerId:row.powerId,enhanced:row.enhanced,turn:actionState(c).turn}};
}
export function finishCheckedMaintenance(c,pack,snapshot,check){
 const row=c.resistancePowerEffects?.find(s=>s.id===snapshot?.effectId),rule=checkedMaintenanceRule(pack,snapshot?.powerId);
 if(!validSnapshot(snapshot,pack)||!row||row.powerId!==snapshot.powerId||row.enhanced!==snapshot.enhanced||row.pending||row.untilTurn!==snapshot.turn||snapshot.turn!==actionState(c).turn||!integer(check?.total,-100000,100000))throw new Error('Upkeep effect changed');
 const tier=resistancePowerTier(pack,row.powerId,check.total);
 if(!tier){removeResistancePower(c,row.id,{resolving:true});return 'Cloak released';}
 row.maxTier=tier;row.tier=tier;row.used=false;row.maintained=true;row.untilTurn=actionState(c).turn+1;
 return resistancePowerLabel(row,pack);
}
function validSnapshot(s,pack){return keys(s,'effectId,enhanced,powerId,turn')&&uuid(s.effectId)&&!!checkedMaintenanceRule(pack,s.powerId)&&typeof s.enhanced==='boolean'&&integer(s.turn,1,1000000000);}
export function validateCheckedMaintenance(c,pack,bad){
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const snap=step.options?.maintenancePowerSnapshot;
  if(snap===undefined){if(step.action==='maintain-power'&&step.result?.check)bad('upkeep snapshot');continue;}
  if(snap.family==='outgoing'){try{validateOutgoingUpkeepSnapshot(pack,snap);if(step.action!=='maintain-power'||step.status==='queued')throw new Error();}catch{bad('outgoing upkeep snapshot');}continue;}
  if(step.action!=='maintain-power'||step.status==='queued'||!validSnapshot(snap,pack)||snap.effectId!==step.options.effectId||snap.turn!==step.turn||!step.result?.check)bad('upkeep snapshot');
  if(step.status==='waiting'){
   const row=c.resistancePowerEffects?.find(s=>s.id===snap.effectId);
   if(!row||row.powerId!==snap.powerId||row.enhanced!==snap.enhanced||row.pending||row.untilTurn!==snap.turn||snap.turn!==c.actionState.turn||step.result.enhanceAllowed||step.result.rerollAllowed||step.result.effectChoiceAllowed)bad('pending upkeep');
  }
 }
}

export function finishCheckedMaintenanceResult(c,pack,snapshot,check,{stepId,effectDC}={}){return snapshot?.family==='outgoing'?finishOutgoingUpkeep(c,pack,stepId,check,snapshot,{effectDC:effectDC??null}):{text:finishCheckedMaintenance(c,pack,snapshot,check)};}
