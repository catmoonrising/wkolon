import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
import fixture from '../tools/tradition-mount-fixtures.cjs';
import * as api from '../src/rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const membership=(id,dss=0)=>[{id:'tradition:'+id,level:1,darkSideScore:dss}];
const attack=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).attack;};
const f=fixture(pack,api);
function believer(talent=true){const c=f.believer();if(!talent)c.levels[0].talent={id:'talent:bolster-ally'};return c;}
function seer(talent=true){const c=f.seer();if(!talent)c.levels[0].talent={id:'talent:equilibrium'};return c;}

test('Sith Reverence and Quickseeing metadata are pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:sith-reverence').effects[0].when='aboardStarship';assert.throws(()=>validatePack(p));
 for(const id of ['sith-reverence','quickseeing'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('Sith Reverence: +1 morale on every attack roll while the ally condition is declared',()=>{
 const c=believer(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:sith-reverence'&&!d.ctx.inactiveTalents.has(t.id)));assert(d.targetTraitsUsed.includes('nearDarkAlly'));
 for(const i of [0,1])assert.equal(attack(c,i,{nearDarkAlly:true}),attack(c,i,{})+1);
 const b=believer(false);assert.equal(attack(b,0,{nearDarkAlly:true}),attack(b,0,{}),'talent required');
});
test('Quickseeing: +2 insight against the declared target',()=>{
 const c=seer(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:quickseeing'&&!d.ctx.inactiveTalents.has(t.id)));
 assert.equal(attack(c,0,{quickseenTarget:true}),attack(c,0,{})+2);assert.equal(attack(seer(false),0,{quickseenTarget:true}),attack(seer(false),0,{}));
});
