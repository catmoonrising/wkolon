import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {fallingState,planFalling,knownFallingDistance,resolveFalling} from '../src/falling.js';
import {fallingControls} from '../src/falling-ui.js';
import {ambiguityValue,createHouseRules} from '../src/house-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function fixture(){const c=newCharacter(pack,{classId:'class:scoundrel'});c.levels[0].classId='class:jedi';c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:14,wis:10,cha:10};c.currentHP=1000;c.falling={meters:3,natural:10,damage:6};return c;}
const noDice=()=>{throw Error('Unexpected dice');};

test('falls use Fortitude, 1d6 per complete 3 metres and the 20d6 cap',()=>{
 for(const [meters,dice] of [[1.5,0],[3,1],[5.9,1],[6,2],[60,20],[600,20]]){
  const c=fixture();c.falling={meters,natural:10,damage:dice*6};const d=derive(c,pack),r=resolveFalling(c,d,pack,noDice);
  assert.equal(r.dice,dice);assert.equal(r.defense,d.defenses.fortitude);assert.equal(r.amount,dice*6);assert.equal(r.damage.afterHP,1000-dice*6);assert(c.prone);
 }
});
test('natural 1 misses regardless of Fortitude; ordinary misses halve before SR/DR',()=>{
 const c=fixture();c.falling.natural=1;c.falling.damage=5;c.protection.dr=1;const r=resolveFalling(c,derive(c,pack),pack,noDice);assert(!r.hit);assert.equal(r.attackRoll.value,21);assert.equal(r.amount,2);assert.equal(r.damage.hpDamage,1);
 const other=fixture(),d=derive(other,pack);d.defenses.fortitude=100;const miss=resolveFalling(other,d,pack,noDice);assert(!miss.hit);assert.equal(miss.amount,3);
});
test('natural 20 automatically hits and doubles damage after the base 20d6 cap',()=>{
 const c=fixture();c.falling={meters:600,natural:20,damage:120};const d=derive(c,pack);d.defenses.fortitude=100;
 const r=resolveFalling(c,d,pack,noDice);assert(r.hit&&r.critical);assert.equal(r.amount,240);assert.equal(r.dice,20);assert.equal(c.currentHP,760);
});
test('Acrobatics requires training and reduces 3 metres at DC15, plus 3 per 10 over it',()=>{
 for(const [check,reduced] of [[14,0],[15,3],[24,3],[25,6],[35,9]]){
  const c=fixture();c.trainedSkills=['skill:acrobatics'];c.falling={meters:9,reduction:'acrobatics',check,natural:10,damage:(9-reduced)*2};
  const r=resolveFalling(c,derive(c,pack),pack,noDice);assert.equal(r.reduced,reduced);assert.equal(r.effective,9-reduced);assert.equal(r.standing,reduced===9);assert.equal(c.falling.check,null);
 }
 const c=fixture();c.falling.reduction='acrobatics';const before=structuredClone(c);assert.throws(()=>resolveFalling(c,derive(c,pack),pack,noDice),/trained Acrobatics/);assert.deepEqual(c,before);
});
test('great falls cap the distance at 60 metres before subtracting a successful reduction',()=>{
 const c=fixture();c.trainedSkills=['skill:acrobatics'];c.falling={meters:300,reduction:'acrobatics',check:15,natural:10,damage:114};const r=resolveFalling(c,derive(c,pack),pack,noDice);assert.equal(r.base,60);assert.equal(r.reduced,3);assert.equal(r.effective,57);assert.equal(r.dice,19);
});
test('untrained intentional Jump Down is default; accepted alternative requires trained Jump',()=>{
 const c=fixture();c.trainedSkills=[];c.falling={kind:'jump',meters:3,reduction:'jump',jumpCheck:15,natural:10,damage:0};assert.equal(ambiguityValue(c,pack,'ambiguity:jump-down-training'),'untrained');const r=resolveFalling(c,derive(c,pack),pack,noDice);assert(r.standing);assert.equal(r.reduced,3);
 c.houseRules={ambiguities:{'ambiguity:jump-down-training':'trained'}};c.falling.jumpCheck=15;assert.throws(()=>planFalling(c,derive(c,pack),pack),/trained Jump/);c.trainedSkills=['skill:jump'];assert(planFalling(c,derive(c,pack),pack));
 c.falling.kind='fall';assert.throws(()=>planFalling(c,derive(c,pack),pack),/intentional Jump Down/);
});
test('both checks combine independently by default; accepted mutually exclusive setting blocks the stale combined draft',()=>{
 const c=fixture();c.trainedSkills=['skill:acrobatics'];c.falling={kind:'jump',meters:9,reduction:'both',check:15,jumpCheck:15,natural:10,damage:6};const r=resolveFalling(c,derive(c,pack),pack,noDice);assert.equal(r.reduced,6);assert.equal(r.effective,3);assert.equal(r.reductions.length,2);assert.equal(c.falling.check,null);assert.equal(c.falling.jumpCheck,null);
 c.falling.check=15;c.falling.jumpCheck=14;c.falling.damage=12;c.falling.natural=10;const partial=resolveFalling(c,derive(c,pack),pack,noDice);assert.equal(partial.reduced,3);assert(partial.reductions[0].success);assert(!partial.reductions[1].success);
 c.houseRules={ambiguities:{'ambiguity:fall-reductions':'single'}};assert.throws(()=>planFalling(c,derive(c,pack),pack),/mutually exclusive/);c.falling.reduction='acrobatics';assert(planFalling(c,derive(c,pack),pack));
});
test('landing on feet needs a successful check and zero actual damage, including SR/DR prevention',()=>{
 const c=fixture();c.trainedSkills=['skill:acrobatics'];c.falling={meters:6,reduction:'acrobatics',check:15,natural:10,damage:6};c.protection.dr=6;assert(resolveFalling(c,derive(c,pack),pack,noDice).standing);assert(!c.prone);
 c.falling.check=14;c.falling.damage=12;c.falling.natural=10;c.protection.sr=100;c.protection.srMax=100;assert(!resolveFalling(c,derive(c,pack),pack,noDice).standing);assert(c.prone);
 c.falling.check=15;c.falling.damage=6;c.falling.natural=10;c.protection.sr=0;c.protection.dr=0;assert(!resolveFalling(c,derive(c,pack),pack,noDice).standing);
});
test('fall damage uses shield loss, damage threshold, death and Force Point survival',()=>{
 const c=fixture();c.falling={meters:6,natural:10,damage:12};c.protection.sr=5;c.protection.srMax=5;c.protection.dr=1;let r=resolveFalling(c,derive(c,pack),pack,noDice);assert.equal(r.damage.srBlocked,5);assert.equal(r.damage.drBlocked,1);assert.equal(c.protection.sr,0);assert.equal(c.currentHP,994);
 const fatal=fixture();fatal.currentHP=1;fatal.falling={meters:9,natural:10,damage:18};r=resolveFalling(fatal,derive(fatal,pack),pack,noDice);assert(r.damage.dead);assert(fatal.recovery.dead);assert.equal(fatal.condition,5);
 const saved=fixture();saved.currentHP=1;saved.falling={meters:9,natural:10,damage:18,survive:true};const fp=saved.forcePoints;r=resolveFalling(saved,derive(saved,pack),pack,noDice);assert(!r.damage.dead);assert.equal(r.damage.forcePointSpent,1);assert.equal(saved.forcePoints,fp-1);assert.equal(saved.currentHP,0);assert.equal(saved.condition,5);
});
test('a resolved fall ends Balance without a second balance-damage check',()=>{
 const c=fixture();c.balance={active:true,activeDC:10};const r=resolveFalling(c,derive(c,pack),pack,noDice);assert(!c.balance.active);assert(!r.damage.balanceCheckRequired);
});
test('intentional jumps consume Aim/Brace and immediate follow-ups; forced falls do not invent an action or loss of sight',()=>{
 const c=fixture();c.inventory=[{id:'equipment:blaster-pistol',uid:'pistol',quantity:1,equipped:true,aimed:true,shotsRemaining:20}];c.followUp={tickets:[{id:'ticket'}],selected:'ticket',immediate:true};c.routineProgress={id:'routine'};
 resolveFalling(c,derive(c,pack),pack,noDice);assert(c.inventory[0].aimed);assert.equal(c.inventory[0].shotsRemaining,20);assert(c.followUp.immediate);assert(c.routineProgress);
 c.falling={kind:'jump',meters:3,natural:10,damage:6};resolveFalling(c,derive(c,pack),pack,noDice);assert(!c.inventory[0].aimed);assert.deepEqual(c.followUp.tickets,[]);assert(!c.routineProgress);
 c.inventory=[{id:'equipment:heavy-repeating-blaster',uid:'heavy',quantity:1,equipped:true,braced:true,shotsRemaining:20}];c.falling.damage=6;c.falling.natural=10;resolveFalling(c,derive(c,pack),pack,noDice);assert.equal(c.inventory[0].braced,false);assert.equal(c.inventory[0].shotsRemaining,20);
});
test('Jump Take10 requires training and calm conditions; a Climb-only species permission does not grant it',()=>{
 const c=fixture();c.falling={kind:'jump',meters:3,reduction:'jump',jumpMode:'take10',calm:true,natural:10,damage:0};assert.throws(()=>planFalling(c,derive(c,pack),pack),/trained Jump/);
 c.trainedSkills=['skill:jump'];c.falling.calm=false;assert.throws(()=>planFalling(c,derive(c,pack),pack),/no rush/);c.falling.calm=true;
 const plan=planFalling(c,derive(c,pack),pack);assert(knownFallingDistance(plan));const r=resolveFalling(c,derive(c,pack),pack,noDice);assert.equal(r.reductions[0].roll.value,10+plan.checks[0].skill.total);assert(r.text.includes('Take 10'));
 c.species='species:sullustan';c.trainedSkills=[];c.falling.calm=false;c.falling.natural=10;c.falling.damage=6;assert.throws(()=>planFalling(c,derive(c,pack),pack),/trained Jump/);assert(fallingControls(c,derive(c,pack),pack).includes('No pressure'));
});
test('Jump Take20 requires declared safe retries and records its twentyfold time; Acrobatics has no Take10/20 mode',()=>{
 const c=fixture();c.falling={kind:'jump',meters:3,reduction:'jump',jumpMode:'take20',natural:10,damage:0};assert.throws(()=>planFalling(c,derive(c,pack),pack),/safe retries/);c.falling.safe=true;const r=resolveFalling(c,derive(c,pack),pack,noDice);assert(r.standing);assert(r.text.includes('20× time'));
 c.trainedSkills=['skill:acrobatics'];c.falling={meters:3,reduction:'acrobatics',jumpMode:'take20',check:15,natural:10,damage:0};const ordinary=resolveFalling(c,derive(c,pack),pack,noDice);assert.equal(ordinary.reductions[0].mode,'roll');
});
test('reduction dice use current totals without automatic natural 1/20 skill results',()=>{
 const c=fixture();c.trainedSkills=['skill:acrobatics'];c.abilities.dex=30;c.condition=1;c.falling={meters:3,reduction:'acrobatics',natural:10};let expression;const d=derive(c,pack);
 const r=resolveFalling(c,d,pack,expr=>{expression=expr;return {value:15,d20:[1],display:expr};});assert.equal(expression,'1d20+14');assert(r.reductions[0].success);assert(r.standing);
 c.abilities.dex=3;c.condition=4;c.falling={meters:3,reduction:'acrobatics',natural:10};let n=0;const failed=resolveFalling(c,derive(c,pack),pack,expr=>++n===1?{value:11,d20:[20],display:expr}:{value:6,display:expr});assert(!failed.reductions[0].success);assert.equal(failed.dice,1);
});
test('incapacitated characters can take falling damage but cannot attempt physical reductions',()=>{
 const c=fixture();c.currentHP=0;c.falling.damage=1;const d=derive(c,pack);assert(resolveFalling(c,d,pack,noDice));
 c.trainedSkills=['skill:acrobatics'];c.falling.reduction='acrobatics';assert.throws(()=>planFalling(c,derive(c,pack),pack),/unavailable/);
});
test('manual damage needs resolved check totals and must fit the reduced dice range before any roll',()=>{
 const c=fixture();c.trainedSkills=['skill:acrobatics'];c.falling={meters:9,reduction:'acrobatics',damage:18};const before=structuredClone(c);assert.throws(()=>resolveFalling(c,derive(c,pack),pack,noDice),/Enter reduction totals/);assert.deepEqual(c,before);
 c.falling.check=35;assert.throws(()=>resolveFalling(c,derive(c,pack),pack,noDice),/0d6 damage/);c.falling.damage=0;assert.equal(planFalling(c,derive(c,pack),pack).checks.length,1);
});
test('invalid dice and impossible Force Point survival leave all state untouched',()=>{
 const c=fixture();c.falling={meters:3,damage:6};for(const result of [{value:20,d20:[0]},{value:41,d20:[21]},{value:30,d20:[10,10]},{value:99,d20:[10]}]){const before=structuredClone(c);assert.throws(()=>resolveFalling(c,derive(c,pack),pack,()=>result),/Invalid falling attack/);assert.deepEqual(c,before);}
 c.falling={meters:3,natural:10};for(const value of [-1,0,7,NaN,1.5]){const before=structuredClone(c);assert.throws(()=>resolveFalling(c,derive(c,pack),pack,()=>({value,display:String(value)})),/Invalid falling damage/);assert.deepEqual(c,before);}
 c.currentHP=0;c.falling={meters:9,natural:10,damage:18,survive:true};c.balance={active:true,activeDC:10};const before=structuredClone(c);assert.throws(()=>resolveFalling(c,derive(c,pack),pack,noDice),/cannot prevent this death/);assert.deepEqual(c,before);
});
test('saved drafts are closed, retain decimal metres and accept older characters without Falling state',()=>{
 const c=fixture();delete c.falling;const before=structuredClone(c);fallingState(c);assert.deepEqual(c,before);validateCharacter(c,pack);
 c.falling={kind:'jump',meters:4.5,reduction:'jump',jumpCheck:15,natural:10,damage:1,jumpMode:'take20',safe:true};validateCharacter(c,pack);
 for(const patch of [{meters:Infinity},{meters:-1},{natural:0},{damage:-1},{jumpCheck:1.5},{safe:1},{reduction:'constructor'},{unexpected:true}])assert.throws(()=>validateCharacter({...c,falling:{...c.falling,...patch}},pack));
});
test('accepted ambiguity choices are saved, documented with exact passages and change calculation eligibility',()=>{
 const c=fixture(),ui=createHouseRules(pack);ui.setTab('ambiguities');const html=ui.render(c);assert(html.includes('Jump Down training'));assert(html.includes('Combine reductions'));assert(html.includes('One reduction'));
 for(const [id,value] of [['ambiguity:jump-down-training','trained'],['ambiguity:fall-reductions','single']])assert(ui.change({hasAttribute:k=>k==='data-ambiguity',dataset:{ambiguity:id},value},c));
 validateCharacter(JSON.parse(JSON.stringify(c)),pack);assert.equal(ambiguityValue(c,pack,'ambiguity:fall-reductions'),'single');
});
