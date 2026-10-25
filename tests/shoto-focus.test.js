import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const saber=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,activated:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
// Legal Core Jedi with Shoto Focus from the Lightsaber Combat tree.
function jedi(talent=true,inventory=[saber('lightsaber'),saber('short-lightsaber')]){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:12,cha:12};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent=talent?{id:'talent:shoto-focus'}:null;c.inventory=inventory;validateCharacter(c,pack);return c;}
const at=(c,i)=>derive(c,pack).attacks.find(a=>a.uid===c.inventory[i].uid).attack;

test('Shoto Focus metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:shoto-focus').effects[0].type='untyped';assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:shoto-focus').automation,'partial');
});
test('+2 competence on the short blade only while a different one-handed Lightsaber is wielded',()=>{
 const c=jedi(),b=jedi(false);assert.equal(at(c,1),at(b,1)+2,'Short Lightsaber');assert.equal(at(c,0),at(b,0),'main Lightsaber unchanged');
 const g=jedi(true,[saber('lightsaber'),saber('guard-shoto')]);assert.equal(derive(g,pack).attacks.find(a=>a.uid===g.inventory[1].uid),undefined,'Guard Shoto is a manual catalog attack, so its bonus stays manual');
 for(const [label,change] of [['main blade off',x=>x.inventory[0].activated=false],['main blade unequipped',x=>x.inventory[0].equipped=false],['main blade two-handed',x=>x.inventory[0].twoHanded=true],['no main blade',x=>x.inventory.splice(0,1)]]){const q=structuredClone(c),r=structuredClone(b);change(q);change(r);const i=q.inventory.findIndex(e=>e.id==='equipment:short-lightsaber');assert.equal(at(q,i),at(r,i),label);}
 const two=jedi(true,[saber('short-lightsaber'),saber('short-lightsaber')]),twob=jedi(false,[saber('short-lightsaber'),saber('short-lightsaber')]);assert.equal(at(two,0),at(twob,0),'default partner is the linked standard Lightsaber');
 const named=jedi(true,[saber('dueling-lightsaber'),saber('short-lightsaber')]),namedb=jedi(false,[saber('dueling-lightsaber'),saber('short-lightsaber')]);assert.equal(at(named,1),at(namedb,1),'default: a named variant is not the standard Lightsaber');
 for(const [x,y,label] of [[two,twob,'second short blade'],[named,namedb,'named one-handed Lightsaber']]){for(const q of [x,y])q.houseRules={ambiguities:{'ambiguity:shoto-focus-partner':'any-one-handed'}};validateCharacter(x,pack);assert.equal(at(x,x===two?0:1),at(y,y===twob?0:1)+2,'alternative accepts a '+label);}
 const amb=pack.rules.ambiguities.find(a=>a.id==='ambiguity:shoto-focus-partner');assert.equal(amb.default,'standard-lightsaber');assert.deepEqual(amb.options.map(o=>o.value),['standard-lightsaber','any-one-handed']);
 const stack=jedi(true,[saber('short-lightsaber',{quantity:2})]),stackb=jedi(false,[saber('short-lightsaber',{quantity:2})]);assert.equal(at(stack,0),at(stackb,0),'quantity is not a second wielded Lightsaber');
});
test('competence bonuses do not stack with each other',()=>{
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:shoto-focus').effects.push({target:'attacks',amount:3,type:'competence'});
 const c=jedi(),b=jedi(false);assert.equal(derive(c,p).attacks.find(a=>a.uid===c.inventory[1].uid).attack,at(b,1)+3);
});
