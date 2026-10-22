import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,beginNextTurn,endCurrentTurn,endTrackedCombat,describeAction,finishForceChoice,rollResistanceMaintenance,finishResistanceMaintenance,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {activeResistancePowers,pendingResistanceChecks,chooseResistancePowerTier,removeResistancePower} from '../src/resistance-powers.js';
import {applyIncomingDamage,damageOutcome} from '../src/incoming-damage.js';
import {recoverSuite} from '../src/force-powers.js';
import {setDead,newDay} from '../src/recovery.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=Array.from({length:3},()=>({id:crypto.randomUUID(),powerId:'power:energy-resistance',spent:false}));c.currentHP=100;c.modifiers.threshold=1000;return c;}
const cast=(c,total=35,o={})=>takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers.find(p=>!p.spent).id,fp:'none',...o},()=>({value:total,d20:[10],display:String(total)}));
const hit=(c,amount=25,o={energy:true})=>applyIncomingDamage(c,derive(c,pack),pack,amount,o);
const maintain=c=>beginNextTurn(c,pack,{maintain:c.resistancePowerEffects.map(s=>s.id)});
const utfRoll=(c,natural)=>({value:natural+derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total,d20:[natural],display:String(natural)});

test('Energy Resistance native activation spends the copy, grants achieved DR, locks actual damage tiers and prints typed protection',()=>{
 for(const [total,dr]of [[19,0],[20,5],[24,5],[25,10],[30,15],[35,20]]){const c=hero();cast(c,total);assert.equal(activeResistancePowers(c,pack)[0]?.dr||0,dr);assert(c.levels[0].forcePowers[0].spent);assert.deepEqual(c.actionState.spent,['standard']);validateCharacter(c,pack);}
 const c=hero();cast(c);const id=c.resistancePowerEffects[0].id;chooseResistancePowerTier(c,pack,id,2);assert.equal(hit(c,15).hpDamage,5);assert.equal(c.resistancePowerEffects[0].tier,2);assert.equal(pendingResistanceChecks(c).length,0);assert.throws(()=>chooseResistancePowerTier(c,pack,id,4));assert.equal(hit(c,15).hpDamage,5);assert.match(renderStatBlock(c,derive(c,pack),pack),/Energy Resistance \(DR 10\)/);
});
test('Swift quickening spends before even a failed check, shares the round limit, cannot enhance afterwards',()=>{
 const c=hero(),fp=c.forcePoints;let observed=false;
 const copy=c.levels[0].forcePowers[0];const r=takeAction(c,pack,'power',{powerId:copy.id,quicken:true,fp:'ask',enhance:true},()=>{observed=true;return {value:19,d20:[1],display:'19'};});assert(observed);assert.equal(c.forcePoints,fp-1);assert(c.levels[0].forcePowers[0].spent);assert.deepEqual(c.actionState.spent,['swift']);assert(c.actionState.forceSpent);assert.equal(c.actionState.plan[0].status,'done');assert(!r.fpAllowed&&!r.enhanceAllowed);assert(!c.resistancePowerEffects);const before=structuredClone(c);assert.throws(()=>cast(c,35,{quicken:true}),/Force Point already/);assert.deepEqual(c,before);assert.throws(()=>finishForceChoice(c,pack,c.actionState.plan[0].id,'enhance'));
 const h=hero();h.forcePoints=0;assert.throws(()=>cast(h,35,{quicken:true}),/Not enough Force/);assert(!h.actionState);const p=hero();queueAction(p,'power',{powerId:p.levels[0].forcePowers[0].id,quicken:true,fp:'none'});const snapshot=structuredClone(p);assert.equal(previewPlan(p,pack)[0].cost.type,'swift');assert.deepEqual(p,snapshot);
});
test('typed resistance uses highest applicable DR after SR, honors Sonic and mixed Energy, and leaves Fire optional and Lightsabers unprotected',()=>{
 const c=hero();cast(c);c.protection.dr=8;c.protection.sr=5;c.protection.srMax=5;
 for(const [options,expected]of [[{energy:true},20],[{sonic:true},20],[{energy:true,otherDamage:true},20],[{fire:true},8],[{cold:true},8],[{},8],[{energy:true,lightsaber:true},0],[{energy:true,ignoreDR:true},0]]){const before=structuredClone(c),r=damageOutcome(c,derive(c,pack),pack,30,options);assert.equal(r.srBlocked,5);assert.equal(r.drBlocked,expected);assert.deepEqual(c,before);}
 c.houseRules={ambiguities:{'ambiguity:energy-resistance-damage':'listed-sources'}};for(const flag of ['fire','cold','electrical'])assert.equal(damageOutcome(c,derive(c,pack),pack,30,{[flag]:true}).drBlocked,20);c.protection.dr=25;assert.equal(hit(c,35).drBlocked,25);assert.equal(c.resistancePowerEffects[0].tier,4);assert.equal(c.protection.sr,0);
});
test('New Turn combines Standard Shield and Swift Resistance maintenance atomically, retains each family, and permits several Swift renewals when affordable',()=>{
 const c=hero();c.levels[0].forcePowers[1].powerId='power:force-shield';cast(c);const resistance=c.resistancePowerEffects[0].id;takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers[1].id,trigger:'bolt',fp:'none'},()=>({value:25,d20:[10],display:'25'}));const shield=c.shieldPowerEffects[0].id;beginNextTurn(c,pack,{maintain:[shield,resistance]});assert.deepEqual(c.actionState.spent,['standard','swift']);assert(c.resistancePowerEffects[0].maintained);assert.equal(c.shieldPowerEffects[0].sr,15);assert.throws(()=>takeAction(c,pack,'maintain-power',{effectId:resistance}),/unavailable/);validateCharacter(c,pack);
 const h=hero();cast(h,35,{quicken:true});cast(h);maintain(h);assert.deepEqual(h.actionState.spent,['swift','move']);assert.equal(h.resistancePowerEffects.length,2);beginNextTurn(h,pack);assert(!h.resistancePowerEffects);
 const q=hero();cast(q);q.levels[0].forcePowers[1].powerId='power:force-shield';q.levels[0].forcePowers[2].powerId='power:force-shield';for(let i=0;i<2;i++)takeAction(q,pack,'power',{powerId:q.levels[0].forcePowers[1+i].id,trigger:'bolt'+i,fp:'none'},()=>({value:25,d20:[10],display:'25'})); const snapshot=structuredClone(q);assert.throws(()=>beginNextTurn(q,pack,{maintain:[...q.resistancePowerEffects,...q.shieldPowerEffects].map(s=>s.id)}),/Not enough Standard/);assert.deepEqual(q,snapshot);
});
test('maintained damage persists exact post-protection/pre-halving/pre-bonus damage, blocks further actions and damage, and releases only after its saved decision',()=>{
 const c=hero();cast(c);maintain(c);c.bonusHP=20;const r=hit(c,30,{energy:true,type:'stun'});assert.equal(r.penetrating,10);assert.equal(r.hpDamage,0);assert.equal(c.bonusHP,15);assert.equal(pendingResistanceChecks(c)[0].pending.damage,10);const before=structuredClone(c);
 assert.throws(()=>hit(c,1),/Resolve or release/);assert.throws(()=>takeAction(c,pack,'manual-free',{note:'Anything'}),/Resolve or release/);assert.throws(()=>beginNextTurn(c,pack),/Resolve or release/);assert.throws(()=>endCurrentTurn(c,pack),/Resolve or release/);assert.deepEqual(c,before);
 const id=c.resistancePowerEffects[0].id;rollResistanceMaintenance(c,pack,id,()=>utfRoll(c,20));const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.throws(()=>rollResistanceMaintenance(saved,pack,id),/unavailable/);assert.equal(saved.forcePowerRecoveryPending,undefined);const result=finishResistanceMaintenance(saved,pack,id,false);assert.equal(result.dc,25);assert.equal(result.total,27);assert(result.success);assert.equal(pendingResistanceChecks(saved).length,0);assert.equal(saved.currentHP,100);validateCharacter(saved,pack);
});
test('damage check FP decisions use one saved roll and the shared round allowance; a failed check removes protection only after the triggering hit',()=>{
 const c=hero();cast(c);maintain(c);hit(c,30);const id=c.resistancePowerEffects[0].id;rollResistanceMaintenance(c,pack,id,()=>utfRoll(c,15));assert.equal(c.resistancePowerEffects[0].pending.check.total,22);const fp=c.forcePoints,r=finishResistanceMaintenance(c,pack,id,true,()=>({value:3,display:'3'}));assert(r.success);assert.equal(c.forcePoints,fp-1);assert(c.actionState.forceSpent);assert.equal(c.currentHP,90);hit(c,30);rollResistanceMaintenance(c,pack,id,()=>utfRoll(c,1));const before=structuredClone(c);assert.throws(()=>finishResistanceMaintenance(c,pack,id,true),/Force Point unavailable/);assert.deepEqual(c,before);assert(!finishResistanceMaintenance(c,pack,id,false).success);assert(!c.resistancePowerEffects);assert.equal(c.currentHP,80);assert.equal(hit(c,10).hpDamage,10);
});
test('every maintained copy checks separately, zero damage checks none, physical damage checks too, and manual release never refunds the copy',()=>{
 const c=hero();cast(c,35,{quicken:true});cast(c);maintain(c);hit(c,20);assert.equal(pendingResistanceChecks(c).length,0);hit(c,10,{});assert.equal(pendingResistanceChecks(c).length,2);const [a,b]=c.resistancePowerEffects.map(s=>s.id);const fp=c.forcePoints;removeResistancePower(c,a);assert.equal(pendingResistanceChecks(c).length,1);rollResistanceMaintenance(c,pack,b,()=>utfRoll(c,1));finishResistanceMaintenance(c,pack,b,false);assert(!c.resistancePowerEffects);assert.equal(c.forcePoints,fp);assert.equal(c.levels[0].forcePowers.filter(p=>p.spent).length,2);
});
test('helpless damage, death, explicit rest and New Day clear effects/checks, whereas End combat alone preserves duration',()=>{
 for(const stop of ['helpless','death','rest','day']){const c=hero();cast(c);maintain(c);hit(c,25);if(stop==='helpless'){removeResistancePower(c,c.resistancePowerEffects[0].id);cast(c,35,{quicken:true});beginNextTurn(c,pack,{maintain:c.resistancePowerEffects.map(s=>s.id)});c.currentHP=1;hit(c,21);}else if(stop==='death')setDead(c,true);else if(stop==='rest')recoverSuite(c,derive(c,pack));else newDay(c,pack);assert(!c.resistancePowerEffects,stop);}
 const c=hero();cast(c);endTrackedCombat(c);assert(c.resistancePowerEffects);beginNextTurn(c,pack);assert(!c.resistancePowerEffects);
});


test('Swift activation uses the actual daily FP pool and missing FP leaves an identical saved character',()=>{
 const c=hero();c.houseRules={campaign:{dailyForcePoints:true}};c.forcePoints=1;assert.equal(derive(c,pack).forceMaximum,1);assert.equal(derive(c,pack).forceCurrent,1);cast(c,19,{quicken:true});assert.equal(c.forcePoints,0);assert.equal(derive(c,pack).forceCurrent,0);
 const h=hero();cast(h);const before=structuredClone(h);assert.throws(()=>describeAction(h,pack,'power',{powerId:h.levels[0].forcePowers[1].id,quicken:1}),/Invalid quickening/);assert.deepEqual(h,before);
});

test('a Standard cast can cross a DR threshold with the saved after-roll FP bonus without offering quickening as an enhancement',()=>{
 const c=hero();cast(c,19,{fp:'ask',enhance:true});assert.equal(c.actionState.plan[0].status,'waiting');assert(!c.resistancePowerEffects);assert(!c.actionState.plan[0].result.enhanceAllowed);const saved=JSON.parse(JSON.stringify(c)),id=saved.actionState.plan[0].id;finishForceChoice(saved,pack,id,'bonus',()=>({value:1,display:'1'}));assert.equal(saved.resistancePowerEffects[0].tier,1);assert.equal(saved.forcePoints,c.forcePoints-1);assert.deepEqual(saved.actionState.spent,['standard']);assert(saved.actionState.forceSpent);assert.throws(()=>finishForceChoice(saved,pack,id,'bonus'));validateCharacter(saved,pack);
});
