import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/fold-space-fixtures.cjs';
import {resolveConditionPower} from '../src/condition-powers.js';
import {choosePowerEffectTier,powerEffectTierLabel} from '../src/power-effect-choices.js';
import {takeAction,executeAction,finishForceChoice,beginNextTurn,endCurrentTurn,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';

const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),id='power:fold-space',f=make(pack,api),copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id===id&&!p.spent).copyId;
const options=c=>({powerId:copy(c),action:'full-round-action',fp:'none',enhance:true});
const roll=(natural=20,bonus=16,calls=[])=>e=>{calls.push(e);return {value:natural+bonus,d20:[natural],display:e};};

test('Fold Space20418 has closed transport tiers and legal Adept/Mastery fixtures',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-fold-space').revision,20418);
 const r=pack.rules.conditionPowerEffects.find(r=>r.powerId===id);assert.deepEqual(r.thresholds.map(t=>powerEffectTierLabel(r,t)),['Medium, 6 squares','Large, 12 squares','Huge, 18 squares','Gargantuan, 24 squares','Colossal, 30 squares']);
 for(const mastery of [false,true]){const d=api.derive(f.adept({mastery}),pack),p=d.forcePowers.find(p=>p.id===id);assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}
 const p=structuredClone(pack);p.rules.conditionPowerEffects.find(r=>r.powerId===id).enhancement.choices[0].sizeCategories=3;assert.throws(()=>validatePack(p));
});

test('every threshold, both improvements and selected lesser tiers preserve exclusive limits',()=>{
 const sizes=['medium','large','huge','gargantuan','colossal','colossal-frigate','colossal-cruiser'];
 for(const total of [-1,19,20,24,25,29,30,34,35,39,40,50])for(const choice of [undefined,'size','distance'])for(const natural of [1,20]){
  const x=resolveConditionPower(pack,id,{total,natural},{enhanced:!!choice,enhancementChoice:choice});if(total<20){assert.equal(x.text,'No effect');continue;}
  const tier=Math.min(4,Math.floor((total-20)/5));assert.equal(x.maximumSize,sizes[tier+(choice==='size'?2:0)]);assert.equal(x.distance,(tier+1)*6*(choice==='distance'?2:1));assert.equal(x.contentsTransported,true);assert.equal(x.targetScope,'held-or-unattended-object-or-occupied-vehicle');for(const key of ['damage','critical','defense','rows'])assert(!Object.hasOwn(x,key));
 }
 const low=resolveConditionPower(pack,id,{total:50},{enhanced:true,enhancementChoice:'size',effectDC:20});assert.equal(low.maximumSize,'huge');assert.equal(low.distance,6);
 assert.throws(()=>resolveConditionPower(pack,id,{total:40},{enhanced:true}));assert.throws(()=>resolveConditionPower(pack,id,{total:40},{enhanced:true,enhancementChoice:'both'}));assert.throws(()=>resolveConditionPower(pack,id,{total:40},{enhancementChoice:'size'}));assert.throws(()=>resolveConditionPower(pack,'power:drain-energy',{total:40},{enhanced:true,enhancementChoice:'size'}));
});

test('saved named choices reuse original check, spend once and leave inventory/HP/location external',()=>{
 for(const choice of ['size','distance']){
  const c=f.adept(),initial=structuredClone(c),calls=[],step=queueAction(c,'power',options(c)),queued=structuredClone(c);previewPlan(c,pack);assert.deepEqual(c,queued);
  executeAction(c,pack,step.id,roll(20,16,calls));assert.equal(calls.length,1);assert.deepEqual(c.actionState.spent,['standard','move','swift']);const q=JSON.parse(JSON.stringify(c));choosePowerEffectTier(q,pack,step.id,20);const check=structuredClone(q.actionState.plan[0].result.check);
  for(const bad of ['enhance','enhance:both','enhance:']){const before=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,step.id,bad,()=>assert.fail('No RNG')));assert.deepEqual(q,before);}
  const r=finishForceChoice(q,pack,step.id,'enhance:'+choice,()=>assert.fail('No RNG'));assert.match(r.text,choice==='size'?/Huge or smaller object up to 6 squares/:/Medium or smaller object up to 12 squares/);assert.equal(q.actionState.plan[0].options.powerEnhancementChoice,choice);assert.equal(q.forcePoints,initial.forcePoints-1);assert.deepEqual(q.actionState.plan[0].result.check,check);assert.deepEqual(q.inventory,initial.inventory);assert.equal(q.currentHP,initial.currentHP);assert.equal(q.condition,initial.condition);api.validateCharacter(q,pack);
  const done=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,step.id,'enhance:'+choice));assert.deepEqual(q,done);
 }
});

test('ordinary FP unlocks a tier without either improvement',()=>{
 const c=f.adept(),fp=c.forcePoints;c.skillModifiers={'skill:use-the-force':14-api.derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total};takeAction(c,pack,'power',{...options(c),fp:'ask'},roll(10,14));const s=c.actionState.plan[0];finishForceChoice(c,pack,s.id,true,()=>({value:1,display:'1'}));assert.equal(c.actionState.plan[0].result.check.total,25);const x=finishForceChoice(c,pack,s.id,false,()=>assert.fail('No RNG'));assert.match(x.text,/Large or smaller object up to 12 squares/);assert.equal(c.forcePoints,fp-1);assert.equal(c.actionState.plan[0].options.powerEnhancementChoice,undefined);
});

test('real Mastery/Adept/recovery and full-round preflight share existing budgets',()=>{
 const c=f.adept({mastery:true}),fp=c.forcePoints;beginNextTurn(c,pack);let before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...options(c),rollMode:'adept'},roll()),/Only one Force Point/);assert.deepEqual(c,before);
 const x=takeAction(c,pack,'power',{...options(c),rollMode:'take10',effectDC:20},()=>assert.fail('Mastery does not roll'));assert.equal(x.check.natural,10);finishForceChoice(c,pack,c.actionState.plan[0].id,'enhance:distance',()=>assert.fail('No RNG'));assert.equal(c.forcePoints,fp-1);assert(!c.forcePowerRecoveryPending);
 beginNextTurn(c,pack);const calls=[];takeAction(c,pack,'power',{...options(c),rollMode:'adept',enhance:false,effectDC:35},roll(20,16,calls));assert.equal(calls.length,2);assert(c.forcePowerRecoveryPending);endCurrentTurn(c,pack);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));
 beginNextTurn(c,pack);takeAction(c,pack,'total-defense');before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',options(c),()=>assert.fail('Preflight before RNG')));assert.deepEqual(c,before);
});

test('named choices cannot be injected into drafts, another power, waiting state or legacy history',()=>{
 const c=f.adept(),before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...options(c),powerEnhancementChoice:'size'},()=>assert.fail('No RNG')));assert.deepEqual(c,before);
 takeAction(c,pack,'power',options(c),roll());const s=c.actionState.plan[0],bad=structuredClone(c);bad.actionState.plan[0].options.powerEnhancementChoice='size';assert.throws(()=>api.validateCharacter(bad,pack));delete s.options.effectPowerId;delete s.result.effectChoiceAllowed;api.validateCharacter(c,pack);const old=structuredClone(c);assert.throws(()=>finishForceChoice(c,pack,s.id,'enhance:size'));assert.deepEqual(c,old);const x=finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('No RNG'));assert.match(x.text,/enhancement manual/);assert(!x.text.includes('Transport a'));api.validateCharacter(c,pack);
 const other=f.adept();other.levels.flatMap(l=>l.forcePowers||[]).filter(p=>p.powerId===id).forEach(p=>p.powerId='power:drain-energy');for(const l of other.levels){if(l.talent?.choice===id)l.talent.choice='power:drain-energy';for(const x of l.classChoices||[])if(x.choice===id)x.choice='power:drain-energy';}const copy=api.derive(other,pack).forcePowers.find(p=>p.id==='power:drain-energy').copyId;takeAction(other,pack,'power',{powerId:copy,enhance:true},roll());const original=structuredClone(other);assert.throws(()=>finishForceChoice(other,pack,other.actionState.plan[0].id,'enhance:size'));assert.deepEqual(other,original);
});
