import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {validatePack} from '../tools/validate-rules.js';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,beginNextTurn,describeAction,finishDeflectionChoice,previewPlan,executeAction} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {activeTurnTalents,turnTalentPlan} from '../src/turn-talents.js';
import {setPersistent,recoveryState} from '../src/recovery.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const level=(cls,talent)=>({classId:'class:'+cls,hpRoll:6,startingFeat:null,feats:[],talent:talent?{id:'talent:'+talent}:null,trainedSkills:[],abilityIncreases:[]});
const weapon=(patch={})=>({uid:crypto.randomUUID(),id:'equipment:lightsaber',quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...patch});
function hero(style){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:'+(style==='makashi'?'lightsaber-defense':'block')};for(let n=2;n<=7;n++)c.levels.push(level('jedi',n===3?'deflect':null));const l=level('jedi-knight',style);l.entryDeclarations=Object.fromEntries(pack.classes.find(c=>c.id==='class:jedi-knight').entrySpecials.map(s=>[s.id,true]));c.levels.push(l);c.inventory=[weapon()];c.currentHP=derive(c,pack).hp;c.modifiers.threshold=1000;validateCharacter(c,pack);return c;}
const roller=n=>expr=>({value:n+Number(expr.slice(4)||0),d20:[n],display:expr});
const react=(c,id='deflect',patch={})=>takeAction(c,pack,id,{attackRoll:100,trigger:crypto.randomUUID(),aware:true,incoming:{amount:1},...patch},roller(10));
const bonus=c=>activeTurnTalents(c,pack,derive(c,pack).ctx).find(t=>t.id==='lightsaber-defense')?.amount||0;

test('Shii-Cho uses the actual shared counter at -2, with chronological access and unchanged ordinary -5',()=>{
 const c=hero('shii-cho'),base=derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total;react(c);react(c,'block');assert.equal(c.actionState.plan[1].result.check.bonus,base-2);assert.equal(c.deflectionAttempts,2);c.levels[7].talent=null;react(c);assert.equal(c.actionState.plan[2].result.check.bonus,base-10);assert.equal(c.deflectionAttempts,3);beginNextTurn(c,pack);react(c);assert.equal(c.actionState.plan[0].result.check.bonus,base);
});
test('a saved reroll retains its original -2 penalty after the style is removed',()=>{
 const c=hero('shii-cho');c.levels.push(level('jedi-knight'),level('jedi-knight','soresu'));react(c,'block',{rerolls:'none'});react(c,'deflect');const step=c.actionState.plan[1],before=step.result.check.bonus;assert.equal(step.status,'waiting');c.levels[7].talent=null;finishDeflectionChoice(c,pack,step.id,step.options.deflectionCheck.allowed[0],roller(1));assert.equal(c.actionState.plan[1].result.check.bonus,before);assert.equal(c.deflectionAttempts,2);validateCharacter(c,pack);
});
test('Makashi increases the single typed activation by two, preserves its saved base and logs the actual benefit',()=>{
 const c=hero('makashi'),p=turnTalentPlan(c,derive(c,pack),pack,'lightsaber-defense');assert.equal(p.amount,1);assert.equal(p.bonus,3);const r=takeAction(c,pack,'lightsaber-defense');assert.equal(c.turnTalents[0].amount,1);assert.equal(bonus(c),3);assert.match(r.text,/Reflex \+3/);const q=JSON.parse(JSON.stringify(c));validateCharacter(q,pack);assert.equal(bonus(q),3);assert.throws(()=>takeAction(c,pack,'lightsaber-defense'),/Already active/);assert.deepEqual(c.actionState.spent,['swift']);
});
test('Makashi follows hand, current size, ignition and single-weapon declarations without changing the base activation',()=>{
 const c=hero('makashi');takeAction(c,pack,'lightsaber-defense');c.inventory[0].twoHanded=true;assert.equal(bonus(c),1);c.inventory[0].twoHanded=false;assert.equal(bonus(c),3);c.inventory.push(weapon());assert.equal(bonus(c),1);c.inventory[1].activated=false;assert.equal(bonus(c),3);c.inventory[0].activated=false;assert.equal(bonus(c),1);c.inventory[0].activated=true;c.inventory[1].id='equipment:blaster-pistol';c.inventory[1].activated=true;assert.equal(bonus(c),3);assert.equal(c.turnTalents[0].amount,1);
 c.species='species:ewok';assert.equal(bonus(c),1);
});
test('Makashi caps its increase at +5, never reduces Jar Kai +6, and suppresses its increase with the underlying activation',()=>{
 const c=hero('makashi');c.levels[2].talent={id:'talent:lightsaber-defense'};c.levels[4].talent={id:'talent:lightsaber-defense'};takeAction(c,pack,'lightsaber-defense');assert.equal(bonus(c),5);c.flatFooted=true;assert(!derive(c,pack).conditionalDefenses.some(d=>d.against==='aware'&&d.type==='deflection'));c.flatFooted=false;c.levels.push(level('jedi-knight'),level('jedi-knight','niman'),level('jedi-knight'),level('jedi-knight','jar-kai'));c.inventory.push(weapon());beginNextTurn(c,pack);takeAction(c,pack,'lightsaber-defense');assert.equal(bonus(c),6);c.inventory[1].equipped=false;assert.equal(bonus(c),6);c.levels[7].talent=null;assert.equal(bonus(c),6);
 const q=hero('makashi');assert.equal(bonus(q),0);q.levels[0].talent=null;assert.equal(bonus(q),0);
});
test('Resilience moves only two steps, uses a Full-Round, retains persistent causes and never heals HP or spends FP',()=>{
 const c=hero('resilience');c.levels[7].talent=null;c.levels[0].talent={id:'talent:resilience'};c.condition=4;c.currentHP=1;setPersistent(c,'injury',true);const fp=c.forcePoints,r=takeAction(c,pack,'resilience');assert.equal(c.condition,2);assert.equal(c.currentHP,1);assert.equal(c.forcePoints,fp);assert.deepEqual(recoveryState(c).persistent,['injury']);assert.deepEqual(c.actionState.spent,['standard','move','swift']);assert.match(r.text,/\+2 condition steps/);assert.equal(c.recovery.indomitableSpent,0);const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'resilience'),/Full-Round/);assert.deepEqual(c,before);beginNextTurn(c,pack);takeAction(c,pack,'resilience');assert.equal(c.condition,0);assert.deepEqual(recoveryState(c).persistent,['injury']);validateCharacter(c,pack);
});
test('Resilience clamps at Normal State, cannot act helpless, and queues without mutation or die rolls',()=>{
 const c=hero('resilience');c.levels[7].talent=null;c.levels[0].talent={id:'talent:resilience'};c.condition=1;const a=queueAction(c,'resilience'),b=queueAction(c,'resilience'),before=structuredClone(c);const rows=previewPlan(c,pack);assert(!rows[0].issue);assert.match(rows[1].issue,/Normal State/);assert.deepEqual(c,before);executeAction(c,pack,a.id,()=>{throw Error('Unexpected die');});assert.equal(c.condition,0);assert.throws(()=>executeAction(c,pack,a.id),/resolved/);c.condition=5;assert.throws(()=>describeAction(c,pack,'resilience'),/helpless/);
});

test('style metadata retains closed penalties, caps, matching talent records and pinned sources',()=>{
 validatePack(pack);for(const change of [p=>p.rules.deflectionModifiers[0].penaltyPerPriorAttempt=0,p=>p.rules.lightsaberDefenseStyle.maximum=10,p=>p.rules.lightsaberDefenseStyle.sourceIds=[],p=>p.talents=p.talents.filter(t=>t.id!=='talent:makashi')]){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
});
