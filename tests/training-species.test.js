import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack} from '../src/rules.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {validatePack} from '../tools/validate-rules.js';
import {articleText} from '../src/wiki-content.js';
import {featureEntries} from '../src/feature-views.js';
import {createSpeciesChecks} from '../src/species-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=(species,cls='jedi')=>{const c=newCharacter(pack,{classId:'class:'+cls});Object.assign(c,{species:'species:'+species,abilityMethod:'manual',abilities:{str:10,dex:10,con:10,int:10,wis:12,cha:10}});c.trainedSkills=[];c.levels[0].feats=[];c.levels[0].talent=null;return c;};
const powers=n=>Array.from({length:n},()=>({id:crypto.randomUUID(),powerId:pack.forcePowers[0].id,spent:false}));
const bonus=d=>d.ctx.feats.filter(f=>f.id==='feat:force-training'&&f.grantedBy==='species:miraluka');

test('O\'reenian uses both replacement rerolls and its printed automatic language',()=>{
 const c=hero('o-reenian','scout'),r=pack.species.find(r=>r.id===c.species),logs=[],rolls=[20,2,18,1],checks=createSpeciesChecks({current:()=>c,derived:()=>derive(c,pack),log:(...args)=>logs.push(args)},expr=>({value:rolls.shift(),display:expr,coeffs:[],rollId:1}));
 for(const skill of ['perception','endurance']){checks.click({dataset:{skillRoll:'skill:'+skill}},r);checks.click({dataset:{speciesReroll:'skill:'+skill}},r);}
 assert(logs[1][1].includes('kept 2'));assert(logs[3][1].includes('kept 1'));assert.deepEqual(r.languages,["O'reenian"]);assert.deepEqual(r.abilityAdjustments,{});assert.equal(derive(c,pack).speed,6);validateCharacter(c,pack);
});

test('Phindian training is a real bonus feat outside the regular skill pool, with conditional Focus',()=>{
 const c=hero('phindian','soldier');c.trainedSkills=['skill:endurance','skill:mechanics','skill:perception','skill:pilot'];const d=derive(c,pack);
 assert.equal(d.scores.int,12);assert.equal(d.scores.cha,8);assert.equal(d.ctx.speciesTraining.size,1);assert(d.ctx.speciesTraining.has('skill:knowledge-technology'));assert.equal(d.ctx.trained.size,5);
 assert(!d.issues.some(s=>s.includes('starting trained skills')));assert(d.ctx.feats.some(f=>f.id==='feat:skill-training'&&f.choice==='skill:knowledge-technology'&&f.automatic&&f.grantedBy===c.species));assert(d.ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:mechanics'));
 assert(featureEntries(c,d,pack).some(e=>e.label==='Skill Training (Knowledge (Technology))'));assert.equal(d.rows[0].slots.length,1);
 c.trainedSkills[0]='skill:knowledge-technology';assert(derive(c,pack).issues.some(s=>s.includes('already trained by Phindian')));
 c.species='species:human';const h=derive(c,pack);assert.equal(h.ctx.speciesTraining.size,0);assert(!h.ctx.feats.some(f=>f.grantedBy==='species:phindian'));validateCharacter(c,pack);
});

test('Miraluka bonus Force Training adds once, coexists with selected Training, and replays after edits',()=>{
 const c=hero('miraluka');c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=powers(4);let d=derive(c,pack);
 assert.equal(d.scores.int,12);assert.equal(d.scores.dex,8);assert.equal(bonus(d).length,1);assert.equal(bonus(d)[0].level,1);assert.equal(d.ctx.feats.filter(f=>f.id==='feat:force-training').length,2);assert.equal(d.powerSlots,4);assert.equal(d.forcePowers.length,4);assert.equal(d.rows[0].slots.length,1);assert(!d.issues.some(s=>s.includes('Force powers')));
 c.trainedSkills=[];d=derive(c,pack);assert.equal(bonus(d).length,0);assert.equal(d.powerSlots,0);assert.equal(d.forcePowers.length,0);
 c.trainedSkills=['skill:use-the-force'];c.species='species:human';d=derive(c,pack);assert.equal(bonus(d).length,0);assert.equal(d.powerSlots,2);
 c.species='species:miraluka';assert.equal(bonus(derive(c,pack)).length,1);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
});

test('Miraluka can gain its conditional Training later, including from a same-level training feat',()=>{
 const c=hero('miraluka');assert.equal(bonus(derive(c,pack)).length,0);resizeLevelPlan(c,pack,2);choosePlannedClass(c,pack,1,'class:jedi');c.levels[1].feats=[{id:'feat:skill-training',choice:'skill:use-the-force'}];c.levels[1].forcePowers=powers(2);const d=derive(c,pack);
 assert.equal(bonus(d).length,1);assert.equal(bonus(d)[0].level,2);assert.equal(d.rows[0].powerChoices,0);assert.equal(d.rows[1].powerChoices,2);assert.equal(d.forcePowers.length,2);assert(!d.issues.some(s=>s.includes('Force powers')));
 const soldier=hero('miraluka','soldier');soldier.trainedSkills=['skill:use-the-force'];soldier.levels[0].feats=[{id:'feat:force-sensitivity'}];soldier.levels[0].forcePowers=powers(2);const first=derive(soldier,pack);assert.equal(bonus(first).length,1);assert.equal(first.powerSlots,2);assert(!first.issues.some(s=>s.includes('Force powers')));
});

test('later Wisdom increases grow ordinary and bonus Training separately; late talent training gets powers this level',()=>{
 const c=hero('miraluka');c.abilities.wis=13;c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=powers(4);resizeLevelPlan(c,pack,4);for(let i=1;i<4;i++)choosePlannedClass(c,pack,i,'class:jedi');c.levels[3].abilityIncreases=['wis','str'];c.levels[3].forcePowers=powers(2);let d=derive(c,pack);assert.equal(d.powerSlots,6);assert.equal(d.rows[3].powerChoices,2);assert.equal(d.forcePowers.length,6);assert.equal(bonus(d).length,1);
 const p=structuredClone(pack),r=p.talents.find(r=>r.id==='talent:engineer-lineage');r.effects=[{target:'trainedSkill',skill:'skill:use-the-force'}];r.prerequisite={kind:'all',requirements:[]};delete r.manualPrerequisites;p.classes.find(r=>r.id==='class:jedi').talentTrees.push(r.tree);const late=hero('miraluka');late.levels[0].talent={id:r.id};late.levels[0].forcePowers=powers(2);d=derive(late,p);assert.equal(bonus(d).length,1);assert.equal(d.rows[0].powerChoices,2);assert.equal(d.forcePowers.length,2);assert(!d.issues.some(s=>s.includes('Force powers')));
});

test('training contracts reject unknown/duplicate grants and Miraluka keeps conditional Force Sight verbatim',()=>{
 for(const value of [null,false,'skill:mechanics',['skill:missing'],['skill:mechanics','skill:mechanics']]){const p=structuredClone(pack);p.species.find(r=>r.id==='species:phindian').startingTrainingFeats=value;assert.throws(()=>validatePack(p));}
 const p=structuredClone(pack);p.species.find(r=>r.id==='species:phindian').startingTrainedSkills=['skill:knowledge-technology'];assert.throws(()=>validatePack(p));
 for(const value of [null,'yes',1]){const p=structuredClone(pack);p.species.find(r=>r.id==='species:miraluka').conditionalForceTraining=value;assert.throws(()=>validatePack(p));}
 const r=indexPack(pack).species.get('species:miraluka');assert(articleText(r.article).includes('in the presence of living creatures'));assert(articleText(r.article).includes('Yuuzhan Vong'));assert(!r.vision,'Force Sight is not unconditional Darkvision');assert.equal(r.automation,'partial');
 const c=hero('miraluka','soldier');c.trainedSkills=['skill:use-the-force'];assert.equal(bonus(derive(c,pack)).length,0,'invalid training without Force Sensitivity gives no bonus');
});
