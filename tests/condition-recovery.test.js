import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {queueAction} from '../src/action-economy.js';
import {takeAction,executeAction,previewPlan,beginNextTurn,endTrackedCombat,describeAction} from '../src/action-engine.js';
import {newDay,newEncounter,recoveryState,setPersistent,restEightHours,recoverCondition,loseLimb} from '../src/recovery.js';
import {conditionRecoveryPlan} from '../src/condition-recovery.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(id='equilibrium',count=1){
 const cls=id==='equilibrium'?'jedi':'soldier',c=newCharacter(pack,{classId:'class:'+cls});
 c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.condition=4;c.levels[0].talent={id:'talent:'+id};
 for(let i=1;i<count;i++)c.levels.push({classId:'class:'+cls,hpRoll:3,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:'+cls,hpRoll:3,feats:[],talent:{id:'talent:'+id},startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 return c;
}
const run=(c,id='equilibrium')=>takeAction(c,pack,id,{},()=>{throw Error('Recovery must not roll');});
test('reviewed recovery data requires pinned sources, Swift time, costs and supported effects',()=>{
 validatePack(pack);
 for(const mutate of [p=>p.rules.conditionRecoveryActions[0].steps=4,p=>p.rules.conditionRecoveryActions[0].forcePoints=0,p=>p.rules.conditionRecoveryActions[1].removePersistent=true,p=>p.rules.conditionRecoveryActions[1].dailyUsesPerSelection=2,p=>p.rules.conditionRecoveryActions[1].sourceIds=[],p=>p.rules.actionEconomy.actions.find(r=>r.id==='equilibrium').type='free']){const p=structuredClone(pack);mutate(p);assert.throws(()=>validatePack(p));}
});
test('Equilibrium removes all recorded persistent causes and restores the track, without healing HP or replenishing other resources',()=>{
 const c=hero();c.currentHP=1;setPersistent(c,'injury',true);setPersistent(c,'rage',true);setPersistent(c,'other',true);const fp=c.forcePoints;
 const r=run(c);assert.equal(c.condition,0);assert.deepEqual(c.recovery.persistent,[]);assert.equal(c.currentHP,1);assert.equal(c.forcePoints,fp-1);assert.deepEqual(c.actionState.spent,['swift']);assert(c.actionState.forceSpent);assert(r.text.includes('persistent conditions removed'));validateCharacter(c,pack);
});
test('Equilibrium clarification preserves the printed all-conditions rule when disabled',()=>{
 const c=hero();c.houseRules={jediCounseling:{'jc:114-equilibrium-and-persistent-conditions':false}};setPersistent(c,'other',true);c.condition=0;run(c);assert.deepEqual(c.recovery.persistent,[]);assert.equal(c.condition,0);
});
test('removing a persistent limb injury does not regrow a lost limb or change its timer',()=>{
 const c=hero();c.species='species:trandoshan';loseLimb(c,pack,'Arm',()=>({value:7}));const limb={...c.recovery.limbs[0]};run(c);assert.deepEqual(c.recovery.limbs,[{...limb,persistent:false}]);assert.deepEqual(c.recovery.persistent,[]);validateCharacter(c,pack);
});
test('Indomitable moves up despite persistent causes, retains them and consumes one daily use per activation',()=>{
 const c=hero('indomitable',2);setPersistent(c,'rage',true);setPersistent(c,'other',true);const fp=c.forcePoints;assert.equal(conditionRecoveryPlan(c,derive(c,pack),pack,'indomitable').remaining,2);run(c,'indomitable');assert.equal(c.condition,0);assert.deepEqual(c.recovery.persistent,['rage','other']);assert.equal(c.forcePoints,fp);assert.equal(c.recovery.indomitableSpent,1);assert(!c.actionState.forceSpent);
 c.condition=2;assert.throws(()=>recoverCondition(c,derive(c,pack)));beginNextTurn(c,pack);run(c,'indomitable');assert.equal(c.condition,0);assert.equal(c.recovery.indomitableSpent,2);beginNextTurn(c,pack);c.condition=1;const before=structuredClone(c);assert.throws(()=>run(c,'indomitable'),/daily uses/);assert.deepEqual(c,before);
});
test('spent daily uses survive JSON saves, encounter/combat/rest and selection capacity edits; only New Day resets them',()=>{
 const c=hero('indomitable',2);run(c,'indomitable');const q=JSON.parse(JSON.stringify(c));validateCharacter(q,pack);newEncounter(q);endTrackedCombat(q);restEightHours(q,derive(q,pack),pack);assert.equal(q.recovery.indomitableSpent,1);
 q.levels.splice(1);q.condition=3;assert.throws(()=>run(q,'indomitable'),/daily uses/);q.levels=structuredClone(c.levels);assert.equal(conditionRecoveryPlan(q,derive(q,pack),pack,'indomitable').remaining,1);newDay(q,pack);assert.equal(q.recovery.indomitableSpent,0);assert.equal(q.condition,3);assert.equal(conditionRecoveryPlan(q,derive(q,pack),pack,'indomitable').remaining,2);
});
test('legacy recovery state defaults to no daily spending and validates bounded optional counts',()=>{
 const c=hero('indomitable');setPersistent(c,'other',true);delete c.recovery.indomitableSpent;validateCharacter(c,pack);assert.equal(recoveryState(c).indomitableSpent,0);run(c,'indomitable');assert.equal(c.recovery.indomitableSpent,1);
 for(const n of [-1,1.5,NaN,100001,'0'])assert.throws(()=>validateCharacter({...c,recovery:{...c.recovery,indomitableSpent:n}},pack),/recovery/);
});
test('helpless, dead and zero-HP characters cannot activate either recovery talent; execution is atomic',()=>{
 for(const id of ['equilibrium','indomitable'])for(const patch of [{condition:5},{currentHP:0}]){const c=Object.assign(hero(id),patch),before=structuredClone(c);assert.throws(()=>run(c,id),/helpless/);assert.deepEqual(c,before);}
 const c=hero();setPersistent(c,'injury',true);c.recovery.dead=true;const before=structuredClone(c);assert.throws(()=>run(c),/helpless/);assert.deepEqual(c,before);
});
test('Force Point and action budgets block invalid Equilibrium without costs, and another round restores eligibility',()=>{
 const c=hero();takeAction(c,pack,'force-bonus',{},()=>({value:2,display:'2'}));const before=structuredClone(c);assert.throws(()=>run(c),/already spent/);assert.deepEqual(c,before);beginNextTurn(c,pack);run(c);assert.equal(c.forcePoints,before.forcePoints-1);
 for(const change of [q=>q.forcePoints=0,q=>q.levels[0].talent=null,q=>{takeAction(q,pack,'manual-swift',{note:'Test'});takeAction(q,pack,'manual-swift',{note:'Test'});takeAction(q,pack,'manual-swift',{note:'Test'});}]){const q=hero();change(q);const before=structuredClone(q);assert.throws(()=>run(q));assert.deepEqual(q,before);}
});
test('queued recovery previews its resulting state and budgets without affecting the real character or rolling',()=>{
 const c=hero();setPersistent(c,'other',true);const a=queueAction(c,'equilibrium'),b=queueAction(c,'equilibrium'),before=structuredClone(c);const rows=previewPlan(c,pack);assert(!rows[0].issue);assert.match(rows[1].issue,/Normal State/);assert.deepEqual(c,before);executeAction(c,pack,a.id);const done=structuredClone(c);assert.throws(()=>executeAction(c,pack,a.id),/resolved/);assert.deepEqual(c,done);
 const q=hero('indomitable');queueAction(q,'indomitable');queueAction(q,'indomitable');assert.match(previewPlan(q,pack)[1].issue,/daily uses/);assert.equal(q.recovery,undefined);
});
test('stale ownership is checked at execution and interrupted preparation clears on successful activation',()=>{
 const c=hero(),a=queueAction(c,'equilibrium');c.levels[0].talent=null;const before=structuredClone(c);assert.throws(()=>executeAction(c,pack,a.id),/unavailable/);assert.deepEqual(c,before);
 const q=hero();q.inventory=[{uid:crypto.randomUUID(),id:'equipment:blaster-pistol',quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,aimed:true}];q.mightySwing=true;run(q);assert(!q.inventory[0].aimed);assert.equal(q.condition,0);
});
test('Indomitable and Equilibrium never apply passively or offer an ineffective activation at Normal State',()=>{
 for(const id of ['equilibrium','indomitable']){const c=hero(id);derive(c,pack);assert.equal(c.condition,4);c.condition=0;assert.throws(()=>describeAction(c,pack,id),/Normal State/);}
});
