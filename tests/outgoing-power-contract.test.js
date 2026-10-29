import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {outgoingPowerRule,outgoingTarget,validateOutgoingSnapshot,validateOutgoingUpkeepSnapshot,validateOutgoingPowerState} from '../src/outgoing-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),pid='power:cryokinesis',target=()=>outgoingTarget(pack,{name:'  Door  ',distance:12,lineOfSight:true,unattended:true,mechanical:true,dr:10,condition:4});
const row=()=>({id:crypto.randomUUID(),powerId:pid,target:target(),maxTier:4,tier:2,enhanced:true,endsRemaining:2,ended:false,maintained:false,pending:null});
const actor=()=>({levels:[],actionState:{turn:1,plan:[],history:[]}}),valid=c=>validateOutgoingPowerState(c,pack,message=>{throw new Error(message);});
function activation({waiting=false}={}){const c=actor(),r=row(),s={id:r.id,action:'power',turn:1,status:waiting?'waiting':'done',options:{effectPowerId:pid,effectDC:25,outgoingPowerSnapshot:{powerId:pid,target:structuredClone(r.target)}},result:{text:'saved',check:{natural:10,bonus:20,total:30},...(waiting?{fpAllowed:true}:{})}};if(!waiting)s.options.outgoingPowerResolution={effectId:r.id,phase:'activation',status:'applied',total:30,tier:2,enhanced:true};c.actionState.plan.push(s);return {c,r,s};}
function upkeep(){const {c,r}=activation();c.outgoingPowerEffects=[r];const snapshot={family:'outgoing',effectId:r.id,powerId:pid,enhanced:r.enhanced,turn:1,target:structuredClone(r.target)},s={id:crypto.randomUUID(),action:'maintain-power',status:'waiting',turn:1,options:{effectPowerId:pid,effectId:r.id,maintenancePowerSnapshot:snapshot},result:{text:'saved',check:{natural:10,bonus:20,total:30},fpAllowed:true,enhanceAllowed:false}};c.actionState.plan.push(s);return {c,r,s};}

test('canonical unattended object retains unknown stats and requires explicit eligibility before use',()=>{
 const t=target();assert.equal(t.name,'Door');assert.equal(outgoingPowerRule(pack,pid).range,12);const unknown=outgoingTarget(pack,{name:'Stone',lineOfSight:true,unattended:true});assert.equal(unknown.dr,null);assert.equal(unknown.condition,null);assert.equal(unknown.mechanical,false);assert.deepEqual(outgoingTarget(pack,{},false),{name:'',distance:0,lineOfSight:false,unattended:false,mechanical:false,dr:null,condition:null});
 for(const change of [t=>t.distance=12.1,t=>t.lineOfSight=false,t=>t.unattended=false,t=>t.name=' ',t=>t.condition=6,t=>t.dr=-1,t=>t.extra=1,t=>t.mechanical='yes',t=>t.mechanical=null,t=>t.distance=null]){const t=target();change(t);assert.throws(()=>outgoingTarget(pack,t));}
});
test('activation and outgoing upkeep snapshots are closed, canonical and separate from old variants',()=>{
 const t=target(),s={powerId:pid,target:t};assert.deepEqual(validateOutgoingSnapshot(pack,s),t);for(const change of [s=>s.extra=true,s=>s.powerId='power:cloak',s=>s.target.name=' Door ',s=>delete s.target.dr]){const bad=structuredClone(s);change(bad);assert.throws(()=>validateOutgoingSnapshot(pack,bad));}
 const snap=upkeep().s.options.maintenancePowerSnapshot;assert.deepEqual(validateOutgoingUpkeepSnapshot(pack,snap),t);for(const change of [s=>delete s.family,s=>s.effectId='x',s=>s.turn=0,s=>s.enhanced=1,s=>s.extra=true]){const bad=structuredClone(snap);change(bad);assert.throws(()=>validateOutgoingUpkeepSnapshot(pack,bad));}
});
test('independent ongoing rows permit end-next-turn states and exact once-saved concentration shape',()=>{
 const c=actor(),r=row();c.outgoingPowerEffects=[r];valid(c);r.endsRemaining=1;r.ended=true;valid(c);r.maintained=true;r.pending={damage:7,check:null};valid(c);r.pending.check={natural:20,bonus:8,total:28};valid(c);
 for(const change of [r=>r.maxTier=5,r=>r.tier=5,r=>r.endsRemaining=0,r=>r.endsRemaining=2,r=>r.maintained=false,r=>r.pending.check.total++,r=>r.pending.damage=0,r=>r.extra=true,r=>delete r.target.condition]){const bad=structuredClone(c);change(bad.outgoingPowerEffects[0]);assert.throws(()=>valid(bad));}
 c.outgoingPowerEffects.push(structuredClone(r));assert.throws(()=>valid(c));
});
test('saved activation receipts survive loss of copy/history row, while pending and unrelated namespaces reject',()=>{
 const {c,s}=activation();valid(c);c.actionState.history=c.actionState.plan;c.actionState.plan=[];valid(c);for(const change of [s=>s.options.outgoingPowerResolution.total++,s=>s.options.outgoingPowerResolution.phase='upkeep',s=>s.options.outgoingPowerResolution.effectId=crypto.randomUUID(),s=>s.options.outgoingPowerResolution.tier=0,s=>delete s.options.outgoingPowerSnapshot,s=>s.result.outcomeAllowed=true,s=>s.options.effectPowerId='power:surge']){const bad=structuredClone(c);change(bad.actionState.history[0]);assert.throws(()=>valid(bad));}
 const pending=activation({waiting:true});valid(pending.c);pending.s.options.outgoingPowerResolution={effectId:pending.r.id,phase:'activation',status:'failed',total:30,tier:0,enhanced:false};assert.throws(()=>valid(pending.c));
});
test('upkeep stays bound to the original instance/target/enhancement, supports release receipt and no extra enhancement',()=>{
 const {c,r,s}=upkeep();valid(c);for(const change of [x=>x.outgoingPowerEffects=[],x=>x.outgoingPowerEffects[0].enhanced=false,x=>x.outgoingPowerEffects[0].target.name='Other',x=>x.actionState.turn=2,x=>x.actionState.plan.at(-1).result.enhanceAllowed=true]){const bad=structuredClone(c);change(bad);assert.throws(()=>valid(bad));}
 s.status='done';s.options.outgoingPowerResolution={effectId:r.id,phase:'upkeep',status:'released',total:30,tier:0,enhanced:true};delete c.outgoingPowerEffects;s.result.fpAllowed=false;valid(c);s.options.outgoingPowerResolution.enhanced=false;assert.throws(()=>valid(c));
});
test('incomplete queued declarations can be planned but a resolved new activation requires its snapshot',()=>{
 const c=actor(),id=crypto.randomUUID();c.levels=[{forcePowers:[{id,powerId:pid}]}];const s={id:crypto.randomUUID(),action:'power',status:'queued',options:{powerId:id,outgoing:{}}};c.actionState.plan.push(s);valid(c);s.status='waiting';s.result={text:'saved',check:{total:30}};assert.throws(()=>valid(c));
 const old=actor();old.actionState.plan.push({action:'maintain-power',status:'done',options:{maintenancePowerSnapshot:{effectId:crypto.randomUUID(),powerId:'power:cloak',enhanced:false,turn:1}},result:{check:{total:20}}});valid(old);
});
