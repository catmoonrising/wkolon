import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,validateCharacter} from '../src/rules.js';
import {equipmentFamilies,resolveEquipment,purchaseQuote} from '../src/equipment.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
test('priced Holster, Datapad and Recording Unit variants match the pinned tables and stay grouped',()=>{
 const expected={'Holster':[['Hip',25,.5],['Concealed',50,.2]],'Datapad':[['Basic',100,.3],['Standard',1000,.5]],'Recording Unit':[['Audiorecorder',25,.1],['Videorecorder',50,.1],['Holorecorder',100,.1]]};
 for(const [name,rows] of Object.entries(expected)){
  const families=equipmentFamilies(pack,'gear').filter(f=>f.name===name);assert.equal(families.length,1);const f=families[0],old=f.records.find(r=>r.variant==='Unspecified');assert(old);assert.equal(old.cost,null);assert(old.purchasePending);assert.equal(f.records.length,rows.length+1);
  for(const [variant,cost,weight] of rows){const r=f.records.find(r=>r.variant===variant);assert(r,variant);assert.equal(r.cost,cost);assert.equal(r.weight,weight);assert.equal(r.sourceId,old.sourceId);assert(r.article.blocks.length);assert(!r.purchasePending);assert.equal(purchaseQuote({id:r.id},2,pack,{}).total,cost*2);assert.equal(resolveEquipment({id:r.id},pack).name,name+' ('+variant+')');}
 }
});
test('old unassigned inventory is never silently reinterpreted as a priced variant',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'});c.inventory=[{id:'equipment:holster',uid:crypto.randomUUID(),quantity:1,equipped:false,twoHanded:false,attackMod:0,damageMod:0,weightOverride:.2}];validateCharacter(c,pack);const r=resolveEquipment(c.inventory[0],pack,c);assert.equal(r.variant,'Unspecified');assert.equal(r.cost,null);assert.equal(r.weight,.2);assert.equal(purchaseQuote(c.inventory[0],1,pack,c).total,null);
});
