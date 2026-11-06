import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import {takeAction,describeAction,executeAction,previewPlan,endCurrentTurn,beginNextTurn} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {catchSecondWind} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';
import make from '../tools/forceful-recovery-fixtures.cjs';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),no=()=>{throw Error('No roll expected');},D=c=>api.derive(c,pack),id=c=>c.levels[0].forcePowers[0].id;
const unchanged=(c,fn,re)=>{const before=structuredClone(c);assert.throws(fn,re);assert.deepEqual(c,before);};
const wind=(c,options={forcefulPowerId:id(c)})=>takeAction(c,pack,'second-wind',options,no);
test('source-bound Forceful Recovery and both complete legal histories',()=>{
 validatePack(pack);const source=pack.sources.find(s=>s.id==='source:wiki-forceful-recovery');assert.equal(source.revision,21183);assert.equal(source.sha256,'f72a3726860b48274bbe8f4eceb9d4bdacfaa9e436d7d60b129a913be237f128');
 for(const regeneration of [false,true])assert.deepEqual(D(f.hero({regeneration})).issues,[]);
 const bad=structuredClone(pack);bad.feats.find(f=>f.id==='feat:forceful-recovery').effects[0].amount=2;assert.throws(()=>validatePack(bad));
});
test('one exact spent copy returns without FP, activation, duplicate recovery or other suite changes',()=>{
 const c=f.hero(),before=structuredClone(c),d=D(c);const result=wind(c);assert.match(result.text,/Surge recovered/);assert(c.currentHP>before.currentHP);assert.equal(c.forcePoints,before.forcePoints);assert.deepEqual(c.actionState.spent,['swift']);assert.equal(c.actionState.forceSpent,false);assert.equal(c.levels[0].forcePowers[0].spent,false);assert.equal(c.levels[0].forcePowers[1].spent,true);assert.equal(c.levels[0].forcePowers[2].spent,true);assert.equal(c.recovery.secondWindsSpent,1);assert.equal(c.recovery.secondWindEncounter,true);assert.equal(c.movementPowerEffects,undefined);assert.equal(d.forceCurrent,D(c).forceCurrent);api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 unchanged(c,()=>wind(c),/spent power|above half|encounter/);
});
test('no expended powers needs no choice; exactly one defaults automatically; several require a choice',()=>{
 const c=f.hero();unchanged(c,()=>wind(c,{}),/Choose a spent power/);unchanged(c,()=>wind(c,{forcefulPowerId:''}),/Choose a spent power/);
 const one=f.hero();one.levels[0].forcePowers.slice(1).forEach(p=>p.spent=false);wind(one,{});assert.equal(one.levels[0].forcePowers[0].spent,false);
 const none=f.hero();none.levels[0].forcePowers.forEach(p=>p.spent=false);wind(none,{});assert.equal(none.levels[0].forcePowers.filter(p=>p.spent).length,0);assert(none.currentHP>1);
});
test('invalid, foreign, unspent, removed and inactive copies cannot spend resources',()=>{
 for(const value of [true,4,null,'foreign']){const c=f.hero();unchanged(c,()=>wind(c,{forcefulPowerId:value}),/recovered power|spent power/);}
 const fresh=f.hero();fresh.levels[0].forcePowers[0].spent=false;unchanged(fresh,()=>wind(fresh),/spent power/);
 const removed=f.hero(),old=id(removed);removed.levels[0].forcePowers.shift();unchanged(removed,()=>wind(removed,{forcefulPowerId:old}),/spent power/);
 const inactive=f.hero();inactive.levels[0].feats.shift();assert.equal(D(inactive).forcefulRecovery,false);unchanged(inactive,()=>wind(inactive),/spent power/);
 const lost=f.hero();lost.levels[0].feats.pop();assert.equal(D(lost).forcefulRecovery,false);unchanged(lost,()=>wind(lost),/spent power/);
});
test('cloned queue preview makes the copy available to a later power without changing the character',()=>{
 const c=f.hero(),a=queueAction(c,'second-wind',{forcefulPowerId:id(c)});queueAction(c,'power',{powerId:id(c),action:'free-action',fp:'none',rollMode:'roll'});const before=structuredClone(c),preview=previewPlan(c,pack);assert(!preview[0].issue);assert(!preview[1].issue);assert.deepEqual(c,before);
 c.levels[0].forcePowers[0].spent=false;unchanged(c,()=>executeAction(c,pack,a.id,no),/spent power/);c.levels[0].forcePowers[0].spent=true;executeAction(c,pack,a.id,no);assert.equal(c.actionState.plan[0].status,'done');assert(!describeAction(c,pack,'power',{powerId:id(c),action:'free-action',fp:'none',rollMode:'roll'}).issue);
});
test('core healing and Regenerative Healing share exactly one recovery per Second Wind, not per tick',()=>{
 const direct=f.hero();const result=catchSecondWind(direct,D(direct),pack,no,{forcefulPowerId:id(direct)});assert.equal(result.recoveredPower.copyId,id(direct));assert.equal(direct.levels[0].forcePowers[0].spent,false);
 const c=f.hero({regeneration:true}),hp=c.currentHP;wind(c,{regenerate:true,forcefulPowerId:id(c)});assert.equal(c.currentHP,hp);assert(c.recovery.regenerationActive);assert.equal(c.recovery.regenerationUsed,true);assert.equal(c.levels[0].forcePowers.filter(p=>!p.spent).length,1);assert.match(c.actionState.plan[0].result.text,/recovered/);endCurrentTurn(c,pack);assert.equal(c.currentHP,hp+5);beginNextTurn(c,pack);endCurrentTurn(c,pack);assert.equal(c.currentHP,hp+10);assert.equal(c.levels[0].forcePowers.filter(p=>!p.spent).length,1);
});
test('Second Wind blocked by helplessness, ended turn or action budget never restores a copy',()=>{
 for(const change of [c=>c.condition=5,c=>{beginNextTurn(c,pack);endCurrentTurn(c,pack);},c=>{beginNextTurn(c,pack);c.actionState.spent=['swift','move','standard'];}]){const c=f.hero();change(c);unchanged(c,()=>wind(c),/helpless|turn|Swift/);}
});
