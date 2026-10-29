import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/technometry-fixtures.cjs';
import {resolveConditionPower,conditionPowerSnapshot,technometrySelection} from '../src/condition-powers.js';
import {takeAction,executeAction,finishForceChoice,beginNextTurn,endCurrentTurn,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),id='power:technometry',copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id===id&&!p.spent).copyId;
const options=(c,technometry={target:'droid',effect:'information',will:null})=>({powerId:copy(c),action:'standard-action',fp:'none',enhance:true,technometry});
const roll=(natural=20,bonus=16,calls=[])=>e=>{calls.push(e);return {value:natural+bonus,d20:[natural],display:e};};
const resolve=(total,selection={},enhanced=false)=>resolveConditionPower(pack,id,{total,natural:20},{enhanced,snapshot:conditionPowerSnapshot({},pack,id,selection)});

test('Technometry20066 is a closed contract with genuine feature fixtures',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-technometry').revision,20066);
 for(const mastery of [false,true]){const d=api.derive(f.adept({mastery}),pack),p=d.forcePowers.find(p=>p.id===id);assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}
 const bad=structuredClone(pack);bad.rules.conditionPowerEffects.find(r=>r.powerId===id).information.margin=4;assert.throws(()=>validatePack(bad));
});

test('information uses inclusive Will and all five-point margin boundaries, never an automatic natural20 hit',()=>{
 for(const will of [-5,0,20,30,50])for(const margin of [-1,0,1,4,5,6,9,10,14,15])for(const enhanced of [false,true]){
  const x=resolve(will+margin,{will},enhanced);assert.equal(x.success,margin>=0);assert.equal(x.informationPieces,margin<0?0:1+Math.floor(margin/5)+(enhanced?2:0));assert(!Object.hasOwn(x,'damage'));assert(!Object.hasOwn(x,'criticalMultiplier'));
 }
 const conditional=resolve(35,{},true);assert.equal(conditional.success,null);assert.equal(conditional.informationPieces,null);assert.equal(conditional.maximumWill,35);assert.equal(conditional.informationFormula,'3 + floor((35 - Will) / 5)');assert.match(conditional.text,/^Will ≤ 35:/);assert.match(conditional.html,/Access Information/);
});

test('Droid modes are mutually exclusive and actor-specific, special FP extends deadline but not attacks',()=>{
 for(const effect of ['senses','defense','flee'])for(const enhanced of [false,true]){
  const x=resolve(30,{target:'droid',effect,will:30},enhanced);assert.equal(x.success,true);assert.equal(x.effect,effect);assert.equal(x.informationPieces,undefined);
  if(effect==='flee'){assert.equal(x.fleeTurns,enhanced?3:2);assert.match(x.text,/flee from you at top speed/);}else{assert.equal(x.extraRounds,enhanced?1:0);assert.match(x.text,enhanced?/one round after the end/:/Until the end/);if(effect==='defense'){assert.equal(x.attacks,1);assert.match(x.text,/your next attack/);}else assert.match(x.text,/You may make Stealth checks/);}
  assert.equal(resolve(29,{target:'droid',effect,will:30},enhanced).success,false);
  const unknown=resolve(30,{target:'droid',effect},enhanced);assert.equal(unknown.success,null);assert.match(unknown.text,/^Will ≤ 30:/);assert.match(unknown.html,/Will/);
 }
 for(const effect of ['senses','defense','flee'])assert.throws(()=>technometrySelection({target:'device',effect}));
});

test('frozen selection/check survives reload and special FP without target or caster stat mutation',()=>{
 const c=f.adept(),fp=c.forcePoints,inventory=structuredClone(c.inventory),before=api.derive(c,pack),calls=[],step=queueAction(c,'power',options(c,{target:'droid',effect:'defense',will:30})),queued=structuredClone(c);previewPlan(c,pack);assert.deepEqual(c,queued);
 executeAction(c,pack,step.id,roll(20,16,calls));assert.equal(calls.length,1);const q=JSON.parse(JSON.stringify(c)),check=structuredClone(q.actionState.plan[0].result.check);q.actionState.plan[0].options.technometry={target:'device',effect:'information',will:99};const x=finishForceChoice(q,pack,step.id,'enhance',()=>assert.fail('No RNG'));assert.match(x.text,/your next attack/);assert.match(x.text,/one round after/);assert.deepEqual(q.actionState.plan[0].result.check,check);assert.equal(q.forcePoints,fp-1);assert.deepEqual(q.inventory,inventory);assert.equal(q.currentHP,c.currentHP);assert.deepEqual(api.derive(q,pack).defenses,before.defenses);assert.deepEqual(api.derive(q,pack).skills,before.skills);api.validateCharacter(q,pack);const done=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,step.id,'enhance'));assert.deepEqual(q,done);
});

test('known miss suppresses special, ordinary FP can succeed using original Will with no extra information',()=>{
 const c=f.adept();takeAction(c,pack,'power',{...options(c,{will:30}),fp:'ask'},roll(13));const s=c.actionState.plan[0];assert.equal(s.result.enhanceAllowed,false);assert.equal(s.status,'waiting');const failed=structuredClone(c);assert.throws(()=>finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('No RNG')));assert.deepEqual(c,failed);s.options.technometry.will=1;const fp=c.forcePoints,x=finishForceChoice(c,pack,s.id,true,()=>({value:2,display:'2'}));assert.match(x.text,/1 piece of information/);assert.equal(c.forcePoints,fp-1);assert.equal(c.actionState.plan[0].result.check.total,31);assert.equal(c.actionState.plan[0].status,'done');
 const miss=f.adept();const r=takeAction(miss,pack,'power',options(miss,{will:50}),roll());assert.match(r.text,/No effect/);assert.equal(miss.actionState.plan[0].status,'done');
});

test('Mastery and Adept share copy/FP/recovery paths, no extra check or damage roll',()=>{
 const c=f.adept({mastery:true}),fp=c.forcePoints;beginNextTurn(c,pack);takeAction(c,pack,'power',{...options(c,{will:20}),rollMode:'take10'},()=>assert.fail('Mastery does not roll'));const s=c.actionState.plan[0];assert.equal(s.result.check.natural,10);const x=finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('No RNG'));assert.match(x.text,/4 pieces of information/);assert.equal(c.forcePoints,fp-1);assert(!c.forcePowerRecoveryPending);
 beginNextTurn(c,pack);const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...options(c),rollMode:'adept'},roll()),/Only one Force Point/);assert.deepEqual(c,before);const calls=[];takeAction(c,pack,'power',{...options(c,{target:'droid',effect:'flee',will:30}),rollMode:'adept',enhance:false},roll(20,16,calls));assert.equal(calls.length,2);assert(c.forcePowerRecoveryPending);assert.match(c.actionState.plan[0].result.text,/next 2 turns/);endCurrentTurn(c,pack);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));api.validateCharacter(c,pack);
});

test('invalid target/snapshot choices and old manual results cannot create new effects',()=>{
 for(const selection of [null,[],{target:'organic'},{target:'device',effect:'flee'},{will:1.5},{will:'30'},{extra:true}]){const c=f.adept(),before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',options(c,selection),()=>assert.fail('Before RNG')));assert.deepEqual(c,before);}
 const c=f.adept();takeAction(c,pack,'power',options(c),roll());for(const change of [s=>delete s.selection.will,s=>s.selection.target='organic',s=>s.extra=true]){const bad=structuredClone(c);change(bad.actionState.plan[0].options.conditionPowerSnapshot);assert.throws(()=>api.validateCharacter(bad,pack));}
 const s=c.actionState.plan[0];delete s.options.effectPowerId;delete s.options.conditionPowerSnapshot;delete s.options.technometry;api.validateCharacter(c,pack);const x=finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('Legacy no RNG'));assert.match(x.text,/enhancement manual/);assert(!x.text.includes('pieces of information'));api.validateCharacter(c,pack);
 const unrelated=f.adept();for(const l of unrelated.levels)for(const p of l.forcePowers||[])if(p.powerId===id)p.powerId='power:drain-energy';const p=api.derive(unrelated,pack).forcePowers.find(p=>p.id==='power:drain-energy');const before=structuredClone(unrelated);assert.throws(()=>takeAction(unrelated,pack,'power',{powerId:p.copyId,technometry:{}},()=>assert.fail('Before RNG')));assert.deepEqual(unrelated,before);
});
