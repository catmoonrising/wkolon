import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
// Legal Soldier: both general feats at level 1 (two feat slots: level-1 feat plus the Human bonus feat).
function soldier(feats=['trench-warrior','cornered']){const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:human';c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:10,cha:10};c.levels[0].feats=feats.map(id=>({id:'feat:'+id}));c.inventory=[item('blaster-rifle'),item('knife'),item('frag-grenade')];validateCharacter(c,pack);return c;}
const at=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).attack;};

test('Trench Warrior and Cornered metadata are pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:cornered').effects[0].amount=1;assert.throws(()=>validatePack(p));
 for(const id of ['trench-warrior','cornered'])assert.equal(pack.feats.find(f=>f.id==='feat:'+id).automation,'partial');
});
test('declared opponents give +1 circumstance and +2 unnamed; both add; area attacks excluded',()=>{
 const c=soldier(),d=derive(c,pack);assert(['trenchCover','corneredBy'].every(k=>d.targetTraitsUsed.includes(k)));
 for(const i of [0,1]){assert.equal(at(c,i,{trenchCover:true}),at(c,i,{})+1);assert.equal(at(c,i,{corneredBy:true}),at(c,i,{})+2);assert.equal(at(c,i,{trenchCover:true,corneredBy:true}),at(c,i,{})+3);}
 assert.equal(at(c,2,{trenchCover:true,corneredBy:true}),at(c,2,{}),'area attack excluded');
 const one=soldier(['trench-warrior']);assert.equal(at(one,0,{corneredBy:true}),at(one,0,{}),'Cornered required');assert(!derive(one,pack).targetTraitsUsed.includes('corneredBy'));
 assert.throws(()=>validateCharacter({...c,attackTarget:{corneredBy:'yes'}},pack),/attack target corneredBy/);
});
