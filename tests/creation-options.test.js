import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {optionArticle,optionPreview} from '../src/creation-options.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));

test('every class and skill resolves to a complete imported article without changing mechanical provenance',()=>{
 const before=JSON.stringify(pack);
 for(const record of [...pack.classes,...pack.skills])assert(optionArticle(pack,record.name).article.blocks.length);
 const acrobatics=pack.skills.find(r=>r.name==='Acrobatics');
 assert.notEqual(optionArticle(pack,acrobatics.name).sourceId,acrobatics.sourceId);
 assert.equal(optionArticle(pack,'Knowledge (Tactics)').name,'Knowledge');
 assert.equal(JSON.stringify(pack),before);
 assert.throws(()=>optionArticle(pack,'Invented'),/Missing creation article/);
});

test('class previews retain source nodes and complete Class Features; full articles retain progression and flavor',()=>{
 for(const record of pack.classes.filter(r=>r.classType!=='prestige')){
  const page=optionArticle(pack,record.name),preview=optionPreview(page,'class').preview;
  assert(preview.blocks.every(n=>page.article.blocks.includes(n)));
  const text=articleText(preview);assert(text.includes('Starting Feats')&&text.includes('Bonus Feats'));
  assert(!text.includes('CLASS LEVEL'));assert(articleText(page.article).includes('CLASS LEVEL'));
  assert(articleText(page.article).includes('Adventurers'));
 }
});

test('skill previews and applications together preserve every source block and supplemental book headings',()=>{
 for(const page of pack.rulePages.filter(r=>pack.catalog.records.some(c=>c.kind==='skill'&&c.ruleId===r.id))){
  const parts=optionPreview(page,'skill'),combined=[...parts.preview.blocks,...parts.applications.blocks];
  assert(combined.every(n=>page.article.blocks.includes(n)));
  assert.equal(combined.length,page.article.blocks.length-1); // Applications heading is the disclosure label.
 }
 const acrobatics=optionPreview(optionArticle(pack,'Acrobatics'),'skill');
 assert(articleText(acrobatics.preview).includes('You can move at normal speed across'));
 const applications=articleText(acrobatics.applications);
 assert(applications.includes('Tumble')&&applications.includes('Additional Applications')&&applications.includes('Scum and Villainy'));
});
