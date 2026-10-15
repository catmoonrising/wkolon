import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollRoutine,routineIssue} from '../src/combat.js';
import {spendAttackResources,reloadWeapon} from '../src/ammunition.js';
import {articleText} from '../src/wiki-content.js';
import {newEncounter,restEightHours} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,more={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...more});
export function hero(abilities={}){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:13,dex:13,con:10,int:10,wis:10,cha:10,...abilities};
 const feats={0:['weapon-proficiency-heavy-weapons','burst-fire'],1:['rapid-shot'],2:['rapid-strike'],3:['mighty-swing'],5:['point-blank-shot','precise-shot'],7:['careful-shot'],8:['deadeye']};
 c.levels=Array.from({length:9},(_,i)=>({classId:'class:soldier',hpRoll:i?5:null,feats:(feats[i]||[]).map(id=>({id:'feat:'+id})),talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));return c;
}
const routine=(...steps)=>({name:'Techniques',steps:steps.map(([attackId,count=1])=>({attackId,count,attackMod:0,damageMod:0}))});
const roll=(expressions=[],natural=12)=>expr=>{expressions.push(expr);return {value:expr.startsWith('1d20')?natural:10,d20:expr.startsWith('1d20')?[natural]:[],display:expr,coeffs:[1]};};

test('reviewed technique mappings are pinned and closed, while invalid saved actions fail validation',()=>{
 validatePack(pack);assert.deepEqual(pack.rules.attackTechniques.map(t=>[t.id,t.shots]),[['burst-fire',5],['rapid-shot',2],['rapid-strike',0],['improved-rapid-strike',0]]);
 const c=hero();c.inventory=[item('blaster-rifle',{attackTechnique:'rapid-shot'})];c.unarmedModifiers={attackMod:0,damageMod:0,attackTechnique:'rapid-strike'};c.mightySwing=true;validateCharacter(c,pack);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 for(const mutate of [c=>c.inventory[0].attackTechnique='invented',c=>c.inventory[0].id='equipment:utility-belt-empty',c=>c.unarmedModifiers.attackTechnique='rapid-shot',c=>c.mightySwing='yes']){const bad=structuredClone(c);mutate(bad);assert.throws(()=>validateCharacter(bad,pack),/technique|Mighty/);}
 const bad=structuredClone(pack);bad.rules.attackTechniques[0].shots=1;assert.throws(()=>validatePack(bad),/technique/);
});

test('Burst Fire replaces the area attack with a critical-capable single target and exactly five shots',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:10,fireMode:'autofire'})];let a=derive(c,pack).attacks[0];assert.equal(a.areaType,'burst');const before=a.attack;
 c.inventory[0].attackTechnique='burst-fire';a=derive(c,pack).attacks[0];assert.equal(a.areaType,null);assert.equal(a.damage,'5d8');assert.equal(a.attack,before);assert.equal(a.ammunition.cost,5);
 const result=rollRoutine(routine([a.uid,2]),[a],pack.rules.combat,roll([],20));assert(result.results.every(r=>r.critical&&!r.areaType));assert.equal(result.ammunitionSpent[0].shots,10);spendAttackResources(c,result);assert.equal(c.inventory[0].shotsRemaining,0);
 c.abilities.str=12;a=derive(c,pack).attacks[0];assert.equal(a.attack,before-5);c.inventory[0].shotsRemaining=4;a=derive(c,pack).attacks[0];assert(!a.available);assert(routineIssue(routine([a.uid]),[a]).includes('needs 5 shots'));
});

test('Rapid Shot uses the Strength penalty, permits Aim, and does not stack dice with Deadeye',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:4,aimed:true,attackTechnique:'rapid-shot',distance:6})];let a=derive(c,pack).attacks[0];assert(a.aimed);assert.equal(a.damage,'4d8');assert.equal(a.ammunition.cost,2);assert.equal(a.unAimed.damage,'4d8');const before=a.attack;
 const expressions=[],result=rollRoutine(routine([a.uid,2]),[a],pack.rules.combat,roll(expressions));assert.deepEqual(result.results.map(r=>r.aimed),[true,false]);assert(expressions[1].startsWith('4d8')&&expressions[3].startsWith('4d8'));assert.equal(result.ammunitionSpent[0].shots,4);
 c.abilities.str=12;assert.equal(derive(c,pack).attacks[0].attack,before-3);
 c.inventory[0].attackTechnique='burst-fire';a=derive(c,pack).attacks[0];assert(a.aimed);assert.equal(a.damage,'5d8');assert.equal(a.unAimed.damage,'5d8');assert.equal(a.areaType,null);
});

test('Rapid Strike uses Dexterity, exempts Light weapons and Counseling-enabled unarmed attacks',()=>{
 const c=hero({dex:12});c.inventory=[item('mace',{attackTechnique:'rapid-strike'}),item('knife',{attackTechnique:'rapid-strike'})];c.unarmedModifiers={attackMod:0,damageMod:0,attackTechnique:'rapid-strike'};
 let attacks=derive(c,pack).attacks;assert.equal(attacks[0].technique.penalty,-5);assert.equal(attacks[1].technique.penalty,-2);assert.equal(attacks[2].technique.penalty,-2);assert.equal(attacks[0].damage,'2d8');assert.equal(attacks[2].damage,'2d4');assert(attacks.every(a=>a.available));
 c.houseRules={jediCounseling:{'jc:112-unarmed-attacks-and-weapon-finesse':false}};assert.equal(derive(c,pack).attacks[2].technique.penalty,-5);validateCharacter(c,pack);
});

test('unavailable techniques cannot roll or silently grant benefits after feat/proficiency or weapon changes',()=>{
 const c=hero();c.inventory=[item('heavy-repeating-blaster',{attackTechnique:'rapid-shot',shotsRemaining:20})];let a=derive(c,pack).attacks[0];assert(!a.available);assert.match(a.issue,/single-target/);assert.throws(()=>rollRoutine(routine([a.uid]),[a],pack.rules.combat,()=>assert.fail('Preflight before dice')),/single-target/);
 c.inventory=[item('lightsaber',{attackTechnique:'rapid-strike'})];a=derive(c,pack).attacks[0];assert(!a.available);assert.match(a.issue,/proficiency/);
 c.inventory=[item('blaster-rifle',{attackTechnique:'rapid-shot'})];c.levels[1].feats=[];a=derive(c,pack).attacks[0];assert(!a.available);assert.match(a.issue,/Requires Rapid Shot/);
});

test('Mighty Swing benefits only the next melee attack, survives preceding ranged attacks, and does not stack with Rapid Strike',()=>{
 const c=hero();c.inventory=[item('blaster-rifle'),item('knife'),item('vibroblade')];c.mightySwing=true;
 const attacks=derive(c,pack).attacks,expressions=[];assert.equal(attacks[1].damage,'2d4');assert.equal(attacks[2].damage,'3d6');const result=rollRoutine(routine([attacks[0].uid],[attacks[1].uid],[attacks[2].uid]),attacks,pack.rules.combat,roll(expressions));assert.deepEqual(result.results.map(r=>r.mightySwing),[false,true,false]);assert(expressions[3].startsWith('2d4'));assert(expressions[5].startsWith('2d6'));assert(result.mightySwingConsumed);assert(c.mightySwing);spendAttackResources(c,result);assert(!c.mightySwing);
 c.mightySwing=true;c.inventory[1].attackTechnique='rapid-strike';let a=derive(c,pack).attacks[1];assert.equal(a.damage,'2d4');assert.equal(a.unSwing.damage,'2d4');const miss=rollRoutine(routine([a.uid]),[a],pack.rules.combat,roll([],1));assert(miss.mightySwingConsumed);spendAttackResources(c,miss);assert(!c.mightySwing);
 c.mightySwing=true;const rangedOnly=rollRoutine(routine([attacks[0].uid]),derive(c,pack).attacks,pack.rules.combat,roll());spendAttackResources(c,rangedOnly);assert(c.mightySwing);newEncounter(c);assert(!c.mightySwing);
});

test('aggregate technique ammo failures preserve Aim/Mighty Swing; rest cannot mutate unavailable actions',()=>{
 const c=hero();c.inventory=[item('blaster-rifle',{shotsRemaining:3,aimed:true,attackTechnique:'rapid-shot'})];c.mightySwing=true;const before=structuredClone(c);assert.throws(()=>rollRoutine(routine([c.inventory[0].uid,2]),derive(c,pack).attacks,pack.rules.combat,()=>assert.fail('No dice')),/needs 4 shots/);assert.deepEqual(c,before);
 const dead=derive(c,pack);dead.recovery.naturalHealing.available=false;assert.throws(()=>restEightHours(c,dead,pack),/unavailable/);assert.deepEqual(c,before);
});

test('Bow Rapid Shot uses explicitly supplied Free reloads without inventing arrows or allowing flat-footed Free Actions',()=>{
 const c=hero();c.inventory=[item('bow',{shotsRemaining:1,attackTechnique:'rapid-shot'})];let a=derive(c,pack).attacks[0];assert(!a.available);assert.match(a.issue,/Free reloads/);
 c.inventory[0].freeReloads=true;a=derive(c,pack).attacks[0];assert(a.available);assert.equal(a.damage,'2d6');const result=rollRoutine(routine([a.uid,2]),[a],pack.rules.combat,roll([],1));assert.deepEqual(result.ammunitionSpent,[{uid:a.uid,shots:4,reloadShots:3}]);assert(result.html.includes('Free reloads'));spendAttackResources(c,result);assert.equal(c.inventory[0].shotsRemaining,0);assert.equal(c.inventory.length,1);assert.equal(c.credits,0);
 c.flatFooted=true;a=derive(c,pack).attacks[0];assert(!a.available);assert(!a.ammunition.freeReloads);const before=structuredClone(c);assert.throws(()=>reloadWeapon(c,pack,a.uid),/flat-footed/);assert.throws(()=>spendAttackResources(c,result),/changed/);assert.deepEqual(c,before);
 c.flatFooted=false;c.inventory[0].shotsRemaining=1;const changed=structuredClone(c);changed.inventory[0].freeReloads=false;assert.throws(()=>spendAttackResources(changed,result),/changed/);assert.equal(changed.inventory[0].shotsRemaining,1);
 c.inventory[0].shotsRemaining=undefined;delete c.inventory[0].freeReloads;assert(!derive(c,pack).attacks[0].available,'Untracked ammo does not bypass one-arrow capacity');validateCharacter(c,pack);
 const text=articleText(pack.rulePages.find(r=>r.id==='rule:free-actions').article);assert(text.includes("You can't take Free Actions"));assert(!text.includes("Variant Rule: Free Actions Aren't Free"));
 const bad=hero();bad.inventory=[item('blaster-rifle',{freeReloads:true})];assert.throws(()=>validateCharacter(bad,pack),/free reloads/);
});
