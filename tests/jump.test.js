import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {jumpState,planJump,jump} from '../src/jump.js';
import {finishMovementPower} from '../src/movement-powers.js';
import {takeAction,finishForceChoice,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};return c;}
const surge=(c,options)=>finishMovementPower(c,pack,crypto.randomUUID(),'power:surge',{total:20},options);
test('Long/High Jump DCs include actual running-start movement, sufficient poles and Surge without fake run-up distance',()=>{
 const c=hero();c.jump={meters:3};assert.equal(planJump(c,derive(c,pack),pack).dc,18);c.jump.runUp=4;let p=planJump(c,derive(c,pack),pack);assert.equal(p.dc,9);assert.equal(p.cost,6);
 c.jump={kind:'high',meters:1.5,moves:2,runUp:4,pole:false};assert.equal(planJump(c,derive(c,pack),pack).dc,18);c.jump.pole=true;assert.equal(planJump(c,derive(c,pack),pack).dc,9);c.jump.runUp=0;assert.equal(planJump(c,derive(c,pack),pack).dc,18);surge(c);p=planJump(c,derive(c,pack),pack);assert.equal(p.dc,9);assert.equal(p.cost,1);
});
test('Jump budgets use one or two Move actions and retain condition and overloaded restrictions',()=>{
 const c=hero();c.jump={meters:12};assert.throws(()=>planJump(c,derive(c,pack),pack),/movement/);c.jump.moves=2;assert.equal(planJump(c,derive(c,pack),pack).cost,8);takeAction(c,pack,'jump',{path:jumpState(c),fp:'none'},()=>({value:10,d20:[10],display:'10'}));assert.deepEqual(c.actionState.spent,['move','standard']);const h=hero();h.condition=4;h.jump={meters:6};assert.throws(()=>planJump(h,derive(h,pack),pack),/movement/);
 const d=derive(hero(),pack);d.load.overloaded=true;assert.throws(()=>planJump(hero(),d,pack),/Straining/);
});
test('after-roll FP can make a saved Jump succeed exactly once; preview spends no actual state',()=>{
 const c=hero(),fp=c.forcePoints;const path={...jumpState(c),meters:1.5};queueAction(c,'jump',{path,fp:'ask'});const before=structuredClone(c);assert(!previewPlan(c,pack).some(r=>r.issue));assert.deepEqual(c,before);takeAction(c,pack,'jump',{path,fp:'ask'},()=>({value:8,d20:[8],display:'8'}));assert.equal(c.actionState.plan.at(-1).status,'waiting');const saved=JSON.parse(JSON.stringify(c)),id=saved.actionState.plan.at(-1).id;const r=finishForceChoice(saved,pack,id,true,()=>({value:1,display:'1'}));assert.match(r.text,/Success/);assert.equal(saved.forcePoints,fp-1);assert.throws(()=>finishForceChoice(saved,pack,id,true));validateCharacter(saved,pack);
});
test('natural 1 does not force a failed Jump, and an entered total does not offer a bonus roll',()=>{
 const c=hero();c.abilities.str=30;c.trainedSkills=['skill:jump'];c.jump={meters:1.5};const r=jump(c,derive(c,pack),pack,()=>({value:16,d20:[1],display:'1+15'}));assert(r.success);const h=hero();const result=takeAction(h,pack,'jump',{path:{...jumpState(h),check:100},fp:'ask'},()=>assert.fail('Entered total rolls no dice'));assert.match(result.text,/Success/);assert.equal(h.actionState.plan[0].status,'done');
});
test('Destiny Surge bypasses Jump rolls, Take modes and unavailable skill checks, but still charges movement',()=>{
 const c=hero();surge(c,{destiny:true});c.jump={meters:18,moves:1,checkMode:'take20',check:-50,safe:false};const d=derive(c,pack);d.skills.find(s=>s.id==='skill:jump').available=false;const r=jump(c,d,pack,()=>assert.fail('No Jump die'));assert(r.success);assert.equal(r.timeMultiplier,1);assert.equal(r.cost,12);const result=takeAction(c,pack,'jump',{path:jumpState(c),fp:'ask'},()=>assert.fail('No Jump die'));assert.match(result.text,/no check/);assert.equal(c.actionState.plan[0].status,'done');assert.deepEqual(c.actionState.spent,['move']);c.jump.meters=100;assert.throws(()=>planJump(c,derive(c,pack),pack),/movement/);
});
test('ordinary Take 10 and Take 20 require valid declarations and cannot stretch a short-lived Surge across retries',()=>{
 const c=hero();c.jump={meters:1.5,checkMode:'take10',calm:true};assert.throws(()=>planJump(c,derive(c,pack),pack),/training/);c.trainedSkills=['skill:jump'];c.jump.calm=false;assert.throws(()=>planJump(c,derive(c,pack),pack),/pressure/);c.jump.calm=true;assert(jump(c,derive(c,pack),pack).success);c.jump.checkMode='take20';assert.throws(()=>planJump(c,derive(c,pack),pack),/safe/);c.jump.safe=true;const r=jump(c,derive(c,pack),pack);assert.equal(r.timeMultiplier,20);assert.match(r.text,/20x time/);assert.throws(()=>takeAction(c,pack,'jump',{path:jumpState(c)}),/outside tracked/);surge(c);assert.throws(()=>planJump(c,derive(c,pack),pack),/Surge expires/);
});
test('failed Jump clears movement-sensitive declarations without inventing fall damage; malformed drafts are rejected',()=>{
 const c=hero();c.jump={meters:3,check:0};c.currentHP=17;c.mightySwing=true;c.routineProgress={id:'unused'};const r=jump(c,derive(c,pack),pack);assert(!r.success);assert.equal(c.currentHP,17);assert(!c.routineProgress);assert(c.mightySwing);for(const draft of [{meters:0},{moves:3},{check:1.1},{kind:'fly'},{runUp:-1},{pole:1},{oops:true}]){const h=hero();h.jump=draft;assert.throws(()=>validateCharacter(h,pack));}
});
