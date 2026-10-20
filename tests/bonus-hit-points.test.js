import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {grantBonusHP,toughAsDurasteelGrant,confirmToughAsDurasteel,recordBonusHPTrigger} from '../src/bonus-hit-points.js';
import {applyIncomingDamage,damageOutcome} from '../src/incoming-damage.js';
import {rollCombatRoutine} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {beginNextTurn,endCurrentTurn,endTrackedCombat} from '../src/action-engine.js';
import {newEncounter,newDay,restEightHours,receiveHealing} from '../src/recovery.js';
import {healthBars} from '../src/combat-ui.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const level=(id,extra={})=>({classId:'class:'+id,hpRoll:5,startingFeat:null,feats:[],talent:null,trainedSkills:[],abilityIncreases:[],...extra});
export function martial(levels=3){
 const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:16,dex:16,con:14,int:14,wis:14,cha:14};
 c.levels=Array.from({length:7},()=>level('soldier'));c.levels[0].hpRoll=null;c.levels[0].feats=[{id:'feat:martial-arts-i'},{id:'feat:melee-defense'}];c.levels[0].talent={id:'talent:melee-smash'};c.levels[2].feats=[{id:'feat:martial-arts-ii'}];c.levels[5].feats=[{id:'feat:echani-training'}];
 c.levels.push(...Array.from({length:levels},()=>level('martial-arts-master')));return c;
}
const attack=(c,{natural=12,damage=8,uid=c.id,count=1}={})=>{const result=rollCombatRoutine({name:'Hit',steps:[{attackId:uid,count,attackMod:0,damageMod:0}]},derive(c,pack),pack,expr=>{const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?natural+Number(m[1]):damage,d20:m?[natural]:[],display:expr,coeffs:[1]};});spendAttackResources(c,result);return result;};

test('bonus HP is a largest-only pool, legacy default zero, validated and not healing',()=>{
 const c=martial(),d=derive(c,pack);assert.equal(d.ctx.classLevels.get('class:martial-arts-master'),3);assert.equal(d.level,10);validateCharacter(c,pack);assert.doesNotThrow(()=>validatePack(pack));
 c.currentHP=0;c.condition=5;assert.deepEqual(grantBonusHP(c,10),{before:0,after:10});assert.deepEqual(grantBonusHP(c,5),{before:10,after:10});assert.deepEqual(grantBonusHP(c,15),{before:10,after:15});assert.equal(c.currentHP,0);assert.equal(c.condition,5);assert.equal(derive(c,pack).hp,d.hp);
 receiveHealing(c,derive(c,pack),pack,2);assert.equal(c.bonusHP,15);assert.equal(c.currentHP,2);
 for(const value of [-1,1.5,100001,NaN,'3']){assert.throws(()=>grantBonusHP(c,value));assert.throws(()=>validateCharacter({...c,bonusHP:value},pack));}delete c.bonusHP;assert.doesNotThrow(()=>validateCharacter(c,pack));
});
test('SR, DR, HP-only special damage reduction, bonus HP and HP resolve in order without lowering threshold',()=>{
 const c=martial();c.currentHP=40;c.protection={dr:2,drBypass:'',sr:5,srMax:5};c.bonusHP=10;const d={...derive(c,pack),threshold:10};
 const preview=damageOutcome(c,d,pack,22);assert.equal(c.bonusHP,10);assert.equal(preview.srBlocked,5);assert.equal(preview.drBlocked,2);assert.equal(preview.bonusHPBlocked,10);assert.equal(preview.hpDamage,5);assert.equal(preview.afterHP,35);assert.equal(preview.conditionSteps,1);
 const result=applyIncomingDamage(c,d,pack,22);assert.equal(c.bonusHP,0);assert.equal(c.currentHP,35);assert.equal(c.condition,1);assert.equal(result.bonusHPAfter,0);
 const s=martial();s.currentHP=40;s.bonusHP=10;const sd={...derive(s,pack),threshold:10};const stun=applyIncomingDamage(s,sd,pack,18,{type:'stun'});assert.equal(stun.bonusHPBlocked,9);assert.equal(stun.hpDamage,0);assert.equal(s.currentHP,40);assert.equal(s.bonusHP,1);assert.equal(stun.conditionSteps,2);
 s.condition=0;s.bonusHP=10;const ion=applyIncomingDamage(s,{...sd,threshold:1000},pack,8,{type:'ion'});assert.equal(ion.bonusHPBlocked,4);assert.equal(s.currentHP,40);
});
test('bonus HP preserves HP through a threshold hit, preserves droid stun immunity, and does not bypass death or FP survival',()=>{
 const c=martial();c.currentHP=1;c.bonusHP=30;const d={...derive(c,pack),threshold:10};const r=applyIncomingDamage(c,d,pack,20);assert(!r.dead);assert.equal(c.currentHP,1);assert.equal(c.condition,1);assert.equal(c.bonusHP,10);
 c.species='species:custom-droid';const before=structuredClone(c),immune=applyIncomingDamage(c,derive(c,pack),pack,100,{type:'stun'});assert(immune.immune);assert.equal(c.bonusHP,before.bonusHP);assert.equal(c.currentHP,before.currentHP);assert.equal(c.condition,before.condition);
 const z=martial();z.currentHP=1;z.bonusHP=3;const zd={...derive(z,pack),threshold:10};const survived=applyIncomingDamage(z,zd,pack,20,{spendForcePoint:true});assert.equal(survived.hpDamage,17);assert.equal(z.bonusHP,0);assert.equal(z.currentHP,0);assert(!survived.dead);assert.equal(survived.forcePointSpent,1);
});
test('Tough as Durasteel confirms actual damage once, applies prose/table and snapshots class level',()=>{
 const c=martial(),d=derive(c,pack);const r=attack(c);assert.equal(r.results[0].bonusHPOnDamage,3);assert.equal(c.bonusHP,undefined);assert.equal(toughAsDurasteelGrant(c,derive(c,pack),pack),3);
 c.houseRules={ambiguities:{'ambiguity:tough-as-durasteel-amount':'table'}};assert.equal(toughAsDurasteelGrant(c,derive(c,pack),pack),2);assert.deepEqual(confirmToughAsDurasteel(c,derive(c,pack),pack),{before:0,after:2,amount:2});assert.equal(c.bonusHPTrigger,undefined);assert.throws(()=>confirmToughAsDurasteel(c,derive(c,pack),pack),/qualifying/);
 c.houseRules.ambiguities={};attack(c,{count:2});c.levels.push(level('martial-arts-master'));assert.equal(toughAsDurasteelGrant(c,derive(c,pack),pack),3);confirmToughAsDurasteel(c,derive(c,pack),pack);assert.equal(c.bonusHP,3);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 assert.match(healthBars(c,derive(c,pack),pack),/data-field="bonusHP"/);assert.match(renderStatBlock(c,derive(c,pack),pack),/\(\+3 bonus HP\)/);
});
test('Tough as Durasteel requires class 2, unarmed damage, and light or no armor at the attack',()=>{
 const first=martial(1);attack(first);assert(!first.bonusHPTrigger);
 const c=martial();for(const armor of ['blast-helmet-and-vest','battle-armor']){c.inventory=[{id:'equipment:'+armor,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];attack(c);assert.equal(!!c.bonusHPTrigger,armor==='blast-helmet-and-vest');}
 c.inventory=[];attack(c,{natural:1});assert(!c.bonusHPTrigger);recordBonusHPTrigger(c,{results:[{bonusHPOnDamage:3,damage:0,naturalMiss:false}]});assert(!c.bonusHPTrigger);
 c.inventory=[{id:'equipment:knife',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];attack(c,{uid:c.inventory[0].uid});assert(!c.bonusHPTrigger);attack(c);assert(c.bonusHPTrigger);
 c.levels=c.levels.slice(0,8);assert.equal(toughAsDurasteelGrant(c,derive(c,pack),pack),0);
});
test('pool survives turns, but encounter/day/rest endings clear it; trigger cannot be replayed across turns',()=>{
 for(const reset of [newEncounter,c=>newDay(c,pack),endTrackedCombat,c=>restEightHours(c,derive(c,pack),pack)]){const c=martial();grantBonusHP(c,10);attack(c);reset(c);assert.equal(c.bonusHP,undefined);assert.equal(c.bonusHPTrigger,undefined);}
 for(const next of [startNextTurn,c=>beginNextTurn(c,pack)]){const c=martial();grantBonusHP(c,10);attack(c);next(c);assert.equal(c.bonusHP,10);assert.equal(c.bonusHPTrigger,undefined);}
 const c=martial();grantBonusHP(c,10);endCurrentTurn(c,pack);assert.equal(c.bonusHP,10);
});
test('invalid saved triggers are rejected and old saves do not create or refill a bonus pool',()=>{
 const c=martial();for(const t of [null,[],{classLevel:1},{classLevel:11},{classLevel:3,claimed:false}])assert.throws(()=>validateCharacter({...c,bonusHPTrigger:t},pack));
 applyIncomingDamage(c,derive(c,pack),pack,1);assert.equal(c.bonusHP,undefined);const x=JSON.parse(JSON.stringify(c));validateCharacter(x,pack);assert.equal(x.bonusHP,undefined);
});
