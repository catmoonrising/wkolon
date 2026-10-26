import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Legal level-1 Ewok Scout with Keen Scent.
function ewok(feat=true,species='species:ewok'){const c=newCharacter(pack,{classId:'class:scout'});c.species=species;c.abilityMethod='manual';c.abilities={str:10,dex:14,con:12,int:12,wis:12,cha:10};c.levels[0].feats=feat?[{id:'feat:keen-scent'}]:[];validateCharacter(c,pack);return c;}

test('Keen Scent metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:keen-scent').effects[0].range=30;assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:keen-scent').automation,'partial');
});
test('Scent range becomes 20 squares in the derived senses and stat block',()=>{
 const c=ewok(),b=ewok(false),d=derive(c,pack),db=derive(b,pack);assert(d.ctx.feats.some(f=>f.id==='feat:keen-scent'));
 assert.equal(db.scentRange,10);assert.equal(d.scentRange,20);assert.match(renderStatBlock(c,d,pack),/Scent 20 Squares/);assert.match(renderStatBlock(b,db,pack),/Scent 10 Squares/);
 assert.equal(derive(ewok(false,'species:human'),pack).scentRange,undefined,'no Scent, no range');
});
