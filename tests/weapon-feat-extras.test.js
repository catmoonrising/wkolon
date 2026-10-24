import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {planFullAttack} from '../src/full-attacks.js';
import {rollCombatRoutine} from '../src/combat.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,distance:1});
function hunter(){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:10,wis:14,cha:10};c.levels[0].feats=[{id:'feat:sport-hunter'},{id:'feat:point-blank-shot'}];for(let n=2;n<=4;n++)c.levels.push({classId:'class:soldier',hpRoll:5,feats:[{id:'feat:'+({2:'precise-shot',3:'rapid-shot',4:'deadeye'}[n])}],talent:null,startingFeat:null,abilityIncreases:n===4?['str','dex']:[],trainedSkills:[]});c.inventory=[item('slugthrower-pistol')];validateCharacter(c,pack);return c;}
const attack=c=>derive(c,pack).attacks.find(a=>a.uid===c.inventory[0].uid);
test('extra weapon feat clauses remain source-pinned and use closed exact-weapon effects',()=>{
 validatePack(pack);for(const id of ['riflemaster','sport-hunter'])assert.equal(pack.feats.find(f=>f.id==='feat:'+id).automation,'partial');for(const change of [p=>p.feats.find(f=>f.id==='feat:riflemaster').effects.at(-1).size='small',p=>p.feats.find(f=>f.id==='feat:sport-hunter').effects.at(-1).pointBlankDice=2]){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
});
test('Sport Hunter adds one die only to proficient Slugthrower Pistol attacks within actual Point-Blank Range',()=>{
 const c=hunter();assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:sport-hunter'));assert.equal(attack(c).damage,'3d6');c.inventory[0].distance=20;assert.equal(attack(c).damage,'3d6');c.inventory[0].distance=21;assert.equal(attack(c).damage,'2d6');c.inventory[0].id='equipment:blaster-pistol';c.inventory[0].distance=1;assert.equal(attack(c).damage,'3d6','another Pistol keeps its printed damage');c.inventory[0].id='equipment:slugthrower-rifle';assert.equal(attack(c).damage,'2d12','the Rifle die change gains no Pistol extra die');
});
test('Sport Hunter stacks independently while Rapid Shot and Deadeye still exclude each other',()=>{
 const c=hunter(),e=c.inventory[0];e.attackTechnique='rapid-shot';assert.equal(attack(c).damage,'4d6');e.aimed=true;let a=attack(c);assert.equal(a.damage,'4d6');assert.equal(a.unAimed.damage,'4d6');e.attackTechnique='normal';a=attack(c);assert.equal(a.damage,'4d6');assert.equal(a.unAimed.damage,'3d6');e.aimed=false;assert.equal(attack(c).damage,'3d6');e.distance=21;e.aimed=true;assert.equal(attack(c).damage,'3d6');
});
test('a routine keeps Sport Hunter on its later un-Aimed attack without reusing Deadeye',()=>{
 const c=hunter();c.inventory[0].aimed=true;const calls=[],roll=expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return{value:m?12+Number(m[1]):12,d20:m?[12]:[],display:expr,coeffs:[1]};};rollCombatRoutine({name:'Two shots',steps:[{attackId:c.inventory[0].uid,count:2,attackMod:0,damageMod:0}]},derive(c,pack),pack,roll);assert.equal(calls.filter(s=>s.startsWith('4d6')).length,1);assert.equal(calls.filter(s=>s.startsWith('3d6')).length,1);
});
test('Riflemaster effective size reaches the real Full Attack grip planner without changing the catalog or the grip declaration',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'});c.levels[0].feats=[{id:'feat:riflemaster'}];c.inventory=[{...item('light-repeating-blaster'),oneHanded:true},item('blaster-pistol')];validateCharacter(c,pack);const r={kind:'fullAttack',steps:c.inventory.map((e,i)=>({id:crypto.randomUUID(),source:i?'twoWeapons':'base',attackId:e.uid,count:1,attackMod:0,damageMod:0}))};let d=derive(c,pack);assert.equal(d.attacks[0].size,'medium');assert.equal(pack.equipment.find(e=>e.id==='equipment:light-repeating-blaster').size,'large');assert.equal(planFullAttack(r,d,pack).penalty,-10);c.inventory[0].oneHanded=false;assert.throws(()=>planFullAttack(r,derive(c,pack),pack),/one-handed/);c.inventory[0].oneHanded=true;c.levels[0].feats=[];d=derive(c,pack);assert.equal(d.attacks[0].size,'large');assert.throws(()=>planFullAttack(r,d,pack),/one-handed/);
});
test('Sport Hunter eligibility through Rifle proficiency does not grant its Pistol benefit without Pistol proficiency',()=>{
 const c=newCharacter(pack,{classId:'class:jedi'});c.levels[0].feats=[{id:'feat:weapon-proficiency-rifles'},{id:'feat:sport-hunter'}];c.inventory=[item('slugthrower-pistol')];validateCharacter(c,pack);assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:sport-hunter'));assert.equal(attack(c).proficient,false);assert.equal(attack(c).damage,'2d6');
});
