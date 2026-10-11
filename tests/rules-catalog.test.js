import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRulesCatalog} from '../src/rules-catalog.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));

test('library searches the full description and filters type without granting reference rules',()=>{
 const library=createRulesCatalog(pack);
 library.search('amphibious');library.filter('species');
 assert(library.matches().some(r=>r.name==='Mon Calamari'));
 library.filter('species',true);assert(library.matches().some(r=>r.name==='Mon Calamari'));
 library.search('');assert(!library.matches().some(r=>r.name==='Neimoidian'));
 library.search('');library.filter('forcePower');
 assert(library.matches().some(r=>r.name==='Force Lightning'));
 assert(library.matches().every(r=>r.status==='reference'));
 const c=newCharacter(pack),before=derive(c,pack);validateCharacter(c,pack);
 library.search('Force Lightning');library.results();
 assert.deepEqual(derive(c,pack).scores,before.scores);
 assert(!before.ctx.feats.some(r=>r.id==='feat:force-lightning'));
 library.search('');library.filter('skill',true);
 assert(library.matches().some(r=>r.name==='Acrobatics'));
 assert.equal(library.matches().find(r=>r.name==='Knowledge').mechanicsIds.length,7);
 library.filter('feat',true);
 assert.equal(library.matches().find(r=>r.name==='Weapon Proficiency').mechanicsIds.length,6);
});

test('core talent sections preserve prerequisites and exclude neighbouring and supplementary abilities',()=>{
 const page=name=>pack.rulePages.find(r=>r.name===name);
 const armor=articleText(page('Armor Mastery').article);
 assert(armor.includes('Prerequisite:')&&armor.includes('Armored Defense'));
 assert(!armor.includes('Second Skin'));
 assert(pack.catalog.records.some(r=>r.name==='Uncanny Dodge I'&&r.kind==='talent'));
 assert(!pack.catalog.records.some(r=>r.name==='Reset Initiative'&&r.kind==='talent'));
 assert(pack.talents.some(r=>r.name==='Reset Initiative'));
 const variants=articleText(page('Neimoidian').article);
 assert(variants.includes('Core Rulebook')&&variants.includes('Galaxy of Intrigue'));
});

test('catalog validation rejects invented availability, missing provenance and unsafe articles',()=>{
 const p=structuredClone(pack),r=p.catalog.records.find(r=>r.status==='reference');
 r.status='available';assert.throws(()=>validatePack(p),/Unreviewed catalog entry enabled/);
 r.status='reference';r.sourceId='source:missing';assert.throws(()=>validatePack(p),/Missing catalog reference/);
 const bad=structuredClone(pack);bad.rulePages[0].article.blocks.push({tag:'a',href:'javascript:alert(1)',children:['bad']});
 assert.throws(()=>validatePack(bad),/article URL/);
});
