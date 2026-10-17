import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack,eligible,classSkills} from '../src/rules.js';
import {chooseSpeciesOption,speciesChoiceDetails} from '../src/species-choices.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {startRage,advanceRage} from '../src/recovery.js';
import {damageOutcome} from '../src/incoming-damage.js';
import {armorPenalty} from '../src/armor.js';
import {createSpeciesChecks} from '../src/species-rules.js';
import {validatePack} from '../tools/validate-rules.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const hero=(species,cls='noble')=>{const c=newCharacter(pack,{classId:'class:'+cls});Object.assign(c,{species:'species:'+species,abilityMethod:'manual',abilities:{str:10,dex:10,con:10,int:10,wis:10,cha:10},trainedSkills:[]});c.levels[0].feats=[];c.levels[0].talent=null;return c;};
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const focus=d=>d.ctx.feats.filter(f=>f.id==='feat:weapon-focus');
const details=(c,d)=>speciesChoiceDetails(c,pack,d.ctx,d.rows[0].ctx)[0];

test('Force blindness restrictions are distinct from immunity and differ between Rakata and Ssi-Ruu',()=>{
 for(const id of ['rakata','ssi-ruu']){
  const c=hero(id,'jedi');c.forcePoints=99;c.darkSideScore=3;c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-sensitivity'}];const d=derive(c,pack);
  assert(!d.ctx.feats.some(f=>f.id==='feat:force-sensitivity'));assert(!eligible(ix.feats.get('feat:force-sensitivity'),{id:'feat:force-sensitivity'},d.ctx,ix,'feats'));assert(!d.skills.find(s=>s.id==='skill:use-the-force').available);assert(!d.ctx.forceImmune);assert(!ix.species.get(c.species).forceImmune);assert.equal(c.darkSideScore,3);
  const damage=damageOutcome(c,d,pack,2,{requiresUseTheForce:true});assert.equal(damage.hpDamage,2);assert(!damage.immune);
  if(id==='rakata'){assert(d.forceMaximum>0);assert.equal(d.forceCurrent,99);assert(!d.forcePointsForbidden);}else{assert.equal(d.forceMaximum,0);assert.equal(d.forceCurrent,0);assert(d.forcePointsForbidden);assert(!classSkills(d.ctx,ix).has('skill:use-the-force'));assert(!damageOutcome(c,d,pack,100).canSurvive);}
  validateCharacter(c,pack);
 }
});

test('Ancient Knowledge changes only nonproficiency penalties, with real zero for Light Armor',()=>{
 const r=hero('rakata'),h=hero('human');r.inventory=[item('heavy-blaster-rifle')];h.inventory=[item('heavy-blaster-rifle')];let rd=derive(r,pack),hd=derive(h,pack);assert.equal(rd.attacks.find(a=>a.id==='equipment:heavy-blaster-rifle').attack,hd.attacks.find(a=>a.id==='equipment:heavy-blaster-rifle').attack+3);
 for(const [category,expected]of [['light',0],['medium',-2],['heavy',-5]]){
  const armor=pack.equipment.find(r=>r.kind==='armor'&&r.category===category);assert.equal(armorPenalty([armor],rd.ctx,pack,{}),expected);assert.equal(armorPenalty([armor],rd.ctx,pack,{},true),expected);assert.equal(armorPenalty([armor],rd.ctx,pack,{},false,-10),expected-10,'separate shield restrictions are unchanged');
 }
 r.levels[0].feats=[{id:'feat:weapon-proficiency-rifles'}];rd=derive(r,pack);assert(rd.attacks.find(a=>a.id==='equipment:heavy-blaster-rifle').proficient);assert(rd.attacks.find(a=>a.id==='equipment:heavy-blaster-rifle').breakdown.includes('0 proficiency'));
 const ctx={...rd.ctx,feats:[...rd.ctx.feats,{id:'feat:armor-proficiency-heavy'}]};assert.equal(armorPenalty([pack.equipment.find(r=>r.kind==='armor'&&r.category==='heavy')],ctx,pack,{}),0);
});

test('Rakata Primitive affects starting proficiencies, while rage retains its real duration and aftermath',()=>{
 const c=hero('rakata','soldier');let d=derive(c,pack);for(const id of ['pistols','rifles','heavy-weapons'])assert(!d.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-'+id));assert(d.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-simple-weapons'));
 c.levels[0].feats=[{id:'feat:weapon-proficiency-rifles'}];assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:weapon-proficiency-rifles'));c.levels[0].feats=[];
 startRage(c,d);d=derive(c,pack);assert.equal(d.recovery.rage.remaining,0);assert.equal(d.recovery.rage.rounds,5);assert(!d.skills.find(s=>s.id==='skill:mechanics').available);
 for(let i=0;i<5;i++)advanceRage(c);d=derive(c,pack);assert.equal(c.condition,1);assert(d.recovery.persistent.includes('rage'));
});

test('Rakata bonus Weapon Focus uses a saved eligible choice without consuming a feat slot',()=>{
 const c=hero('rakata','soldier');c.inventory=[item('knife')];let d=derive(c,pack);assert(details(c,d).issue);const base=d.attacks.find(a=>a.id==='equipment:knife').attack;
 chooseSpeciesOption(c,pack,'weapon-focus','simple-weapons');d=derive(c,pack);assert.equal(focus(d).length,1);assert.equal(focus(d)[0].choice,'simple-weapons');assert(focus(d)[0].automatic);assert.equal(d.attacks.find(a=>a.id==='equipment:knife').attack,base+1);assert.equal(d.rows[0].slots.length,1);assert(!details(c,d).issue);
 const withoutSimple={...d.ctx,feats:d.ctx.feats.filter(f=>f.id!=='feat:weapon-proficiency-simple-weapons')};assert(!speciesChoiceDetails(c,pack,withoutSimple,d.rows[0].ctx)[0].options.find(o=>o.id==='simple-weapons').available);
 const exotic=pack.equipment.find(r=>r.group==='exotic-melee');chooseSpeciesOption(c,pack,'weapon-focus',exotic.id.split(':')[1]);d=derive(c,pack);assert.equal(focus(d).length,0);assert(details(c,d).issue);
 c.levels[0].feats=[{id:'feat:exotic-weapon-proficiency',choice:exotic.id}];d=derive(c,pack);assert.equal(focus(d).length,1);assert.equal(focus(d)[0].choice,exotic.id);assert(!details(c,d).issue);
 c.levels[0].feats=[];resizeLevelPlan(c,pack,3);for(let i=1;i<3;i++)choosePlannedClass(c,pack,i,'class:noble');c.levels[2].feats=[{id:'feat:exotic-weapon-proficiency',choice:exotic.id}];d=derive(c,pack);assert.equal(focus(d)[0].level,3);assert(!d.rows[0].ctx.feats.some(f=>f.id==='feat:weapon-focus'));assert(!d.rows[1].ctx.feats.some(f=>f.id==='feat:weapon-focus'));
 c.species='species:human';assert.equal(focus(derive(c,pack)).length,0);c.species='species:rakata';assert.equal(focus(derive(c,pack)).length,1);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
});

test('Ssi-Ruu natural armor stacks and Keen Smell rerolls preserve the range/application declaration',()=>{
 const c=hero('ssi-ruu'),h=hero('human');c.trainedSkills=['skill:persuasion'];c.inventory=[item('blast-helmet-and-vest')];h.inventory=[item('blast-helmet-and-vest')];const d=derive(c,pack),r=ix.species.get(c.species);assert.equal(d.defenses.reflex,derive(h,pack).defenses.reflex+2);assert(d.ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:persuasion'));
 const logs=[],values=[20,1],checks=createSpeciesChecks({current:()=>c,derived:()=>derive(c,pack),log:(...args)=>logs.push(args)},expr=>({value:values.shift(),display:expr,coeffs:[],rollId:1}));checks.click({dataset:{skillRoll:'skill:persuasion'}},r);const html=checks.controls(d.skills.find(s=>s.id==='skill:persuasion'),r,false);assert(html.includes('Keen Smell'));assert(html.includes('within 6 squares, same room or open area'));checks.click({dataset:{speciesReroll:'skill:persuasion'}},r);assert(logs[1][1].includes('kept 20'));checks.click({dataset:{speciesReroll:'skill:persuasion'}},r);assert.equal(logs.length,2);
 assert.deepEqual(r.languages,['Ssi-Ruuvi']);assert(articleText(r.article).includes('still affected by Force Powers'));assert(articleText(ix.species.get('species:rakata').article).includes('once per encounter'));
});

test('restriction, penalty and secondary-choice data reject malformed or forged values',()=>{
 for(const [key,value]of [['forceRestrictions',null],['forceRestrictions',{}],['forceRestrictions',{immune:true}],['forceRestrictions',{forbidPoints:'true'}],['unproficientWeaponPenalty',1],['unproficientWeaponPenalty',-1.5],['unproficientArmorPenalties',{light:0}],['unproficientArmorPenalties',{light:0,medium:-2,heavy:1}]]){const p=structuredClone(pack);p.species.find(r=>r.id==='species:rakata')[key]=value;assert.throws(()=>validatePack(p));}
 for(const change of [o=>o.choice='equipment:datapad',o=>o.requiresFeat='feat:missing']){const p=structuredClone(pack);change(p.species.find(r=>r.id==='species:rakata').creationChoices[0].options[0]);assert.throws(()=>validatePack(p));}
 const c=hero('rakata');c.speciesChoices={'species:rakata':{'weapon-focus':'not-real'}};assert.throws(()=>validateCharacter(c,pack));
});
