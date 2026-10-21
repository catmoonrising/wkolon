import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyActionState} from '../src/action-economy.js';
import {activeResistancePowers,resistancePowerDR,finishResistancePower,chooseResistancePowerTier,lockResistancePowers,resistanceMaintenancePlan,renewResistancePower,requireResistanceDamageChecks,recordResistanceDamageCheck,finishResistanceDamageCheck,validateResistancePowers,clearResistancePowers} from '../src/resistance-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=()=>({actionState:emptyActionState()});
const cast=(c,total=30)=>finishResistancePower(c,pack,crypto.randomUUID(),'power:energy-resistance',{total});
const validate=c=>validateResistancePowers(c,pack,message=>{throw new Error(message);});
const maintain=(c,row)=>{c.actionState.turn++;resistanceMaintenancePlan(c,{},pack,row.id);renewResistancePower(c,row.id);};

test('Energy Resistance contract pins distinct DR, early quickening and Swift damage-checked maintenance',()=>{
 const rule=pack.rules.resistancePowers[0];assert.equal(rule.powerId,'power:energy-resistance');assert.deepEqual(rule.thresholds.map(t=>[t.dc,t.dr]),[[20,5],[25,10],[30,15],[35,20]]);assert.deepEqual(rule.quickening,{action:'swift',forcePoints:1,timing:'before-check'});assert.equal(rule.maintenance,'swift');assert.equal(rule.damageCheck.baseDC,15);
 assert.equal(pack.forcePowers.find(p=>p.id===rule.powerId).automation,'partial');
});
test('resistance lifecycle selects achieved tiers, never adds or depletes DR, and locks changes after incoming damage',()=>{
 for(const [total,dr] of [[19,0],[20,5],[24,5],[25,10],[30,15],[35,20]]){const c=hero();cast(c,total);assert.equal(resistancePowerDR(c,pack,{energy:true}),dr);validate(c);}
 const c=hero(),a=cast(c,35);cast(c,30);assert.equal(resistancePowerDR(c,pack,{energy:true}),20);chooseResistancePowerTier(c,pack,a.id,1);assert.equal(resistancePowerDR(c,pack,{energy:true}),15);chooseResistancePowerTier(c,pack,a.id,4);lockResistancePowers(c);assert.throws(()=>chooseResistancePowerTier(c,pack,a.id,1));assert.equal(resistancePowerDR(c,pack,{energy:true}),20);assert.equal(resistancePowerDR(c,pack,{energy:true}),20);validate(c);
 assert.equal(resistancePowerDR(c,pack),0);assert.equal(resistancePowerDR(c,pack,{sonic:true}),20);assert.equal(resistancePowerDR(c,pack,{fire:true}),0);assert.equal(resistancePowerDR(c,pack,{fire:true,listedSources:true}),20);assert.equal(resistancePowerDR(c,pack,{energy:true,lightsaber:true}),0);assert.equal(resistancePowerDR(c,pack,{energy:true,ignoreDR:true}),0);assert.throws(()=>resistancePowerDR(c,pack,{energy:1}));
});
test('resistance renewal is due only at turn start and initial casting does not create damage checks',()=>{
 const c=hero(),row=cast(c);assert.deepEqual(requireResistanceDamageChecks(c,pack,30),[]);assert.throws(()=>renewResistancePower(c,row.id));c.actionState.turn++;assert.equal(activeResistancePowers(c,pack).length,0);assert.throws(()=>resistanceMaintenancePlan(c,{helpless:true},pack,row.id));assert.equal(resistanceMaintenancePlan(c,{},pack,row.id).rule.maintenance,'swift');renewResistancePower(c,row.id);assert(row.maintained);assert.throws(()=>renewResistancePower(c,row.id));assert.deepEqual(requireResistanceDamageChecks(c,pack,0),[]);assert.deepEqual(requireResistanceDamageChecks(c,pack,5),[row.id]);validate(c);
});
test('pending maintenance saves the original roll, accepts a separate FP bonus and cannot reroll or waive other instances',()=>{
 const c=hero(),a=cast(c),b=cast(c,35);c.actionState.turn++;renewResistancePower(c,a.id);renewResistancePower(c,b.id);requireResistanceDamageChecks(c,pack,10);assert.throws(()=>requireResistanceDamageChecks(c,pack,1));recordResistanceDamageCheck(c,a.id,{natural:20,bonus:2,total:22});const saved=JSON.parse(JSON.stringify(c));validate(saved);assert.throws(()=>recordResistanceDamageCheck(saved,a.id,{natural:20,bonus:2,total:22}));assert.deepEqual(finishResistanceDamageCheck(saved,pack,a.id,3),{dc:25,total:25,success:true});assert.equal(saved.resistancePowerEffects[0].pending,null);assert(saved.resistancePowerEffects[1].pending);recordResistanceDamageCheck(saved,b.id,{natural:1,bonus:2,total:3});assert(!finishResistanceDamageCheck(saved,pack,b.id).success);assert.equal(saved.resistancePowerEffects.length,1);assert.throws(()=>finishResistanceDamageCheck(saved,pack,b.id));validate(saved);assert.equal(saved.forcePowerRecoveryPending,undefined);
});
test('resistance validation rejects malformed rows, pending checks and manipulated original totals',()=>{
 const c=hero(),row=cast(c);maintain(c,row);requireResistanceDamageChecks(c,pack,3);recordResistanceDamageCheck(c,row.id,{natural:10,bonus:7,total:17});validate(c);
 for(const change of [s=>s.tier=5,s=>s.used=false,s=>s.maintained=false,s=>s.untilTurn=0,s=>s.pending.damage=-1,s=>s.pending.check.total=20,s=>s.pending.check.natural=21,s=>s.extra=true]){const bad=structuredClone(c);change(bad.resistancePowerEffects[0]);assert.throws(()=>validate(bad));}
 const duplicate=structuredClone(c);duplicate.resistancePowerEffects.push(structuredClone(duplicate.resistancePowerEffects[0]));assert.throws(()=>validate(duplicate));clearResistancePowers(c);assert(!c.resistancePowerEffects);validate(c);
});
