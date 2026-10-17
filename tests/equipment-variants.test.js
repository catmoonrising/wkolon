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
test('Bacta Tank supplies and conflicting netting/shroud versions keep their own purchase facts',()=>{
 const expected={
  'Bacta Tank':[['Empty',100000,500,[]],['Full',130000,1100,[]]],
  'Camouflage Netting':[['Clone Wars Campaign Guide',6000,40,[]],['Galaxy at War',2000,5,[]]],
  'Holoshroud':[['General Equipment',25000,.5,[]],['Armor Upgrade',5000,null,['restricted','rare']]]
 };
 for(const [name,rows] of Object.entries(expected)){
  const family=equipmentFamilies(pack,'gear').find(f=>f.name===name);assert(family);
  const old=family.records.find(r=>r.variant==='Unspecified');assert(old.purchasePending);assert.equal(old.cost,null);
  for(const [variant,cost,weight,availability] of rows){
   const r=family.records.find(r=>r.variant===variant);assert(r,variant);assert.equal(r.cost,cost);assert.equal(r.weight,weight);assert.deepEqual(r.availability,availability);assert.equal(r.sourceId,old.sourceId);assert.equal(r.automation,'manual');
   assert.equal(resolveEquipment({id:r.id},pack).name,`${name} (${variant})`);
   const q=purchaseQuote({id:r.id},1,pack,{});assert.equal(q.fee,availability.includes('restricted')?500:0);assert.equal(q.total,cost+q.fee);
  }
 }
 const bacta=pack.equipment.find(r=>r.id==='equipment:bacta-per-liter');assert.equal(bacta.cost,100);assert.equal(bacta.weight,2);
 assert.equal(purchaseQuote({id:bacta.id},300,pack,{}).total,30000);
 const empty=pack.equipment.find(r=>r.id==='equipment:bacta-tank-empty'),full=pack.equipment.find(r=>r.id==='equipment:bacta-tank-full');
 assert.equal(empty.cost+300*bacta.cost,full.cost);assert.equal(empty.weight+300*bacta.weight,full.weight);
});
test('new Bacta supply prices match the pinned table, including its superscript footnote',()=>{
 const index=JSON.parse(fs.readFileSync(new URL('../data/reference-index.json',import.meta.url))),entry=index.records.find(r=>r.name==='Bacta Tank');
 const article=JSON.parse(fs.readFileSync(new URL('../'+entry.path,import.meta.url))).article;
 const text=n=>typeof n==='string'?n:(n.children||[]).map(text).join('');
 const find=(nodes,tag)=>nodes.flatMap(n=>typeof n==='object'?[...(n.tag===tag?[n]:[]),...find(n.children||[],tag)]:[]);
 const rows=find(article.blocks,'tr').map(n=>(n.children||[]).filter(n=>n.tag==='td').map(n=>text(n).trim()));
 for(const [label,cost,weight] of [['Bacta Tank (Empty)','100,000','500 kg'],['Bacta Tank (Full)','130,000','1,100 kg'],['Bacta (per liter)1','100','2 kg']])assert(rows.some(r=>r[0]===label&&r[1]===cost&&r[2]===weight));
});
