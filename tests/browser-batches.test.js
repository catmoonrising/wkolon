import test from 'node:test';
import assert from 'node:assert/strict';
import runChecks from '../tools/browser-batches.cjs';
test('browser batches limit simultaneous checks while running every check exactly once',async()=>{
 let active=0,maximum=0;const completed=[];
 await runChecks(Array.from({length:7},(_,i)=>({name:String(i),run:async()=>{active++;maximum=Math.max(maximum,active);await new Promise(setImmediate);active--;completed.push(i);}})),3);
 assert.equal(maximum,3);assert.equal(active,0);assert.deepEqual(completed.sort(),[0,1,2,3,4,5,6]);
});
test('browser batches finish other checks before rejecting and preserve original errors',async()=>{
 let release;const held=new Promise(resolve=>release=resolve),completed=[];const first=new Error('first failure'),last=new Error('last failure');
 const result=runChecks([{name:'first',run:async()=>{throw first;}},{name:'held',run:async()=>{await held;completed.push('held');}},{name:'last',run:async()=>{completed.push('last');throw last;}}],2);
 let settled=false;result.then(()=>settled=true,()=>settled=true);await new Promise(setImmediate);assert.deepEqual(completed,['last']);assert(!settled);release();
 await assert.rejects(result,error=>{assert(error instanceof AggregateError);assert.deepEqual(error.errors,[first,last]);assert.match(error.message,/first, last/);return true;});assert.deepEqual(completed,['last','held']);
 for(const jobs of [0,5,1.5,NaN])await assert.rejects(runChecks([],jobs),/integer from 1 to 4/);
});
