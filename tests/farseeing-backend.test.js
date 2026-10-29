import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {farseeingSelection,farseeingPowerSnapshot,farseeingOutcome,farseeingResult,finishFarseeing,validateFarseeing,advanceFarseeingFailures,farseeingFailures,setFarseeingMinutes,removeFarseeingFailure} from '../src/farseeing.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),actor=()=>({levels:[],actionState:{plan:[],history:[]}}),snapshot=(c,extra={})=>farseeingPowerSnapshot(c,pack,{name:'Mara',...extra}),check=total=>({natural:10,bonus:total-10,total});
const valid=c=>validateFarseeing(c,pack,message=>{throw new Error(message);});
function stage(c,s,total,proof){const step={id:crypto.randomUUID(),action:'power',status:'waiting',options:{effectPowerId:'power:farseeing',farseeingPowerSnapshot:s,...(proof===undefined?{}:{powerOutcome:proof})},result:{check:check(total),...(s.target.will===null?{outcomeAllowed:true}:{})}};c.actionState.plan.push(step);return step;}
function finish(c,s,total,{enhanced=false,success}={}){const step=stage(c,s,total,success===undefined?undefined:{success,total}),r=finishFarseeing(c,pack,step.id,check(total),s,{enhanced});step.status='done';delete step.result.outcomeAllowed;step.result.text=r.text;return {step,r};}

test('Farseeing18168 data contract pins deadWill30 and24hours, with bounded exact schema',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-farseeing').revision,18168);const r=pack.rules.divinationPowers[0];assert.equal(r.deadWill,30);assert.equal(r.failureCooldownRounds,14400);const bad=structuredClone(pack);bad.rules.divinationPowers[0].failureCooldownRounds=600;assert.throws(()=>validatePack(bad));
});
test('known/dead/equal comparisons use final total and unknown status never implies alive',()=>{
 const c=actor();for(const total of [-10,19,20,29,30,50]){const s=snapshot(c,{will:20});assert.equal(farseeingOutcome(pack,s,total),total>=20);const dead=snapshot(c,{will:1,dead:true});assert.equal(dead.target.will,30);assert.equal(farseeingOutcome(pack,dead,total),total>=30);}
 const unknown=snapshot(c);assert.equal(unknown.target.dead,false);assert.equal(farseeingOutcome(pack,unknown,100),null);assert.throws(()=>farseeingResult(pack,check(100),unknown),/Confirm/);assert.throws(()=>farseeingResult(pack,check(20),snapshot(c,{will:20}),{confirmation:{success:false,total:20}}));
});
test('unknown outcome requires fresh explicit final-total proof, and clear image requires success',()=>{
 const s=snapshot(actor());for(const success of [false,true])for(const total of [-10,20,100]){const r=farseeingResult(pack,check(total),s,{confirmation:{success,total}});assert.equal(r.success,success);assert.equal(r.resolution.total,total);assert.equal(r.detail,success?'vague':undefined);}
 for(const proof of [true,{},null,{success:1,total:20},{success:true,total:19},{success:true,total:20,extra:true}])assert.throws(()=>farseeingResult(pack,check(20),s,{confirmation:proof}));
 assert.throws(()=>farseeingResult(pack,check(20),s,{enhanced:true,confirmation:{success:false,total:20}}));const image=farseeingResult(pack,check(20),s,{enhanced:true,confirmation:{success:true,total:20}});assert.equal(image.detail,'clear');assert.equal(image.radius,6);assert.match(image.text,/creatures or objects within 6 squares/);
});
test('failure is recorded only at final decision and blocks every casing of that target independently of copies/history',()=>{
 const c=actor(),s=snapshot(c,{name:'  Mara  '});assert.equal(s.target.name,'Mara');const step=stage(c,s,26);valid(c);assert.equal(c.farseeingFailures,undefined);assert.throws(()=>finishFarseeing(c,pack,step.id,check(26),s),/Confirm/);assert.equal(c.farseeingFailures,undefined);
 step.result.check=check(31);step.options.powerOutcome={success:false,total:26};assert.throws(()=>finishFarseeing(c,pack,step.id,check(31),s));assert.equal(c.farseeingFailures,undefined);step.options.powerOutcome={success:false,total:31};const r=finishFarseeing(c,pack,step.id,check(31),s);step.status='done';delete step.result.outcomeAllowed;assert.equal(r.success,false);assert.equal(c.farseeingFailures[0].rounds,14400);valid(c);c.actionState.history=c.actionState.plan;c.actionState.plan=[];valid(c);for(const name of ['Mara',' mara ','MARA'])assert.throws(()=>snapshot(c,{name}),/unavailable/);assert.doesNotThrow(()=>snapshot(c,{name:'Talon'}));
});
test('known provisional miss can be rescued before finalization, and failure text never reveals declared dead status',()=>{
 const c=actor(),s=snapshot(c,{dead:true});const step=stage(c,s,29);assert.equal(c.farseeingFailures,undefined);step.result.check=check(30);const r=finishFarseeing(c,pack,step.id,check(30),s);step.status='done';assert.equal(r.success,true);assert.equal(c.farseeingFailures,undefined);valid(c);
 const d=actor(),failed=finish(d,snapshot(d,{dead:true}),29).r;assert.equal(failed.success,false);assert.match(failed.text,/No information/);assert(!/alive|dead/.test(failed.text));assert(!/alive|dead/.test(failed.html));
});
test('success saves exact resolution and escaped information permission, with no failure ledger or replay',()=>{
 const c=actor(),s=snapshot(c,{name:'<Mara>',will:20}),{step,r}=finish(c,s,20,{enhanced:true});assert.equal(c.farseeingFailures,undefined);assert.match(r.html,/&lt;Mara&gt;/);assert(!r.html.includes('<Mara>'));valid(c);const before=structuredClone(c);assert.throws(()=>finishFarseeing(c,pack,step.id,check(20),s));assert.deepEqual(c,before);
});
test('24hour rows advance by explicit rounds,8hours subtracts4800 and invalid elapsed time changes none',()=>{
 const c=actor();finish(c,snapshot(c,{will:30}),29);const original=structuredClone(c);advanceFarseeingFailures(c,4800);assert.equal(c.farseeingFailures[0].rounds,9600);assert.equal(farseeingFailures(c)[0].minutes,960);const before=structuredClone(c);assert.throws(()=>advanceFarseeingFailures(c,-1));assert.deepEqual(c,before);advanceFarseeingFailures(c,10);assert.equal(c.farseeingFailures[0].rounds,9590);advanceFarseeingFailures(c,600);advanceFarseeingFailures(c,100);assert.equal(c.farseeingFailures[0].rounds,8890);advanceFarseeingFailures(c,8890);assert.equal(c.farseeingFailures,undefined);const d=structuredClone(original);advanceFarseeingFailures(d,14400);assert.equal(d.farseeingFailures,undefined);
});
test('manual minute correction is bounded, precision-safe, per-row and0removes',()=>{
 const c=actor();finish(c,snapshot(c,{will:30}),29);finish(c,snapshot(c,{name:'Talon',will:30}),29);const id=c.farseeingFailures[0].id,other=structuredClone(c.farseeingFailures[1]);setFarseeingMinutes(c,pack,id,1439.9);assert.equal(c.farseeingFailures[0].rounds,14399);assert.deepEqual(c.farseeingFailures[1],other);for(const v of [-1,1440.1,.01,'10',NaN,Infinity]){const before=structuredClone(c);assert.throws(()=>setFarseeingMinutes(c,pack,id,v));assert.deepEqual(c,before);}setFarseeingMinutes(c,pack,id,0);assert.deepEqual(c.farseeingFailures,[other]);removeFarseeingFailure(c,other.id);assert.equal(c.farseeingFailures,undefined);assert.throws(()=>removeFarseeingFailure(c,id));
});
test('new identity capacity is preflighted and all closed snapshots/records/proofs reject malformed saves',()=>{
 const c=actor();c.farseeingFailures=Array.from({length:1000},(_,i)=>({id:crypto.randomUUID(),key:'target'+i,name:'Target'+i,rounds:14400}));valid(c);assert.throws(()=>snapshot(c),/Too many/);assert.throws(()=>snapshot(c,{name:'Target0'}),/unavailable/);
 for(const raw of [null,[],{}, {name:' '},{name:'Mara',will:'30'},{name:'Mara',dead:null},{name:'Mara',extra:1},{name:'Mara\nTalon'}])assert.throws(()=>farseeingSelection(pack,raw));
 const d=actor();finish(d,snapshot(d,{will:30}),29);for(const change of [x=>x.farseeingFailures[0].key='other',x=>x.farseeingFailures[0].rounds=14401,x=>x.farseeingFailures[0].name=' spaced ',x=>x.farseeingFailures[0].extra=true,x=>x.actionState.plan[0].options.farseeingResolution.total=30,x=>x.actionState.plan[0].options.farseeingResolution.enhanced=true,x=>delete x.actionState.plan[0].options.farseeingPowerSnapshot,x=>x.actionState.plan[0].result.outcomeAllowed=true]){const bad=structuredClone(d);change(bad);assert.throws(()=>valid(bad));}
});
