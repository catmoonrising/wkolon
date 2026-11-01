import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/encounter-reaction-fixtures.cjs';
import * as api from '../src/rules.js';
import {takeAction,beginNextTurn,endCurrentTurn,endTrackedCombat} from '../src/action-engine.js';
import {newEncounter} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const noRoll=()=>{throw Error('Should not roll');};
let triggers=0;
const react=(c,id,o={})=>takeAction(c,pack,id,{trigger:'Attack '+(++triggers),...o},noRoll);
const def=(c,k)=>api.derive(c,pack).defenses[k];

test('rows pin their records, durations and types; the validator rejects a changed row',()=>{
 validatePack(pack);
 assert.deepEqual(pack.rules.encounterDefenseReactions.map(r=>[r.id,r.defenses.length,r.ability??r.amount,r.type,r.duration]),[['brilliant-defense',1,'int','untyped','start-next-turn'],['indomitable-personality',1,'cha','untyped','end-next-turn'],['logic-upgrade-self-defense',3,2,'morale','end-next-turn'],['better-lucky-than-dead',3,5,'luck','start-next-turn']]);
 const bad=structuredClone(pack);bad.rules.encounterDefenseReactions[0].duration='end-next-turn';assert.throws(()=>validatePack(bad));
});
test('Brilliant Defense adds INT to Reflex until the start of the next turn',()=>{
 const c=f.both(),base=def(c,'reflex');beginNextTurn(c,pack);react(c,'brilliant-defense');assert.equal(def(c,'reflex'),base+3);assert.equal(c.forcePoints,api.derive(f.both(),pack).forceCurrent);
 endCurrentTurn(c,pack);assert.equal(def(c,'reflex'),base+3,'survives the end of this turn');beginNextTurn(c,pack);assert.equal(def(c,'reflex'),base,'ends at the start of the next');assert.equal(c.defenseReactions,undefined);
});
test('Indomitable Personality adds CHA to Will through the end of the next turn',()=>{
 const own=f.both(),base=def(own,'will');beginNextTurn(own,pack);react(own,'indomitable-personality');endCurrentTurn(own,pack);beginNextTurn(own,pack);assert.equal(def(own,'will'),base+3,'through next turn');endCurrentTurn(own,pack);assert.equal(def(own,'will'),base);
 const off=f.both();beginNextTurn(off,pack);endCurrentTurn(off,pack);react(off,'indomitable-personality');assert.equal(def(off,'will'),base+3);beginNextTurn(off,pack);assert.equal(def(off,'will'),base+3);endCurrentTurn(off,pack);assert.equal(def(off,'will'),base);
});
test('once per encounter: the use outlasts the benefit and clears with the encounter',()=>{
 const c=f.both();beginNextTurn(c,pack);react(c,'brilliant-defense');assert.throws(()=>react(c,'brilliant-defense'),/Already used/);beginNextTurn(c,pack);assert.equal(c.defenseReactions,undefined);assert.throws(()=>react(c,'brilliant-defense'),/Already used/);
 newEncounter(c);assert.equal(c.defenseReactionsUsed,undefined);react(c,'brilliant-defense');
 const combat=f.both();beginNextTurn(combat,pack);react(combat,'indomitable-personality');endCurrentTurn(combat,pack);endTrackedCombat(combat);api.validateCharacter(JSON.parse(JSON.stringify(combat)),pack);
});
test('one Reaction per trigger is shared with other Reactions',()=>{
 const c=f.both();beginNextTurn(c,pack);takeAction(c,pack,'brilliant-defense',{trigger:'Same'},noRoll);assert.throws(()=>takeAction(c,pack,'indomitable-personality',{trigger:'Same'},noRoll));
});
test('Better Lucky than Dead: chosen Defense, luck typed stacking',()=>{
 const c=f.lucky(),base=def(c,'fortitude');beginNextTurn(c,pack);assert.throws(()=>react(c,'better-lucky-than-dead',{defense:'speed'}),/Choose a Defense/);react(c,'better-lucky-than-dead',{defense:'fortitude'});assert.equal(def(c,'fortitude'),base+5);assert.equal(def(c,'will'),api.derive(f.lucky(),pack).defenses.will);
});
test('losing the record suppresses the benefit and unowned reactions are refused',()=>{
 const c=f.both(),base=def(c,'reflex');beginNextTurn(c,pack);react(c,'brilliant-defense');c.levels[0].feats=c.levels[0].feats.filter(x=>x.id!=='feat:brilliant-defense');assert(def(c,'reflex')<=base);
 assert.throws(()=>react(f.both(),'better-lucky-than-dead'),/unavailable/);
});
test('invalid saves are rejected',()=>{
 for(const change of [c=>{c.defenseReactions=[{id:'brilliant-defense',defense:'will',until:'start-next-turn',endsRemaining:1,ended:true}];c.defenseReactionsUsed=['brilliant-defense'];},c=>{c.defenseReactions=[{id:'brilliant-defense',defense:'reflex',until:'start-next-turn',endsRemaining:1,ended:true}];},c=>{c.defenseReactionsUsed=['nope'];},c=>{c.defenseReactions=[{id:'brilliant-defense',defense:'reflex',until:'end-next-turn',endsRemaining:1,ended:true}];c.defenseReactionsUsed=['brilliant-defense'];},c=>{c.defenseReactionsUsed=['brilliant-defense','brilliant-defense'];}]){const c=f.both();change(c);assert.throws(()=>api.validateCharacter(c,pack));}
});
