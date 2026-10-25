import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
// Legal Soldier taking Cunning Attack as a starting feat choice at level 1.
function soldier(feat=true,talent=null){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:10,cha:10};c.levels[0].feats=feat?[{id:'feat:cunning-attack'}]:[];c.levels[0].talent=talent?{id:'talent:'+talent}:null;c.inventory=[item('blaster-pistol'),item('knife'),item('frag-grenade')];validateCharacter(c,pack);return c;}
const at=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).attack;};

test('Cunning Attack metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:cunning-attack').effects[0].amount=3;assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:cunning-attack').automation,'partial');
});
test('+2 on non-area attacks against a declared Dexterity-denied opponent only',()=>{
 const c=soldier(),d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:cunning-attack'));assert(d.targetTraitsUsed.includes('dexDenied'));
 for(const i of [0,1])assert.equal(at(c,i,{dexDenied:true}),at(c,i,{})+2);
 assert.equal(at(c,2,{dexDenied:true}),at(c,2,{}),'area attack excluded');
 const none=soldier(false);assert.equal(at(none,0,{dexDenied:true}),at(none,0,{}),'feat required');assert(!derive(none,pack).targetTraitsUsed.includes('dexDenied'));
});
test('reviewed Flat-Footed declarations count as denied Dexterity',()=>{
 const c=soldier(true,'squad-superiority');assert.equal(at(c,1,{squadAdjacent:true}),at(c,1,{})+2);assert(derive(c,pack).targetTraitsUsed.includes('squadAdjacent'));
 const noFeat=soldier(false,'squad-superiority');assert.equal(at(noFeat,1,{squadAdjacent:true}),at(noFeat,1,{}));
});
