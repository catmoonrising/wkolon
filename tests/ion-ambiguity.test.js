import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {applyIncomingDamage,damageOutcome} from '../src/incoming-damage.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(alt=false){const c=newCharacter(pack,{classId:'class:soldier'});c.currentHP=50;if(alt)c.houseRules={ambiguities:{'ambiguity:ion-electronic-damage':'full-electronic'}};return c;}
const view=c=>({...derive(c,pack),threshold:10});

test('ion electronic alternative preserves half HP damage by default and to ordinary biological targets under either option',()=>{
 validatePack(pack);assert.equal(pack.rules.ambiguities.find(a=>a.id==='ambiguity:ion-electronic-damage').default,'half');
 for(const alt of [false,true]){const c=hero(alt),copy=structuredClone(c),r=damageOutcome(c,view(c),pack,15,{type:'ion'});assert.equal(r.hpDamage,7);assert.equal(r.conditionSteps,0);assert.deepEqual(c,copy);}
 const c=hero();c.cybernetic=true;const r=applyIncomingDamage(c,view(c),pack,15,{type:'ion'});assert.equal(r.hpDamage,7);assert.equal(r.conditionSteps,2);assert.equal(c.currentHP,43);
});
test('electronic target choice uses droid, species cybernetic and declared cybernetic state',()=>{
 for(const change of [c=>c.species='species:custom-droid',c=>c.species='species:shard',c=>c.cybernetic=true]){const c=hero(true);change(c);const r=applyIncomingDamage(c,view(c),pack,15,{type:'ion'});assert.equal(r.hpDamage,15);assert.equal(c.currentHP,35);assert.equal(r.conditionSteps,2);}
});
test('ion protection, bonus HP and threshold comparisons retain their order across both readings',()=>{
 for(const alt of [false,true]){const c=hero(alt);c.cybernetic=true;c.protection={dr:2,drBypass:'',sr:3,srMax:3};c.bonusHP=7;const r=applyIncomingDamage(c,view(c),pack,25,{type:'ion'});assert.equal(r.srBlocked,3);assert.equal(r.drBlocked,2);assert.equal(r.bonusHPBlocked,7);assert.equal(r.hpDamage,alt?13:3);assert.equal(c.currentHP,alt?37:47);assert.equal(c.bonusHP,0);assert.equal(r.conditionSteps,2);}
});
test('special knockout and general death interpretation remain independent from ion HP division',()=>{
 for(const alt of [false,true])for(const death of [false,true]){const c=hero(alt);c.currentHP=1;c.cybernetic=true;c.houseRules??={};c.houseRules.ambiguities??={};if(death)c.houseRules.ambiguities['ambiguity:stun-ion-death']='general-death';const r=applyIncomingDamage(c,view(c),pack,20,{type:'ion'});assert.equal(r.dead,death);assert.equal(c.condition,5);assert.equal(c.currentHP,0);assert.equal(r.hpDamage,alt?20:10);}
});
test('normal/stun damage and old saves are unaffected; new choice survives JSON validation',()=>{
 for(const alt of [false,true]){const c=hero(alt);c.cybernetic=true;assert.equal(damageOutcome(c,view(c),pack,15,{type:'normal'}).hpDamage,15);assert.equal(damageOutcome(c,view(c),pack,15,{type:'stun'}).hpDamage,7);const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(damageOutcome(saved,view(saved),pack,15,{type:'ion'}).hpDamage,alt?15:7);}
});
