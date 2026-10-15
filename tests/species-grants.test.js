import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,classSkills,validateCharacter,eligible} from '../src/rules.js';
import {chooseSpeciesOption,speciesChoiceDetails} from '../src/species-choices.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const hero=(id,cls='soldier')=>{const c=newCharacter(pack,{classId:'class:'+cls});c.species='species:'+id;c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};return c;};
const details=(c,d,p=pack)=>speciesChoiceDetails(c,p,d.ctx,d.rows[0]?.ctx||d.ctx);
const has=(d,id)=>d.ctx.feats.some(f=>f.id==='feat:'+id);

test('Mrlssi bonus Knowledge training is independent of the class list and ordinary skill pool',()=>{
 const c=hero('mrlssi');assert(derive(c,pack).issues.includes('Choose Mrlssi Knowledge Field'));
 chooseSpeciesOption(c,pack,'knowledge','knowledge-life-sciences');c.trainedSkills=['skill:endurance','skill:mechanics','skill:initiative','skill:perception'];const d=derive(c,pack);
 assert.equal(d.ctx.trained.size,5);assert.deepEqual([...d.ctx.speciesTraining],['skill:knowledge-life-sciences']);assert(!classSkills(d.ctx,ix).has('skill:knowledge-life-sciences'));assert(d.skills.find(s=>s.id==='skill:knowledge-life-sciences').trained);assert(!d.issues.some(t=>/starting trained skills|Knowledge Field/.test(t)));assert.equal(d.rows[0].slots.filter(s=>s.kind==='general').length,1);assert(!has(d,'skill-training'));
 assert(eligible(ix.feats.get('feat:skill-focus'),{id:'feat:skill-focus',choice:'skill:knowledge-life-sciences'},d.ctx,ix,'feats'));assert(renderStatBlock(c,d,pack).includes('Knowledge (Life Sciences)'));
});

test('duplicate training choices remain editable and invalid until the species or ordinary pick changes',()=>{
 const c=hero('mrlssi');c.trainedSkills=['skill:knowledge-tactics','skill:mechanics','skill:initiative','skill:perception'];chooseSpeciesOption(c,pack,'knowledge','knowledge-tactics');let d=derive(c,pack);
 assert.equal(d.ctx.trained.size,4);assert(d.issues.includes('Level 1: Knowledge (Tactics) is already trained by Mrlssi'));assert(c.trainedSkills.includes('skill:knowledge-tactics'));
 chooseSpeciesOption(c,pack,'knowledge','knowledge-life-sciences');d=derive(c,pack);assert.equal(d.ctx.trained.size,5);assert(!d.issues.some(t=>t.includes('already trained')));
 c.species='species:human';d=derive(c,pack);assert(!d.ctx.trained.has('skill:knowledge-life-sciences'));assert.equal(d.ctx.speciesTraining.size,0);assert(d.ctx.trained.has('skill:knowledge-tactics'));
 c.species='species:mrlssi';assert(derive(c,pack).ctx.trained.has('skill:knowledge-life-sciences'));chooseSpeciesOption(c,pack,'knowledge',null);assert(!derive(c,pack).ctx.trained.has('skill:knowledge-life-sciences'));validateCharacter(c,pack);
});

test('Mrlssi class-skill access and conditional Focus replay independently from free training',()=>{
 const c=hero('mrlssi','noble');chooseSpeciesOption(c,pack,'knowledge','knowledge-life-sciences');c.trainedSkills=['skill:mechanics','skill:persuasion'];let d=derive(c,pack);assert(classSkills(d.ctx,ix).has('skill:mechanics'));assert(d.ctx.trained.has('skill:mechanics'));assert(d.ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:persuasion'&&f.automatic));
 c.trainedSkills=[];choosePlannedClass(c,pack,0,'class:scout');d=derive(c,pack);assert(d.ctx.trained.has('skill:knowledge-life-sciences'));assert(!has(d,'skill-focus'));assert.equal(d.ctx.speciesTraining.size,1);
 const pending=newCharacter(pack);pending.species='species:mrlssi';chooseSpeciesOption(pending,pack,'knowledge','knowledge-life-sciences');assert.equal(derive(pending,pack).ctx.trained.size,0);choosePlannedClass(pending,pack,0,'class:soldier');assert(derive(pending,pack).ctx.trained.has('skill:knowledge-life-sciences'));
});

test('Tof chooses one first-level bonus Feat without consuming a Heroic slot and only gets Mighty Swing when eligible',()=>{
 const c=hero('tof');c.abilities.str=11;let d=derive(c,pack);assert(d.issues.includes('Choose Tof Bonus Feat'));assert(has(d,'mighty-swing'));
 chooseSpeciesOption(c,pack,'feat','rapid-shot');d=derive(c,pack);assert(has(d,'rapid-shot'));assert(!has(d,'rapid-strike'));assert.equal(d.rows[0].slots.filter(s=>s.kind==='general').length,1);assert(d.ctx.feats.find(f=>f.id==='feat:rapid-shot').automatic);assert.equal(details(c,d)[0].issue,null);
 chooseSpeciesOption(c,pack,'feat','rapid-strike');d=derive(c,pack);assert(!has(d,'rapid-shot'));assert(has(d,'rapid-strike'));c.levels[0].feats=[{id:'feat:rapid-strike'}];d=derive(c,pack);assert.equal(d.ctx.feats.filter(f=>f.id==='feat:rapid-strike').length,1);assert(d.issues.some(t=>t.includes('Rapid Strike is not eligible')));
 c.levels[0].feats=[];c.abilities.str=10;assert(!has(derive(c,pack),'mighty-swing'));validateCharacter(c,pack);
});

test('later BAB and ability increases cannot qualify a Tof first-level grant retroactively',()=>{
 const c=hero('tof','noble');chooseSpeciesOption(c,pack,'feat','rapid-shot');resizeLevelPlan(c,pack,4);for(let i=1;i<4;i++)choosePlannedClass(c,pack,i,'class:soldier');c.levels[3].abilityIncreases=['str','dex'];let d=derive(c,pack);
 assert.equal(d.scores.str,13);assert.equal(d.bab,3);assert(!has(d,'rapid-shot'));assert(!has(d,'mighty-swing'));assert(details(c,d)[0].options.every(o=>!o.available));assert.equal(details(c,d)[0].active,false);
 choosePlannedClass(c,pack,0,'class:soldier');d=derive(c,pack);assert(has(d,'rapid-shot'));assert(!has(d,'mighty-swing'));c.abilities.str=11;d=derive(c,pack);assert(has(d,'mighty-swing'));assert.equal(d.ctx.feats.find(f=>f.id==='feat:mighty-swing').level,1);
 const r=ix.species.get(c.species);assert.equal(r.size,'large');assert.equal(d.speed,6);assert.equal(r.defenses.will,undefined,'Fearless is conditional, not permanent Will');
});

test('separate species grant groups cannot select the same skill or feat twice',()=>{
 for(const [id,group,choice]of [['mrlssi','knowledge','knowledge-life-sciences'],['tof','feat','rapid-shot']]){
  const p=structuredClone(pack),r=p.species.find(r=>r.id==='species:'+id);r.creationChoices.push({...structuredClone(r.creationChoices[0]),id:'second'});const c=hero(id);chooseSpeciesOption(c,p,group,choice);chooseSpeciesOption(c,p,'second',choice);const d=derive(c,p),choices=details(c,d,p);assert(choices.every(g=>g.issue));assert.equal(id==='mrlssi'?d.ctx.speciesTraining.size:d.ctx.feats.filter(f=>f.id==='feat:rapid-shot').length,0);
 }
});

test('grant data rejects unsupported Feats, unknown skills, malformed fields and forged selections',()=>{
 for(const featId of ['feat:missing','feat:skill-focus','feat:force-training']){const p=structuredClone(pack);p.species.find(r=>r.id==='species:tof').creationChoices[0].options[0].featId=featId;assert.throws(()=>validatePack(p));}
 for(const value of [null,false,['skill:missing'],['skill:mechanics','skill:mechanics']]){const p=structuredClone(pack);p.species.find(r=>r.id==='species:mrlssi').startingTrainedSkills=value;assert.throws(()=>validatePack(p));}
 const p=structuredClone(pack);p.species.find(r=>r.id==='species:mrlssi').creationChoices[0].options[0].skillId='skill:missing';assert.throws(()=>validatePack(p));
 for(const [species,state]of [['tof',{feat:'missing'}],['mrlssi',{knowledge:'missing'}]]){const c=hero(species);c.speciesChoices={[c.species]:state};assert.throws(()=>validateCharacter(c,pack));}
});
