import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveModifiers,modifierTotal,modifierIncrease} from '../src/modifiers.js';
const m=(amount,type,circumstance)=>({amount,...(type?{type}:{}),...(circumstance?{circumstance}:{})});
test('typed bonuses compete per type while unnamed and dodge bonuses add',()=>{
 assert.deepEqual(resolveModifiers([m(5,'competence'),m(3,'competence'),m(2,'equipment'),m(4,'equipment'),m(1),m(2),m(1,'dodge'),m(2,'dodge')]),{total:15,bonuses:{competence:5,equipment:4,untyped:3,dodge:3},penalty:0});
});
test('all penalties stack even with the same descriptor and circumstance',()=>{
 assert.equal(modifierTotal([m(5,'competence'),m(-2,'competence'),m(-3,'competence'),m(-2,'circumstance','darkness'),m(-2,'circumstance','darkness')]),-4);
});
test('circumstance bonuses stack across distinct circumstances, not equivalent ones',()=>{
 assert.equal(modifierTotal([m(2,'circumstance','tools'),m(5,'circumstance','tools'),m(2,'circumstance','position'),m(1,'circumstance')]),8);
});
test('conditional bonuses add only their increase over an already included type',()=>{
 const base=[m(3,'equipment'),m(5,'insight'),m(-2)];assert.equal(modifierIncrease(base,[m(2,'equipment'),m(5,'insight')]),0);assert.equal(modifierIncrease(base,[m(6,'equipment'),m(7,'insight'),m(2,'morale'),m(-1)]),6);
 assert.equal(modifierTotal([]),0);for(const amount of [NaN,Infinity,'2',null])assert.throws(()=>modifierTotal([m(amount,'insight')]),/Invalid modifier/);
});
