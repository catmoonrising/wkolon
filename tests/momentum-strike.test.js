import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
import fixture from '../tools/tradition-mount-fixtures.cjs';
import * as api from '../src/rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const f=fixture(pack,api);
function scout(feat=true){const c=f.rider();if(!feat)c.levels[0].feats[0]={id:'feat:toughness'};return c;}
const dmg=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).damageDisplay;};

test('Momentum Strike metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:momentum-strike').effects[0].mode='ranged';assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:momentum-strike').automation,'partial');
});
test('+1 weapon die on melee attacks after the declared move; ranged excluded',()=>{
 const c=scout();assert(derive(c,pack).targetTraitsUsed.includes('mountMovedSpeed'));
 const die=/d\d+/.exec(derive(c,pack).attacks.find(a=>a.uid===c.inventory[0].uid).damage)[0];
 assert.equal(dmg(c,0,{mountMovedSpeed:true}),dmg(c,0,{})+'+1'+die);assert.equal(dmg(c,1,{mountMovedSpeed:true}),dmg(c,1,{}),'ranged');
 const none=scout(false);assert.equal(dmg(none,0,{mountMovedSpeed:true}),dmg(none,0,{}),'feat required');
});
