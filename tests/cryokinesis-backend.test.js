import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as p from '../src/outgoing-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),pid='power:cryokinesis',actor=()=>({levels:[],currentHP:30,condition:0,protection:{dr:5},actionState:{turn:1,plan:[],history:[]}});
const raw=extra=>({name:'Door',distance:12,lineOfSight:true,unattended:true,mechanical:true,dr:10,condition:4,...extra}),check=total=>({natural:10,bonus:total-10,total}),valid=c=>p.validateOutgoingPowerState(c,pack,m=>{throw new Error(m);});
const atomic=(c,fn)=>{const before=structuredClone(c);assert.throws(fn);assert.deepEqual(c,before);};
function activate(c,total=35,{enhanced=false,effectDC=null,target={}}={}){const snapshot=p.outgoingPowerSnapshot(c,pack,raw(target)),s={id:crypto.randomUUID(),action:'power',status:'queued',options:{effectPowerId:pid,outgoingPowerSnapshot:snapshot,...(effectDC===null?{}:{effectDC})}};c.actionState.plan.push(s);const r=p.finishOutgoingPower(c,pack,s.id,check(total),snapshot,{enhanced,effectDC});s.status='done';s.turn=c.actionState.turn;s.result={text:r.text,check:check(total)};valid(c);return {s,r};}
function stage(c,id){const row=c.outgoingPowerEffects.find(r=>r.id===id),snapshot={family:'outgoing',effectId:id,powerId:pid,enhanced:row.enhanced,turn:c.actionState.turn,target:structuredClone(row.target)},s={id:crypto.randomUUID(),action:'maintain-power',status:'waiting',turn:c.actionState.turn,options:{effectId:id,effectPowerId:pid,maintenancePowerSnapshot:snapshot},result:{text:'pending',check:check(25),fpAllowed:true,enhanceAllowed:false}};c.actionState.plan.push(s);return {s,snapshot};}
function renew(c,id,total=25){const {s,snapshot}=stage(c,id);s.result.check=check(total);const r=p.finishOutgoingUpkeep(c,pack,s.id,check(total),snapshot);s.status='done';s.result.text=r.text;valid(c);return r;}

test('all thresholds, lower caps, special enhancement and declared DR floor are numeric without touching caster',()=>{
 for(const total of [19,20,24,25,29,30,34,35,100])for(const effectDC of [null,20,25,30,35])for(const enhanced of [false,true]){
  const c=actor();if(total<20&&enhanced){const snap=p.outgoingPowerSnapshot(c,pack,raw());assert.throws(()=>p.outgoingPowerResult(pack,check(total),snap,{enhanced,effectDC}));continue;}
  const {r}=activate(c,total,{enhanced,effectDC}),expected=[20,25,30,35].filter(dc=>dc<=total&&(effectDC===null||dc<=effectDC)).length;
  assert.equal(r.tier,expected);assert.equal(r.drPenalty,expected?5*expected+(enhanced?5:0):0);assert.equal(c.currentHP,30);assert.equal(c.condition,0);assert.equal(c.protection.dr,5);if(expected)assert.equal(r.declaredDRAfter,Math.max(0,10-r.drPenalty));else assert.equal(c.outgoingPowerEffects,undefined);
 }
});
test('only initial mechanical/electronic application moves CT; unknown CT stays unknown and upkeep never restores stale CT',()=>{
 for(const mechanical of [false,true])for(const condition of [null,0,4,5]){const c=actor(),{s,r}=activate(c,35,{target:{mechanical,condition}});assert.equal(r.conditionSteps,mechanical?1:0);assert.equal(r.declaredConditionAfter,mechanical&&condition!==null?Math.min(5,condition+1):undefined);assert.equal(!!r.ceasesFunctioning,mechanical&&condition===4);const next=renew(c,s.id);assert.equal(next.conditionSteps,0);assert.equal(next.declaredConditionAfter,undefined);assert.equal(next.ceasesFunctioning,undefined);}
});
test('original FP enhancement persists across new earned tiers without another FP/copy/recovery effect',()=>{
 const c=actor(),{s}=activate(c,35,{enhanced:true});c.forcePoints=1;const r=renew(c,s.id,20);assert.equal(r.drPenalty,10);assert.equal(r.conditionSteps,0);assert.equal(c.forcePoints,1);assert.equal(c.forcePowerRecoveryPending,undefined);assert.equal(c.outgoingPowerEffects[0].maintained,true);assert.equal(c.outgoingPowerEffects[0].maxTier,1);assert.equal(c.outgoingPowerEffects[0].tier,1);
});
test('end-next-turn survives first end/start, late upkeep and repeated renewal never accumulate turns',()=>{
 const c=actor(),{s}=activate(c);p.endOutgoingPowerTurn(c);p.endOutgoingPowerTurn(c);assert.equal(c.outgoingPowerEffects[0].endsRemaining,1);p.startOutgoingPowerTurn(c);c.actionState.turn++;assert.equal(c.outgoingPowerEffects[0].endsRemaining,1);renew(c,s.id);renew(c,s.id);assert.equal(c.outgoingPowerEffects[0].endsRemaining,2);p.endOutgoingPowerTurn(c);p.startOutgoingPowerTurn(c);c.actionState.turn++;assert.equal(c.outgoingPowerEffects[0].endsRemaining,1);p.endOutgoingPowerTurn(c);assert.equal(c.outgoingPowerEffects,undefined);valid(c);
 const noEnd=actor();activate(noEnd);p.startOutgoingPowerTurn(noEnd);assert.equal(noEnd.outgoingPowerEffects.length,1);p.startOutgoingPowerTurn(noEnd);assert.equal(noEnd.outgoingPowerEffects,undefined);
});
test('provisional failed upkeep can be rescued before finalization; failed final upkeep releases only its instance',()=>{
 const c=actor(),a=activate(c,35,{enhanced:true}),b=activate(c,35,{target:{name:'Panel'}}),pending=stage(c,a.s.id);pending.s.result.check=check(19);assert.equal(c.outgoingPowerEffects.length,2);pending.s.result.check=check(20);p.finishOutgoingUpkeep(c,pack,pending.s.id,check(20),pending.snapshot);pending.s.status='done';valid(c);assert.equal(c.outgoingPowerEffects[0].tier,1);renew(c,a.s.id,19);assert.equal(c.outgoingPowerEffects.length,1);assert.equal(c.outgoingPowerEffects[0].id,b.s.id);assert.equal(c.actionState.plan.at(-1).options.outgoingPowerResolution.enhanced,true);
});
test('concentration starts only after upkeep, saves one check, uses shared-damage DC and release closes pending upkeep',()=>{
 const c=actor(),{s}=activate(c);assert.deepEqual(p.requireOutgoingDamageChecks(c,7),[]);renew(c,s.id);assert.deepEqual(p.requireOutgoingDamageChecks(c,7),[s.id]);atomic(c,()=>p.startOutgoingPowerTurn(c));atomic(c,()=>p.advanceOutgoingTime(c,10));p.recordOutgoingDamageCheck(c,s.id,check(20));atomic(c,()=>p.recordOutgoingDamageCheck(c,s.id,check(20)));assert.deepEqual(p.finishOutgoingDamageCheck(c,pack,s.id,2),{dc:22,total:22,success:true});valid(c);
 const pending=stage(c,s.id);p.requireOutgoingDamageChecks(c,7);p.recordOutgoingDamageCheck(c,s.id,check(21));p.finishOutgoingDamageCheck(c,pack,s.id);assert.equal(c.outgoingPowerEffects,undefined);assert.equal(pending.s.status,'done');assert.equal(pending.s.options.outgoingPowerResolution.status,'released');assert.equal(pending.s.result.fpAllowed,false);valid(c);
});
test('activation preflights capacity, snapshots ignore key order, replays and mismatched totals/caps are atomic',()=>{
 const c=actor(),snap=p.outgoingPowerSnapshot(c,pack,raw()),id=crypto.randomUUID(),s={id,action:'power',status:'queued',options:{effectPowerId:pid,outgoingPowerSnapshot:structuredClone(snap)}};c.actionState.plan.push(s);const reordered={target:Object.fromEntries(Object.entries(snap.target).reverse()),powerId:pid};const r=p.finishOutgoingPower(c,pack,id,check(35),reordered);s.status='done';s.turn=1;s.result={text:r.text,check:check(35)};valid(c);atomic(c,()=>p.finishOutgoingPower(c,pack,id,check(35),snap));
 const q=actor();q.outgoingPowerEffects=Array.from({length:1000},()=>({...c.outgoingPowerEffects[0],id:crypto.randomUUID()}));atomic(q,()=>p.outgoingPowerSnapshot(q,pack,raw()));
 const pending=stage(c,id);atomic(c,()=>p.finishOutgoingUpkeep(c,pack,pending.s.id,check(30),pending.snapshot));atomic(c,()=>p.finishOutgoingUpkeep(c,pack,pending.s.id,check(25),pending.snapshot,{effectDC:20}));p.removeOutgoingPower(c,id);valid(c);
});
test('coarse waits expire effects, source gating preserves rows for release, and escaped output cannot create markup',()=>{
 const c=actor(),{s,r}=activate(c,35,{target:{name:'<script>Door</script>'}});assert(!r.html.includes('<script>'));assert(r.html.includes('&lt;script&gt;'));const before=structuredClone(c),d={incapacitated:false,helpless:false,skills:[{id:'skill:use-the-force',available:true}],forcePowers:[]};assert.throws(()=>p.outgoingMaintenancePlan(c,d,pack,s.id));assert.deepEqual(c,before);d.forcePowers=[{id:pid,spent:true}];assert.equal(p.outgoingMaintenancePlan(c,d,pack,s.id).row.id,s.id);p.advanceOutgoingTime(c,0);assert.deepEqual(c,before);p.advanceOutgoingTime(c,1);assert.deepEqual(c,before);p.advanceOutgoingTime(c,2);assert.equal(c.outgoingPowerEffects,undefined);valid(c);
});

test('clear/expiry preflight all pending release snapshots before changing another instance',()=>{
 const c=actor(),a=activate(c),b=activate(c,35,{target:{name:'Panel'}}),pending=stage(c,b.s.id);pending.snapshot.enhanced=true;atomic(c,()=>p.clearOutgoingPowers(c));p.endOutgoingPowerTurn(c);p.startOutgoingPowerTurn(c);atomic(c,()=>p.endOutgoingPowerTurn(c));assert.equal(c.outgoingPowerEffects[0].id,a.s.id);
});
