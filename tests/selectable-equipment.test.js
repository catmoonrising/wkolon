import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,weaponProficient,indexPack} from '../src/rules.js';
import {equipmentFamilies,purchaseQuote} from '../src/equipment.js';
import {featureChoices} from '../src/feature-choices.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),index=JSON.parse(fs.readFileSync(new URL('../data/reference-index.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
test('all 217 official weapon pages and 206 gear pages have selectable pinned records',()=>{
 for(const kind of ['weapon','gear']){
  const pages=index.records.filter(r=>r.kind===kind);assert.equal(pages.length,kind==='weapon'?217:206);
  for(const page of pages){const record=pack.catalog.records.find(r=>r.kind===kind&&r.sourceId&&pack.sources.find(s=>s.id===r.sourceId)?.title===page.source.title);assert(record,page.name);assert.equal(record.status,'available',page.name);assert(record.mechanicsIds.some(id=>pack.equipment.some(e=>e.id===id)));for(const id of record.mechanicsIds){const e=pack.equipment.find(e=>e.id===id);assert(e.article.blocks.length);assert(pack.sources.some(s=>s.id===e.sourceId&&s.revision===page.source.revision));}}
 }
 assert(!pack.equipment.some(e=>/homebrew/i.test(pack.sources.find(s=>s.id===e.sourceId)?.title||'')));
});
test('new gear and weapons preserve exact articles, ordinary prices, weights and license fees',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'}),halo=pack.equipment.find(r=>r.id==='equipment:halo-lamp'),weapon=pack.equipment.find(r=>r.id==='equipment:adjudicator-slugthrower');assert.equal(halo.cost,30);assert.equal(halo.weight,1);assert(articleText(halo.article).includes('3-square radius'));assert.equal(weapon.cost,325);assert.equal(weapon.weight,.5);assert.equal(weapon.group,'pistols');assert(weapon.manualAttack);assert.equal(purchaseQuote({id:weapon.id},1,pack,c).fee,16.25);assert(equipmentFamilies(pack,'weapon').some(r=>r.id===weapon.id));
});
test('manual weapons remain visible and selectable without fabricated attack totals or damage rolls',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'});c.inventory=[item('crossguard-lightsaber'),item('saberdart-launcher')];validateCharacter(c,pack);const d=derive(c,pack);assert.equal(d.manualAttacks.length,2);assert(!d.attacks.some(a=>c.inventory.some(e=>e.uid===a.uid)));assert(d.manualAttacks.some(a=>a.name==='Crossguard Lightsaber'));assert(renderStatBlock(c,d,pack).includes('Crossguard Lightsaber (Manual)'));
 const exotic=pack.equipment.find(r=>r.id==='equipment:discblade');assert(exotic.manualAttack);assert(featureChoices(pack.feats.find(f=>f.id==='feat:exotic-weapon-proficiency'),pack).includes(exotic.id));assert(!weaponProficient(pack.equipment.find(r=>r.id==='equipment:saberdart-launcher'),d.ctx,indexPack(pack)));
});
test('unclear prices stay manual and unknown weights retain explicit overrides',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'}),r=pack.equipment.find(r=>r.id==='equipment:holster');assert.equal(r.cost,null);assert(r.purchasePending);assert.equal(purchaseQuote({id:r.id},1,pack,c).total,null);assert(!pack.equipment.find(r=>r.id==='equipment:amphistaff').purchasePending);c.inventory=[{...item('holster'),equipped:false,weightOverride:.2}];validateCharacter(c,pack);assert.equal(purchaseQuote(c.inventory[0],1,pack,c).item.weight,.2);
});
