import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/awareness-family-fixtures.cjs';
import * as api from '../src/rules.js';
import {resolveSpecies} from '../src/species-choices.js';
import {skillRerollSources,useSkillReroll,compatibleReroll} from '../src/skill-rerolls.js';
import {createSpeciesChecks} from '../src/species-rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const perception=c=>api.derive(c,pack).skills.find(s=>s.id==='skill:perception');

test('complete Shasa, Sentinel and Kel Dor mercenary builds have no unresolved choices',()=>{
 for(const c of [f.shasa(),f.shasa(true),f.sentinel(),f.mercenary()])assert.deepEqual(api.derive(c,pack).issues,[]);
});
test('Deception Awareness does not grant general training or prerequisites, and scopes its saved modifier',()=>{
 const c=f.shasa(),native=perception(c);assert.equal(native.trained,false);assert.equal(native.checkSource,'skill:perception');
 assert.equal(api.eligible(pack.feats.find(r=>r.id==='feat:skill-focus'),{id:'feat:skill-focus',choice:'skill:perception'},api.derive(c,pack).ctx,api.indexPack(pack),'feats'),false);
 c.skillCheckSources={'skill:perception':'skill:use-the-force'};let s=perception(c);assert.equal(s.checkSource,'skill:use-the-force');assert(s.total>native.total);assert.deepEqual(s.rerollApplications,['sense-deception','sense-influence']);assert.match(s.breakdown,/Sense Deception, Sense Influence/);assert(!/Notice Targets/.test(s.breakdown));
 api.validateCharacter(c,pack);const saved=JSON.parse(JSON.stringify(c));assert.deepEqual(perception(saved),s);
 c.forceTraditions=[];s=perception(c);assert.equal(s.checkSource,'skill:perception');assert.equal(s.total,native.total);assert.equal(s.carryRerolls,false);
});
test('combined Force Perception has one replacement option and retains broader permission in either acquisition order',()=>{
 const c=f.shasa(true);c.skillCheckSources={'skill:perception':'skill:use-the-force'};
 for(let n=0;n<2;n++){
  const s=perception(c);assert.equal(s.checkSources.filter(r=>r.id==='skill:use-the-force').length,1);assert.deepEqual(new Set(s.rerollApplications),new Set(['avoid-surprise','notice-targets','sense-deception','sense-influence']));
  [c.levels[2].talent,c.levels[4].talent]=[c.levels[4].talent,c.levels[2].talent];
 }
 c.levels[4].talent={id:'talent:improved-initiative'};assert.equal(perception(c).trained,false);assert.deepEqual(perception(c).rerollApplications,['sense-deception','sense-influence']);
 c.levels[2].talent={id:'talent:improved-initiative'};assert.equal(perception(c).checkSource,'skill:perception');
});
test('actual Acute Senses reroll carries only two applications, consumes once and retains its keep policy',()=>{
 const c=f.shasa();c.skillCheckSources={'skill:perception':'skill:use-the-force'};const d=api.derive(c,pack),s=perception(c),rows=skillRerollSources(s,resolveSpecies(c,pack),d),source=rows.find(r=>r.talentId==='talent:acute-senses');
 assert(source);assert.deepEqual(source.applications,['sense-deception','sense-influence']);assert.equal(source.keep,'new');
 const ticket={roll:{value:20},applications:null,allowed:new Set([source.id]),used:new Set()};assert.equal(useSkillReroll(ticket,source,{value:2}).kept,2);assert.throws(()=>useSkillReroll(ticket,source,{value:10}),/unavailable/);
 assert.equal(compatibleReroll({...ticket,applications:['notice-targets']},source),false);
 const species={id:'species:test',name:'Test',skillRerolls:[{skill:s.id,when:'keenSmell',keep:'new'}]};assert.equal(skillRerollSources(s,species,d).filter(r=>r.kind==='species').length,0);
 const logs=[],values=[20,2],checks=createSpeciesChecks({current:()=>c,derived:()=>api.derive(c,pack),log:(...v)=>logs.push(v)},()=>({value:values.shift(),display:'test',coeffs:[1]}));
 checks.click({dataset:{skillRoll:s.id}},resolveSpecies(c,pack));checks.click({dataset:{talentReroll:'talent:acute-senses',rerollSkill:s.id}},resolveSpecies(c,pack));assert.match(logs.at(-1)[1],/kept 2/);const count=logs.length;checks.click({dataset:{talentReroll:'talent:acute-senses',rerollSkill:s.id}},resolveSpecies(c,pack));assert.equal(logs.length,count);
});
test('all three ally/threshold declarations add independently and never leak to area attacks',()=>{
 const c=f.mercenary(),base=api.derive(c,pack);for(const [flag,bonus]of [['damagedYourAlly',2],['damagedByAlly',2],['exceededThreshold',2]]){
  c.attackTarget={[flag]:true};for(const a of api.derive(c,pack).attacks){const b=base.attacks.find(x=>x.uid===a.uid);assert.equal(a.damageDisplay,b.damageDisplay+(a.areaType?'':'+'+bonus));}
 }
 c.attackTarget={damagedYourAlly:true,damagedByAlly:true,exceededThreshold:true};const saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);for(const a of api.derive(saved,pack).attacks){const b=base.attacks.find(x=>x.uid===a.uid);assert.equal(a.damageDisplay,b.damageDisplay+(a.areaType?'':'+6'));}
 c.levels[4].talent={id:'talent:armored-defense'};for(const a of api.derive(c,pack).attacks){const b=base.attacks.find(x=>x.uid===a.uid);assert.equal(a.damageDisplay,b.damageDisplay+(a.areaType?'':'+4'));}
});
test('real Psychic Citadel and Resist the Dark Side use the highest Force bonus',async()=>{
 const {default:makeClass}=await import('../tools/class-defense-fixtures.cjs');const c=makeClass(pack,api).adept('psychic-citadel',1);
 c.levels[0].talent={id:'talent:dark-side-sense'};c.levels[2].talent={id:'talent:resist-the-dark-side'};c.levels[6].talent={id:'talent:equilibrium'};
 const row=(talent=null)=>({classId:'class:jedi',hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 const eighth=row();eighth.feats=[{id:'feat:skill-focus',choice:'skill:perception'}];eighth.abilityIncreases=['dex','wis'];const ninth=row('force-perception');ninth.feats=[{id:'feat:improved-defenses'}];c.levels[7].abilityIncreases=[];c.levels.splice(7,0,eighth,ninth);api.validateCharacter(c,pack);const d=api.derive(c,pack);assert.deepEqual(d.issues,[]);
 const will=d.conditionalDefenses.find(r=>r.defense==='will'&&r.against==='dark-side-powers');assert.equal(will.total,d.defenses.will+4,'+5 replaces existing +1 Psychic Citadel');
});
test('closed metadata rejects removing carryover, widening scope or granting ordinary training',()=>{
 for(const edit of [e=>e.grantsTraining=true,e=>e.when='perceptionApplications',e=>delete e.carryRerolls]){const p=structuredClone(pack);edit(p.talents.find(t=>t.id==='talent:deception-awareness').effects[1]);assert.throws(()=>validatePack(p));}
});
