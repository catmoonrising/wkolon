import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Assassin access is covered by selectable-talent tests; the effect reads actual Assassin levels, so the fixture keeps them.
const pack=structuredClone(core);const t=pack.talents.find(t=>t.id==='talent:sniping-assassin');t.tree='tree:weapon-specialist';
function soldier(assassinLevels=0){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:10};c.levels[0].talent={id:'talent:sniping-assassin'};
 c.inventory=[{id:'equipment:blaster-rifle',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];validateCharacter(c,pack);return c;}
const bonus=(c,distance)=>{const q=structuredClone(c);if(distance!==undefined)q.inventory[0].distance=distance;return derive(q,pack).attacks[0].damageBonus;};
test('Sniping Assassin metadata is pinned and Partial',()=>{
 validatePack(core);const p=structuredClone(core);p.talents.find(t=>t.id==='talent:sniping-assassin').effects[0].divisor=1;assert.throws(()=>validatePack(p));
 assert.equal(core.talents.find(t=>t.id==='talent:sniping-assassin').automation,'partial');
});
test('adds half Assassin level only beyond Point-Blank Range; no Assassin levels gives zero',()=>{
 const c=soldier(),lim=pack.rules.weaponRanges.limits.rifles;assert.equal(bonus(c,lim[0]+1),bonus(c,lim[0]),'no Assassin levels: zero');
 const q=structuredClone(c);const d=derive(q,pack);q.levels=q.levels.concat([]);
 const p=structuredClone(pack);p.talents.find(x=>x.id==='talent:sniping-assassin').effects[0].classLevel='class:soldier';
 const at=(x,dist)=>{const y=structuredClone(x);y.inventory[0].distance=dist;return derive(y,p).attacks[0].damageBonus;};
 for(let n=2;n<=4;n++)c.levels.push({classId:'class:soldier',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});validateCharacter(c,p);
 assert.equal(at(c,lim[0]+1),at(c,lim[0])+2,'floor(4/2) at Short Range');assert.equal(at(c,lim[2]+1),at(c,lim[0])+2,'Long Range');
 const none=structuredClone(c);delete none.inventory[0].distance;assert.equal(derive(none,p).attacks[0].damageBonus,at(c,lim[0]),'no declared distance');
});
