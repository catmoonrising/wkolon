import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {emptyActionState,allocateActions,queueAction,archivePlan} from '../src/action-economy.js';
import {takeAction,executeAction,beginNextTurn,endCurrentTurn,describeAction,finishForceChoice,previewPlan,endTrackedCombat} from '../src/action-engine.js';
import {applyIncomingDamage} from '../src/incoming-damage.js';
import {followUpState} from '../src/attack-follow-ups.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=()=>{const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:16,dex:16,con:12,int:12,wis:14,cha:14};return c;};
const item=(name,extra={})=>({uid:crypto.randomUUID(),id:'equipment:'+name,quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const manual=(c,type,note='Declared action')=>takeAction(c,pack,'manual-'+type,{note,confirmed:true,trigger:note});
const roller=(natural=10)=>expr=>({value:expr.startsWith('1d20')?natural+Number(expr.slice(4)||0):4,d20:expr.startsWith('1d20')?[natural]:[],display:expr,coeffs:[1]});
function jedi(power='battle-strike'){
 const c=hero();c.levels[0].classId='class:jedi';c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=[{id:crypto.randomUUID(),powerId:'power:'+power,spent:false}];return c;
}

test('typed action metadata pins the source and Saga Full-Round cost',()=>{
 const r=pack.rules.actionEconomy;assert.equal(r.referenceRevision,24963);assert.deepEqual(r.fullRound,['standard','move','swift']);assert.deepEqual(r.substitutions.swift,['swift','move','standard']);assert.equal(new Set(r.actions.map(a=>a.id)).size,r.actions.length);
});
test('action substitutions spend the least valuable available slot and never run backwards',()=>{
 const s=emptyActionState(),r=pack.rules.actionEconomy;assert.deepEqual(allocateActions(s,{type:'swift',count:2},r).slots,['swift','move']);s.spent=['swift','move'];assert.deepEqual(allocateActions(s,{type:'swift'},r).slots,['standard']);assert.deepEqual(allocateActions(s,{type:'standard'},r).slots,['standard']);s.spent=['standard'];assert.throws(()=>allocateActions(s,{type:'standard'},r));assert.throws(()=>allocateActions(s,{type:'full'},r));assert.deepEqual(allocateActions(emptyActionState(),{type:'standard',also:'move'},r).slots,['standard','move']);
});
test('queuing and preview roll nothing and leave actual resources and slots unchanged',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:2})];const before=structuredClone(c);queueAction(c,'aim',{uid:c.inventory[0].uid});queueAction(c,'attack',{uid:c.inventory[0].uid});const copy=structuredClone(c),rows=previewPlan(c,pack);assert(!rows.some(r=>r.issue));assert.deepEqual(c,copy);assert.equal(c.inventory[0].shotsRemaining,before.inventory[0].shotsRemaining);assert.deepEqual(c.actionState.spent,[]);assert.equal(c.actionState.active,false);validateCharacter(c,pack);
});
test('Aim then attack spends two Swift plus Standard, ammunition and one-use Aim exactly once',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:2})];const uid=c.inventory[0].uid;takeAction(c,pack,'aim',{uid});assert(c.inventory[0].aimed);takeAction(c,pack,'attack',{uid},roller());assert.equal(c.inventory[0].shotsRemaining,1);assert(!c.inventory[0].aimed);assert.deepEqual(c.actionState.spent,['swift','move','standard']);const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'attack',{uid},()=>assert.fail('No roll on exhausted actions')),/Not enough/);assert.deepEqual(c,before);
});
test('resolved misses retain action and ammo costs, while invalid actions mutate nothing',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:1})];const step=queueAction(c,'attack',{uid:c.inventory[0].uid});executeAction(c,pack,step.id,roller(1));assert.equal(c.inventory[0].shotsRemaining,0);assert.equal(c.actionState.plan[0].status,'done');assert.throws(()=>executeAction(c,pack,step.id),/already resolved/);beginNextTurn(c,pack);const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'attack',{uid:c.inventory[0].uid}),/needs/);assert.deepEqual(c,before);
});
test('completed plan entries survive save/load, edits and archiving without becoming executable',()=>{
 const c=hero();const step=queueAction(c,'manual-standard',{note:'Open fire',confirmed:true});executeAction(c,pack,step.id);const loaded=JSON.parse(JSON.stringify(c));validateCharacter(loaded,pack);assert.throws(()=>executeAction(loaded,pack,step.id));archivePlan(loaded);assert.equal(loaded.actionState.plan.length,0);assert.equal(loaded.actionState.history.length,1);beginNextTurn(loaded,pack);assert.equal(loaded.actionState.history[0].result.text,'Open fire (Manual)');assert.throws(()=>executeAction(loaded,pack,step.id));
});
test('three Swift Recover actions can span consecutive turns and cannot ignore persistent conditions',()=>{
 const c=hero();c.condition=3;takeAction(c,pack,'recover',{count:1});assert.equal(c.condition,3);assert.equal(c.actionState.recover.count,1);beginNextTurn(c,pack);takeAction(c,pack,'recover',{count:2});assert.equal(c.condition,2);assert.equal(c.actionState.recover.count,0);beginNextTurn(c,pack);takeAction(c,pack,'recover',{count:1});beginNextTurn(c,pack);beginNextTurn(c,pack);assert.equal(c.actionState.recover.count,0);c.recovery={secondWindsSpent:0,secondWindEncounter:false,strongBellowUsed:false,ragesSpent:0,rageRounds:0,persistent:['other']};const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'recover',{count:3}),/Recover unavailable/);assert.deepEqual(c,before);
});
test('Full-Round consumes all three slots and New Turn never refreshes daily or encounter resources',()=>{
 const c=hero();manual(c,'full');assert.deepEqual(c.actionState.spent,['standard','move','swift']);c.opportunity={used:[{opponent:'Guard',action:'Moved'}]};c.recovery={secondWindsSpent:1,secondWindEncounter:true,strongBellowUsed:true,ragesSpent:1,rageRounds:0,persistent:[]};c.forcePoints=2;beginNextTurn(c,pack);assert.deepEqual(c.actionState.spent,[]);assert.equal(c.opportunity.used.length,0);assert(c.recovery.secondWindEncounter);assert(c.recovery.strongBellowUsed);assert.equal(c.recovery.secondWindsSpent,1);assert.equal(c.forcePoints,2);
});
test('Reaction triggers are normalized and single-use; Free actions fail while flat-footed',()=>{
 const c=hero();manual(c,'reaction','Incoming bolt 1');assert.throws(()=>manual(c,'reaction',' incoming BOLT 1 '),/Already reacted/);manual(c,'reaction','Incoming bolt 2');c.flatFooted=true;const before=structuredClone(c);assert.throws(()=>manual(c,'free'),/flat-footed/);assert.deepEqual(c,before);manual(c,'reaction','Incoming bolt 3');
});
test('Charge ends the turn, including unused normal slots',()=>{
 const c=hero();takeAction(c,pack,'charge',{uid:c.id},roller());assert(c.actionState.ended);assert.throws(()=>manual(c,'move'),/Turn ended/);beginNextTurn(c,pack);assert(!c.actionState.ended);assert.equal(c.chargeReflexPenalty,0);
});
test('optional power Force Point pauses after the check and rolls only the added bonus',()=>{
 const c=jedi(),id=c.levels[0].forcePowers[0].id,step=queueAction(c,'power',{powerId:id,rollMode:'roll',fp:'ask'});let calls=0;executeAction(c,pack,step.id,expr=>{calls++;return roller()(expr);});assert.equal(calls,1);assert.equal(c.actionState.plan[0].status,'waiting');assert(c.levels[0].forcePowers[0].spent);const initial=c.actionState.plan[0].result.check.total,fp=c.forcePoints;assert.throws(()=>beginNextTurn(c,pack),/pending/);assert.throws(()=>manual(c,'move'),/pending/);finishForceChoice(c,pack,step.id,true,expr=>{assert(!expr.includes('d20'));calls++;return roller()(expr);});assert.equal(calls,2);assert.equal(c.forcePoints,fp-1);assert.equal(c.actionState.plan[0].result.check.total,initial+4);assert.equal(c.actionState.plan[0].status,'done');assert(c.actionState.forceSpent);assert.throws(()=>finishForceChoice(c,pack,step.id,true));
});
test('declining optional FP keeps the original roll and natural 20 recovery happens at turn end',()=>{
 const c=jedi(),id=c.levels[0].forcePowers[0].id;takeAction(c,pack,'power',{powerId:id,fp:'ask'},roller(20));const step=c.actionState.plan[0],fp=c.forcePoints;assert(c.forcePowerRecoveryPending);finishForceChoice(c,pack,step.id,false,()=>assert.fail('No roll'));assert.equal(c.forcePoints,fp);beginNextTurn(c,pack);assert(!c.levels[0].forcePowers[0].spent);assert(!c.forcePowerRecoveryPending);
});
test('Dark Side powers and corrupted Light Side powers do not offer check bonuses',()=>{
 const c=jedi('force-lightning'),id=c.levels[0].forcePowers[0].id;const v=describeAction(c,pack,'power',{powerId:id,fp:'ask'});assert(!v.fpAllowed);takeAction(c,pack,'power',{powerId:id,fp:'ask'},expr=>expr==='8d6'?{value:24,d20:[],display:expr,coeffs:[1]}:roller()(expr));assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.darkSideScore,1);assert.match(c.actionState.plan[0].result.text,/8d6 = 24/);
});
test('mandatory power recovery and other FP spending share the one-per-round limit',()=>{
 const c=jedi();beginNextTurn(c,pack);c.levels[0].forcePowers[0].spent=true;takeAction(c,pack,'recover-power',{powerId:c.levels[0].forcePowers[0].id,trigger:'Power used'});assert.equal(c.forcePoints,4);assert.throws(()=>takeAction(c,pack,'force-bonus',{},roller()),/already spent/);beginNextTurn(c,pack);takeAction(c,pack,'force-bonus',{},roller());assert.equal(c.forcePoints,3);
});
test('manual actions require a description and never claim a skill result',()=>{
 const c=hero(),before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'manual-standard',{}),/Describe/);assert.deepEqual(c,before);const r=manual(c,'standard','Persuade guard');assert.equal(r.text,'Persuade guard (Manual)');assert(!r.check);assert.deepEqual(c.actionState.spent,['standard']);
});
test('ending tracked combat retains completed results and queued plans, and permits untracked play',()=>{
 const c=hero();manual(c,'standard');queueAction(c,'manual-move',{note:'Move',confirmed:true});endTrackedCombat(c);assert(!c.actionState.active);assert.equal(c.actionState.history.length,1);assert.equal(c.actionState.plan.length,1);beginNextTurn(c,pack);assert(c.actionState.active);assert.equal(c.actionState.plan.length,1);assert.deepEqual(c.actionState.spent,[]);
});
test('saved action state rejects invalid counters, statuses, duplicate IDs and unbounded options',()=>{
 const c=hero();manual(c,'standard');validateCharacter(c,pack);for(const mutate of [s=>s.spent=['move','move'],s=>s.turn=-1,s=>s.recover.count=3,s=>s.plan[0].status='queued',s=>s.plan.push(structuredClone(s.plan[0])),s=>s.plan[0].options.note='x'.repeat(2001),s=>s.reactions=['bolt','bolt'],s=>s.history.push({...s.plan[0],id:crypto.randomUUID(),status:'waiting'})]){const q=structuredClone(c);mutate(q.actionState);assert.throws(()=>validateCharacter(q,pack),/action state/);}
});
test('Full Attack Step reserves all actions once and continues without spending them twice',()=>{
 const c=hero();c.inventory=[item('blaster-pistol',{shotsRemaining:3}),item('blaster-pistol',{shotsRemaining:3})];
 const r={id:crypto.randomUUID(),name:'Two pistols',kind:'fullAttack',steps:c.inventory.map((e,i)=>({id:crypto.randomUUID(),source:i?'twoWeapons':'base',attackId:e.uid,count:1,attackMod:0,damageMod:0}))};c.routines=[r];
 takeAction(c,pack,'full-attack-step',{routineId:r.id},roller());assert.deepEqual(c.actionState.spent,['standard','move','swift']);assert(c.routineProgress);takeAction(c,pack,'full-attack-step',{routineId:r.id},roller());assert(!c.routineProgress);assert.deepEqual(c.actionState.spent,['standard','move','swift']);assert.deepEqual(c.inventory.map(e=>e.shotsRemaining),[2,2]);assert.throws(()=>takeAction(c,pack,'full-attack-step',{routineId:r.id},roller()),/Full-Round/);
});
test('reload costs, supplied ammunition, and preview resource accounting use the weapon profile',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:0})];const uid=c.inventory[0].uid;assert.throws(()=>takeAction(c,pack,'reload',{uid}),/supply/);queueAction(c,'reload',{uid,confirmed:true});queueAction(c,'attack',{uid});const before=structuredClone(c);assert(!previewPlan(c,pack).some(p=>p.issue));assert.deepEqual(c,before);executeAction(c,pack,c.actionState.plan[0].id);executeAction(c,pack,c.actionState.plan[1].id,roller());assert.equal(c.inventory[0].shotsRemaining,49);assert.deepEqual(c.actionState.spent,['move','standard']);
});
test('failed Acrobatics movement retains its Move cost and saved route without rerolling',()=>{
 const c=hero();c.levels[0].classId='class:scoundrel';c.trainedSkills=['skill:acrobatics'];const path={mode:'normal',tumble:true,path:{squares:1},tumbled:{squares:1},occupied:0,check:1};const r=takeAction(c,pack,'move',{path},()=>assert.fail('Entered check does not roll'));assert(r.text.includes('Failure'));assert.deepEqual(c.actionState.spent,['move']);assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.acrobaticsMovement.check,null);
});
test('ending a turn recovers a natural-20 suite, while Aim survives a new turn until an action breaks it',()=>{
 const c=jedi(),id=c.levels[0].forcePowers[0].id;takeAction(c,pack,'power',{powerId:id,fp:'none'},roller(20));endCurrentTurn(c,pack);assert(!c.levels[0].forcePowers[0].spent);assert(c.actionState.ended);
 const a=hero();a.inventory=[item('blaster-rifle')];takeAction(a,pack,'aim',{uid:a.inventory[0].uid});beginNextTurn(a,pack);assert(a.inventory[0].aimed);manual(a,'swift');assert(!a.inventory[0].aimed);
});
test('survival prevents later ordinary FP use but explicitly remains available after an earlier FP',()=>{
 const c=hero();beginNextTurn(c,pack);const r=applyIncomingDamage(c,derive(c,pack),pack,1000,{spendForcePoint:true});assert(r.forcePointSpent);assert(c.actionState.forceSpent);assert.throws(()=>takeAction(c,pack,'force-bonus',{},roller()));
 const q=hero();takeAction(q,pack,'force-bonus',{},roller());const fp=q.forcePoints;const survival=applyIncomingDamage(q,derive(q,pack),pack,1000,{spendForcePoint:true});assert.equal(survival.forcePointSpent,1);assert.equal(q.forcePoints,fp-1);assert(q.actionState.forceSpent);assert.equal(!!q.recovery?.dead,false);validateCharacter(q,pack);
});
test('power enhancements wait for the original result and spend only after explicit confirmation',()=>{
 const c=jedi('negate-energy'),id=c.levels[0].forcePowers[0].id;assert.throws(()=>takeAction(c,pack,'power',{powerId:id,trigger:'Bolt 1'}),/awareness/);c.flatFooted=true;assert.throws(()=>takeAction(c,pack,'power',{powerId:id,trigger:'Bolt 1',aware:true}),/flat-footed/);c.flatFooted=false;
 const fp=c.forcePoints;c.currentHP=derive(c,pack).hp-5;takeAction(c,pack,'power',{powerId:id,trigger:'Bolt 1',aware:true,enhance:true,incoming:{amount:10,options:{energy:true}}},roller());const step=c.actionState.plan[0],total=step.result.check.total;assert.equal(step.status,'waiting');assert.equal(c.forcePoints,fp);assert(!step.result.fpAllowed);finishForceChoice(c,pack,step.id,'enhance',()=>assert.fail('Healing never rolls the original check again'));assert.equal(c.forcePoints,fp-1);assert.equal(c.actionState.plan[0].result.check.total,total);assert(c.actionState.plan[0].result.text.includes('Negated'));assert.equal(c.currentHP,derive(c,pack).hp);
});
test('Cleave combined with Follow Through also reserves a Move action',()=>{
 const c=hero();c.levels=Array.from({length:4},(_,i)=>({classId:'class:soldier',hpRoll:i?5:null,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));c.levels[0].feats=[{id:'feat:power-attack'},{id:'feat:cleave'}];c.levels[2].feats=[{id:'feat:follow-through'}];
 takeAction(c,pack,'attack',{uid:c.id},roller());c.followUp={...followUpState(c),opponent:'A',nextOpponent:'B',dropped:true,immediate:true,inReach:true,moveBefore:true};
 const v=describeAction(c,pack,'cleave');assert.equal(v.cost.type,'move');assert.equal(v.cost.also,'free');takeAction(c,pack,'cleave',{},roller());assert.deepEqual(c.actionState.spent,['standard','move']);assert(c.followUp.followThroughSpent);
});
test('custom offensive routines require a declared action cost and retain real rolls and ammo costs',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:3})];c.routines=[{id:crypto.randomUUID(),name:'Declared ability',steps:[{id:crypto.randomUUID(),attackId:c.inventory[0].uid,count:1,attackMod:0,damageMod:0}]}];const o={routineId:c.routines[0].id,cost:'standard'};assert.throws(()=>takeAction(c,pack,'routine',o),/Confirm/);takeAction(c,pack,'routine',{...o,confirmed:true},roller());assert.equal(c.inventory[0].shotsRemaining,2);assert.deepEqual(c.actionState.spent,['standard']);
});
test('queued opportunity declarations cannot restore an old per-round resource history',()=>{
 const c=hero();c.inventory=[item('knife')];const path={opponent:'Guard',action:'Moved 1',distance:1,provoked:true,used:[]},o={uid:c.inventory[0].uid,path};const a=queueAction(c,'opportunity',o),b=queueAction(c,'opportunity',o);executeAction(c,pack,a.id,roller());assert.equal(c.opportunity.used.length,1);const before=structuredClone(c);assert.throws(()=>executeAction(c,pack,b.id,roller()),/remaining|Already/);assert.deepEqual(c,before);
});
test('queued Cleave declarations cannot replay old tickets or reset the per-round limit',()=>{
 const c=hero();c.levels[0].feats=[{id:'feat:power-attack'},{id:'feat:cleave'}];takeAction(c,pack,'attack',{uid:c.id},roller());const path={...followUpState(c),opponent:'A',nextOpponent:'B',dropped:true,immediate:true,inReach:true};const a=queueAction(c,'cleave',{path}),b=queueAction(c,'cleave',{path});executeAction(c,pack,a.id,roller());assert.equal(c.followUp.cleavesSpent,1);const before=structuredClone(c);assert.throws(()=>executeAction(c,pack,b.id,roller()),/Invalid|trigger|this round|immediately/);assert.deepEqual(c,before);
});
