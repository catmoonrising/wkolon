import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {activeAbilities} from '../src/ability-profiles.js';
import {setGenerationMethod,setPoolScore,assignScore} from '../src/ability-generation.js';
import {chooseSpeciesOption} from '../src/species-choices.js';
import {validatePack} from '../tools/validate-rules.js';
import fixture from '../tools/designated-target-fixtures.cjs';
import * as rules from '../src/rules.js';
import * as profiles from '../src/ability-profiles.js';
import * as generation from '../src/ability-generation.js';
import * as species from '../src/species-choices.js';
import * as installation from '../src/droid-installation.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const row=(c,i,target,p=core)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,p);return derive(q,p).attacks.find(a=>a.uid===q.inventory[i].uid);};
const f=fixture(core,{...rules,...profiles,...generation,...species,...installation});
function scout(talent=true){const c=f.scout();if(!talent)c.levels[0].talent={id:'talent:acute-senses'};return c;}
function droid(talent=true){const c=f.droid();if(!talent)c.levels[3].talent={id:'talent:defensive-electronics'};c.inventory=c.inventory.filter(e=>e.id==='equipment:blaster-rifle');return c;}

test('designated-target records are pinned and Partial',()=>{
 validatePack(core);const p=structuredClone(core);p.talents.find(t=>t.id==='talent:spotter').effects[0].type='morale';assert.throws(()=>validatePack(p));
 for(const id of ['knowledge-is-strength','spotter','target-acquisition'])assert.equal(core.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('Spotter: +1 insight against the declared target only; area attacks excluded',()=>{
 const c=scout();assert(derive(c,core).targetTraitsUsed.includes('spottedTarget'));assert.equal(row(c,0,{spottedTarget:true}).attack,row(c,0,{}).attack+1);
 assert.equal(row(c,1,{spottedTarget:true}).attack,row(c,1,{}).attack,'area');assert.equal(row(c,0,{acquiredTarget:true}).attack,row(c,0,{}).attack,'other flag');
});
test('Target Acquisition: +1 circumstance attack and +1 damage',()=>{
 const c=droid(),b=droid(false);assert(derive(c,core).ctx.talents.some(t=>t.id==='talent:target-acquisition'));
 const on=row(c,0,{acquiredTarget:true}),off=row(c,0,{});assert.equal(on.attack,off.attack+1);assert.equal(on.damageDisplay,off.damageDisplay+'+1');
 assert.equal(row(b,0,{acquiredTarget:true}).attack,row(b,0,{}).attack,'talent required');
});
test('Knowledge is Strength: +2 morale; morale and insight types each resolve highest-of-type',()=>{
 const p=structuredClone(core),c=f.infiltrator();assert.deepEqual(derive(c,core).issues,[]);
 assert.equal(row(c,0,{loreTarget:true},p).attack,row(c,0,{},p).attack+2);
 p.talents.find(x=>x.id==='talent:knowledge-is-strength').effects.push({target:'attacks',amount:3,type:'morale'});assert.equal(row(c,0,{loreTarget:true},p).attack,row(c,0,{},p).attack,'larger morale bonus supersedes');
});
