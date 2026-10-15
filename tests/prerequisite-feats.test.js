import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,eligible,validateCharacter} from '../src/rules.js';
import {classEntry} from '../src/class-advancement.js';
import {declareFlurry,declareDefenseStance} from '../src/defensive-combat.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {rollRoutine} from '../src/combat.js';
import {planCharge} from '../src/charge.js';
import {featureGraph} from '../src/feature-trees.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const f=(n,choice)=>({id:'feat:'+n,...(choice?{choice}:{})}),t=n=>({id:'talent:'+n});
function add(c,id='soldier'){const r=ix.classes.get('class:'+id),n=c.levels.length+1;c.levels.push({classId:r.id,hpRoll:Math.floor(r.hitDie/2)+1,feats:[],talent:null,startingFeat:null,abilityIncreases:pack.rules.abilityLevels.includes(n)?['str','con']:[],trainedSkills:[]});}
function soldier(level=7){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:13,dex:16,con:14,int:10,wis:10,cha:10};c.levels[0].classId='class:soldier';c.trainedSkills=['skill:initiative','skill:perception','skill:endurance','skill:pilot'];c.levels[0].feats=[f('martial-arts-i'),f('flurry')];c.levels[0].talent=t('armored-defense');
 for(let n=2;n<=level;n++)add(c);return c;
}
function weapon(c,id,extra={}){const e={id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,distance:1,...extra};c.inventory.push(e);return e;}
const declarations=cls=>Object.fromEntries((cls.entrySpecials||[]).map(s=>[s.id,true]));
test('all ten prerequisite feats retain source articles and the correct heroic bonus lists',()=>{
 assert(pack.feats.length>=80);
 const newFeats=pack.feats.slice(70,80);assert.equal(newFeats.length,10);newFeats.forEach(r=>assert(r.article.blocks.length));
 for(const id of ['jedi','noble','soldier'])assert(ix.classes.get('class:'+id).bonusFeats.includes('feat:flurry'));
 for(const id of ['noble','scoundrel'])assert(ix.classes.get('class:'+id).bonusFeats.includes('feat:biotech-specialist'));
 for(const c of pack.classes)assert(!c.bonusFeats.includes('feat:echani-training'));
});
test('Wrruushi requires Wookiee ancestry, Constitution and Martial Arts; other martial feat requirements are explicit',()=>{
 const c=soldier(),ctx=derive(c,pack).ctx,r=ix.feats.get('feat:wrruushi-training');assert(!eligible(r,f('wrruushi-training'),ctx,ix,'feats'));ctx.speciesName='Wookiee';assert(eligible(r,f('wrruushi-training'),ctx,ix,'feats'));ctx.speciesName='Wookiee (Core Rulebook)';assert(eligible(r,f('wrruushi-training'),ctx,ix,'feats'));ctx.scores.con=12;assert(!eligible(r,f('wrruushi-training'),ctx,ix,'feats'));
 const graph=featureGraph(pack,{type:'feats',ctx,allowedIds:[r.id]});assert([...graph.nodes.values()].some(n=>n.name==='Wookiee'&&!n.main));
 const h=ix.feats.get('feat:hijkata-training');assert(!eligible(h,f('hijkata-training'),ctx,ix,'feats'));ctx.feats.push(f('combat-reflexes'));assert(eligible(h,f('hijkata-training'),ctx,ix,'feats'));
});
test('Flurry can replace Point-Blank Shot for Elite Trooper entry',()=>{
 const c=soldier(),d=derive(c,pack);assert(!d.ctx.feats.some(f=>f.id==='feat:point-blank-shot'));assert(classEntry(ix.classes.get('class:elite-trooper'),d.ctx,ix).available);
 c.levels[0].feats[1]=null;assert(!classEntry(ix.classes.get('class:elite-trooper'),derive(c,pack).ctx,ix).available);
});
test('martial training enables Martial Arts Master without changing its other entry requirements',()=>{
 const c=soldier();c.abilities.int=14;c.levels[0].talent=t('melee-smash');c.levels[2].feats=[f('echani-training')];c.levels[5].feats=[f('martial-arts-ii'),f('melee-defense')];const cls=ix.classes.get('class:martial-arts-master'),d=derive(c,pack);
 assert(classEntry(cls,d.ctx,ix,{entryDeclarations:declarations(cls)}).available);
 c.levels[2].feats=[];assert(!classEntry(cls,derive(c,pack).ctx,ix,{entryDeclarations:declarations(cls)}).available);
});
test('Biotech Specialist enables a properly qualified Yuuzhan Vong Shaper and cannot be selected untrained',()=>{
 const c=soldier();c.species='species:yuuzhan-vong-core-rulebook';c.levels[0].classId='class:scout';c.trainedSkills=['skill:mechanics','skill:knowledge-life-sciences','skill:survival','skill:initiative','skill:perception'];c.levels[0].feats=[f('biotech-specialist')];c.levels[0].talent=t('acute-senses');c.levels[1].startingFeat=f('weapon-proficiency-pistols');c.levels[2].feats=[f('skill-training','skill:treat-injury')];const d=derive(c,pack),cls=ix.classes.get('class:shaper');assert(classEntry(cls,d.ctx,ix,{entryDeclarations:declarations(cls)}).available);
 d.ctx.trained.delete('skill:mechanics');assert(!eligible(ix.feats.get('feat:biotech-specialist'),f('biotech-specialist'),d.ctx,ix,'feats'));
});
test('Flurry applies to melee attacks, stacks with defensive combat and expires on the next turn',()=>{
 const c=soldier(),p=weapon(c,'blaster-pistol');let d=derive(c,pack);const ref=d.defenses.reflex,melee=d.attacks.find(a=>a.uid===c.id).attack,ranged=d.attacks.find(a=>a.uid===p.uid).attack;assert(d.flurry.available);declareFlurry(c,d);d=derive(c,pack);assert.equal(d.defenses.reflex,ref-5);assert.equal(d.attacks.find(a=>a.uid===c.id).attack,melee+2);assert.equal(d.attacks.find(a=>a.uid===p.uid).attack,ranged);
 declareDefenseStance(c,d,'fight');d=derive(c,pack);assert.equal(d.attacks.find(a=>a.uid===c.id).attack,melee-3);assert.equal(d.defenses.reflex,ref-3);
 assert.throws(()=>declareFlurry(c,d),/Used this turn/);startNextTurn(c);d=derive(c,pack);assert.equal(d.defenses.reflex,ref);assert.equal(d.attacks.find(a=>a.uid===c.id).attack,melee);validateCharacter(c,pack);
 const copy=structuredClone(c);copy.flurry='yes';assert.throws(()=>validateCharacter(copy,pack),/Flurry/);
});
test('Flurry rejects larger ordinary weapons, permits Lightsabers, and retains the Reflex penalty after an ineligible weapon switch',()=>{
 const c=soldier(),w=weapon(c,'blaster-rifle');let d=derive(c,pack);assert(!d.flurry.available);assert.throws(()=>declareFlurry(c,d),/Light Weapons/);w.id='equipment:lightsaber';d=derive(c,pack);assert(d.flurry.available);declareFlurry(c,d);const ref=derive(c,pack).defenses.reflex;w.id='equipment:blaster-rifle';d=derive(c,pack);assert.equal(d.flurry.attackBonus,0);assert.equal(d.defenses.reflex,ref);
});
test('Tae-Jitsu advances unarmed critical dice before multiplication, including Charge, without changing normal damage',()=>{
 const c=soldier(6);c.levels[0].feats=[f('martial-arts-i'),f('dodge')];c.levels[0].talent=t('melee-smash');c.levels[2].feats=[f('tae-jitsu-training')];c.levels[5].feats=[f('powerful-charge')];let d=derive(c,pack),a=d.attacks.find(a=>a.uid===c.id);assert.match(a.damageDisplay,/^1d6/);assert.match(a.criticalDamageDisplay,/^1d8/);
 const routine={steps:[{attackId:c.id,count:1,attackMod:0,damageMod:0}]},expressions=[],roller=expr=>{expressions.push(expr);return expressions.length===1?{value:20+a.attack,d20:[20],display:'20'}:{value:20,display:'20'};};assert(rollRoutine(routine,[a],pack.rules.combat,roller).results[0].critical);assert.match(expressions[1],/^\(1d8[+]6\)[*]2$/);
 c.chargePath={squares:2};const charged=planCharge(c,d,pack,c.id).attack;assert.match(charged.criticalDamageDisplay,/1d8[+]6[+]3/);
});
test('Tae-Jitsu criticals preserve Mighty Swing consumption and cap dice at d12',()=>{
 const c=soldier(6);c.levels[0].feats=[f('martial-arts-i'),f('dodge')];c.levels[0].talent=t('melee-smash');c.levels[2].feats=[f('tae-jitsu-training')];c.levels[5].feats=[f('mighty-swing')];c.mightySwing=true;const d=derive(c,pack),a=d.attacks.find(a=>a.uid===c.id);const expressions=[];let attacks=0;rollRoutine({steps:[{attackId:c.id,count:2,attackMod:0,damageMod:0}]},[a],pack.rules.combat,expr=>{expressions.push(expr);if(expr.startsWith('1d20')){attacks++;const die=attacks===1?10:20;return {value:die+a.attack,d20:[die],display:String(die)};}return {value:20,display:'20'};});assert.match(expressions[3],/^\(1d8[+]6\)[*]2$/);
 c.species='species:hutt';c.abilities.dex=26;c.levels[0].feats=[f('martial-arts-i')];c.levels[1].feats=[f('dodge')];c.levels[3].feats=[f('martial-arts-ii')];c.levels[5].feats=[f('martial-arts-iii')];c.mightySwing=false;const capped=derive(c,pack).attacks.find(a=>a.uid===c.id);assert.match(capped.damageDisplay,/^1d12/);assert.equal(capped.criticalDamageDisplay,undefined);
});

test('Flurry weapon-change alternative retains the bonus but never bypasses declaration eligibility',()=>{
 const c=soldier(),w=weapon(c,'blaster-pistol');const before=derive(c,pack);declareFlurry(c,before);w.id='equipment:blaster-rifle';assert.equal(derive(c,pack).flurry.attackBonus,0);
 c.houseRules={ambiguities:{'ambiguity:flurry-weapon-change':'retain-bonus'}};let d=derive(c,pack);assert.equal(d.flurry.attackBonus,2);assert.equal(d.defenses.reflex,before.defenses.reflex-5);validateCharacter(c,pack);
 startNextTurn(c);d=derive(c,pack);assert.equal(d.flurry.attackBonus,0);assert.equal(d.defenses.reflex,before.defenses.reflex);assert.throws(()=>declareFlurry(c,d),/Light Weapons/);
});
