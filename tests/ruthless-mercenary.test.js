import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const row=talent=>({classId:'class:soldier',hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Soldier: Dirty Fighting at level 1, Ruthless Mercenary at level 3.
function merc(talent=true){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:10,cha:10};c.levels[0].talent={id:'talent:dirty-fighting'};c.levels.push(row(null),row(talent?'ruthless-mercenary':null));c.inventory=[item('knife'),item('blaster-rifle'),item('frag-grenade')];validateCharacter(c,pack);return c;}
const dmg=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).damageDisplay;};

test('Ruthless Mercenary metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:ruthless-mercenary').effects[0].amount=3;assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:ruthless-mercenary').automation,'partial');
});
test('+2 damage against a declared target whose threshold you exceeded; area excluded',()=>{
 const c=merc(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:ruthless-mercenary'));assert(d.targetTraitsUsed.includes('exceededThreshold'));
 for(const i of [0,1])assert.equal(dmg(c,i,{exceededThreshold:true}),dmg(c,i,{})+'+2');
 assert.equal(dmg(c,2,{exceededThreshold:true}),dmg(c,2,{}),'area excluded');
 const none=merc(false);assert.equal(dmg(none,0,{exceededThreshold:true}),dmg(none,0,{}),'talent required');
});
