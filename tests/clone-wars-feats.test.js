import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,eligible,validateCharacter} from '../src/rules.js';
import {declareDefenseStance} from '../src/defensive-combat.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {combineArmorDefenses} from '../src/armor.js';
import {damageOutcome} from '../src/incoming-damage.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const f=id=>({id:'feat:'+id}),item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const ids=['anointed-hunter','artillery-shot','coordinated-barrage','droid-hunter','droidcraft','experienced-medic','expert-droid-repair','flash-and-clear','flood-of-fire','grand-army-of-the-republic-training','gunnery-specialist','jedi-familiarity','leader-of-droids','overwhelming-attack','pall-of-the-dark-side','separatist-military-training','spray-shot','trench-warrior','unstoppable-force','unwavering-resolve','wary-defender'];
function hero(){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:12,wis:12,cha:10};c.trainedSkills=['skill:perception','skill:endurance','skill:pilot','skill:jump'];c.levels=Array.from({length:6},(_,i)=>({classId:'class:soldier',hpRoll:i?6:null,feats:i===0?[f('unstoppable-force'),f('grand-army-of-the-republic-training')]:i===1?[f('wary-defender')]:i===2?[f('unwavering-resolve')]:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));return c;}
const conditional=(d,key,against)=>d.conditionalDefenses.find(r=>r.defense===key&&r.against===against);
test('all 21 Clone Wars feats retain full source text and correct class bonus access',()=>{
 validatePack(pack);for(const id of ids){const r=ix.feats.get('feat:'+id);assert(r);assert(articleText(r.article).includes('Effect:'));assert(pack.catalog.records.some(c=>c.mechanicsIds.includes(r.id)&&c.status==='available'&&c.books.includes('Clone Wars Campaign Guide')));}
 const expected={jedi:['unstoppable-force','unwavering-resolve','wary-defender'],noble:['experienced-medic','leader-of-droids','unwavering-resolve','wary-defender'],scoundrel:['droid-hunter','droidcraft','expert-droid-repair','overwhelming-attack'],scout:['droid-hunter','droidcraft','expert-droid-repair','flash-and-clear'],soldier:['artillery-shot','coordinated-barrage','droid-hunter','experienced-medic','flash-and-clear','flood-of-fire','grand-army-of-the-republic-training','gunnery-specialist','overwhelming-attack','separatist-military-training','trench-warrior','unstoppable-force','wary-defender']};for(const [cls,values]of Object.entries(expected))assert.deepEqual(ix.classes.get('class:'+cls).bonusFeats.filter(id=>ids.includes(id.slice(5))).sort(),values.map(id=>'feat:'+id).sort());
});
test('Nelvaanian applies only its printed adjustments, vision, speed, language and first-level Primitive exclusions',()=>{
 const c=hero();c.species='species:nelvaanian';let d=derive(c,pack);assert.equal(d.scores.int,10);assert.equal(d.scores.wis,14);assert.equal(d.vision,'low-light');assert.equal(d.speed,6);assert.deepEqual(ix.species.get(c.species).languages,['Nelvaanese']);assert.equal(ix.species.get(c.species).scentRange,10);assert(!d.ctx.feats.some(f=>['feat:weapon-proficiency-rifles','feat:weapon-proficiency-pistols','feat:weapon-proficiency-heavy-weapons'].includes(f.id)&&f.automatic));assert(d.ctx.feats.some(f=>f.id==='feat:armor-proficiency-light'&&f.automatic));c.levels[2].feats=[f('weapon-proficiency-pistols')];assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:weapon-proficiency-pistols'&&!f.automatic));validateCharacter(c,pack);const text=articleText(ix.species.get(c.species).article);assert(text.includes('Shadow Swiftness')&&text.includes('Anointed Hunter'));
});
test('Clone Wars prerequisites include species, trained skills, BAB, armor and Dark Side Score',()=>{
 const ctx=derive(hero(),pack).ctx,can=id=>eligible(ix.feats.get('feat:'+id),f(id),ctx,ix,'feats');assert(!can('anointed-hunter'));ctx.speciesName='Nelvaanian';assert(can('anointed-hunter'));assert(!can('droidcraft'));ctx.trained.add('skill:mechanics');assert(can('droidcraft')&&can('expert-droid-repair'));assert(!can('coordinated-barrage'));ctx.feats.push(f('coordinated-attack'));assert(can('coordinated-barrage'));ctx.bab=4;assert(!can('coordinated-barrage'));ctx.darkSideScore=0;assert(!can('pall-of-the-dark-side'));ctx.darkSideScore=1;assert(can('pall-of-the-dark-side'));ctx.feats=ctx.feats.filter(f=>f.id!=='feat:grand-army-of-the-republic-training');assert(can('grand-army-of-the-republic-training'));
});
test('Unstoppable Force and Unwavering Resolve produce conditional defenses without changing ordinary totals',()=>{
 const c=hero();let d=derive(c,pack),ordinary=d.defenses;assert.equal(conditional(d,'fortitude','use-the-force').total,d.defenses.fortitude+5);assert.equal(conditional(d,'will','use-the-force').total,d.defenses.will+5);assert.equal(conditional(d,'will','deception-or-persuasion').total,d.defenses.will+5);c.levels[0].feats=[];c.levels[2].feats=[];assert.deepEqual(derive(c,pack).defenses,ordinary);
 c.species='species:hutt';c.levels[0].feats=[f('unstoppable-force')];d=derive(c,pack);assert.equal(conditional(d,'will','use-the-force').total,d.defenses.will+10);assert(renderStatBlock(c,d,pack).includes('vs. Use the Force'));
});
test('Wary Defender applies typed Fortitude/Will bonuses to both defensive modes, threshold and next-turn expiry',()=>{
 for(const mode of ['fight','total']){const c=hero(),before=derive(c,pack);declareDefenseStance(c,before,mode);const d=derive(c,pack);assert.equal(d.defenses.fortitude,before.defenses.fortitude+2);assert.equal(d.defenses.will,before.defenses.will+2);assert.equal(d.threshold,before.threshold+2);c.flatFooted=true;assert.equal(derive(c,pack).defenses.will,d.defenses.will);startNextTurn(c);c.flatFooted=false;assert.deepEqual(derive(c,pack).defenses,before.defenses);validateCharacter(c,pack);}
});
test('Grand Army training copies only proficient armor equipment bonuses, including Second Skin',()=>{
 const c=hero(),before=derive(c,pack);c.inventory=[item('knighthunter-armor')];let d=derive(c,pack);assert.equal(d.defenses.will,before.defenses.will+2);assert.equal(conditional(d,'will','use-the-force').total,d.defenses.will+8,'Only +3 additional Equipment stacks over +2 ordinary Equipment, plus +5 insight');c.levels[0].talent={id:'talent:armored-defense'};c.levels[2].talent={id:'talent:second-skin'};d=derive(c,pack);assert.equal(d.defenses.will,before.defenses.will+3);assert.equal(conditional(d,'will','use-the-force').total,d.defenses.will+7);c.levels[0].classId='class:scout';c.levels[0].talent=null;c.levels[2].talent=null;d=derive(c,pack);assert.equal(d.defenses.will,before.defenses.will);assert.equal(conditional(d,'will','use-the-force').total,d.defenses.will+5,'Unproficient armor supplies no Equipment bonus');
});
test('conditional Equipment bonuses replace ordinary Equipment instead of stacking',()=>{
 assert.equal(combineArmorDefenses([],[{defense:'will',against:'use-the-force',type:'equipment',amount:5}],{will:20},{will:2})[0].total,23);assert.equal(combineArmorDefenses([],[{defense:'will',against:'use-the-force',type:'equipment',amount:2}],{will:20},{will:5})[0].total,20);
});
test('Use the Force incoming damage uses the conditional Fortitude threshold and preserves the ordinary case',()=>{
 const c=hero(),d=derive(c,pack),amount=d.threshold;assert.equal(damageOutcome(c,d,pack,amount).conditionSteps,1);const force=damageOutcome(c,d,pack,amount,{requiresUseTheForce:true});assert.equal(force.threshold,d.threshold+5);assert.equal(d.conditionalThresholds.find(r=>r.against==='use-the-force').total,force.threshold);assert.equal(force.conditionSteps,0);assert.equal(damageOutcome(c,d,pack,d.threshold+5,{requiresUseTheForce:true}).conditionSteps,1);assert.throws(()=>damageOutcome(c,d,pack,amount,{requiresUseTheForce:'yes'}),/declaration/);
});
