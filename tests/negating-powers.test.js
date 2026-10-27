import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {balanceState} from '../src/balance.js';
import {queueAction} from '../src/action-economy.js';
import {takeAction,finishForceChoice,beginNextTurn,endCurrentTurn,endTrackedCombat,describeAction,previewPlan} from '../src/action-engine.js';
import {applyIncomingDamage} from '../src/incoming-damage.js';
import {incomingDamageDeclaration} from '../src/damage-declarations.js';
import {finishNegatingPower,negatingPowerRule} from '../src/negating-powers.js';
import {finishResistancePower,renewResistancePower} from '../src/resistance-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=Array.from({length:3},()=>({id:crypto.randomUUID(),powerId:'power:negate-energy',spent:false}));c.currentHP=derive(c,pack).hp;c.modifiers.threshold=1000;return c;}
const incoming=(amount,options={})=>({amount,options:{energy:true,...options}});
function cast(c,amount,{natural=13,options={},...rest}={}){const bonus=derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total,copy=c.levels[0].forcePowers.find(p=>!p.spent);return takeAction(c,pack,'power',{powerId:copy.id,aware:true,trigger:'Bolt '+copy.id,fp:'ask',enhance:false,incoming:incoming(amount,options),...rest},()=>({value:natural+bonus,d20:[natural],display:'d20 '+natural}));}

test('negation contract pins raw-damage comparison, Energy eligibility and special Reaction healing',()=>{
 const r=negatingPowerRule(pack,'power:negate-energy');assert.equal(r.dc,'raw-attack-damage');assert.equal(r.comparison,'at-least');assert.equal(r.healing.action,'reaction');assert.equal(r.healing.amount,'raw-attack-damage');assert.deepEqual(r.damageTypes,['energy']);assert(r.aware&&r.notFlatFooted);
});
test('equal DC negates the whole incoming attack without spending HP, SR, bonus HP or normal actions; a miss applies real protection once',()=>{
 const c=hero();c.protection={sr:8,srMax:8,dr:4,drBypass:''};c.bonusHP=5;const hp=c.currentHP;cast(c,20);assert.equal(c.currentHP,hp);assert.equal(c.protection.sr,8);assert.equal(c.bonusHP,5);assert(c.levels[0].forcePowers[0].spent);assert.deepEqual(c.actionState.spent,[]);assert(c.actionState.ended);assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.actionState.reactions.length,1);
 cast(c,21);assert.equal(c.protection.sr,3);assert.equal(c.bonusHP,0);assert.equal(c.currentHP,hp-4);assert.equal(c.actionState.plan[1].status,'done');assert.equal(c.actionState.reactions.length,2);assert.match(c.actionState.plan[1].result.text,/Not negated/);validateCharacter(c,pack);
});
test('success ignores Lightsaber bypass and negates mixed Energy and Sonic attacks; pure physical and Fire attacks fail preflight',()=>{
 for(const options of [{lightsaber:true},{otherDamage:true},{sonic:true,energy:false},{type:'stun'},{type:'ion'}]){const c=hero(),hp=c.currentHP;cast(c,20,{options});assert.equal(c.currentHP,hp);assert.equal(c.condition,0);}
 for(const options of [{energy:false},{energy:false,fire:true},{energy:1}]){const c=hero(),before=structuredClone(c);assert.throws(()=>cast(c,10,{options}));assert.deepEqual(c,before);}
});
test('unaware, flat-footed, malformed or already-reacted declarations spend no copy, point or action',()=>{
 const c=hero();for(const override of [{aware:false},{incoming:{amount:-1}},{incoming:{amount:1000000001}},{incoming:incoming(10,{type:'unknown'})},{incoming:{...incoming(10),extra:true}}]){const before=structuredClone(c);assert.throws(()=>cast(c,10,override));assert.deepEqual(c,before);}
 c.flatFooted=true;assert.throws(()=>cast(c,10),/flat-footed/);assert(!c.actionState);c.flatFooted=false;cast(c,10,{trigger:'hit 1'});const before=structuredClone(c);assert.throws(()=>cast(c,10,{trigger:' HIT 1 '}),/Already reacted/);assert.deepEqual(c,before);
});
test('queueing snapshots incoming damage without mutating resources or predicting an unrolled result',()=>{
 const c=hero(),declaration=incoming(25,{lightsaber:true});queueAction(c,'power',{powerId:c.levels[0].forcePowers[0].id,aware:true,trigger:'Attack',enhance:true,incoming:declaration});declaration.amount=1;assert.equal(c.actionState.plan[0].options.incoming.amount,25);const before=structuredClone(c),rows=previewPlan(c,pack);assert(!rows[0].issue);assert.deepEqual(c,before);assert(c.levels[0].forcePowers.every(p=>!p.spent));
});
test('successful Reaction healing saves the roll, survives reload, obeys the HP cap and shared FP ledger, and cannot resolve twice',()=>{
 const c=hero(),max=derive(c,pack).hp;c.currentHP=max-6;cast(c,20,{enhance:true});assert.equal(c.currentHP,max-6);assert.equal(c.actionState.plan[0].status,'waiting');assert(!c.actionState.plan[0].result.fpAllowed);const saved=JSON.parse(JSON.stringify(c)),id=saved.actionState.plan[0].id,fp=saved.forcePoints;validateCharacter(saved,pack);assert.throws(()=>applyIncomingDamage(saved,derive(saved,pack),pack,1),/Resolve Negate/);assert.throws(()=>beginNextTurn(saved,pack),/pending Force Point/);assert.throws(()=>endCurrentTurn(saved,pack),/pending Force Point/);assert.throws(()=>finishForceChoice(saved,pack,id,'bonus'),/bonus unavailable/);finishForceChoice(saved,pack,id,'enhance');assert.equal(saved.currentHP,max);assert.equal(saved.forcePoints,fp-1);assert(saved.actionState.forceSpent);assert.equal(saved.actionState.plan[0].status,'done');assert.throws(()=>finishForceChoice(saved,pack,id,'enhance'));assert.equal(saved.forcePoints,fp-1);validateCharacter(saved,pack);
});
test('declining healing and success after a point already spent negate without paying; an inadequate check never offers healing',()=>{
 const c=hero(),hp=c.currentHP;c.currentHP-=5;cast(c,20,{enhance:true});finishForceChoice(c,pack,c.actionState.plan[0].id,false);assert.equal(c.currentHP,hp-5);assert.equal(c.forcePoints,5);c.actionState.forceSpent=true;cast(c,20,{enhance:true});assert.equal(c.actionState.plan[1].status,'done');assert.equal(c.currentHP,hp-5);assert.equal(c.forcePoints,5);
 const h=hero();cast(h,21,{enhance:true});assert.equal(h.actionState.plan[0].status,'done');assert(!h.actionState.plan[0].result.enhanceAllowed);assert.equal(h.currentHP,derive(h,pack).hp-21);assert.equal(h.forcePoints,5);
});
test('original raw damage controls success and healing despite SR/DR; normal failure handles Stun and threshold steps',()=>{
 const c=hero();c.protection.dr=100;cast(c,21,{enhance:true});assert.match(c.actionState.plan[0].result.text,/Not negated/);assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.currentHP,derive(c,pack).hp);
 const h=hero();h.protection.dr=4;cast(h,21,{options:{type:'stun'}});assert.equal(h.currentHP,derive(h,pack).hp-Math.floor(17/2));
 const q=hero();q.modifiers.threshold=0;const hp=q.currentHP;cast(q,25,{natural:1,options:{type:'stun'}});assert.equal(q.currentHP,hp-12);assert.equal(q.condition,2);validateCharacter(q,pack);
});
test('failed negation handles fatal damage and an explicit survival FP atomically, including the current action result',()=>{
 for(const survive of [false,true]){const c=hero();c.modifiers.threshold=0;const fp=c.forcePoints;cast(c,100,{natural:1,options:{spendForcePoint:survive}});assert.equal(c.currentHP,0);assert.equal(c.condition,5);assert.equal(!!c.recovery?.dead,!survive);assert.equal(c.forcePoints,fp-(survive?1:0));assert.equal(c.actionState.plan[0].status,'done');assert(c.actionState.reactions.length);validateCharacter(c,pack);}
 const c=hero();c.modifiers.threshold=0;c.forcePoints=0;const before=structuredClone(c);assert.throws(()=>cast(c,100,{options:{spendForcePoint:true}}),/cannot prevent/);assert.deepEqual(c,before);
});
test('failed incoming damage creates the existing maintenance checks; successful negation neither locks protection nor requires concentration',()=>{
 for(const success of [true,false]){const c=hero();cast(c,0);beginNextTurn(c,pack);const row=finishResistancePower(c,pack,crypto.randomUUID(),'power:energy-resistance',{total:25});c.actionState.turn++;renewResistancePower(c,row.id);cast(c,20,{natural:success?13:1});const effect=c.resistancePowerEffects[0];if(success){assert.equal(effect.pending,null);assert(!effect.used);}else{assert.equal(effect.pending.damage,10);assert(effect.used);}validateCharacter(c,pack);}
});
test('natural 20 is recovery rather than automatic success, while paid healing does not repeat activation or recover the suite early',()=>{
 const c=hero();cast(c,100,{natural:20});assert.match(c.actionState.plan[0].result.text,/Not negated/);assert(c.forcePowerRecoveryPending);assert.equal(c.forcePowerRecoveryTurn,2);
 const h=hero();h.currentHP-=10;cast(h,20,{natural:20,enhance:true});assert.equal(h.forcePowerRecoveryTurn,2);finishForceChoice(h,pack,h.actionState.plan[0].id,'enhance');assert.equal(h.forcePowerRecoveryTurn,2);assert(h.levels[0].forcePowers[0].spent);endCurrentTurn(h,pack);assert(h.levels[0].forcePowers[0].spent);
});
test('healing never reduces HP above normal maximum, declaration snapshots validate, and old completed manual histories remain compatible',()=>{
 const c=hero(),max=derive(c,pack).hp;c.currentHP=max+4;cast(c,20,{enhance:true});finishForceChoice(c,pack,c.actionState.plan[0].id,'enhance');assert.equal(c.currentHP,max+4);const saved=structuredClone(c);saved.levels[0].forcePowers=[];validateCharacter(saved,pack);
 const pending=hero();cast(pending,20,{enhance:true});for(const mutate of [s=>s.options.incoming.amount=21,s=>s.result.fpAllowed=true,s=>s.options.aware=false,s=>s.result.check.total++,s=>s.options.incoming.options.extra=true]){const bad=structuredClone(pending);mutate(bad.actionState.plan[0]);assert.throws(()=>validateCharacter(bad,pack));}
 assert.throws(()=>incomingDamageDeclaration({amount:1,options:{against:['a','a']}}));assert.throws(()=>finishNegatingPower(c,derive(c,pack),pack,'power:negate-energy',{total:1},incoming(2),{heal:true}));
});


test('a failed negation performs the mandatory Balance recheck through the same damage path, while success rolls no recheck',()=>{
 for(const success of [false,true]){const c=hero();c.trainedSkills.push('skill:acrobatics');c.balance={...balanceState(c),active:true,activeDC:15};let calls=0;const r=takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers[0].id,aware:true,trigger:'Narrow ledge',enhance:false,incoming:incoming(20)},expr=>{const natural=calls++?19:success?13:1;return {value:natural+Number(expr.slice(4)||0),d20:[natural],display:expr};});assert.equal(calls,success?1:2);if(!success)assert.match(r.text,/Balance recheck/);assert(c.balance.active);validateCharacter(c,pack);}
});

test('Force Power Adept takes the higher check, excludes ordinary healing but permits emergency survival',()=>{
 const c=hero();c.levels[0].feats.push({id:'feat:skill-focus',choice:'skill:use-the-force'});c.levels[0].talent={id:'talent:equilibrium'};
 for(let n=2;n<=8;n++)c.levels.push({classId:n===8?'class:force-adept':'class:jedi',hpRoll:6,feats:[],talent:n===3?{id:'talent:force-recovery'}:n===5?{id:'talent:force-focus'}:n===8?{id:'talent:force-power-adept',choice:'power:negate-energy'}:null,startingFeat:null,abilityIncreases:[4,8].includes(n)?['str','con']:[],trainedSkills:[]});
 c.currentHP=derive(c,pack).hp;assert(derive(c,pack).forcePowers[0].adept);const fp=c.forcePoints,bonus=derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total;let calls=0;
 takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers[0].id,aware:true,trigger:'Adept bolt',rollMode:'adept',enhance:false,incoming:incoming(20)},()=>{const natural=[3,12][calls++];return {value:natural+bonus,d20:[natural],display:String(natural)};});assert.equal(calls,2);assert.equal(c.actionState.plan[0].result.check.natural,12);assert.equal(c.forcePoints,fp-1);assert(c.actionState.forceSpent);assert.equal(c.actionState.plan[0].status,'done');beginNextTurn(c,pack);
 const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers[1].id,aware:true,trigger:'Too many ordinary points',rollMode:'adept',enhance:true,incoming:incoming(20)}),/Only one Force Point/);assert.deepEqual(c,before);
 c.modifiers.threshold=0;c.currentHP=1;c.forcePoints=2;calls=0;takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers[1].id,aware:true,trigger:'Fatal adept bolt',rollMode:'adept',enhance:false,incoming:incoming(100,{spendForcePoint:true})},()=>{calls++;return {value:bonus+1,d20:[1],display:'1'};});assert.equal(calls,2);assert.equal(c.forcePoints,0);assert.equal(c.currentHP,0);assert.equal(!!c.recovery?.dead,false);assert(c.actionState.forceSpent);assert.match(c.actionState.plan[0].result.text,/Force Points -1/);validateCharacter(c,pack);
});
