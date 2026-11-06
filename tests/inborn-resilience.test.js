import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
import {renderStatBlock} from '../src/stat-block.js';
import make from '../tools/inborn-resilience-fixtures.cjs';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),id='feat:inborn-resilience';
test('Inborn Resilience preserves its pinned source, six closed choices and Partial status',()=>{
 validatePack(pack);const row=pack.feats.find(r=>r.id===id),source=pack.sources.find(s=>s.id===row.sourceId);assert.equal(source.revision,20673);assert.equal(source.sha256,'dd7aa06ca502c8ad11453b710946c45aade6f9144ee1f1d99bfc00e15db69813');
 assert.equal(row.repeat,'never');assert.equal(row.automation,'partial');const bad=structuredClone(pack);bad.feats.find(r=>r.id===id).choiceOptions[0].id='reflex-reflex';assert.throws(()=>validatePack(bad),/Inborn Resilience/);
});
test('all six acquired defense pairs replace only their species contribution and persist through save',()=>{
 for(const choice of pack.feats.find(r=>r.id===id).choiceOptions.map(c=>c.id)){
  const c=f.hero(choice),d=api.derive(c,pack);assert.deepEqual(d.issues,[]);const plain=structuredClone(c);plain.levels[0].feats=[{id:'feat:toughness'}];const base=api.derive(plain,pack),[from,to]=choice.split('-');
  for(const key of ['reflex','fortitude','will']){assert.equal(d.defenses[key],base.defenses[key]+(key===from?-1:key===to?1:0));assert.match(d.breakdowns[key],new RegExp((key===from?0:key===to?2:1)+' species'));}
  const q=JSON.parse(JSON.stringify(c));api.validateCharacter(q,pack);assert.deepEqual(api.derive(q,pack).defenses,d.defenses);assert.match(renderStatBlock(q,d,pack),/Inborn Resilience/);
 }
});
test('species prerequisite loss and feat removal suppress the redistribution without affecting other bonuses',()=>{
 const c=f.hero(),original=api.derive(c,pack);c.species='species:human';const plain=structuredClone(c);plain.levels[0].feats=[{id:'feat:toughness'}];assert.deepEqual(api.derive(c,pack).defenses,api.derive(plain,pack).defenses);assert(api.derive(c,pack).issues.some(x=>x.includes('Inborn Resilience')));
 c.species='species:zabrak';assert.deepEqual(api.derive(c,pack).defenses,original.defenses);c.levels[0].feats=[{id:'feat:improved-defenses'}];const changed=api.derive(c,pack);assert.equal(changed.defenses.reflex,original.defenses.reflex+2);assert.equal(changed.defenses.will,original.defenses.will);
});
test('invalid and repeated choices cannot silently grant the benefit',()=>{
 for(const choice of ['reflex-reflex','will-attacks','reflex-will-extra']){const c=f.hero();c.levels[0].feats[0].choice=choice;api.validateCharacter(c,pack);const d=api.derive(c,pack);assert(!d.ctx.feats.some(f=>f.id===id));assert(d.issues.some(x=>x.includes('Inborn Resilience')));}
 const c=f.hero();c.levels.push({classId:'class:soldier',hpRoll:6,feats:[{id,choice:'will-reflex'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});const d=api.derive(c,pack);assert.equal(d.ctx.feats.filter(f=>f.id===id).length,1);assert(d.issues.some(x=>x.includes('already')||x.includes('repeat')||x.includes('not eligible')));
});
