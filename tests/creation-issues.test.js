import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive} from '../src/rules.js';
import {prepareDroidSystems} from '../src/droid-installation.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {creationIssueTarget} from '../src/creation-issues.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=()=>{const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';return c;};
const target=(c,text)=>{const d=derive(c,pack),i=d.issues.findIndex(issue=>issue.includes(text));assert(i>=0,text);return creationIssueTarget(c,d,pack,i);};
test('unresolved heroic/species feats and talents point to distinct actual level slots',()=>{
 const c=hero();assert.deepEqual(target(c,'choose Heroic feat'),{tab:'levels',tree:'feat:0:0'});
 assert.deepEqual(target(c,'choose Species feat'),{tab:'levels',tree:'feat:0:1'});
 assert.deepEqual(target(c,'choose a talent'),{tab:'levels',tree:'talent:0:0'});
 assert.deepEqual(target(c,'starting trained skills'),{tab:'skills'});
 c.levels[0].feats=[{id:'feat:skill-focus',pending:true}];
 assert.deepEqual(target(c,'Skill Focus is not eligible'),{tab:'levels',tree:'feat:0:0'});
});
test('higher-level issues keep their acquisition level and unchosen class rows remain accessible',()=>{
 const c=hero();resizeLevelPlan(c,pack,4);
 assert.deepEqual(target(c,'Level 3: choose a class'),{tab:'levels',tree:'class:2:0'});
 for(let i=1;i<4;i++)choosePlannedClass(c,pack,i,'class:soldier');
 assert.deepEqual(target(c,'Level 4: choose Soldier bonus feat'),{tab:'levels',tree:'feat:3:0'});
 assert.deepEqual(target(c,'increase two different abilities'),{tab:'levels',selector:'[data-increase][data-level="3"]',level:3});
});
test('global point-buy, species and story issues navigate without changing a character',()=>{
 const c=hero();c.abilityMethod='point-buy';c.abilities.str=18;c.pointBudget=0;
 c.story={kind:'destiny',id:null,points:0,details:''};
 const before=JSON.stringify(c);assert.deepEqual(target(c,'Point-buy budget'),{tab:'abilities'});
 assert.deepEqual(target(c,'Choose a Destiny'),{tab:'character'});
 assert.equal(creationIssueTarget(c,derive(c,pack),pack,-1),null);
 assert.equal(JSON.stringify(c),before);
});


test('feature names containing ability-like words still target their selection, not ASI fields',()=>{
 const c=newCharacter(pack,{classId:'class:jedi'});c.levels[0].talent={id:'talent:known-vulnerability'};
 assert.deepEqual(target(c,'Known Vulnerability is not eligible'),{tab:'levels',tree:'talent:0:0'});
});


test('species language choices stay on Species and missing droid installation choices target Equipment',()=>{
 for(const [species,label]of [['species:nikto','Choose Nikto Language'],['species:replica-droid','Choose Replica Droid Native language']]){
  const c=hero();c.species=species;assert.deepEqual(target(c,label),{tab:'species'});
 }
 const c=hero();c.species='species:custom-droid';prepareDroidSystems(c,pack);
 const processor=c.inventory.find(e=>pack.equipment.find(r=>r.id===e.id)?.droidSystem?.category==='processor');assert(processor);
 processor.equipped=false;assert.deepEqual(target(c,'Install a Processor'),{tab:'equipment'});
});
