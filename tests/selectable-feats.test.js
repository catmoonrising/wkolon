import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,eligible,validateCharacter} from '../src/rules.js';
import {featureChoices,choiceName} from '../src/feature-choices.js';
import {featureGraph} from '../src/feature-trees.js';
import {automationBadge} from '../src/feature-status.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const references=JSON.parse(fs.readFileSync(new URL('../data/reference-index.json',import.meta.url))).records;
const f=(name,more={})=>({id:'feat:'+name,...more});
const feat=id=>ix.feats.get('feat:'+id);
function hero(){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:18,wis:14,cha:14};c.trainedSkills=['skill:mechanics','skill:use-computer'];return c;}
const can=(id,ctx,more={},opts)=>eligible(feat(id),f(id,more),ctx,ix,'feats',opts);
test('every inventoried official feat page has a selectable, pinned source mapping',()=>{
 const sourceTitles=new Set(pack.feats.map(r=>pack.sources.find(s=>s.id===r.sourceId).title)),pages=references.filter(r=>r.kind==='feat');assert.equal(pages.length,351);assert.equal(pack.feats.length,358);
 for(const r of pages)assert(sourceTitles.has(r.name),r.name);
 for(const r of pack.feats){assert(r.article.blocks.length);assert(['manual','partial'].includes(r.automation));assert(pack.catalog.records.some(c=>c.mechanicsIds.includes(r.id)),r.name);}
 const normalize=t=>t.replace(/\s+/g,'');for(const r of pack.feats)for(const requirement of r.manualPrerequisites||[])assert(normalize(articleText(r.article)).includes(normalize(requirement)),r.name+': exact manual requirement');
});
test('manual confirmation is saved, reversible and cannot bypass typed requirements',()=>{
 const c=hero();c.levels[0].feats=[f('implant-training')];let d=derive(c,pack);assert(!d.ctx.feats.some(s=>s.id==='feat:implant-training'));assert(d.issues.some(s=>s==='Level 1: confirm prerequisites for Implant Training'));
 c.levels[0].feats[0].manualRequirements=true;d=derive(c,pack);assert(d.ctx.feats.some(s=>s.id==='feat:implant-training'));validateCharacter(JSON.parse(JSON.stringify(c)),pack);c.levels[0].feats[0].manualRequirements=false;assert(!derive(c,pack).ctx.feats.some(s=>s.id==='feat:implant-training'));
 const ctx=d.ctx;ctx.scores.cha=12;assert(!can('dreadful-countenance',ctx,{manualRequirements:true}));ctx.scores.cha=13;assert(can('dreadful-countenance',ctx,{manualRequirements:true}));assert(!can('dreadful-countenance',ctx));assert(can('dreadful-countenance',ctx,{}, {ignoreManual:true}));
 c.levels[0].feats[0].manualRequirements='yes';assert.throws(()=>validateCharacter(c,pack),/level choices/);
});
test('secondary enums have stable names, reject unknown values and prevent repeated identical choices',()=>{
 const ctx=derive(hero(),pack).ctx;assert(can('droid-focus',ctx,{choice:'1-degree'}));assert.equal(choiceName('1-degree',pack),'1st-Degree');assert.equal(featureChoices(feat('droid-focus'),pack).length,5);assert(!can('droid-focus',ctx,{choice:'6-degree'}));ctx.feats.push(f('droid-focus',{choice:'1-degree'}));assert(!can('droid-focus',ctx,{choice:'1-degree'}));assert(can('droid-focus',ctx,{choice:'2-degree'}));
 assert.equal(feat('nikto-survival').repeat,'never');assert.equal(featureChoices(feat('nikto-survival'),pack).length,5);
});
test('manual secondary choices remain pending, preserve text and compare repeated choices without case differences',()=>{
 const ctx=derive(hero(),pack).ctx,selection={choice:'manual:Force Recovery',manualRequirements:true};assert(can('recurring-success',ctx,selection));assert.equal(choiceName(selection.choice,pack),'Force Recovery');assert(!can('recurring-success',ctx,{...selection,pending:true}));assert(!can('recurring-success',ctx,{...selection,choice:'manual: '}));assert(!can('recurring-success',ctx,{...selection,choice:'manual:A|B'}));assert(!can('recurring-success',ctx,{...selection,choice:'manual:'+('x'.repeat(301))}));ctx.feats.push(f('recurring-success',selection));assert(!can('recurring-success',ctx,{...selection,choice:'manual:force recovery'}));assert(can('recurring-success',ctx,{...selection,choice:'manual:Indomitable'}));
});
test('new prerequisites distinguish exact Skill Focus fields, character level and explicit OR alternatives',()=>{
 const ctx=derive(hero(),pack).ctx;ctx.feats=[f('skill-focus',{choice:'skill:knowledge-bureaucracy'})];assert(!can('elder-s-knowledge',ctx));ctx.feats[0].choice='skill:knowledge-social-sciences';assert(can('elder-s-knowledge',ctx));
 ctx.feats=[f('tech-specialist')];ctx.characterLevel=8;assert(!can('superior-tech',ctx,{choice:'armor'}));ctx.characterLevel=9;assert(can('superior-tech',ctx,{choice:'armor'}));ctx.scores.int=16;assert(!can('superior-tech',ctx,{choice:'armor'}));
 ctx.feats=[f('gunnery-specialist')];ctx.trained.clear();assert(can('starship-tactics',ctx));assert.equal(feat('starship-tactics').repeat,'stack');ctx.feats=[];assert(!can('starship-tactics',ctx));ctx.trained.add('skill:pilot');ctx.feats.push(f('vehicular-combat'));assert(can('starship-tactics',ctx));
});
test('weapon and skill secondary choices retain printed restrictions without automating their effects',()=>{
 const ctx=derive(hero(),pack).ctx;ctx.feats=[f('double-attack',{choice:'pistols'})];assert(can('relentless-attack',ctx,{choice:'pistols'}));assert(!can('relentless-attack',ctx,{choice:'rifles'}));const choices=featureChoices(feat('return-fire'),pack);assert(!choices.includes('heavy-weapons'));assert(!choices.includes('equipment:atlatl'));assert(choices.includes('equipment:bowcaster'));ctx.feats=[f('quick-draw'),f('weapon-focus',{choice:'pistols'})];ctx.scores.dex=15;assert(can('return-fire',ctx,{choice:'pistols',manualRequirements:true}));assert(!can('return-fire',ctx,{choice:'rifles',manualRequirements:true}));
 ctx.isDroid=true;assert(!featureChoices(feat('logic-upgrade-skill-swap'),pack).includes('skill:use-the-force'));assert(!can('logic-upgrade-skill-swap',ctx,{choice:'skill:mechanics',manualRequirements:true}));assert(can('logic-upgrade-skill-swap',ctx,{choice:'skill:stealth',manualRequirements:true}));assert.deepEqual(feat('return-fire').effects,[]);
});
test('printed bonus lists include Scout Tech Specialist despite the missing category tag',()=>{
 assert(ix.classes.get('class:scout').bonusFeats.includes('feat:tech-specialist'));assert(ix.classes.get('class:soldier').bonusFeats.includes('feat:wookiee-grip'));assert(!ix.classes.get('class:jedi').bonusFeats.includes('feat:implant-training'));
});
test('graph availability offers manual confirmation without claiming the unconfirmed feat is possessed',()=>{
 const ctx=derive(hero(),pack).ctx,graph=featureGraph(pack,{type:'feats',ctx,allowedIds:['feat:implant-training'],selected:f('implant-training'),key:'manual'}),node=graph.nodes.get('feat:implant-training|');assert(node.available);assert(node.selected);assert(!node.owned);const confirmed=featureGraph(pack,{type:'feats',ctx,allowedIds:['feat:adaptable-talent'],selected:f('adaptable-talent',{choice:'manual:Indomitable',manualRequirements:true}),key:'manual-choice'});assert(confirmed.nodes.get('feat:adaptable-talent|').owned);assert.match(automationBadge(feat('implant-training')),/>Manual</);assert.match(automationBadge(feat('power-attack')),/>Partial</);
});
test('coverage metadata and enum choice definitions are validated, independent of effects',()=>{
 for(const edit of [p=>p.feats[0].automation='automatic',p=>p.feats[0].manualPrerequisites=[''],p=>p.feats.find(f=>f.choiceType==='enum').choiceOptions.push({id:'1-degree',name:'Duplicate'})]){const p=structuredClone(pack);edit(p);assert.throws(()=>validatePack(p));}
});
