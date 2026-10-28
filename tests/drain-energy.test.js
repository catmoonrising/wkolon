import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/drain-energy-fixtures.cjs';
import {resolveConditionPower} from '../src/condition-powers.js';
import {powerEffectLabel,powerEffectTierLabel,choosePowerEffectTier} from '../src/power-effect-choices.js';
import {takeAction,executeAction,finishForceChoice,beginNextTurn,endCurrentTurn,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';

const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),id='power:drain-energy',copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id===id).copyId;
const options=c=>({powerId:copy(c),action:'standard-action',fp:'none',enhance:true});
const roll=(natural=20,bonus=16,calls=[])=>e=>{calls.push(e);return {value:natural+bonus,d20:[natural],display:e};};

test('Drain Energy20396 has a closed size/supply contract and genuine Adept/Mastery fixtures',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-drain-energy').revision,20396);
 const rule=pack.rules.conditionPowerEffects.find(r=>r.powerId===id);assert.equal(powerEffectLabel(rule),'Size');assert.deepEqual(rule.thresholds.map(t=>powerEffectTierLabel(rule,t)),['Small','Medium','Large','Huge']);
 for(const mastery of [false,true]){const d=api.derive(f.adept({mastery}),pack),p=d.forcePowers.find(p=>p.id===id);assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}
 const bad=structuredClone(pack);bad.rules.conditionPowerEffects.find(r=>r.powerId===id).thresholds[2].generator=true;assert.throws(()=>validatePack(bad));
});

test('all tier boundaries, one-category FP increase and generator gate use the selected base tier',()=>{
 for(const total of [-1,19,20,24,25,29,30,34,35,50])for(const enhanced of [false,true])for(const natural of [1,20]){
  const r=resolveConditionPower(pack,id,{total,natural},{enhanced});if(total<20){assert.equal(r.text,'No effect');continue;}
  const tier=total>=35?3:total>=30?2:total>=25?1:0,size=['small','medium','large','huge','gargantuan'][tier+(enhanced?1:0)];
  assert.equal(r.maximumSize,size);assert.equal(r.generator,total>=35);assert.equal(r.drainsEnergyCells,true);assert.equal(r.replacementRequired,'energy-cells');assert(!Object.hasOwn(r,'damage'));
  assert.match(r.text,/cannot be used until its Energy Cells are replaced/);for(const word of ['Reflex','Fortitude','Will','Ion damage','Force damage'])assert(!r.html.includes(word));
 }
 const lesser=resolveConditionPower(pack,id,{total:40,natural:20},{enhanced:true,effectDC:30});assert.equal(lesser.maximumSize,'huge');assert.equal(lesser.generator,false);assert.match(lesser.text,/Power Generators require the DC 35 effect/);
 assert.throws(()=>resolveConditionPower(pack,id,{total:40},{effectDC:28}));
});

test('saved lower tier and special FP reuse the check without affecting caster equipment or HP',()=>{
 const c=f.adept(),fp=c.forcePoints,initial=structuredClone(c),calls=[],step=queueAction(c,'power',options(c));const queued=structuredClone(c);previewPlan(c,pack);assert.deepEqual(c,queued);assert.equal(c.forcePoints,fp);
 executeAction(c,pack,step.id,roll(20,16,calls));assert.equal(calls.length,1);const q=JSON.parse(JSON.stringify(c));choosePowerEffectTier(q,pack,step.id,30);const check=structuredClone(q.actionState.plan[0].result.check);
 const r=finishForceChoice(q,pack,step.id,'enhance',()=>assert.fail('Drain Energy never rolls damage'));assert.match(r.text,/Huge or smaller/);assert.match(r.text,/require the DC 35 effect/);assert.equal(q.forcePoints,fp-1);assert.deepEqual(q.actionState.plan[0].result.check,check);assert.deepEqual(q.inventory,initial.inventory);assert.equal(q.currentHP,initial.currentHP);assert.equal(q.condition,initial.condition);assert.equal(q.darkSideScore,0);assert.deepEqual(q.actionState.spent,['standard']);api.validateCharacter(q,pack);
 const done=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,step.id,'enhance',()=>assert.fail('No replay')));assert.deepEqual(q,done);
});

test('ordinary FP unlocks DC35 generator drainage without buying the size enhancement',()=>{
 const c=f.adept(),fp=c.forcePoints;c.skillModifiers={'skill:use-the-force':24-api.derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total};takeAction(c,pack,'power',{...options(c),fp:'ask'},roll(10,24));const s=c.actionState.plan[0];
 finishForceChoice(c,pack,s.id,true,()=>({value:1,display:'1'}));assert.equal(c.forcePoints,fp-1);assert.equal(c.actionState.plan[0].result.check.total,35);assert.equal(c.actionState.plan[0].status,'waiting');
 const r=finishForceChoice(c,pack,s.id,false,()=>assert.fail('No damage roll'));assert.match(r.text,/Huge or smaller/);assert.match(r.text,/drain all power from that generator instead/);assert(!r.text.includes('Gargantuan'));assert.equal(c.forcePoints,fp-1);
});

test('Adept/Mastery share FP and natural20 recovery without invented defense or damage checks',()=>{
 const c=f.adept({mastery:true}),fp=c.forcePoints;beginNextTurn(c,pack);const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...options(c),rollMode:'adept'},roll()),/Only one Force Point/);assert.deepEqual(c,before);
 const calls=[];takeAction(c,pack,'power',{...options(c),rollMode:'adept',enhance:false,effectDC:35},roll(20,16,calls));assert.equal(calls.length,2);assert.equal(c.forcePoints,fp-1);assert(c.forcePowerRecoveryPending);assert.match(c.actionState.plan[0].result.text,/Huge or smaller/);endCurrentTurn(c,pack);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));
 beginNextTurn(c,pack);takeAction(c,pack,'power',{...options(c),rollMode:'take10',enhance:false,effectDC:20},()=>assert.fail('Mastery must not roll'));assert.equal(c.actionState.plan[0].result.check.natural,10);assert.match(c.actionState.plan[0].result.text,/Small or smaller/);assert(!c.forcePowerRecoveryPending);api.validateCharacter(c,pack);
});

test('below20 has no effect and old manual pending history is never retroactively resolved',()=>{
 const c=f.adept();c.skillModifiers={'skill:use-the-force':-api.derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total};const r=takeAction(c,pack,'power',options(c),roll(19,0));assert.match(r.text,/No effect/);assert.equal(c.actionState.plan[0].status,'done');
 const old=f.adept();takeAction(old,pack,'power',options(old),roll());const s=old.actionState.plan[0];delete s.options.effectPowerId;delete s.result.effectChoiceAllowed;api.validateCharacter(old,pack);const done=finishForceChoice(old,pack,s.id,'enhance',()=>assert.fail('Old manual must not roll'));assert.match(done.text,/enhancement manual/);assert(!done.text.includes('Energy Cells'));api.validateCharacter(old,pack);
});
