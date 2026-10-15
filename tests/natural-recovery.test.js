import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {recoveryState,newDay,setPersistent,setDead,receiveHealing,restEightHours,checkConsciousness,loseLimb,removeLimb,startRage,setLimbPersistent} from '../src/recovery.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=(species='human')=>{const c=newCharacter(pack,{classId:'class:scoundrel'});c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};c.levels[0].classId='class:soldier';return c;};
const roller=(natural,value)=>expr=>({value,d20:[natural],display:expr,rollId:1});

test('legacy recovery objects remain valid; new fields default without mutation and validate strictly',()=>{
 const c=hero();c.recovery={secondWindsSpent:1,secondWindEncounter:true,ragesSpent:0,rageRounds:0,persistent:[]};validateCharacter(c,pack);
 assert.equal(recoveryState(c).naturalHealingUsed,false);assert.equal(c.recovery.naturalHealingUsed,undefined);
 for(const extra of [{naturalHealingUsed:1},{unconsciousRetry:'yes'},{dead:0},{persistent:['toString']},{limbs:[{id:crypto.randomUUID(),name:'Arm',days:0}]},{limbs:[{id:crypto.randomUUID(),name:'',days:5}]},{limbs:[{id:crypto.randomUUID(),name:'Arm',days:5,unknown:1}]}])assert.throws(()=>validateCharacter({...c,recovery:{...c.recovery,...extra}},pack));
});

test('natural healing uses character level once per day; rest restores the track without refilling other resources',()=>{
 const c=hero();c.currentHP=1;c.condition=3;c.forcePoints=2;let r=restEightHours(c,derive(c,pack),pack);assert.equal(r.healed,1);assert.equal(c.currentHP,2);assert.equal(c.condition,0);assert.equal(c.forcePoints,2);
 c.condition=2;r=restEightHours(c,derive(c,pack),pack);assert.equal(r.healed,0);assert.equal(c.currentHP,2);assert.equal(c.condition,0);
 newDay(c,pack);assert.equal(c.currentHP,2);assert.equal(c.forcePoints,2);assert.equal(restEightHours(c,derive(c,pack),pack).healed,1);validateCharacter(c,pack);
 c.currentHP=derive(c,pack).hp;assert.equal(restEightHours(c,derive(c,pack),pack).healed,0);
});

test('Wookiee natural healing doubles level; rest ends active Rage and removes rest-curable causes only',()=>{
 const c=hero('wookiee');c.currentHP=1;startRage(c,derive(c,pack));setPersistent(c,'second-wind',true);setPersistent(c,'injury',true);
 assert.equal(restEightHours(c,derive(c,pack),pack).healed,2);assert.equal(c.recovery.rageRounds,0);assert.deepEqual(c.recovery.persistent,[]);assert.equal(c.condition,0);
 c.condition=2;setPersistent(c,'other',true);setPersistent(c,'injury',true);newDay(c,pack);const r=restEightHours(c,derive(c,pack),pack);assert(r.blocked);assert.equal(r.healed,0);assert.equal(c.condition,2);assert.deepEqual(c.recovery.persistent,['other']);assert(!c.recovery.naturalHealingUsed);
 setPersistent(c,'other',false);assert.equal(restEightHours(c,derive(c,pack),pack).healed,2);
});

test('healing at unconsciousness defaults to literal HP replacement; optional additive healing remains saved',()=>{
 const c=hero('ithorian');c.condition=5;c.currentHP=20;setPersistent(c,'injury',true);
 const result=receiveHealing(c,derive(c,pack),pack,1);assert.deepEqual(result,{before:20,after:1,revived:true});assert.equal(c.condition,4);assert.deepEqual(c.recovery.persistent,['injury']);
 c.condition=5;c.currentHP=20;c.houseRules={ambiguities:{'ambiguity:unconscious-healing':'add'}};receiveHealing(c,derive(c,pack),pack,1);assert.equal(c.currentHP,21);assert.equal(c.condition,4);validateCharacter(c,pack);
 c.condition=2;receiveHealing(c,derive(c,pack),pack,100000);assert.equal(c.currentHP,derive(c,pack).hp);assert.equal(c.condition,2);
 for(const amount of [0,-1,1.5,NaN,100001])assert.throws(()=>receiveHealing(c,derive(c,pack),pack,amount));
});

test('zero HP implies unconsciousness even in legacy play state; healing sets the track to its penultimate step',()=>{
 const c=hero();c.currentHP=0;c.condition=0;receiveHealing(c,derive(c,pack),pack,3);assert.equal(c.currentHP,3);assert.equal(c.condition,4);assert(!derive(c,pack).incapacitated);
});

test('consciousness checks use Constitution, add level HP, move one step and ignore previous numeric penalties',()=>{
 const c=hero('ithorian');c.abilities.con=14;c.condition=5;c.currentHP=10;const expressions=[];
 const r=checkConsciousness(c,derive(c,pack),pack,expr=>{expressions.push(expr);return roller(8,10)(expr);});assert(r.success);assert.deepEqual(expressions,['1d20+2']);assert.equal(c.currentHP,11);assert.equal(c.condition,4);
 assert.throws(()=>checkConsciousness(c,derive(c,pack),pack),/unavailable/);validateCharacter(c,pack);
});

test('nonfatal failed consciousness checks record injury and an hourly retry; healing does not erase the injury',()=>{
 const c=hero();c.currentHP=0;c.condition=5;let r=checkConsciousness(c,derive(c,pack),pack,roller(7,7));assert(!r.dead&&!r.success);assert(c.recovery.unconsciousRetry);assert.deepEqual(c.recovery.persistent,['injury']);
 r=checkConsciousness(c,derive(c,pack),pack,roller(10,10));assert(r.success);assert.equal(c.currentHP,1);assert(!c.recovery.unconsciousRetry);assert.deepEqual(c.recovery.persistent,['injury']);assert(!derive(c,pack).recovery.recoverable);
 assert.equal(restEightHours(c,derive(c,pack),pack).healed,1);assert.deepEqual(c.recovery.persistent,[]);assert.equal(c.condition,0);
});

test('natural one or failure by five records death; ordinary healing/rest/actions cannot resurrect',()=>{
 for(const [natural,total] of [[1,30],[5,5]]){
  const c=hero();c.condition=5;const r=checkConsciousness(c,derive(c,pack),pack,roller(natural,total));assert(r.dead);assert(c.recovery.dead);assert.equal(c.currentHP,0);
  assert.throws(()=>receiveHealing(c,derive(c,pack),pack,10),/revival/);assert.throws(()=>restEightHours(c,derive(c,pack),pack),/unavailable/);assert.throws(()=>checkConsciousness(c,derive(c,pack),pack),/unavailable/);
  c.condition=0;c.currentHP=10;assert(derive(c,pack).incapacitated);assert(!derive(c,pack).recovery.secondWind.available);assert(renderStatBlock(c,derive(c,pack),pack).includes('Dead'));setDead(c,false);assert(!derive(c,pack).incapacitated);validateCharacter(c,pack);
 }
});

test('droids use repair but have no natural healing or organic consciousness checks',()=>{
 const p=structuredClone(pack);p.species.find(s=>s.id==='species:human').isDroid=true;const c=hero();c.currentHP=0;c.condition=5;
 assert.throws(()=>restEightHours(c,derive(c,p),p));assert.throws(()=>checkConsciousness(c,derive(c,p),p));receiveHealing(c,derive(c,p),p,10);assert.equal(c.currentHP,10);assert.equal(c.condition,4);
});

test('Trandoshan limb regeneration rolls and persists per-limb days; only completed limbs lose their causes',()=>{
 const c=hero('trandoshan');c.condition=2;loseLimb(c,pack,'Arm',()=>({value:2}));loseLimb(c,pack,'Leg',()=>({value:3}));assert.equal(c.condition,2);assert.deepEqual(c.recovery.persistent,['limb-loss']);validateCharacter(c,pack);
 setPersistent(c,'other',true);assert(restEightHours(c,derive(c,pack),pack).blocked);assert.deepEqual(newDay(c,pack),[]);assert.deepEqual(newDay(c,pack),['Arm']);assert.deepEqual(c.recovery.persistent,['limb-loss','other']);assert.deepEqual(newDay(c,pack),['Leg']);assert.deepEqual(c.recovery.persistent,['other']);assert.equal(c.condition,2);
 loseLimb(c,pack,'Arm',()=>({value:5}));removeLimb(c,c.recovery.limbs[0].id);assert.deepEqual(c.recovery.persistent,['other']);
 assert.throws(()=>loseLimb(hero(),pack,'Arm'));for(const n of [0,11,NaN])assert.throws(()=>loseLimb(c,pack,'Arm',()=>({value:n})));assert.throws(()=>loseLimb(c,pack,' '));
});

test('a lost limb need not impose a persistent condition; flags and separate regeneration times remain independent',()=>{
 const c=hero('trandoshan');loseLimb(c,pack,'Old injury',()=>({value:5}),false);assert.deepEqual(c.recovery.persistent,[]);validateCharacter(c,pack);
 loseLimb(c,pack,'New injury',()=>({value:1}),true);assert.deepEqual(newDay(c,pack),['New injury']);assert.deepEqual(c.recovery.persistent,[]);assert.equal(c.recovery.limbs[0].days,4);
 const id=c.recovery.limbs[0].id;setLimbPersistent(c,id,true);assert.deepEqual(c.recovery.persistent,['limb-loss']);setLimbPersistent(c,id,false);assert.deepEqual(c.recovery.persistent,[]);assert.equal(c.recovery.limbs.length,1);
});
