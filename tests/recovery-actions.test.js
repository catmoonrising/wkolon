import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {recoveryState,catchSecondWind,startRage,advanceRage,endRage,recoverCondition,removePersistent,newEncounter,newDay} from '../src/recovery.js';
import {bellowDetails,rollBellow} from '../src/species-actions.js';
import {rollRoutine} from '../src/combat.js';
import {renderStatBlock} from '../src/stat-block.js';
import {usePower} from '../src/force-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=(species='human',cls='soldier')=>{const c=newCharacter(pack);c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:10,dex:18,con:10,int:10,wis:10,cha:10};c.levels[0].classId='class:'+cls;return c;};
const level=classId=>({classId:'class:'+classId,hpRoll:3,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
const roller=(natural,total,damage)=>expr=>({value:expr.startsWith('1d20')?total:damage,d20:expr.startsWith('1d20')?[natural]:[],display:expr,rollId:1});
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});

test('legacy characters start with unused resources without being mutated; optional recovery state validates',()=>{
 const c=hero();assert.equal(recoveryState(c).secondWindsSpent,0);derive(c,pack);assert.equal(c.recovery,undefined);validateCharacter(c,pack);
 newDay(c);validateCharacter(c,pack);
 for(const r of [{...c.recovery,secondWindsSpent:-1},{...c.recovery,secondWindEncounter:1},{...c.recovery,persistent:['rage','rage']},{...c.recovery,persistent:['poison']},{...c.recovery,unknown:true},{...c.recovery,rageRounds:NaN}])assert.throws(()=>validateCharacter({...c,recovery:r},pack),/recovery/);
});

test('Second Wind checks half HP, heals the greater of quarter maximum or Constitution, and records encounter use',()=>{
 const c=hero();assert(!derive(c,pack).recovery.secondWind.available);c.currentHP=15;
 let d=derive(c,pack);assert(d.recovery.secondWind.available);assert.equal(d.recovery.secondWind.healing,10);
 assert.equal(catchSecondWind(c,d,pack).healed,10);assert.equal(c.currentHP,25);assert(c.recovery.secondWindEncounter);
 c.currentHP=1;assert.throws(()=>catchSecondWind(c,derive(c,pack),pack),/encounter/);newEncounter(c);assert(derive(c,pack).recovery.secondWind.available);
 c.modifiers.hp=100;assert.equal(derive(c,pack).recovery.secondWind.healing,32);validateCharacter(c,pack);
});

test('Jedi Counseling multiplies extra daily uses by the base; RAW switches restore one plus each extra use',()=>{
 const c=hero();c.trainedSkills=['skill:endurance'];c.levels[0].feats=[{id:'feat:extra-second-wind'},{id:'feat:extra-second-wind'}];
 assert.equal(derive(c,pack).recovery.secondWind.daily,9);
 c.houseRules={jediCounseling:{[pack.rules.secondWind.multipleUsesTopic]:false}};assert.equal(derive(c,pack).recovery.secondWind.daily,3);
 c.levels[0].talent={id:'talent:tough-as-nails'};assert.equal(derive(c,pack).recovery.secondWind.daily,4);
 delete c.houseRules;c.levels.push(level('scout'));assert.equal(derive(c,pack).recovery.secondWind.daily,12,'uses highest class Fortitude bonus, not the sum');
 c.abilities.con=3;assert.equal(derive(c,pack).recovery.secondWind.daily,4,'base minimum is one');
});

test('spent counters survive capacity changes; encounter/day resets do not refill HP, Force Points, active Rage or persistent conditions',()=>{
 const c=hero('wookiee');c.currentHP=1;startRage(c,derive(c,pack));catchSecondWind(c,derive(c,pack),pack);
 c.recovery.persistent=['rage'];const hp=c.currentHP,fp=c.forcePoints,rounds=c.recovery.rageRounds;
 newDay(c);assert.equal(c.currentHP,hp);assert.equal(c.forcePoints,fp);assert.equal(c.recovery.rageRounds,rounds);assert.deepEqual(c.recovery.persistent,['rage']);assert(c.recovery.secondWindEncounter);
 newEncounter(c);assert(!c.recovery.secondWindEncounter);
 c.recovery.secondWindsSpent=10;c.abilities.con=30;assert.equal(derive(c,pack).recovery.secondWind.remaining,4);
 c.houseRules={jediCounseling:{[pack.rules.secondWind.multipleUsesTopic]:false}};assert.equal(derive(c,pack).recovery.secondWind.remaining,0);
});

test('Edge of Exhaustion costs a persistent step only after daily uses are exhausted and still obeys the encounter limit',()=>{
 const c=hero();c.houseRules={jediCounseling:{[pack.rules.secondWind.multipleUsesTopic]:false}};c.currentHP=1;
 catchSecondWind(c,derive(c,pack),pack);assert.equal(c.condition,0);assert.deepEqual(c.recovery.persistent,[]);
 newEncounter(c);c.currentHP=1;const result=catchSecondWind(c,derive(c,pack),pack);assert(result.exhaustion);assert.equal(c.condition,1);assert.deepEqual(c.recovery.persistent,['second-wind']);
 assert.throws(()=>recoverCondition(c,derive(c,pack)),/unavailable/);removePersistent(c,'second-wind');recoverCondition(c,derive(c,pack));assert.equal(c.condition,0);
 newEncounter(c);c.currentHP=1;c.houseRules.jediCounseling[pack.rules.secondWind.exhaustionTopic]=false;assert.throws(()=>catchSecondWind(c,derive(c,pack),pack),/daily uses/);
});

test('Second Wind and Rage cannot be used at zero HP or while helpless; droids cannot heal using Second Wind',()=>{
 for(const state of [{currentHP:0},{currentHP:1,condition:5}]){const c=Object.assign(hero('wookiee'),state);assert(derive(c,pack).incapacitated);assert.throws(()=>catchSecondWind(c,derive(c,pack),pack));assert.throws(()=>startRage(c,derive(c,pack)));}
 const p=structuredClone(pack);p.species.find(s=>s.id==='species:human').isDroid=true;const c=hero();c.currentHP=1;assert(!derive(c,p).recovery.secondWind.available);
});

test('Force Recovery rolls per currently possessed Force Point, caps at 10 dice, and spends no points',()=>{
 const c=hero('human','jedi');c.levels[0].talent={id:'talent:equilibrium'};c.levels.push(level('jedi'),{...level('jedi'),talent:{id:'talent:force-recovery'}});c.currentHP=1;c.forcePoints=15;
 assert.equal(derive(c,pack).recovery.secondWind.forceDice,10);const expressions=[];let r=catchSecondWind(c,derive(c,pack),pack,expr=>{expressions.push(expr);return {value:20};});assert.deepEqual(expressions,['10d6']);assert.equal(r.forceRecovery,20);assert.equal(c.forcePoints,15);assert.equal(c.currentHP,31);
 newEncounter(c);c.currentHP=1;c.forcePoints=0;catchSecondWind(c,derive(c,pack),pack,()=>{throw Error('No dice should roll');});assert.equal(c.currentHP,11);
});

test('Rage bonuses apply to melee only, block named concentration skills and end with a persistent step',()=>{
 const c=hero('wookiee','jedi');c.inventory=[item('blaster-pistol')];c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=[{id:crypto.randomUUID(),powerId:'power:battle-strike',spent:false}];const before=derive(c,pack);startRage(c,before);let d=derive(c,pack);
 assert.equal(d.recovery.rage.rounds,6);assert.equal(d.attacks[0].attack,before.attacks[0].attack);assert.equal(d.attacks[1].attack,before.attacks[1].attack+2);assert.equal(d.attacks[1].damageBonus,before.attacks[1].damageBonus+2);
 for(const id of ['mechanics','stealth','use-the-force'])assert(!d.skills.find(s=>s.id==='skill:'+id).available);
 assert.throws(()=>usePower(c,d,pack,c.levels[0].forcePowers[0].id,15),/unavailable/);assert(!c.levels[0].forcePowers[0].spent);
 for(let i=0;i<5;i++)advanceRage(c);assert.equal(c.condition,0);assert.equal(c.recovery.rageRounds,1);advanceRage(c);assert.equal(c.condition,1);assert.deepEqual(c.recovery.persistent,['rage']);assert.equal(endRage(c),false);
 assert.throws(()=>recoverCondition(c,derive(c,pack)));removePersistent(c,'rage');assert.equal(c.condition,1);recoverCondition(c,derive(c,pack));assert.equal(c.condition,0);validateCharacter(c,pack);
});

test('Extra Rage stacks and Dreadful Rage gives +5, without changing duration; independent persistent causes must each be removed',()=>{
 const c=hero('wookiee');c.levels[0].feats=[{id:'feat:dreadful-rage'}];c.levels.push(level('soldier'),{...level('soldier'),feats:[{id:'feat:extra-rage'}]},level('soldier'),level('soldier'),{...level('soldier'),feats:[{id:'feat:extra-rage'}]});
 let d=derive(c,pack);assert.equal(d.recovery.rage.daily,3);startRage(c,d);d=derive(c,pack);assert.equal(d.recovery.rage.bonus,5);assert.equal(d.recovery.rage.duration,6);endRage(c);
 c.recovery.persistent.push('second-wind');removePersistent(c,'rage');assert.deepEqual(c.recovery.persistent,['second-wind']);assert(!derive(c,pack).recovery.recoverable);assert(renderStatBlock(c,derive(c,pack),pack).includes('Persistent Conditions'));
});

test('Bellow uses character level, armor and condition penalties, Fortitude, its own sonic dice and a condition cost',()=>{
 const c=hero('ithorian','scoundrel');let d=derive(c,pack);assert.equal(d.bab,0);assert.equal(bellowDetails(c,d,pack).attack,1);
 const result=rollBellow(c,d,pack,2,null,roller(12,13,17));assert(result.html.includes('<th>Fortitude</th>'));assert(!result.html.includes('<th>Reflex</th>'));assert(result.text.includes('5d6'));assert.equal(result.results[0].damage,17);assert.equal(result.rows[0].damage,8);assert.equal(c.condition,3);
 c.inventory=[item('heavy-battle-armor')];d=derive(c,pack);assert.equal(bellowDetails(c,d,pack).attack,1+pack.rules.conditionPenalties[3]+pack.rules.armorPenalties.heavy);
});

test('Bellow defaults uncapped, optional Helpless cap is enforced before rolling, and neither adds persistent fatigue',()=>{
 const c=hero('ithorian');assert.equal(bellowDetails(c,derive(c,pack),pack,100).dice,103);rollBellow(c,derive(c,pack),pack,100,null,roller(12,13,400));assert.equal(c.condition,5);assert.equal(c.recovery,undefined);
 c.condition=2;c.houseRules={ambiguities:{'ambiguity:bellow-extra-dice':'track-limit'}};assert.equal(bellowDetails(c,derive(c,pack),pack).maxExtra,2);let calls=0;assert.throws(()=>rollBellow(c,derive(c,pack),pack,3,null,()=>calls++),/unavailable/);assert.equal(calls,0);assert.equal(c.condition,2);
 rollBellow(c,derive(c,pack),pack,2,null,roller(12,13,20));assert.equal(c.condition,5);validateCharacter(c,pack);
});

test('Bellow pools above 500 dice require entered damage, never silently truncate, and cost condition even on a miss',()=>{
 const c=hero('ithorian');let calls=0;assert.throws(()=>rollBellow(c,derive(c,pack),pack,500,null,()=>calls++),/Enter 503d6/);assert.equal(calls,0);assert.equal(c.condition,0);
 const exprs=[];const result=rollBellow(c,derive(c,pack),pack,500,2000,expr=>{exprs.push(expr);return roller(12,13,2000)(expr);});assert.equal(result.results[0].damage,2000);assert.deepEqual(exprs,['1d20+1','2000']);assert(result.text.includes('entered damage'));assert.equal(c.condition,5);
 c.condition=0;const miss=rollBellow(c,derive(c,pack),pack,0,null,roller(1,2,10));assert.equal(miss.rows[0].damage,0);assert.equal(c.condition,1);
});

test('area minimum modified roll applies even on natural 20; Bellow does not multiply damage on a natural 20',()=>{
 const c=hero('ithorian');const r=rollBellow(c,derive(c,pack),pack,0,null,roller(20,21,11));assert(!r.results[0].critical);assert.equal(r.rows[0].damage,11);
 const a={uid:'test',name:'Autofire',areaType:'burst',attack:-15,damage:'3d6',damageDisplay:'3d6'};let calls=0;const result=rollRoutine({steps:[{attackId:'test',count:1,attackMod:0,damageMod:0}]},[a],pack.rules.combat,expr=>{calls++;return roller(20,5,20)(expr);});assert.equal(calls,1);assert.equal(result.rows[0].damage,0);
 const miss=rollRoutine({steps:[{attackId:'test',count:1,attackMod:0,damageMod:0}]},[{...a,attack:10}],pack.rules.combat,roller(1,11,15));assert.deepEqual(miss.rows,[{lo:null,hi:null,damage:7,evasion:0,cover:0,splash:0}]);assert(miss.html.includes('Miss'));assert(miss.results[0].damageRoll);
});
