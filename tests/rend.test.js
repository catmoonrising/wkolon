import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/rend-fixtures.cjs';
import {resolveOffensivePower,offensivePowerSnapshot} from '../src/offensive-powers.js';
import {takeAction,describeAction,executeAction,finishForceChoice,beginNextTurn,endCurrentTurn,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';

const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id==='power:rend').copyId;
const opts=c=>({powerId:copy(c),action:'standard-action',fp:'none',enhance:true});
const dice=(natural=10,bonus=16,calls=[])=>expression=>{
 calls.push(expression);return expression.startsWith('1d20')?{value:natural+bonus,d20:[natural],display:expression}:{value:expression==='5d6'?20:12,display:expression};
};

test('Rend20033 has a closed exception contract and legal Adept/Mastery fixtures',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-rend').revision,20033);
 for(const mastery of [false,true]){const d=api.derive(f.adept({mastery}),pack),p=d.forcePowers.find(p=>p.id==='power:rend');assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}
 const bad=structuredClone(pack);bad.rules.offensivePowerEffects.find(r=>r.powerId==='power:rend').natural20Multiplier=3;assert.throws(()=>validatePack(bad));
});

test('Rend doubles only a selected natural20, retains inclusive Reflex and conditional living0HP outcome',()=>{
 const snapshot=offensivePowerSnapshot(api.derive(f.adept(),pack),pack,'power:rend');
 for(const natural of [1,10,19,20])for(const total of [-4,20,40])for(const enhanced of [false,true]){
  const calls=[],r=resolveOffensivePower(pack,'power:rend',{natural,total},{snapshot,enhanced,hitConfirmed:true,roller:dice(natural,16,calls)});
  const raw=enhanced?20:12,damage=raw*(natural===20?2:1),hit=r.rows.find(r=>r.hi!==null),miss=r.rows.find(r=>r.hi===null);
  assert.deepEqual(calls,[enhanced?'5d6':'3d6']);assert.equal(r.damage,damage);assert.equal(r.damageType,'unspecified');assert.equal(r.criticalMultiplier,natural===20?2:1);
  assert.equal(hit.hi,total);assert.equal(hit.damage,damage);assert.deepEqual(hit.onZeroHP,{severed:true,livingKilled:true});assert.equal(miss.lo,total+1);assert.equal(miss.damage,0);assert.equal(miss.onZeroHP,null);
  assert.match(r.text,/If this damage reduces the target to 0 HP/);assert.match(r.text,/living creatures are killed/);assert(!r.html.includes('<th>Evasion'));assert(!r.html.includes('<th>Cover'));
 }
 assert.throws(()=>resolveOffensivePower(pack,'power:rend',{total:30},{snapshot,roller:()=>assert.fail('Invalid natural must not roll')}));
});

test('success-only enhancement requires known inclusive hit or explicit post-check confirmation',()=>{
 const c=f.adept(),d=api.derive(c,pack),snapshot=offensivePowerSnapshot(d,pack,'power:rend');
 assert.throws(()=>resolveOffensivePower(pack,'power:rend',{natural:20,total:20},{snapshot,enhanced:true,roller:()=>assert.fail('Unconfirmed enhancement must not roll')}),/Confirm/);
 for(const targetReflex of [19,20,21]){
  const saved=offensivePowerSnapshot(d,pack,'power:rend',{targetReflex});
  if(targetReflex>20)assert.throws(()=>resolveOffensivePower(pack,'power:rend',{natural:20,total:20},{snapshot:saved,enhanced:true,hitConfirmed:true,roller:()=>assert.fail('Known miss must not roll')}),/Confirm/);
  else assert.equal(resolveOffensivePower(pack,'power:rend',{natural:20,total:20},{snapshot:saved,enhanced:true,roller:dice()}).damage,40);
 }
});

test('queue/preview are pure, saved confirmation pays once and retains original check',()=>{
 const c=f.adept(),fp=c.forcePoints,initial=structuredClone(c),step=queueAction(c,'power',opts(c));
 const queued=structuredClone(c);previewPlan(c,pack);assert.deepEqual(c,queued);assert.equal(c.forcePoints,fp);assert(!c.levels.flatMap(l=>l.forcePowers||[]).some(p=>p.spent));
 const calls=[];executeAction(c,pack,step.id,dice(20,16,calls));assert.deepEqual(calls.length,1);assert.equal(c.actionState.plan[0].status,'waiting');
 const saved=JSON.parse(JSON.stringify(c)),check=structuredClone(saved.actionState.plan[0].result.check),before=structuredClone(saved);
 assert.throws(()=>finishForceChoice(saved,pack,step.id,'enhance',()=>assert.fail('Missing confirmation must be pure')),/Confirm/);assert.deepEqual(saved,before);
 const r=finishForceChoice(saved,pack,step.id,'enhance-hit',dice(20,16,calls));
 assert.deepEqual(calls.length,2);assert.match(r.text,/5d6 = 20; Natural 20: 20 × 2 = 40/);assert.match(r.text,/Hit confirmed/);assert.equal(saved.forcePoints,fp-1);assert.equal(saved.actionState.plan[0].options.offensiveHitConfirmed,true);assert.deepEqual(saved.actionState.plan[0].result.check,check);
 assert.equal(saved.currentHP,initial.currentHP);assert.equal(saved.condition,initial.condition);assert.deepEqual(api.derive(saved,pack).defenses,api.derive(initial,pack).defenses);assert.equal(saved.darkSideScore,1);assert.deepEqual(saved.actionState.spent,['standard']);api.validateCharacter(saved,pack);
 const done=structuredClone(saved);assert.throws(()=>finishForceChoice(saved,pack,step.id,'enhance-hit',()=>assert.fail('Completed result must not reroll')));assert.deepEqual(saved,done);
});

test('known Reflex is frozen at activation and a known miss defeats conflicting hit confirmation',()=>{
 for(const targetReflex of [26,27]){
  const c=f.adept(),calls=[];takeAction(c,pack,'power',{...opts(c),targetReflex},dice(10,16,calls));const s=c.actionState.plan[0];
  assert.equal(s.options.offensivePowerSnapshot.targetReflex,targetReflex);
  if(targetReflex===26){s.options.targetReflex=100;const r=finishForceChoice(c,pack,s.id,'enhance',dice());assert.match(r.text,/5d6 = 20/);assert.equal(c.forcePoints,f.adept().forcePoints-1);}
  else {assert.equal(s.status,'done');assert.equal(s.result.enhanceAllowed,false);assert.equal(calls.length,2);const before=structuredClone(c);assert.throws(()=>finishForceChoice(c,pack,s.id,'enhance-hit',()=>assert.fail('Miss must not spend/roll')));assert.deepEqual(c,before);}
 }
 const c=f.adept();takeAction(c,pack,'power',{...opts(c),targetReflex:50},dice());const s=c.actionState.plan[0];s.status='waiting';s.result.enhanceAllowed=true;const before=structuredClone(c);assert.throws(()=>finishForceChoice(c,pack,s.id,'enhance-hit',()=>assert.fail('Known miss overrides forged confirmation')),/Confirm/);assert.deepEqual(c,before);
});

test('premature confirmation and malformed target/snapshots are rejected',()=>{
 const c=f.adept();assert.throws(()=>describeAction(c,pack,'power',{...opts(c),offensiveHitConfirmed:true}));
 for(const targetReflex of [false,'20',20.1,100001]){assert.throws(()=>describeAction(c,pack,'power',{...opts(c),targetReflex}));const q=structuredClone(c);queueAction(q,'power',{...opts(q),targetReflex});assert.throws(()=>api.validateCharacter(q,pack));}
 const q=structuredClone(c);queueAction(q,'power',{...opts(q),offensiveHitConfirmed:true});assert.throws(()=>api.validateCharacter(q,pack));
 takeAction(c,pack,'power',opts(c),dice());for(const value of [null,false,10.1,100001]){const q=structuredClone(c);q.actionState.plan[0].options.offensivePowerSnapshot.targetReflex=value;assert.throws(()=>api.validateCharacter(q,pack));}
 const bad=structuredClone(c);bad.actionState.plan[0].options.offensiveHitConfirmed=true;assert.throws(()=>api.validateCharacter(bad,pack));
});

test('Adept kept20 doubles once with suite recovery; Mastery has no natural20 or extra special FP',()=>{
 const c=f.adept({mastery:true}),fp=c.forcePoints,calls=[];beginNextTurn(c,pack);
 const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...opts(c),rollMode:'adept'},dice()),/Only one Force Point/);assert.deepEqual(c,before);
 let n=0;takeAction(c,pack,'power',{...opts(c),enhance:false,rollMode:'adept'},e=>{calls.push(e);if(e.startsWith('1d20')){const natural=n++?20:1;return {value:natural+16,d20:[natural],display:e};}return {value:12,display:e};});
 assert.equal(calls.length,3);assert.match(c.actionState.plan[0].result.text,/3d6 = 12; Natural 20: 12 × 2 = 24/);assert(c.forcePowerRecoveryPending);assert.equal(c.forcePoints,fp-1);
 endCurrentTurn(c,pack);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));beginNextTurn(c,pack);
 const roll=[];takeAction(c,pack,'power',{...opts(c),enhance:false,rollMode:'take10'},e=>{roll.push(e);return {value:12,display:e};});assert.deepEqual(roll,['3d6']);assert.equal(c.actionState.plan[0].result.check.natural,10);assert(!c.actionState.plan[0].result.text.includes('Natural 20'));assert(!c.forcePowerRecoveryPending);api.validateCharacter(c,pack);
});

test('Many Shades permits ordinary FP and keeps its check boost separate from critical and special damage',()=>{
 const c=f.adept({shaded:true});assert.deepEqual(api.derive(c,pack).issues,[]);assert(!api.derive(c,pack).forcePowers.find(p=>p.id==='power:rend').descriptors.includes('dark-side'));
 c.skillModifiers={'skill:use-the-force':10-api.derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total};
 takeAction(c,pack,'power',{...opts(c),fp:'ask'},dice(10,10));const id=c.actionState.plan[0].id;
 const r=finishForceChoice(c,pack,id,true,e=>({value:e.endsWith('kh1')?6:12,display:e}));assert.match(r.text,/Force Point \+6 = 26/);assert.match(r.text,/3d6 = 12/);assert(!r.text.includes('Natural 20'));assert.equal(c.darkSideScore,0);assert.equal(c.actionState.plan[0].result.check.natural,10);assert.throws(()=>finishForceChoice(c,pack,id,'enhance-hit',dice()));
});

test('older manual pending Rend results finish without retroactive damage or new hit confirmation',()=>{
 const c=f.adept();takeAction(c,pack,'power',opts(c),dice());const s=c.actionState.plan[0];delete s.options.effectPowerId;delete s.options.offensivePowerSnapshot;api.validateCharacter(c,pack);
 const r=finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('Legacy must not roll damage'));assert.match(r.text,/enhancement manual/);assert(!r.text.includes('ripped'));api.validateCharacter(c,pack);
});
