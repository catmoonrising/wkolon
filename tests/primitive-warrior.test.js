import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
// Legal level-1 Gamorrean Soldier with Primitive Warrior.
function gamorrean(feat=true,inventory=[item('club'),item('vibroblade'),item('blaster-pistol')]){const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:gamorrean';c.abilityMethod='manual';c.abilities={str:14,dex:12,con:12,int:10,wis:10,cha:10};c.levels[0].feats=feat?[{id:'feat:primitive-warrior'}]:[];c.inventory=inventory;validateCharacter(c,pack);return c;}
const dmg=(c,pred)=>derive(c,pack).attacks.find(pred).damage;

test('Primitive Warrior metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:primitive-warrior').effects[0].mode='ranged';assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:primitive-warrior').automation,'partial');
});
test('+1 die on melee Simple Weapons and Unarmed Attacks only',()=>{
 const c=gamorrean(),b=gamorrean(false),by=id=>a=>a.uid===c.inventory.find(e=>e.id==='equipment:'+id).uid,byB=id=>a=>a.uid===b.inventory.find(e=>e.id==='equipment:'+id).uid;
 assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:primitive-warrior'));
 const add=s=>s.replace(/^(\d+)d/,(_,n)=>(Number(n)+1)+'d');
 assert.equal(dmg(c,by('club')),add(dmg(b,byB('club'))),'Club');
 assert.equal(dmg(c,by('vibroblade')),dmg(b,byB('vibroblade')),'Advanced Melee excluded');assert.equal(dmg(c,by('blaster-pistol')),dmg(b,byB('blaster-pistol')),'ranged excluded');
 const bare=gamorrean(true,[]),bareB=gamorrean(false,[]);assert.equal(dmg(bare,a=>a.unarmed),add(dmg(bareB,a=>a.unarmed)),'Unarmed Attack');
});
