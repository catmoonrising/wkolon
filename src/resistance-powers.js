import {actionState} from './action-economy.js';

// Saved lifecycle state shared by action, damage and maintenance resolution.
export const pendingResistanceChecks=c=>(c.resistancePowerEffects||[]).filter(s=>s.pending);
export function assertResistanceResolved(c){if(pendingResistanceChecks(c).length)throw new Error('Resolve or release Energy Resistance maintenance');}
export const resistancePowerRule=(pack,id)=>pack.rules.resistancePowers.find(r=>r.powerId===id);
export const resistancePowerTier=(pack,id,total)=>resistancePowerRule(pack,id)?.thresholds.filter(t=>total>=t.dc).length||0;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const uuid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const keys=(v,expected)=>object(v)&&Object.keys(v).sort().join()===expected;

export function validateResistancePowers(c,pack,bad){
 const rows=c.resistancePowerEffects;
 if(rows===undefined)return;
 if(!c.actionState||!Array.isArray(rows)||rows.length>1000||new Set(rows.map(s=>s?.id)).size!==rows.length){bad('resistance power effects');return;}
 for(const s of rows){
  const rule=object(s)&&resistancePowerRule(pack,s.powerId);
  if(!keys(s,'id,maintained,maxTier,pending,powerId,tier,untilTurn,used')||!uuid(s.id)||!rule||!integer(s.maxTier,1,rule.thresholds.length)||!integer(s.tier,1,s.maxTier)||typeof s.used!=='boolean'||typeof s.maintained!=='boolean'||!integer(s.untilTurn,c.actionState.turn,c.actionState.turn+1)){
   bad('resistance power effects');return;
  }
  if(s.pending!==null){
   const p=s.pending,check=p?.check;
   if(!s.maintained||!s.used||s.untilTurn<=c.actionState.turn||!keys(p,'check,damage')||!integer(p.damage,1,1000000000)||check!==null&&(!keys(check,'bonus,natural,total')||!integer(check.natural,1,20)||!integer(check.bonus,-100000,100000)||!integer(check.total,-100000,100000)||check.natural+check.bonus!==check.total)){
    bad('resistance maintenance check');return;
   }
  }
 }
}

export function activeResistancePowers(c,pack){
 return (c.resistancePowerEffects||[]).filter(s=>s.untilTurn>actionState(c).turn).map(s=>{
  const rule=resistancePowerRule(pack,s.powerId);
  return {...s,rule,name:pack.forcePowers.find(p=>p.id===s.powerId).name,dr:rule.thresholds[s.tier-1].dr};
 });
}
export function resistancePowerDR(c,pack,{energy=false,sonic=false,fire=false,cold=false,electrical=false,lightsaber=false,ignoreDR=false,listedSources=false}={}){
 if([energy,sonic,fire,cold,electrical,lightsaber,ignoreDR,listedSources].some(v=>typeof v!=='boolean'))throw new Error('Invalid resistance damage declaration');
 if(lightsaber||ignoreDR||!energy&&!sonic&&!(listedSources&&(fire||cold||electrical)))return 0;
 return Math.max(0,...activeResistancePowers(c,pack).map(s=>s.dr));
}
export function finishResistancePower(c,pack,id,powerId,check){
 const rule=resistancePowerRule(pack,powerId);
 if(!rule||!c.actionState||!uuid(id)||!integer(check?.total,-100000,100000))throw new Error('Invalid resistance power result');
 if(c.resistancePowerEffects?.some(s=>s.id===id))throw new Error('Power effect already resolved');
 const maxTier=resistancePowerTier(pack,powerId,check.total);
 if(!maxTier)return null;
 if((c.resistancePowerEffects?.length||0)>=1000)throw new Error('Too many active effects');
 const row={id,powerId,maxTier,tier:maxTier,used:false,maintained:false,untilTurn:actionState(c).turn+1,pending:null};
 c.resistancePowerEffects??=[];c.resistancePowerEffects.push(row);return row;
}
export function chooseResistancePowerTier(c,pack,id,tier){
 const row=c.resistancePowerEffects?.find(s=>s.id===id);
 if(!row||row.used||row.untilTurn<=actionState(c).turn||!integer(tier,1,row.maxTier))throw new Error('Resistance effect is fixed or unavailable');
 row.tier=tier;
}
export function removeResistancePower(c,id){
 if(!c.resistancePowerEffects?.some(s=>s.id===id))throw new Error('Resistance power unavailable');
 c.resistancePowerEffects=c.resistancePowerEffects.filter(s=>s.id!==id);
 if(!c.resistancePowerEffects.length)delete c.resistancePowerEffects;
}
export function lockResistancePowers(c){
 for(const s of c.resistancePowerEffects||[])if(s.untilTurn>actionState(c).turn)s.used=true;
}
export function resistanceMaintenancePlan(c,d,pack,id){
 const row=c.resistancePowerEffects?.find(s=>s.id===id);
 if(!row||row.pending||row.untilTurn!==actionState(c).turn||d.incapacitated||d.helpless)throw new Error('Resistance maintenance unavailable');
 return {row,rule:resistancePowerRule(pack,row.powerId),name:pack.forcePowers.find(p=>p.id===row.powerId).name};
}
export function renewResistancePower(c,id){
 const row=c.resistancePowerEffects?.find(s=>s.id===id);
 if(!row||row.pending||row.untilTurn!==actionState(c).turn)throw new Error('Resistance maintenance unavailable');
 row.untilTurn=actionState(c).turn+1;row.maintained=true;
}
export function requireResistanceDamageChecks(c,pack,damage){
 if(!integer(damage,0,1000000000))throw new Error('Invalid maintenance damage');
 const rows=activeResistancePowers(c,pack);
 if(rows.some(s=>s.pending))throw new Error('Resolve the pending resistance check');
 if(!damage)return [];
 const ids=rows.filter(s=>s.maintained).map(s=>s.id);
 for(const row of c.resistancePowerEffects||[])if(ids.includes(row.id)){row.used=true;row.pending={damage,check:null};}
 return ids;
}
export function recordResistanceDamageCheck(c,id,check){
 const row=c.resistancePowerEffects?.find(s=>s.id===id);
 if(!row?.pending||row.pending.check||!integer(check?.natural,1,20)||!integer(check.bonus,-100000,100000)||!integer(check.total,-100000,100000)||check.natural+check.bonus!==check.total)throw new Error('Invalid resistance maintenance roll');
 row.pending.check={natural:check.natural,bonus:check.bonus,total:check.total};
}
export function finishResistanceDamageCheck(c,pack,id,fpBonus=0){
 const row=c.resistancePowerEffects?.find(s=>s.id===id);
 if(!row?.pending?.check||!integer(fpBonus,0,1000))throw new Error('Resistance maintenance roll unavailable');
 const dc=resistancePowerRule(pack,row.powerId).damageCheck.baseDC+row.pending.damage;
 const total=row.pending.check.total+fpBonus,success=total>=dc;
 if(success)row.pending=null;else removeResistancePower(c,id);
 return {dc,total,success};
}
export function clearResistancePowers(c){delete c.resistancePowerEffects;}
