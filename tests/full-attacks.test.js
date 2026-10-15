import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {planFullAttack} from '../src/full-attacks.js';
import {rollCombatRoutine} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {newEncounter,newDay,restEightHours} from '../src/recovery.js';
import {recoverSuite} from '../src/force-powers.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const step=(source,attackId,extra={})=>({id:crypto.randomUUID(),source,attackId,count:1,attackMod:0,damageMod:0,...extra});
const routine=(...steps)=>({id:crypto.randomUUID(),kind:'fullAttack',name:'Full Attack',steps});
const roller=(calls=[],natural=12)=>expr=>{calls.push(expr);return {value:expr.startsWith('1d20')?natural:10,d20:expr.startsWith('1d20')?[natural]:[],display:expr,coeffs:[1]};};
function hero(){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:18,con:10,int:10,wis:10,cha:10};
 const feats={0:[['dual-weapon-mastery-i'],['power-attack']],1:[['rapid-shot']],2:[['weapon-proficiency-lightsabers']],3:[['mighty-swing']],5:[['double-attack','rifles'],['dual-weapon-mastery-ii']],7:[['double-attack','lightsabers']],8:[['double-attack','simple-weapons']],9:[['weapon-proficiency-advanced-melee-weapons']],11:[['triple-attack','rifles'],['dual-weapon-mastery-iii']]};
 c.levels=Array.from({length:12},(_,i)=>({classId:'class:soldier',hpRoll:i?5:null,feats:(feats[i]||[]).map(([id,choice])=>({id:'feat:'+id,...(choice?{choice}:{})})),talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));
 c.inventory=[item('blaster-pistol',{shotsRemaining:10}),item('blaster-pistol',{shotsRemaining:10}),item('blaster-rifle',{shotsRemaining:10}),item('double-bladed-lightsaber')];return c;
}
const dual=c=>routine(step('base',c.inventory[0].uid),step('twoWeapons',c.inventory[1].uid));

test('Full Attacks retain exact source text and closed reviewed mappings',()=>{
 validatePack(pack);
 assert.match(articleText(pack.rulePages.find(r=>r.id==='rule:full-attacks').article),/Extra attacks granted from different sources are cumulative/);
 const bad=structuredClone(pack);bad.rules.fullAttacks.extraAttackPenalty=-2;assert.throws(()=>validatePack(bad),/Full Attack/);
 const c=hero();c.routines=[dual(c)];validateCharacter(c,pack);
 c.routines[0].steps[1].source='base';assert.throws(()=>validateCharacter(c,pack),/Full Attack sources/);
 c.routines[0].steps[1].source='twoWeapons';c.routines[0].steps[1].count=2;assert.throws(()=>validateCharacter(c,pack),/routine step/);
 c.routines=[];c.fullAttackPenalties={twoWeapons:-1,doubleAttack:0,tripleAttack:0};assert.throws(()=>validateCharacter(c,pack),/Full Attack penalties/);
});

test('two weapons apply each mastery rank and preserve the full attack penalty on later ranged and melee attacks',()=>{
 const c=hero(),r=dual(c);let d=derive(c,pack);assert.equal(planFullAttack(r,d,pack).penalty,0);
 c.levels=c.levels.slice(0,11);d=derive(c,pack);assert.equal(planFullAttack(r,d,pack).penalty,-2);
 c.levels=c.levels.slice(0,5);d=derive(c,pack);assert.equal(planFullAttack(r,d,pack).penalty,-5);
 c.levels[0].feats=c.levels[0].feats.filter(f=>!f.id.includes('dual-weapon'));d=derive(c,pack);assert.equal(planFullAttack(r,d,pack).penalty,-10);
 const before=d.attacks.map(a=>a.attack),result=rollCombatRoutine(r,d,pack,roller());spendAttackResources(c,result);d=derive(c,pack);
 assert.deepEqual(d.attacks.map(a=>a.attack),before.map(n=>n-10));assert.equal(c.inventory[0].shotsRemaining,9);assert.equal(c.inventory[1].shotsRemaining,9);
 assert.equal(d.specialAttackPenalty,-10);assert(d.attacks.every(a=>a.breakdown.includes('Full Attack: -10')));
 startNextTurn(c);assert.deepEqual(derive(c,pack).attacks.map(a=>a.attack),before);
});

test('Double and Triple Attack use the chosen groups, stack with two weapons, and permit any resolution order',()=>{
 const c=hero();c.inventory[2].oneHanded=true;
 const r=routine(step('tripleAttack',c.inventory[2].uid),step('twoWeapons',c.inventory[1].uid),step('base',c.inventory[0].uid),step('doubleAttack',c.inventory[2].uid));
 const d=derive(c,pack),plan=planFullAttack(r,d,pack);assert.equal(plan.penalty,-10);assert.equal(plan.routine.steps[0].source,'tripleAttack');
 const calls=[],result=rollCombatRoutine(r,d,pack,roller(calls));assert.equal(result.results.length,4);assert.equal(calls[0],'1d20'+(d.attacks[2].attack-10>=0?'+':'')+(d.attacks[2].attack-10));
 spendAttackResources(c,result);assert.equal(c.inventory[2].shotsRemaining,8);assert.deepEqual(c.fullAttackPenalties,{twoWeapons:0,doubleAttack:-5,tripleAttack:-5});
 c.levels=c.levels.slice(0,11);assert.throws(()=>planFullAttack(r,derive(c,pack),pack),/Triple Attack requires its chosen/);
 const mismatch=hero();assert.throws(()=>planFullAttack(routine(step('base',mismatch.inventory[0].uid),step('doubleAttack',mismatch.inventory[0].uid)),derive(mismatch,pack),pack),/chosen weapon/);
 const withoutDouble=routine(step('base',c.inventory[2].uid),step('tripleAttack',c.inventory[2].uid));assert.throws(()=>planFullAttack(withoutDouble,derive(c,pack),pack),/requires Double Attack/);
});

test('a double weapon supplies the two ends; explicit melee mode and double-weapon modes retain access',()=>{
 const c=hero(),e=c.inventory[3];e.attackStyle='melee';const r=routine(step('base',e.uid),step('twoWeapons',e.uid),step('doubleAttack',e.uid));
 const d=derive(c,pack);assert.equal(planFullAttack(r,d,pack).penalty,-5);assert(d.attacks[3].fullAttackGrip.double);
 const result=rollCombatRoutine(r,d,pack,roller([],20));assert.equal(result.results.length,3);assert(result.results.every(r=>r.critical));
 assert.equal(d.attacks[3].damageBonus,10,'both ends retain printed two-handed Strength damage');
 e.attackStyle='thrown';assert.throws(()=>planFullAttack(r,derive(c,pack),pack),/one-handed weapons or a double/);
 e.attackStyle='melee';e.id='equipment:lightsaber';assert.throws(()=>planFullAttack(r,derive(c,pack),pack),/one-handed weapons or a double/);
});

test('grips reject large or two-handed pairs; rifle one-handed penalties remain independent',()=>{
 const c=hero(),p=c.inventory[0],rifle=c.inventory[2],r=routine(step('base',p.uid),step('twoWeapons',rifle.uid));
 assert.throws(()=>planFullAttack(r,derive(c,pack),pack),/one-handed/);
 rifle.oneHanded=true;assert.equal(planFullAttack(r,derive(c,pack),pack).penalty,0);
 const one=derive(c,pack).attacks[2].attack;rifle.oneHanded=false;assert.equal(derive(c,pack).attacks[2].attack,one+5);
 p.twoHanded=true;assert.throws(()=>planFullAttack(dual(c),derive(c,pack),pack),/one-handed/);
});

test('mixed proficiency uses both-weapons default and the user-approved either-weapon alternative',()=>{
 const c=hero();c.inventory[1].id='equipment:flamethrower';delete c.inventory[1].shotsRemaining;let d=derive(c,pack);
 assert(!d.attacks[1].proficient);assert.equal(planFullAttack(dual(c),d,pack).penalty,-10);
 c.houseRules={ambiguities:{'ambiguity:dual-weapon-proficiency':'either-weapon'}};d=derive(c,pack);
 assert.equal(planFullAttack(dual(c),d,pack).penalty,0);assert.equal(d.attacks[1].attack,d.attacks[0].attack-5);
 const plan=planFullAttack(dual(c),d,pack);assert.equal(plan.attacks[1].attack,d.attacks[1].attack,'exotic nonproficiency remains');validateCharacter(c,pack);
});

test('Full Attack preflights sources and aggregate ammunition before dice or turn-state mutation',()=>{
 const c=hero(),e=c.inventory[2],r=routine(step('base',e.uid),step('doubleAttack',e.uid),step('tripleAttack',e.uid));e.shotsRemaining=2;
 const before=structuredClone(c);assert.throws(()=>rollCombatRoutine(r,derive(c,pack),pack,()=>assert.fail('No dice before preflight')),/needs 3/);assert.deepEqual(c,before);
 e.shotsRemaining=3;const result=rollCombatRoutine(r,derive(c,pack),pack,roller());e.shotsRemaining=1;
 const changed=structuredClone(c);assert.throws(()=>spendAttackResources(c,result),/Ammunition changed/);assert.deepEqual(c,changed);assert(!c.fullAttackPenalties);
 const dup=routine(step('base',e.uid),step('doubleAttack',e.uid),step('doubleAttack',e.uid));assert.throws(()=>planFullAttack(dup,derive(c,pack),pack),/once/);
});

test('source penalties remain until next turn, do not duplicate, and combine with later sources and Power Attack',()=>{
 const c=hero();c.levels[11].feats=c.levels[11].feats.filter(f=>!f.id.includes('dual-weapon'));
 c.powerAttack=3;const original=derive(c,pack),r=dual(c);spendAttackResources(c,rollCombatRoutine(r,original,pack,roller()));assert.equal(c.fullAttackPenalties.twoWeapons,-2);
 const second=rollCombatRoutine(r,derive(c,pack),pack,roller());spendAttackResources(c,second);assert.equal(derive(c,pack).fullAttack.penalty,-2);
 const rifle=c.inventory[2],extra=routine(step('base',rifle.uid),step('doubleAttack',rifle.uid));spendAttackResources(c,rollCombatRoutine(extra,derive(c,pack),pack,roller()));
 const d=derive(c,pack);assert.equal(d.fullAttack.penalty,-7);assert.equal(c.powerAttack,3);assert.equal(d.attacks[3].attack,original.attacks[3].attack-7);
 c.forcePowerRecoveryPending=true;recoverSuite(c,d,{endTurn:true});assert.equal(derive(c,pack).fullAttack.penalty,-7);startNextTurn(c);assert.equal(derive(c,pack).fullAttack.penalty,0);assert.equal(c.powerAttack,0);
});

test('specific exotic weapon choices grant their extra attacks without granting them to other exotic weapons',()=>{
 const c=hero();c.levels[2].feats=[{id:'feat:exotic-weapon-proficiency',choice:'equipment:atlatl'}];
 c.levels[5].feats[0]={id:'feat:double-attack',choice:'equipment:atlatl'};c.levels[11].feats[0]={id:'feat:triple-attack',choice:'equipment:atlatl'};
 c.inventory=[item('atlatl')];const e=c.inventory[0],r=routine(step('base',e.uid),step('doubleAttack',e.uid),step('tripleAttack',e.uid));
 assert.equal(planFullAttack(r,derive(c,pack),pack).penalty,-10);assert.equal(rollCombatRoutine(r,derive(c,pack),pack,roller()).results.length,3);
 e.id='equipment:flamethrower';assert.throws(()=>planFullAttack(r,derive(c,pack),pack),/chosen weapon/);
});

test('encounter/day/rest resets and printed Full Attack previews use the complete duration and penalty',()=>{
 for(const reset of [c=>newEncounter(c),c=>newDay(c,pack),c=>restEightHours(c,derive(c,pack),pack)]){
  const c=hero();c.fullAttackPenalties={twoWeapons:-2,doubleAttack:-5,tripleAttack:0};reset(c);assert.equal(derive(c,pack).fullAttack.penalty,0);
 }
 const c=hero(),e=c.inventory[2];c.routines=[routine(step('base',e.uid),step('doubleAttack',e.uid),step('tripleAttack',e.uid))];
 const d=derive(c,pack),html=renderStatBlock(c,d,pack);assert(html.includes('Full Attack:</b> Blaster Rifle +'+(d.attacks[2].attack-10)));assert.equal((html.match(/ and Blaster Rifle /g)||[]).length,2);
 const plain={id:crypto.randomUUID(),name:'Sequence',steps:[{id:crypto.randomUUID(),attackId:e.uid,count:5,attackMod:0,damageMod:0}]};assert.equal(rollCombatRoutine(plain,d,pack,roller()).results.length,5);assert(!c.fullAttackPenalties,'preview and rolls do not mutate character');
});
