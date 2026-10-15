import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack,eligible,classSkills,prerequisite} from '../src/rules.js';
import {featureChoices,resolveFeatureSelection} from '../src/feature-choices.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const f=(id,choice)=>({id:'feat:'+id,...(choice?{choice}:{})}),t=(id,rest={})=>({id:'talent:'+id,...rest});
function hero(cls='soldier'){const c=newCharacter(pack,{classId:'class:'+cls});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:13,wis:16,cha:10};return c;}
function level(c,cls,rest={}){c.levels.push({classId:'class:'+cls,hpRoll:4,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...rest});}
const skill=(d,id)=>d.skills.find(s=>s.id==='skill:'+id);
function sith(){const c=hero('jedi');c.abilities.str=10;c.abilities.dex=18;c.inventory=[{id:'equipment:lightsaber',quantity:1,equipped:true,activated:true,twoHanded:false,attackMod:0,damageMod:0}];c.trainedSkills=['skill:use-the-force','skill:perception','skill:acrobatics'];c.levels[0].feats=[f('weapon-focus','lightsabers')];for(let n=2;n<=7;n++)level(c,'jedi',{abilityIncreases:n===4?['str','dex']:[]});c.darkSideScore=16;const cls=ix.classes.get('class:sith-apprentice'),entryDeclarations=Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true]));level(c,'sith-apprentice',{acquisitionDSS:16,entryDeclarations,abilityIncreases:['str','dex']});level(c,'sith-apprentice',{classChoices:[{id:'classchoice:cure-disease'}]});level(c,'sith-apprentice',{talent:t('stolen-form',{choice:'talent:ataru'})});return c;}

test('Watchful Step trains Initiative and substitutes the full Perception modifier without consuming training slots',()=>{
 const c=hero('scout');c.trainedSkills=['skill:perception'];c.levels[0].talent=t('watchful-step');c.levels[0].feats=[f('skill-focus','skill:perception')];
 let d=derive(c,pack);assert(skill(d,'initiative').trained);assert.equal(skill(d,'initiative').checkSource,'skill:perception');assert.equal(skill(d,'initiative').total,skill(d,'perception').total);assert.equal(c.trainedSkills.length,1);
 level(c,'scout',{feats:[f('skill-focus','skill:initiative')]});d=derive(c,pack);assert(d.ctx.feats.some(s=>s.id==='feat:skill-focus'&&s.choice==='skill:initiative'));
 c.skillCheckSources={'skill:initiative':'skill:initiative'};assert.equal(skill(derive(c,pack),'initiative').checkSource,'skill:initiative');
 c.levels[0].talent=null;d=derive(c,pack);assert(!skill(d,'initiative').trained);assert(!d.ctx.feats.some(s=>s.id==='feat:skill-focus'&&s.choice==='skill:initiative'));assert.equal(c.skillCheckSources['skill:initiative'],'skill:initiative');
 validateCharacter(c,pack);
});

test('Engineer Lineage grants fixed Mechanics training in order and invalidates dependent feats when removed',()=>{
 const c=hero('noble');c.trainedSkills=['skill:knowledge-technology'];c.levels[0].talent=t('educated');level(c,'noble');level(c,'noble',{talent:t('engineer-lineage')});level(c,'noble',{abilityIncreases:['str','dex'],feats:[f('skill-focus','skill:mechanics')]});
 let d=derive(c,pack);assert(skill(d,'mechanics').trained);assert(d.ctx.feats.some(s=>s.id==='feat:skill-focus'&&s.choice==='skill:mechanics'));assert(!classSkills(d.ctx,ix).has('skill:mechanics'));assert(!c.trainedSkills.includes('skill:mechanics'));assert(renderStatBlock(c,d,pack).includes('Mechanics'));
 c.levels[0].talent=null;d=derive(c,pack);assert(!skill(d,'mechanics').trained);assert(!d.ctx.talents.some(s=>s.id==='talent:engineer-lineage'));assert(!d.ctx.feats.some(s=>s.id==='feat:skill-focus'&&s.choice==='skill:mechanics'));
 c.levels[0].talent=t('educated');c.levels[1].feats=[f('skill-focus','skill:mechanics')];assert(!derive(c,pack).ctx.feats.some(s=>s.level===2&&s.choice==='skill:mechanics'));
});

test('fixed talent training can trigger a species feat at its earned level without granting it earlier',()=>{
 const c=hero('noble');c.species='species:sluissi';c.trainedSkills=['skill:knowledge-technology'];c.levels[0].talent=t('educated');level(c,'noble');level(c,'noble',{talent:t('engineer-lineage')});
 let d=derive(c,pack);const grant=d.ctx.feats.find(s=>s.id==='feat:tech-specialist');assert(grant?.automatic);assert.equal(grant.level,3);assert(!d.rows[1].ctx.feats.some(s=>s.id==='feat:tech-specialist'));
 c.levels[2].talent=null;d=derive(c,pack);assert(!d.ctx.feats.some(s=>s.id==='feat:tech-specialist'));
});

test('Commanding Presence supplies class access for later training but does not retroactively authorize initial training or earlier feats',()=>{
 const c=hero();c.levels[0].talent=t('commanding-presence');c.trainedSkills=['skill:persuasion'];c.levels[0].feats=[f('skill-training','skill:persuasion')];
 let d=derive(c,pack);assert(classSkills(d.ctx,ix).has('skill:persuasion'));assert(!d.rows[0].initialClassSkills.has('skill:persuasion'));assert(!skill(d,'persuasion').trained);assert(!d.ctx.feats.some(s=>s.id==='feat:skill-training'));
 c.trainedSkills=[];c.levels[0].feats=[];level(c,'soldier',{feats:[f('skill-training','skill:persuasion')]});d=derive(c,pack);assert(skill(d,'persuasion').trained);assert(d.ctx.feats.some(s=>s.id==='feat:skill-training'));
 c.levels[0].talent=null;d=derive(c,pack);assert(!classSkills(d.ctx,ix).has('skill:persuasion'));assert(!skill(d,'persuasion').trained);
 const c2=hero();c2.levels[0].talent=t('commanding-presence');for(let n=2;n<=4;n++)level(c2,'soldier',{abilityIncreases:n===4?['int','dex']:[],trainedSkills:n===4?['skill:persuasion']:[]});assert(skill(derive(c2,pack),'persuasion').trained);c2.levels[0].talent=null;assert(!skill(derive(c2,pack),'persuasion').trained);
});

test('Dark Deception grants Deception class access without training or a changed Dark Side Score',()=>{
 const c=hero(),ctx=derive(c,pack).ctx;ctx.talents.push({...t('dark-deception'),classId:'class:jedi-knight'});assert(classSkills(ctx,ix).has('skill:deception'));assert(!ctx.trained.has('skill:deception'));assert.equal(ctx.darkSideScore,0);ctx.inactiveTalents.add('talent:dark-deception');assert(!classSkills(ctx,ix).has('skill:deception'));
});

test('Stolen Form requires an earned technique and the chosen form prerequisites, then grants its effects and later prerequisite identity',()=>{
 const c=sith();let d=derive(c,pack);assert(d.ctx.talents.some(s=>s.id==='talent:stolen-form'));const granted=d.ctx.talents.find(s=>s.id==='talent:ataru');assert(granted);assert.equal(granted.level,10);assert.equal(granted.grantedBy,'talent:stolen-form');assert.equal(granted.classId,'class:sith-apprentice');assert.equal(c.levels.length,10);assert(prerequisite({kind:'talent',value:'talent:ataru'},d.ctx,ix));
 const baseline=structuredClone(c);baseline.levels[9].talent=null;assert.equal(d.attacks[0].damageBonus,derive(baseline,pack).attacks[0].damageBonus+4);
 const r=ix.talents.get('talent:stolen-form');assert.equal(featureChoices(r,pack).length,12);assert(!featureChoices(r,pack).includes('talent:watchful-step'));
 c.levels[8].classChoices=[];d=derive(c,pack);assert(!d.ctx.talents.some(s=>s.id==='talent:stolen-form'||s.id==='talent:ataru'));
 c.levels[8].classChoices=[{id:'classchoice:cure-disease'}];c.levels[0].feats=[];d=derive(c,pack);assert(!d.ctx.talents.some(s=>s.id==='talent:ataru'));
 c.levels[0].feats=[f('weapon-focus','lightsabers')];c.levels[9].talent=t('stolen-form',{choice:'talent:vaapad'});assert(!derive(c,pack).ctx.talents.some(s=>s.id==='talent:vaapad'));
 validateCharacter(c,pack);
});

test('Stolen Form preserves exact legacy names, rejects unknown text and duplicate forms, and deactivates its granted effects when Sith features are lost',()=>{
 const c=sith();c.levels[9].talent.choice='manual:Ataru';let d=derive(c,pack);assert(d.ctx.talents.some(s=>s.id==='talent:ataru'));assert.equal(c.levels[9].talent.choice,'manual:Ataru');assert.equal(resolveFeatureSelection(ix.talents.get('talent:stolen-form'),c.levels[9].talent,pack).choice,'talent:ataru');
 const ctx=d.ctx,r=ix.talents.get('talent:stolen-form');assert(!eligible(r,{id:r.id,choice:'talent:ataru'},ctx,ix,'talents'));assert(!eligible(r,{id:r.id,choice:'manual:Unknown Form'},ctx,ix,'talents'));
 c.darkSideScore=15;d=derive(c,pack);assert(d.ctx.inactiveTalents.has('talent:stolen-form'));assert(d.ctx.inactiveTalents.has('talent:ataru'));assert(!prerequisite({kind:'talent',value:'talent:ataru'},d.ctx,ix));assert(d.rows[9].ctx.inactiveTalents.has('talent:ataru'));const lost=d.attacks[0].damageBonus;
 c.darkSideScore=16;assert.equal(derive(c,pack).attacks[0].damageBonus,lost+4);c.levels[9].talent=null;assert(!derive(c,pack).ctx.talents.some(s=>s.id==='talent:ataru'));
});

test('an independently possessed form is not duplicated or suspended with a redundant Sith grant',()=>{
 const c=sith(),knight=ix.classes.get('class:jedi-knight');c.levels.splice(7,0,{classId:knight.id,hpRoll:4,feats:[],talent:t('niman'),startingFeat:null,abilityIncreases:['str','dex'],trainedSkills:[],entryDeclarations:Object.fromEntries(knight.entrySpecials.map(s=>[s.id,true]))});c.levels[8].abilityIncreases=[];c.levels[10].talent=t('stolen-form',{choice:'talent:niman'});
 let d=derive(c,pack);assert(d.ctx.talents.some(s=>s.id==='talent:stolen-form'));assert.equal(d.ctx.talents.filter(s=>s.id==='talent:niman').length,1);assert.equal(d.ctx.talents.find(s=>s.id==='talent:niman').classId,knight.id);
 c.darkSideScore=15;d=derive(c,pack);assert(d.ctx.inactiveTalents.has('talent:stolen-form'));assert(!d.ctx.inactiveTalents.has('talent:niman'));assert(prerequisite({kind:'talent',value:'talent:niman'},d.ctx,ix));
});

test('a Wisdom increase suspends a Sith-granted form before later talent prerequisites are checked',()=>{
 const c=sith();c.levels[0].talent=t('lightsaber-defense');c.levels[9].talent=t('stolen-form',{choice:'talent:niman'});const knight=ix.classes.get('class:jedi-knight');level(c,'jedi-knight',{entryDeclarations:Object.fromEntries(knight.entrySpecials.map(s=>[s.id,true]))});level(c,'jedi-knight',{abilityIncreases:['wis','con']});level(c,'jedi-knight',{talent:t('jar-kai')});
 let d=derive(c,pack);assert(d.ctx.inactiveTalents.has('talent:niman'));assert(!d.ctx.talents.some(s=>s.id==='talent:jar-kai'));
 c.levels[11].abilityIncreases=['str','con'];d=derive(c,pack);assert(d.ctx.talents.some(s=>s.id==='talent:jar-kai'));
});

test('fixed grants, choice trees and class-feature counts reject unsupported data contracts',()=>{
 for(const edit of [p=>p.talents.find(r=>r.id==='talent:engineer-lineage').effects[0].skill='skill:invented',p=>p.talents.find(r=>r.id==='talent:stolen-form').choiceTree='tree:missing',p=>p.talents.find(r=>r.id==='talent:stolen-form').prerequisite.requirements[0].min=0]){const fixture=structuredClone(pack);edit(fixture);assert.throws(()=>validatePack(fixture));}
});
