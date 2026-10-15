import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,eligible,indexPack} from '../src/rules.js';
import {resolveSpecies,chooseSpeciesOption,speciesChoiceDetails} from '../src/species-choices.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const hero=id=>{const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:'+id;c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};return c;};
const focuses=d=>d.ctx.feats.filter(f=>f.id==='feat:skill-focus');

test('Devaronian profiles change scores, prerequisites and training without modifying the generated base or narrative Gender',()=>{
 const c=hero('devaronian');c.abilities.dex=11;c.heroicTraits.gender='Custom';const base=structuredClone(c.abilities),species=structuredClone(ix.species.get(c.species));
 assert(derive(c,pack).issues.includes('Choose Devaronian Sex'));assert.deepEqual(resolveSpecies(c,pack).abilityAdjustments,{});
 chooseSpeciesOption(c,pack,'profile','male');let d=derive(c,pack);assert.deepEqual(d.scores,{str:10,dex:13,con:10,int:10,wis:8,cha:8});assert(eligible(ix.feats.get('feat:dodge'),{id:'feat:dodge'},d.ctx,ix,'feats'));assert(!d.issues.includes('Choose Devaronian Sex'));
 chooseSpeciesOption(c,pack,'profile','female');d=derive(c,pack);assert.deepEqual(d.scores,{str:10,dex:9,con:10,int:12,wis:12,cha:10});assert(!eligible(ix.feats.get('feat:dodge'),{id:'feat:dodge'},d.ctx,ix,'feats'));assert(d.issues.some(t=>t.includes('choose 4 starting trained skills')));assert.equal(c.heroicTraits.gender,'Custom');assert.deepEqual(c.abilities,base);assert.deepEqual(ix.species.get(c.species),species);
 chooseSpeciesOption(c,pack,'profile',null);assert(derive(c,pack).issues.includes('Choose Devaronian Sex'));validateCharacter(c,pack);
});

test('Offshoot chooses exactly one physical bonus and one Focus in a trained offered skill without spending a slot',()=>{
 const c=hero('arkanian-offshoot');let d=derive(c,pack);assert.equal(d.scores.con,8);assert(d.issues.includes('Choose Arkanian Offshoot Ability Modifier'));assert(!speciesChoiceDetails(c,pack,d.ctx).find(g=>g.id==='focus').active);
 chooseSpeciesOption(c,pack,'ability','str');d=derive(c,pack);assert.equal(d.scores.str,12);assert.equal(d.scores.dex,10);
 chooseSpeciesOption(c,pack,'ability','dex');d=derive(c,pack);assert.equal(d.scores.str,10);assert.equal(d.scores.dex,12);
 c.trainedSkills=['skill:mechanics','skill:endurance'];d=derive(c,pack);assert(d.issues.includes('Choose Arkanian Offshoot Skill Focus'));assert.equal(focuses(d).length,0);
 chooseSpeciesOption(c,pack,'focus','mechanics');d=derive(c,pack);assert.equal(focuses(d).length,1);assert.equal(focuses(d)[0].choice,'skill:mechanics');assert(focuses(d)[0].automatic);assert.equal(d.rows[0].slots.filter(s=>s.kind==='general').length,1);assert.equal(d.skills.find(s=>s.id==='skill:mechanics').total,10);
 c.trainedSkills=['skill:endurance'];d=derive(c,pack);assert.equal(focuses(d).length,0);assert(d.issues.includes('Choose Arkanian Offshoot Skill Focus'));assert.equal(c.speciesChoices[c.species].focus,'mechanics');
 c.trainedSkills.push('skill:mechanics');assert.equal(focuses(derive(c,pack)).length,1);
});

test('Vultan Focus is limited to one trained Knowledge field and its bonus training remains a class-skill slot',()=>{
 const c=hero('vultan'),r=resolveSpecies(c,pack);assert.equal(r.bonusSkills,1);assert.equal(r.creationChoices[0].options.length,7);
 chooseSpeciesOption(c,pack,'focus','knowledge-life-sciences');c.trainedSkills=['skill:knowledge-tactics'];let d=derive(c,pack);assert.equal(focuses(d).length,0);assert(d.issues.includes('Choose Vultan Skill Focus'));assert(d.issues.some(t=>t.includes('choose 5 starting trained skills')));
 c.trainedSkills=['skill:knowledge-life-sciences'];d=derive(c,pack);assert.equal(focuses(d).length,0,'Life Sciences is not a Soldier class skill, so an invalid training pick cannot grant Focus');
 choosePlannedClass(c,pack,0,'class:noble');d=derive(c,pack);assert.equal(focuses(d).length,1);assert.equal(focuses(d)[0].choice,'skill:knowledge-life-sciences');assert.deepEqual([...d.ctx.trained],['skill:knowledge-life-sciences']);
});

test('Nikto language is exclusive, printed and preserved independently when species switch or choices clear',()=>{
 const c=hero('nikto');assert.deepEqual(resolveSpecies(c,pack).languages,['Nikto']);assert(derive(c,pack).issues.includes('Choose Nikto Language'));
 chooseSpeciesOption(c,pack,'language','basic');assert.deepEqual(resolveSpecies(c,pack).languages,['Nikto','Basic']);chooseSpeciesOption(c,pack,'language','huttese');assert.deepEqual(resolveSpecies(c,pack).languages,['Nikto','Huttese']);assert(renderStatBlock(c,derive(c,pack),pack).includes('<b>Languages:</b> Nikto, Huttese'));
 c.species='species:devaronian';chooseSpeciesOption(c,pack,'profile','female');c.species='species:nikto';assert.deepEqual(resolveSpecies(c,pack).languages,['Nikto','Huttese']);validateCharacter(c,pack);
 chooseSpeciesOption(c,pack,'language',null);assert.deepEqual(resolveSpecies(c,pack).languages,['Nikto']);assert.equal(derive(c,pack).defenses.fortitude,15);assert.equal(resolveSpecies(c,pack).naturalArmor,2);
});

test('later training activates a saved Focus choice at the earned level and earlier edits replay it',()=>{
 const c=hero('arkanian-offshoot');chooseSpeciesOption(c,pack,'ability','str');chooseSpeciesOption(c,pack,'focus','mechanics');resizeLevelPlan(c,pack,3);for(let i=1;i<3;i++)choosePlannedClass(c,pack,i,'class:soldier');c.levels[2].feats=[{id:'feat:skill-training',choice:'skill:mechanics'}];
 let d=derive(c,pack);assert.equal(focuses(d).length,1);assert.equal(focuses(d)[0].level,3);assert.equal(d.rows[0].ctx.feats.filter(f=>f.id==='feat:skill-focus').length,0);
 c.levels[2].feats=[];assert.equal(focuses(derive(c,pack)).length,0);c.trainedSkills=['skill:mechanics'];assert.equal(focuses(derive(c,pack))[0].level,1);
 const copy=JSON.parse(JSON.stringify(c));validateCharacter(copy,pack);assert.deepEqual(derive(copy,pack).scores,derive(c,pack).scores);assert.equal(focuses(derive(copy,pack)).length,1);
});

test('species choices reject forged state, unknown options and unsupported data fields',()=>{
 const c=hero('nikto');for(const state of [null,[],false,{'species:missing':{}},{'species:nikto':[]},{'species:nikto':{language:'other'}},{'species:nikto':{language:1}},{'species:nikto':{unknown:null}},{'species:human':{language:'basic'}}])assert.throws(()=>validateCharacter({...c,speciesChoices:state},pack));
 assert.throws(()=>chooseSpeciesOption(c,pack,'missing','basic'));assert.throws(()=>chooseSpeciesOption(c,pack,'language','missing'));assert.equal(c.speciesChoices,undefined);
 for(const mutate of [g=>delete g.id,g=>g.kind='patch',g=>g.options[0].language=5,g=>g.options[0].extra=true,g=>g.options[1].id=g.options[0].id,g=>g.options=[]]){const p=structuredClone(pack);mutate(p.species.find(r=>r.id==='species:nikto').creationChoices[0]);assert.throws(()=>validatePack(p));}
 for(const adjustments of [{},{bad:2},{str:0},{str:11},[],null]){const p=structuredClone(pack);p.species.find(r=>r.id==='species:devaronian').creationChoices[0].options[0].adjustments=adjustments;assert.throws(()=>validatePack(p));}
 const p=structuredClone(pack);p.species.find(r=>r.id==='species:vultan').creationChoices[0].options[0].skillId='skill:missing';assert.throws(()=>validatePack(p));
 for(const id of ['arkanian-offshoot','devaronian','nikto','vultan']){const r=ix.species.get('species:'+id);assert(articleText(r.article).includes('Species Traits'));assert.equal(r.automation,'partial');}
});
