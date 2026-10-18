import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {damageOutcome} from '../src/incoming-damage.js';
import {startRage,advanceRage,loseLimb} from '../src/recovery.js';
import {createRecoveryControls} from '../src/recovery-ui.js';
import {validatePack} from '../tools/validate-rules.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const record=id=>pack.species.find(r=>r.id==='species:'+id);
function hero(id,cls='soldier'){const c=newCharacter(pack,{classId:'class:'+cls});c.species='species:'+id;c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};validateCharacter(c,pack);return c;}
const load=(c,weight)=>{const r=pack.equipment.find(r=>r.kind==='gear'&&r.weight>0);c.inventory=[{id:r.id,uid:crypto.randomUUID(),quantity:Math.ceil(weight/r.weight),carried:true,equipped:false,twoHanded:false,attackMod:0,damageMod:0}];};
test('fixed modifiers follow numeric rules without treating descriptive ability mentions as modifiers',()=>{
 assert.deepEqual(record('gand').abilityAdjustments,{wis:2,cha:-2});assert.deepEqual(record('lugubraa').abilityAdjustments,{str:2,con:2,dex:-2,wis:-2});assert.deepEqual(record('massassi').abilityAdjustments,{str:4,int:-2,wis:-2,cha:-2});
 const d=derive(hero('gen-dai'),pack);assert.deepEqual(d.scores,{str:10,dex:10,con:14,int:10,wis:8,cha:8});assert.equal(d.size,'large');assert.equal(d.speed,8);assert.equal(d.threshold,20);
 assert.deepEqual(record('chiss').languages,['Cheunh']);assert.equal(record('chiss').bonusSkills,1);assert(derive(hero('chiss'),pack).issues.some(t=>t.includes('choose 5 starting trained skills')));
 assert.deepEqual(record('ubese').languages,['Basic','Ubese','Ubeninal']);assert.deepEqual(record('skakoan').languages,['Skakoverbal (spoken)','Skakoform (written)','Basic']);
 assert.equal(record('sorcerer-of-rhand').bonusForceTraining.requiredDescriptor,'dark-side');
});
test('innate DR protects incoming damage, combines by maximum and retains ordinary bypass handling',()=>{
 for(const id of ['chistori','givin','nautolan']){
  const c=hero(id),d=derive(c,pack);assert.equal(d.speciesDR,2);assert.equal(d.normalProtection.dr,2);assert.equal(d.classDR,0);
  assert.equal(damageOutcome(c,d,pack,6).hpDamage,4);assert.equal(damageOutcome(c,d,pack,6,{lightsaber:true}).hpDamage,6);assert.equal(damageOutcome(c,d,pack,6,{ignoreDR:true}).hpDamage,6);
  c.protection.dr=5;assert.equal(damageOutcome(c,derive(c,pack),pack,6).hpDamage,1);
 }
 const c=hero('stereb'),d=derive(c,pack);assert.equal(d.defenses.fortitude,16);assert.equal(d.threshold,21);assert.equal(record('stereb').conditionalFocus,null,'Stone-only focus is not unconditional');
});
test('native flight, swimming and absent ground movement retain their separate load and speed rules',()=>{
 const c=hero('celegian','scout');let d=derive(c,pack);assert.equal(d.speed,0);assert.deepEqual(d.speeds,{fly:6,swim:10});
 c.levels[0].talent={id:'talent:long-stride'};d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:long-stride'));assert.equal(d.speed,0);assert.deepEqual(d.speeds,{fly:8,swim:12});
 load(c,26);d=derive(c,pack);assert(d.load.heavy);assert.equal(d.speed,0);assert.equal(d.speeds.fly,0);assert.equal(d.speeds.swim,9);
 load(c,51);d=derive(c,pack);assert(d.load.overloaded);assert.equal(d.speed,0);assert.equal(d.speeds.fly,0);assert.equal(d.speeds.swim,1);
 const t=hero('toydarian');assert.equal(derive(t,pack).speeds.fly,6);load(t,40);assert.equal(derive(t,pack).speeds.fly,0);
});
test('printed starting feats and conditional Focus are available without granting unrestricted extras',()=>{
 for(const [id,feat]of [['draethos','weapon-proficiency-advanced-melee-weapons'],['ebruchi','improved-damage-threshold'],['felucian','force-sensitivity'],['lugubraa','improved-damage-threshold'],['skakoan','armor-proficiency-light'],['vahla','force-sensitivity'],['zygerrian','martial-arts-i']]){
  const c=hero(id),d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:'+feat&&f.automatic),id);assert.equal(record(id).bonusFeats,0);
 }
 const f=hero('felucian');f.trainedSkills=['skill:use-the-force'];let d=derive(f,pack);assert(d.ctx.trained.has('skill:use-the-force'));assert(!d.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-pistols'));
 const w=hero('weequay');d=derive(w,pack);assert(!d.ctx.feats.some(f=>f.id==='feat:skill-focus'));w.trainedSkills=['skill:endurance'];d=derive(w,pack);assert(d.ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:endurance'));assert.equal(d.skills.find(s=>s.id==='skill:endurance').focus,5);
});
test('published Rage reuses its action, bonuses, daily limit, duration and persistent condition',()=>{
 for(const id of ['chistori','mantellian-savrip']){
  const c=hero(id),before=derive(c,pack),turns=before.recovery.rage.duration;startRage(c,before);let d=derive(c,pack);
  assert.equal(d.attacks.find(a=>a.unarmed).attack,before.attacks.find(a=>a.unarmed).attack+2);assert.equal(d.attacks.find(a=>a.unarmed).damageBonus,before.attacks.find(a=>a.unarmed).damageBonus+2);assert(!d.skills.find(s=>s.id==='skill:mechanics').available);
  for(let i=0;i<turns;i++)advanceRage(c);d=derive(c,pack);assert.equal(c.condition,1);assert(d.recovery.persistent.includes('rage'));assert.equal(d.recovery.rage.remaining,0);
 }
});
test('Gand regeneration uses Gand rules while preserving the existing Trandoshan source',()=>{
 for(const [id,rule]of [['gand','rule:gand'],['trandoshan','rule:trandoshan-limb-regeneration']]){
  const c=hero(id);loseLimb(c,pack,'Arm',()=>({value:4,display:'4'}));assert.equal(derive(c,pack).recovery.limbs[0].days,4);
  const html=createRecoveryControls(pack,{current:()=>c,derived:()=>derive(c,pack)}).species();assert(html.includes('data-rule-page="'+rule+'"'));if(id==='gand')assert(!html.includes('Trandoshan'));
 }
 assert(articleText(record('lugubraa').article).includes('maximum Intelligence score of 8'));assert(articleText(record('gen-dai').article).includes('but not for any other purpose'));
});
test('new species scalar and load fields reject unsupported values',()=>{
 for(const [key,value]of [['damageReduction',-1],['damageThresholdBonus',0.5],['flightHeavyLoadForbidden','yes']]){const p=structuredClone(pack);p.species.find(r=>r.id==='species:celegian')[key]=value;assert.throws(()=>validatePack(p));}
});
