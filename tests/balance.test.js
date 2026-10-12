import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {balance,balanceAfterDamage,balanceDC,balanceState,planBalance,stopBalancing} from '../src/balance.js';
import {applyIncomingDamage} from '../src/incoming-damage.js';
import {planOpportunity} from '../src/opportunity.js';
import {reloadWeapon} from '../src/ammunition.js';
import {balanceControls} from '../src/balance-ui.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function fixture(trained=false){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:14,wis:10,cha:10};c.trainedSkills=trained?['skill:acrobatics']:[];c.balance={check:10,path:{squares:3}};return c;}
const die=n=>expr=>({value:n,d20:[n],display:expr});
test('Balance retains exact width DCs, one unstable adjustment and the pinned rules mapping',()=>{
 const c=fixture();assert.equal(balanceDC(c,pack),10);c.balance.width='4-7';assert.equal(balanceDC(c,pack),15);c.balance.width='under-4';assert.equal(balanceDC(c,pack),20);c.balance.unstable=true;assert.equal(balanceDC(c,pack),25);
 assert.equal(pack.rules.balance.trainedOnly,false);assert.equal(pack.rules.balance.take10,false);assert.equal(pack.rules.balance.catchDC,15);
});
test('untrained Balance succeeds at half Speed and loses Dexterity until stopped',()=>{
 const c=fixture(),before=derive(c,pack);const result=balance(c,before,pack);assert(result.success);assert.equal(result.maximum,3);assert(c.balance.active);assert.equal(c.balance.activeDC,10);
 const d=derive(c,pack);assert(d.flatFooted);assert(!c.flatFooted);assert.equal(d.defenses.reflex,before.defenses.reflex-2);assert.equal(d.speed,before.speed);stopBalancing(c);assert(!derive(c,pack).flatFooted);
});
test('training exempts Balance while independent manual flat-footed state survives',()=>{
 const c=fixture(true);balance(c,derive(c,pack),pack);assert(!derive(c,pack).flatFooted);c.flatFooted=true;assert(derive(c,pack).flatFooted);stopBalancing(c);assert(c.flatFooted);assert(derive(c,pack).flatFooted);
});
test('diagonal and terrain costs count toward half adjusted Speed before any dice',()=>{
 const c=fixture();c.balance.path={squares:2,diagonal:1};assert.equal(planBalance(c,derive(c,pack),pack).cost,3);c.balance.path.diagonalDifficult=1;assert.throws(()=>balance(c,derive(c,pack),pack,false,()=>{throw Error('should not roll');}),/exceeds half Speed/);
 c.balance.path={squares:2};c.condition=4;assert.throws(()=>planBalance(c,derive(c,pack),pack),/exceeds half Speed/);
});
test('failed Balance applies Prone and resolves the separate catch check; a failed catch ends balancing',()=>{
 const c=fixture();c.balance.check=9;c.balance.catchCheck=15;let r=balance(c,derive(c,pack),pack);assert(!r.success);assert(r.caught.success);assert(c.prone);assert(c.balance.active);assert.equal(c.balance.catchCheck,null);
 c.prone=false;c.balance.check=9;c.balance.catchCheck=14;r=balance(c,derive(c,pack),pack);assert(r.fell);assert(!c.balance.active);assert.equal(c.currentHP,null);assert(c.prone);
});
test('invalid catch rolls change no state and successful Balance does not roll an unused catch',()=>{
 const c=fixture();c.balance.check=9;const before=structuredClone(c);assert.throws(()=>balance(c,derive(c,pack),pack,false,()=>({value:NaN})),/Invalid Balance roll/);assert.deepEqual(c,before);
 c.balance.check=10;balance(c,derive(c,pack),pack,false,()=>{throw Error('unused catch');});assert.equal(c.balance.check,null);
});
test('damage rechecks retain the successful DC after the movement draft changes',()=>{
 const c=fixture();balance(c,derive(c,pack),pack);c.balance.width='under-4';c.balance.unstable=true;c.balance.check=10;const r=balance(c,derive(c,pack),pack,true);assert.equal(r.dc,10);assert(r.success);assert.equal(c.balance.activeDC,10);assert.equal(balanceDC(c,pack),25);
});
test('damage rechecks use new condition penalties and do not consume Aim on success',()=>{
 const c=fixture(true);balance(c,derive(c,pack),pack);c.inventory=[{id:'equipment:blaster-pistol',uid:'pistol',quantity:1,equipped:true,aimed:true,shotsRemaining:20}];c.balance.check=null;
 const d=derive(c,pack);const dmg=applyIncomingDamage(c,d,pack,d.threshold);assert(dmg.balanceCheckRequired);assert.equal(c.condition,1);
 const updated=derive(c,pack),skill=updated.skills.find(s=>s.id==='skill:acrobatics');let expression;const r=balanceAfterDamage(c,updated,pack,expr=>{expression=expr;return {value:20+skill.total,d20:[20],display:expr};});assert.equal(expression,'1d20+'+skill.total);assert(r.success);assert(c.inventory[0].aimed);
});
test('shield/DR prevention does not trigger Balance; penetrating Stun/Ion does even when HP rounds to zero',()=>{
 const c=fixture();balance(c,derive(c,pack),pack);c.protection.sr=5;c.protection.srMax=5;assert(!applyIncomingDamage(c,derive(c,pack),pack,1).balanceCheckRequired);c.protection.sr=0;c.protection.dr=3;assert(!applyIncomingDamage(c,derive(c,pack),pack,3).balanceCheckRequired);c.protection.dr=0;
 const r=applyIncomingDamage(c,derive(c,pack),pack,1,{type:'stun'});assert.equal(r.hpDamage,0);assert(r.balanceCheckRequired);
});
test('balancing opportunity restrictions respect Combat Reflexes',()=>{
 const c=fixture();balance(c,derive(c,pack),pack);c.inventory=[{id:'equipment:knife',uid:'knife',quantity:1,equipped:true}];c.opportunity={opponent:'trooper',action:'move',provoked:true};assert.throws(()=>planOpportunity(c,derive(c,pack),pack,'knife'),/Flat-footed/);
 c.levels[0].feats=[{id:'feat:combat-reflexes'}];assert(planOpportunity(c,derive(c,pack),pack,'knife'));
});
test('damage that incapacitates a balancing character ends balance without rolling an unavailable check',()=>{
 const c=fixture();balance(c,derive(c,pack),pack);c.currentHP=1;const damage=applyIncomingDamage(c,derive(c,pack),pack,1);assert(damage.balanceCheckRequired);
 const result=balanceAfterDamage(c,derive(c,pack),pack,()=>{throw Error('unavailable roll');});assert(result.fell);assert(!c.balance.active);assert(c.prone);assert.equal(c.currentHP,0);
});
test('untrained Balance disables free arrow reloads; training restores them',()=>{
 const weapon=pack.equipment.find(w=>w.ammunitionProfiles?.some(p=>p.reloadAction==='free-action'));
 const c=fixture();c.inventory=[{id:weapon.id,uid:'bow',quantity:1,equipped:true,freeReloads:true,shotsRemaining:0}];balance(c,derive(c,pack),pack);let d=derive(c,pack);assert(!d.attacks.find(a=>a.uid==='bow').ammunition.freeReloads);assert.throws(()=>reloadWeapon(c,pack,'bow'),/flat-footed/);
 c.trainedSkills=['skill:acrobatics'];d=derive(c,pack);assert(d.attacks.find(a=>a.uid==='bow').ammunition.freeReloads);reloadWeapon(c,pack,'bow',d.flatFooted);
});
test('Balance saves validate closed state and preserve active DC and entered totals',()=>{
 const c=fixture();balance(c,derive(c,pack),pack);c.balance.check=12;c.balance.catchCheck=-1;const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(balanceState(saved).activeDC,10);assert.equal(saved.balance.check,12);
 for(const patch of [{activeDC:null},{width:'7.5'},{unexpected:true},{check:Infinity}])assert.throws(()=>validateCharacter({...saved,balance:{...saved.balance,...patch}},pack));
 const html=balanceControls(c,derive(c,pack),pack);assert(html.includes('Recheck'));assert(html.includes('Balance mechanics'));assert(!html.includes('Take 10'));
});
