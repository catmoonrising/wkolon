import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {sensesView} from '../src/senses.js';
import {moduleDefinition,moduleRelevant,moduleVisible} from '../src/sheet-modules.js';
import {newCharacter,derive} from '../src/rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
test('Senses summarizes existing modes and blindness without changing derived state',()=>{
 for(const [state,text] of [[{vision:'normal'},'Normal Vision'],[{vision:'low-light'},'Low-Light Vision'],[{vision:'darkvision'},'Darkvision'],[{vision:'darkvision',blind:true},'Blinded']]){const before=structuredClone(state);assert.equal(sensesView(state),`<span>${text}</span>`);assert.deepEqual(state,before);}
});
test('actual species vision changes relevance while explicit module preferences remain authoritative',()=>{
 const c=newCharacter(pack,{classId:'class:scout'});const normal=derive(c,pack);assert.equal(sensesView(normal),'<span>Normal Vision</span>');assert.equal(moduleDefinition('senses').title,'Senses');assert.equal(moduleRelevant('senses',c,normal),false);c.species='species:gungan';const d=derive(c,pack);assert.equal(d.vision,'low-light');assert.equal(moduleRelevant('senses',c,d),true);assert.equal(moduleVisible('senses',{senses:false},true),false);assert.equal(moduleVisible('senses',{senses:true},false),true);assert.equal(moduleRelevant('senses',c,{vision:'normal',blind:true}),true);
});
