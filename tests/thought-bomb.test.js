import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/thought-bomb-fixtures.cjs';
import {resolveOffensivePower,offensivePowerSnapshot} from '../src/offensive-powers.js';
import {takeAction,executeAction,finishForceChoice,previewPlan,beginNextTurn,endCurrentTurn} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),id='power:thought-bomb',f=make(pack,api),copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id===id&&!p.spent).copyId,options=c=>({powerId:copy(c),action:'standard-action',fp:'none',enhance:true});
const roll=(calls=[],natural=20)=>e=>{calls.push(e);return e.startsWith('1d20')?{value:natural+16,d20:[natural],display:e}:{value:e==='4d6'?13:7,display:e};};

test('Thought Bomb20555 is closed, Mind-Affecting and uses real Adept/Mastery builds',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-thought-bomb').revision,20555);assert.deepEqual(pack.forcePowers.find(p=>p.id===id).descriptors,['mind-affecting']);const r=pack.rules.offensivePowerEffects.find(r=>r.powerId===id);assert.equal(r.defense,'will');assert.equal(r.areaProtection,'external-reflex');assert.deepEqual(r.onHitActionLoss,{action:'swift',count:1,duration:'target-next-turn'});
 const bad=structuredClone(pack);bad.rules.offensivePowerEffects.find(r=>r.powerId===id).onHitActionLoss.count=2;assert.throws(()=>validatePack(bad));for(const mastery of [false,true]){const d=api.derive(f.adept({mastery}),pack),p=d.forcePowers.find(p=>p.id===id);assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}
});
test('Will equality gets full damage and one Swift loss; misses get rounded half without action loss or numeric protection claims',()=>{
 const c=f.adept(),snapshot=offensivePowerSnapshot(api.derive(c,pack),pack,id);
 for(const total of [-10,1,9,10,20,35,50])for(const natural of [1,20])for(const enhanced of [false,true]){
  const calls=[],r=resolveOffensivePower(pack,id,{total,natural},{snapshot,enhanced,roller:roll(calls)}),hit=r.rows.find(x=>x.hi!==null),miss=r.rows.find(x=>x.hi===null),damage=enhanced?13:7;assert.deepEqual(calls,[enhanced?'4d6':'2d6']);assert.equal(hit.hi,total);assert.equal(hit.damage,damage);assert.deepEqual(hit.actionLoss,{action:'swift',count:1,duration:'target-next-turn'});assert.equal(miss.lo,total+1);assert.equal(miss.damage,Math.floor(damage/2));assert.equal(miss.actionLoss,null);for(const row of r.rows)for(const key of ['evasion','cover','splash','conditionSteps'])assert(!Object.hasOwn(row,key));assert.equal(r.damageType,'force');assert.equal(r.areaProtection,'external-reflex');assert.equal(r.targetScope,'opponents-within-2-squares');assert(!r.html.includes('<th>Evasion</th>'));assert(!r.html.includes('<th>Cover</th>'));assert.match(r.html,/Evasion and Cover: manual/);assert.match(r.html,/<th[^>]*>Swift<\/th>/);assert(!Object.hasOwn(r,'criticalMultiplier'));
 }
});
test('queue/save/original check and special FP roll damage once without modifying caster Swift/HP/defenses',()=>{
 const c=f.adept(),initial=structuredClone(c),d=api.derive(c,pack),calls=[],step=queueAction(c,'power',options(c)),queued=structuredClone(c);previewPlan(c,pack);assert.deepEqual(c,queued);executeAction(c,pack,step.id,roll(calls));assert.deepEqual(calls,['1d20+16']);const q=JSON.parse(JSON.stringify(c)),check=structuredClone(q.actionState.plan[0].result.check);const r=finishForceChoice(q,pack,step.id,'enhance',roll(calls));assert.deepEqual(calls,['1d20+16','4d6']);assert.equal(q.forcePoints,initial.forcePoints-1);assert.deepEqual(q.actionState.spent,['standard']);assert.deepEqual(q.actionState.plan[0].result.check,check);assert.match(r.text,/Lose 1 Swift Action on its next turn/);assert.match(r.text,/Opponents within 2 squares/);assert.deepEqual(q.inventory,initial.inventory);assert.equal(q.currentHP,initial.currentHP);assert.equal(q.condition,initial.condition);assert.deepEqual(api.derive(q,pack).defenses,d.defenses);assert.equal(q.darkSideScore,0);api.validateCharacter(q,pack);const done=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,step.id,'enhance',()=>assert.fail('No replay')));assert.deepEqual(q,done);
});
test('ordinary FP changes only original Will hit boundary, retaining base dice',()=>{
 const c=f.adept(),fp=c.forcePoints,calls=[];takeAction(c,pack,'power',{...options(c),fp:'ask'},roll(calls,1));const step=c.actionState.plan[0],check=step.result.check.total;const r=finishForceChoice(c,pack,step.id,true,e=>{calls.push(e);return {value:e.includes('kh1')?1:7,display:e};});assert.equal(c.actionState.plan[0].result.check.total,check+1);assert.equal(c.forcePoints,fp-1);assert.equal(calls.length,3);assert.equal(calls.at(-1),'2d6');assert.match(r.text,/2d6 = 7/);assert(!r.text.includes('4d6'));assert.deepEqual(c.actionState.spent,['standard']);
});
test('genuine Mastery/Adept, natural20 suite recovery and invalid roll transaction reuse shared behavior',()=>{
 const c=f.adept({mastery:true}),fp=c.forcePoints,calls=[];beginNextTurn(c,pack);takeAction(c,pack,'power',{...options(c),rollMode:'take10',enhance:false},roll(calls));assert.deepEqual(calls,['2d6']);assert.equal(c.actionState.plan[0].result.check.natural,10);assert(!c.forcePowerRecoveryPending);beginNextTurn(c,pack);const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...options(c),rollMode:'adept'},()=>assert.fail('No second FP')));assert.deepEqual(c,before);calls.length=0;takeAction(c,pack,'power',{...options(c),rollMode:'adept',enhance:false},roll(calls));assert.deepEqual(calls,['1d20+16','1d20+16','2d6']);assert.equal(c.forcePoints,fp-1);assert(c.forcePowerRecoveryPending);endCurrentTurn(c,pack);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));
 const bad=f.adept();takeAction(bad,pack,'power',options(bad),roll());const original=structuredClone(bad);assert.throws(()=>finishForceChoice(bad,pack,bad.actionState.plan[0].id,'enhance',()=>({value:25,display:'4d6'})),/damage roll/);assert.deepEqual(bad,original);
});
test('old manual activations cannot gain new damage or action loss',()=>{
 const c=f.adept();takeAction(c,pack,'power',options(c),roll());const s=c.actionState.plan[0];delete s.options.effectPowerId;delete s.options.offensivePowerSnapshot;api.validateCharacter(c,pack);const r=finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('Old result remains manual'));assert.match(r.text,/enhancement manual/);assert(!r.text.includes('Swift Action'));assert(!r.text.includes('2d6'));assert(!r.text.includes('4d6'));api.validateCharacter(c,pack);
});
