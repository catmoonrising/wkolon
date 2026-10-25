import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {activeAbilities} from '../src/ability-profiles.js';
import {setGenerationMethod,setPoolScore,assignScore} from '../src/ability-generation.js';
import {chooseSpeciesOption} from '../src/species-choices.js';
import {conditionalDefenseLabel} from '../src/defensive-combat.js';
import fixtures from '../tools/class-defense-fixtures.cjs';
import {prepareDroidSystems,chooseDroidArm} from '../src/droid-installation.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const {droid}=fixtures(pack,{newCharacter,derive,validateCharacter,chooseSpeciesOption,setGenerationMethod,setPoolScore,assignScore,activeAbilities,prepareDroidSystems,chooseDroidArm});
const reprogram=c=>derive(c,pack).conditionalDefenses.find(e=>e.against==='reprogram');

test('Defensive Electronics metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:defensive-electronics').effects[0].against='use-the-force';assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:defensive-electronics').automation,'partial');
});
test('Will vs. Reprogram adds the Independent Droid level only',()=>{
 const c=droid(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:defensive-electronics'));assert(!d.ctx.inactiveClasses.has('class:independent-droid'));
 const r=reprogram(c);assert.equal(r.total,d.defenses.will+1);assert.equal(conditionalDefenseLabel(r),'vs. Reprogram');
 const three=droid('defensive-electronics',3);assert.equal(reprogram(three).total,derive(three,pack).defenses.will+3);
 assert.equal(reprogram(droid(null)),undefined,'talent required');assert.equal(d.defenses.will,derive(droid(null),pack).defenses.will,'plain Will unchanged');
});
