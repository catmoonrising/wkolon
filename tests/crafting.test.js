import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/skill-application-fixtures.cjs';
import * as api from '../src/rules.js';
import {beginNextTurn,takeAction,previewPlan,executeAction} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
test('Bomb Thrower preflights supplies, owner, budget and capacity without spending or creating items',()=>{
 for(const [supplies,setup] of [[false,c=>{}],[true,c=>{c.levels[0].talent={id:'talent:dastardly-strike'};}],[true,c=>{c.actionState.spent=['swift'];}],[true,c=>{c.inventory=Array.from({length:1000},()=>({id:'equipment:frag-grenade',uid:crypto.randomUUID(),quantity:1,carried:true,equipped:false,twoHanded:false,attackMod:0,damageMod:0}));}]]){
  const c=f.duros();beginNextTurn(c,pack);setup(c);const original=structuredClone(c);assert.throws(()=>takeAction(c,pack,'craft-frag-grenade',{supplies}));assert.deepEqual(c,original);
 }
});
test('queued crafting is free until executed, adds one grenade once, and preserves credits/FP through save',()=>{
 const c=f.duros();beginNextTurn(c,pack);const amount=c.inventory.length,credits=c.credits,fp=c.forcePoints;const step=queueAction(c,'craft-frag-grenade',{supplies:true});assert.equal(previewPlan(c,pack)[0].issue,undefined);assert.equal(c.inventory.length,amount);assert.deepEqual(c.actionState.spent,[]);const result=executeAction(c,pack,step.id);assert.match(result.text,/Frag Grenade/);assert.equal(c.inventory.length,amount+1);assert.equal(c.inventory.at(-1).id,'equipment:frag-grenade');assert.equal(c.inventory.at(-1).equipped,false);assert.deepEqual(new Set(c.actionState.spent),new Set(['standard','move','swift']));assert.equal(c.credits,credits);assert.equal(c.forcePoints,fp);const saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);assert.throws(()=>executeAction(saved,pack,step.id),/already|resolved/i);assert.equal(saved.inventory.length,amount+1);
});
