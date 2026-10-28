import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as api from '../src/rules.js';import make from '../tools/force-track-fixtures.cjs';import {takeAction} from '../src/action-engine.js';import {checkConsciousness,recuperate,recoveryState} from '../src/recovery.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
function active(){const c=f.adept(),p=api.derive(c,pack).forcePowers.find(p=>p.id==='power:force-track');takeAction(c,pack,'power',{powerId:p.copyId,action:'swift-action',fp:'none',enhance:false,effectDC:15,tracking:{quarry:'Mara'}},()=>({value:26,d20:[10],display:'26'}));return c;}
test('valid first/retry consciousness checks advance1minute/1hour on success and failure',()=>{
 for(const retry of [false,true])for(const success of [false,true]){const c=active();c.currentHP=0;c.condition=5;c.recovery={...recoveryState(c),unconsciousRetry:retry};const r=checkConsciousness(c,api.derive(c,pack),pack,()=>({value:success?20:9,d20:[success?20:9],display:'CON'}));assert.equal(r.success,success);if(retry)assert.equal(c.trackingPowerEffects,undefined);else assert.equal(c.trackingPowerEffects[0].rounds,590);api.validateCharacter(c,pack);}
});
test('invalid/unavailable consciousness attempts advance no time or resources',()=>{
 const c=active(),before=structuredClone(c);assert.throws(()=>checkConsciousness(c,api.derive(c,pack),pack,()=>assert.fail('Unavailable must not roll')));assert.deepEqual(c,before);c.currentHP=0;c.condition=5;const q=structuredClone(c);assert.throws(()=>checkConsciousness(c,api.derive(c,pack),pack,()=>({value:20,d20:[0]})));assert.deepEqual(c,q);
});
test('ten-minute recuperation uses the common timer, preserves other persistent causes and rejects unavailable repeats',()=>{
 const c=active();c.recovery={...recoveryState(c),persistent:['rage','injury']};c.condition=2;const fp=c.forcePoints,hp=c.currentHP;recuperate(c);assert.equal(c.trackingPowerEffects[0].rounds,500);assert.deepEqual(c.recovery.persistent,['injury']);assert.equal(c.forcePoints,fp);assert.equal(c.currentHP,hp);assert.equal(c.condition,2);const q=structuredClone(c);assert.throws(()=>recuperate(c));assert.deepEqual(c,q);api.validateCharacter(c,pack);
});
