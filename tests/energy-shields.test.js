import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {activateEnergyShield,rechargeEnergyShield,shieldState} from '../src/energy-shields.js';
import {damageOutcome,applyIncomingDamage} from '../src/incoming-damage.js';
import {newEncounter,newDay} from '../src/recovery.js';
import {purchaseQuote,equipmentFamilies} from '../src/equipment.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(rating=20){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:18,con:12,int:12,wis:10,cha:10};c.currentHP=100;c.levels[0].classId='class:soldier';c.levels[0].feats=[];c.trainedSkills=['skill:mechanics'];c.inventory=[{id:'equipment:energy-shield-'+rating,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];return c;}
const activate=c=>activateEnergyShield(c,derive(c,pack),pack,c.inventory[0].uid);

test('six shield ratings share one purchase family with exact costs and no invented fitted prices',()=>{
 const family=equipmentFamilies(pack,'armor').find(f=>f.name==='Energy Shield');assert.equal(family.records.length,6);
 assert.deepEqual(family.records.map(r=>[r.energyShield.rating,r.cost]).sort((a,b)=>a[0]-b[0]),[[5,500],[10,2000],[15,4500],[20,8000],[25,12500],[30,18000]]);
 const c=hero();assert.equal(purchaseQuote({id:c.inventory[0].id,armorSize:'large'},1,pack,c).total,8000);
 assert.equal(purchaseQuote({id:c.inventory[0].id},1,pack,c).item.weight,null);
});
test('inert shields leave defenses, level replacement, skills and Speed unchanged',()=>{
 const c=hero(),d=derive(c,pack);c.inventory=[];const bare=derive(c,pack);
 assert.deepEqual(d.defenses,bare.defenses);assert.equal(d.skills.find(s=>s.id==='skill:acrobatics').total,bare.skills.find(s=>s.id==='skill:acrobatics').total);assert.equal(d.speed,6);assert.equal(d.armor,null);
});
test('proficient active shields cap Dexterity and always penalize attacks/checks without slowing',()=>{
 const c=hero();activate(c);const d=derive(c,pack);assert.equal(d.defenses.reflex,15);assert.equal(d.speed,6);assert.equal(d.skills.find(s=>s.id==='skill:acrobatics').total,-1);assert.equal(d.attacks[0].attack,-2);assert.equal(d.armor,null);assert.equal(c.inventory[0].shield.charges,4);
 assert.throws(()=>activate(c),/Used this encounter/);
});
test('unproficient shields deny positive Dexterity and apply their additional Reflex penalty',()=>{
 const c=hero(30);activate(c);const d=derive(c,pack);assert.equal(d.defenses.reflex,7);assert.equal(d.skills.find(s=>s.id==='skill:acrobatics').total,-6);assert.equal(d.speed,6);assert.equal(d.runSpeed,18);
 c.levels[0].feats=[{id:'feat:armor-proficiency-heavy'}];assert.equal(derive(c,pack).defenses.reflex,14);
});
test('pure Energy uses device SR, while physical, mixed and Lightsaber damage bypass it',()=>{
 const c=hero();activate(c);const d=derive(c,pack);
 assert.equal(damageOutcome(c,d,pack,25,{energy:true}).hpDamage,5);
 for(const opts of [{},{energy:true,otherDamage:true},{energy:true,lightsaber:true},{energy:true,fire:true}])assert.equal(damageOutcome(c,d,pack,25,opts).hpDamage,25);
 applyIncomingDamage(c,d,pack,25,{energy:true});assert.equal(c.currentHP,95);assert.equal(c.inventory[0].shield.sr,15);assert.equal(c.protection.sr,0);
 applyIncomingDamage(c,derive(c,pack),pack,10);assert.equal(c.inventory[0].shield.sr,15);assert.equal(c.currentHP,85);
});
test('multiple SR sources use the highest applicable current rating and spend only that source',()=>{
 const c=hero();activate(c);c.protection.sr=30;c.protection.srMax=30;applyIncomingDamage(c,derive(c,pack),pack,35,{energy:true});assert.equal(c.protection.sr,25);assert.equal(c.inventory[0].shield.sr,20);
 c.protection.sr=5;applyIncomingDamage(c,derive(c,pack),pack,25,{energy:true});assert.equal(c.protection.sr,5);assert.equal(c.inventory[0].shield.sr,15);
});
test('recharge is a DC20 Mechanics check; failure spends actions but restores no SR or charge',()=>{
 const c=hero();activate(c);c.inventory[0].shield.sr=5;c.inventory.push({id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,aimed:true});
 let r=rechargeEnergyShield(c,derive(c,pack),pack,c.inventory[0].uid,()=>({value:19}));assert(!r.success);assert.equal(r.actions,3);assert.equal(c.inventory[0].shield.sr,5);assert.equal(c.inventory[1].aimed,false);
 r=rechargeEnergyShield(c,derive(c,pack),pack,c.inventory[0].uid,()=>({value:20}));assert(r.success);assert.equal(r.after,10);assert.equal(c.inventory[0].shield.charges,4);assert(c.inventory[0].shield.used);
 c.inventory[0].shield.sr=19;assert.equal(rechargeEnergyShield(c,derive(c,pack),pack,c.inventory[0].uid,()=>({value:20})).after,20);
 assert.throws(()=>rechargeEnergyShield(c,derive(c,pack),pack,c.inventory[0].uid),/unavailable/);
});
test('encounter expiry and day advancement never grant charges or automatic recharge',()=>{
 const c=hero();activate(c);newDay(c,pack);assert(c.inventory[0].shield.active);assert.equal(c.inventory[0].shield.charges,4);newEncounter(c);assert(!c.inventory[0].shield.active);assert(!c.inventory[0].shield.used);activate(c);assert.equal(c.inventory[0].shield.charges,3);
 c.inventory[0].shield.active=false;c.inventory[0].shield.used=false;c.inventory[0].shield.charges=0;assert.throws(()=>activate(c),/No charges/);
});
test('closed saved state rejects invalid charges, SR, types and stacked generators; valid state survives import',()=>{
 const c=hero();activate(c);validateCharacter(JSON.parse(JSON.stringify(c)),pack);assert(renderStatBlock(c,derive(c,pack),pack).includes('20 (Energy)'));
 for(const patch of [{charges:6},{sr:21},{active:true,used:false},{extra:true},{charges:'4'}]){const copy=structuredClone(c);Object.assign(copy.inventory[0].shield,patch);assert.throws(()=>validateCharacter(copy,pack));}
 const copy=structuredClone(c);copy.inventory[0].quantity=2;assert.throws(()=>validateCharacter(copy,pack));
 const e={...c.inventory[0],shield:undefined};assert.equal(shieldState(e,pack.equipment.find(r=>r.id===e.id)).charges,5);
});

test('proficient Juggernaut removes Heavy shield running restrictions without removing shield penalties',()=>{
 const c=hero(30);c.levels[0].feats=[{id:'feat:armor-proficiency-heavy'}];c.levels[0].talent={id:'talent:armored-defense'};
 c.levels.push({...structuredClone(c.levels[0]),hpRoll:8,feats:[],talent:null},{...structuredClone(c.levels[0]),hpRoll:8,feats:[],talent:{id:'talent:juggernaut'}});activate(c);let d=derive(c,pack);assert.equal(d.runSpeed,24);assert.equal(d.skills.find(s=>s.id==='skill:acrobatics').total,-5);
 c.levels[0].feats=[];d=derive(c,pack);assert.equal(d.runSpeed,18);
});

test('unequipping suspends protection without ending the activation or charging again',()=>{
 const c=hero();activate(c);c.inventory[0].shield.sr=15;c.inventory[0].equipped=false;let d=derive(c,pack);assert.equal(d.energyShields.length,0);assert.equal(damageOutcome(c,d,pack,20,{energy:true}).hpDamage,20);
 c.inventory[0].equipped=true;d=derive(c,pack);assert.equal(damageOutcome(c,d,pack,20,{energy:true}).hpDamage,5);assert.equal(c.inventory[0].shield.charges,4);assert.throws(()=>activate(c),/Used this encounter/);
});
