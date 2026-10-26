import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/movement-sense-fixtures.cjs';
import * as api from '../src/rules.js';
import {planCharge} from '../src/charge.js';
import {planRunningAttack} from '../src/combat-movement.js';
import {takeAction,beginNextTurn} from '../src/action-engine.js';
import {sensesView} from '../src/senses.js';
import {moduleRelevant} from '../src/sheet-modules.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);

test('movement and sense fixtures have complete actual prerequisites and choices',()=>{
 for(const c of [f.runner(),f.agility(),f.agility('human'),f.agility('geonosian-clone-wars-campaign-guide'),f.ewok(),f.veteran(),f.veteran(8)])assert.deepEqual(api.derive(c,pack).issues,[]);
});
test('Fleet-Footed validates only split Running Attack distance and actual tracked movement',()=>{
 const c=f.runner(),d=api.derive(c,pack),uid=c.inventory[0].uid;assert.equal(planRunningAttack(c,d,pack,uid).maximum,d.speed+2);assert.equal(d.speed,6);beginNextTurn(c,pack);
 const result=takeAction(c,pack,'running-attack',{uid},expr=>({value:expr.startsWith('1d20')?10+d.attacks[0].attack:8,d20:[10],display:'test',coeffs:[1]}));assert.match(result.text,/8\/8 squares/);assert(c.actionState.spent.length);
 const no=structuredClone(c);no.levels[0].feats[1]={id:'feat:toughness'};assert.throws(()=>planRunningAttack(no,api.derive(no,pack),pack,uid),/exceeds Speed/);
 c.runningAttack={before:{squares:7},after:{squares:0}};assert.throws(()=>planRunningAttack(c,api.derive(c,pack),pack,uid),/exceeds Speed/);
});
test('Reckless combines with Powerful Charge, preserves normal rows, and enters critical routine math',()=>{
 for(const [wis,bonus]of [[14,2],[8,1]]){const c=f.veteran(wis),d=api.derive(c,pack),uid=c.inventory[0].uid,p=planCharge(c,d,pack,uid),base=structuredClone(c);base.levels[2].talent={id:'talent:armored-defense'};const b=planCharge(base,api.derive(base,pack),pack,uid);assert.equal(p.damageBonus,b.damageBonus+bonus);assert.equal(d.attacks[0].damageDisplay,api.derive(base,pack).attacks[0].damageDisplay);
  beginNextTurn(c,pack);const calls=[];takeAction(c,pack,'charge',{uid},expr=>{calls.push(expr);return {value:calls.length===1?20+p.attack.attack:30,d20:calls.length===1?[20]:[],display:'test',coeffs:[1]};});assert.equal(calls[1],'('+p.attack.damageDisplay+')*2');assert.equal(c.actionState.ended,true);
 }
});
test('Increased Agility changes existing modes only; Keen Scent survives save/stat-block rendering and source loss',()=>{
 for(const species of ['gungan','geonosian-clone-wars-campaign-guide','human']){const c=f.agility(species),d=api.derive(c,pack);c.levels[2].feats=[{id:'feat:toughness'}];const b=api.derive(c,pack);assert.equal(d.speed,b.speed);for(const mode of ['swim','climb'])assert.equal(d.speeds[mode],b.speeds[mode]===undefined?undefined:b.speeds[mode]+2);assert.equal(d.speeds.fly,b.speeds.fly);}
 const c=f.ewok(),saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);let d=api.derive(saved,pack);assert.equal(d.scentRange,20);assert.match(sensesView(d),/Scent 20 squares/);assert.equal(moduleRelevant('senses',saved,{vision:'normal',scentRange:20}),true);assert.match(renderStatBlock(saved,d,pack),/Scent 20 Squares/);saved.levels[0].feats=[{id:'feat:toughness'}];d=api.derive(saved,pack);assert.equal(d.scentRange,10);assert.match(renderStatBlock(saved,d,pack),/Scent 10 Squares/);
});
