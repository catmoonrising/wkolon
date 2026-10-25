import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=(cls,t)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
const knife=()=>({id:'equipment:knife',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
// Legal Core Scoundrel: Opportunistic Strike, No Escape, Sneak Attack at levels 1, 3, 5.
function scoundrel(sneak=true){const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:12};c.levels[0].talent={id:'talent:opportunistic-strike'};c.levels.push(row('scoundrel'),row('scoundrel','no-escape'),row('scoundrel'),row('scoundrel',sneak?'sneak-attack':null));c.inventory=[knife()];validateCharacter(c,pack);return c;}
// Legal Soldier with Squad Superiority, multiclassing into Scoundrel for Sneak Attack.
function squad(){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:10,cha:10};c.levels[0].talent={id:'talent:squad-superiority'};c.levels.push(row('scoundrel','sneak-attack'));c.inventory=[knife()];validateCharacter(c,pack);return c;}
const sneakDice=(c,t)=>{const q=structuredClone(c);q.attackTarget=t;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[0].uid).sneakAttack?.dice;};

test('the flat-footed opponent records are pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:no-escape').effects[0].against='dexDenied';assert.throws(()=>validatePack(p));
 for(const id of ['squad-superiority','no-escape'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('No Escape: an opponent who withdrew from your threatened area is denied Dexterity for Sneak Attack',()=>{
 const c=scoundrel(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:no-escape')&&d.ctx.talents.some(t=>t.id==='talent:sneak-attack'));
 assert.equal(sneakDice(c,{}),undefined);assert.equal(sneakDice(c,{withdrewFromYou:true}),1);assert(d.targetTraitsUsed.includes('withdrewFromYou'));
 const none=scoundrel(false);assert(!derive(none,pack).targetTraitsUsed.includes('withdrewFromYou'),'hidden without a denied-Dexterity consumer');
 assert.throws(()=>validateCharacter({...c,attackTarget:{withdrewFromYou:'yes'}},pack),/attack target withdrewFromYou/);
});
test('Squad Superiority: a target adjacent to you and two allies counts as Flat-Footed against you',()=>{
 const c=squad();assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:squad-superiority'));assert.equal(sneakDice(c,{squadAdjacent:true}),1);assert.equal(sneakDice(c,{withdrewFromYou:true}),undefined,'other talent flag has no effect');
 c.levels[0].talent=null;assert.equal(sneakDice(c,{squadAdjacent:true}),undefined,'ownership loss');
});
