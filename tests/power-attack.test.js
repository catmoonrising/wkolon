import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {declarePowerAttack,startNextTurn,changeWeaponSetting} from '../src/attack-techniques.js';
import {rollRoutine} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {newEncounter,newDay,restEightHours} from '../src/recovery.js';
import {recoverSuite} from '../src/force-powers.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
function hero(){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:10,wis:10,cha:10};
 c.levels=Array.from({length:5},(_,i)=>({classId:'class:soldier',hpRoll:i?5:null,feats:i?[]:[{id:'feat:power-attack'},{id:'feat:weapon-proficiency-advanced-melee-weapons'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));
 c.inventory=[item('mace'),item('knife',{twoHanded:true}),item('vibro-axe'),item('blaster-rifle',{shotsRemaining:10})];return c;
}
const routine=(...steps)=>({name:'Power Attack',steps:steps.map(([attackId,count=1])=>({attackId,count,attackMod:0,damageMod:0}))});
const roller=(expressions=[],natural=12)=>expr=>{expressions.push(expr);return {value:expr.startsWith('1d20')?natural:10,d20:expr.startsWith('1d20')?[natural]:[],display:expr,coeffs:[1]};};

test('Power Attack pins exact exclusions, hands and duration, and rejects unsupported mappings/saved state',()=>{
 validatePack(pack);const c=hero();declarePowerAttack(c,derive(c,pack),3);c.inventory[0].targetKind='object';c.unarmedModifiers={attackMod:0,damageMod:0,targetKind:'vehicle'};validateCharacter(c,pack);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 const feat=pack.feats.find(f=>f.id==='feat:power-attack'),src=pack.sources.find(s=>s.id===feat.sourceId);assert.equal(src.revision,18412);assert.match(articleText(feat.article),/against an object or Vehicle/);
 const sizes=pack.rulePages.find(r=>r.id==='rule:weapon-sizes');assert.match(articleText(sizes.article),/requires two hands/);assert.equal(pack.sources.find(s=>s.id===sizes.sourceId).revision,6153);
 for(const mutate of [c=>c.powerAttack=-1,c=>c.powerAttack=1.5,c=>c.powerAttack=21,c=>c.powerAttack='3',c=>c.inventory[0].targetKind='invented',c=>c.unarmedModifiers.targetKind='invented']){const bad=structuredClone(c);mutate(bad);assert.throws(()=>validateCharacter(bad,pack),/Power Attack|target|unarmed/);}
 for(const mutate of [p=>p.rules.powerAttack.twoHandedMultiplier=3,p=>p.rules.powerAttack.excludedDamageTargets=[],p=>p.rules.weaponSettings.autofireOnlyStun=false]){const bad=structuredClone(pack);mutate(bad);assert.throws(()=>validatePack(bad),/Power Attack|settings/);}
});

test('Power Attack affects all melee attacks including unarmed, never ranged, and doubles for required or chosen two hands',()=>{
 const c=hero(),before=derive(c,pack).attacks;declarePowerAttack(c,derive(c,pack),3);let after=derive(c,pack).attacks;
 assert.deepEqual(after.map((a,i)=>a.attack-before[i].attack),[-3,-3,-3,0,-3]);assert.deepEqual(after.map((a,i)=>a.damageBonus-before[i].damageBonus),[3,3,6,0,3]);
 c.inventory[0].twoHanded=true;after=derive(c,pack).attacks;assert.equal(after[0].powerAttack.damage,6);assert.equal(after[0].damageBonus-before[0].damageBonus,8,'Two hands also doubles positive Strength for a one-handed melee weapon');
 assert.equal(after[1].powerAttack.damage,3,'A Light weapon held in two hands does not become a One-Handed or Two-Handed weapon');
 assert.equal(before[2].damageBonus,6,'A Large melee weapon requires two hands for this Medium wielder');
 c.inventory=[item('spear',{twoHanded:true,attackStyle:'thrown'})];assert.equal(derive(c,pack).attacks[0].powerAttack.damage,0,'A thrown melee weapon makes a ranged attack');validateCharacter(c,pack);
});

test('object and vehicle damage exclusions retain the attack penalty, including for unarmed and droid targets',()=>{
 const c=hero();declarePowerAttack(c,derive(c,pack),5);
 c.inventory[0].twoHanded=true;c.inventory[0].targetKind='object';c.inventory[2].targetKind='vehicle';c.unarmedModifiers={attackMod:0,damageMod:0,targetKind:'vehicle'};
 const a=derive(c,pack).attacks;assert.deepEqual(a.map(a=>a.powerAttack.damage),[0,5,0,0,0]);assert.deepEqual(a.map(a=>a.powerAttack.penalty),[-5,-5,-5,0,-5]);
 c.inventory[0].targetKind='creature';assert.equal(derive(c,pack).attacks[0].powerAttack.damage,10,'Creature includes droids; electronic status is not an excluded target');
});

test('Power Attack persists through every routine attack, miss and critical until the next turn',()=>{
 const c=hero();declarePowerAttack(c,derive(c,pack),3);const a=derive(c,pack).attacks,expressions=[];
 const result=rollRoutine(routine([a[0].uid,2],[a[3].uid],[a[4].uid]),a,pack.rules.combat,roller(expressions,20));assert.equal(result.results.length,4);assert(expressions[1].includes(a[0].damageDisplay));assert(expressions[3].includes(a[0].damageDisplay));assert(result.results.every(r=>r.critical));spendAttackResources(c,result);assert.equal(c.powerAttack,3);
 const miss=rollRoutine(routine([a[0].uid]),derive(c,pack).attacks,pack.rules.combat,roller([],1));spendAttackResources(c,miss);assert.equal(c.powerAttack,3);
 c.mightySwing=true;c.inventory[3].braced=true;startNextTurn(c);assert.equal(c.powerAttack,0);assert(!c.mightySwing);assert(!c.inventory[3].braced);
});

test('invalid declarations, missing feats/BAB changes and ammunition failures cannot silently grant Power Attack',()=>{
 const c=hero();for(const amount of [-1,1.5,6,NaN]){const before=structuredClone(c);assert.throws(()=>declarePowerAttack(c,derive(c,pack),amount),/Power Attack/);assert.deepEqual(c,before);}
 declarePowerAttack(c,derive(c,pack),5);c.inventory[3].shotsRemaining=0;const before=structuredClone(c),a=derive(c,pack).attacks;assert.throws(()=>rollRoutine(routine([a[0].uid],[a[3].uid]),a,pack.rules.combat,()=>assert.fail('Preflight before dice')),/shot/);assert.deepEqual(c,before);
 c.levels=c.levels.slice(0,1);let d=derive(c,pack);assert(!d.attacks[0].available);assert.match(d.attacks[0].issue,/base attack/);assert.equal(d.attacks[0].powerAttack.damage,0);validateCharacter(c,pack);startNextTurn(c);
 c.levels[0].feats=[];assert.throws(()=>declarePowerAttack(c,derive(c,pack),1),/unavailable/);c.powerAttack=1;assert(!derive(c,pack).attacks[0].available);assert.match(derive(c,pack).attacks[0].issue,/Requires Power Attack/);
});

test('encounters, days and completed rest clear Power Attack; end-of-turn Force recovery leaves its duration intact',()=>{
 for(const reset of [c=>newEncounter(c),c=>newDay(c,pack),c=>restEightHours(c,derive(c,pack),pack),c=>recoverSuite(c,derive(c,pack))]){const c=hero();declarePowerAttack(c,derive(c,pack),3);reset(c);assert.equal(c.powerAttack,0);}
 const c=hero();declarePowerAttack(c,derive(c,pack),3);c.forcePowerRecoveryPending=true;recoverSuite(c,derive(c,pack),{endTurn:true});assert.equal(c.powerAttack,3);
});

test('switchable Stun/Autofire changes select one setting; old incompatible saves stay importable but cannot attack',()=>{
 const c=hero(),e=c.inventory[3];e.fireMode='autofire';e.attackTechnique='burst-fire';changeWeaponSetting(e,pack,'damageSetting','stun');assert.equal(e.fireMode,'single');assert.equal(e.attackTechnique,'normal');assert.equal(e.damageSetting,'stun');assert(derive(c,pack).attacks[3].available);
 changeWeaponSetting(e,pack,'fireMode','autofire');assert.equal(e.damageSetting,'normal');assert.equal(e.fireMode,'autofire');assert(!e.attackTechnique);
 e.damageSetting='stun';validateCharacter(c,pack);let a=derive(c,pack).attacks[3];assert(!a.available);assert.match(a.issue,/Stun and Autofire/);assert.throws(()=>rollRoutine(routine([a.uid]),[a],pack.rules.combat,()=>assert.fail('No dice')),/Stun and Autofire/);
 c.levels[1].feats=[{id:'feat:weapon-proficiency-heavy-weapons'}];c.levels[2].feats=[{id:'feat:burst-fire'}];e.attackTechnique='burst-fire';a=derive(c,pack).attacks[3];assert(!a.available);assert(!a.technique.choices.find(t=>t.id==='burst-fire').available);
 const before=structuredClone(e);assert.throws(()=>changeWeaponSetting(e,pack,'fireMode','invented'),/setting/);assert.deepEqual(e,before);
 const passage=pack.rulePages.find(r=>r.id==='rule:weapon-settings');assert.match(articleText(passage.article),/only be on one alternate setting/);
});

test('the explicit autofire-only Stun exception remains legal and retains Stun range, area and ammunition',()=>{
 const fixture=structuredClone(pack),w=fixture.equipment.find(w=>w.id==='equipment:heavy-repeating-blaster');w.stunDamage=w.damage;w.stunRange=6;
 const c=hero();c.levels[0].feats.push({id:'feat:weapon-proficiency-heavy-weapons'});c.inventory=[item('heavy-repeating-blaster',{damageSetting:'stun',shotsRemaining:20,distance:6})];validateCharacter(c,fixture);
 let a=derive(c,fixture).attacks[0];assert(a.available);assert.equal(a.damageEffect,'stun');assert.equal(a.areaType,'burst');assert.equal(a.ammunition.cost,10);assert.deepEqual(a.range.limits,[6,6,6,6]);c.inventory[0].distance=7;assert(!derive(c,fixture).attacks[0].available);
});
