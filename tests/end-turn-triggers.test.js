import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fixtures from '../tools/end-turn-fixtures.cjs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {setTriggeredDefense} from '../src/triggered-defenses.js';
import {beginNextTurn,endCurrentTurn,endTrackedCombat,takeAction,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {newEncounter,newDay,setDead,restEightHours} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const heroes=()=>fixtures(pack,newCharacter),set=(c,id,on=true)=>setTriggeredDefense(c,pack,derive(c,pack).ctx,id,on);
const bonus=(c,id)=>id==='knight-s-morale'?derive(c,pack).defenses.will:derive(c,pack).attacks[0].attack;
const actors=()=>{const {knight,cause}=heroes();return [[knight,'knight-s-morale'],[cause,'for-the-cause']];};
test('actual Imperial Knight and Scoundrel access grants closed source-pinned Partial benefits',()=>{
 validatePack(pack);const {knight,cause}=heroes();for(const [c,id,cls] of [[knight,'knight-s-morale','imperial-knight'],[cause,'for-the-cause','scoundrel']]){validateCharacter(c,pack);const d=derive(c,pack);assert(!d.ctx.inactiveClasses.has('class:'+cls));assert(d.ctx.talents.some(t=>t.id==='talent:'+id&&!d.ctx.inactiveTalents.has(t.id)));assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');}
 const k0=derive(knight,pack);set(knight,'knight-s-morale');set(knight,'knight-s-morale');const k1=derive(knight,pack);for(const key of ['reflex','fortitude','will'])assert.equal(k1.defenses[key],k0.defenses[key]+1);assert.equal(k1.threshold,k0.threshold+1);assert.equal(knight.turnEndTriggers.length,1);
 const a0=derive(cause,pack).attacks;set(cause,'for-the-cause');for(const old of a0){const a=derive(cause,pack).attacks.find(a=>a.uid===old.uid);assert.equal(a.attack,old.attack+2);assert.equal(a.damageBonus,old.damageBonus+2);}
 cause.levels[0].talent=null;const before=structuredClone(cause);assert.throws(()=>set(cause,'for-the-cause'),/unavailable/);assert.deepEqual(cause,before);assert.equal(derive(cause,pack).attacks[0].attack,a0[0].attack);
 const missing=heroes().knight;missing.levels.at(-1).entryDeclarations={};assert.throws(()=>set(missing,'knight-s-morale'),/unavailable/);
});
test('own-turn declaration survives this End turn and expires only at the next End turn, including implicit ends',()=>{
 for(const [c,id] of actors()){const b=bonus(c,id);beginNextTurn(c,pack);set(c,id);assert.deepEqual(c.turnEndTriggers,[{id,endsRemaining:2,ended:false}]);endCurrentTurn(c,pack);endCurrentTurn(c,pack);assert.equal(bonus(c,id),b+(id==='knight-s-morale'?1:2));beginNextTurn(c,pack);assert(c.turnEndTriggers);endCurrentTurn(c,pack);assert.equal(c.turnEndTriggers,undefined);assert.equal(bonus(c,id),b);}
 for(const [c,id] of actors()){beginNextTurn(c,pack);set(c,id);beginNextTurn(c,pack);assert.deepEqual(c.turnEndTriggers,[{id,endsRemaining:1,ended:false}]);beginNextTurn(c,pack);assert.equal(c.turnEndTriggers,undefined);}
});
test('off-turn and before-combat declarations last through the next own turn and round-trip strictly',()=>{
 for(const started of [false,true])for(const [c,id] of actors()){if(started){beginNextTurn(c,pack);endCurrentTurn(c,pack);}const b=bonus(c,id);set(c,id);assert.deepEqual(c.turnEndTriggers,[{id,endsRemaining:1,ended:true}]);validateCharacter(JSON.parse(JSON.stringify(c)),pack);beginNextTurn(c,pack);assert.equal(bonus(c,id),b+(id==='knight-s-morale'?1:2));endCurrentTurn(c,pack);assert.equal(c.turnEndTriggers,undefined);}
});
test('a fresh trigger extends expiry without stacking, and unchecking removes it',()=>{
 for(const [c,id] of actors()){beginNextTurn(c,pack);set(c,id);endCurrentTurn(c,pack);beginNextTurn(c,pack);set(c,id);assert.deepEqual(c.turnEndTriggers,[{id,endsRemaining:2,ended:false}]);set(c,id);assert.equal(c.turnEndTriggers.length,1);set(c,id,false);assert.equal(c.turnEndTriggers,undefined);}
});
test('Charge and queued preview use the same turn-end clock without mutating real preview state',()=>{
 const {knight:c}=heroes();beginNextTurn(c,pack);set(c,'knight-s-morale');const o={uid:c.inventory[0].uid,path:{squares:2}};const step=queueAction(c,'charge',o),before=structuredClone(c);assert(!previewPlan(c,pack).find(r=>r.id===step.id).issue);assert.deepEqual(c,before);
 const q=structuredClone(c);q.actionState.plan=[];takeAction(q,pack,'charge',o,()=>({value:15,d20:[10],display:'15',coeffs:[1]}));assert(q.actionState.ended);assert.deepEqual(q.turnEndTriggers,[{id:'knight-s-morale',endsRemaining:1,ended:true}]);beginNextTurn(q,pack);endCurrentTurn(q,pack);assert.equal(q.turnEndTriggers,undefined);
});
test('combat, encounter, day, death and natural rest clear saved turn-end rows',()=>{
 const resets=[c=>endTrackedCombat(c),c=>newEncounter(c),c=>newDay(c,pack),c=>setDead(c,true,pack),c=>restEightHours(c,derive(c,pack),pack)];for(const reset of resets)for(const [c,id] of actors()){set(c,id);reset(c);assert.equal(c.turnEndTriggers,undefined);}
});
test('malformed rows and wrong duration scopes fail without accepting arbitrary effects',()=>{
 const {knight:c}=heroes();for(const turnEndTriggers of [null,'knight-s-morale',[{id:'bothan-will',endsRemaining:1,ended:false}],[{id:'knight-s-morale',endsRemaining:3,ended:false}],[{id:'knight-s-morale',endsRemaining:1}],[{id:'knight-s-morale',endsRemaining:1,ended:'yes'}],[{id:'knight-s-morale',endsRemaining:1,ended:true,amount:99}],[{id:'knight-s-morale',endsRemaining:1,ended:true},{id:'knight-s-morale',endsRemaining:1,ended:true}]])assert.throws(()=>validateCharacter({...c,turnEndTriggers},pack),/triggered defenses/);
 for(const key of ['triggeredDefenses','encounterTriggers'])assert.throws(()=>validateCharacter({...c,[key]:['knight-s-morale']},pack),/triggered defenses/);
 const p=structuredClone(pack);p.rules.triggeredDefenseBonuses.find(r=>r.id==='for-the-cause').effects[0].amount=3;assert.throws(()=>validatePack(p));
});
