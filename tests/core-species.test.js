import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter, derive, validateCharacter, ABILITIES} from '../src/rules.js';
import {activeBackground, emptyStory} from '../src/heroic-traits.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const skill=(d,id)=>d.skills.find(s=>s.id==='skill:'+id);
function hero(species,cls='soldier'){
 const c=newCharacter(pack);c.species='species:'+species;c.abilityMethod='manual';
 c.abilities=Object.fromEntries(ABILITIES.map(a=>[a,10]));c.levels[0].classId='class:'+cls;
 return c;
}
function level(c,cls,extra={}){c.levels.push({classId:'class:'+cls,hpRoll:6,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});}

test('reviewed species include individually selectable published variants',()=>{
 for(const name of ['aqualish','cerean','ewok','hutt','ithorian','mon-calamari','quarren','sullustan','trandoshan']){
  const c=hero(name);validateCharacter(c,pack);
  const record=pack.species.find(r=>r.id===c.species);
  assert(record.article.blocks.length);assert(pack.catalog.records.some(r=>r.kind==='species'&&r.mechanicsIds.includes(record.id)&&r.status==='available'));
 }
 for(const name of ['Neimoidian (Core Rulebook)','Neimoidian (Galaxy of Intrigue)','Yuuzhan Vong (Core Rulebook)','Yuuzhan Vong (Legacy Era Campaign Guide)'])assert.equal(pack.catalog.records.find(r=>r.name===name).status,'available');
 assert.equal(pack.species.length,23);
});

test('Ewok size affects Reflex and Stealth, Primitive only removes first-level class grants',()=>{
 const c=hero('ewok');let d=derive(c,pack);
 assert.equal(d.defenses.reflex,14);assert.equal(skill(d,'stealth').total,6);assert.equal(d.speed,4);
 assert(d.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-simple-weapons'));
 assert(!d.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-pistols'||f.id==='feat:weapon-proficiency-rifles'));
 c.levels[0].feats=[{id:'feat:weapon-proficiency-heavy-weapons'}];d=derive(c,pack);
 assert(d.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-heavy-weapons'&&!f.automatic));
 level(c,'scout',{startingFeat:{id:'feat:weapon-proficiency-rifles'}});
 assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:weapon-proficiency-rifles'));
 assert.deepEqual(pack.species.find(s=>s.id===c.species).languages,['Ewokese']);
});

test('Hutt size, threshold and Force resistance retain their distinct scopes',()=>{
 const c=hero('hutt');let d=derive(c,pack);
 assert.deepEqual(d.defenses,{reflex:8,fortitude:14,will:11});assert.equal(d.threshold,19);
 assert.equal(skill(d,'stealth').total,-8);assert.equal(d.speed,2);
 assert.deepEqual(d.conditionalDefenses,[{defense:'will',against:'use-the-force',amount:5,type:'untyped',total:16}]);
 assert(renderStatBlock(c,d,pack).includes('11 (16 vs. Use the Force)'));
 c.condition=4;d=derive(c,pack);assert.equal(d.defenses.will,1);assert.equal(d.conditionalDefenses[0].total,6);assert.equal(d.speed,1);
});

test('Aqualish and Trandoshan Toughness scales with level and cannot be granted twice',()=>{
 for(const [species,hp] of [['aqualish',32],['trandoshan',31]]){
  const c=hero(species);let d=derive(c,pack);assert.equal(d.hp,hp);
  assert.equal(d.ctx.feats.filter(f=>f.id==='feat:toughness').length,1);
  c.levels[0].feats=[{id:'feat:toughness'}];level(c,'soldier');d=derive(c,pack);
  assert.equal(d.ctx.feats.filter(f=>f.id==='feat:toughness').length,1);
  assert(d.issues.some(i=>i.includes('Toughness is not eligible')));
  assert.equal(d.hp,species==='aqualish'?40:38);
 }
});

test('Trandoshan natural armor stacks with worn armor without replacing heroic level',()=>{
 const c=hero('trandoshan');let d=derive(c,pack);assert.equal(d.defenses.reflex,12);
 c.inventory=[{id:'equipment:stormtrooper-armor',quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];
 d=derive(c,pack);assert.equal(d.defenses.reflex,17);assert(d.breakdowns.reflex.includes('1 natural armor'));
});

test('species Skill Focus requires training, including when gained later, and remains a single competence bonus',()=>{
 for(const [species,cls,id,total] of [['cerean','soldier','initiative',9],['ewok','scout','survival',10],['ithorian','noble','knowledge-life-sciences',10],['mon-calamari','scout','perception',11],['quarren','noble','persuasion',9]]){
  const c=hero(species,cls);let d=derive(c,pack);assert.equal(skill(d,id).focus,0);
  c.trainedSkills=['skill:'+id];d=derive(c,pack);assert.equal(skill(d,id).total,total);
  assert.equal(d.ctx.feats.filter(f=>f.id==='feat:skill-focus'&&f.choice==='skill:'+id).length,1);
  c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:'+id}];d=derive(c,pack);assert.equal(skill(d,id).focus,5);
 }
 const c=hero('cerean');level(c,'soldier',{feats:[{id:'feat:skill-training',choice:'skill:initiative'}]});
 const d=derive(c,pack);assert.equal(d.ctx.feats.find(f=>f.id==='feat:skill-focus').level,2);
 assert.equal(skill(d,'initiative').total,10);
});

test('swim speeds survive derivation and stat-block copying, including condition penalties',()=>{
 for(const species of ['gungan','mon-calamari','quarren']){
  const c=hero(species);let d=derive(c,pack);assert.deepEqual(d.speeds,{swim:4});
  assert(renderStatBlock(c,d,pack).includes('6 Squares, swim 4 Squares'));
  c.condition=4;d=derive(c,pack);assert.equal(d.speed,3);assert.equal(d.speeds.swim,2);
 }
});

test('new species cannot choose their native homeworld Background but can choose another',()=>{
 for(const [species,home] of [['cerean','cerea'],['ithorian','ithor'],['mon-calamari','dac'],['quarren','dac'],['sullustan','sullust'],['trandoshan','trandosha']]){
  const c=hero(species);c.story={...emptyStory('background'),id:'background:'+home+'-origin'};
  assert.equal(activeBackground(c,pack),undefined);
  c.story.id='background:tatooine-origin';assert(activeBackground(c,pack));
 }
});

test('new weapon groups respect class bonus lists and share the full proficiency article',()=>{
 for(const cls of ['noble','scoundrel','scout','soldier']){
  const c=hero('human',cls);level(c,cls,{feats:[{id:'feat:weapon-proficiency-advanced-melee-weapons'}]});
  assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:weapon-proficiency-advanced-melee-weapons'));
 }
 for(const cls of ['jedi','noble','scoundrel','scout','soldier']){
  const c=hero('human',cls);level(c,cls,{feats:[{id:'feat:weapon-proficiency-heavy-weapons'}]});
  assert.equal(derive(c,pack).ctx.feats.some(f=>f.id==='feat:weapon-proficiency-heavy-weapons'),cls==='soldier');
 }
 const f=pack.feats.find(f=>f.id==='feat:weapon-proficiency-heavy-weapons');assert(articleText(f.article).includes('Vehicle Weapons'));
});

test('unsupported conditional defense scopes and missing Stealth size rules fail validation',()=>{
 const p=structuredClone(pack);p.species.find(s=>s.id==='species:hutt').conditionalDefenses[0].against='all-attacks';
 assert.throws(()=>validatePack(p),/Unsupported conditional defense/);
 delete p.species.find(s=>s.id==='species:hutt').conditionalDefenses;
 delete p.rules.sizeStealth.small;assert.throws(()=>validatePack(p),/Missing size modifiers/);
});
