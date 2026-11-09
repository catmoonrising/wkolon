import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import {takeAction,executeAction,previewPlan,beginNextTurn,endCurrentTurn,endTrackedCombat} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {newEncounter,newDay,setDead,restEightHours} from '../src/recovery.js';
import {recoverSuite} from '../src/force-powers.js';
import {validatePack} from '../tools/validate-rules.js';
import make from '../tools/renew-vision-fixtures.cjs';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),D=c=>api.derive(c,pack),no=()=>{throw Error('No roll expected');},run=c=>takeAction(c,pack,'renew-vision',{},no);
const untouched=(c,fn,re=/./)=>{const before=structuredClone(c);assert.throws(fn,re);assert.deepEqual(c,before);};
test('Renew Vision is source-bound, Partial and obtainable on a complete legal Jedi',()=>{
 validatePack(pack);const c=f.hero();assert.deepEqual(D(c).issues,[]);const source=pack.sources.find(s=>s.id==='source:wiki-jedi-consular-talent-tree-renew-vision');assert.equal(source.revision,26763);assert.equal(source.sha256,'8467d26c7922a64c6284697d6ab72db6b796fdf4a209159bdbf7922c562b9ddb');
 const bad=structuredClone(pack);bad.rules.powerRecoveryActions[0].powerId='power:surge';assert.throws(()=>validatePack(bad));
});
test('one Swift restores all expended Farseeing copies, without FP or unrelated power changes',()=>{
 const c=f.hero(),fp=c.forcePoints;run(c);assert.deepEqual(c.levels[0].forcePowers.map(p=>p.spent),[false,false,true]);assert.equal(c.forcePoints,fp);assert.equal(c.actionState.forceSpent,false);assert.deepEqual(c.actionState.spent,['swift']);assert.deepEqual(c.powerRecoveriesUsed,['renew-vision']);assert.equal(c.farseeing,undefined);assert.equal(c.actionState.plan[0].status,'done');assert.match(c.actionState.plan[0].result.text,/2 Farseeing uses recovered/);api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 const zero=f.hero();zero.forcePoints=0;beginNextTurn(zero,pack);zero.actionState.forceSpent=true;run(zero);assert.equal(zero.forcePoints,0);assert(zero.actionState.forceSpent);
});
test('spent encounter use persists after re-expending copies, turn changes, source edits, death and revival',()=>{
 const c=f.hero();run(c);c.levels[0].forcePowers[0].spent=true;beginNextTurn(c,pack);untouched(c,()=>run(c),/Already used/);
 c.levels[2].talent=null;untouched(c,()=>run(c),/unavailable/);c.levels[2].talent={id:'talent:renew-vision'};untouched(c,()=>run(c),/Already used/);
 setDead(c,true,pack);assert.deepEqual(c.powerRecoveriesUsed,['renew-vision']);setDead(c,false,pack);c.currentHP=1;c.condition=4;beginNextTurn(c,pack);untouched(c,()=>run(c),/Already used/);
 const copy=JSON.parse(JSON.stringify(c));api.validateCharacter(copy,pack);untouched(copy,()=>run(copy),/Already used/);
});
test('only encounter/day/end-combat/eight-hour boundaries reset uses, not ordinary suite recovery',()=>{
 for(const reset of [c=>newEncounter(c),c=>newDay(c,pack),c=>endTrackedCombat(c),c=>restEightHours(c,D(c),pack)]){const c=f.hero();run(c);reset(c);assert.equal(c.powerRecoveriesUsed,undefined);c.levels[0].forcePowers[0].spent=true;run(c);}
 const c=f.hero();run(c);recoverSuite(c,D(c));assert.deepEqual(c.powerRecoveriesUsed,['renew-vision']);
});
test('no active expended Farseeing or unavailable talent/turn/actions cannot alter state',()=>{
 for(const mutate of [c=>c.levels[0].forcePowers.forEach(p=>p.spent=false),c=>{c.levels[0].forcePowers=c.levels[0].forcePowers.filter(p=>p.powerId!=='power:farseeing');},c=>c.levels[2].talent=null,c=>c.condition=5,c=>{beginNextTurn(c,pack);endCurrentTurn(c,pack);},c=>{beginNextTurn(c,pack);c.actionState.spent=['standard','move','swift'];}]){const c=f.hero();mutate(c);untouched(c,()=>run(c));}
});
test('preview reserves encounter use and restores copies only on clone; execution rechecks stale queue',()=>{
 const c=f.hero();beginNextTurn(c,pack);const a=queueAction(c,'renew-vision');queueAction(c,'renew-vision');const before=structuredClone(c),preview=previewPlan(c,pack);assert(!preview[0].issue);assert.match(preview[1].issue,/Already used/);assert.deepEqual(c,before);
 c.levels[0].forcePowers.slice(0,2).forEach(p=>p.spent=false);untouched(c,()=>executeAction(c,pack,a.id,no),/No spent uses/);c.levels[0].forcePowers[0].spent=true;executeAction(c,pack,a.id,no);assert.equal(c.actionState.plan[0].status,'done');assert.deepEqual(c.powerRecoveriesUsed,['renew-vision']);
});
test('the encounter ledger is closed, bounded and source-qualified',()=>{
 for(const value of [null,{},'renew-vision',[1],['unknown'],['renew-vision','renew-vision']]){const c=f.hero();c.powerRecoveriesUsed=value;assert.throws(()=>api.validateCharacter(c,pack),/power recoveries/);}
});
