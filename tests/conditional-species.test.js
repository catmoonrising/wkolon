import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack} from '../src/rules.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const hero=(id,cls='soldier')=>{const c=newCharacter(pack,{classId:'class:'+cls});c.species='species:'+id;c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};return c;};
const grant=(d,id)=>d.ctx.feats.filter(f=>f.id==='feat:'+id);
const levels=(c,count,id='class:soldier')=>{resizeLevelPlan(c,pack,count);for(let i=1;i<count;i++)choosePlannedClass(c,pack,i,id);};

test('Codru-Ji gains Dual Weapon Mastery at the level that both Dexterity and BAB qualify',()=>{
 const c=hero('codru-ji','scoundrel');c.abilities.dex=13;let d=derive(c,pack);assert.equal(d.bab,0);assert.equal(grant(d,'dual-weapon-mastery-i').length,0);levels(c,2);d=derive(c,pack);assert.equal(grant(d,'dual-weapon-mastery-i').length,1);assert.equal(grant(d,'dual-weapon-mastery-i')[0].level,2);assert(grant(d,'dual-weapon-mastery-i')[0].automatic);
 c.abilities.dex=12;levels(c,4);c.levels[3].abilityIncreases=['dex','str'];d=derive(c,pack);assert.equal(grant(d,'dual-weapon-mastery-i')[0].level,4);assert.equal(d.rows[2].ctx.feats.filter(f=>f.id==='feat:dual-weapon-mastery-i').length,0);
 c.levels[3].abilityIncreases=['int','str'];assert.equal(grant(derive(c,pack),'dual-weapon-mastery-i').length,0);validateCharacter(c,pack);
});

test('Gran receives Precise Shot after a starting or later Point-Blank Shot, without an extra selection slot',()=>{
 const starting=hero('gran','scoundrel');let d=derive(starting,pack);assert.equal(grant(d,'precise-shot')[0].level,1);assert.equal(d.rows[0].slots.length,1);assert.equal(d.vision,'darkvision');
 const c=hero('gran');levels(c,3);assert.equal(grant(derive(c,pack),'precise-shot').length,0);c.levels[2].feats=[{id:'feat:point-blank-shot'}];d=derive(c,pack);assert.equal(grant(d,'precise-shot')[0].level,3);assert.equal(d.rows[1].ctx.feats.filter(f=>f.id==='feat:precise-shot').length,0);
 c.levels[2].feats=[];assert.equal(grant(derive(c,pack),'precise-shot').length,0);c.levels[0].feats=[{id:'feat:point-blank-shot'}];assert.equal(grant(derive(c,pack),'precise-shot')[0].level,1);
});

test('Sluissi needs real Mechanics training but no invented Intelligence minimum for Tech Specialist',()=>{
 const c=hero('sluissi');c.abilities.int=3;assert.equal(grant(derive(c,pack),'tech-specialist').length,0);c.trainedSkills=['skill:mechanics'];let d=derive(c,pack);assert.equal(d.scores.int,5);assert.equal(grant(d,'tech-specialist')[0].level,1);
 choosePlannedClass(c,pack,0,'class:noble');assert.equal(grant(derive(c,pack),'tech-specialist').length,0,'Invalid starting class-skill training cannot qualify');c.trainedSkills=[];levels(c,3);c.levels[2].feats=[{id:'feat:skill-training',choice:'skill:mechanics'}];d=derive(c,pack);assert.equal(grant(d,'tech-specialist')[0].level,3);assert(d.ctx.trained.has('skill:mechanics'));assert.deepEqual(ix.species.get(c.species).languages,['Basic','Sluiussese']);
});

test('conditional chains reach a fixed point, never duplicate gifts and grant nothing to level-zero drafts',()=>{
 const p=structuredClone(pack),r=p.species.find(r=>r.id==='species:gran');r.conditionalFeats=['feat:mobility','feat:dodge'];const c=newCharacter(p);c.species=r.id;c.abilities.dex=13;assert.equal(derive(c,p).ctx.feats.length,0);choosePlannedClass(c,p,0,'class:soldier');let d=derive(c,p);assert.deepEqual(d.ctx.feats.filter(f=>['feat:dodge','feat:mobility'].includes(f.id)).map(f=>[f.id,f.level]),[['feat:dodge',1],['feat:mobility',1]]);
 r.conditionalStartingFeats=['feat:dodge'];d=derive(c,p);assert.equal(grant(d,'dodge').length,1);c.levels[0].feats=[{id:'feat:dodge'}];d=derive(c,p);assert.equal(grant(d,'dodge').length,1);assert(d.issues.some(t=>t.includes('Dodge is not eligible')));
 const a={...structuredClone(p.feats.find(r=>r.id==='feat:dodge')),id:'feat:cycle-a',name:'Cycle A',prerequisite:{kind:'feat',value:'feat:cycle-b'},effects:[]},b={...a,id:'feat:cycle-b',name:'Cycle B',prerequisite:{kind:'feat',value:'feat:cycle-a'}};p.feats.push(a,b);r.conditionalFeats=[a.id,b.id];delete r.conditionalStartingFeats;c.levels[0].feats=[];d=derive(c,p);assert.equal(grant(d,'cycle-a').length,0);assert.equal(grant(d,'cycle-b').length,0);
});

test('conditional grants reject unsupported data and retain complete official traits for manual resolution',()=>{
 for(const value of [null,false,'feat:dodge',['feat:missing'],['feat:dodge','feat:dodge'],['feat:skill-focus'],['feat:force-training']]){const p=structuredClone(pack);p.species.find(r=>r.id==='species:gran').conditionalFeats=value;assert.throws(()=>validatePack(p));}
 for(const [id,text]of [['codru-ji','Extra Arms'],['gran','Innate Accuracy'],['sluissi','Careful Worker']]){const r=ix.species.get('species:'+id);assert.equal(r.automation,'partial');assert(articleText(r.article).includes(text));const c=hero(id);validateCharacter(c,pack);assert.equal(derive(c,pack).speed,6);}
});
