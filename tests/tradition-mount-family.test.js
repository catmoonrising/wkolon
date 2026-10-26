import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/tradition-mount-fixtures.cjs';
import * as api from '../src/rules.js';
import {rollRoutine} from '../src/combat.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
test('actual tradition memberships and Assassin entry retain complete prerequisites and choices',()=>{
 for(const c of [f.believer(),f.seer(),f.rider(),f.assassin()])assert.deepEqual(api.derive(c,pack).issues,[]);
 const s=f.seer();s.forceTraditions=[];const d=api.derive(s,pack);assert(!d.ctx.talents.some(t=>t.id==='talent:quickseeing'));assert(d.issues.some(s=>s.includes('Quickseeing')));
});
test('current melee weapon dice and fixed marked-target d6 combine in real critical routines',()=>{
 const c=f.assassin();c.trainedSkills[c.trainedSkills.indexOf('skill:mechanics')]='skill:pilot';c.levels[8].feats=[{id:'feat:momentum-strike'}];assert.deepEqual(api.derive(c,pack).issues,[]);const uid=c.inventory[0].uid,before=api.derive(c,pack).attacks.find(a=>a.uid===uid);c.attackTarget={markedTarget:true,mountMovedSpeed:true};const d=api.derive(c,pack),a=d.attacks.find(a=>a.uid===uid);assert.equal(a.damageDisplay,before.damageDisplay+'+1d4+1d6');
 const pistol=d.attacks.find(a=>a.uid===c.inventory[1].uid);assert.equal(pistol.targetTraits.dice,0);assert.equal(pistol.targetTraits.fixed,'+1d6');const calls=[];rollRoutine({steps:[{attackId:uid,count:1,attackMod:0,damageMod:0}]},d.attacks,pack.rules.combat,expr=>{calls.push(expr);return {value:calls.length===1?20+a.attack:40,d20:calls.length===1?[20]:[],display:expr,coeffs:[1]};});assert.equal(calls[1],'('+a.damageDisplay+')*2');
 const saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);assert.equal(api.derive(saved,pack).attacks.find(a=>a.uid===uid).damageDisplay,a.damageDisplay);saved.levels[9].talent={id:'talent:sneak-attack'};assert.equal(api.derive(saved,pack).attacks.find(a=>a.uid===uid).damageDisplay,before.damageDisplay+'+1d4');
});
test('tradition bonuses use typed competition and do not spend a declared Quickseeing power copy',()=>{
 const c=f.seer(),initial=JSON.stringify(c.levels[0].forcePowers);c.attackTarget={quickseenTarget:true};const d=api.derive(c,pack);assert.equal(JSON.stringify(c.levels[0].forcePowers),initial);assert(d.targetTraitsUsed.includes('quickseenTarget'));
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:quickseeing').effects.push({target:'attacks',amount:3,type:'insight'});const on=api.derive(c,p).attacks[0].attack;c.attackTarget={};assert.equal(api.derive(c,p).attacks[0].attack,on,'highest insight applies once');
 const b=f.believer();b.attackTarget={nearDarkAlly:true};const baseline=api.derive(b,pack);const q=structuredClone(pack);q.talents.find(t=>t.id==='talent:sith-reverence').effects.push({target:'attacks',amount:3,type:'morale'});assert.equal(api.derive(b,q).attacks[0].attack,baseline.attacks[0].attack+2);
});
