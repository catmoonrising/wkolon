import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import * as api from '../src/rules.js';import make from '../tools/offensive-power-fixtures.cjs';import {validatePack} from '../tools/validate-rules.js';
import {displacementPowerRule,forceThrustRange,forceThrustTarget,resolveForceThrust} from '../src/force-thrust.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),target=(extra={})=>({mode:'opposed',distance:12,lineOfSight:true,strengthCheck:10,baseAttack:3,size:'medium',stable:false,...extra});
const resolve=(total,t=target(),options={})=>resolveForceThrust(pack,{total},t,{roller:()=>assert.fail('No collision roll expected'),...options});
test('closed reviewed displacement rule retains exact pins and no invented target effects',()=>{
 validatePack(pack);const r=displacementPowerRule(pack,'power:force-thrust');assert.equal(pack.sources.find(s=>s.id===r.sourceIds[0]).revision,24977);assert.equal(r.range,12);assert.equal(r.rangeTechnique.range,18);const q=structuredClone(pack);q.rules.displacementPowers[0].comparison='at-least';assert.throws(()=>validatePack(q));assert.equal(pack.forcePowers.find(p=>p.id===r.powerId).automation,'partial');
});
test('ties fail, and one square plus each five-point margin uses ordinary totals',()=>{
 for(const [total,pushed]of [[1,0],[12,0],[13,0],[14,1],[17,1],[18,2],[22,2],[23,3],[28,4]]){const out=resolve(total);assert.equal(out.pushed,pushed);assert.equal(out.opposed,13);assert.equal(out.damage,0);}
 assert.equal(resolveForceThrust(pack,{natural:20,total:12},target()).pushed,0);assert.equal(resolveForceThrust(pack,{natural:1,total:18},target()).pushed,2);
});
test('all printed size modifiers, BAB and the single stability bonus affect the opponent',()=>{
 for(const [size,bonus]of Object.entries(displacementPowerRule(pack,'power:force-thrust').sizeModifiers))for(const stable of [false,true]){
  const out=resolve(30,target({size,stable}));assert.equal(out.opposed,13+bonus+(stable?5:0));
 }
 assert.equal(resolve(10,target({strengthCheck:-10,baseAttack:0,size:'small'})).opposed,-15);
});
test('special FP changes opposed check and rolls three collision dice only when the push reaches a larger object',()=>{
 const t=target({collisionAt:3}),calls=[],roller=e=>{calls.push(e);return {value:e==='3d6'?12:4,display:e};};
 assert.equal(resolve(18,t).collision,false);assert.equal(resolve(18,t,{enhanced:true,roller}).damage,12);assert.deepEqual(calls,['3d6']);
 const out=resolve(23,t,{roller});assert.equal(out.damage,4);assert.equal(out.pushed,3);assert.equal(out.expression,'1d6');assert.deepEqual(calls,['3d6','1d6']);
 assert.equal(resolve(13,target({collisionAt:1})).damage,0);assert.equal(resolve(14,target({collisionAt:1}),{roller}).damage,4);assert.throws(()=>resolve(18,t,{enhanced:true,roller:()=>({value:2})}),/collision roll/);
});
test('Moving a Door requires enabled Counseling and uses inclusive Break DC without collision or special-FP penalty',()=>{
 const door={mode:'door',distance:12,lineOfSight:true,breakDC:20};assert.equal(resolve(19,door).opened,false);assert.equal(resolve(20,door).opened,true);assert.equal(resolve(20,door).damage,0);assert.throws(()=>resolve(20,door,{doorEnabled:false}),/Counseling is disabled/);assert.throws(()=>resolve(19,door,{enhanced:true}),/Invalid Force Thrust result/);
});
test('active Extended Force Thrust grants range18 on a complete legal build, lost with inactive class',()=>{
 const c=make(pack,api).adept({mastery:true});c.levels[8].classChoices=[{id:'classchoice:extended-force-thrust'}];const d=api.derive(c,pack);assert.deepEqual(d.issues,[]);assert.equal(forceThrustRange(d,pack),18);assert.doesNotThrow(()=>forceThrustTarget(pack,target({distance:18}),{range:forceThrustRange(d,pack)}));d.ctx.inactiveClasses.add('class:force-adept');assert.equal(forceThrustRange(d,pack),12);assert.throws(()=>forceThrustTarget(pack,target({distance:18})),/outside/);
});
test('malformed or hidden target fields reject without calling the roller or mutating declarations',()=>{
 const t=target(),before=structuredClone(t);assert.deepEqual(forceThrustTarget(pack,t),{...t,collisionAt:null});assert.deepEqual(t,before);
 for(const extra of [{distance:13},{distance:NaN},{lineOfSight:false},{lineOfSight:1},{stable:1},{baseAttack:-1},{baseAttack:2.5},{size:'constructor'},{size:['medium']},{size:'enormous'},{strengthCheck:'10'},{collisionAt:0},{collisionAt:-2},{secret:true}])assert.throws(()=>resolve(30,target(extra)));
 assert.throws(()=>resolve(30,{mode:'door',distance:1,lineOfSight:true,breakDC:20,stable:true}));assert.throws(()=>resolve(1.5));assert.throws(()=>resolve(30,t,{enhanced:1}));
});
