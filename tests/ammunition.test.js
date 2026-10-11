import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {ammunitionProfile,reloadWeapon,spendAttackResources} from '../src/ammunition.js';
import {rollRoutine,routineIssue} from '../src/combat.js';
import {validatePack} from '../tools/validate-rules.js';
import {createStore,STORAGE_KEY} from '../src/persistence.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const hero=()=>{const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};c.levels[0].classId='class:soldier';return c;};
const routine=(...steps)=>({name:'Volley',steps:steps.map(([attackId,count=1])=>({attackId,count,attackMod:0,damageMod:0}))});
const roller=expr=>({value:expr.startsWith('1d20')?1:10,d20:expr.startsWith('1d20')?[1]:[],display:expr,coeffs:[1]});

test('reviewed capacities and supply prices retain pinned rules, absent Energy Cell weight and reload exceptions',()=>{
 validatePack(pack);const weapons=pack.equipment.filter(w=>w.ammunitionProfiles);assert.equal(weapons.length,19);assert.equal(weapons.reduce((n,w)=>n+w.ammunitionProfiles.length,0),20);
 assert.equal(ammunitionProfile(item('blaster-pistol'),pack).capacity,100);assert.equal(ammunitionProfile(item('blaster-rifle'),pack).capacity,50);
 assert.equal(ammunitionProfile(item('bow'),pack).reloadAction,'free-action');
 for(const name of ['flamethrower','missile-launcher','grenade-launcher'])assert.equal(ammunitionProfile(item(name),pack).reloadAction,'full-round-action');
 const supply=id=>pack.equipment.find(r=>r.id==='equipment:'+id);
 assert.deepEqual([supply('power-pack').cost,supply('power-pack').weight],[25,.1]);assert.equal(supply('energy-cell').weight,null);
 assert.deepEqual([supply('missile-magazine').cost,supply('missile-magazine').weight],[200,5]);assert.equal(supply('power-generator').cost,750);
 assert(!ammunitionProfile(item('bowcaster'),pack),'No inferred capacity');assert(!ammunitionProfile(item('lightsaber'),pack),'No invented battery lifetime');
 const bad=structuredClone(pack);bad.equipment.find(w=>w.ammunitionProfiles).ammunitionProfiles[0].supplyIds=['equipment:missing'];assert.throws(()=>validatePack(bad),/reference/);
});

test('legacy weapons are untracked; explicit empty counters block attacks without claiming ammunition',()=>{
 const c=hero();c.inventory=[item('blaster-rifle')];validateCharacter(c,pack);assert.equal(derive(c,pack).attacks[0].ammunition.remaining,null);assert(derive(c,pack).attacks[0].available);
 const result=rollRoutine(routine([c.inventory[0].uid]),derive(c,pack).attacks,pack.rules.combat,roller);assert.deepEqual(result.ammunitionSpent,[]);
 c.inventory[0].shotsRemaining=0;const a=derive(c,pack).attacks[0];assert(!a.available);assert(a.range.available);assert.equal(routineIssue(routine([a.uid]),[a]),'Blaster Rifle: needs 1 shot; 0 loaded');
});

test('every fired shot is spent on a miss, with quantity and repeated steps counted per physical weapon',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:3,quantity:2}),item('blaster-pistol',{shotsRemaining:4})];
 const r=routine([c.inventory[0].uid],[c.inventory[1].uid,2],[c.inventory[0].uid,2]);
 const result=rollRoutine(r,derive(c,pack).attacks,pack.rules.combat,roller);assert(result.results.every(r=>r.naturalMiss));assert.deepEqual(result.ammunitionSpent,[{uid:c.inventory[0].uid,shots:3},{uid:c.inventory[1].uid,shots:2}]);assert.equal(c.inventory[0].shotsRemaining,3,'Rolling is pure');
 spendAttackResources(c,result);assert.equal(c.inventory[0].shotsRemaining,0);assert.equal(c.inventory[1].shotsRemaining,2);
});

test('autofire needs and spends ten rounds even on a failed area attack',()=>{
 const c=hero();c.inventory=[item('heavy-repeating-blaster',{shotsRemaining:19})];let a=derive(c,pack).attacks[0];assert.equal(a.ammunition.cost,10);assert(a.available);
 assert.throws(()=>rollRoutine(routine([a.uid,2]),[a],pack.rules.combat,()=>assert.fail('No dice on overspend')),/needs 20 shots; 19 loaded/);
 let result=rollRoutine(routine([a.uid]),[a],pack.rules.combat,roller);assert(result.results[0].failedArea);spendAttackResources(c,result);assert.equal(c.inventory[0].shotsRemaining,9);assert(!derive(c,pack).attacks[0].available);
 c.inventory=[item('blaster-rifle',{shotsRemaining:10,fireMode:'autofire'})];a=derive(c,pack).attacks[0];assert.equal(a.ammunition.cost,10);c.inventory[0].fireMode='single';assert.equal(derive(c,pack).attacks[0].ammunition.cost,1);
});

test('preflight checks all routine steps before dice or spending, and catches an aggregate deficit',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:2,aimed:true}),item('blaster-pistol',{shotsRemaining:0})];const uid=c.inventory[0].uid;
 for(const r of [routine([uid,2],[uid]),routine([uid],[c.inventory[1].uid]),routine([uid],[crypto.randomUUID()])])assert.throws(()=>rollRoutine(r,derive(c,pack).attacks,pack.rules.combat,()=>assert.fail('Must not roll')),/needs|unavailable/);
 assert.equal(c.inventory[0].shotsRemaining,2);assert(c.inventory[0].aimed);
 const result=rollRoutine(routine([uid]),derive(c,pack).attacks,pack.rules.combat,roller);c.inventory[0].shotsRemaining=0;assert.throws(()=>spendAttackResources(c,result),/changed/);assert(c.inventory[0].aimed);
 const bad={ammunitionSpent:[{uid:c.inventory[1].uid,shots:0},{uid:crypto.randomUUID(),shots:1}],aimConsumed:[uid]};assert.throws(()=>spendAttackResources(c,bad),/changed/);assert(c.inventory[0].aimed);
});

test('Sporting Pistol supplies use distinct capacities and supplied reloads clear Aim without minting inventory',()=>{
 const c=hero();c.inventory=[item('sporting-blaster-pistol'),item('blaster-rifle',{aimed:true})];const e=c.inventory[0];assert.equal(ammunitionProfile(e,pack).capacity,6);
 e.ammoProfile='power-pack';assert.equal(ammunitionProfile(e,pack).capacity,100);const before=structuredClone(c.inventory),profile=reloadWeapon(c,pack,e.uid);assert.equal(profile.reloadAction,'move-action');assert.equal(e.shotsRemaining,100);assert.equal(c.inventory.length,before.length);assert(!c.inventory[1].aimed);validateCharacter(c,pack);
 e.ammoProfile='energy-cell';assert.throws(()=>validateCharacter(c,pack),/loaded shots/);delete e.shotsRemaining;reloadWeapon(c,pack,e.uid);assert.equal(e.shotsRemaining,6);
});

test('invalid saved profiles and counters are rejected while imports and duplicates retain ammunition',()=>{
 const c=hero();c.inventory=[item('sporting-blaster-pistol',{ammoProfile:'power-pack',shotsRemaining:42})];validateCharacter(c,pack);
 for(const extra of [{shotsRemaining:-1},{shotsRemaining:101},{shotsRemaining:1.5},{shotsRemaining:null},{ammoProfile:'missing'},{ammoProfile:''},{ammoProfile:7}]){const bad=structuredClone(c);Object.assign(bad.inventory[0],extra);assert.throws(()=>validateCharacter(bad,pack),/ammunition|shots/);}
 const bad=structuredClone(c);bad.inventory[0].id='equipment:knife';assert.throws(()=>validateCharacter(bad,pack),/ammunition|shots/);
 globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};const data=new Map([[STORAGE_KEY,JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]})]]);const store=createStore(pack,()=>{},{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
 const imported=store.import(JSON.stringify(c));assert.equal(imported.inventory[0].shotsRemaining,42);store.duplicate();assert.equal(store.current().inventory[0].ammoProfile,'power-pack');assert.equal(store.current().inventory[0].shotsRemaining,42);
});
