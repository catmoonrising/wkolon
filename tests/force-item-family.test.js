import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/force-item-fixtures.cjs';
import * as api from '../src/rules.js';
import {takeAction,beginNextTurn,endTrackedCombat} from '../src/action-engine.js';
import {rollRoutine} from '../src/combat.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const attack=(c,i)=>api.derive(c,pack).attacks.find(a=>a.uid===c.inventory[i].uid);

test('all Force item and Commander fixtures have actual complete class entry and acquisition',()=>{
 for(const c of [f.armed(),f.talisman(),f.citadel(),f.vahl(),f.commander(),f.commander(false)])assert.deepEqual(api.derive(c,pack).issues,[]);
});
test('Attune and Empower combine on one entry, preserve exact critical math and stop applying after ownership loss',()=>{
 const c=f.armed(),base=attack(c,0);c.inventory[0].attuned=true;c.inventory[0].empowered=true;api.validateCharacter(c,pack);const a=attack(c,0);assert.equal(a.attack,base.attack+1);assert.equal(a.damage,'3d8');
 const calls=[],result=rollRoutine({name:'Empowered',steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]},[a],pack.rules.combat,expr=>{calls.push(expr);return {value:calls.length===1?20+a.attack:30,d20:calls.length===1?[20]:[],display:'test',coeffs:[1]};});assert.equal(result.results[0].critical,true);assert.equal(calls[1],'('+a.damageDisplay+')*2');assert.match(calls[1],/3d8/);
 const saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);assert.equal(attack(saved,0).damage,a.damage);saved.levels[7].talent={id:'talent:force-talisman'};saved.levels[9].talent={id:'talent:greater-force-talisman'};assert.deepEqual(api.derive(saved,pack).issues,[]);assert.equal(attack(saved,0).attack,base.attack);assert.equal(attack(saved,0).damage,base.damage);
 c.inventory[1].attuned=true;c.inventory[1].empowered=true;c.inventory[1].attackStyle='thrown';api.validateCharacter(c,pack);const thrown=attack(c,1);assert.equal(thrown.mode,'ranged');assert.equal(thrown.damage,'1d4','unsupported thrown use does not inherit a melee die');const copy=structuredClone(c);copy.inventory[1].attuned=false;assert.equal(attack(copy,1).attack,thrown.attack,'unsupported thrown use does not inherit the melee attack bonus');
});
test('actual Sword of Vahl and Psychic Citadel demonstrate Force bonuses do not stack',()=>{
 const c=f.vahl(),knife=attack(c,1);c.inventory[1].attuned=true;assert.equal(attack(c,1).attack,knife.attack,'Vahl already gives +1 Force to Simple attacks');c.inventory[0].attuned=true;const ls=attack(c,0);c.inventory[0].attuned=false;assert.equal(ls.attack,attack(c,0).attack+1,'Lightsaber still gains its separate Force bonus');
 const t=f.citadel(),d=api.derive(t,pack);delete t.inventory[0].talisman;assert.equal(api.derive(t,pack).defenses.will,d.defenses.will,'Citadel +3 replaces Talisman +1');
 const g=f.talisman();g.inventory[0].talisman='fortitude';g.inventory[1].talisman='all';api.validateCharacter(g,pack);const active=api.derive(g,pack);g.inventory.forEach(e=>e.carried=false);const dropped=api.derive(g,pack);for(const key of ['reflex','fortitude','will'])assert.equal(active.defenses[key],dropped.defenses[key]+1);assert.equal(active.threshold,dropped.threshold+1,'Fortitude-based Damage Threshold follows the shared bonus');
});
test('Commander retains tracked activation cost, expiration, save state and loses only its extra point on source loss',()=>{
 const c=f.commander(),before=attack(c,0).attack,fp=c.forcePoints;beginNextTurn(c,pack);takeAction(c,pack,'encounter-talent',{talentId:'talent:battle-meditation',choice:'attacks'},()=>{throw Error('No check');});assert.equal(c.forcePoints,fp-1);assert.equal(attack(c,0).attack,before+2);assert(c.actionState.spent.length);
 const saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);assert.equal(attack(saved,0).attack,before+2);saved.levels[7].talent={id:'talent:force-pilot'};assert.deepEqual(api.derive(saved,pack).issues,[]);assert.equal(attack(saved,0).attack,before+1);endTrackedCombat(saved);assert.equal(attack(saved,0).attack,before);
});
