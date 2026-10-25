import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Imperial Knight access is covered by selectable-talent tests; the talent sits in the Jedi Lightsaber Combat tree here, keeping its Weapon Focus (Lightsabers) prerequisite.
const pack=structuredClone(core);pack.talents.find(t=>t.id==='talent:praetoria-vonil').tree='tree:lightsaber-combat';
const saber=(extra={})=>({id:'equipment:lightsaber',uid:crypto.randomUUID(),quantity:1,equipped:true,activated:true,twoHanded:true,attackMod:0,damageMod:0,...extra});
function knight(inventory=[saber()],talent=true){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:12,cha:12};c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:weapon-focus',choice:'lightsabers'}];c.levels[0].talent=talent?{id:'talent:praetoria-vonil'}:null;c.inventory=inventory;validateCharacter(c,pack);return c;}
const dmg=(c,moved,i=0)=>{const q=structuredClone(c);q.attackTarget=moved?{movedBeforeAttack:true}:{};validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).damageDisplay;};

test('Praetoria Vonil metadata is pinned and Partial',()=>{
 validatePack(core);const p=structuredClone(core);p.talents.find(t=>t.id==='talent:praetoria-vonil').effects[0].singleTwoHanded=false;assert.throws(()=>validatePack(p));
 assert.equal(core.talents.find(t=>t.id==='talent:praetoria-vonil').automation,'partial');
});
test('+1 die only with a single two-handed Lightsaber after declared movement',()=>{
 const c=knight();assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:praetoria-vonil'));assert.equal(dmg(c,true),dmg(c,false)+'+1d8');
 const one=knight([saber({twoHanded:false})]);assert.equal(dmg(one,true),dmg(one,false),'one-handed grip');
 const two=knight([saber(),saber({twoHanded:false})]);assert.equal(dmg(two,true),dmg(two,false),'two wielded Lightsabers');
 const off=knight([saber(),saber({twoHanded:false,activated:false})]);assert.equal(dmg(off,true),dmg(off,false)+'+1d8','an inactive second blade is not wielded');
 const none=knight([saber()],false);assert.equal(dmg(none,true),dmg(none,false),'talent required');
});
