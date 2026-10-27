import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as api from '../src/rules.js';import make from '../tools/class-defense-fixtures.cjs';
import {withDamageThresholdBonus} from '../src/defense-abilities.js';import {damageOutcome,applyIncomingDamage} from '../src/incoming-damage.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
test('a temporary typed threshold bonus preserves a complete build, native threshold feats and every Defense',()=>{
 const c=f.adept('psychic-citadel',2);c.levels[8].feats=[{id:'feat:improved-damage-threshold'}];const d=api.derive(c,pack),before=structuredClone(c),defenses=structuredClone(d.defenses);assert.deepEqual(d.issues,[]);assert.equal(d.thresholdModifiers.length,1);assert.equal(d.thresholdModifiers[0].amount,5);assert.equal(d.thresholdModifiers[0].type,'untyped');const changed=withDamageThresholdBonus(d,{amount:10,type:'force'});assert.equal(changed.threshold,d.threshold+10);assert.deepEqual(changed.defenses,defenses);assert.equal(d.thresholdModifiers.length,1);assert.deepEqual(c,before);
});
test('threshold-specific Force bonuses compete, while independent bonus types and later increases retain their values',()=>{
 const d={threshold:30,thresholdModifiers:[{amount:10,type:'force'},{amount:5,type:'untyped'}]},before=structuredClone(d);assert.equal(withDamageThresholdBonus(d,{amount:5,type:'force'}).threshold,30);assert.equal(withDamageThresholdBonus(d,{amount:20,type:'force'}).threshold,40);const changed=withDamageThresholdBonus(d,{amount:5,type:'insight'});assert.equal(changed.threshold,35);assert.equal(withDamageThresholdBonus(changed,{amount:15,type:'force'}).threshold,40);assert.deepEqual(d,before);
});
test('Fight Through Pain and contextual defenses retain their chosen basis and existing Force Defense contribution',()=>{
 const c=f.adept('psychic-citadel',2);c.levels[8].feats=[{id:'feat:fight-through-pain'}];c.levels[5].feats[0]={id:'feat:unstoppable-force'};let d=api.derive(c,pack);assert.deepEqual(d.issues,[]);assert(d.defenses.will>d.defenses.fortitude);assert(d.conditionalThresholds.some(r=>r.against==='use-the-force'));
 for(const basis of ['auto','fortitude','will']){c.thresholdDefense=basis;d=api.derive(c,pack);const changed=withDamageThresholdBonus(d,{amount:5,type:'force'});for(const requiresUseTheForce of [false,true]){const ordinary=damageOutcome(c,d,pack,1,{requiresUseTheForce}),boosted=damageOutcome(c,changed,pack,1,{requiresUseTheForce});assert.equal(boosted.threshold,ordinary.threshold+5);assert.equal(boosted.hpDamage,ordinary.hpDamage);}assert.deepEqual(changed.defenses,d.defenses);}
});
test('one incoming event can avoid a threshold step without changing HP loss or leaving a bonus on the next attack',()=>{
 const c=f.adept();let d=api.derive(c,pack);c.currentHP=d.hp;const before=c.currentHP,amount=d.threshold;assert.equal(damageOutcome(c,d,pack,amount).conditionSteps,1);const result=applyIncomingDamage(c,withDamageThresholdBonus(d,{amount:5,type:'force'}),pack,amount,{});assert.equal(result.hpDamage,amount);assert.equal(result.conditionSteps,0);assert.equal(c.currentHP,before-amount);assert.equal(api.derive(c,pack).threshold,d.threshold);d=api.derive(c,pack);assert.equal(damageOutcome(c,d,pack,amount).conditionSteps,1);api.validateCharacter(c,pack);
});
test('invalid temporary bonuses fail before changing derived or saved character state',()=>{
 const c=f.adept(),d=api.derive(c,pack),before=structuredClone(c),value=d.threshold;for(const bonus of [null,{amount:-1,type:'force'},{amount:1.5,type:'force'},{amount:1001,type:'force'},{amount:5,type:''}])assert.throws(()=>withDamageThresholdBonus(d,bonus));assert.equal(d.threshold,value);assert.deepEqual(c,before);
});
