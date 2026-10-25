import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import fixtures from '../tools/class-defense-fixtures.cjs';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const {adept}=fixtures(pack,{newCharacter,derive,validateCharacter});
const will=(c,p=pack)=>derive(c,p).defenses.will;

test('Psychic Citadel metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:psychic-citadel').effects[0].type='insight';assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:psychic-citadel').automation,'partial');
});
test('Will Defense gains a Force bonus equal to Force Adept level, not character level',()=>{
 const c=adept(),b=adept(null),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:psychic-citadel')&&!d.ctx.inactiveClasses.has('class:force-adept'));
 assert.equal(will(c),will(b)+1,'Force Adept 1');
 const three=adept('psychic-citadel',3),threeB=adept(null,3);assert.equal(will(three),will(threeB)+3,'Force Adept 3');
 assert.equal(derive(c,pack).defenses.reflex,derive(b,pack).defenses.reflex,'Will only');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:equilibrium').effects.push({target:'defenses',amount:5,type:'force'});
 assert.equal(will(three,p),will(threeB,p),'a larger Force bonus supersedes; Force bonuses do not stack');
});
