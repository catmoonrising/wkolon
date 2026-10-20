import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive} from '../src/rules.js';
import {resolveSpecies} from '../src/species-choices.js';
import {createSpeciesChecks} from '../src/species-rules.js';
import {skillRerollSources,useSkillReroll,compatibleReroll} from '../src/skill-rerolls.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(species='cerean',talent='acute-senses',cls='scout'){
 const c=newCharacter(pack,{classId:'class:'+cls});c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.levels[0].talent=talent?{id:'talent:'+talent}:null;return c;
}
function tracker(c,values){
 const logs=[],checks=createSpeciesChecks({current:()=>c,derived:()=>derive(c,pack),log:(...x)=>logs.push(x)},expr=>{assert(values.length,'Unexpected die roll');return {value:values.shift(),display:expr,coeffs:[1]};});
 const species=()=>resolveSpecies(c,pack);
 return {logs,checks,roll:id=>checks.click({dataset:{skillRoll:'skill:'+id}},species()),talent:(id,skill)=>checks.click({dataset:{talentReroll:'talent:'+id,rerollSkill:'skill:'+skill}},species()),species:id=>checks.click({dataset:{speciesReroll:'skill:'+id}},species()),controls:id=>checks.controls(derive(c,pack).skills.find(s=>s.id==='skill:'+id),species(),false)};
}
test('thirteen reviewed talents preserve fourteen explicitly scoped reroll effects and exact sources',()=>{
 validatePack(pack);const rows=pack.talents.filter(t=>t.effects.some(e=>e.target==='skillReroll'));assert.equal(rows.length,13);assert.equal(rows.flatMap(t=>t.effects).length,14);for(const t of rows){assert.equal(t.automation,'partial');assert(t.article);}
 for(const mutate of [e=>e.keep='lowest',e=>e.when='haggle',e=>e.skill='skill:invented',e=>e.amount=20]){const p=structuredClone(pack);mutate(p.talents.find(t=>t.id==='talent:acute-senses').effects[0]);assert.throws(()=>validatePack(p));}
});
test('species and talent rerolls remain independently available, with mandatory replacements in order',()=>{
 const c=hero();c.levels.push({classId:'class:scout',hpRoll:4,feats:[],talent:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:scout',hpRoll:4,feats:[],talent:{id:'talent:improved-initiative'},abilityIncreases:[],trainedSkills:[]});const r=tracker(c,[20,5,12]);r.roll('initiative');r.talent('improved-initiative','initiative');assert(r.logs.at(-1)[1].includes('kept 5'));r.species('initiative');assert(r.logs.at(-1)[1].includes('kept 12'));r.talent('improved-initiative','initiative');r.species('initiative');assert.equal(r.logs.length,3);
});
test('keeping the better result compares with the currently kept roll, not all historical rolls',()=>{
 const a=tracker(hero('hutt','barter'),[20,5,3]);a.roll('persuasion');a.species('persuasion');assert(a.logs.at(-1)[1].includes('kept 20'));a.talent('barter','persuasion');assert(a.logs.at(-1)[1].includes('kept 3'));
 const b=tracker(hero('hutt','barter'),[20,3,12]);b.roll('persuasion');b.talent('barter','persuasion');b.species('persuasion');assert(b.logs.at(-1)[1].includes('kept 12'));
});
test('new checks, explicit invalidation, changed modifiers and later-acquired sources cannot reuse an old roll',()=>{
 const c=hero('human',null),r=tracker(c,[20,10,9]);r.roll('perception');c.levels[0].talent={id:'talent:acute-senses'};r.talent('acute-senses','perception');assert.equal(r.logs.length,1);r.roll('perception');r.roll('stealth');r.talent('acute-senses','perception');assert.equal(r.logs.length,3);
 const q=tracker(hero(),[20]);q.roll('perception');q.checks.invalidate();q.talent('acute-senses','perception');assert.equal(q.logs.length,1);
 const d=hero(),s=tracker(d,[20]);s.roll('perception');d.condition=1;s.talent('acute-senses','perception');assert.equal(s.logs.length,1);
});
test('Acute Senses includes Sensors and does not grant a general Use Computer reroll',()=>{
 const c=hero(),r=tracker(c,[20,3]);assert(r.controls('use-computer').includes('Sensors'));const opts=skillRerollSources(derive(c,pack).skills.find(s=>s.id==='skill:use-computer'),resolveSpecies(c,pack),derive(c,pack));assert.equal(opts.length,1);assert.deepEqual(opts[0].applications,['sensors']);r.roll('use-computer');r.talent('acute-senses','use-computer');assert(r.logs.at(-1)[1].includes('kept 3'));
});
test('mutually exclusive applications cannot both reroll the same check',()=>{
 const sources=[{id:'barter',keep:'new',applications:['haggle']},{id:'notorious',keep:'best',applications:['intimidate']}],ticket={roll:{value:20},allowed:new Set(sources.map(s=>s.id)),used:new Set(),applications:null};useSkillReroll(ticket,sources[0],{value:5});assert(!compatibleReroll(ticket,sources[1]));assert.throws(()=>useSkillReroll(ticket,sources[1],{value:30}),/unavailable/);assert.equal(ticket.roll.value,5);
});
test('a broader Kel Dor application can combine with Dark Side Sense but not opposing Sense Force',()=>{
 const c=hero('kel-dor','dark-side-sense','jedi');c.trainedSkills=['skill:use-the-force'];const r=tracker(c,[20,4,7]);r.roll('use-the-force');r.species('use-the-force');r.talent('dark-side-sense','use-the-force');assert(r.logs.at(-1)[1].includes('kept 7'));
 c.levels[0].talent={id:'talent:clear-mind'};const q=tracker(c,[20,4]);q.roll('use-the-force');q.species('use-the-force');q.talent('clear-mind','use-the-force');assert.equal(q.logs.length,2);
});
test('talent sources disappear when chronological prerequisites are lost',()=>{
 const c=hero();c.levels.push({classId:'class:scout',hpRoll:4,feats:[],talent:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:scout',hpRoll:4,feats:[],talent:{id:'talent:improved-initiative'},abilityIncreases:[],trainedSkills:[]});assert(derive(c,pack).skillRerolls.some(r=>r.id==='talent:improved-initiative'));c.levels[0].talent=null;assert(!derive(c,pack).skillRerolls.some(r=>r.id==='talent:improved-initiative'));
});
test('substituting Use the Force does not inherit a Perception reroll',()=>{
 const c=hero('human','force-perception','jedi');c.abilities.cha=20;c.abilities.wis=8;c.trainedSkills=['skill:use-the-force'];c.skillCheckSources={'skill:perception':'skill:use-the-force'};c.levels.push({classId:'class:scout',hpRoll:4,feats:[],talent:{id:'talent:acute-senses'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});const d=derive(c,pack),s=d.skills.find(s=>s.id==='skill:perception');assert.equal(s.checkSource,'skill:use-the-force');assert.deepEqual(skillRerollSources(s,resolveSpecies(c,pack),d),[]);
});
