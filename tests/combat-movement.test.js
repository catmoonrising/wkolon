import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {runningPath,withdrawPath,movementSegment,movementCost,planWithdraw,planRunningAttack,validateSegment} from '../src/combat-movement.js';
import {runningAttackPlan,rollRunningAttack,withdraw} from '../src/combat-movement-actions.js';
import {spendAttackResources} from '../src/ammunition.js';
import {renderStatBlock} from '../src/stat-block.js';
import {runningAttackControls,withdrawControls} from '../src/combat-movement-ui.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:16,con:10,int:14,wis:10,cha:10};c.levels[0].classId='class:soldier';c.levels[0].feats=[{id:'feat:running-attack'},{id:'feat:dodge'}];
 c.levels.push({classId:'class:soldier',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:soldier',hpRoll:5,feats:[{id:'feat:mobility'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 c.inventory=['knife','blaster-pistol','blaster-rifle'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='knife'?{}:{shotsRemaining:20})}));return c;
}
const roller=(natural=12,calls=[])=>expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?natural+Number(m[1]):9,d20:m?[natural]:[],display:expr,coeffs:[1]};};
const noDice=()=>assert.fail('No dice before validation');
const shot=c=>c.inventory[1].uid;
function path(c,before,after=0){c.runningAttack={mode:'normal',before:movementSegment(typeof before==='number'?{squares:before}:before),after:movementSegment(typeof after==='number'?{squares:after}:after)};}
function exit(c,squares,clearThreats=true){c.withdraw={...withdrawPath(c),clearThreats,path:movementSegment(typeof squares==='number'?{squares}:squares)};}

test('movement counts disjoint normal, diagonal, difficult, and both squares at 1/2/2/4',()=>{
 const r=pack.rules.combatMovement;
 assert.equal(movementCost(movementSegment({squares:4}),r),4);
 assert.equal(movementCost(movementSegment({squares:4,diagonal:4}),r),8);
 assert.equal(movementCost(movementSegment({squares:4,difficult:4}),r),8);
 assert.equal(movementCost(movementSegment({squares:4,diagonalDifficult:4}),r),16);
 assert.equal(movementCost(movementSegment({squares:4,diagonal:1,difficult:1,diagonalDifficult:1}),r),9);
 for(const p of [{squares:1,diagonal:1,difficult:1},{squares:2,diagonalDifficult:3},{squares:-1},{squares:1.5},{squares:2,terrainBonus:-3},null,[]])assert.throws(()=>validateSegment(p,message=>{throw Error(message);}),/movement/);
});
test('Running Attack requires the eligible feat, one available weapon attack, and a total path within Speed',()=>{
 const c=hero();path(c,3,3);let p=runningAttackPlan(c,pack,shot(c));assert.equal(p.cost,6);assert.equal(p.routine.steps.length,1);assert.equal(p.routine.steps[0].count,1);
 path(c,4,3);assert.throws(()=>rollRunningAttack(c,pack,shot(c),noDice),/exceeds Speed/);
 path(c,{squares:2,diagonalDifficult:2},0);assert.throws(()=>rollRunningAttack(c,pack,shot(c),noDice),/exceeds Speed/);
 path(c,1,1);c.abilities.dex=12;assert.throws(()=>rollRunningAttack(c,pack,shot(c),noDice),/Requires Running Attack/);c.abilities.dex=16;
 c.defenseStance='total';assert.throws(()=>rollRunningAttack(c,pack,shot(c),noDice),/Total Defense/);c.defenseStance='none';c.helpless=true;assert.throws(()=>rollRunningAttack(c,pack,shot(c),noDice),/unavailable/);
});
test('a single Running Attack spends one attack worth of ammunition; misses still spend it',()=>{
 const c=hero();path(c,2,2);const before=derive(c,pack),result=rollRunningAttack(c,pack,shot(c),roller(1));assert.equal(result.results.length,1);assert(result.results[0].naturalMiss);assert.equal(result.results[0].total,1+before.attacks[1].attack);assert.deepEqual(result.movement,{before:2,after:2,cost:4,maximum:6,mode:'normal'});
 spendAttackResources(c,result);assert.equal(c.inventory[1].shotsRemaining,19);assert.equal(c.runningAttack.before.squares,2);
 c.inventory[1].shotsRemaining=0;c.inventory[1].aimed=true;assert.throws(()=>rollRunningAttack(c,pack,shot(c),noDice),/unavailable|needs/);assert.equal(c.inventory[1].aimed,true);
});
test('moving before the attack removes Aim and scope range/darkness benefits before any dice',()=>{
 const c=hero();c.inventory.push({id:'equipment:targeting-scope-low-light',uid:crypto.randomUUID(),quantity:1,equipped:false,twoHanded:false,attackMod:0,damageMod:0});c.inventory[1].scopeUid=c.inventory[3].uid;c.inventory[1].aimed=true;c.inventory[1].distance=60;c.attackTarget={concealment:'concealment',darkness:true,cover:'cover'};
 path(c,1,0);const aimed=derive(c,pack).attacks[1],p=runningAttackPlan(c,pack,shot(c));assert.equal(p.attack.aimed,false);assert.equal(p.attack.coverBonus,5);assert.equal(p.attack.ignoresDarkness,false);assert(p.attack.attack<aimed.attack);assert.equal(c.inventory[1].aimed,true);
 const result=rollRunningAttack(c,pack,shot(c),roller());assert.equal(result.results[0].aimed,false);spendAttackResources(c,result);assert.equal(c.inventory[1].aimed,false);
});
test('movement after the attack preserves its Aim benefit, then clears all Aim and Brace declarations',()=>{
 const c=hero();c.inventory[1].aimed=true;c.inventory[2].aimed=true;c.attackTarget={cover:'improved'};path(c,0,2);
 const p=runningAttackPlan(c,pack,shot(c));assert.equal(p.attack.aimed,true);assert.equal(p.attack.coverBonus,0);const result=rollRunningAttack(c,pack,shot(c),roller());assert.equal(result.results[0].aimed,true);
 spendAttackResources(c,result);assert(c.inventory.every(e=>!e.aimed));
 c.inventory[2]={...c.inventory[2],id:'equipment:heavy-repeating-blaster',braced:true,shotsRemaining:40};path(c,1,0);const unbraced=runningAttackPlan(c,pack,c.inventory[2].uid);assert.equal(unbraced.attack.braced,false);
 const pending=rollRunningAttack(c,pack,c.inventory[2].uid,roller());spendAttackResources(c,pending);assert.equal(c.inventory[2].braced,false);assert.equal(c.inventory[2].shotsRemaining,30);
 c.inventory[2].braced=true;path(c,0,1);const braced=rollRunningAttack(c,pack,c.inventory[2].uid,roller());assert.equal(braced.results[0].braced,true);spendAttackResources(c,braced);assert.equal(c.inventory[2].braced,false);
});
test('Running Attack preserves ongoing full-attack/defensive penalties and next-melee Mighty Swing',()=>{
 const c=hero();c.levels[1].feats=[{id:'feat:mighty-swing'}];c.mightySwing=true;path(c,1,1);c.fullAttackPenalties={twoWeapons:-10,doubleAttack:-5,tripleAttack:0};c.defenseStance='fight';const d=derive(c,pack),result=rollRunningAttack(c,pack,shot(c),roller());assert.equal(result.results[0].total,12+d.attacks[1].attack);spendAttackResources(c,result);assert.equal(c.fullAttackPenalties.twoWeapons,-10);assert.equal(c.defenseStance,'fight');
 assert.equal(c.mightySwing,true);exit(c,1);withdraw(c,derive(c,pack),pack);assert.equal(c.mightySwing,true);const melee=rollRunningAttack(c,pack,c.inventory[0].uid,roller());assert(melee.results[0].mightySwing);spendAttackResources(c,melee);assert.equal(c.mightySwing,false);
});
test('Withdraw requires clearing all threats in the first square and only grants protection for that square',()=>{
 const c=hero();exit(c,3,false);assert.throws(()=>withdraw(c,derive(c,pack),pack),/every threatened area/);c.withdraw.clearThreats=true;const p=planWithdraw(c,derive(c,pack),pack);assert.equal(p.maximum,3);assert.equal(p.protectedSquares,1);
 c.inventory[1].aimed=true;c.inventory[2].braced=true;c.defenseStance='total';const result=withdraw(c,derive(c,pack),pack);assert(result.text.includes('only the first square'));assert.equal(c.inventory[1].aimed,false);assert.equal(c.inventory[2].braced,false);assert.equal(c.defenseStance,'total');
 exit(c,4);assert.throws(()=>withdraw(c,derive(c,pack),pack),/half Speed/);exit(c,0);assert.throws(()=>withdraw(c,derive(c,pack),pack),/requires movement/);exit(c,{squares:1,diagonalDifficult:1});assert.throws(()=>withdraw(c,derive(c,pack),pack),/half Speed/);
});
test('movement budgets use adjusted Speed, native Swim, and straining action restrictions',()=>{
 const c=hero();c.species='species:gungan';path(c,2,2);c.runningAttack.mode='swim';assert.equal(runningAttackPlan(c,pack,shot(c)).maximum,4);exit(c,2);c.withdraw.mode='swim';assert.equal(planWithdraw(c,derive(c,pack),pack).maximum,2);
 c.condition=4;assert.throws(()=>runningAttackPlan(c,pack,shot(c)),/exceeds Speed/);assert.throws(()=>planWithdraw(c,derive(c,pack),pack),/half Speed/);
 c.condition=0;c.runningAttack.mode='fly';assert.throws(()=>runningAttackPlan(c,pack,shot(c)),/mode unavailable/);
 c.runningAttack.mode='normal';c.inventory.push({id:'equipment:utility-belt-empty',uid:crypto.randomUUID(),quantity:1000,equipped:false,twoHanded:false,attackMod:0,damageMod:0});
 const fixture={...derive(c,pack),load:{overloaded:true},speed:1};path(c,1,0);assert.throws(()=>planRunningAttack(c,fixture,pack,shot(c)),/full-round/);exit(c,1);assert.throws(()=>planWithdraw(c,fixture,pack),/full-round/);
});
test('armor-adjusted and odd native speeds set whole-square movement budgets',()=>{
 const c=hero();c.species='species:gungan';c.inventory.push({id:'equipment:heavy-battle-armor',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
 path(c,2,2);let d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.speeds.swim,3);assert.equal(runningAttackPlan(c,pack,shot(c)).maximum,4);
 c.runningAttack.mode='swim';assert.throws(()=>runningAttackPlan(c,pack,shot(c)),/exceeds Speed/);path(c,1,2);c.runningAttack.mode='swim';assert.equal(runningAttackPlan(c,pack,shot(c)).maximum,3);
 exit(c,1);c.withdraw.mode='swim';assert.equal(planWithdraw(c,d,pack).maximum,1);c.withdraw.path.squares=2;assert.throws(()=>planWithdraw(c,d,pack),/half Speed/);
 c.condition=4;d=derive(c,pack);assert.equal(d.speed,2);assert.equal(d.speeds.swim,1);path(c,1,0);c.runningAttack.mode='swim';assert.equal(runningAttackPlan(c,pack,shot(c)).maximum,1);
});
test('Running Attack + Dodge covers any opportunity, Mobility only movement; designated Dodge never doubles',()=>{
 const c=hero();c.dodgeOpponent='Vader';let d=derive(c,pack);const all=d.conditionalDefenses.find(r=>r.against==='running-attack-opportunity'),moving=d.conditionalDefenses.find(r=>r.against==='running-attack-movement-opportunity');assert.equal(all.amount,1);assert.equal(all.total,d.defenses.reflex+1);assert.equal(moving.amount,6);assert.equal(moving.total,d.defenses.reflex+6);
 const print=renderStatBlock(c,d,pack);assert(print.includes('Running Attack AoO'));assert(print.includes('Running Attack movement AoO'));
 c.flatFooted=true;d=derive(c,pack);assert.equal(d.conditionalDefenses.find(r=>r.against==='running-attack-opportunity').amount,0);assert.equal(d.conditionalDefenses.find(r=>r.against==='running-attack-movement-opportunity').amount,0);
 c.flatFooted=false;c.abilities.dex=12;d=derive(c,pack);assert(!d.conditionalDefenses.some(r=>r.against.startsWith('running-attack')));
});
test('movement paths save, partial defaults merge, and invalid fields/types fail import validation',()=>{
 const c=hero();c.runningAttack={before:{squares:2}};assert.equal(runningPath(c).before.diagonal,0);validateCharacter(c,pack);exit(c,2);const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(saved.runningAttack.before.squares,2);
 for(const value of [null,[],{mode:9},{before:null},{before:{squares:1,diagonal:1,difficult:1}},{before:{squares:2,bonus:100}},{freeMove:true}])assert.throws(()=>validateCharacter({...c,runningAttack:value},pack),/runningAttack|movement/);
 for(const value of [null,[],{clearThreats:1},{path:{squares:1.5}},{protectedSquares:10}])assert.throws(()=>validateCharacter({...c,withdraw:value},pack),/Withdraw|withdraw|movement/);
 c.runningAttack.mode='swim';c.species='species:human';const ui=runningAttackControls(c,derive(c,pack),pack,derive(c,pack).attacks[1]);assert(ui.includes('swim (unavailable)'));assert(ui.includes('value="normal"'));
 assert(withdrawControls(c,derive(c,pack),pack).includes('Clear threats in 1 square'));
});
test('movement mappings preserve pinned official passages and reject invented costs or immunity',()=>{
 validatePack(pack);for(const [key,value] of [['diagonalCost',1],['diagonalDifficultCost',2],['withdraw',{action:'move-action',speedMultiplier:1,protectedSquares:10,shortestRoute:false}]]){const bad=structuredClone(pack);bad.rules.combatMovement[key]=value;assert.throws(()=>validatePack(bad),/combat movement/);}
 const text=id=>articleText(pack.rulePages.find(r=>r.id==='rule:'+id).article);assert(text('move').includes('each square counts as 4 squares'));assert(text('withdraw').includes('only if you can clear all Threatened Areas'));assert(text('running-attack').includes('against anyone who makes an'));
});
