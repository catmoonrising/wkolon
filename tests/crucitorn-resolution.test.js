import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as api from '../src/rules.js';import make from '../tools/crucitorn-fixtures.cjs';import {validatePack} from '../tools/validate-rules.js';
import {thresholdPowerTier,thresholdPowerPlan,finishThresholdPower} from '../src/threshold-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),id='power:crucitorn';
test('Crucitorn pins a closed Force threshold rule and real Adept/Mastery access',()=>{
 validatePack(pack);const r=pack.rules.thresholdPowers[0];assert.equal(pack.sources.find(s=>s.id===r.sourceIds[0]).revision,20383);for(const mastery of [false,true]){const c=f.adept({mastery}),d=api.derive(c,pack),p=d.forcePowers.find(p=>p.id===id);assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}const p=structuredClone(pack);p.rules.thresholdPowers[0].type='insight';assert.throws(()=>validatePack(p));
});
test('reaction tiers and lesser caps use the check total, with no automatic natural failure or critical',()=>{
 for(const [total,bonus]of [[14,0],[15,5],[19,5],[20,10],[24,10],[25,15],[29,15],[30,20],[50,20]])assert.equal(thresholdPowerTier(pack,id,total)?.bonus||0,bonus);assert.equal(thresholdPowerTier(pack,id,30,15).bonus,5);assert.throws(()=>thresholdPowerTier(pack,id,30,16));
 for(const natural of [1,20]){const c=f.adept(),d=api.derive(c,pack),out=finishThresholdPower(c,d,pack,id,{natural,total:15},{amount:d.threshold,options:{}},{enhanced:true});assert.equal(out.bonus,10);assert.equal(out.damage.threshold,d.threshold+10);assert.equal(out.damage.hpDamage,d.threshold);assert.equal(out.damage.conditionSteps,0);assert.equal(api.derive(c,pack).threshold,d.threshold);}
});
test('planning is atomic and accepts non-Energy, flat-footed and emergency survival declarations',()=>{
 const c=f.adept();c.flatFooted=true;const d=api.derive(c,pack),before=structuredClone(c),incoming={amount:10,options:{type:'ion'}};const p=thresholdPowerPlan(c,d,pack,id,incoming,{enhanceAsk:true});assert.equal(p.incoming.options.type,'ion');incoming.amount=99;assert.equal(p.incoming.amount,10);assert.deepEqual(c,before);for(const options of [{forceCost:1},{enhanceAsk:true}])assert.equal(thresholdPowerPlan(c,d,pack,id,{amount:10,options:{spendForcePoint:true}},options).incoming.options.spendForcePoint,true);assert.deepEqual(c,before);
});
test('failed activation still applies normal damage and protection exactly once without a bonus',()=>{
 const c=f.adept();c.protection={...c.protection,sr:5,srMax:5,dr:3};const d=api.derive(c,pack),before=c.currentHP,out=finishThresholdPower(c,d,pack,id,{total:14},{amount:20,options:{}});assert.equal(out.bonus,0);assert.equal(out.increase,0);assert.equal(out.damage.srBlocked,5);assert.equal(out.damage.drBlocked,3);assert.equal(out.damage.hpDamage,12);assert.equal(c.currentHP,before-12);assert.equal(c.protection.sr,0);assert.equal(out.damage.threshold,d.threshold);
});
test('special damage uses the increased threshold after protection while preserving HP-only halving and source state',()=>{
 for(const type of ['stun','ion']){const c=f.adept();if(type==='ion')c.cybernetic=true;const d=api.derive(c,pack),before=c.currentHP,out=finishThresholdPower(c,d,pack,id,{total:20},{amount:d.threshold+1,options:{type}});assert.equal(out.bonus,10);assert.equal(out.damage.threshold,d.threshold+10);assert.equal(out.damage.conditionSteps,0);assert.equal(c.currentHP,before-Math.floor((d.threshold+1)/2));assert.equal(api.derive(c,pack).threshold,d.threshold);}
});
test('invalid enhancement leaves all damage state unchanged',()=>{
 const c=f.adept(),d=api.derive(c,pack),before=structuredClone(c);assert.throws(()=>finishThresholdPower(c,d,pack,id,{total:14},{amount:20,options:{}},{enhanced:true}),/Enhancement/);assert.deepEqual(c,before);const out=finishThresholdPower(c,d,pack,id,{total:20},{amount:20,options:{spendForcePoint:true}},{enhanced:true});assert.equal(out.bonus,15);assert.equal(out.damage.forcePointSpent,0);assert.equal(c.forcePoints,before.forcePoints);
});
