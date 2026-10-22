import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,beginNextTurn,endTrackedCombat,finishDeflectionChoice,finishForceChoice,executeAction,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {deflectionDamage,deflectionRule} from '../src/deflection.js';
import {applyIncomingDamage} from '../src/incoming-damage.js';
import {startNextRound} from '../src/opportunity.js';
import {newDay} from '../src/recovery.js';
import {balanceState} from '../src/balance.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const level=(n,talent,cls='jedi')=>({classId:'class:'+cls,hpRoll:6,startingFeat:null,feats:[],talent:talent?{id:'talent:'+talent}:null,trainedSkills:[],abilityIncreases:n%4===0?['str','cha']:[]});
function hero({soresu=false,knack=false,evasion=false}={}){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:block'};for(let n=2;n<=7;n++)c.levels.push(level(n,n===3?'deflect':null));if(soresu){const l=level(8,'soresu','jedi-knight');l.entryDeclarations=Object.fromEntries(pack.classes.find(c=>c.id==='class:jedi-knight').entrySpecials.map(s=>[s.id,true]));c.levels.push(l);}if(knack)c.levels.push(level(c.levels.length+1,'knack','scoundrel'));if(evasion)c.levels.push(level(c.levels.length+1,'evasion','scout'));c.inventory=[{uid:crypto.randomUUID(),id:'equipment:lightsaber',quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];c.currentHP=derive(c,pack).hp;c.modifiers.threshold=1000;validateCharacter(c,pack);return c;}
const opts=(patch={})=>({aware:true,attackRoll:20,trigger:crypto.randomUUID(),kind:'single',hit:true,target:'self',incoming:{amount:20,options:{energy:true}},...patch});
const roller=natural=>expr=>({value:natural+Number(expr.slice(4)||0),d20:[natural],display:expr});
const run=(c,id='deflect',patch={},natural=15)=>takeAction(c,pack,id,opts(patch),roller(natural));

test('shared attempt penalties include failures, reset at own turn, and survive rounds and ending combat',()=>{
 const c=hero(),bonus=derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total,hp=c.currentHP;run(c);assert.equal(c.currentHP,hp);assert.equal(c.actionState.plan[0].result.check.bonus,bonus);run(c,'block',{},1);assert.equal(c.currentHP,hp-20);assert.equal(c.actionState.plan[1].result.check.bonus,bonus-5);assert.equal(c.deflectionAttempts,2);startNextRound(c);assert.equal(c.deflectionAttempts,2);endTrackedCombat(c);assert.equal(c.deflectionAttempts,2);beginNextTurn(c,pack);assert.equal(c.deflectionAttempts,0);validateCharacter(c,pack);
});
test('readiness, awareness, talents, trigger and capital/Sonic declarations are atomic preflight requirements',()=>{
 for(const patch of [{aware:false},{trigger:''},{capital:true},{incoming:{amount:10,options:{sonic:true}}},{attackRoll:null},{incoming:{amount:-1}},{kind:'bogus'},{kind:'force-lightning',incoming:{amount:10,options:{type:'stun'}}}]){const c=hero(),before=structuredClone(c);assert.throws(()=>run(c,'deflect',patch));assert.deepEqual(c,before);}
 for(const key of ['equipped','activated','carried']){const c=hero();c.inventory[0][key]=false;const before=structuredClone(c);assert.throws(()=>run(c),/Lightsaber/);assert.deepEqual(c,before);}
 const c=hero();c.flatFooted=true;assert.throws(()=>run(c),/flat-footed/);c.flatFooted=false;run(c,'deflect',{capital:true,pointDefense:true});assert(c.actionState.plan[0].status==='done');
});
test('equal DC succeeds and normal failures pass once through SR, DR and bonus HP',()=>{
 const c=hero(),bonus=derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total;c.protection={sr:5,srMax:5,dr:3,drBypass:''};c.bonusHP=4;const hp=c.currentHP;run(c,'deflect',{attackRoll:bonus+15});assert.equal(c.currentHP,hp);assert.equal(c.protection.sr,5);run(c,'deflect',{attackRoll:100});assert.equal(c.currentHP,hp-8);assert.equal(c.protection.sr,0);assert.equal(c.bonusHP,0);assert.equal(c.actionState.plan[1].status,'done');validateCharacter(c,pack);
});
test('area hit/miss, minimum attack roll, cover and independent Evasion reductions are explicit',()=>{
 for(const id of ['block','deflect'])for(const hit of [false,true])for(const success of [false,true]){
  const c=hero(),r=deflectionRule(pack,id),kind=id==='block'?'area':'autofire';assert.equal(deflectionDamage(c,derive(c,pack),pack,r,opts({kind,hit}),success).amount,success?(hit?10:0):(hit?20:10));
  assert.equal(deflectionDamage(c,derive(c,pack),pack,r,opts({kind,hit:false,cover:true}),success).amount,0);assert.equal(deflectionDamage(c,derive(c,pack),pack,r,opts({kind,attackRoll:9}),success).amount,0);
 }
 const c=hero({evasion:true}),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:evasion'));const r=deflectionRule(pack,'deflect');assert.equal(deflectionDamage(c,d,pack,r,opts({kind:'autofire'}),true).amount,5);assert.equal(deflectionDamage(c,d,pack,r,opts({kind:'autofire'}),false).amount,10);assert.equal(deflectionDamage(c,d,pack,r,opts({kind:'autofire',hit:false}),false).amount,0);
});
test('mixed Sonic damage survives a successful Deflect on a hit, while a miss has no Sonic remainder',()=>{
 const c=hero(),hp=c.currentHP;run(c,'deflect',{sonicDamage:6,incoming:{amount:20,options:{energy:true,sonic:true}}});assert.equal(c.currentHP,hp-6);
 const r=deflectionRule(pack,'deflect'),d=derive(c,pack);assert.equal(deflectionDamage(c,d,pack,r,opts({kind:'autofire',sonicDamage:6,incoming:{amount:20,options:{energy:true,sonic:true}}}),true).amount,13);assert.equal(deflectionDamage(c,d,pack,r,opts({sonicDamage:6,hit:false,incoming:{amount:20,options:{energy:true,sonic:true}}}),true).amount,0);
});
test('Force Lightning retains secondary CT steps on a hit and has none on a miss, regardless of shield absorption',()=>{
 for(const hit of [false,true])for(const enhanced of [false,true]){const c=hero();c.protection={sr:100,srMax:100,dr:0,drBypass:''};const hp=c.currentHP;run(c,'deflect',{kind:'force-lightning',hit,attackerForcePoint:enhanced});assert.equal(c.currentHP,hp);assert.equal(c.condition,hit?(enhanced?2:1):0);validateCharacter(c,pack);}
 const c=hero();c.condition=4;run(c,'deflect',{kind:'force-lightning',attackRoll:10});assert.equal(c.condition,5);assert.equal(c.currentHP,derive(c,pack).hp-10);assert(!c.recovery?.dead);
});
test('protecting an adjacent ally pays once even on failure and never applies damage to the actor',()=>{
 for(const natural of [1,15]){const c=hero(),hp=c.currentHP,fp=c.forcePoints;c.protection.sr=4;c.protection.srMax=4;const result=run(c,'deflect',{target:'adjacent'},natural);assert.equal(c.currentHP,hp);assert.equal(c.protection.sr,4);assert.equal(c.forcePoints,fp-1);assert(c.actionState.forceSpent);assert.match(result.text,/ally damage/);const before=structuredClone(c);assert.throws(()=>run(c,'deflect',{target:'adjacent'}),/Force Point/);assert.deepEqual(c,before);}
});
test('Soresu defers effects, survives reload, uses one reroll without another attempt, and rejects replay',()=>{
 const c=hero({soresu:true}),hp=c.currentHP;assert(derive(c,pack).skillRerolls.some(s=>s.id==='talent:soresu'));run(c,'deflect',{},1);let step=c.actionState.plan[0];assert.equal(step.status,'waiting');assert.equal(c.currentHP,hp);const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.throws(()=>applyIncomingDamage(saved,derive(saved,pack),pack,1),/Resolve Block/);assert.throws(()=>beginNextTurn(saved,pack),/pending reroll/);assert.throws(()=>finishForceChoice(saved,pack,step.id,false));finishDeflectionChoice(saved,pack,step.id,step.options.deflectionCheck.allowed[0],roller(19));step=saved.actionState.plan[0];assert.equal(step.status,'done');assert.equal(saved.currentHP,hp);assert.equal(saved.deflectionAttempts,1);assert.equal(step.options.deflectionCheck.rolls.length,2);assert.throws(()=>finishDeflectionChoice(saved,pack,step.id,null));validateCharacter(saved,pack);
});
test('declining Soresu applies damage once; reroll replacement can be worse without turning it into a second attempt',()=>{
 const c=hero({soresu:true}),hp=c.currentHP;run(c,'block',{attackRoll:30},1);const step=c.actionState.plan[0];finishDeflectionChoice(c,pack,step.id,null);assert.equal(c.currentHP,hp-20);assert.equal(c.deflectionAttempts,1);assert.equal(c.actionState.plan[0].status,'done');
 const h=hero({soresu:true});run(h,'block',{attackRoll:30},5);const s=h.actionState.plan[0];finishDeflectionChoice(h,pack,s.id,s.options.deflectionCheck.allowed[0],roller(1));assert.equal(h.actionState.plan[0].result.check.natural,1);assert.equal(h.deflectionAttempts,1);
});
test('Knack keeps the higher check, shares daily capacity, and does not authorize unrelated reroll sources',()=>{
 const c=hero({soresu:true,knack:true});run(c,'deflect',{attackRoll:40},5);const step=c.actionState.plan[0],knack=step.options.deflectionCheck.allowed.find(id=>id.startsWith('talent:knack'));assert(knack);finishDeflectionChoice(c,pack,step.id,knack,roller(1));assert.equal(c.actionState.plan[0].result.check.natural,5);assert.equal(c.recovery.knacksSpent,1);assert.equal(c.actionState.plan[0].status,'waiting');const before=structuredClone(c);assert.throws(()=>finishDeflectionChoice(c,pack,step.id,knack,roller(20)),/unavailable/);assert.deepEqual(c,before);finishDeflectionChoice(c,pack,step.id,null);newDay(c,pack);assert.equal(c.recovery.knacksSpent,0);assert.equal(c.deflectionAttempts,0);
});
test('plans reserve consecutive penalties and declarations, spending no real resources before execution',()=>{
 const c=hero(),o=opts();queueAction(c,'deflect',o);queueAction(c,'block',opts());o.incoming.amount=999;const before=structuredClone(c),p=previewPlan(c,pack);assert(!p[0].issue&&!p[1].issue);assert.deepEqual(c,before);assert.equal(c.actionState.plan[0].options.incoming.amount,20);executeAction(c,pack,c.actionState.plan[0].id,roller(15));assert.equal(c.deflectionAttempts,1);
});
test('damage failures retain Balance rechecks and fatal survival uses the shared FP ledger',()=>{
 const c=hero();c.trainedSkills.push('skill:acrobatics');c.balance={...balanceState(c),active:true,activeDC:15};let rolls=0;const result=takeAction(c,pack,'deflect',opts({attackRoll:100}),expr=>roller(rolls++?20:1)(expr));assert.equal(rolls,2);assert.match(result.text,/Balance recheck/);
 const h=hero();h.modifiers.threshold=0;h.currentHP=1;run(h,'deflect',{attackRoll:100,incoming:{amount:1000,options:{energy:true,spendForcePoint:true}}},1);assert.equal(h.condition,5);assert(!h.recovery?.dead);assert(h.actionState.forceSpent);validateCharacter(h,pack);
});
test('saved deflection checks reject invalid roll histories and counters; completed history allows later respec',()=>{
 const c=hero({soresu:true});run(c,'block',{},1);for(const mutate of [q=>q.deflectionAttempts=-1,q=>q.actionState.plan[0].result.check.total++,q=>q.actionState.plan[0].options.deflectionCheck.rolls.push(5),q=>q.actionState.plan[0].options.aware=false]){const bad=structuredClone(c);mutate(bad);assert.throws(()=>validateCharacter(bad,pack));}
 finishDeflectionChoice(c,pack,c.actionState.plan[0].id,null);c.levels[0].talent=null;c.inventory=[];validateCharacter(c,pack);
});

test('a reaction interrupts Aim without inventing a new normal action or power-suite recovery',()=>{
 const c=hero();c.inventory.push({uid:crypto.randomUUID(),id:'equipment:blaster-pistol',quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,aimed:true});run(c);assert(!c.inventory[1].aimed);assert.deepEqual(c.actionState.spent,[]);assert(!c.forcePowerRecoveryPending);
});

test('newly unavailable reroll sources cannot roll a saved check, and new rest cannot erase its pending result',()=>{
 const c=hero({soresu:true});run(c,'block',{},1);const step=c.actionState.plan[0];c.helpless=true;const before=structuredClone(c);assert.throws(()=>finishDeflectionChoice(c,pack,step.id,step.options.deflectionCheck.allowed[0],roller(20)),/unavailable/);assert.deepEqual(c,before);assert.throws(()=>newDay(c,pack),/Resolve Block/);assert.deepEqual(c,before);
});
