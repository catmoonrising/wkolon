import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack} from '../src/rules.js';
import {resolveSpecies} from '../src/species-choices.js';
import {customizationState,customizationEntries,setSpeciesCustomization} from '../src/species-customization.js';
import {setNaturalModifier} from '../src/natural-weapons.js';
import {planFullAttack} from '../src/full-attacks.js';
import {createSpeciesChecks} from '../src/species-rules.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),base=pack.species.find(s=>s.id==='species:near-human'),ix=indexPack(pack);
const choose=(c,field,value,options)=>setSpeciesCustomization(c,pack,field,value,options);
function hero(trait='quick'){
 const c=newCharacter(pack,{classId:'class:soldier'});Object.assign(c,{species:base.id,abilityMethod:'manual',abilities:{str:14,dex:12,con:12,int:12,wis:12,cha:12},trainedSkills:[]});c.levels[0].feats=[];c.levels[0].talent=null;choose(c,'replacement','feat');choose(c,'trait',trait);choose(c,'variants',['eye-variation']);return c;
}
test('Near-Human exposes the entire official trait and cosmetic variant tables verbatim',()=>{
 assert.equal(base.customization.traits.length,24);assert.equal(base.customization.variants.length,10);
 for(const t of [...base.customization.traits,...base.customization.variants]){assert(articleText(base.article).includes(articleText(t.article)),t.name);assert.equal(t.article.sourceId,base.sourceId);}
 for(const name of ['Breathe Underwater','Scent','Biotech Augmentation','Cultural Cybernetics','Empath','Quick Healing','Resistant','Spring Step','Strength Surge','Visually Striking'])assert.equal(base.customization.traits.find(t=>t.name===name).automation,'manual');
 assert.equal(base.customization.traits.find(t=>t.id==='biotech-augmentation').choices[0].options.length,7);assert.equal(base.customization.traits.find(t=>t.id==='cultural-cybernetics').choices[0].options.length,19);validatePack(pack);
});
test('replacement consumes exactly one Human bonus, preserves chosen feats and training, and replays the level plan',()=>{
 const c=hero(),skills=['skill:climb','skill:endurance','skill:initiative','skill:jump','skill:perception'];c.trainedSkills=skills;c.levels[0].feats=[{id:'feat:weapon-focus',choice:'rifles'},{id:'feat:toughness'}];let d=derive(c,pack);assert.equal(d.rows[0].slots.filter(s=>s.kind==='general').length,1);assert(d.issues.some(s=>s.includes('feat')));assert(!d.issues.some(s=>s.includes('starting trained skills')));
 choose(c,'replacement','skill');d=derive(c,pack);assert.equal(d.rows[0].slots.filter(s=>s.kind==='general').length,2);assert(d.issues.some(s=>s.includes('starting trained skills')));assert.equal(resolveSpecies(c,pack).bonusSkills,0);assert.equal(c.levels[0].feats.length,2);assert.deepEqual(c.trainedSkills,skills);validateCharacter(c,pack);
});
test('ability pairs change derived scores, prerequisites and training without rewriting generation and flag identical choices',()=>{
 const c=hero('ability-adjustment'),before=JSON.stringify(c.abilities);assert(derive(c,pack).issues.some(s=>s.includes('Increase')));
 choose(c,'choice','str',{traitId:'ability-adjustment',choiceId:'increase'});choose(c,'choice','int',{traitId:'ability-adjustment',choiceId:'decrease'});let d=derive(c,pack);assert.equal(d.scores.str,16);assert.equal(d.scores.int,10);assert.equal(JSON.stringify(c.abilities),before);
 choose(c,'choice','str',{traitId:'ability-adjustment',choiceId:'decrease'});assert(derive(c,pack).issues.some(s=>s.includes('different abilities')));choose(c,'trait','quick');assert.equal(derive(c,pack).scores.str,14);choose(c,'trait','ability-adjustment');assert.equal(customizationState(c,base).options['ability-adjustment'].increase,'str');validateCharacter(c,pack);
});
test('physical and training traits affect only their printed rules and leave no effects after switching',()=>{
 const c=hero('quick');assert.equal(derive(c,pack).speed,7);choose(c,'trait','natural-armor');const ref=derive(c,pack).defenses.reflex;choose(c,'trait','darkvision');assert.equal(derive(c,pack).vision,'darkvision');assert.equal(derive(c,pack).defenses.reflex,ref-1);choose(c,'trait','low-light-vision');assert.equal(derive(c,pack).vision,'low-light');choose(c,'trait','naturally-acrobatic');let d=derive(c,pack);assert(d.ctx.trained.has('skill:acrobatics'));assert(d.ctx.speciesTraining.has('skill:acrobatics'));assert(!d.ctx.feats.some(f=>f.id==='feat:skill-training'));assert.equal(c.trainedSkills.length,0);choose(c,'trait','persistent');assert(!derive(c,pack).ctx.trained.has('skill:acrobatics'));assert.equal(resolveSpecies(c,pack).skillRerolls[0].skill,'skill:endurance');choose(c,'trait','breathe-underwater');assert(resolveSpecies(c,pack).breatheUnderwater);choose(c,'trait','scent');assert.equal(resolveSpecies(c,pack).scentRange,10);assert.equal(derive(c,pack).speed,6);
});
test('Conductive and Natural Weapon attacks use the printed Energy or Slashing type and independent saved settings',()=>{
 const c=hero('conductive');let a=derive(c,pack).attacks.find(a=>a.natural);assert.equal(a.damageType,'Energy');assert.equal(a.damage,'1d6');assert(a.opportunityWeapon);setNaturalModifier(c,pack,'discharge','damageMod',2);assert.equal(derive(c,pack).attacks.find(a=>a.natural).damageBonus,a.damageBonus+2);choose(c,'trait','natural-weapon');a=derive(c,pack).attacks.find(a=>a.natural);assert.equal(a.naturalWeaponId,'claws');assert.equal(a.damageType,'Slashing');c.levels[0].feats=[{id:'feat:martial-arts-i'}];assert.equal(derive(c,pack).attacks.find(a=>a.natural).damage,'1d8');choose(c,'trait','conductive');assert.equal(derive(c,pack).attacks.find(a=>a.natural).damageType,'Energy');assert.equal(c.naturalModifiers.discharge.damageMod,2);validateCharacter(c,pack);
});
test('Additional Arms reduces a real aggregate Full Attack penalty, without adding attacks',()=>{
 const c=hero('additional-arms'),e={id:'equipment:knife',uid:crypto.randomUUID(),quantity:1,equipped:true,attackMod:0,damageMod:0,twoHanded:false};c.inventory=[e];const d=derive(c,pack),r={id:crypto.randomUUID(),name:'Two weapons',kind:'fullAttack',steps:[{id:crypto.randomUUID(),source:'base',attackId:e.uid,count:1,attackMod:0,damageMod:0},{id:crypto.randomUUID(),source:'twoWeapons',attackId:c.id,count:1,attackMod:0,damageMod:0}]};const plan=planFullAttack(r,d,pack);assert.equal(plan.penalty,-10);assert.equal(plan.attacks.find(a=>a.uid===e.uid).fullAttackPenalty,-8);assert.equal(d.attacks.length,2);choose(c,'trait','quick');assert.equal(planFullAttack(r,derive(c,pack),pack).attacks.find(a=>a.uid===e.uid).fullAttackPenalty,-10);
});
test('Weapon Familiarity selects one actual exotic weapon, including proficiency and Jedi Counseling effect grouping',()=>{
 const c=hero('weapon-familiarity');choose(c,'choice','equipment:bowcaster',{traitId:'weapon-familiarity',choiceId:'weapon'});c.inventory=[{id:'equipment:bowcaster',uid:crypto.randomUUID(),quantity:1,equipped:true,attackMod:0,damageMod:0,twoHanded:false}];let d=derive(c,pack),a=d.attacks.find(a=>a.id==='equipment:bowcaster');assert(a.proficient);assert.equal(a.effectGroup,'simple-weapons');choose(c,'trait','quick');a=derive(c,pack).attacks.find(a=>a.id==='equipment:bowcaster');assert(!a.proficient);validateCharacter(c,pack);
});
test('Expert Swimmer exposes real reroll and Take 10 controls using the resolved trait',()=>{
 const c=hero('expert-swimmer'),logs=[],checks=createSpeciesChecks({current:()=>c,derived:()=>derive(c,pack),log:(...x)=>logs.push(x)},()=>({value:17,display:'17'}));let d=derive(c,pack),s=d.skills.find(s=>s.id==='skill:swim');assert(checks.controls(s,resolveSpecies(c,pack),false).includes('data-species-take10'));checks.click({dataset:{skillRoll:s.id}},resolveSpecies(c,pack));checks.click({dataset:{speciesReroll:s.id}},resolveSpecies(c,pack));assert(logs.at(-1)[1].includes('kept 17'));checks.click({dataset:{speciesTake10:s.id}},resolveSpecies(c,pack));assert(logs.at(-1)[1].includes('10 + 2 = 12'));choose(c,'trait','quick');assert(!checks.controls(derive(c,pack).skills.find(s=>s.id==='skill:swim'),resolveSpecies(c,pack),false).includes('data-species-take10'));
});
test('manual secondary options and cosmetic variants persist without fabricated equipment, bonuses or credit costs',()=>{
 const c=hero('biotech-augmentation');assert(derive(c,pack).issues.some(s=>s.includes('Bio-Implant')));choose(c,'choice','equipment:body-spikes',{traitId:'biotech-augmentation',choiceId:'implant'});assert(!derive(c,pack).issues.some(s=>s.includes('Bio-Implant')));choose(c,'variants',['eye-variation','towering','webbed-digits']);assert.equal(derive(c,pack).size,'medium');assert.equal(c.inventory.length,0);assert.equal(c.credits,0);const names=customizationEntries(c,resolveSpecies(c,pack)).map(r=>r.name);assert(names.includes('Biotech Augmentation (Body Spikes)'));assert(names.includes('Towering'));assert(renderStatBlock(c,derive(c,pack),pack).includes('Biotech Augmentation (Body Spikes)'));const saved=JSON.parse(JSON.stringify(c));saved.species='species:human';assert.equal(derive(saved,pack).speed,6);saved.species=base.id;assert.deepEqual(customizationState(saved,base).variants,['eye-variation','towering','webbed-digits']);validateCharacter(saved,pack);
});
test('customizations reject forged fields, unknown options, duplicate/excess variants and malformed effect data atomically',()=>{
 const c=hero(),before=JSON.stringify(c);for(const [field,value,options]of [['variants',['eye-variation','eye-variation']],['variants',['eye-variation','towering','webbed-digits','fins']],['trait','invented'],['choice','feat:force-sensitivity',{traitId:'ability-adjustment',choiceId:'increase'}]])assert.throws(()=>choose(c,field,value,options));assert.equal(JSON.stringify(c),before);assert.throws(()=>validateCharacter({...c,speciesCustomizations:{'species:human':{trait:'quick'}}},pack));assert.throws(()=>validateCharacter({...c,speciesCustomizations:{[base.id]:{options:{quick:{fake:'str'}}}}},pack));
 for(const edit of [s=>s.customization.traits[0].effects.extra=1,s=>s.customization.traits[0].article.blocks.push({tag:'script',children:[]}),s=>s.customization.traits[0].choices[0].options[0].id='invalid',s=>s.customization.replacements[0].bonusFeats=1,s=>s.customization.traits[0].id=s.customization.traits[1].id]){const p=structuredClone(pack);edit(p.species.find(s=>s.id===base.id));assert.throws(()=>validatePack(p));}
});
