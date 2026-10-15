import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,classSkills,indexPack,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
function hero(species,cls='noble'){const c=newCharacter(pack,{classId:'class:'+cls});c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};return c;}
test('species class skills enable initial training without granting free training or extra slots',()=>{
 for(const [name,skills]of [['anzati',['stealth','survival']],['cathar',['climb','stealth']],['nosaurian',['climb']],['nyriaanan',['survival']],['shistavanen',['survival']],['yarkora',['gather-information']]]){
  const c=hero(name,'jedi');c.abilities.int=14;let d=derive(c,pack);assert(skills.every(id=>classSkills(d.ctx,ix).has('skill:'+id)));assert.equal(d.ctx.trained.size,0);
  c.trainedSkills=skills.map(id=>'skill:'+id);d=derive(c,pack);assert(skills.every(id=>d.ctx.trained.has('skill:'+id)));validateCharacter(c,pack);
  const record=ix.species.get(c.species);assert.equal(record.bonusSkills,0);assert.equal(record.automation,'partial');assert(articleText(record.article).includes('Class Skill'));
 }
});
test('species access works with Skill Training, persists across classes and replays after a species change',()=>{
 const c=hero('anzati');c.levels[0].feats=[{id:'feat:skill-training',choice:'skill:stealth'}];let d=derive(c,pack);
 assert(d.ctx.feats.some(f=>f.id==='feat:skill-training'));assert(d.ctx.trained.has('skill:stealth'));
 c.levels.push({classId:'class:soldier',hpRoll:5,feats:[],talent:null,startingFeat:{id:'feat:armor-proficiency-light'},abilityIncreases:[],trainedSkills:[]});
 d=derive(c,pack);assert(d.ctx.trained.has('skill:stealth'));assert(classSkills(d.ctx,ix).has('skill:survival'));
 c.species='species:human';d=derive(c,pack);assert(!d.ctx.trained.has('skill:stealth'));assert(!d.ctx.feats.some(f=>f.id==='feat:skill-training'));assert(d.issues.some(t=>t.includes('Skill Training is not eligible')));
 c.species='species:anzati';assert(derive(c,pack).ctx.trained.has('skill:stealth'));
});
test('reviewed species scores, speed, language and training-dependent grants retain their source scopes',()=>{
 const cathar=derive(hero('cathar'),pack);assert.equal(cathar.speed,8);assert.equal(cathar.scores.dex,12);assert.equal(cathar.scores.int,8);
 const c=hero('shistavanen');let d=derive(c,pack);assert(!d.ctx.feats.some(f=>f.id==='feat:skill-focus'));c.trainedSkills=['skill:perception'];d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:perception'&&f.automatic));assert.equal(d.scores.int,8);assert.equal(d.vision,'low-light');
 const n=hero('nyriaanan');assert.equal(derive(n,pack).rows[0].slots.filter(s=>s.kind==='general').length,2);assert.deepEqual(ix.species.get(n.species).languages,['Nyriaanan']);
 assert(articleText(ix.species.get('species:anzati').article).includes('Soup Drinking'));assert(articleText(ix.species.get('species:yarkora').article).includes('Confusion'));
});
test('species class-skill data rejects unknown skills, duplicates and nonlists',()=>{
 for(const value of [['skill:invented'],['skill:stealth','skill:stealth'],'skill:stealth']){const p=structuredClone(pack);p.species.find(r=>r.id==='species:anzati').bonusClassSkills=value;assert.throws(()=>validatePack(p));}
});
