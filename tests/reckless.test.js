import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {planCharge} from '../src/charge.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:soldier',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Soldier: Tested in Battle at level 1, Reckless at level 3.
function veteran(talent=true,wis=14){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis,cha:10};c.levels[0].talent={id:'talent:tested-in-battle'};c.levels.push(row(null),row(talent?'reckless':null));
 c.inventory=[{id:'equipment:vibroblade',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];c.chargePath={squares:4};validateCharacter(c,pack);return c;}
const charge=c=>{const d=derive(c,pack);return {plan:planCharge(c,d,pack,c.inventory[0].uid).attack,row:d.attacks.find(a=>a.uid===c.inventory[0].uid)};};

test('Reckless metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:reckless').effects[0].minimum=0;assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:reckless').automation,'partial');
});
test('Charge damage adds the Wisdom bonus, minimum +1; the ordinary attack row is unchanged',()=>{
 const c=charge(veteran()),b=charge(veteran(false));assert.equal(c.plan.damageBonus,b.plan.damageBonus+2,'Wisdom 14');assert.equal(c.row.damageBonus,b.row.damageBonus);
 const low=charge(veteran(true,8)),lowB=charge(veteran(false,8));assert.equal(low.plan.damageBonus,lowB.plan.damageBonus+1,'minimum +1');
});
