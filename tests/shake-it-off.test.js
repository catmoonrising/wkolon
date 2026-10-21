import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive} from '../src/rules.js';
import {takeAction,beginNextTurn,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {recoverActions} from '../src/recovery.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(feat=true){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities.con=14;c.trainedSkills=['skill:endurance'];c.levels[0].feats=feat?[{id:'feat:shake-it-off'}]:[];c.condition=3;return c;}
test('Shake It Off uses two Swift actions, including consecutive-turn partial progress; ordinary Recover still takes three',()=>{for(const feat of [false,true]){const c=hero(feat);assert.equal(recoverActions(derive(c,pack),pack),feat?2:3);takeAction(c,pack,'recover',{count:1});assert.equal(c.condition,3);beginNextTurn(c,pack);takeAction(c,pack,'recover',{count:1});assert.equal(c.condition,feat?2:3);assert.equal(c.actionState.recover.count,feat?0:2);}});
test('three Swift actions with the feat recover one step and retain one Swift of progress; lost prerequisites restore ordinary cost',()=>{const c=hero();takeAction(c,pack,'recover',{count:3});assert.equal(c.condition,2);assert.equal(c.actionState.recover.count,1);beginNextTurn(c,pack);takeAction(c,pack,'recover',{count:1});assert.equal(c.condition,1);c.trainedSkills=[];assert.equal(recoverActions(derive(c,pack),pack),3);});
test('queued recovery simulates condition changes on a copy and blocks another recovery after reaching Normal',()=>{const c=hero();c.condition=1;queueAction(c,'recover',{count:2});queueAction(c,'recover',{count:1});const before=structuredClone(c),p=previewPlan(c,pack);assert(!p[0].issue);assert.match(p[1].issue,/Recover unavailable/);assert.deepEqual(c,before);});
test('persistent conditions still block accelerated recovery atomically',()=>{const c=hero();c.recovery={secondWindsSpent:0,secondWindEncounter:false,strongBellowUsed:false,ragesSpent:0,rageRounds:0,persistent:['other']};const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'recover',{count:2}),/Recover unavailable/);assert.deepEqual(c,before);});
