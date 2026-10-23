import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {movementSegment,movementCost,terrainMovementCost,validateSegment,planRunningAttack,planWithdraw} from '../src/combat-movement.js';
import {planAcrobaticsMove,acrobaticsMoveCost} from '../src/acrobatics-movement.js';
import {acrobaticsMove} from '../src/acrobatics-movement-actions.js';
import {chargeMovementCost,planCharge} from '../src/charge.js';
import {planBalance} from '../src/balance.js';
import {queueAction} from '../src/action-economy.js';
import {executeAction,previewPlan,beginNextTurn,takeAction} from '../src/action-engine.js';
import {runningCostLabel,withdrawCostLabel,runningAttackControls} from '../src/combat-movement-ui.js';
import {acrobaticsMoveControls} from '../src/acrobatics-movement-ui.js';
import {chooseSpeciesOption} from '../src/species-choices.js';
import {setGenerationMethod,setPoolScore,assignScore} from '../src/ability-generation.js';
import {prepareDroidSystems,chooseDroidArm,installDroidSystem} from '../src/droid-installation.js';
import {rollCombatRoutine} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {followUpState,planFollowThrough} from '../src/attack-follow-ups.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),r=pack.rules.combatMovement;
function hero(talent=true){const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:acrobatics'];for(let n=2;n<=7;n++)c.levels.push({classId:'class:scout',hpRoll:5,startingFeat:null,talent:n===2&&talent?{id:'talent:surefooted'}:null,feats:n===7?[{id:'feat:running-attack'}]:[],trainedSkills:[],abilityIncreases:[]});c.inventory=['knife','blaster-pistol'].map(id=>({uid:crypto.randomUUID(),id:'equipment:'+id,quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='blaster-pistol'?{shotsRemaining:20}:{})}));c.currentHP=derive(c,pack).hp;validateCharacter(c,pack);return c;}
const noRoll=()=>{throw Error('Unexpected roll');};

test('Surefooted changes shared terrain cost, not base Speed or diagonal costs, and does not apply when ownership is lost',()=>{
 const c=hero(),d=derive(c,pack);assert(d.ignoreDifficultTerrain);assert.equal(d.speed,6);assert.equal(movementCost(movementSegment({squares:4,difficult:4}),r,d),4);assert.equal(movementCost(movementSegment({squares:4,diagonalDifficult:4}),r,d),8);assert.equal(movementCost(movementSegment({squares:4,diagonal:1,difficult:1,diagonalDifficult:1}),r,d),6);c.levels[1].talent=null;const ordinary=derive(c,pack);assert(!ordinary.ignoreDifficultTerrain);assert.equal(movementCost(movementSegment({squares:4,difficult:4}),r,ordinary),8);assert.equal(ordinary.speed,d.speed);
});
test('low-object subsets retain costs, validate bounds and are not discounted again by an Acrobatics success',()=>{
 const d=derive(hero(),pack),p=movementSegment({squares:4,difficult:2,diagonalDifficult:2,lowObjects:1,diagonalLowObjects:1});assert.equal(movementCost(p,r,d),9);assert.equal(terrainMovementCost(p,r,true,d),9);assert.equal(terrainMovementCost(p,r,true),9);assert.equal(terrainMovementCost(p,r,false),12);
 for(const patch of [{lowObjects:3},{diagonalLowObjects:3},{lowObjects:-1},{lowObjects:null},{lowObjects:1.5},{diagonalLowObjects:'1'}])assert.throws(()=>validateSegment({...p,...patch},message=>{throw Error(message);}));validateSegment(p,noRoll);
 const c=hero();c.runningAttack={before:p,after:movementSegment()};validateCharacter(c,pack);const saved=JSON.parse(JSON.stringify(c));assert.equal(saved.runningAttack.before.lowObjects,1);
});
test('Move, Charge, Running Attack, Withdraw and Balance share the same permission and their normal limits',()=>{
 const c=hero(),d=derive(c,pack);c.acrobaticsMovement={path:{squares:6,difficult:6}};assert.equal(planAcrobaticsMove(c,d,pack).cost,6);assert.equal(acrobaticsMove(c,d,pack,noRoll).cost,6);
 c.chargePath={squares:6,difficultSquares:6};assert.equal(planCharge(c,d,pack,c.inventory[0].uid).normalCost,6);assert.equal(chargeMovementCost(c,pack,false,d),6);
 c.runningAttack={before:movementSegment({squares:3,difficult:3}),after:movementSegment({squares:3,difficult:3})};assert.equal(planRunningAttack(c,d,pack,c.inventory[1].uid).cost,6);assert.equal(runningCostLabel(c,d,pack),'6/6 squares');
 c.withdraw={clearThreats:true,path:movementSegment({squares:3,difficult:3})};assert.equal(planWithdraw(c,d,pack).cost,3);assert.equal(withdrawCostLabel(c,d,pack),'3/3 squares');
 c.balance={check:20,path:movementSegment({squares:3,difficult:3})};assert.equal(planBalance(c,d,pack).cost,3);assert.equal(planBalance(c,d,pack).maximum,3);
 c.levels[1].talent=null;const ordinary=derive(c,pack);for(const attempt of [()=>planAcrobaticsMove(c,ordinary,pack),()=>planCharge(c,ordinary,pack,c.inventory[0].uid),()=>planRunningAttack(c,ordinary,pack,c.inventory[1].uid),()=>planWithdraw(c,ordinary,pack),()=>planBalance(c,ordinary,pack)])assert.throws(attempt,/exceeds|exceed|Speed/);
});
test('Surefooted does not waive Tumble or Nimble Charge checks, low-object costs, or the chosen terrain ambiguity',()=>{
 const c=hero(),d=derive(c,pack);c.acrobaticsMovement={tumble:true,check:20,path:{squares:3,difficult:3},tumbled:{squares:3,difficult:3}};assert.equal(acrobaticsMoveCost(c,pack,false,d),6);const rolled=acrobaticsMove(c,d,pack,noRoll);assert.equal(rolled.cost,6);assert.equal(rolled.protectedSquares,3);
 c.chargePath={squares:3,difficultSquares:3,lowObjectSquares:1};const p=planCharge(c,d,pack,c.inventory[0].uid);assert.equal(p.normalCost,4);assert.equal(p.dc,25);
 c.chargePath.lowObjectSquares=0;c.houseRules={ambiguities:{'ambiguity:charge-difficult-terrain':'nimble-check'}};assert.equal(planCharge(c,derive(c,pack),pack,c.inventory[0].uid).dc,25);
 const q=hero();q.trainedSkills=[];q.levels[0].feats=[];q.chargePath={squares:3,difficultSquares:3,lowObjectSquares:1};assert.throws(()=>planCharge(q,derive(q,pack),pack,q.inventory[0].uid),/trained Acrobatics/);
});
test('queued paths are immutable and preflight uses current access before spending an action or ammunition',()=>{
 const c=hero(),path={mode:'normal',path:movementSegment({squares:6,difficult:6})},step=queueAction(c,'move',{path});path.path.squares=1;const before=structuredClone(c);assert(!previewPlan(c,pack)[0].issue);assert.deepEqual(c,before);const result=executeAction(c,pack,step.id,noRoll);assert.match(result.text,/6\/6 movement/);assert.deepEqual(c.actionState.spent,['move']);assert.equal(c.actionState.plan[0].options.path.path.squares,6);beginNextTurn(c,pack);const stale=queueAction(c,'move',{path:{path:movementSegment({squares:6,difficult:6})}});c.levels[1].talent=null;const saved=structuredClone(c);assert.throws(()=>executeAction(c,pack,stale.id,noRoll),/Speed/);assert.deepEqual(c,saved);
});
test('Droid locomotion is applied once, and Surefooted discounts actual terrain rather than obstacles',()=>{
 const c=hero();c.species='species:custom-droid';chooseSpeciesOption(c,pack,'size','small');chooseSpeciesOption(c,pack,'degree','degree-4');chooseSpeciesOption(c,pack,'language','basic');setGenerationMethod(c,'manual',pack);for(const [i,a]of ['str','dex','int','wis','cha'].entries()){setPoolScore(c,i,14,pack);assignScore(c,a,i,pack);}prepareDroidSystems(c,pack);chooseDroidArm(c,pack,1,'equipment:hand');chooseDroidArm(c,pack,2,'equipment:hand');for(const e of c.inventory.filter(e=>e.droidGrant?.slot==='locomotion'))installDroidSystem(c,pack,e.uid,false);
 const entry={uid:crypto.randomUUID(),id:'equipment:wheeled',quantity:1,equipped:false,carried:true,twoHanded:false,attackMod:0,damageMod:0,systemSize:'small',systemOrdinal:1,weightOverride:0};c.inventory.push(entry);installDroidSystem(c,pack,entry.uid,true);const d=derive(c,pack),p=movementSegment({squares:2,difficult:1,diagonalDifficult:1});assert.equal(movementCost(p,r,d),3);assert.equal(movementCost({...p,lowObjects:1,diagonalLowObjects:1},r,d),12);c.levels[1].talent=null;assert.equal(movementCost(p,r,derive(c,pack)),12);validateCharacter(c,pack);
});
test('new low-object controls are folded, concise and retained after talent edits',()=>{
 const c=hero();c.runningAttack={before:movementSegment({squares:2,difficult:2,lowObjects:1})};let d=derive(c,pack);assert(runningAttackControls(c,d,pack,d.attacks.find(a=>a.uid===c.inventory[1].uid)).includes('runningAttack.before.lowObjects'));assert(acrobaticsMoveControls(c,d,pack).includes('path.lowObjects'));c.levels[1].talent=null;d=derive(c,pack);assert(runningAttackControls(c,d,pack,d.attacks.find(a=>a.uid===c.inventory[1].uid)).includes('runningAttack.before.lowObjects'));assert(!acrobaticsMoveControls(c,d,pack).includes('path.lowObjects'));
});
test('terrain contract rejects changed costs, missing pinned sources and unsupported mechanics',()=>{
 validatePack(pack);for(const change of [p=>p.rules.terrainMovementAbilities[0].ignoreDifficultTerrain=false,p=>p.rules.terrainMovementAbilities[0].sourceIds=[],p=>p.talents=p.talents.filter(t=>t.id!=='talent:surefooted')]){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
});

test('Follow Through retains its trigger and once-per-turn cost while honoring terrain movement',()=>{
 const c=hero();c.levels[0].feats.push({id:'feat:power-attack'});c.levels[2].feats=[{id:'feat:cleave'}];for(let n=8;n<=9;n++)c.levels.push({classId:'class:scout',hpRoll:5,talent:null,startingFeat:null,feats:n===9?[{id:'feat:follow-through'}]:[],trainedSkills:[],abilityIncreases:[]});
 const d=derive(c,pack),routine={name:'Cut',steps:[{attackId:c.inventory[0].uid,count:1,attackMod:0,damageMod:0}]};
 const result=rollCombatRoutine(routine,d,pack,expr=>({value:expr.startsWith('1d20')?15+Number(expr.slice(4)):9,d20:expr.startsWith('1d20')?[15]:[],display:expr}));spendAttackResources(c,result);c.followUp={...followUpState(c),opponent:'A',dropped:true,immediate:true,path:movementSegment({squares:6,difficult:6})};assert.equal(planFollowThrough(c,derive(c,pack),pack).cost,6);c.levels[1].talent=null;assert.throws(()=>planFollowThrough(c,derive(c,pack),pack),/Speed/);
});

test('condition penalties still reduce actual Speed and remain separate from terrain permission',()=>{
 const c=hero();c.condition=4;const d=derive(c,pack);assert.equal(d.speed,3);c.acrobaticsMovement={path:{squares:3,difficult:3}};assert.equal(planAcrobaticsMove(c,d,pack).cost,3);c.acrobaticsMovement.path.squares=4;c.acrobaticsMovement.path.difficult=4;assert.throws(()=>planAcrobaticsMove(c,d,pack),/exceeds Speed/);
});
