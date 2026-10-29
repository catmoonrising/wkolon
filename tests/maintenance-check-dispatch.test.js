import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as common from '../src/maintenance-checks.js';
import * as old from '../src/resistance-powers.js';
import * as outgoing from '../src/outgoing-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),actor=()=>({levels:[],actionState:{turn:1,plan:[],history:[]}}),check={natural:10,bonus:20,total:30};
function mixed(){const c=actor();old.finishResistancePower(c,pack,crypto.randomUUID(),'power:energy-resistance',check);old.finishResistancePower(c,pack,crypto.randomUUID(),'power:cloak',check,{enhanced:false});for(const r of c.resistancePowerEffects)r.maintained=true;c.outgoingPowerEffects=[{id:crypto.randomUUID(),powerId:'power:cryokinesis',target:outgoing.outgoingTarget(pack,{name:'Door',lineOfSight:true,unattended:true}),maxTier:3,tier:3,enhanced:false,endsRemaining:2,ended:false,maintained:true,pending:null}];return c;}

test('resistance-only concentration results and full state remain exactly the existing resolver',()=>{
 const source=mixed();delete source.outgoingPowerEffects;const a=structuredClone(source),b=structuredClone(source);assert.deepEqual(common.requireMaintenanceDamageChecks(a,pack,7),old.requireResistanceDamageChecks(b,pack,7));assert.deepEqual(a,b);assert.equal(common.maintenancePendingMessage(a),old.resistancePendingMessage(b));for(const row of a.resistancePowerEffects){common.recordMaintenanceDamageCheck(a,row.id,check);old.recordResistanceDamageCheck(b,row.id,check);assert.deepEqual(common.finishMaintenanceDamageCheck(a,pack,row.id,2),old.finishResistanceDamageCheck(b,pack,row.id,2));assert.deepEqual(a,b);}common.clearMaintenanceCheckPowers(a);old.clearResistancePowers(b);assert.deepEqual(a,b);
});
test('mixed damage gates all pending checks and resolves/releases exactly one family instance',()=>{
 const c=mixed(),ids=common.requireMaintenanceDamageChecks(c,pack,20);assert.equal(ids.length,3);assert.equal(common.pendingMaintenanceChecks(c).length,3);assert.throws(()=>common.assertMaintenanceResolved(c));const before=structuredClone(c);assert.throws(()=>common.requireMaintenanceDamageChecks(c,pack,1));assert.deepEqual(c,before);common.recordMaintenanceDamageCheck(c,ids[2],check);assert.deepEqual(common.finishMaintenanceDamageCheck(c,pack,ids[2]),{dc:35,total:30,success:false});assert.equal(c.outgoingPowerEffects,undefined);assert.equal(common.pendingMaintenanceChecks(c).length,2);common.releaseMaintenancePower(c,ids[0]);assert.equal(c.resistancePowerEffects.length,1);common.clearMaintenanceCheckPowers(c);assert.equal(common.pendingMaintenanceChecks(c).length,0);
});
test('ambiguous cross-family IDs and invalid damage reject before touching either family',()=>{
 const c=mixed();c.outgoingPowerEffects[0].id=c.resistancePowerEffects[0].id;const before=structuredClone(c);assert.throws(()=>common.requireMaintenanceDamageChecks(c,pack,5),/Ambiguous/);assert.deepEqual(c,before);for(const n of [-1,1.5,NaN,1000000001]){assert.throws(()=>common.requireMaintenanceDamageChecks(c,pack,n));assert.deepEqual(c,before);}
});

test('legacy pending/invalid damage errors remain exactly the existing resolver',()=>{
 const c=mixed();delete c.outgoingPowerEffects;old.requireResistanceDamageChecks(c,pack,7);for(const n of [1,-1,NaN]){let expected;try{old.requireResistanceDamageChecks(structuredClone(c),pack,n);}catch(e){expected=e.message;}assert.throws(()=>common.requireMaintenanceDamageChecks(c,pack,n),e=>e.message===expected);}
});
