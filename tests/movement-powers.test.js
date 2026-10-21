import {planAcrobaticsMove} from '../src/acrobatics-movement.js';
import {planWithdraw,planRunningAttack} from '../src/combat-movement.js';
import {planCharge} from '../src/charge.js';
import {queueAction} from '../src/action-economy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {finishMovementPower,chooseMovementPowerTier,removeMovementPower} from '../src/movement-powers.js';
import {beginNextTurn,endCurrentTurn,endTrackedCombat,takeAction,finishForceChoice,executeAction,previewPlan} from '../src/action-engine.js';
import {recoverSuite} from '../src/force-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=()=>newCharacter(pack,{classId:'class:jedi'});
const use=(c,total,options)=>finishMovementPower(c,pack,crypto.randomUUID(),'power:surge',{total},options);
const jump=c=>derive(c,pack).skills.find(s=>s.id==='skill:jump').total;
test('Surge snapshots final tiers, enhancement and Destiny without double counting Jump speed',()=>{
 for(const [total,tier]of [[9,0],[10,1],[14,1],[15,2],[19,2],[20,3]]){const c=hero(),d=derive(c,pack),j=jump(c),s=use(c,total);assert.equal(s?.tier||0,tier);assert.equal(derive(c,pack).speed,d.speed+2*tier);assert.equal(jump(c),j+10*tier);validateCharacter(c,pack);}
 const c=hero(),d=derive(c,pack),j=jump(c);use(c,20,{enhanced:true,destiny:true});assert.equal(derive(c,pack).speed,d.speed+12);assert.equal(jump(c),j+40);assert(derive(c,pack).movementPowers.jumpWithoutCheck);assert(derive(c,pack).movementPowers.runningStart);
});
test('repeated Surge uses combine unnamed speed and highest Force Jump bonus, retaining lesser-tier choices',()=>{
 const c=hero(),d=derive(c,pack),j=jump(c);const first=use(c,20);use(c,15);assert.equal(derive(c,pack).speed,d.speed+10);assert.equal(jump(c),j+30);chooseMovementPowerTier(c,first.id,1);assert.equal(derive(c,pack).speed,d.speed+6);assert.equal(jump(c),j+20);assert.throws(()=>chooseMovementPowerTier(c,first.id,4));removeMovementPower(c,first.id);assert.equal(derive(c,pack).speed,d.speed+4);
});
test('Surge expires at next turn start, preserves saved state through End turn/combat, and expires on a minute rest',()=>{
 const c=hero();use(c,20);endCurrentTurn(c,pack);assert(c.movementPowerEffects);endTrackedCombat(c);const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(derive(saved,pack).speed,12);beginNextTurn(saved,pack);assert(!saved.movementPowerEffects);assert.equal(derive(saved,pack).speed,6);recoverSuite(c,derive(c,pack));assert(!c.movementPowerEffects);
});
test('movement power state rejects malformed snapshots and preserves normal restrictions',()=>{
 const c=hero();use(c,20);c.condition=4;assert.equal(derive(c,pack).speed,6);for(const change of [s=>s.tier=4,s=>s.maxTier=0,s=>s.destiny=1,s=>s.extra=true,s=>s.powerId='power:battle-strike']){const bad=structuredClone(c);change(bad.movementPowerEffects[0]);assert.throws(()=>validateCharacter(bad,pack));}assert.doesNotThrow(()=>validateCharacter(hero(),pack));
});

test('Surge action commits its final check, enhancement and Destiny exactly once without spending action slots',()=>{
 const c=hero();c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-training'}];const copy={id:crypto.randomUUID(),powerId:'power:surge',spent:false};c.levels[0].forcePowers=[copy];c.story={kind:'destiny',id:null,details:'',points:1};const fp=c.forcePoints;
 takeAction(c,pack,'power',{powerId:copy.id,action:'free-action',fp:'ask',enhance:true,destiny:true},()=>({value:20,d20:[10],display:'20'}));assert(copy!==c.levels[0].forcePowers[0]);assert.equal(c.story.points,1);assert(!c.movementPowerEffects);assert.deepEqual(c.actionState.spent,[]);const id=c.actionState.plan[0].id;finishForceChoice(c,pack,id,'enhance');assert.equal(c.story.points,0);assert.equal(c.forcePoints,fp-1);assert.equal(derive(c,pack).speed,18);assert(derive(c,pack).movementPowers.jumpWithoutCheck);assert.throws(()=>finishForceChoice(c,pack,id,'enhance'));
});

test('planning a movement power defers dependent movement without predicting an unrolled tier or changing state',()=>{
 const c=hero();c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-training'}];const copy={id:crypto.randomUUID(),powerId:'power:surge',spent:false};c.levels[0].forcePowers=[copy];const power=queueAction(c,'power',{powerId:copy.id,fp:'none'}),move=queueAction(c,'jump',{path:{kind:'long',meters:12},fp:'none'}),before=structuredClone(c);const preview=previewPlan(c,pack);assert.match(preview[1].issue,/Resolve the power/);assert.deepEqual(c,before);executeAction(c,pack,power.id,()=>({value:20,d20:[13],display:'20'}));assert.doesNotThrow(()=>executeAction(c,pack,move.id,expr=>({value:10+Number(expr.slice(4)),d20:[10],display:expr})));assert.equal(c.actionState.plan[1].status,'done');
});

test('Surge updates the actual Move, Withdraw, Charge and Running Attack budgets through their shared movement resolver',()=>{
 const c=hero();c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.levels[0].feats=[{id:'feat:running-attack'}];c.acrobaticsMovement={path:{squares:10}};c.withdraw={clearThreats:true,path:{squares:5}};c.chargePath={squares:10};c.runningAttack={before:{squares:5},after:{squares:5}};const before=derive(c,pack),uid=before.attacks[0].uid;for(const plan of [d=>planAcrobaticsMove(c,d,pack),d=>planWithdraw(c,d,pack),d=>planCharge(c,d,pack,uid),d=>planRunningAttack(c,d,pack,uid)])assert.throws(()=>plan(before));use(c,20);const after=derive(c,pack);assert.equal(planAcrobaticsMove(c,after,pack).maximum,12);assert.equal(planWithdraw(c,after,pack).maximum,6);assert.equal(planCharge(c,after,pack,uid).maximum,12);assert.equal(planRunningAttack(c,after,pack,uid).maximum,12);
});
