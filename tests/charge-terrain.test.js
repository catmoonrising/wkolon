import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {chargePath,chargeMovementCost,planCharge} from '../src/charge.js';
import {chargeControls,chargeCostLabel} from '../src/charge-ui.js';
import {rollCharge} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const noDice=()=>assert.fail('No dice before preflight');
const roller=()=>({value:12,d20:[12],display:'12',coeffs:[1]});
function hero(){const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:14,wis:10,cha:10};c.levels[0].classId='class:scoundrel';c.trainedSkills=['skill:acrobatics'];return c;}

test('Charge movement references the closed movement mapping and pinned Move source',()=>{
 validatePack(pack);assert.equal(pack.rules.charge.movementCostRule,'combatMovement');assert(pack.rules.charge.sourceIds.includes('source:wiki-move'));
 for(const mutate of [p=>p.rules.charge.movementCostRule='running',p=>p.rules.combatMovement.diagonalCost=1,p=>p.rules.charge.sourceIds.pop()]){const p=structuredClone(pack);mutate(p);assert.throws(()=>validatePack(p));}
});

test('Charge doubles diagonals and doubles diagonal low-object or difficult squares twice',()=>{
 const c=hero();c.chargePath={squares:3,diagonalSquares:1,diagonalDifficultSquares:1};assert.equal(chargeMovementCost(c,pack),7);assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.id,noDice),/exceeds Speed/);
 c.chargePath.squares=2;assert.equal(planCharge(c,derive(c,pack),pack,c.id).normalCost,6);
 c.chargePath.diagonalLowObjectSquares=1;c.chargePath.acrobatics=25;const plan=planCharge(c,derive(c,pack),pack,c.id);assert.equal(plan.normalCost,6);assert.equal(plan.dc,25);assert(plan.nimbleRequired);
 const result=rollCharge(c,derive(c,pack),pack,c.id,roller);assert.equal(result.charge.movementCost,6);assert.equal(result.results.length,1);
});

test('Cross Difficult Terrain preserves diagonals and low objects on success',()=>{
 const c=hero();c.chargePath={squares:3,difficultSquares:1,diagonalDifficultSquares:1,lowObjectSquares:1,crossTerrain:true,acrobatics:35};
 const plan=planCharge(c,derive(c,pack),pack,c.id);assert.equal(plan.normalCost,7);assert.equal(plan.successfulCost,5);assert.equal(plan.dc,35);
 const result=rollCharge(c,derive(c,pack),pack,c.id,roller);assert.equal(result.charge.movementCost,5);assert(!result.charge.stopped);
 c.chargePath={squares:3,difficultSquares:2,diagonalDifficultSquares:1,diagonalLowObjectSquares:1,crossTerrain:true};assert.equal(chargeMovementCost(c,pack),6);assert.equal(chargeMovementCost(c,pack,false),8);
});

test('Nimble Charge alone permits low objects without discounting their cost',()=>{
 const c=hero();c.chargePath={squares:3,difficultSquares:2,lowObjectSquares:2,acrobatics:25};const plan=planCharge(c,derive(c,pack),pack,c.id);assert.equal(plan.normalCost,5);assert.equal(plan.successfulCost,5);assert.equal(plan.dc,25);
 const result=rollCharge(c,derive(c,pack),pack,c.id,roller);assert.equal(result.charge.movementCost,5);assert.equal(result.results.length,1);
 c.chargePath.crossTerrain=true;assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.id,noDice),/Choose difficult squares/);
});

test('a failed terrain check restores diagonal costs without inventing a shorter Charge',()=>{
 const c=hero();c.chargePath={squares:3,difficultSquares:1,diagonalDifficultSquares:1,crossTerrain:true,acrobatics:14};const result=rollCharge(c,derive(c,pack),pack,c.id,noDice);assert.equal(result.charge.movementCost,7);assert(result.charge.stopped);assert.equal(result.results.length,0);assert.equal(c.chargePath.squares,3);
 spendAttackResources(c,result);assert.equal(c.chargeReflexPenalty,-2);assert.equal(c.chargePath.acrobatics,null);
 c.chargePath.squares=2;c.chargePath.acrobatics=14;const shorter=rollCharge(c,derive(c,pack),pack,c.id,roller);assert.equal(shorter.charge.movementCost,6);assert(!shorter.charge.stopped);assert.equal(shorter.results.length,1);
});

test('over-budget low objects remain unavailable even with a successful combined check',()=>{
 const c=hero();c.chargePath={squares:6,difficultSquares:6,lowObjectSquares:1,crossTerrain:true,acrobatics:35};const before=structuredClone(c);assert.equal(chargeMovementCost(c,pack),7);assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.id,noDice),/exceeds Speed/);assert.deepEqual(c,before);
});

test('Charge uses native speeds and current Condition Track penalties',()=>{
 const c=hero();c.species='species:gungan';c.chargePath={mode:'swim',squares:3,diagonalSquares:1};let d=derive(c,pack),plan=planCharge(c,d,pack,c.id);assert.equal(d.speeds.swim,4);assert.equal(plan.maximum,4);assert.equal(plan.normalCost,4);assert.equal(chargeCostLabel(c,d,pack),'4/4 squares');
 c.condition=4;c.chargePath.squares=2;d=derive(c,pack);assert.equal(d.speeds.swim,2);assert.throws(()=>rollCharge(c,d,pack,c.id,noDice),/exceeds Speed/);
 c.chargePath.mode='normal';plan=planCharge(c,d,pack,c.id);assert.equal(plan.maximum,3);assert.equal(plan.normalCost,3);
 c.chargePath.mode='fly';assert.throws(()=>rollCharge(c,d,pack,c.id,noDice),/Movement mode unavailable/);
});

test('failed movement is compared with the selected native speed, not walking Speed',()=>{
 const c=hero();c.species='species:gungan';c.chargePath={mode:'swim',squares:3,difficultSquares:2,crossTerrain:true,acrobatics:14};assert.equal(derive(c,pack).speed,6);const result=rollCharge(c,derive(c,pack),pack,c.id,noDice);assert.equal(result.charge.movementCost,5);assert(result.charge.stopped);assert.equal(result.results.length,0);
});

test('Charge rejects overloaded movement and impossible terrain subsets before rolling',()=>{
 for(const path of [{squares:2,diagonalSquares:2,difficultSquares:1},{squares:2,difficultSquares:1,lowObjectSquares:2},{squares:2,diagonalDifficultSquares:1,diagonalLowObjectSquares:2}]){const c=hero();c.chargePath=path;const before=structuredClone(c);assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.id,noDice));assert.deepEqual(c,before);}
 const c=hero(),d=derive(c,pack);d.load.overloaded=true;assert.throws(()=>rollCharge(c,d,pack,c.id,noDice),/full-round movement/);
});

test('legacy Charge drafts survive import without guessing low-object counts',()=>{
 const c=hero();c.chargePath={squares:3,difficultSquares:1};validateCharacter(c,pack);assert.equal(chargePath(c).diagonalSquares,0);assert.equal(planCharge(c,derive(c,pack),pack,c.id).normalCost,4);
 c.chargePath.lowObjects=true;validateCharacter(c,pack);assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.id,noDice),/Choose low object squares/);
 c.chargePath.lowObjectSquares=1;validateCharacter(c,pack);assert.equal(planCharge(c,derive(c,pack),pack,c.id).dc,25);
 c.chargePath.lowObjects=false;c.chargePath.lowObjectSquares=0;assert.equal(planCharge(c,derive(c,pack),pack,c.id).dc,null);
});

test('closed Charge state saves all path fields and rejects invalid data',()=>{
 const c=hero();c.species='species:gungan';c.chargePath={mode:'normal',squares:2,diagonalDifficultSquares:1,diagonalLowObjectSquares:1,acrobatics:25};validateCharacter(c,pack);const restored=JSON.parse(JSON.stringify(c));validateCharacter(restored,pack);assert.equal(planCharge(restored,derive(restored,pack),pack,restored.id).normalCost,5);
 for(const field of ['diagonalSquares','diagonalDifficultSquares','lowObjectSquares','diagonalLowObjectSquares'])for(const value of [-1,1.5,Infinity,100001,'1'])assert.throws(()=>validateCharacter({...c,chargePath:{...c.chargePath,[field]:value}},pack));
 for(const mode of ['',null,3,'<script>'])assert.throws(()=>validateCharacter({...c,chargePath:{...c.chargePath,mode}},pack));
});

test('Charge controls show concise costs, terrain counts, native modes and full Move rules',()=>{
 const c=hero();c.species='species:gungan';c.chargePath={mode:'swim',squares:3,diagonalSquares:1};const html=chargeControls(c,derive(c,pack),pack,c.id);assert(html.includes('4/4 squares'));assert(html.includes('data-charge-path="mode"'));assert(html.includes('data-charge-path="diagonalLowObjectSquares"'));assert(html.includes('data-rule-page="rule:move"'));assert(!html.includes('data-charge-path="lowObjects"'));
});
