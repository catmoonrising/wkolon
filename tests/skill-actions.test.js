import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {queueAction} from '../src/action-economy.js';
import {takeAction,executeAction,finishForceChoice,previewPlan,beginNextTurn,describeAction} from '../src/action-engine.js';
import {skillActionPlan,rollSkillAction} from '../src/skill-actions.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(power='battle-strike'){
 const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:12,dex:12,con:12,int:12,wis:12,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:force-focus'};c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=Array.from({length:2},()=>({id:crypto.randomUUID(),powerId:'power:'+power,spent:true}));return c;
}
const options=(c,extra={})=>({powerId:c.levels[0].forcePowers[1].id,rollMode:'roll',fp:'none',...extra});
const roller=n=>expr=>({d20:expr.startsWith('1d20')?[n]:[],value:expr.startsWith('1d20')?n+Number(expr.slice(4)):n,display:expr,coeffs:[1]});
const run=(c,n=10,extra={})=>takeAction(c,pack,'force-focus',options(c,extra),roller(n));
test('reviewed skill action data binds DC, source, active talent and Full-Round time',()=>{
 validatePack(pack);assert.equal(pack.talents.find(t=>t.id==='talent:force-focus').automation,'partial');
 for(const mutate of [r=>r.dc=10,r=>r.effect='invented',r=>r.skillId='skill:perception',r=>r.sourceIds=[]]){const p=structuredClone(pack);mutate(p.rules.skillActions[0]);assert.throws(()=>validatePack(p));}
 const c=hero();assert.deepEqual(describeAction(c,pack,'force-focus',options(c)).allocation.slots,['standard','move','swift']);
});
test('Force Focus recovers only the selected duplicate copy, spending time but no FP or DSS',()=>{
 const c=hero(),fp=c.forcePoints,dss=c.darkSideScore;run(c);assert(c.levels[0].forcePowers[0].spent);assert(!c.levels[0].forcePowers[1].spent);assert.equal(c.forcePoints,fp);assert.equal(c.darkSideScore,dss);assert.deepEqual(c.actionState.spent,['standard','move','swift']);assert.equal(c.actionState.forceSpent,false);validateCharacter(c,pack);
});
test('a failed check uses its action budget and can be retried on a later turn',()=>{
 const c=hero();assert(run(c,1).text.includes('Failed'));assert(c.levels[0].forcePowers.every(p=>p.spent));const before=structuredClone(c);assert.throws(()=>run(c,20),/Full-Round/);assert.deepEqual(c,before);beginNextTurn(c,pack);assert(run(c,20).text.includes('recovered'));assert(!c.forcePowerRecoveryPending,'Focus is not power activation');assert(c.levels[0].forcePowers[0].spent);
});
test('natural 1 is not automatic skill failure, and natural 20 restores no extra copies',()=>{
 const c=hero();c.abilities.cha=30;c.levels[0].feats.push({id:'feat:skill-focus',choice:'skill:use-the-force'});assert(run(c,1).text.includes('recovered'));assert(c.levels[0].forcePowers[0].spent);assert(!c.forcePowerRecoveryPending);
});
test('Force Focus remains available at zero FP and cannot spend a second round FP bonus',()=>{
 const c=hero();c.forcePoints=0;run(c,10,{fp:'ask'});assert.equal(c.actionState.plan[0].status,'done');assert(!c.levels[0].forcePowers[1].spent);
 const q=hero();takeAction(q,pack,'force-bonus',{},roller(3));run(q,10,{fp:'ask'});assert.equal(q.actionState.plan.at(-1).status,'done');assert(q.actionState.forceSpent);
});
test('after-roll FP decisions survive JSON saves and resolve a failed check once without rerolling',()=>{
 const c=hero(),fp=c.forcePoints;run(c,4,{fp:'ask'});let step=c.actionState.plan[0];assert.equal(step.status,'waiting');assert(c.levels[0].forcePowers.every(p=>p.spent));assert.equal(step.result.check.total,11);assert.throws(()=>beginNextTurn(c,pack),/pending/);
 const loaded=JSON.parse(JSON.stringify(c));validateCharacter(loaded,pack);let calls=0;finishForceChoice(loaded,pack,step.id,true,expr=>{calls++;assert(!expr.includes('d20'));return roller(4)(expr);});step=loaded.actionState.plan[0];assert.equal(calls,1);assert.equal(step.result.check.natural,4);assert.equal(step.result.check.total,15);assert.equal(step.status,'done');assert.equal(loaded.forcePoints,fp-1);assert(loaded.actionState.forceSpent);assert(!loaded.levels[0].forcePowers[1].spent);assert(loaded.levels[0].forcePowers[0].spent);const before=structuredClone(loaded);assert.throws(()=>finishForceChoice(loaded,pack,step.id,true));assert.deepEqual(loaded,before);
});
test('keeping a failed or successful check resolves the saved result without a resource cost',()=>{
 for(const natural of [1,20]){const c=hero(),fp=c.forcePoints;run(c,natural,{fp:'ask'});const step=c.actionState.plan[0];finishForceChoice(c,pack,step.id,false,()=>assert.fail('No extra roll'));assert.equal(c.forcePoints,fp);assert.equal(c.levels[0].forcePowers[1].spent,natural===1);assert.equal(step.id,c.actionState.plan[0].id);assert.equal(c.actionState.plan[0].status,'done');}
});
test('recovering a Dark Side power is not using it and permits a check FP bonus',()=>{
 const c=hero('force-lightning'),dss=c.darkSideScore;run(c,4,{fp:'ask'});assert(c.actionState.plan[0].result.fpAllowed);finishForceChoice(c,pack,c.actionState.plan[0].id,true,roller(4));assert.equal(c.darkSideScore,dss);assert(!c.levels[0].forcePowers[1].spent);assert(c.levels[0].forcePowers[0].spent);
});
test('Take 10 uses the current bonus without a roll and requires a safe trained check',()=>{
 const c=hero(),o=options(c,{rollMode:'take10',safe:true,fp:'none'}),fp=c.forcePoints;takeAction(c,pack,'force-focus',o,()=>assert.fail('Take 10 rolls nothing'));assert.equal(c.actionState.plan[0].result.check.total,17);assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.forcePoints,fp);
 const q=hero(),before=structuredClone(q);assert.throws(()=>takeAction(q,pack,'force-focus',options(q,{rollMode:'take10'})),/Take 10/);assert.deepEqual(q,before);assert.throws(()=>takeAction(q,pack,'force-focus',options(q,{rollMode:'take20',safe:true})),/Invalid skill check/);
 const d=derive(q,pack);d.skills.find(s=>s.id==='skill:use-the-force').trained=false;assert.throws(()=>skillActionPlan(q,d,pack,'force-focus',options(q,{rollMode:'take10',safe:true})),/Take 10/);
});
test('planning does not roll, spend FP, alter powers or assume check success',()=>{
 const c=hero();queueAction(c,'force-focus',options(c,{fp:'ask'}));queueAction(c,'power',{powerId:c.levels[0].forcePowers[1].id,action:'swift-action',fp:'none'});const before=structuredClone(c),rows=previewPlan(c,pack);assert(!rows[0].issue);assert(rows[1].issue);assert.deepEqual(c,before);
});
test('invalid talent, target, check and exhausted actions mutate no state and roll nothing',()=>{
 for(const modify of [c=>c.levels[0].talent=null,c=>c.condition=5,c=>c.levels[0].forcePowers[1].spent=false,c=>takeAction(c,pack,'manual-swift',{note:'Other'})]){const c=hero();modify(c);const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'force-focus',options(c),()=>assert.fail('Invalid action rolled')));assert.deepEqual(c,before);}
 const c=hero(),plan=skillActionPlan(c,derive(c,pack),pack,'force-focus',options(c));for(const r of [undefined,{value:17,d20:[]},{value:99,d20:[10]},{value:8,d20:[0]}])assert.throws(()=>rollSkillAction(plan,()=>r),/Invalid skill roll/);
});
test('removing a talent or target during a pending choice cannot grant another copy or strand the result',()=>{
 for(const modify of [c=>c.levels[0].talent=null,c=>c.levels[0].forcePowers.splice(1,1)]){const c=hero();run(c,20,{fp:'ask'});const stepId=c.actionState.plan[0].id;modify(c);finishForceChoice(c,pack,stepId,false);assert(c.levels[0].forcePowers[0].spent);assert.equal(c.actionState.plan[0].status,'done');validateCharacter(c,pack);}
});
test('Force Focus uses Fool\'s Luck through the shared skill calculation and preserves its duration',()=>{
 const c=hero();c.levels.push({classId:'class:scoundrel',hpRoll:4,feats:[],talent:{id:'talent:fool-s-luck'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});const before=derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total;takeAction(c,pack,'encounter-talent',{talentId:'talent:fool-s-luck',choice:'skills'});beginNextTurn(c,pack);assert.equal(derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total,before+5);const r=run(c,2);assert(r.text.includes('recovered'));assert.equal(c.talentActivations.length,1);
});
test('a Force Point can improve a Take 10 skill check before its effect is resolved',()=>{
 const c=hero();c.abilities.cha=6;const fp=c.forcePoints;takeAction(c,pack,'force-focus',options(c,{rollMode:'take10',safe:true,fp:'ask'}),()=>assert.fail('No skill die for Take 10'));const step=c.actionState.plan[0];assert.equal(step.result.check.total,13);assert.equal(step.status,'waiting');finishForceChoice(c,pack,step.id,true,roller(2));assert.equal(c.forcePoints,fp-1);assert(!c.levels[0].forcePowers[1].spent);assert.equal(c.actionState.plan[0].result.check.natural,10);
});
test('Power Mastery Take 10 uses the same optional Force Point eligibility as other skill checks',()=>{
 const c=hero();c.levels[0].forcePowers[0].spent=false;for(let i=1;i<7;i++)c.levels.push({classId:'class:jedi',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});const cls=pack.classes.find(r=>r.id==='class:jedi-knight');c.levels.push({classId:cls.id,hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],entryDeclarations:Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true])),acquisitionDSS:0});c.levels.push({classId:cls.id,hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],classChoices:[{id:'classchoice:force-power-mastery',choice:'power:battle-strike'}]});assert(derive(c,pack).forcePowers[0].take10);takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers[0].id,action:'swift-action',rollMode:'take10',fp:'ask'},()=>assert.fail('No skill roll'));const step=c.actionState.plan[0];assert.equal(step.status,'waiting');const total=step.result.check.total;finishForceChoice(c,pack,step.id,true,roller(3));assert.equal(c.actionState.plan[0].result.check.total,total+3);assert.equal(c.actionState.plan[0].result.check.natural,10);assert(!c.forcePowerRecoveryPending);
});
