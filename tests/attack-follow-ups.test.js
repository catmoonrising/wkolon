import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollCombatRoutine,rollCharge} from '../src/combat.js';
import {rollCleave,cleavePlan,followThrough} from '../src/attack-follow-up-actions.js';
import {followUpState,planCleave,planFollowThrough,nextCombatantTurn,validateFollowUps} from '../src/attack-follow-ups.js';
import {rollRoutineStep} from '../src/routine-steps.js';
import {validateRoutineProgress} from '../src/routine-progress.js';
import {spendAttackResources,reloadWeapon} from '../src/ammunition.js';
import {catchSecondWind} from '../src/recovery.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {startNextRound} from '../src/opportunity.js';
import {followUpControls} from '../src/attack-follow-up-ui.js';
import {createStore,STORAGE_KEY,validateRoster} from '../src/persistence.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero({great=false,follow=false}={}){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:16,dex:14,con:10,int:14,wis:10,cha:10};
 c.levels=Array.from({length:4},(_,i)=>({classId:'class:soldier',hpRoll:i?5:null,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));
 c.levels[0].feats=[{id:'feat:power-attack'},{id:'feat:cleave'}];
 if(great)c.levels[3].feats=[{id:'feat:great-cleave'}];if(follow)c.levels[2].feats=[{id:'feat:follow-through'}];
 c.inventory=['knife','blaster-pistol'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='knife'?{}:{shotsRemaining:20})}));return c;
}
const roller=(natural=12,calls=[])=>expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?natural+Number(m[1]):9,d20:m?[natural]:[],display:expr,coeffs:[1]};};
const noDice=()=>assert.fail('No dice before validation');
const routine=(c,mod=0,count=1)=>({id:crypto.randomUUID(),name:'Cuts',steps:[{id:crypto.randomUUID(),attackId:c.inventory[0].uid,count,attackMod:mod,damageMod:0}]});
function attack(c,{mod=0,natural=12,uid=c.inventory[0].uid}={}){const r=routine(c,mod);r.steps[0].attackId=uid;const result=rollCombatRoutine(r,derive(c,pack),pack,roller(natural));spendAttackResources(c,result);return result;}
function confirm(c,opponent='A',nextOpponent='B'){c.followUp={...followUpState(c),opponent,nextOpponent,dropped:true,immediate:true,inReach:true};}
const invalid=message=>{throw new Error(message);};

test('Cleave inherits the full triggering modifier, including Charge and routine/target modifiers',()=>{
 const c=hero();c.inventory[0].attackMod=3;c.attackTarget={prone:true};const d=derive(c,pack),result=attack(c,{mod:7});confirm(c);
 assert.equal(result.results[0].attackBonus,d.attacks[0].attack+7);assert.equal(cleavePlan(c,pack).attack.attack,result.results[0].attackBonus);
 c.inventory[0].attackMod=-8;c.attackTarget={};assert.equal(cleavePlan(c,pack).attack.attack,result.results[0].attackBonus);
 const calls=[],extra=rollCleave(c,pack,roller(12,calls));assert.equal(calls[0],'1d20+'+result.results[0].attackBonus);spendAttackResources(c,extra);assert.equal(c.followUp.cleavesSpent,1);assert.equal(c.followUp.opponent,'B');assert.equal(c.followUp.tickets.at(-1).bonus,result.results[0].attackBonus);
 const charge=hero();charge.chargePath={squares:2};const charged=rollCharge(charge,derive(charge,pack),pack,charge.inventory[0].uid,roller());spendAttackResources(charge,charged);confirm(charge);assert.equal(cleavePlan(charge,pack).attack.attack,charged.results[0].attackBonus);
 const full=hero();full.fullAttackPenalties={twoWeapons:-10,doubleAttack:0,tripleAttack:0};attack(full,{mod:4});confirm(full);assert.equal(cleavePlan(full,pack).attack.attack,derive(full,pack).attacks[0].attack+4);
 assert.equal(pack.rules.ambiguities.find(a=>a.id==='ambiguity:cleave-target-bonus').default,'copy');
});
test('Cleave requires an immediate damaging hit, confirmed 0 HP, another target, reach and the same melee weapon',()=>{
 const c=hero();attack(c);confirm(c);assert.doesNotThrow(()=>cleavePlan(c,pack));
 for(const [key,value,error] of [['dropped',false,/0 HP/],['immediate',false,/immediately/],['nextOpponent',' a ',/another/],['inReach',false,/reach/]]){const previous=c.followUp[key];c.followUp[key]=value;assert.throws(()=>rollCleave(c,pack,noDice),error);c.followUp[key]=previous;}
 c.inventory[0].equipped=false;assert.throws(()=>rollCleave(c,pack,noDice),/same weapon/);c.inventory[0].equipped=true;c.condition=5;assert.throws(()=>rollCleave(c,pack,noDice),/unavailable/);c.condition=0;
 attack(c,{natural:1});confirm(c);assert.throws(()=>rollCleave(c,pack,noDice),/damaging/);
});
test('one Cleave per round survives own turn resets; Great Cleave chains but cannot replay one victim',()=>{
 const c=hero();attack(c);confirm(c);spendAttackResources(c,rollCleave(c,pack,roller()));confirm(c,'B','C');assert.throws(()=>cleavePlan(c,pack),/this round/);
 startNextTurn(c);assert.equal(c.followUp.cleavesSpent,1);attack(c);confirm(c);assert.throws(()=>cleavePlan(c,pack),/this round/);startNextRound(c);assert.equal(c.followUp.cleavesSpent,0);attack(c);confirm(c);assert.doesNotThrow(()=>cleavePlan(c,pack));
 const g=hero({great:true});attack(g);confirm(g);const root=g.followUp.selected;spendAttackResources(g,rollCleave(g,pack,roller()));confirm(g,'B','C');spendAttackResources(g,rollCleave(g,pack,roller()));assert.equal(g.followUp.cleavesSpent,2);
 g.followUp.selected=root;confirm(g,'A','D');assert.throws(()=>rollCleave(g,pack,noDice),/Already cleaved/);
 confirm(g,'Other area victim','D');assert.doesNotThrow(()=>cleavePlan(g,pack));
});
test('Cleave trigger has no melee restriction, but extra attack remains melee with the identical weapon',()=>{
 const c=hero();attack(c,{uid:c.inventory[1].uid});confirm(c);assert.throws(()=>rollCleave(c,pack,noDice),/same weapon ready for a melee/);
 const d=derive(c,pack),t=c.followUp.tickets[0];t.uid=c.inventory[0].uid;t.weaponId=c.inventory[0].id;t.mode='ranged';assert.equal(planCleave(c,d,pack).attack.mode,'melee');
 t.weaponId=c.inventory[1].id;assert.throws(()=>planCleave(c,d,pack),/same weapon/);
});
test('Follow Through is once per any combatant turn; round resets preserve its use and owner penalties',()=>{
 const c=hero({follow:true});attack(c);confirm(c);c.followUp.path={squares:6,diagonal:0,difficult:0,diagonalDifficult:0};c.fullAttackPenalties={twoWeapons:-10,doubleAttack:0,tripleAttack:0};c.chargeReflexPenalty=-2;
 const move=followThrough(c,derive(c,pack),pack);assert(move.text.includes('6/6'));assert(c.followUp.followThroughSpent);assert.throws(()=>planFollowThrough(c,derive(c,pack),pack),/this turn/);
 startNextRound(c);assert(c.followUp.followThroughSpent);nextCombatantTurn(c);assert(!c.followUp.followThroughSpent);assert.equal(c.fullAttackPenalties.twoWeapons,-10);assert.equal(c.chargeReflexPenalty,-2);assert.equal(c.followUp.cleavesSpent,0);
 attack(c);confirm(c);assert.doesNotThrow(()=>planFollowThrough(c,derive(c,pack),pack));
});
test('Follow Through validates native speed, disjoint terrain and overload before mutation; standalone requires melee',()=>{
 const c=hero({follow:true});c.species='species:gungan';c.levels[0].feats=[{id:'feat:power-attack'}];c.levels[1].feats=[{id:'feat:cleave'}];attack(c);confirm(c);c.followUp.mode='swim';c.followUp.path={squares:4,diagonal:0,difficult:0,diagonalDifficult:0};assert.equal(planFollowThrough(c,derive(c,pack),pack).maximum,4);
 c.followUp.path.squares=5;assert.throws(()=>followThrough(c,derive(c,pack),pack),/exceeds/);assert(!c.followUp.followThroughSpent);
 c.followUp.path={squares:2,diagonal:0,difficult:0,diagonalDifficult:2};assert.throws(()=>planFollowThrough(c,derive(c,pack),pack),/exceeds/);c.followUp.path.squares=0;assert.throws(()=>planFollowThrough(c,derive(c,pack),pack),/Invalid/);
 c.followUp.path={squares:1,diagonal:0,difficult:0,diagonalDifficult:0};c.followUp.tickets[0].mode='ranged';assert.throws(()=>planFollowThrough(c,derive(c,pack),pack),/melee trigger/);c.followUp.moveBefore=true;assert(cleavePlan(c,pack).move);
 const d=derive(c,pack);d.load.overloaded=true;assert.throws(()=>planFollowThrough(c,d,pack,{beforeCleave:true}),/Straining/);
});
test('combined movement consumes Follow Through and Cleave together; standalone movement can precede Cleave once',()=>{
 const c=hero({follow:true});attack(c);confirm(c);c.followUp.moveBefore=true;c.inventory[1].aimed=true;const result=rollCleave(c,pack,roller());assert.equal(c.inventory[1].aimed,true);spendAttackResources(c,result);assert.equal(c.inventory[1].aimed,false);assert.equal(c.followUp.cleavesSpent,1);assert(c.followUp.followThroughSpent);assert(!c.followUp.moveBefore);
 const other=hero({follow:true});attack(other);confirm(other);followThrough(other,derive(other,pack),pack);assert.doesNotThrow(()=>cleavePlan(other,pack));other.followUp.moveBefore=true;assert.throws(()=>cleavePlan(other,pack),/this turn/);
});
test('follow-up preflight and resource application reject stale state atomically',()=>{
 const c=hero({follow:true});attack(c);confirm(c);const result=rollCleave(c,pack,roller());c.followUp.nextOpponent='Changed';const saved=structuredClone(c);assert.throws(()=>spendAttackResources(c,result),/Follow-up changed/);assert.deepEqual(c,saved);
 reloadWeapon(c,pack,c.inventory[1].uid);assert.equal(c.followUp.tickets.length,0);assert.throws(()=>cleavePlan(c,pack),/damaging/);
});
test('stepwise routines resolve follow-ups between attacks without repeating Mighty Swing or stacking penalties',()=>{
 const c=hero({great:true,follow:true});c.levels[1].feats=[{id:'feat:mighty-swing'}];c.mightySwing=true;const r=routine(c,3,2);c.routines=[r];
 const first=rollRoutineStep(c,derive(c,pack),pack,r.id,roller());assert.equal(first.results.length,1);assert(first.results[0].mightySwing);spendAttackResources(c,first);assert.equal(c.routineProgress.index,1);assert.equal(c.mightySwing,false);confirm(c);
 const extra=rollCleave(c,pack,roller());assert(!extra.results[0].mightySwing);spendAttackResources(c,extra);assert.equal(c.routineProgress.index,1);const second=rollRoutineStep(c,derive(c,pack),pack,r.id,roller());assert(!second.results[0].mightySwing);spendAttackResources(c,second);assert.equal(c.routineProgress,undefined);
 const full=hero();const r2={id:crypto.randomUUID(),name:'Two knives',kind:'fullAttack',steps:[{id:crypto.randomUUID(),source:'base',attackId:full.inventory[0].uid,count:1,attackMod:0,damageMod:0},{id:crypto.randomUUID(),source:'twoWeapons',attackId:full.id,count:1,attackMod:0,damageMod:0}]};full.routines=[r2];
 const a=rollRoutineStep(full,derive(full,pack),pack,r2.id,roller());spendAttackResources(full,a);confirm(full);assert.equal(cleavePlan(full,pack).attack.attack,a.results[0].attackBonus);const held=derive(full,pack).fullAttack.penalty,b=rollRoutineStep(full,derive(full,pack),pack,r2.id,roller());assert.equal(b.results[0].attackBonus,derive(full,pack).attacks.find(a=>a.uid===full.id).attack);spendAttackResources(full,b);assert.equal(derive(full,pack).fullAttack.penalty,held);
});
test('Step preflights all remaining ammo; modified or stale executions never spend resources',()=>{
 const c=hero();const r=routine(c,0,2);r.steps[0].attackId=c.inventory[1].uid;c.routines=[r];c.inventory[1].shotsRemaining=1;assert.throws(()=>rollRoutineStep(c,derive(c,pack),pack,r.id,noDice),/needs 2/);assert.equal(c.inventory[1].shotsRemaining,1);
 c.inventory[1].shotsRemaining=3;spendAttackResources(c,rollRoutineStep(c,derive(c,pack),pack,r.id,roller()));assert.equal(c.inventory[1].shotsRemaining,2);const pending=rollRoutineStep(c,derive(c,pack),pack,r.id,roller());delete c.routineProgress;const saved=structuredClone(c);assert.throws(()=>spendAttackResources(c,pending),/progress changed/);assert.deepEqual(c,saved);
 c.routineProgress={id:r.id,index:1,signature:JSON.stringify({kind:r.kind,steps:r.steps})};r.steps[0].damageMod=1;assert.throws(()=>rollRoutineStep(c,derive(c,pack),pack,r.id,noDice),/changed/);assert.throws(()=>validateRoutineProgress(c,invalid),/progress/);
});
test('closed saved state, rule mapping and text are validated; malicious opponent names are escaped',()=>{
 const c=hero({follow:true});attack(c);confirm(c,'<img src=x onerror=alert(1)>');validateCharacter(c,pack);const html=followUpControls(c,derive(c,pack),pack);assert(html.includes('&lt;img'));assert(!html.includes('<img'));assert(html.includes('data-rule-page="rule:follow-through"'));
 for(const change of [p=>p.unknown=true,p=>p.cleavesSpent=-1,p=>p.dropped='true',p=>p.path.squares=-1,p=>p.tickets[0].bonus=Infinity,p=>p.tickets[0].weaponId='evil:weapon',p=>p.selected=crypto.randomUUID(),p=>p.tickets[0].claims=[{opponent:'X',cleave:false,followThrough:false}]]){const copy=structuredClone(c);change(copy.followUp);assert.throws(()=>validateFollowUps(copy,invalid));}
 for(const key of ['attackBonus','sameWeapon','perRound']){const p=structuredClone(pack);p.rules.cleave[key]=key==='perRound'?2:'different';assert.throws(()=>validatePack(p),/Cleave/);}
 const feature=pack.feats.find(f=>f.id==='feat:follow-through');assert.deepEqual(feature.prerequisite,{kind:'all',requirements:[]});assert(!pack.classes.some(c=>c.bonusFeats?.includes(feature.id)));
});


test('a step cannot apply after its routine definition changes, including before the first step',()=>{
 const c=hero(),r=routine(c,0,2);c.routines=[r];const pending=rollRoutineStep(c,derive(c,pack),pack,r.id,roller());r.steps[0].attackMod=1;const saved=structuredClone(c);assert.throws(()=>spendAttackResources(c,pending),/Routine changed/);assert.deepEqual(c,saved);
});
test('duplicating/importing clears transient attack and execution snapshots while preserving counters and unarmed routines',()=>{
 const c=hero({great:true,follow:true}),r=routine(c,0,2);r.steps[0].attackId=c.id;c.routines=[r];spendAttackResources(c,rollRoutineStep(c,derive(c,pack),pack,r.id,roller()));confirm(c);c.followUp.cleavesSpent=2;c.followUp.followThroughSpent=true;
 const previousWindow=globalThis.window,previousDocument=globalThis.document;globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};
 try{
  const memory=new Map([[STORAGE_KEY,JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]})]]),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},store=createStore(pack,()=>{},storage);
  store.duplicate();const copy=store.current();assert.notEqual(copy.id,c.id);assert.equal(copy.routines[0].steps[0].attackId,copy.id);assert.equal(copy.routineProgress,undefined);assert.equal(copy.followUp.tickets.length,0);assert.equal(copy.followUp.cleavesSpent,2);assert(copy.followUp.followThroughSpent);
  const imported=store.import(JSON.stringify(c));assert.equal(imported.routines[0].steps[0].attackId,imported.id);assert.equal(imported.routineProgress,undefined);assert.equal(imported.followUp.selected,null);assert.equal(imported.followUp.cleavesSpent,2);validateRoster(store.roster,pack);
 }finally{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;}
});

test('Swift Second Wind and supplied free-action reloads preserve a stepped routine; Move Action reloads interrupt it',()=>{
 const c=hero(),r=routine(c,0,2);c.routines=[r];spendAttackResources(c,rollRoutineStep(c,derive(c,pack),pack,r.id,roller()));c.currentHP=1;catchSecondWind(c,derive(c,pack),pack);assert.equal(c.routineProgress.index,1);assert.equal(c.followUp.tickets.length,0);
 c.inventory[1].id='equipment:bow';c.inventory[1].shotsRemaining=0;c.inventory[1].freeReloads=true;reloadWeapon(c,pack,c.inventory[1].uid);assert.equal(c.routineProgress.index,1);
 c.inventory[1].id='equipment:blaster-pistol';delete c.inventory[1].freeReloads;reloadWeapon(c,pack,c.inventory[1].uid);assert.equal(c.routineProgress,undefined);
});

test('Cleave target alternative replaces only opponent modifiers, preserving Charge and other copied bonuses',()=>{
 const c=hero();c.attackTarget={prone:true,helpless:true};c.chargePath={squares:2};const charged=rollCharge(c,derive(c,pack),pack,c.inventory[0].uid,roller());spendAttackResources(c,charged);const original=c.followUp.tickets[0];assert.equal(original.targetBonus,10);const bonus=original.bonus;c.attackTarget={};c.prone=true;confirm(c);assert.equal(cleavePlan(c,pack).attack.attack,bonus);
 c.houseRules={ambiguities:{'ambiguity:cleave-target-bonus':'recalculate'}};const plan=cleavePlan(c,pack);assert.equal(plan.attack.attack,bonus-10);const result=rollCleave(c,pack,roller());assert.equal(result.results[0].attackBonus,bonus-10);assert.equal(result.results[0].targetBonus,0);spendAttackResources(c,result);assert.equal(c.followUp.tickets.at(-1).targetBonus,0);validateCharacter(c,pack);
});
test('legacy Cleave tickets retain default compatibility and cannot guess missing target components under the alternative',()=>{
 const c=hero();attack(c);confirm(c);delete c.followUp.tickets[0].targetBonus;validateCharacter(c,pack);assert(cleavePlan(c,pack));c.houseRules={ambiguities:{'ambiguity:cleave-target-bonus':'recalculate'}};const before=structuredClone(c);assert.throws(()=>rollCleave(c,pack,noDice),/new triggering attack/);assert.deepEqual(c,before);
});

test('Great Cleave chains recalculate each new target and persist the component actually used',()=>{
 const c=hero({great:true});c.attackTarget={prone:true};const first=attack(c).results[0].attackBonus;assert.equal(c.followUp.tickets[0].targetBonus,5);c.attackTarget={};confirm(c);c.houseRules={ambiguities:{'ambiguity:cleave-target-bonus':'recalculate'}};let r=rollCleave(c,pack,roller());assert.equal(r.results[0].attackBonus,first-5);spendAttackResources(c,r);c.attackTarget={helpless:true};confirm(c,'B','C');r=rollCleave(c,pack,roller());assert.equal(r.results[0].attackBonus,first);assert.equal(r.results[0].targetBonus,5);spendAttackResources(c,r);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
});
