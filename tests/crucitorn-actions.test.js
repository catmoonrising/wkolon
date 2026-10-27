import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as api from '../src/rules.js';import make from '../tools/crucitorn-fixtures.cjs';
import {takeAction,executeAction,finishForceChoice,beginNextTurn,endCurrentTurn,previewPlan} from '../src/action-engine.js';import {queueAction} from '../src/action-economy.js';import {choosePowerEffectTier} from '../src/power-effect-choices.js';import {damageOutcome} from '../src/incoming-damage.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id==='power:crucitorn').copyId;
function roller(c,natural=10){const calls=[],bonus=api.derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total;return {calls,roll:e=>{calls.push(e);assert(e.startsWith('1d20'));return {value:natural+bonus,d20:[natural],display:e,coeffs:[1]};}};}
const options=c=>({powerId:copy(c),action:'reaction',trigger:'Incoming attack 1',fp:'ask',enhance:true,incoming:{amount:25,options:{}}});
test('free planning, saved original check, blocked extra damage and final enhanced lesser tier resolve once',()=>{
 const c=f.adept(),r=roller(c),hp=c.currentHP,fp=c.forcePoints,step=queueAction(c,'power',options(c));assert.equal(previewPlan(c,pack)[0].issue,undefined);assert.equal(c.currentHP,hp);assert.deepEqual(r.calls,[]);executeAction(c,pack,step.id,r.roll);assert.equal(c.actionState.plan[0].status,'waiting');assert.equal(c.currentHP,hp);assert.equal(c.forcePoints,fp);assert.equal(c.actionState.plan[0].result.fpAllowed,false);assert.throws(()=>damageOutcome(c,api.derive(c,pack),pack,1),/Resolve Crucitorn/);assert.throws(()=>beginNextTurn(c,pack),/pending/);
 const saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);choosePowerEffectTier(saved,pack,step.id,15);const out=finishForceChoice(saved,pack,step.id,'enhance',r.roll);assert.equal(saved.currentHP,hp-25);assert.equal(saved.condition,0);assert.equal(saved.forcePoints,fp-1);assert.equal(r.calls.length,1);assert.match(out.text,/DT 31/);assert.match(saved.actionState.plan[0].result.text,/DT 31/);assert.equal(api.derive(saved,pack).threshold,21);const done=structuredClone(saved);assert.throws(()=>finishForceChoice(saved,pack,step.id,false),/No pending/);assert.deepEqual(saved,done);
});
test('a failed activation consumes its copy and reaction while applying the original incoming damage',()=>{
 const c=f.adept(),d=api.derive(c,pack);c.skillModifiers={'skill:use-the-force':13-d.skills.find(s=>s.id==='skill:use-the-force').total};const hp=c.currentHP,r=roller(c,1);takeAction(c,pack,'power',{...options(c),incoming:{amount:10,options:{}}},r.roll);assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.currentHP,hp-10);assert(c.levels[0].forcePowers[0].spent);assert.equal(r.calls.length,1);assert.equal(c.forcePoints,d.forceCurrent);
});
test('survival allows enhancement or Adept after a prior FP, and costs only what the event needs',()=>{
 for(const mode of ['enhance','adept'])for(const fatal of [false,true])for(const capped of [false,true]){
  const c=f.adept();c.flatFooted=true;c.forcePoints=2;c.currentHP=fatal?1:c.currentHP;const r=roller(c),hp=c.currentHP;
  takeAction(c,pack,'power',{...options(c),...(mode==='adept'?{rollMode:'adept'}:{}),enhance:mode==='enhance',...(capped?{effectDC:15}:{}),incoming:{amount:fatal?100:10,options:{spendForcePoint:true}}},r.roll);
  if(c.actionState.plan[0].status==='waiting'){api.validateCharacter(c,pack);const saved=JSON.parse(JSON.stringify(c));if(!capped)choosePowerEffectTier(saved,pack,saved.actionState.plan[0].id,15);finishForceChoice(saved,pack,saved.actionState.plan[0].id,mode==='enhance'?'enhance':false,r.roll);Object.assign(c,saved);}
  assert.equal(c.forcePoints,fatal?0:1);assert.equal(c.currentHP,fatal?0:hp-10);assert.equal(!!c.recovery?.dead,false);assert(c.actionState.forceSpent);assert.equal(c.actionState.plan[0].status,'done');assert.equal(r.calls.length,mode==='adept'?2:1);api.validateCharacter(c,pack);
 }
});
test('ordinary Adept and enhancement remain mutually exclusive, and absent survival resources roll back',()=>{
 const c=f.adept(),r=roller(c),before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...options(c),rollMode:'adept'},r.roll),/Only one Force Point/);assert.deepEqual(c,before);assert.equal(r.calls.length,0);
 c.forcePoints=1;c.currentHP=1;const onePoint=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...options(c),rollMode:'adept',enhance:false,incoming:{amount:100,options:{spendForcePoint:true}}},r.roll),/Not enough Force Points/);assert.deepEqual(c,onePoint);assert.equal(r.calls.length,0);takeAction(c,pack,'power',{...options(c),effectDC:15,incoming:{amount:100,options:{spendForcePoint:true}}},r.roll);const pending=structuredClone(c);assert.throws(()=>finishForceChoice(c,pack,c.actionState.plan[0].id,'enhance',r.roll),/cannot prevent/);assert.deepEqual(c,pending);finishForceChoice(c,pack,c.actionState.plan[0].id,false,r.roll);assert.equal(c.forcePoints,0);assert.equal(!!c.recovery?.dead,false);
});
test('real Adept and Mastery retain the single-FP ledger and natural20 recovery',()=>{
 const c=f.adept({mastery:true}),r=roller(c,20),fp=c.forcePoints;beginNextTurn(c,pack);takeAction(c,pack,'power',{...options(c),rollMode:'adept',enhance:false,effectDC:15},r.roll);assert.equal(c.forcePoints,fp-1);assert.equal(r.calls.length,2);assert(c.forcePowerRecoveryPending);endCurrentTurn(c,pack);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));beginNextTurn(c,pack);const next=roller(c);takeAction(c,pack,'power',{...options(c),rollMode:'take10',enhance:false,effectDC:15,trigger:'Incoming attack 2',incoming:{amount:1,options:{}}},next.roll);assert.equal(next.calls.length,0);assert.equal(c.actionState.plan[0].result.check.natural,10);
});
test('saved executable results enforce incoming/check/choice guards',()=>{
 const c=f.adept(),r=roller(c);takeAction(c,pack,'power',options(c),r.roll);for(const mutate of [s=>s.options.incoming.amount=-1,s=>s.result.check.total++,s=>s.result.fpAllowed=true,s=>s.options.effectDC=35,s=>s.options.offensivePowerSnapshot={powerId:'power:crucitorn',heroicLevel:8}]){const q=structuredClone(c);mutate(q.actionState.plan[0]);assert.throws(()=>api.validateCharacter(q,pack));}
});
test('older manual pending Crucitorn does not fabricate a damage event on completion',()=>{
 const c=f.adept(),r=roller(c);takeAction(c,pack,'power',options(c),r.roll);const step=c.actionState.plan[0],hp=c.currentHP;delete step.options.effectPowerId;delete step.options.incoming;delete step.result.effectChoiceAllowed;step.result.text+='; effects manual';api.validateCharacter(c,pack);const out=finishForceChoice(c,pack,step.id,'enhance',r.roll);assert.equal(c.currentHP,hp);assert.equal(r.calls.length,1);assert.match(out.text,/enhancement manual/);
});

test('one point funds Adept when the incoming event cannot require survival',()=>{
 const c=f.adept();c.forcePoints=1;const r=roller(c);takeAction(c,pack,'power',{...options(c),rollMode:'adept',enhance:false,effectDC:15,incoming:{amount:1,options:{spendForcePoint:true}}},r.roll);assert.equal(c.forcePoints,0);assert.equal(c.actionState.plan[0].status,'done');assert.equal(!!c.recovery?.dead,false);assert.equal(r.calls.length,2);api.validateCharacter(c,pack);
});
