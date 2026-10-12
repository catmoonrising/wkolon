import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {acrobaticsPath,acrobaticsMoveCost,planAcrobaticsMove,planProneAction,validateAcrobaticsMovement} from '../src/acrobatics-movement.js';
import {acrobaticsMove,proneAction} from '../src/acrobatics-movement-actions.js';
import {acrobaticsMoveControls,proneActionControls} from '../src/acrobatics-movement-ui.js';
import {movementSegment} from '../src/combat-movement.js';
import {rollRoutineStep} from '../src/routine-steps.js';
import {spendAttackResources} from '../src/ammunition.js';
import {catchSecondWind,startRage,recoverCondition} from '../src/recovery.js';
import {usePower,recoverPower} from '../src/force-powers.js';
import {validatePack} from '../tools/validate-rules.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:14,wis:10,cha:10};c.levels[0].classId='class:scoundrel';c.trainedSkills=['skill:acrobatics'];c.inventory=[{id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,shotsRemaining:20,aimed:true}];return c;}
const noDice=()=>assert.fail('No dice before validation');
const roller=(value=15,natural=12,calls=[])=>expr=>{calls.push(expr);return {value,d20:[natural],display:expr,coeffs:[1]};};
function path(c,{total=1,tumbled=1,tumble=true,occupied=0,mode='normal',check=null}={}){c.acrobaticsMovement={mode,tumble,occupied,check,path:movementSegment(typeof total==='number'?{squares:total}:total),tumbled:movementSegment(typeof tumbled==='number'?{squares:tumbled}:tumbled)};}
function progress(c){c.routines=[{id:crypto.randomUUID(),name:'Shots',steps:[{id:crypto.randomUUID(),attackId:c.inventory[0].uid,count:2,attackMod:0,damageMod:0}]}];spendAttackResources(c,rollRoutineStep(c,derive(c,pack),pack,c.routines[0].id,roller(18)));}

test('normal Move uses adjusted native Speed, ordinary terrain costs and no skill check',()=>{
 const c=hero();c.trainedSkills=[];path(c,{total:6,tumble:false});const d=derive(c,pack),r=acrobaticsMove(c,d,pack,noDice);assert.equal(r.cost,6);assert.equal(r.maximum,6);assert.equal(r.rolled,null);assert.equal(r.protectedSquares,0);assert(r.success);assert(!c.inventory[0].aimed);
 path(c,{total:{squares:3,diagonalDifficult:1},tumble:false});assert.equal(planAcrobaticsMove(c,d,pack).cost,6);path(c,{total:7,tumble:false});assert.throws(()=>acrobaticsMove(c,d,pack,noDice),/exceeds Speed/);
 c.species='species:gungan';path(c,{total:4,tumble:false,mode:'swim'});assert.equal(planAcrobaticsMove(c,derive(c,pack),pack).maximum,4);c.condition=4;assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/exceeds/);
});
test('Tumble adds cost only to the declared subset, multiplying diagonal/difficult/both costs',()=>{
 const c=hero();path(c,{total:4,tumbled:2});assert.equal(acrobaticsMoveCost(c,pack),6);assert.equal(planAcrobaticsMove(c,derive(c,pack),pack).cost,6);
 for(const [key,cost] of [['diagonal',4],['difficult',4],['diagonalDifficult',8]]){path(c,{total:{squares:1,[key]:1},tumbled:{squares:1,[key]:1}});assert.equal(acrobaticsMoveCost(c,pack),cost);}
 path(c,{total:{squares:3,diagonal:1,difficult:1,diagonalDifficult:1},tumbled:{squares:1,diagonalDifficult:1}});assert.equal(acrobaticsMoveCost(c,pack),12);
 path(c,{total:2,tumbled:{squares:1,diagonal:1}});assert.throws(()=>planAcrobaticsMove(c,derive(c,pack),pack),/squares exceed/);
 path(c,{total:{squares:1,diagonal:1},tumbled:1});assert.throws(()=>planAcrobaticsMove(c,derive(c,pack),pack),/squares exceed/);
 path(c,{total:2,tumbled:1,occupied:2});assert.throws(()=>planAcrobaticsMove(c,derive(c,pack),pack),/squares exceed/);
});
test('Tumble requires trained and available Acrobatics and a valid path before dice or state changes',()=>{
 const c=hero();path(c);c.trainedSkills=[];let before=structuredClone(c);assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/trained/);assert.deepEqual(c,before);c.trainedSkills=['skill:acrobatics'];
 for(const change of [()=>c.condition=5,()=>c.currentHP=0,()=>c.helpless=true]){const q=structuredClone(c);change();assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/unavailable/);Object.assign(c,q);delete c.currentHP;delete c.helpless;c.condition=0;}
 path(c,{total:0,tumbled:0});assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/movement squares/);path(c,{tumbled:0});assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/Tumble squares/);
 path(c);const d=derive(c,pack);d.load.overloaded=true;assert.throws(()=>acrobaticsMove(c,d,pack,noDice),/Straining/);d.load.overloaded=false;d.skills.find(s=>s.id==='skill:acrobatics').available=false;assert.throws(()=>acrobaticsMove(c,d,pack,noDice),/trained/);
});
test('skill checks use current skill modifiers; natural 1/20 never automatically fail/succeed',()=>{
 const c=hero();c.condition=2;c.skillModifiers={'skill:acrobatics':9};path(c);const d=derive(c,pack),calls=[];
 let r=acrobaticsMove(c,d,pack,roller(15,1,calls));assert.equal(calls[0],'1d20+'+d.skills.find(s=>s.id==='skill:acrobatics').total);assert(r.success);assert.equal(r.protectedSquares,1);
 c.skillModifiers={'skill:acrobatics':-11};const low=derive(c,pack);assert.equal(low.skills.find(s=>s.id==='skill:acrobatics').total,-6);r=acrobaticsMove(c,low,pack,roller(14,20));assert(!r.success);assert.equal(r.protectedSquares,0);assert(r.text.includes('movement can provoke'));
 const before=structuredClone(c);assert.throws(()=>acrobaticsMove(c,d,pack,()=>({value:15,d20:[21],display:'bad'})),/Invalid Acrobatics roll/);assert.deepEqual(c,before);
});
test('entered totals are consumed once; a failed enemy-space attempt never confirms passage or protection',()=>{
 const c=hero();path(c,{total:2,tumbled:1,occupied:1,check:14});const r=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(!r.success);assert(!r.movementComplete);assert.equal(r.protectedSquares,0);assert(r.text.includes('passage through occupied squares unconfirmed'));assert.equal(c.acrobaticsMovement.check,null);
 c.acrobaticsMovement.check=15;const s=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(s.success);assert(s.movementComplete);assert.equal(s.protectedSquares,1);assert.equal(c.acrobaticsMovement.path.squares,2);assert.equal(c.acrobaticsMovement.check,null);
});
test('Move and Tumble clear Aim/Brace and immediate follow-ups, interrupt routines, and preserve ongoing penalties',()=>{
 const c=hero();progress(c);assert(c.routineProgress);c.inventory[0].aimed=true;c.inventory.push({id:'equipment:heavy-repeating-blaster',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:true,attackMod:0,damageMod:0,braced:true});c.powerAttack=1;c.chargeReflexPenalty=-2;c.fullAttackPenalties={twoWeapons:-10,doubleAttack:0,tripleAttack:0};c.mightySwing=true;path(c,{check:15});acrobaticsMove(c,derive(c,pack),pack,noDice);
 assert.equal(c.routineProgress,undefined);assert.equal(c.followUp.tickets.length,0);assert(!c.inventory[0].aimed);assert(c.inventory.every(e=>!e.braced));assert.equal(c.inventory[0].shotsRemaining,19);assert.equal(c.powerAttack,1);assert.equal(c.fullAttackPenalties.twoWeapons,-10);assert.equal(c.chargeReflexPenalty,-2);assert(c.mightySwing);
});
test('ordinary Fall Prone/Stand Up use Swift/Move Actions; trained alternatives use Free/Swift and DC15',()=>{
 const c=hero();c.trainedSkills=[];let d=derive(c,pack);assert.equal(planProneAction(c,d,pack).action,'swift-action');assert.throws(()=>proneAction(c,d,pack,true,noDice),/trained/);
 let r=proneAction(c,d,pack,false,noDice);assert(c.prone);assert.equal(r.action,'swift-action');const prone=derive(c,pack);assert.equal(prone.attacks.find(a=>a.uid===c.id).attack,d.attacks.find(a=>a.uid===c.id).attack-5);
 r=proneAction(c,prone,pack,false,noDice);assert(!c.prone);assert.equal(r.action,'move-action');
 c.trainedSkills=['skill:acrobatics'];r=proneAction(c,derive(c,pack),pack,true,roller(15));assert(c.prone);assert.equal(r.action,'free-action');r=proneAction(c,derive(c,pack),pack,true,roller(15));assert(!c.prone);assert.equal(r.action,'swift-action');
});
test('failed trained prone attempts change no position; Swift/Free actions preserve a routine, normal standing interrupts',()=>{
 const c=hero();progress(c);c.inventory[0].aimed=true;const index=c.routineProgress.index;
 let r=proneAction(c,derive(c,pack),pack,true,roller(14));assert(!r.success);assert(!c.prone);assert.equal(c.routineProgress.index,index);assert(!c.inventory[0].aimed);
 proneAction(c,derive(c,pack),pack,true,roller(15));assert(c.prone);assert.equal(c.routineProgress.index,index);proneAction(c,derive(c,pack),pack,true,roller(15));assert(!c.prone);assert.equal(c.routineProgress.index,index);
 proneAction(c,derive(c,pack),pack,false,noDice);assert.equal(c.routineProgress.index,index);proneAction(c,derive(c,pack),pack,false,noDice);assert.equal(c.routineProgress,undefined);
});
test('Total Defense permits movement/prone actions; incapacitated actors and immune species cannot act',()=>{
 const c=hero();c.defenseStance='total';path(c,{check:15});assert.doesNotThrow(()=>acrobaticsMove(c,derive(c,pack),pack,noDice));assert.doesNotThrow(()=>proneAction(c,derive(c,pack),pack,false,noDice));c.helpless=true;assert.throws(()=>proneAction(c,derive(c,pack),pack,false,noDice),/unavailable/);delete c.helpless;
 c.species='species:hutt';c.prone=false;assert.throws(()=>proneAction(c,derive(c,pack),pack,false,noDice),/cannot be Prone/);
});
test('saved movement drafts validate closed fields/terrain/check types and preserve partial defaults',()=>{
 const c=hero();c.acrobaticsMovement={path:{squares:3}};validateCharacter(c,pack);const p=acrobaticsPath(c);assert.equal(p.tumbled.squares,1);assert.equal(p.path.diagonal,0);assert.equal(p.check,null);
 for(const bad of [null,[],{mode:1},{tumble:'yes'},{occupied:-1},{check:NaN},{check:100001},{path:{squares:1.5}},{path:{squares:1,diagonal:1,difficult:1}},{tumbled:{squares:-1}},{immunity:true}])assert.throws(()=>validateCharacter({...c,acrobaticsMovement:bad},pack));
 path(c,{total:1,tumbled:2});validateCharacter(c,pack);assert.throws(()=>planAcrobaticsMove(c,derive(c,pack),pack),/exceed/);
 const restored=JSON.parse(JSON.stringify(c));validateCharacter(restored,pack);assert.equal(restored.acrobaticsMovement.tumbled.squares,2);
});
test('mapping pins exact official text and class-independent trained requirements; UI exposes valid and unavailable options',()=>{
 validatePack(pack);for(const [key,value] of [['dc',10],['take10',true],['trainedOnly',false],['tumble',{action:'free-action',movementMultiplier:1}]]){const bad=structuredClone(pack);bad.rules.acrobaticsMovement[key]=value;assert.throws(()=>validatePack(bad),/Acrobatics movement/);}
 const text=articleText(pack.rulePages.find(r=>r.id==='rule:acrobatics').article);assert(text.includes('Each threatened or occupied square'));assert(text.includes("can't Take 10 or Take 20"));assert(text.includes('stand up from a Prone position as a Swift Action'));
 const c=hero();path(c);const html=acrobaticsMoveControls(c,derive(c,pack),pack);assert(html.includes('Tumbled'));assert(html.includes('Occupied'));assert(html.includes('rule:acrobatics'));assert(!html.includes('Take 10'));c.trainedSkills=[];assert(proneActionControls(c,derive(c,pack),pack).includes('Requires trained Acrobatics'));
});

test('other actual Swift/Reaction actions also break Aim, preserving routine progress where their action allows it',()=>{
 const c=hero();progress(c);c.inventory[0].aimed=true;c.currentHP=1;catchSecondWind(c,derive(c,pack),pack);assert(!c.inventory[0].aimed);assert(c.routineProgress);
 c.condition=1;c.inventory[0].aimed=true;recoverCondition(c,derive(c,pack));assert(!c.inventory[0].aimed);
 const w=hero();w.species='species:wookiee';w.inventory[0].aimed=true;startRage(w,derive(w,pack));assert(!w.inventory[0].aimed);
 const f=hero();f.levels[0].feats=[{id:'feat:force-sensitivity'},{id:'feat:force-training'}];f.trainedSkills=['skill:acrobatics','skill:use-the-force'];const copy={id:crypto.randomUUID(),powerId:'power:battle-strike',spent:false};f.levels[0].forcePowers=[copy];progress(f);f.inventory[0].aimed=true;
 usePower(f,derive(f,pack),pack,copy.id,12);assert(!f.inventory[0].aimed);assert(f.routineProgress);f.inventory[0].aimed=true;recoverPower(f,derive(f,pack),pack,copy.id);assert(!f.inventory[0].aimed);assert(f.routineProgress);
});

test('legitimate negative skill modifiers remain valid rolls and entered checks at the sheet modifier limits',()=>{
 const c=hero();c.condition=4;c.skillModifiers={'skill:acrobatics':-1000};path(c);const d=derive(c,pack);assert.equal(d.skills.find(s=>s.id==='skill:acrobatics').total,-1003);
 const r=acrobaticsMove(c,d,pack,roller(-1002,1));assert(!r.success);assert.equal(r.rolled.value,-1002);c.acrobaticsMovement.check=-1002;validateCharacter(c,pack);assert(!acrobaticsMove(c,d,pack,noDice).success);
});
