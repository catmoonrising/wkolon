import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {chooseSpeciesOption,speciesChoiceDetails,resolveSpecies} from '../src/species-choices.js';
import {prepareDroidSystems,installDroidSystem,droidCarryingWeight} from '../src/droid-installation.js';
import {chassisSwapAllowed,swapChassisSystem,chassisSpeed,validateChassisData} from '../src/droid-chassis.js';
import {standardArray,activeBudget} from '../src/ability-profiles.js';
import {resolveEquipment} from '../src/equipment.js';
import {skillRerollSources} from '../src/skill-rerolls.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(name='Medical Droid',cls='noble'){
 const c=newCharacter(pack,{classId:'class:'+cls});c.species=pack.species.find(s=>s.name===name).id;
 c.droidAbilities={abilityMethod:'manual',pointBudget:21,abilities:{str:12,dex:12,int:12,wis:12,cha:12}};
 prepareDroidSystems(c,pack);return c;
}
const choices=c=>{const d=derive(c,pack);return speciesChoiceDetails(c,pack,d.ctx,d.rows[0].ctx);};
test('all eight chassis use their own fixed modifiers, five abilities, degree access, languages and free one-shot equipment',()=>{
 const chassis=pack.species.filter(s=>s.droidChassis);assert.equal(chassis.length,8);
 for(const s of chassis){
  const c=hero(s.name),inventory=structuredClone(c.inventory),credits=c.credits,d=derive(c,pack);
  assert.equal(d.scores.con,null);assert.equal(d.scores.str,Math.max(1,12+(s.abilityAdjustments.str||0)));assert.equal(d.scores.dex,12+(s.abilityAdjustments.dex||0));assert.equal(d.speed,6);assert.deepEqual(standardArray(c,pack),[15,14,13,12,10]);assert.equal(activeBudget(c,pack),21);
  assert.equal(d.droidSystems.processor,s.heuristicProcessor?'heuristic':'basic');assert.deepEqual(d.ctx.droidTalentTrees,s.droidTalentTrees);
  assert.equal(c.inventory.length,s.droidChassis.systems.length);assert(!s.droidStartingPackage);assert(!prepareDroidSystems(c,pack));assert.deepEqual(c.inventory,inventory);assert.equal(c.credits,credits);validateCharacter(c,pack);
  const old=JSON.parse(JSON.stringify(c));c.inventory.splice(0,1);prepareDroidSystems(c,pack);assert.equal(c.inventory.length,old.inventory.length-1);validateCharacter(c,pack);
 }
 const astro=derive(hero('Astromech Droid'),pack);assert.equal(astro.size,'small');assert.equal(astro.scores.str,12);assert.equal(astro.scores.dex,12);assert(resolveSpecies(hero('Astromech Droid'),pack).languages.includes('Binary'));assert(resolveSpecies(hero('Astromech Droid'),pack).understoodLanguages.includes('Basic'));
});
test('hardwired skills are extra training and each conditional Focus selects only one trained skill',()=>{
 for(const [name,skill] of [['Medical Droid','treat-injury'],['Astromech Droid','mechanics'],['Mechanic Droid','mechanics'],['Protocol Droid','persuasion'],['Probe Droid','perception']]){
  const c=hero(name),d=derive(c,pack);assert(d.ctx.trained.has('skill:'+skill));assert(d.ctx.speciesTraining.has('skill:'+skill));assert.equal(c.trainedSkills.length,0);
 }
 const c=hero();chooseSpeciesOption(c,pack,'focus','treat-injury');assert.equal(derive(c,pack).ctx.feats.filter(f=>f.id==='feat:skill-focus').length,1);assert(choices(c).find(g=>g.id==='focus').options.find(o=>o.id==='treat-injury').available);
 chooseSpeciesOption(c,pack,'focus','knowledge-life-sciences');assert(!derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'));assert(choices(c).find(g=>g.id==='focus').issue);
 c.trainedSkills=['skill:knowledge-life-sciences'];assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:knowledge-life-sciences'));validateCharacter(c,pack);
});
test('Protocol and Service bonus training grants an actual feat and preserves class-skill prerequisites',()=>{
 for(const name of ['Protocol Droid','Service Droid']){
  const c=hero(name);chooseSpeciesOption(c,pack,'training','knowledge-bureaucracy');const d=derive(c,pack);
  assert(d.ctx.feats.some(f=>f.id==='feat:skill-training'&&f.choice==='skill:knowledge-bureaucracy'&&f.grantedBy===c.species));assert(d.ctx.speciesTraining.has('skill:knowledge-bureaucracy'));assert(!choices(c).find(g=>g.id==='training').issue);validateCharacter(c,pack);
 }
 const c=hero('Protocol Droid','soldier');chooseSpeciesOption(c,pack,'training','knowledge-social-sciences');assert(!derive(c,pack).ctx.trained.has('skill:knowledge-social-sciences'));assert(!choices(c).find(g=>g.id==='training').options.find(o=>o.id==='knowledge-social-sciences').available);
});
test('Battle grants two distinct eligible feats and does not let a class starting feat consume the armor choice',()=>{
 const c=hero('Battle Droid','soldier');let groups=choices(c);assert(!groups.find(g=>g.id==='armor').options.find(o=>o.id==='armor-proficiency-light').available);assert(groups.find(g=>g.id==='armor').options.find(o=>o.id==='armor-proficiency-heavy').available);
 chooseSpeciesOption(c,pack,'armor','armor-proficiency-heavy');chooseSpeciesOption(c,pack,'weapon','weapon-proficiency-heavy-weapons');const d=derive(c,pack);
 assert(d.ctx.feats.some(f=>f.id==='feat:armor-proficiency-heavy'&&f.grantedBy===c.species));assert(d.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-heavy-weapons'&&f.grantedBy===c.species));assert(choices(c).every(g=>!g.issue));validateCharacter(c,pack);
});
test('Mechanic locomotion choices retain printed speed six, stable identity and unchanged credits',()=>{
 const c=hero('Mechanic Droid'),e=c.inventory.find(e=>e.id==='equipment:walking'),uid=e.uid,credits=c.credits;
 assert(chassisSwapAllowed(c,pack,e,'equipment:wheeled'));swapChassisSystem(c,pack,uid,'equipment:wheeled');assert.equal(e.uid,uid);assert.equal(chassisSpeed(c,pack,e),6);assert.equal(derive(c,pack).speed,6);assert.equal(c.credits,credits);assert.equal(e.droidGrant.baseId,'equipment:wheeled');assert.equal(resolveEquipment(e,pack,c).cost,180);assert.equal(resolveEquipment(e,pack,c).systemSpeed,6);validateCharacter(c,pack);
});
test('free swaps use the native price basis, reject unknown prices, survive reloads and cannot climb a price ladder',()=>{
 const c=hero(),v=c.inventory.find(e=>e.id==='equipment:vocabulator'),credits=c.credits;
 const allowed=pack.equipment.filter(r=>chassisSwapAllowed(c,pack,v,r.id));assert(allowed.some(r=>r.id!==v.id));const replacement=allowed.find(r=>r.id!==v.id);const base=v.droidGrant.baseId,uid=v.uid;
 swapChassisSystem(c,pack,uid,replacement.id);assert.equal(v.droidGrant.baseId,base);assert.equal(v.uid,uid);assert.equal(c.credits,credits);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 const astro=hero('Astromech Droid'),feet=astro.inventory.find(e=>e.id==='equipment:magnetic-feet');assert(!chassisSwapAllowed(astro,pack,feet,'equipment:hand'));assert.throws(()=>swapChassisSystem(astro,pack,feet.uid,'equipment:hand'));assert(astro.inventory.some(e=>e.id==='equipment:astrogation-buffer-5-memory-units'));
 const b=structuredClone(c);b.inventory.find(e=>e.uid===uid).droidGrant.baseId='equipment:heuristic-processor';assert.throws(()=>validateCharacter(b,pack));
});
test('native systems feed armor, sensors, appendage attacks, rerolls and starting carrying exemptions',()=>{
 const c=hero('Probe Droid'),d=derive(c,pack);assert.equal(d.vision,'darkvision');assert(d.droidSystems.perceptionBonus>0);assert(d.attacks.some(a=>a.droidAppendage));
 const nonProcessor=c.inventory.find(e=>e.id==='equipment:hovering'),processor=c.inventory.find(e=>e.id==='equipment:heuristic-processor');assert.equal(droidCarryingWeight(c,pack,nonProcessor,10),0);assert.equal(droidCarryingWeight(c,pack,processor,5),5);
 const m=hero('Mechanic Droid'),md=derive(m,pack),mechanics=md.skills.find(s=>s.id==='skill:mechanics');assert(skillRerollSources(mechanics,resolveSpecies(m,pack),md).some(s=>s.keep==='new'));
 const l=hero('Labor Droid'),ld=derive(l,pack);assert(skillRerollSources(ld.skills.find(s=>s.id==='skill:climb'),resolveSpecies(l,pack),ld).some(s=>s.keep==='best'));
});
test('chassis preparation and swapping validate before mutation, and foreign grants cannot be installed',()=>{
 const c=hero(),s=pack.species.find(s=>s.id===c.species);const bad=structuredClone(s);bad.droidChassis.swapTolerance=1;assert.throws(()=>validateChassisData(bad,pack,m=>{throw new Error(m);}));
 const before=structuredClone(c);assert.throws(()=>swapChassisSystem(c,pack,c.inventory[0].uid,'equipment:durasteel-shell'));assert.deepEqual(c,before);
 c.species='species:custom-droid';assert.throws(()=>installDroidSystem(c,pack,c.inventory[0].uid,true));
 const full=newCharacter(pack);full.species=s.id;full.inventory=Array.from({length:999},()=>({id:'equipment:hand',uid:crypto.randomUUID(),quantity:1,equipped:false}));const snapshot=structuredClone(full);assert.throws(()=>prepareDroidSystems(full,pack));assert.deepEqual(full,snapshot);
});

test('other bodies do not lend armor or encumbrance, and changes to printed speed need recorded GM approval',()=>{
 const c=hero('Labor Droid'),old=[...c.inventory];c.species='species:probe-droid';prepareDroidSystems(c,pack);
 assert(old.every(e=>droidCarryingWeight(c,pack,e,100)===0));assert(!derive(c,pack).armorItems.some(r=>r.id==='equipment:durasteel-shell'));
 const flying={id:'equipment:flying',uid:crypto.randomUUID(),quantity:1,equipped:false,carried:true,twoHanded:false,attackMod:0,damageMod:0,systemSize:'medium',systemOrdinal:2};c.inventory.push(flying);installDroidSystem(c,pack,flying.uid,true);
 assert.equal(derive(c,pack).speed,6);assert(derive(c,pack).issues.some(s=>s.includes('GM approval')));c.droidSystems[c.species].gmChanges=true;assert.equal(derive(c,pack).speed,12);validateCharacter(c,pack);
});
