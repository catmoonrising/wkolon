import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {conditionalDefenseLabel} from '../src/defensive-combat.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:jedi',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Core Jedi: Dark Side Sense at level 1, Resist the Dark Side at level 3.
function jedi(talent=true){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:10,wis:14,cha:12};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:dark-side-sense'};c.levels.push(row(null),row(talent?'resist-the-dark-side':null));validateCharacter(c,pack);return c;}

test('Resist the Dark Side metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:resist-the-dark-side').effects.pop();assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:resist-the-dark-side').automation,'partial');
});
test('each Defense gets a +5 Force row vs. Dark Side powers; base Defenses unchanged',()=>{
 const c=jedi(),d=derive(c,pack),b=derive(jedi(false),pack);assert(d.ctx.talents.some(t=>t.id==='talent:resist-the-dark-side'));
 for(const key of ['reflex','fortitude','will']){const r=d.conditionalDefenses.find(e=>e.against==='dark-side-powers'&&e.defense===key);assert.equal(r.total,d.defenses[key]+5,key);assert.equal(conditionalDefenseLabel(r),'vs. Dark Side powers');assert.equal(d.defenses[key],b.defenses[key]);}
 assert(!b.conditionalDefenses.some(e=>e.against==='dark-side-powers'));
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:dark-side-sense').effects.push({target:'defenses',amount:2,type:'force'});const dp=derive(c,p);
 assert.equal(dp.conditionalDefenses.find(e=>e.against==='dark-side-powers'&&e.defense==='will').total,dp.defenses.will+3,'Force bonuses do not stack: 5 replaces 2');
});
