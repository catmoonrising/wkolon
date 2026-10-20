import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {resolveSpecies} from '../src/species-choices.js';
import {createSpeciesChecks} from '../src/species-rules.js';
import {newDay,newEncounter,endRage,recoveryState} from '../src/recovery.js';
import {endTrackedCombat} from '../src/action-engine.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const level=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:3,feats:[],startingFeat:null,talent:talent?{id:'talent:'+talent}:null,abilityIncreases:[],trainedSkills:[]});
function hero(count=1){const c=newCharacter(pack,{classId:'class:scoundrel'});c.species='species:cerean';c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.levels[0].talent={id:'talent:knack'};for(let i=1;i<count;i++)c.levels.push(level('scoundrel'),level('scoundrel','knack'));return c;}
function tracker(c,values){
 const logs=[],checks=createSpeciesChecks({current:()=>c,derived:()=>derive(c,pack),log:(...x)=>logs.push(x)},expr=>{assert(values.length,'Unexpected die');return {value:values.shift(),display:expr,coeffs:[1]};});
 const species=()=>resolveSpecies(c,pack);
 return {logs,checks,roll:id=>checks.click({dataset:{skillRoll:'skill:'+id}},species()),knack:id=>checks.click({dataset:{talentReroll:'talent:knack',rerollSkill:'skill:'+id}},species()),species:id=>checks.click({dataset:{speciesReroll:'skill:'+id}},species()),controls:id=>checks.controls(derive(c,pack).skills.find(s=>s.id==='skill:'+id),species(),false)};
}
test('Knack has a pinned, bounded any-skill daily reroll contract',()=>{
 validatePack(pack);const t=pack.talents.find(t=>t.id==='talent:knack');assert.equal(t.automation,'partial');assert(t.article);
 for(const change of [e=>e.dailyUsesPerSelection=2,e=>e.keep='new',e=>e.skill='skill:perception',e=>e.when='haggle']){const p=structuredClone(pack);change(p.talents.find(t=>t.id==='talent:knack').effects[0]);assert.throws(()=>validatePack(p));}
});
test('Knack keeps the better current result and spends a daily use even when keeping the original, without FP or actions',()=>{
 const c=hero(),fp=c.forcePoints,r=tracker(c,[20,3]);r.roll('perception');r.knack('perception');assert(r.logs.at(-1)[1].includes('kept 20'));assert.equal(c.recovery.knacksSpent,1);assert.equal(c.forcePoints,fp);assert.equal(c.actionState,undefined);validateCharacter(c,pack);
 const n=r.logs.length;r.knack('perception');assert.equal(r.logs.length,n);
});
test('multiple selections grant daily capacity while the same source still rerolls each check once',()=>{
 const c=hero(2),r=tracker(c,[5,10,7,9]);assert(r.controls('perception').includes('2/2'));r.roll('perception');r.knack('perception');r.knack('perception');assert.equal(c.recovery.knacksSpent,1);assert.equal(r.logs.length,2);r.roll('stealth');r.knack('stealth');assert.equal(c.recovery.knacksSpent,2);assert(r.controls('stealth').includes('0/2'));
});
test('species and daily rerolls resolve independently in chosen order against the currently kept result',()=>{
 const c=hero(),r=tracker(c,[20,5,12]);r.roll('initiative');r.species('initiative');r.knack('initiative');assert(r.logs.at(-1)[1].includes('kept 12'));assert.equal(c.recovery.knacksSpent,1);
 const q=hero(),s=tracker(q,[5,20,2]);s.roll('initiative');s.knack('initiative');s.species('initiative');assert(s.logs.at(-1)[1].includes('kept 2'));assert.equal(q.recovery.knacksSpent,1);
});
test('daily spending survives save/reload, encounter endings and talent capacity edits; New Day resets spending',()=>{
 const c=hero(2),r=tracker(c,[5,9]);r.roll('perception');r.knack('perception');const q=JSON.parse(JSON.stringify(c));validateCharacter(q,pack);newEncounter(q);endTrackedCombat(q);assert.equal(q.recovery.knacksSpent,1);q.levels.splice(1);const s=tracker(q,[5]);s.roll('perception');s.knack('perception');assert.equal(q.recovery.knacksSpent,1);assert.equal(s.logs.length,1);q.levels=structuredClone(c.levels);assert(s.controls('perception').includes('1/2'));newDay(q,pack);assert.equal(q.recovery.knacksSpent,0);
});
test('reload and intervening checks cannot spend a use on an obsolete result',()=>{
 const c=hero(),r=tracker(c,[5,9]);r.roll('perception');r.roll('stealth');r.knack('perception');assert.equal(c.recovery,undefined);const loaded=tracker(JSON.parse(JSON.stringify(c)),[]);loaded.knack('stealth');assert.equal(loaded.logs.length,0);
 r.checks.invalidate();r.knack('stealth');assert.equal(c.recovery,undefined);
});
test('changed modifiers, lost ownership and sources acquired after rolling cannot authorize a paid reroll',()=>{
 for(const change of [c=>c.condition=1,c=>c.levels[0].talent=null]){const c=hero(),r=tracker(c,[5]);r.roll('perception');change(c);r.knack('perception');assert.equal(c.recovery,undefined);}
 const c=hero();c.levels[0].talent=null;const r=tracker(c,[5]);r.roll('perception');c.levels[0].talent={id:'talent:knack'};r.knack('perception');assert.equal(c.recovery,undefined);
});
test('Knack applies to a substituted skill check without inheriting native Perception rerolls',()=>{
 const c=hero();c.levels.push({...level('jedi','force-perception'),startingFeat:{id:'feat:force-sensitivity'}},level('jedi'));c.trainedSkills=['skill:use-the-force'];c.skillCheckSources={'skill:perception':'skill:use-the-force'};c.abilities.cha=20;c.abilities.wis=8;
 const d=derive(c,pack);assert.equal(d.skills.find(s=>s.id==='skill:perception').checkSource,'skill:use-the-force');const r=tracker(c,[4,12]);r.roll('perception');r.knack('perception');assert.equal(c.recovery.knacksSpent,1);assert(r.logs.at(-1)[1].includes('kept 12'));
});
test('invalid die results cannot consume daily uses or the check opportunity',()=>{
 const c=hero(),r=tracker(c,[5,NaN,12]);r.roll('perception');assert.throws(()=>r.knack('perception'),/Invalid reroll/);assert.equal(c.recovery,undefined);r.knack('perception');assert.equal(c.recovery.knacksSpent,1);assert(r.logs.at(-1)[1].includes('kept 12'));
});
test('legacy saves default to no Knack spending; optional spending must be a bounded nonnegative integer',()=>{
 const c=hero();endRage(c);delete c.recovery.knacksSpent;assert.equal(recoveryState(c).knacksSpent,0);validateCharacter(c,pack);
 for(const n of [-1,1.1,'0',100001])assert.throws(()=>validateCharacter({...c,recovery:{...c.recovery,knacksSpent:n}},pack),/recovery/);
});
