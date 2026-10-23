import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {setSkillAbility,skillAbilityControl} from '../src/skill-abilities.js';
import {validatePack} from '../tools/validate-rules.js';
import {rollSkillAction} from '../src/skill-actions.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack,{classId:'class:scoundrel'});c.species='species:cerean';c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:18,cha:10};c.trainedSkills=['skill:mechanics','skill:use-computer'];c.levels[0].feats=[{id:'feat:mind-of-reason'}];c.levels[0].talent={id:'talent:trace'};return c;}
const skill=(c,id='mechanics')=>derive(c,pack).skills.find(s=>s.id==='skill:'+id);
test('Mind of Reason selects WIS once on every INT skill, retaining training, focus and other bonuses',()=>{
 const c=hero(),before=structuredClone(c);before.levels[0].feats=[];c.condition=2;before.condition=2;c.skillModifiers={'skill:mechanics':3};before.skillModifiers=c.skillModifiers;
 for(const s of derive(c,pack).skills){const base=skill(before,s.id.slice(6));assert.equal(s.total-base.total,s.abilityDetails.options.some(o=>o.ability==='int')?4:0);assert.equal(s.trained,base.trained);assert.equal(s.focus,base.focus);}
 assert.equal(skill(c).ability,'wis');assert.match(skill(c).breakdown,/5 WIS/);assert.equal(skill(c,'initiative').ability,'dex');assert.equal(skill(c,'knowledge-life-sciences').trained,false);const untrained=structuredClone(c);untrained.trainedSkills=[];assert.equal(skill(untrained,'mechanics').available,false);
 c.levels.push({classId:'class:scoundrel',hpRoll:4,feats:[{id:'feat:skill-focus',choice:'skill:mechanics'}],talent:null,startingFeat:null,trainedSkills:[],abilityIncreases:[]});assert.equal(skill(c).focus,5);
});
test('Auto compares actual modifiers, explicit legal choices can be lower and JSON retains them',()=>{
 const c=hero(),auto=skill(c).total;setSkillAbility(c,derive(c,pack).skills,'skill:mechanics','int');assert.equal(skill(c).total,auto-4);assert.equal(skill(c).ability,'int');validateCharacter(JSON.parse(JSON.stringify(c)),pack);assert.match(skillAbilityControl(skill(c)),/INT \+1/);setSkillAbility(c,derive(c,pack).skills,'skill:mechanics','auto');assert.equal(c.skillAbilities,undefined);
 c.abilities.wis=0;c.abilities.int=2;assert.equal(skill(c).ability,'int');c.abilities.wis=2;assert.equal(skill(c).ability,'int');c.abilities.wis=4;assert.equal(skill(c).ability,'wis');
});
test('species changes suspend the feat, retain an unavailable choice and block the native check',()=>{
 const c=hero();setSkillAbility(c,derive(c,pack).skills,'skill:mechanics','wis');c.species='species:human';validateCharacter(c,pack);assert(!derive(c,pack).ctx.feats.some(f=>f.id==='feat:mind-of-reason'));assert(!skill(c).available);assert.match(skillAbilityControl(skill(c)),/WIS \(unavailable\)/);assert.match(skillAbilityControl(skill(c)),/aria-invalid="true"/);c.species='species:cerean';assert(skill(c).available);assert.equal(skill(c).ability,'wis');c.levels[0].feats=[];assert(!skill(c).available);setSkillAbility(c,derive(c,pack).skills,'skill:mechanics','auto');assert(skill(c).available);
});
test('Trace substitutes the complete native Use Computer result, with its independently chosen ability',()=>{
 const c=hero();c.skillCheckSources={'skill:gather-information':'skill:use-computer'};assert.equal(skill(c,'gather-information').total,skill(c,'use-computer').total);setSkillAbility(c,derive(c,pack).skills,'skill:use-computer','int');assert.equal(skill(c,'gather-information').total,skill(c,'use-computer').total);assert.match(skill(c,'gather-information').breakdown,/1 INT/);assert(!skill(c,'gather-information').trained);
});
test('a legal whole-check substitute can bypass an unavailable native ability, without changing the saved native choice',()=>{
 const c=hero();c.skillAbilities={'skill:gather-information':'wis'};c.skillCheckSources={'skill:gather-information':'skill:use-computer'};validateCharacter(c,pack);assert(!skill(c,'gather-information').abilityDetails.available);assert(skill(c,'gather-information').available);assert.equal(c.skillAbilities['skill:gather-information'],'wis');
});
test('Actions and stat blocks use the resolved skill modifier',()=>{
 const c=hero(),d=derive(c,pack),s=skill(c);const result=rollSkillAction({skill:s,mode:'take10',rule:{dc:15}});assert.equal(result.check.bonus,s.total);assert.equal(result.check.total,10+s.total);assert.match(renderStatBlock(c,d,pack),new RegExp('Mechanics \\+'+s.total));
});
test('saved maps and the reviewed effect contract reject malformed names, skills, scope and types',()=>{
 const c=hero();for(const map of [null,[],{'skill:invented':'wis'},{'skill:mechanics':'cha'},{'skill:mechanics':3}])assert.throws(()=>validateCharacter({...c,skillAbilities:map},pack),/skill abilities/);
 assert.throws(()=>setSkillAbility(c,derive(c,pack).skills,'skill:mechanics','cha'),/unavailable/);
 for(const edit of [e=>e.from='cha',e=>e.ability='str',e=>e.amount=5]){const p=structuredClone(pack);edit(p.feats.find(f=>f.id==='feat:mind-of-reason').effects[0]);assert.throws(()=>validatePack(p));}
});
