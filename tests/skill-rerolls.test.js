import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive} from '../src/rules.js';
import {resolveSpecies} from '../src/species-choices.js';
import {createSpeciesChecks} from '../src/species-rules.js';
import {skillRerollSources,useSkillReroll,compatibleReroll,REROLL_SCOPES} from '../src/skill-rerolls.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(species='cerean',talent='acute-senses',cls='scout'){
 const c=newCharacter(pack,{classId:'class:'+cls});c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.levels[0].talent=talent?{id:'talent:'+talent}:null;return c;
}
function tracker(c,values){
 const logs=[],expressions=[],checks=createSpeciesChecks({current:()=>c,derived:()=>derive(c,pack),log:(...x)=>logs.push(x)},expr=>{expressions.push(expr);assert(values.length,'Unexpected die roll');return {value:values.shift(),display:expr,coeffs:[1]};});
 const species=()=>resolveSpecies(c,pack);
 return {logs,expressions,checks,roll:id=>checks.click({dataset:{skillRoll:'skill:'+id}},species()),talent:(id,skill)=>checks.click({dataset:{talentReroll:'talent:'+id,rerollSkill:'skill:'+skill}},species()),species:id=>checks.click({dataset:{speciesReroll:'skill:'+id}},species()),controls:id=>checks.controls(derive(c,pack).skills.find(s=>s.id==='skill:'+id),species(),false)};
}
test('fourteen reviewed talents preserve fifteen explicitly scoped reroll effects and exact sources',()=>{
 validatePack(pack);const rows=pack.talents.filter(t=>t.id!=='talent:knack'&&t.effects.some(e=>e.target==='skillReroll'));assert.equal(rows.length,14);assert.equal(rows.flatMap(t=>t.effects).length,15);for(const t of rows){assert.equal(t.automation,'partial');assert(t.article);}
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
test('Force Perception preserves explicitly allowed Perception rerolls within its four applications',()=>{
 const c=hero('human','force-perception','jedi');c.abilities.cha=20;c.abilities.wis=8;c.trainedSkills=['skill:use-the-force'];c.skillCheckSources={'skill:perception':'skill:use-the-force'};c.levels.push({classId:'class:scout',hpRoll:4,feats:[],talent:{id:'talent:acute-senses'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});const d=derive(c,pack),s=d.skills.find(s=>s.id==='skill:perception');assert.equal(s.checkSource,'skill:use-the-force');const sources=skillRerollSources(s,resolveSpecies(c,pack),d);assert.equal(sources.length,1);assert.equal(sources[0].talentId,'talent:acute-senses');assert.deepEqual(sources[0].applications,['avoid-surprise','notice-targets','sense-deception','sense-influence']);const r=tracker(c,[20,3]);r.roll('perception');r.talent('acute-senses','perception');assert(r.logs.at(-1)[1].includes('kept 3'));
});
test('Force Intuition carries separate original-skill rerolls with the selected UTF modifier',()=>{
 const c=hero('cerean','force-intuition','jedi');c.abilities.cha=20;c.trainedSkills=['skill:use-the-force'];c.skillCheckSources={'skill:initiative':'skill:use-the-force'};
 for(const talent of ['acute-senses',null,'improved-initiative'])c.levels.push({classId:'class:scout',hpRoll:4,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:c.levels.length===1?{id:'feat:weapon-proficiency-rifles'}:null,abilityIncreases:c.levels.length===3?['wis','con']:[],trainedSkills:[]});
 const d=derive(c,pack),s=d.skills.find(s=>s.id==='skill:initiative'),utf=d.skills.find(s=>s.id==='skill:use-the-force');assert.equal(s.checkSource,utf.id);assert.equal(s.total,utf.total);assert.equal(skillRerollSources(s,resolveSpecies(c,pack),d).length,2);
 const r=tracker(c,[20,4,12]);r.roll('initiative');r.species('initiative');r.talent('improved-initiative','initiative');r.species('initiative');r.talent('improved-initiative','initiative');assert.equal(r.logs.length,3);assert(r.logs.at(-1)[1].includes('kept 12'));assert.deepEqual(r.expressions,Array(3).fill('1d20+'+utf.total));
});
test('Force Perception filters synthetic incompatible scopes and narrows a partially compatible scope',()=>{
 const c=hero('human','force-perception','jedi');c.trainedSkills=['skill:use-the-force'];c.skillCheckSources={'skill:perception':'skill:use-the-force'};const d=derive(c,pack),s=d.skills.find(s=>s.id==='skill:perception');assert.equal(s.checkSource,'skill:use-the-force');assert(s.available);
 // No current printed Perception trait has a partially overlapping scope. Use
 // clearly synthetic inputs to exercise this contract boundary, not Ssi-Ruu,
 // whose Force checks are forbidden and whose scent reroll is Persuasion.
 REROLL_SCOPES.fixtureNotice={label:'Fixture',applications:['notice-targets','perception-scent']};
 try{const species={...resolveSpecies(c,pack),skillRerolls:['keenSmell','sensors','fixtureNotice'].map(when=>({skill:s.id,keep:'best',when}))};const rows=skillRerollSources(s,species,d);assert.equal(rows.length,1);assert.deepEqual(rows[0].applications,['notice-targets']);assert.equal(rows[0].keep,'best');}finally{delete REROLL_SCOPES.fixtureNotice;}
});
test('Trace receives no inferred carryover and all seven reviewed substitution grants are required',()=>{
 for(const mutate of [p=>p.talents.find(t=>t.id==='talent:trace').effects[0].carryRerolls=true,p=>delete p.talents.find(t=>t.id==='talent:force-intuition').effects[0].carryRerolls,p=>p.talents.find(t=>t.id==='talent:force-pilot').effects=[],p=>p.talents=p.talents.filter(t=>t.id!=='talent:force-deception')]){const p=structuredClone(pack);mutate(p);assert.throws(()=>validatePack(p),/substitution|carryover/i);}
});
test('only original-skill rerolls carry, not the replacement skill own rerolls',()=>{
 const c=hero('kel-dor','force-intuition','jedi');c.trainedSkills=['skill:use-the-force'];c.skillCheckSources={'skill:initiative':'skill:use-the-force'};c.levels.push({classId:'class:jedi',hpRoll:4,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:jedi',hpRoll:4,feats:[],talent:{id:'talent:dark-side-sense'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});const d=derive(c,pack),s=d.skills.find(s=>s.id==='skill:initiative');assert.equal(s.checkSource,'skill:use-the-force');assert.deepEqual(skillRerollSources(s,resolveSpecies(c,pack),d),[]);
});
test('carried scoped Persuasion, Treat Injury best-result, and Watchful Step policies remain independent',()=>{
 const d={skillRerolls:[{id:'talent:barter',name:'Barter',skill:'skill:persuasion',keep:'new',when:'haggle'},{id:'talent:steady-under-pressure',name:'Steady Under Pressure',skill:'skill:treat-injury',keep:'best',when:'always'},{id:'talent:acute-senses',name:'Acute Senses',skill:'skill:perception',keep:'new',when:'always'}]},s={id:'skill:persuasion',checkSource:'skill:use-the-force',carryRerolls:true};
 const rows=skillRerollSources(s,{id:'species:hutt',name:'Hutt',skillRerolls:[{skill:s.id,keep:'best'}]},d);assert.equal(rows.length,2);assert.equal(rows[0].keep,'best');assert.equal(rows[1].keep,'new');assert.deepEqual(rows[1].applications,['haggle']);
 const healing=skillRerollSources({...s,id:'skill:treat-injury'},{},d);assert.equal(healing.length,1);assert.equal(healing[0].keep,'best');
 const c=hero('cerean','watchful-step','scout');c.trainedSkills=['skill:perception'];c.skillCheckSources={'skill:initiative':'skill:perception'};const derived=derive(c,pack),initiative=derived.skills.find(s=>s.id==='skill:initiative');assert.equal(initiative.checkSource,'skill:perception');const carried=skillRerollSources(initiative,resolveSpecies(c,pack),{...derived,skillRerolls:d.skillRerolls});assert.equal(carried.length,1);assert.equal(carried[0].kind,'species');
});
