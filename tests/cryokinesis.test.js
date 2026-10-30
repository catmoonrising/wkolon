import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/cryokinesis-fixtures.cjs';
import {takeAction,finishForceChoice,beginNextTurn,endCurrentTurn,endTrackedCombat,previewPlan,previewNextTurn,rollResistanceMaintenance,finishResistanceMaintenance} from '../src/action-engine.js';
import {choosePowerEffectTier} from '../src/power-effect-choices.js';
import {queueAction,emptyActionState} from '../src/action-economy.js';
import {activeOutgoingPowers,removeOutgoingPower} from '../src/outgoing-powers.js';
import {pendingMaintenanceChecks} from '../src/maintenance-checks.js';
import {applyIncomingDamage} from '../src/incoming-damage.js';
import {advanceTimedTalents} from '../src/timed-talents.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {recoverSuite} from '../src/force-powers.js';
import {newDay,restEightHours} from '../src/recovery.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),pid='power:cryokinesis';
const target=extra=>({name:'Door',unattended:true,lineOfSight:true,distance:12,mechanical:true,dr:10,condition:4,...extra});
const opts=(c,extra={})=>({powerId:api.derive(c,pack).forcePowers.find(p=>p.id===pid&&!p.spent).copyId,action:'standard-action',rollMode:'roll',fp:'none',enhance:false,effectDC:20,outgoing:target(),...extra});
const roll=(natural=10,bonus=16)=>expr=>({value:natural+bonus,d20:[natural],display:expr}),noRoll=()=>assert.fail('No RNG expected');
const pending=c=>c.actionState.plan.find(s=>s.status==='waiting'),step=c=>c.actionState.plan.at(-1),upkeep=(c,id,extra={})=>takeAction(c,pack,'maintain-power',{effectId:id,rollMode:'roll',fp:'none',effectDC:20,...extra},roll());
const atomic=(c,fn)=>{const before=structuredClone(c);assert.throws(fn);assert.deepEqual(c,before);};
function cast(){const c=f.adept();takeAction(c,pack,'power',opts(c),roll());return c;}

test('genuine Cryokinesis builds use Standard activation, snapshot target and apply only external DR/initial CT',()=>{
 const c=cast(),d=api.derive(c,pack),r=c.outgoingPowerEffects[0];assert.deepEqual(d.issues,[]);assert.deepEqual(c.actionState.spent,['standard']);assert.equal(r.maxTier,2);assert.equal(r.tier,1);assert.equal(d.outgoingPowers[0].drPenalty,5);assert.equal(step(c).options.outgoingPowerResolution.phase,'activation');assert.equal(c.condition,0);assert.equal(c.protection.dr,0);assert.match(step(c).result.text,/Condition -1/);assert.equal(step(c).status,'done');
});
test('lesser choice and initial special FP resolve once, with a frozen target and one FP ledger',()=>{
 const c=f.adept(),fp=c.forcePoints;takeAction(c,pack,'power',opts(c,{effectDC:null,enhance:true}),roll());assert.equal(pending(c).result.effectChoiceAllowed,true);assert.equal(c.outgoingPowerEffects,undefined);const id=pending(c).id;choosePowerEffectTier(c,pack,id,20);pending(c).options.outgoing=target({name:'Other'});finishForceChoice(c,pack,id,'enhance',noRoll);assert.equal(c.forcePoints,fp-1);assert.equal(c.outgoingPowerEffects[0].target.name,'Door');assert.equal(activeOutgoingPowers(c,pack)[0].drPenalty,10);atomic(c,()=>finishForceChoice(c,pack,id,false,noRoll));
});
test('Swift upkeep has its own check/cost, persistent enhancement, no extra CT/copy/recovery and repeat renewals',()=>{
 const c=f.adept();takeAction(c,pack,'power',opts(c,{enhance:true}),roll());finishForceChoice(c,pack,pending(c).id,'enhance',noRoll);const id=c.outgoingPowerEffects[0].id,spent=JSON.stringify(c.levels.flatMap(l=>l.forcePowers||[])),fp=c.forcePoints;upkeep(c,id);assert.deepEqual(c.actionState.spent,['standard','swift']);assert.equal(c.outgoingPowerEffects[0].maintained,true);assert.equal(activeOutgoingPowers(c,pack)[0].drPenalty,10);assert(!step(c).result.text.includes('Condition'));assert.equal(c.forcePoints,fp);assert.equal(JSON.stringify(c.levels.flatMap(l=>l.forcePowers||[])),spent);assert.equal(c.forcePowerRecoveryPending,undefined);upkeep(c,id);assert.deepEqual(c.actionState.spent,['standard','swift','move']);assert.equal(c.outgoingPowerEffects[0].endsRemaining,2);atomic(c,()=>upkeep(c,id));
});
test('end-next-turn omitted automatic upkeep stays alive for late renewal, with repeated End and skipped End correct',()=>{
 const c=cast(),id=c.outgoingPowerEffects[0].id;endCurrentTurn(c,pack);endCurrentTurn(c,pack);assert.equal(c.outgoingPowerEffects[0].endsRemaining,1);beginNextTurn(c,pack);assert.equal(c.outgoingPowerEffects[0].endsRemaining,1);upkeep(c,id);endCurrentTurn(c,pack);beginNextTurn(c,pack);assert.equal(c.outgoingPowerEffects[0].endsRemaining,1);endCurrentTurn(c,pack);assert.equal(c.outgoingPowerEffects,undefined);
 const q=cast();beginNextTurn(q,pack);assert.equal(q.outgoingPowerEffects.length,1);beginNextTurn(q,pack);assert.equal(q.outgoingPowerEffects,undefined);
});
test('ordinary FP rescues a failed upkeep before release and may unlock a lesser-tier decision',()=>{
 const c=cast(),id=c.outgoingPowerEffects[0].id;beginNextTurn(c,pack);takeAction(c,pack,'maintain-power',{effectId:id,fp:'ask',rollMode:'roll',effectDC:null},roll(3));assert.equal(pending(c).result.check.total,19);assert.equal(c.outgoingPowerEffects.length,1);finishForceChoice(c,pack,pending(c).id,true,()=>({value:6,display:'6'}));assert.equal(pending(c).result.effectChoiceAllowed,true);choosePowerEffectTier(c,pack,pending(c).id,20);finishForceChoice(c,pack,pending(c).id,false,noRoll);assert.equal(c.outgoingPowerEffects[0].tier,1);assert.equal(c.outgoingPowerEffects[0].maintained,true);assert.equal(step(c).options.outgoingPowerResolution.total,25);
});
test('initial Adept/Mastery and natural20 recovery retain effects; upkeep20 never recovers copies',()=>{
 const c=f.adept({mastery:true});takeAction(c,pack,'power',opts(c,{rollMode:'take10'}),noRoll);assert.equal(step(c).result.check.natural,10);beginNextTurn(c,pack);const id=c.outgoingPowerEffects[0].id;takeAction(c,pack,'maintain-power',{effectId:id,fp:'none',effectDC:20},roll(20));assert.equal(c.forcePowerRecoveryPending,undefined);
 const a=f.adept();takeAction(a,pack,'power',opts(a,{rollMode:'adept'}),roll(20));assert(a.forcePowerRecoveryPending);endCurrentTurn(a,pack);assert.equal(a.forcePowerRecoveryPending,false);assert.equal(a.outgoingPowerEffects.length,1);assert(a.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));
});
test('concentration uses actual penetrating damage only after maintenance and cannot reroll; failure closes saved upkeep',()=>{
 const c=cast(),id=c.outgoingPowerEffects[0].id;applyIncomingDamage(c,api.derive(c,pack),pack,1);assert.deepEqual(pendingMaintenanceChecks(c),[]);upkeep(c,id);applyIncomingDamage(c,api.derive(c,pack),pack,7);assert.equal(pendingMaintenanceChecks(c).length,1);atomic(c,()=>beginNextTurn(c,pack));rollResistanceMaintenance(c,pack,id,roll());atomic(c,()=>rollResistanceMaintenance(c,pack,id,noRoll));const r=finishResistanceMaintenance(c,pack,id,false,noRoll);assert.equal(r.success,true);assert.equal(pendingMaintenanceChecks(c).length,0);
 beginNextTurn(c,pack);takeAction(c,pack,'maintain-power',{effectId:id,fp:'ask',effectDC:20},roll());const saved=pending(c);applyIncomingDamage(c,api.derive(c,pack),pack,20);rollResistanceMaintenance(c,pack,id,roll(1));finishResistanceMaintenance(c,pack,id,false,noRoll);assert.equal(c.outgoingPowerEffects,undefined);assert.equal(saved.id,c.actionState.plan.at(-1).id);assert.equal(step(c).status,'done');assert.equal(step(c).options.outgoingPowerResolution.status,'released');
});
test('source loss permits release but rejects new upkeep or finalization without RNG/mutation',()=>{
 const c=cast(),id=c.outgoingPowerEffects[0].id;upkeep(c,id,{fp:'ask'});const pendingId=pending(c).id;for(const l of c.levels)for(const p of l.forcePowers||[])if(p.powerId===pid){p.powerId='power:surge';delete p.action;}atomic(c,()=>finishForceChoice(c,pack,pendingId,false,noRoll));removeOutgoingPower(c,id);api.validateCharacter(c,pack);assert.equal(step(c).status,'done');assert.equal(step(c).options.outgoingPowerResolution.status,'released');
});
test('pure previews reserve actions without RNG/UUID or mutation, and coarse waits/long rest/suite expire effects',()=>{
 const c=cast(),id=c.outgoingPowerEffects[0].id;queueAction(c,'maintain-power',{effectId:id,fp:'none',effectDC:20});const before=structuredClone(c),uuid=crypto.randomUUID;crypto.randomUUID=noRoll;try{previewPlan(c,pack);previewNextTurn(c,pack);assert.deepEqual(c,before);}finally{crypto.randomUUID=uuid;}
 for(const expire of [x=>advanceTimedTalents(x,10),x=>recoverSuite(x,api.derive(x,pack)),x=>newDay(x,pack),x=>restEightHours(x,api.derive(x,pack),pack)]){const q=cast();expire(q);assert.equal(q.outgoingPowerEffects,undefined);api.validateCharacter(q,pack);}
 const q=cast();endTrackedCombat(q);assert.equal(q.outgoingPowerEffects.length,1);startNextTurn(q);assert.equal(q.outgoingPowerEffects.length,1);startNextTurn(q);assert.equal(q.outgoingPowerEffects,undefined);
});
test('legacy manual waiting records stay manual and premature snapshots/results reject before costs',()=>{
 const c=f.adept();takeAction(c,pack,'power',opts(c,{enhance:true}),roll());const s=pending(c);delete s.options.outgoingPowerSnapshot;delete s.options.outgoing;delete s.options.effectPowerId;api.validateCharacter(c,pack);finishForceChoice(c,pack,s.id,'enhance',noRoll);assert.match(step(c).result.text,/enhancement manual/);assert.equal(c.outgoingPowerEffects,undefined);
 const q=f.adept();atomic(q,()=>takeAction(q,pack,'power',opts(q,{outgoingPowerResolution:{}}),noRoll));atomic(q,()=>takeAction(q,pack,'power',opts(q,{outgoing:target({unattended:false})}),noRoll));
});

test('automatic upkeep preserves omitted outgoing effects, exposes expiry correctly and preflights mixed costs before RNG',()=>{
 const c=cast(),id=c.outgoingPowerEffects[0].id;beginNextTurn(c,pack,{maintain:[id],maintenanceOptions:{[id]:{fp:'none'}}},roll());if(pending(c))finishForceChoice(c,pack,pending(c).id,false,noRoll);assert.equal(c.outgoingPowerEffects[0].maintained,true);assert.deepEqual(c.actionState.spent,['swift']);assert.equal(c.outgoingPowerEffects[0].endsRemaining,2);
 beginNextTurn(c,pack);assert.equal(c.outgoingPowerEffects[0].endsRemaining,1);atomic(c,()=>beginNextTurn(c,pack,{maintain:[id]},noRoll));assert.equal(c.outgoingPowerEffects[0].endsRemaining,1);
 const q=cast();q.resistancePowerEffects=Array.from({length:2},()=>({id:crypto.randomUUID(),powerId:'power:cloak',maxTier:1,tier:1,used:false,maintained:false,untilTurn:2,pending:null,enhanced:false}));api.validateCharacter(q,pack);atomic(q,()=>beginNextTurn(q,pack,{maintain:[q.outgoingPowerEffects[0].id,...q.resistancePowerEffects.map(r=>r.id)]},noRoll));
});
test('invalid target/capacity/time declarations are atomic before RNG, source access or copy expenditure',()=>{
 const c=f.adept();for(const change of [t=>t.unattended=false,t=>t.lineOfSight=false,t=>t.distance=13,t=>t.condition=6,t=>t.dr=-1]){const outgoing=target();change(outgoing);atomic(c,()=>takeAction(c,pack,'power',opts(c,{outgoing}),noRoll));}
 const q=cast(),seed=structuredClone(q.outgoingPowerEffects[0]);q.outgoingPowerEffects=Array.from({length:1000},()=>({...seed,id:crypto.randomUUID()}));beginNextTurn(q,pack);atomic(q,()=>takeAction(q,pack,'power',opts(q),noRoll));
 const p=cast(),id=p.outgoingPowerEffects[0].id;upkeep(p,id);applyIncomingDamage(p,api.derive(p,pack),pack,1);atomic(p,()=>advanceTimedTalents(p,10));atomic(p,()=>recoverSuite(p,api.derive(p,pack)));atomic(p,()=>restEightHours(p,api.derive(p,pack),pack));
});
