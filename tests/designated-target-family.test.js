import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/designated-target-fixtures.cjs';
import * as api from '../src/rules.js';
import * as profiles from '../src/ability-profiles.js';
import * as generation from '../src/ability-generation.js';
import * as species from '../src/species-choices.js';
import * as installation from '../src/droid-installation.js';
import {rollRoutine} from '../src/combat.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,{...api,...profiles,...generation,...species,...installation});
test('real Bothan Infiltrator, Scout, custom 4th-degree droid and Soldier builds have no unresolved choices',()=>{
 for(const c of [f.infiltrator(),f.scout(),f.droid(),f.mercenary()])assert.deepEqual(api.derive(c,pack).issues,[]);
});
test('Target Acquisition damage uses a circumstance identity shared with ordinary damage modifiers',()=>{
 const p=structuredClone(pack),c=f.droid();c.attackTarget={acquiredTarget:true};const uid=c.inventory.find(e=>e.id==='equipment:blaster-rifle').uid;
 const ordinary=p.talents.find(t=>t.id==='talent:weapon-specialization');ordinary.effects.push({target:'damage',amount:2,type:'circumstance',circumstance:'acquired-target'});
 const on=api.derive(c,p).attacks.find(a=>a.uid===uid);c.attackTarget.acquiredTarget=false;const off=api.derive(c,p).attacks.find(a=>a.uid===uid);assert.equal(on.damageDisplay,off.damageDisplay,'same circumstance cannot be added twice');assert.equal(on.attack,off.attack+1);
});
test('ally count math reaches actual critical routine expressions and survives save with source loss',()=>{
 const c=f.mercenary(),uid=c.inventory.find(e=>e.id==='equipment:knife').uid,before=api.derive(c,pack).attacks.find(a=>a.uid===uid);c.attackTarget={alliesDamagedTarget:5,alliesAdjacentToTarget:21,damagedByAlly:true};let d=api.derive(c,pack),a=d.attacks.find(a=>a.uid===uid);assert.equal(a.attack,before.attack+21);assert.equal(a.damageDisplay,before.damageDisplay+'+12');
 const calls=[],routine={steps:[{attackId:uid,count:2,attackMod:0,damageMod:0}]};rollRoutine(routine,d.attacks,pack.rules.combat,expr=>{calls.push(expr);return {value:calls.length%2?20+a.attack:40,d20:calls.length%2?[20]:[],display:expr,coeffs:[1]};});assert.equal(calls[1],'('+a.damageDisplay+')*2');assert.equal(calls[3],calls[1]);
 const saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);assert.equal(api.derive(saved,pack).attacks.find(a=>a.uid===uid).attack,a.attack);saved.levels[5].feats[0]={id:'feat:toughness'};saved.levels[6].talent={id:'talent:armored-defense'};d=api.derive(saved,pack);a=d.attacks.find(a=>a.uid===uid);assert.equal(a.attack,before.attack);assert.equal(a.damageDisplay,before.damageDisplay+'+2');assert.deepEqual(d.issues,[]);
});
