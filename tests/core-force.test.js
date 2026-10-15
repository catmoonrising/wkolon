import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack,eligible,talentTrees} from '../src/rules.js';
import {usePower,recoverPower,recoverSuite} from '../src/force-powers.js';
import {featureGraph} from '../src/feature-trees.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const feat=id=>({id:'feat:'+id}),talent=id=>({id:'talent:'+id});
const copy=(name,spent=false)=>({id:crypto.randomUUID(),powerId:'power:'+name,spent});
function hero(cls='jedi'){const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:10,dex:8,con:10,int:10,wis:12,cha:18};c.levels[0].classId='class:'+cls;c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[feat('force-training'),feat('toughness')];c.levels[0].talent=talent('force-perception');c.levels[0].forcePowers=[copy('farseeing'),copy('battle-strike')];return c;}
function add(c,{feats=[],t=null,increases=[],powers=[]}={}){c.levels.push({classId:c.levels[0].classId,hpRoll:4,feats,talent:t,startingFeat:null,abilityIncreases:increases,trainedSkills:[],forcePowers:powers});}

test('all four Core Force trees and sixteen powers have reviewed articles, with Corruption kept separate',()=>{
 const coreTrees=['tree:alter','tree:control','tree:dark-side','tree:sense'];
 assert(coreTrees.every(id=>pack.rules.forceTalentAccess.trees.includes(id)));
 const coreTalents=pack.talents.filter(t=>coreTrees.includes(t.tree)&&pack.catalog.records.some(r=>r.kind==='talent'&&r.mechanicsIds.includes(t.id)&&r.books.includes('Core Rulebook')));
 assert.equal(coreTalents.length,16);
 assert(pack.forcePowers.length>=16);
 for(const r of [...pack.forcePowers.slice(0,16),...coreTalents]){
  assert(articleText(r.article).includes('Core Rulebook'));assert(pack.catalog.records.some(c=>c.mechanicsIds.includes(r.id)&&c.status==='available'));
 }
 assert(!pack.forcePowers.slice(0,16).some(r=>r.name==='Corruption'));assert(pack.forcePowers.some(r=>r.id==='power:corruption'));
 const corruption=pack.catalog.records.find(r=>r.kind==='forcePower'&&r.name==='Corruption');assert.deepEqual(corruption.books,['Force Unleashed Campaign Guide']);assert.equal(corruption.status,'available');
 const powerText=articleText(pack.rulePages.find(r=>r.id===corruption.ruleId).article),destinyText=articleText(pack.rulePages.find(r=>r.id==='rule:corruption').article);
 assert(powerText.includes('bolt of pure Dark Side'));assert(!powerText.includes('Destiny Bonus'));assert(destinyText.includes('Destiny Bonus'));assert(!destinyText.includes('bolt of pure Dark Side'));
 const bad=structuredClone(pack);bad.forcePowers[0].descriptors=['invented'];assert.throws(()=>validatePack(bad));
 const badRecovery=structuredClone(pack);badRecovery.rules.forcePowerRecovery.forcePointCost=0;assert.throws(()=>validatePack(badRecovery));
});

test('Force Sensitivity opens Force trees on every heroic class without granting extra talent slots',()=>{
 for(const cls of pack.classes.filter(r=>r.classType!=='prestige')){const c=hero(cls.id.slice(6));c.levels[0].feats=[feat('force-sensitivity'),feat('toughness')];c.levels[0].forcePowers=[];
  const d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:force-perception'),cls.name);assert.equal(talentTrees(cls,d.ctx,pack).length,cls.talentTrees.length+pack.rules.forceTalentAccess.trees.length);
  add(c,{t:talent('force-pilot')});assert(derive(c,pack).issues.some(s=>s.includes('talent is not available')));
  if(cls.id!=='class:jedi'){c.levels[0].feats=[];c.houseRules={jediCounseling:{'jc:106-jedi-multiclassing':false}};const noForce=derive(c,pack);assert(!noForce.ctx.talents.length);assert.deepEqual(talentTrees(cls,noForce.ctx,pack),cls.talentTrees);}
 }
 const c=hero('scout');c.species='species:yuuzhan-vong-core-rulebook';c.levels[0].feats=[feat('force-sensitivity')];assert(!derive(c,pack).ctx.talents.length);
});

test('Force Training permits duplicate copies and replay enforces slots, prerequisites and learning order',()=>{
 const c=hero();c.levels[0].forcePowers=[copy('farseeing'),copy('farseeing')];let d=derive(c,pack);assert.equal(d.powerSlots,2);assert.equal(d.forcePowers.length,2);assert.notEqual(d.forcePowers[0].copyId,d.forcePowers[1].copyId);validateCharacter(c,pack);
 c.levels[0].forcePowers.push(copy('surge'));d=derive(c,pack);assert.equal(d.forcePowers.length,2);assert(d.issues.some(s=>s.includes('choose 2 Force powers (3 selected)')));
 c.levels[0].feats=[feat('force-training'),feat('force-training')];d=derive(c,pack);assert.equal(d.powerSlots,4);
 c.trainedSkills=[];assert.equal(derive(c,pack).powerSlots,0);assert.equal(derive(c,pack).forcePowers.length,0);
 const s=hero('scout');s.levels[0].feats=[feat('force-training'),feat('force-sensitivity')];assert.equal(derive(s,pack).powerSlots,0);
 const malformed=hero();malformed.levels[0].forcePowers[1].id=malformed.levels[0].forcePowers[0].id;assert.throws(()=>validateCharacter(malformed,pack),/Force power copy/);
});

test('permanent Wisdom gains add powers chronologically, including increases between negative modifiers',()=>{
 const c=hero();c.abilities.wis=7;c.levels[0].forcePowers=[copy('farseeing')];add(c);add(c,{feats:[feat('force-training')],t:talent('force-pilot'),powers:[copy('surge')]});add(c,{increases:['wis','str'],powers:[copy('battle-strike'),copy('surge')]});
 const d=derive(c,pack);assert.deepEqual(d.rows.map(r=>r.powerChoices),[1,0,1,2]);assert.equal(d.powerSlots,4);assert.equal(d.forcePowers.length,4);
 c.levels[3].abilityIncreases=['str','dex'];assert.equal(derive(c,pack).powerSlots,2);assert.equal(derive(c,pack).forcePowers.length,2);
 const high=hero();high.abilities.wis=11;high.levels[0].forcePowers=[copy('farseeing')];add(high);add(high,{feats:[feat('force-training')],t:talent('force-pilot'),powers:[copy('surge')]});add(high,{increases:['wis','str'],powers:[copy('battle-strike'),copy('surge')]});assert.equal(derive(high,pack).powerSlots,4);
});

test('Visions needs previously learned Farseeing and shows a small power prerequisite in its graph',()=>{
 const c=hero();add(c);add(c,{t:talent('visions')});assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:visions'));
 c.levels[0].forcePowers=[copy('surge'),copy('battle-strike')];add(c,{increases:['wis','str']});add(c);add(c,{feats:[feat('force-training')],powers:[copy('farseeing'),copy('surge')]});assert(!derive(c,pack).ctx.talents.some(t=>t.id==='talent:visions'));
 const graph=featureGraph(pack,{type:'talents',ctx:derive(c,pack).ctx,allowedIds:['talent:visions']});assert([...graph.nodes.values()].some(n=>!n.main&&n.name==='Farseeing'));
});

test('Dark Side acquisition survives atonement, becomes inactive at zero and cannot supply new prerequisites',()=>{
 const c=hero();c.darkSideScore=1;c.levels[0].talent={...talent('power-of-the-dark-side'),darkSideScore:1};c.levels[0].forcePowers=[copy('surge'),copy('battle-strike')];validateCharacter(c,pack);
 c.darkSideScore=0;let d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:power-of-the-dark-side'));assert(d.ctx.inactiveTalents.has('talent:power-of-the-dark-side'));assert(renderStatBlock(c,d,pack).includes('Power of the Dark Side (Inactive)'));
 const ix=indexPack(pack),r=ix.talents.get('talent:swift-power');assert(!eligible(r,{id:r.id},d.ctx,ix,'talents'));
 c.darkSideScore=1;d=derive(c,pack);assert.equal(d.ctx.inactiveTalents.size,0);assert(eligible(r,{id:r.id},d.ctx,ix,'talents'));
 add(c);add(c,{t:{...talent('swift-power'),darkSideScore:1}});c.darkSideScore=0;d=derive(c,pack);assert.equal(d.ctx.inactiveTalents.size,2);assert.equal(d.ctx.talents.length,2);
 c.levels[0].talent=talent('force-pilot');assert(!derive(c,pack).ctx.talents.some(t=>t.id==='talent:swift-power'));
 const bad=hero();bad.levels[0].talent=talent('power-of-the-dark-side');assert.throws(()=>validateCharacter(bad,pack),/acquisition DSS/);
});

test('Force Perception retains native checks until specific uses are selected; Force Pilot substitutes unconditionally',()=>{
 const c=hero(),get=(d,id)=>d.skills.find(s=>s.id==='skill:'+id);let d=derive(c,pack);assert(get(d,'perception').trained);assert.equal(get(d,'perception').checkSource,'skill:perception');
 c.skillCheckSources={'skill:perception':'skill:use-the-force'};d=derive(c,pack);assert.equal(get(d,'perception').total,get(d,'use-the-force').total);assert(get(d,'perception').breakdown.includes('Avoid Surprise, Notice Targets, Sense Deception, Sense Influence'));
 add(c);add(c,{t:talent('force-pilot')});d=derive(c,pack);assert(get(d,'pilot').trained);assert.equal(get(d,'pilot').checkSource,'skill:use-the-force');
 c.levels[0].talent=null;d=derive(c,pack);assert.equal(get(d,'perception').checkSource,'skill:perception');assert(!get(d,'perception').trained);
});

test('using powers spends the chosen copy even on failure, increments DSS, and defers natural-20 recovery',()=>{
 const c=hero();c.levels[0].forcePowers=[copy('force-lightning'),copy('force-lightning')];let d=derive(c,pack);
 usePower(c,d,pack,d.forcePowers[0].copyId,1);assert(c.levels[0].forcePowers[0].spent);assert(!c.levels[0].forcePowers[1].spent);assert.equal(c.darkSideScore,1);assert(!c.forcePowerRecoveryPending);
 d=derive(c,pack);assert.throws(()=>usePower(c,d,pack,d.forcePowers[0].copyId,20),/unavailable/);
 usePower(c,d,pack,d.forcePowers[1].copyId,20);assert(c.forcePowerRecoveryPending);assert(c.levels[0].forcePowers.every(p=>p.spent));
 recoverSuite(c,derive(c,pack),{endTurn:true});assert(c.levels[0].forcePowers.every(p=>!p.spent));assert.equal(c.forcePowerRecoveryPending,false);assert.throws(()=>recoverSuite(c,derive(c,pack),{endTurn:true}),/pending/);
 c.darkSideScore=c.abilities.wis;usePower(c,derive(c,pack),pack,c.levels[0].forcePowers[0].id,12);assert.equal(c.darkSideScore,c.abilities.wis);
 c.condition=5;assert.throws(()=>usePower(c,derive(c,pack),pack,c.levels[0].forcePowers[1].id,12),/unavailable/);
});

test('Force Point recovery charges the current pool and rest recovers only earned copies',()=>{
 const c=hero();c.levels[0].forcePowers.forEach(p=>p.spent=true);const extra=copy('surge',true);c.levels[0].forcePowers.push(extra);c.forcePoints=100;let d=derive(c,pack);
 recoverPower(c,d,pack,d.forcePowers[0].copyId);assert.equal(c.forcePoints,d.forceCurrent-1);assert(!c.levels[0].forcePowers[0].spent);assert(c.levels[0].forcePowers[1].spent);
 c.forcePoints=0;assert.throws(()=>recoverPower(c,derive(c,pack),pack,c.levels[0].forcePowers[1].id),/Cannot recover/);
 recoverSuite(c,derive(c,pack));assert(!c.levels[0].forcePowers[1].spent);assert(extra.spent);
 c.levels[0].feats=[];assert.throws(()=>usePower(c,derive(c,pack),pack,c.levels[0].forcePowers[1].id,10),/unavailable/);
});
