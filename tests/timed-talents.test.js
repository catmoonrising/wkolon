import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,describeAction,beginNextTurn,endCurrentTurn,endTrackedCombat,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {advanceTimedTalents,setTimedTalentRounds} from '../src/timed-talents.js';
import {newEncounter,newDay,restEightHours} from '../src/recovery.js';
import {recoverSuite} from '../src/force-powers.js';
import {damageOutcome,applyIncomingDamage} from '../src/incoming-damage.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=()=>{const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.levels[0].talent={id:'talent:damage-reduction-10'};return c;};
const run=c=>takeAction(c,pack,'damage-reduction-10');

test('Damage Reduction 10 costs Standard and one FP, applies actual DR without changing manual protection, and prints duration',()=>{
 const c=hero(),fp=c.forcePoints;validatePack(pack);validateCharacter(c,pack);const r=run(c);assert.match(r.text,/10 rounds/);assert.equal(c.forcePoints,fp-1);assert.deepEqual(c.actionState.spent,['standard']);assert(c.actionState.forceSpent);assert.deepEqual(c.timedTalents,[{id:'damage-reduction-10',rounds:10}]);assert.equal(c.protection.dr,0);assert.equal(derive(c,pack).normalProtection.dr,10);assert.match(renderStatBlock(c,derive(c,pack),pack),/DR:<\/b> 10/);assert.match(renderStatBlock(c,derive(c,pack),pack),/10 rounds/);
});
test('actual incoming protection uses highest DR, SR before DR, and existing Lightsaber bypass/explicit armor exceptions',()=>{
 const c=hero();c.currentHP=100;c.protection.dr=6;run(c);let d=derive(c,pack);assert.equal(d.normalProtection.dr,10);let out=damageOutcome(c,{...d,threshold:1000},pack,15);assert.equal(out.drBlocked,10);assert.equal(out.hpDamage,5);
 c.protection.dr=20;d=derive(c,pack);assert.equal(d.normalProtection.dr,20);assert.equal(damageOutcome(c,d,pack,25).hpDamage,5);assert.equal(damageOutcome(c,d,pack,25,{lightsaber:true}).drBlocked,0);
 assert.equal(damageOutcome(c,{...d,armorItems:[{allowsLightsaberDR:true}]},pack,25,{lightsaber:true}).drBlocked,20);
 c.protection={dr:0,drBypass:'',sr:5,srMax:5};out=applyIncomingDamage(c,{...derive(c,pack),threshold:1000},pack,25);assert.equal(out.srBlocked,5);assert.equal(out.drBlocked,10);assert.equal(out.hpDamage,10);assert.equal(c.currentHP,90);
});
test('timed DR expires before the tenth following turn, never at End turn, and refresh replaces rather than stacking',()=>{
 const c=hero();run(c);endCurrentTurn(c,pack);assert.equal(c.timedTalents[0].rounds,10);for(let i=1;i<=9;i++){beginNextTurn(c,pack);assert.equal(c.timedTalents[0].rounds,10-i);}beginNextTurn(c,pack);assert.equal(c.timedTalents,undefined);assert.equal(derive(c,pack).normalProtection.dr,0);
 const r=hero();run(r);beginNextTurn(r,pack);run(r);assert.equal(r.timedTalents.length,1);assert.equal(r.timedTalents[0].rounds,10);assert.equal(derive(r,pack).normalProtection.dr,10);assert.equal(r.forcePoints,3);
});
test('end combat and new encounter retain remaining time; starting tracking adds no invented round, and minute/day/rest time expires it',()=>{
 const c=hero();run(c);advanceTimedTalents(c,3);endTrackedCombat(c);assert.equal(c.timedTalents[0].rounds,7);newEncounter(c);assert.equal(c.timedTalents[0].rounds,7);endTrackedCombat(c);beginNextTurn(c,pack);assert.equal(c.timedTalents[0].rounds,7);
 for(const rest of [c=>recoverSuite(c,derive(c,pack)),c=>newDay(c,pack),c=>restEightHours(c,derive(c,pack),pack)]){const h=hero();run(h);rest(h);assert.equal(h.timedTalents,undefined);}
});
test('invalid ownership, helplessness, insufficient FP and already-used FP leave actions/resources untouched',()=>{
 for(const change of [c=>c.levels[0].talent=null,c=>c.condition=5,c=>c.forcePoints=0,c=>{run(c);}]){const c=hero();change(c);const before=structuredClone(c);assert.throws(()=>run(c));assert.deepEqual(c,before);}
 const c=hero();run(c);c.levels[0].talent=null;assert.equal(derive(c,pack).normalProtection.dr,0);assert.equal(c.timedTalents[0].rounds,10);
});
test('queues/previews do not spend real FP or grant real DR, and expose later FP conflicts',()=>{
 const c=hero();queueAction(c,'damage-reduction-10',{});queueAction(c,'force-bonus',{});const before=structuredClone(c),rows=previewPlan(c,pack);assert(!rows[0].issue);assert.match(rows[1].issue,/Force Point already spent/);assert.deepEqual(c,before);assert.equal(derive(c,pack).normalProtection.dr,0);
 assert.equal(describeAction(c,pack,'damage-reduction-10').forceCost,1);
});
test('saved counters, manual duration correction and expiry are bounded and compatible with old characters',()=>{
 const c=hero();run(c);setTimedTalentRounds(c,pack,'damage-reduction-10',3);const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(derive(saved,pack).normalProtection.dr,10);advanceTimedTalents(saved,3);assert.equal(saved.timedTalents,undefined);setTimedTalentRounds(c,pack,'damage-reduction-10',0);assert.equal(c.timedTalents,undefined);
 for(const rounds of [0,11,1.5,'3'])assert.throws(()=>validateCharacter({...c,timedTalents:[{id:'damage-reduction-10',rounds}]},pack));assert.throws(()=>validateCharacter({...c,timedTalents:[{id:'unknown',rounds:1}]},pack));assert.throws(()=>advanceTimedTalents(c,-1));assert.doesNotThrow(()=>validateCharacter(hero(),pack));
});
