import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,progression,indexPack,validateCharacter} from '../src/rules.js';
import {classEntry,recordPrivateerFall} from '../src/class-advancement.js';
import {damageOutcome} from '../src/incoming-damage.js';
import {take10Power} from '../src/force-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const feat=id=>({id:'feat:'+id}),talent=id=>({id:'talent:'+id});
function add(c,id,extra={}){const cls=ix.classes.get('class:'+id);c.levels.push({classId:cls.id,hpRoll:cls.hitDie,feats:[],talent:null,startingFeat:null,abilityIncreases:pack.rules.abilityLevels.includes(c.levels.length+1)?['str','dex']:[],trainedSkills:[],...extra});}
function soldier(){const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:10,wis:10,cha:10};c.levels[0].classId='class:soldier';c.trainedSkills=['skill:pilot','skill:perception','skill:endurance','skill:initiative'];c.levels[0].feats=[feat('martial-arts-i'),feat('point-blank-shot')];c.levels[0].talent=talent('armored-defense');for(let i=2;i<=7;i++)add(c,'soldier',{hpRoll:6,...(i===3?{feats:[feat('precise-shot')],talent:talent('juggernaut')}:i===6?{feats:[feat('quick-draw')]}:{})});return c;}
function jediEligible(){const c=soldier();c.levels[0].feats[0]=feat('force-sensitivity');c.trainedSkills[3]='skill:use-the-force';c.levels[2].feats=[feat('weapon-proficiency-lightsabers')];return c;}
function declarations(cls){return Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true]));}

test('all 32 prestige classes preserve printed BAB length, limits, hit dice, FP bases and schedules',()=>{
 const classes=pack.classes.filter(c=>c.classType==='prestige');assert.equal(classes.length,32);
 for(const c of classes){assert.equal(c.bab.length,c.maxLevel);assert.equal(c.startingHP,null);assert.deepEqual(c.bonusFeatLevels,[]);assert(c.article.blocks.length);}
 for(const name of ['Jedi Master','Sith Lord','Force Disciple'])assert.equal(classes.find(c=>c.name===name).maxLevel,5);
 assert.equal(ix.classes.get('class:elite-trooper').hitDie,12);assert.deepEqual(ix.classes.get('class:crime-lord').talentLevels,[1,2,3,4,5,6,7,8,9,10]);
 assert.equal(pack.classChoices.filter(r=>r.kind==='forceTechnique').length,57);assert.equal(pack.classChoices.filter(r=>r.kind==='forceSecret').length,15);assert.equal(pack.classChoices.filter(r=>r.kind==='medicalSecret').length,7);
});
test('prestige classes cannot start a character or qualify using the level they would grant',()=>{
 const c=soldier();c.levels[0].classId='class:gunslinger';assert.throws(()=>validateCharacter(c,pack),/prestige starting class/);
 const d=soldier();d.levels.pop();assert(!classEntry(ix.classes.get('class:gunslinger'),derive(d,pack).ctx,ix).available);add(d,'gunslinger');const result=derive(d,pack);assert.equal(result.level,6);assert(!result.ctx.classLevels.has('class:gunslinger'));assert(!Number.isNaN(result.bab));
});
test('Gunslinger uses its d8, defense bonus, pistol damage, FP base and independent schedules',()=>{
 const c=soldier();add(c,'gunslinger',{talent:talent('knack')});add(c,'gunslinger');c.inventory=[{id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,distance:1}];let d=derive(c,pack);assert.equal(d.level,9);assert.equal(d.bab,9);assert.equal(d.hp,82);assert.equal(d.forceMaximum,10);assert.equal(d.rows[8].slots.length,1);assert.equal(d.rows[8].slots[0].kind,'general');assert.equal(d.attacks.find(a=>a.uid===c.inventory[0].uid).damageBonus,6); // half level + Trusty + Point-Blank.
 add(c,'soldier');d=derive(c,pack);assert.equal(d.forceMaximum,10); // Heroic base 5 + half 5, not prestige base 6.
});
test('Elite Trooper grants d12 HP and nonstacking DR which Lightsabers bypass',()=>{
 const c=soldier();add(c,'elite-trooper',{talent:talent('indomitable')});add(c,'elite-trooper');let d=derive(c,pack);assert.equal(d.hp,90);assert.equal(d.classDR,1);assert.equal(d.normalProtection.dr,1);c.currentHP=100;assert.equal(damageOutcome(c,d,pack,10).hpDamage,9);assert.equal(damageOutcome(c,d,pack,10,{lightsaber:true}).hpDamage,10);
 c.protection.dr=5;d=derive(c,pack);assert.equal(damageOutcome(c,d,pack,10).hpDamage,5);
});
test('entry declarations are explicit, saved, closed and needed before granting the class',()=>{
 const c=jediEligible(),cls=ix.classes.get('class:jedi-knight');const ctx=derive(c,pack).ctx;assert(!classEntry(cls,ctx,ix).available);assert(classEntry(cls,ctx,ix,{entryDeclarations:declarations(cls)}).available);
 add(c,'jedi-knight',{entryDeclarations:declarations(cls),acquisitionDSS:0});validateCharacter(c,pack);assert.equal(derive(c,pack).level,8);
 const copy=structuredClone(c);copy.levels[7].entryDeclarations.fake=true;assert.throws(()=>validateCharacter(copy,pack),/declarations/);
});
test('earned Force Techniques qualify a later master class; extra or duplicate choices do not',()=>{
 const c=jediEligible(),cls=ix.classes.get('class:jedi-knight');for(let n=1;n<=5;n++)add(c,'jedi-knight',{entryDeclarations:declarations(cls),acquisitionDSS:0,classChoices:n===2?[{id:'classchoice:force-point-recovery'}]:n===4?[{id:'classchoice:force-power-mastery',choice:'power:battle-strike'}]:[]});let d=derive(c,pack);assert.equal(d.ctx.classChoices.length,2);assert.equal(d.rows[8].choiceSlots[0].kind,'forceTechnique');const master=ix.classes.get('class:jedi-master');assert(classEntry(master,d.ctx,ix,{entryDeclarations:declarations(master)}).available);
 for(let n=1;n<=5;n++)add(c,'jedi-master',{entryDeclarations:declarations(master),acquisitionDSS:0,classChoices:n>1?[{id:['classchoice:distant-power','classchoice:quicken-power','classchoice:enlarged-power','classchoice:devastating-power'][n-2]}]:[]});assert.equal(derive(c,pack).level,17);add(c,'jedi-master');d=derive(c,pack);assert.equal(d.level,17);assert(d.issues.some(s=>s.includes('maximum level 5')));
});
test('changing an earlier prerequisite blocks prestige benefits and later levels instead of producing NaN',()=>{
 const c=soldier();add(c,'gunslinger');add(c,'gunslinger');c.levels[5].feats=[];const d=derive(c,pack);assert.equal(d.level,7);assert.equal(d.hp,66);assert.equal(d.bab,7);assert.equal(d.forceMaximum,8);assert(!d.ctx.classLevels.has('class:gunslinger'));
});
test('Sith acquisition history survives lower current DSS while ongoing talents/defense bonuses deactivate',()=>{
 const c=jediEligible();c.darkSideScore=10;const cls=ix.classes.get('class:sith-apprentice');add(c,'sith-apprentice',{acquisitionDSS:10,entryDeclarations:declarations(cls),talent:talent('force-perception')});let d=derive(c,pack);assert.equal(d.level,8);assert.equal(d.defenses.will,20);assert(!d.ctx.inactiveTalents.has('talent:force-perception'));const hp=d.hp;
 c.darkSideScore=9;d=derive(c,pack);assert.equal(d.level,8);assert.equal(d.hp,hp);assert.equal(d.defenses.will,18);assert(d.ctx.inactiveTalents.has('talent:force-perception'));c.darkSideScore=10;assert(!derive(c,pack).ctx.inactiveTalents.has('talent:force-perception'));c.darkSideScore=11;assert(!derive(c,pack).ctx.inactiveTalents.has('talent:force-perception'));
 c.darkSideScore=10;for(let n=2;n<=5;n++)add(c,'sith-apprentice',{classChoices:n===2?[{id:'classchoice:force-point-recovery'}]:[]});const lord=ix.classes.get('class:sith-lord');add(c,'sith-lord',{acquisitionDSS:10,entryDeclarations:declarations(lord)});assert.equal(derive(c,pack).recovery.secondWind.daily,4);c.darkSideScore=9;assert.equal(derive(c,pack).recovery.secondWind.daily,3);
});

test('Power Mastery permits Take10 only for the selected power and spends its suite copy normally',()=>{
 const c=jediEligible();c.levels[5].feats=[feat('force-training')];const copy={id:crypto.randomUUID(),powerId:'power:battle-strike',spent:false};c.levels[5].forcePowers=[copy];const cls=ix.classes.get('class:jedi-knight');add(c,'jedi-knight',{entryDeclarations:declarations(cls),acquisitionDSS:0});add(c,'jedi-knight',{classChoices:[{id:'classchoice:force-power-mastery',choice:'power:battle-strike'}]});let d=derive(c,pack);assert(d.forcePowers[0].take10);take10Power(c,d,pack,copy.id);assert(copy.spent);assert(!c.forcePowerRecoveryPending);
 c.levels[8].classChoices=[];copy.spent=false;d=derive(c,pack);assert.throws(()=>take10Power(c,d,pack,copy.id),/Mastery required/);
});

test('Lure of Piracy records the advancement limit without stripping earned levels or resetting after atonement',()=>{
 const c=soldier(),d=derive(c,pack),cls=ix.classes.get('class:master-privateer');d.ctx.classLevels.set(cls.id,2);c.darkSideScore=d.scores.wis;recordPrivateerFall(c,d);assert.deepEqual(c.classBans,[{classId:cls.id,throughLevel:2}]);d.ctx.classBans=c.classBans;assert(!classEntry(cls,d.ctx,ix).available);c.darkSideScore=0;recordPrivateerFall(c,d);assert(!classEntry(cls,d.ctx,ix).available);
 d.ctx.classLevels.set(cls.id,1);assert(classEntry(cls,d.ctx,ix).available);const copy=structuredClone(c);copy.classBans[0].throughLevel=0;assert.throws(()=>validateCharacter(copy,pack),/restriction/);
});
