import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/melee-dice-fixtures.cjs';
import {rollRoutine} from '../src/combat.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const unarmed=c=>api.derive(c,pack).attacks.find(a=>a.unarmed);

test('Teräs Käsi Basics metadata is pinned, Partial and remains in its actual prestige tree',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:ter-s-k-si-basics').effects[0].dice=2;assert.throws(()=>validatePack(p));
 const record=pack.talents.find(t=>t.id==='talent:ter-s-k-si-basics');assert.equal(record.automation,'partial');assert.equal(record.tree,'tree:master-of-ter-s-k-si');
 const c=f.elite();assert.deepEqual(api.derive(c,pack).issues,[]);assert.equal(api.derive(c,pack).ctx.talents.find(t=>t.id===record.id).classId,'class:elite-trooper');
 const early=structuredClone(c);early.levels=early.levels.slice(0,1);early.levels[0].talent={id:record.id};const d=api.derive(early,pack);assert(d.issues.some(i=>i.includes('not eligible')));assert(!d.ctx.talents.some(t=>t.id===record.id));
});
test('actual Elite Trooper adds one current Unarmed die, combining with Primitive Warrior',()=>{
 const both=f.elite(),primitive=f.elite({basics:false}),basics=f.elite({primitive:false}),neither=f.elite({primitive:false,basics:false});
 for(const c of [both,primitive,basics,neither])assert.deepEqual(api.derive(c,pack).issues,[]);
 assert.equal(unarmed(neither).damage,'1d10');assert.equal(unarmed(primitive).damage,'2d10');assert.equal(unarmed(basics).damage,'2d10');assert.equal(unarmed(both).damage,'3d10');
 const d=api.derive(both,pack),b=api.derive(primitive,pack);for(const a of d.attacks.filter(a=>!a.unarmed))assert.equal(a.damage,b.attacks.find(x=>x.id===a.id).damage,a.name);
 both.levels[5].feats[1]={id:'feat:weapon-focus',choice:'simple-weapons'};assert.deepEqual(api.derive(both,pack).issues,[]);assert.equal(unarmed(both).damage,'3d8','Martial Arts II current die');
});
test('combined dice enter actual routine critical multiplication, and persist across saved reload',()=>{
 const c=f.elite(),saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);const a=unarmed(saved),calls=[];
 const r={name:'Unarmed',steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]};
 const result=rollRoutine(r,[a],pack.rules.combat,expr=>{calls.push(expr);return {value:calls.length===1?20+a.attack:40,d20:calls.length===1?[20]:[],display:'test',coeffs:[1]};});
 assert.equal(calls[1],'('+a.damageDisplay+')*2');assert.match(calls[1],/3d10/);assert.equal(result.results[0].critical,true);assert.equal(result.results[0].damage,40);
 saved.levels[7].talent={id:'talent:ambush-commando'};assert.equal(unarmed(saved).damage,'2d10');saved.levels[0].feats=[{id:'feat:toughness'}];assert.equal(unarmed(saved).damage,'1d10');
});
