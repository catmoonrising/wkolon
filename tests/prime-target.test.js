import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:soldier',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Soldier: Ambush Specialist at level 1, Destructive Ambusher at level 3.
function ambusher(destructive=true){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:10,cha:10};c.levels[0].talent={id:'talent:ambush-specialist'};c.levels.push(row(null),row(destructive?'destructive-ambusher':null));
 c.inventory=['blaster-rifle','frag-grenade'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));validateCharacter(c,pack);return c;}
const at=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid);};

test('Prime Target records are pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:ambush-specialist').effects[0].type='insight';assert.throws(()=>validatePack(p));
 for(const id of ['ambush-specialist','destructive-ambusher'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('a declared Prime Target gives +2 morale attack and, with Destructive Ambusher, +1 die; area attacks excluded',()=>{
 const c=ambusher(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:destructive-ambusher'));assert(d.targetTraitsUsed.includes('primeTarget'));
 const plain=at(c,0,{}),prime=at(c,0,{primeTarget:true});assert.equal(prime.attack,plain.attack+2);assert.equal(prime.damageDisplay,plain.damageDisplay+'+1d8');
 assert.equal(at(c,1,{primeTarget:true}).attack,at(c,1,{}).attack,'area attack excluded');
 const only=ambusher(false);assert.equal(at(only,0,{primeTarget:true}).attack,at(only,0,{}).attack+2);assert.equal(at(only,0,{primeTarget:true}).damageDisplay,at(only,0,{}).damageDisplay,'no die without Destructive Ambusher');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:ambush-specialist').effects.push({target:'attacks',amount:3,type:'morale'});const q=structuredClone(c);q.attackTarget={primeTarget:true};const r=structuredClone(c);r.attackTarget={};
 assert.equal(derive(q,p).attacks.find(a=>a.uid===c.inventory[0].uid).attack,derive(r,p).attacks.find(a=>a.uid===c.inventory[0].uid).attack,'morale bonuses do not stack');
});
