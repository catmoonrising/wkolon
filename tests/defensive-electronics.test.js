import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {activeAbilities} from '../src/ability-profiles.js';
import {setGenerationMethod,setPoolScore,assignScore} from '../src/ability-generation.js';
import {chooseSpeciesOption} from '../src/species-choices.js';
import {conditionalDefenseLabel} from '../src/defensive-combat.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal 4th-degree droid Soldier 3, trained in Use Computer, entering Independent Droid with Defensive Electronics.
function droid(talent='defensive-electronics',levels=1){const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:custom-droid';c.trainedSkills=['skill:use-computer'];c.levels[0].feats=[];c.levels[0].talent=null;
 chooseSpeciesOption(c,pack,'degree','degree-4');chooseSpeciesOption(c,pack,'size','medium');chooseSpeciesOption(c,pack,'language','basic');setGenerationMethod(c,'manual',pack);
 for(const [i,a] of activeAbilities(c,pack).entries()){setPoolScore(c,i,[15,14,13,12,10][i],pack);assignScore(c,a,i,pack);}
 c.levels.push(row('soldier'),row('soldier'));const cls=pack.classes.find(r=>r.id==='class:independent-droid');c.levels.push({...row('independent-droid',talent),entryDeclarations:Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true]))});
 for(let n=2;n<=levels;n++)c.levels.push(row('independent-droid'));validateCharacter(c,pack);return c;}
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
