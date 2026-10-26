import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {conditionalDefenseLabel} from '../src/defensive-combat.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Legal Selkath Order of Shasa Jedi (Jedi start with Force Sensitivity) taking Deception Awareness at level 1.
function shasa(talent=true){const c=newCharacter(pack,{classId:'class:jedi'});c.species='species:selkath';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:10,wis:14,cha:12};c.trainedSkills=['skill:use-the-force'];c.forceTraditions=[{id:'tradition:order-of-shasa',level:1,darkSideScore:0}];c.levels[0].talent=talent?{id:'talent:deception-awareness'}:null;validateCharacter(c,pack);return c;}

test('Deception Awareness metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:deception-awareness').effects[0].amount=2;assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:deception-awareness').automation,'partial');
});
test('a "vs. Deception" Will row adds +5; plain Will unchanged',()=>{
 const c=shasa(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:deception-awareness'&&!d.ctx.inactiveTalents.has(t.id)),JSON.stringify(d.issues));
 const r=d.conditionalDefenses.find(e=>e.against==='deception');assert.equal(r.total,d.defenses.will+5);assert.equal(conditionalDefenseLabel(r),'vs. Deception');
 const b=shasa(false);assert.equal(derive(b,pack).conditionalDefenses.find(e=>e.against==='deception'),undefined);assert.equal(derive(b,pack).defenses.will,d.defenses.will);
});
