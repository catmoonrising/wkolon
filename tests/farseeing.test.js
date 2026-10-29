import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/farseeing-fixtures.cjs';
import {takeAction,finishForceChoice,beginNextTurn,endCurrentTurn,endTrackedCombat,describeAction,previewPlan,previewNextTurn,executeAction} from '../src/action-engine.js';
import {queueAction,pendingChoiceMessage} from '../src/action-economy.js';
import {advanceTimedTalents} from '../src/timed-talents.js';
import {newDay,newEncounter,restEightHours} from '../src/recovery.js';
import {recoverSuite} from '../src/force-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),pid='power:farseeing';
const copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id===pid&&!p.spent).copyId;
const opts=(c,farseeing={name:'Mara',will:26})=>({powerId:copy(c),action:'full-round-action',fp:'none',enhance:false,farseeing});
const roll=(natural=10,bonus=16)=>expression=>({value:natural+bonus,d20:[natural],display:expression});
const noRoll=()=>assert.fail('Must not roll');
const step=c=>c.actionState.plan.find(s=>s.status==='waiting')||c.actionState.plan.at(-1);
function locked(){const c=f.adept();takeAction(c,pack,'power',opts(c,{name:'Mara',will:27}),roll());assert.equal(c.farseeingFailures[0].rounds,14400);return c;}
function atomic(c,fn){const before=structuredClone(c);assert.throws(fn);assert.deepEqual(c,before);}

test('genuine Adept/Mastery builds select Farseeing with a Full-Round cost',()=>{for(const mastery of [false,true]){const c=f.adept({mastery}),d=api.derive(c,pack),p=d.forcePowers.find(p=>p.id===pid);assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);assert.equal(describeAction(c,pack,'power',opts(c)).cost.type,'full');}});
test('known Will equality succeeds, misses lock only that target, dead uses30 and no secrets are invented',()=>{
 for(const [target,success] of [[{name:'Mara',will:26},true],[{name:'Mara',will:27},false],[{name:'Mara',will:1,dead:true},false]]){
  const c=f.adept(),hp=c.currentHP,fp=c.forcePoints;takeAction(c,pack,'power',opts(c,target),roll());const s=step(c);assert.equal(s.status,'done');assert.equal(s.options.farseeingResolution.success,success);assert.equal(c.currentHP,hp);assert.equal(c.forcePoints,fp);assert.equal(c.farseeingFailures?.length,success?undefined:1);assert.deepEqual(c.actionState.spent,['standard','move','swift']);
  if(!success){assert.match(s.result.text,/No information/);assert(!/alive|dead/.test(s.result.text));beginNextTurn(c,pack);atomic(c,()=>takeAction(c,pack,'power',opts(c,{name:' mara ',will:0}),noRoll));}
 }
});
test('ordinary FP rescues provisional known miss before any cooldown and never re-rolls the check',()=>{
 const c=f.adept(),fp=c.forcePoints;takeAction(c,pack,'power',{...opts(c,{name:'Mara',will:28}),fp:'ask'},roll());assert.equal(c.farseeingFailures,undefined);const id=step(c).id;finishForceChoice(c,pack,id,true,()=>({value:2,display:'2'}));assert.equal(step(c).options.farseeingResolution.success,true);assert.equal(step(c).result.check.total,28);assert.equal(c.forcePoints,fp-1);assert.equal(c.farseeingFailures,undefined);atomic(c,()=>finishForceChoice(c,pack,id,false,noRoll));
});
test('unknown Will with zero FP still requires explicit success/failure, survives reload and blocks new turns',()=>{
 for(const success of [false,true]){let c=f.adept();c.forcePoints=0;takeAction(c,pack,'power',opts(c,{name:'Mara'}),roll());assert.equal(step(c).status,'waiting');assert.equal(step(c).result.outcomeAllowed,true);assert.equal(pendingChoiceMessage(c),'Resolve the pending power outcome');assert.equal(c.farseeingFailures,undefined);c=JSON.parse(JSON.stringify(c));api.validateCharacter(c,pack);atomic(c,()=>finishForceChoice(c,pack,step(c).id,false,noRoll));atomic(c,()=>beginNextTurn(c,pack));finishForceChoice(c,pack,step(c).id,success?'success':'failure',noRoll);assert.equal(step(c).status,'done');assert.equal(step(c).options.farseeingResolution.success,success);assert.equal(c.farseeingFailures?.length,success?undefined:1);assert.equal(c.forcePoints,0);}
});
test('unknown ordinary FP boost stays waiting for confirmation at the final total without duplicate costs',()=>{
 const c=f.adept(),fp=c.forcePoints;takeAction(c,pack,'power',{...opts(c,{name:'Mara'}),fp:'ask',enhance:true},roll());const id=step(c).id;finishForceChoice(c,pack,id,'bonus',()=>({value:3,display:'3'}));assert.equal(step(c).status,'waiting');assert.equal(step(c).result.check.total,29);assert.equal(c.forcePoints,fp-1);assert.equal(c.farseeingFailures,undefined);atomic(c,()=>finishForceChoice(c,pack,id,'success-enhance',noRoll));finishForceChoice(c,pack,id,'failure',noRoll);assert.deepEqual(step(c).options.powerOutcome,{success:false,total:29});assert.equal(c.farseeingFailures[0].rounds,14400);assert.equal(c.forcePoints,fp-1);
});
test('Adept pays once and unknown outcome stays resolvable after FP is spent; Mastery never rolls',()=>{
 const c=f.adept();c.forcePoints=1;takeAction(c,pack,'power',{...opts(c,{name:'Mara'}),rollMode:'adept'},roll());assert.equal(c.forcePoints,0);assert.equal(step(c).status,'waiting');finishForceChoice(c,pack,step(c).id,'success',noRoll);assert.equal(step(c).options.farseeingResolution.success,true);
 const m=f.adept({mastery:true});takeAction(m,pack,'power',{...opts(m,{name:'Mara',will:26}),rollMode:'take10'},noRoll);assert.equal(step(m).options.farseeingResolution.success,true);
});
test('clear image costs exactly one FP only on success; unknown needs success-specific choice',()=>{
 for(const unknown of [false,true]){const c=f.adept(),fp=c.forcePoints;takeAction(c,pack,'power',{...opts(c,unknown?{name:'Mara'}:{name:'Mara',will:26}),enhance:true},roll());finishForceChoice(c,pack,step(c).id,unknown?'success-enhance':'enhance',noRoll);assert.equal(c.forcePoints,fp-1);assert.equal(step(c).options.farseeingResolution.enhanced,true);assert.match(step(c).result.text,/within 6 squares/);}
 const miss=f.adept();takeAction(miss,pack,'power',{...opts(miss,{name:'Mara',will:99}),enhance:true,fp:'ask'},roll());atomic(miss,()=>finishForceChoice(miss,pack,step(miss).id,'enhance',noRoll));finishForceChoice(miss,pack,step(miss).id,false,noRoll);assert.equal(step(miss).options.farseeingResolution.success,false);
 const unknown=f.adept();takeAction(unknown,pack,'power',{...opts(unknown,{name:'Mara'}),enhance:true},roll());atomic(unknown,()=>finishForceChoice(unknown,pack,step(unknown).id,'enhance',noRoll));
});
test('target snapshots survive later raw edits, proof cannot be supplied at activation and final records are closed',()=>{
 const c=f.adept();takeAction(c,pack,'power',{...opts(c,{name:'Mara'}),enhance:true},roll());step(c).options.farseeing={name:'Talon',will:0};finishForceChoice(c,pack,step(c).id,'failure',noRoll);assert.equal(c.farseeingFailures[0].name,'Mara');for(const modify of [s=>s.options.powerOutcome.total++,s=>s.result.outcomeAllowed=true,s=>delete s.options.farseeingPowerSnapshot,s=>s.options.farseeingResolution.success=true]){const bad=structuredClone(c);modify(step(bad));assert.throws(()=>api.validateCharacter(bad,pack));}
 const q=f.adept();atomic(q,()=>takeAction(q,pack,'power',{...opts(q),powerOutcome:{success:true,total:26}},noRoll));
});
test('failure capacity and repeat identities reject before RNG, copy or action expenditure',()=>{
 const c=f.adept();c.farseeingFailures=Array.from({length:1000},(_,i)=>({id:crypto.randomUUID(),key:'target'+i,name:'Target'+i,rounds:14400}));api.validateCharacter(c,pack);atomic(c,()=>takeAction(c,pack,'power',opts(c,{name:'Mara'}),noRoll));
 const q=locked();beginNextTurn(q,pack);atomic(q,()=>takeAction(q,pack,'power',opts(q,{name:' MARA '}),noRoll));
});
test('previews preserve full state and use no RNG or UUID; queued target can be corrected',()=>{
 const c=f.adept();const s=queueAction(c,'power',opts(c,{name:'Mara'})),before=structuredClone(c),uuid=crypto.randomUUID;crypto.randomUUID=noRoll;try{previewPlan(c,pack);previewNextTurn(c,pack);assert.deepEqual(c,before);}finally{crypto.randomUUID=uuid;}s.options.farseeing.will=26;executeAction(c,pack,s.id,roll());assert.equal(step(c).status,'done');
});
test('24h cooldown ticks only on explicit clocks, initial turn0, next turn1, suite1min, rest8h leaves16h',()=>{
 const initial=f.adept();initial.farseeingFailures=[{id:crypto.randomUUID(),key:'mara',name:'Mara',rounds:14400}];beginNextTurn(initial,pack);assert.equal(initial.farseeingFailures[0].rounds,14400);beginNextTurn(initial,pack);assert.equal(initial.farseeingFailures[0].rounds,14399);
 const c=locked();endCurrentTurn(c,pack);endTrackedCombat(c);newEncounter(c);c.forcePoints++;assert.equal(c.farseeingFailures[0].rounds,14400);recoverSuite(c,api.derive(c,pack));assert.equal(c.farseeingFailures[0].rounds,14390);
 const r=locked();restEightHours(r,api.derive(r,pack),pack);assert.equal(r.farseeingFailures[0].rounds,9600);newDay(r,pack);assert.equal(r.farseeingFailures,undefined);
 const noTime=locked();advanceTimedTalents(noTime,0);assert.equal(noTime.farseeingFailures[0].rounds,14400);atomic(noTime,()=>advanceTimedTalents(noTime,-1));
});
test('source loss leaves saved outcome unresolved and no mutation; old manual waiting/history remains manual',()=>{
 const c=f.adept();takeAction(c,pack,'power',{...opts(c,{name:'Mara'}),enhance:true},roll());const id=step(c).id;c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===step(c).options.powerId).powerId='power:surge';atomic(c,()=>finishForceChoice(c,pack,id,'failure',noRoll));
 const old=f.adept();takeAction(old,pack,'power',{...opts(old),enhance:true},roll());const s=step(old);delete s.options.farseeing;delete s.options.farseeingPowerSnapshot;delete s.options.effectPowerId;api.validateCharacter(old,pack);finishForceChoice(old,pack,s.id,'enhance',noRoll);assert.match(step(old).result.text,/enhancement manual/);assert.equal(step(old).options.farseeingResolution,undefined);assert.equal(old.farseeingFailures,undefined);
});

test('pending outcomes and unavailable rest reject clock advancement without mutation',()=>{
 const c=locked();c.recovery={...c.recovery,dead:true};atomic(c,()=>restEightHours(c,api.derive(c,pack),pack));
 const p=f.adept();p.farseeingFailures=[{id:crypto.randomUUID(),key:'other',name:'Other',rounds:14400}];takeAction(p,pack,'power',opts(p,{name:'Mara'}),roll());atomic(p,()=>newDay(p,pack));atomic(p,()=>restEightHours(p,api.derive(p,pack),pack));
});
