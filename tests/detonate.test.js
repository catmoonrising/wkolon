import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/detonate-fixtures.cjs';
import {offensivePowerSnapshot,resolveOffensivePower} from '../src/offensive-powers.js';
import {takeAction,executeAction,finishForceChoice,beginNextTurn,endCurrentTurn,previewPlan} from '../src/action-engine.js';
import {choosePowerEffectTier} from '../src/power-effect-choices.js';
import {queueAction} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';

const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id==='power:detonate').copyId;
const options=c=>({powerId:copy(c),action:'standard-action',fp:'none',enhance:false});
const roll=(natural=10,bonus=16,calls=[])=>e=>{calls.push(e);return e.startsWith('1d20')?{value:natural+bonus,d20:[natural],display:e}:{value:Number(e.split('d')[0])*4,display:e};};

test('Detonate20139 has closed unopposed damage, activation enhancement and legal feature fixtures',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-detonate').revision,20139);
 for(const mastery of [false,true]){const d=api.derive(f.adept({mastery}),pack),p=d.forcePowers.find(p=>p.id==='power:detonate');assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}
 const bad=structuredClone(pack);bad.rules.offensivePowerEffects.find(r=>r.powerId==='power:detonate').defense='reflex';assert.throws(()=>validatePack(bad));
});

test('unopposed thresholds give raw object damage without defense, area, critical or damage descriptor invention',()=>{
 const d=api.derive(f.adept(),pack);
 for(const total of [19,20,24,25,29,30,34,35,40])for(const natural of [1,20])for(const activationEnhancement of [false,true]){
  const snapshot=offensivePowerSnapshot(d,pack,'power:detonate',{activationEnhancement}),calls=[],r=resolveOffensivePower(pack,'power:detonate',{total,natural},{snapshot,roller:roll(10,16,calls)});
  if(total<20){assert.deepEqual(calls,[]);assert.equal(r.text,'No effect');continue;}
  const base=total>=35?10:total>=30?8:total>=25?6:4,dice=base+(activationEnhancement?2:0);
  assert.deepEqual(calls,[dice+'d6']);assert.equal(r.damage,dice*4);assert.equal(r.damageType,'unspecified');assert.equal(r.targetScope,'one-unattended-object');assert.deepEqual(r.rows,[{damage:dice*4}]);assert.match(r.text,/One unattended object/);
  for(const word of ['Reflex','Fortitude','Will','Evasion','Cover','Natural 20','Force damage'])assert(!r.html.includes(word));assert(!Object.hasOwn(r,'criticalMultiplier'));
 }
});

test('predeclared enhancement pays only at actual activation and stays paid on failure',()=>{
 const c=f.adept(),fp=c.forcePoints,calls=[];c.skillModifiers={'skill:use-the-force':-api.derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total};
 const step=queueAction(c,'power',{...options(c),activationEnhancement:true}),queued=structuredClone(c);previewPlan(c,pack);assert.deepEqual(c,queued);assert.equal(c.forcePoints,fp);
 const r=executeAction(c,pack,step.id,roll(1,0,calls));assert.deepEqual(calls,['1d20+0']);assert.match(r.text,/No effect/);assert.equal(c.forcePoints,fp-1);assert(c.actionState.forceSpent);assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.actionState.plan[0].options.offensivePowerSnapshot.activationEnhanced,true);assert(c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===step.options.powerId).spent);api.validateCharacter(c,pack);
});

test('saved lower-tier prepaid result retains enhancement and never spends or rolls its original check again',()=>{
 const c=f.adept(),fp=c.forcePoints,calls=[];takeAction(c,pack,'power',{...options(c),activationEnhancement:true},roll(20,16,calls));
 assert.equal(calls.length,1);assert.equal(c.forcePoints,fp-1);assert.equal(c.actionState.plan[0].status,'waiting');assert.equal(c.actionState.plan[0].result.enhanceAllowed,false);
 const q=JSON.parse(JSON.stringify(c)),s=q.actionState.plan[0],check=structuredClone(s.result.check);choosePowerEffectTier(q,pack,s.id,20);s.options.activationEnhancement=false;
 const r=finishForceChoice(q,pack,s.id,false,roll(20,16,calls));assert.match(r.text,/6d6 = 24/);assert(!r.text.includes('Natural 20'));assert.equal(q.forcePoints,fp-1);assert.deepEqual(q.actionState.plan[0].result.check,check);assert.deepEqual(calls.slice(1),['6d6']);assert.equal(q.currentHP,c.currentHP);assert.equal(q.darkSideScore,0);assert.deepEqual(q.actionState.spent,['standard']);api.validateCharacter(q,pack);
 const done=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,s.id,false,()=>assert.fail('Replay must not roll')));assert.deepEqual(q,done);
});

test('ordinary FP improves the check and unlocks tiers without special damage or a second payment',()=>{
 const c=f.adept(),fp=c.forcePoints;c.skillModifiers={'skill:use-the-force':10-api.derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total};takeAction(c,pack,'power',{...options(c),fp:'ask'},roll(9,10));
 const s=c.actionState.plan[0];assert.equal(s.result.enhanceAllowed,false);const before=structuredClone(c);s.result.enhanceAllowed=true;assert.throws(()=>finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('Cannot buy special FP after check')),/activation/);Object.assign(c,before);
 finishForceChoice(c,pack,s.id,true,()=>({value:6,display:'6'}));assert.equal(c.forcePoints,fp-1);assert.equal(c.actionState.plan[0].result.check.total,25);assert.equal(c.actionState.plan[0].status,'waiting');choosePowerEffectTier(c,pack,s.id,20);const r=finishForceChoice(c,pack,s.id,false,e=>{assert.equal(e,'4d6');return {value:16,display:e};});assert.match(r.text,/4d6 = 16/);assert.equal(c.forcePoints,fp-1);
});

test('invalid action, absent FP and Adept double cost reject before RNG or resource mutation',()=>{
 for(const variant of ['adept','noFP','spent','budget']){
  const c=f.adept();beginNextTurn(c,pack);const o={...options(c),activationEnhancement:true};
  if(variant==='adept')o.rollMode='adept';if(variant==='noFP')c.forcePoints=0;if(variant==='spent')c.actionState.forceSpent=true;if(variant==='budget')c.actionState.spent=['standard'];
  const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',o,()=>assert.fail('Invalid action must not roll')));assert.deepEqual(c,before);
 }
});

test('genuine Mastery can use a prepaid enhancement, Adept uses one FP and natural20 only recovers the suite',()=>{
 const c=f.adept({mastery:true}),fp=c.forcePoints;beginNextTurn(c,pack);const calls=[];takeAction(c,pack,'power',{...options(c),activationEnhancement:true,rollMode:'take10',effectDC:20},roll(20,16,calls));assert.deepEqual(calls,['6d6']);assert.equal(c.forcePoints,fp-1);assert.equal(c.actionState.plan[0].result.check.natural,10);assert.match(c.actionState.plan[0].result.text,/6d6 = 24/);
 beginNextTurn(c,pack);takeAction(c,pack,'power',{...options(c),powerId:api.derive(c,pack).forcePowers.find(p=>p.id==='power:detonate'&&!p.spent).copyId,rollMode:'adept',effectDC:20},roll(20));assert.equal(c.forcePoints,fp-2);assert(c.forcePowerRecoveryPending);assert.match(c.actionState.plan[0].result.text,/4d6 = 16/);assert(!c.actionState.plan[0].result.text.includes('Natural 20'));endCurrentTurn(c,pack);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));api.validateCharacter(c,pack);
});

test('malformed prepaid flags/snapshots reject, while historical manual pending activation is not replayed',()=>{
 const c=f.adept();takeAction(c,pack,'power',{...options(c),fp:'ask'},roll());const s=c.actionState.plan[0];
 for(const value of [null,'true',1]){const bad=structuredClone(c);bad.actionState.plan[0].options.offensivePowerSnapshot.activationEnhanced=value;assert.throws(()=>api.validateCharacter(bad,pack));}
 const missing=structuredClone(c);delete missing.actionState.plan[0].options.offensivePowerSnapshot.activationEnhanced;assert.throws(()=>api.validateCharacter(missing,pack));
 const wrong=structuredClone(c);wrong.actionState.plan[0].options.activationEnhancement='true';assert.throws(()=>api.validateCharacter(wrong,pack));
 delete s.options.effectPowerId;delete s.options.offensivePowerSnapshot;s.result.enhanceAllowed=true;delete s.result.effectChoiceAllowed;api.validateCharacter(c,pack);const r=finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('Legacy manual must not calculate'));assert.match(r.text,/enhancement manual/);assert(!r.text.includes('unattended'));api.validateCharacter(c,pack);
});
