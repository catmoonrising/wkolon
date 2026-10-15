import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,progression,indexPack,validateCharacter} from '../src/rules.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {featureGraph} from '../src/feature-trees.js';
import {levelPlanTable} from '../src/level-plan-ui.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
function hero(){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.levels[0].classId='class:soldier';return c;}
test('higher-level creation saves pending rows without granting phantom class levels, BAB, HP or increases',()=>{
 const c=hero(),before=derive(c,pack);resizeLevelPlan(c,pack,10);c.levels[3].abilityIncreases=['str','dex'];const d=derive(c,pack);assert.equal(c.levels.length,10);assert.equal(d.level,1);assert.equal(d.bab,before.bab);assert.equal(d.hp,before.hp);assert.equal(d.recovery.naturalHealing.amount,before.recovery.naturalHealing.amount);assert.deepEqual(d.scores,before.scores);assert(d.issues.includes('Level 2: choose a class'));validateCharacter(JSON.parse(JSON.stringify(c)),pack);assert(c.levels.slice(1).every(l=>l.pendingClass));c.levels[1].pendingClass='yes';assert.throws(()=>validateCharacter(c,pack),/pending class/);
});
test('class choices replay cumulative BAB, class-local feat/talent schedules and level 4/8 increases',()=>{
 const c=hero();resizeLevelPlan(c,pack,10);c.levels[3].abilityIncreases=['str','dex'];c.levels[7].abilityIncreases=['dex','wis'];for(let i=1;i<10;i++)choosePlannedClass(c,pack,i,i===3?'class:scoundrel':'class:soldier');const d=derive(c,pack);assert.equal(d.level,10);assert.deepEqual(d.rows.map(r=>r.ctx.bab),[1,2,3,3,4,5,6,7,8,9]);assert.equal(d.rows[3].classLevel,1);assert.equal(d.rows[4].classLevel,4);assert(d.rows[4].slots.some(s=>s.kind==='bonus'));assert(!d.rows[3].slots.some(s=>s.kind==='bonus'));assert.equal(d.scores.dex,16);assert.equal(d.scores.str,15);assert.equal(c.forcePoints,d.forceMaximum);validateCharacter(c,pack);
});
test('class prerequisite graphs use the earlier level context and retain exact class articles',()=>{
 const c=hero(),ctx=progression(c,pack,0).ctx;const graph=featureGraph(pack,{type:'classes',ctx,allowedIds:pack.classes.map(r=>r.id),selected:null,key:'classes',draft:{}});assert(graph.nodes.get('class:soldier|').available);assert(!graph.nodes.get('class:jedi-knight|').available);assert([...graph.nodes.values()].some(n=>n.name==='Base attack +7'&&!n.main));assert(graph.nodes.get('class:jedi-knight|').records[0].article.blocks.length);
 const before=structuredClone(c);assert.throws(()=>choosePlannedClass(c,pack,0,'class:jedi-knight'),/starting class/);assert.deepEqual(c,before);
});
test('editing an earlier class preserves later choices and deactivates failed prestige entries',()=>{
 const c=hero();resizeLevelPlan(c,pack,9);c.abilities.dex=18;c.trainedSkills=['skill:initiative','skill:perception'];c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:precise-shot'}];c.levels[2].feats=[{id:'feat:quick-draw'}];c.levels[5].feats=[{id:'feat:weapon-focus',choice:'pistols'}];for(let i=1;i<8;i++)choosePlannedClass(c,pack,i,'class:soldier');c.levels[3].abilityIncreases=['str','dex'];c.levels[7].abilityIncreases=['str','dex'];const gs=ix.classes.get('class:gunslinger'),entry={entryDeclarations:Object.fromEntries(gs.entrySpecials.map(r=>[r.id,true]))};choosePlannedClass(c,pack,8,gs.id,entry);assert.equal(derive(c,pack).level,9);c.levels[8].talent={id:'talent:trigger-work'};const chosen=structuredClone(c.levels[8]);c.levels[0].feats=[];let d=derive(c,pack);assert.equal(d.rows[8].valid,false);assert.deepEqual(c.levels[8],chosen);assert.equal(d.level,8);assert(levelPlanTable(c,d,pack,{choice:()=>'',reference:r=>r.name}).includes('Trigger Work'));c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:precise-shot'}];assert.equal(derive(c,pack).level,9);
});
test('target-level limits reject before mutation and lowering removes later rows and clamps resources',()=>{
 const c=hero();for(const n of [0,21,1.5,NaN]){const before=structuredClone(c);assert.throws(()=>resizeLevelPlan(c,pack,n),/1 to 20/);assert.deepEqual(c,before);}resizeLevelPlan(c,pack,20);for(let i=1;i<20;i++)choosePlannedClass(c,pack,i,'class:soldier');resizeLevelPlan(c,pack,3);assert.equal(c.levels.length,3);assert.equal(c.forcePoints,derive(c,pack).forceMaximum);validateCharacter(c,pack);
});
test('level table separates Heroic/Class feats and offers row-specific class, talent and ability controls',()=>{
 const c=hero();resizeLevelPlan(c,pack,4);choosePlannedClass(c,pack,1,'class:soldier');const html=levelPlanTable(c,derive(c,pack),pack,{choice:(i,k,j)=>`<button data-test-choice="${i}:${k}:${j}">Choose…</button>`,reference:r=>r.name});for(const label of ['Heroic Feats','Ability Score Improvements','Base Attack Bonus','Class Feats','Class Talents','Misc'])assert(html.includes(label));assert(html.includes('data-plan-level="3"'));assert(html.includes('data-open-tree="class:3:0"'));assert(html.includes('data-test-choice="0:talent:0"'));assert(html.includes('data-test-choice="1:feat:0"'));assert(html.includes('Level 4 ability increase 1'));assert(!html.includes('data-test-choice="2:talent:0"'),'Pending class has no earned talent slot');
});

test('a species change invalidates a forbidden starting class and every later planned level',()=>{
 const c=hero();c.levels[0].classId='class:jedi';resizeLevelPlan(c,pack,2);choosePlannedClass(c,pack,1,'class:soldier');c.species='species:yuuzhan-vong-core-rulebook';const d=derive(c,pack);assert.equal(d.level,0);assert.equal(d.bab,0);assert.equal(d.hp,0);assert(d.rows.every(r=>r.valid===false));assert(d.issues.some(s=>s.includes('cannot be Jedi')));assert.doesNotThrow(()=>levelPlanTable(c,d,pack,{choice:()=>'',reference:r=>r.name}));
});
