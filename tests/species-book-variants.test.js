import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,progression,prerequisite,indexPack,validateCharacter} from '../src/rules.js';
import {choosePlannedClass,resizeLevelPlan} from '../src/level-plan.js';
import {featureGraph} from '../src/feature-trees.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const species=(name,book)=>pack.species.find(r=>r.name===name+' ('+book+')');
function hero(name,book,cls='scout'){const c=newCharacter(pack,{classId:'class:'+cls});c.species=species(name,book).id;c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};return c;}
const pairs={Bith:['Galaxy of Intrigue','Threats of the Galaxy'],'Chadra-Fan':['Unknown Regions Campaign Guide','Legacy Era Campaign Guide'],Dug:['Clone Wars Campaign Guide','Web Enhancements'],Geonosian:['Clone Wars Campaign Guide','Web Enhancements'],Jawa:['Scum and Villainy','Web Enhancements'],Kaminoan:['Clone Wars Campaign Guide','Web Enhancements'],Krevaaki:['Unknown Regions Campaign Guide','Jedi Academy Training Manual'],Noghri:['Force Unleashed Campaign Guide','Web Enhancements'],Umbaran:['Galaxy of Intrigue','Clone Wars Campaign Guide'],Zeltron:['Legacy Era Campaign Guide','Web Enhancements']};
test('each book version has its own selection, exact source section and one isolated trait set',()=>{
 for(const [name,books]of Object.entries(pairs))for(const book of books){
  const r=species(name,book),source=pack.sources.find(s=>s.id===r.sourceId),text=articleText(r.article);assert(r,name+' '+book);
  assert.equal(r.bookVariant,book);assert.equal(source.title,name);assert.equal(source.section,book);assert.equal(r.article.sourceId,r.sourceId);assert.equal((text.match(/Ability Modifiers:/g)||[]).length,1,name+' '+book);
  assert(text.includes('Characteristics'));assert(text.includes('Species Traits'));assert.equal(r.automation,'partial');
  const catalog=pack.catalog.records.find(c=>c.kind==='species'&&c.mechanicsIds.includes(r.id));assert.deepEqual(catalog.books,[book]);assert.equal(catalog.status,'available');
  const c=hero(name,book);validateCharacter(c,pack);assert(prerequisite({kind:'species',value:name},derive(c,pack).ctx,ix));
 }
 const intrigue=articleText(species('Bith','Galaxy of Intrigue').article),threats=articleText(species('Bith','Threats of the Galaxy').article);assert(intrigue.includes('temporary Force Point'));assert(!intrigue.includes('natural 20'));assert(threats.includes('natural 20'));assert(!threats.includes('temporary Force Point'));
});
test('conflicting book modifiers, movement, defenses, languages and feats never merge',()=>{
 assert.deepEqual(species('Bith','Galaxy of Intrigue').abilityAdjustments,{int:2,cha:2,con:-2});assert.deepEqual(species('Bith','Threats of the Galaxy').abilityAdjustments,{int:2,con:-2});
 assert.equal(derive(hero('Dug','Clone Wars Campaign Guide'),pack).speed,6);assert.equal(derive(hero('Dug','Web Enhancements'),pack).speed,4);assert.equal(species('Dug','Web Enhancements').defenses.reflex,2);assert.deepEqual(species('Dug','Clone Wars Campaign Guide').take10Skills,['skill:climb','skill:jump']);assert.equal(species('Dug','Web Enhancements').take10Skills,undefined);
 const cw=derive(hero('Geonosian','Clone Wars Campaign Guide'),pack),web=derive(hero('Geonosian','Web Enhancements'),pack);assert.deepEqual(cw.speeds,{fly:6,climb:3});assert.deepEqual(web.speeds,{fly:8});assert(!cw.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-advanced-melee-weapons'));assert(web.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-advanced-melee-weapons'));assert.deepEqual(species('Geonosian','Web Enhancements').languages,['Geonosian']);
 assert.equal(species('Jawa','Scum and Villainy').abilityAdjustments.cha,undefined);assert.equal(species('Jawa','Web Enhancements').abilityAdjustments.cha,-2);
 assert.equal(species('Kaminoan','Clone Wars Campaign Guide').abilityAdjustments.int,2);assert.equal(species('Kaminoan','Web Enhancements').abilityAdjustments.con,2);
 assert.equal(species('Zeltron','Legacy Era Campaign Guide').abilityAdjustments.cha,2);assert.equal(species('Zeltron','Web Enhancements').abilityAdjustments.cha,4);
});
test('Noghri first-level bonus uses real prerequisites, grants no slot and cannot arrive from a later increase',()=>{
 const c=hero('Noghri','Force Unleashed Campaign Guide');let d=derive(c,pack);assert(!d.ctx.feats.some(f=>f.id==='feat:running-attack'));assert.equal(d.scores.dex,12);
 resizeLevelPlan(c,pack,4);for(let i=1;i<4;i++)choosePlannedClass(c,pack,i,'class:scout');c.levels[3].abilityIncreases=['dex','str'];d=derive(c,pack);assert.equal(d.scores.dex,13);assert(!d.ctx.feats.some(f=>f.id==='feat:running-attack'));
 c.abilities.dex=11;d=derive(c,pack);const grant=d.ctx.feats.filter(f=>f.id==='feat:running-attack');assert.equal(grant.length,1);assert.equal(grant[0].level,1);assert(grant[0].automatic);assert.equal(d.rows[0].slots.filter(s=>s.kind==='general').length,1);
 c.levels[0].feats=[{id:'feat:running-attack'}];d=derive(c,pack);assert.equal(d.ctx.feats.filter(f=>f.id==='feat:running-attack').length,1);assert(d.issues.some(t=>t.includes('Running Attack is not eligible')));
 c.levels[0].feats=[];c.species=species('Noghri','Web Enhancements').id;d=derive(c,pack);assert(!d.ctx.feats.some(f=>f.id==='feat:running-attack'));assert(d.ctx.feats.some(f=>f.id==='feat:martial-arts-i'&&f.automatic));
 const fixture=structuredClone(pack);fixture.species.find(r=>r.id===species('Noghri','Force Unleashed Campaign Guide').id).conditionalStartingFeats=['feat:force-sensitivity'];const sensitive=hero('Noghri','Force Unleashed Campaign Guide','soldier');sensitive.trainedSkills=['skill:use-the-force'];assert(derive(sensitive,fixture).ctx.trained.has('skill:use-the-force'));
 const pending=newCharacter(pack);pending.species=species('Noghri','Force Unleashed Campaign Guide').id;pending.abilities.dex=11;assert(!derive(pending,pack).ctx.feats.some(f=>f.id==='feat:running-attack'));choosePlannedClass(pending,pack,0,'class:scout');assert(derive(pending,pack).ctx.feats.some(f=>f.id==='feat:running-attack'));
});
test('conditional Focus remains book-specific and never becomes an unconditional bonus',()=>{
 for(const [book,skill]of [['Galaxy of Intrigue','gather-information'],['Clone Wars Campaign Guide','persuasion']]){const c=hero('Umbaran',book,'noble');assert(!derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'));c.trainedSkills=['skill:gather-information','skill:persuasion'];const focus=derive(c,pack).ctx.feats.filter(f=>f.id==='feat:skill-focus');assert.equal(focus.length,1);assert.equal(focus[0].choice,'skill:'+skill);}
 const c=hero('Krevaaki','Unknown Regions Campaign Guide');c.trainedSkills=['skill:climb'];assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'));c.species=species('Krevaaki','Jedi Academy Training Manual').id;assert(!derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'));
});
test('species prerequisite popups prefer the possessed book and otherwise retain all versions',()=>{
 const fixture=structuredClone(pack);fixture.feats.push({...fixture.feats.find(f=>f.id==='feat:running-attack'),id:'feat:book-fixture',name:'Book fixture',prerequisite:{kind:'species',value:'Bith'}});
 const model=c=>featureGraph(fixture,{type:'feats',allowedIds:['feat:book-fixture'],ctx:progression(c,fixture).ctx}),condition=m=>[...m.nodes.values()].find(n=>!n.main&&n.name==='Bith');
 const c=hero('Bith','Threats of the Galaxy');assert.deepEqual(condition(model(c)).records.map(r=>r.name),['Bith (Threats of the Galaxy)']);c.species='species:human';assert.deepEqual(condition(model(c)).records.map(r=>r.name).sort(),Object.values(pairs.Bith).map(book=>'Bith ('+book+')').sort());
});
test('conditional first-level grants reject unknown, parameterized, manual or immediate-effect feats',()=>{
 for(const value of [['feat:missing'],['feat:running-attack','feat:running-attack'],['feat:skill-focus'],['feat:force-training'],'feat:running-attack',false,null,0]){const p=structuredClone(pack);p.species.find(r=>r.id===species('Noghri','Force Unleashed Campaign Guide').id).conditionalStartingFeats=value;assert.throws(()=>validatePack(p));}
 const repeat=structuredClone(pack);repeat.feats.find(r=>r.id==='feat:running-attack').repeat='stack';assert.throws(()=>validatePack(repeat),/Unsupported conditional starting feat/);
 const p=structuredClone(pack);p.feats.find(r=>r.id==='feat:running-attack').manualPrerequisites=['Fixture requirement'];assert.throws(()=>validatePack(p),/Unsupported conditional starting feat/);
});
