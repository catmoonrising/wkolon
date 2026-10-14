import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createReferenceLibrary,validateReferenceIndex,validateReferencePage} from '../src/reference-library.js';
import {createRulesCatalog} from '../src/rules-catalog.js';
import {renderArticle} from '../src/wiki-content.js';
const index=JSON.parse(fs.readFileSync(new URL('../data/reference-index.json',import.meta.url)));
const record=index.records[0],page=JSON.parse(fs.readFileSync(new URL('../'+record.path,import.meta.url)));

test('reference source pins and closed articles reject remote paths, wrong revisions and scripts',()=>{
 validateReferenceIndex(index);validateReferencePage(page,record,index);
 const bad=structuredClone(index);bad.records[0].path='https://example.com/code.json';assert.throws(()=>validateReferenceIndex(bad),/reference source/);
 const changed=structuredClone(page);changed.source.revision++;assert.throws(()=>validateReferencePage(changed,record,index),/revision/);
 const unsafe=structuredClone(page);unsafe.article.blocks.push({tag:'script',children:['evil']});assert.throws(()=>validateReferencePage(unsafe,record,index),/markup/);
 const link=structuredClone(page);link.article.blocks.push({tag:'a',href:'https://swse.miraheze.org/wiki/Test',referenceId:'reference:0000000000000000',children:['unknown']});assert.throws(()=>validateReferencePage(link,record,index),/link/);
 const altered=structuredClone(page);altered.article.blocks.push('Invented extra rule');assert.throws(()=>validateReferencePage(altered,record,index),/text/);
});

test('reference requests are lazy, shared and retryable without granting any mechanics',async()=>{
 const requests=[];let fail=true;
 const fetcher=async url=>{requests.push(url.pathname);if(url.pathname.endsWith('reference-index.json'))return {ok:true,json:async()=>index};return fail?{ok:false}:{ok:true,json:async()=>page};};
 const library=createReferenceLibrary({fetcher,base:new URL('https://example.com/wkolon/')});
 assert.equal(requests.length,0);
 await Promise.all([library.load(),library.load()]);assert.equal(requests.length,1);
 await assert.rejects(()=>library.article(record.id),/Connect and retry/);
 fail=false;
 const [a,b]=await Promise.all([library.article(record.id),library.article(record.id)]);assert.equal(a,b);
 assert.equal(requests.length,3);await library.article(record.id);assert.equal(requests.length,3);
 assert.equal(library.record(record.id).source.revision,page.source.revision);
 const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),before=JSON.stringify(pack);
 const catalog=createRulesCatalog(pack);catalog.setReferences(index);catalog.setReferences(index);
 assert.equal(JSON.stringify(pack),before);catalog.filter('',true);assert(catalog.matches().every(r=>r.status==='available'&&!r.referenceId));
 catalog.filter('');catalog.search(record.searchText.split(' ').slice(0,4).join(' '));assert(catalog.matches().some(r=>r.name===record.name));
 catalog.search('');catalog.source(record.books[0]);assert(catalog.matches().every(r=>r.books.includes(record.books[0])));
 catalog.source('');assert(catalog.results().includes('data-rules-page="next"'));catalog.page('next');assert(catalog.results().includes('101–'));
});

test('reference links retain external wiki navigation and open local read-only popups',()=>{
 const html=renderArticle({blocks:[{tag:'a',href:'https://swse.miraheze.org/wiki/Test',referenceId:record.id,children:['Test']}]});
 assert(html.includes('data-rule-reference="'+record.id+'"'));assert(html.includes('target="_blank"'));assert(html.includes('https://swse.miraheze.org/wiki/Test'));
});

test('mixed official pages retain their published rules while excluding marked Homebrew additions',()=>{
 const text=name=>index.records.find(r=>r.name===name).searchText;
 assert(text('Cryokinesis').includes('Damage Reduction'));
 assert(!text('Cryokinesis').includes('Homebrew Effects'));
 assert(!text('Felucian Shaman Talent Tree').includes('Skullblade Mastery'));
 assert(text('Felucian Shaman Talent Tree').includes('Sickening Blast'));
 assert(!text('The Yuuzhan Vong Empire').includes('Yuuzhan Vong Shaper Master'));
 assert(text('The Yuuzhan Vong Empire').includes('Coralskipper'));
 assert(text('The Trianii Rangers').includes('Homebrew intoxicants'));
 const excluded={...index,excluded:[...index.excluded,record.name]};
 assert.throws(()=>validateReferenceIndex(excluded),/Homebrew reference excluded/);
});
