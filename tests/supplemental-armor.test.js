import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {damageOutcome,applyIncomingDamage} from '../src/incoming-damage.js';
import {armorExclusive} from '../src/armor.js';
import {purchaseQuote} from '../src/equipment.js';
import {renderStatBlock} from '../src/stat-block.js';
import {healthBars} from '../src/combat-ui.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const feat=id=>({id:'feat:'+id});
const item=id=>({uid:crypto.randomUUID(),id:'equipment:'+id,quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
function hero(cls='soldier'){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:18,con:12,int:12,wis:10,cha:10};c.levels[0].classId='class:'+cls;c.levels[0].feats=[];c.inventory=[];return c;}
const skill=(d,id)=>d.skills.find(s=>s.id==='skill:'+id).total;

test('supplemental armor has reviewed stats, source articles and unlisted prices stay owned-only',()=>{
 assert.equal(pack.equipment.filter(r=>r.kind==='armor'&&!r.energyShield).length,66);
 for(const name of ['AV-1C Combat Armor','Katarn-Class Commando Armor','Dark Armor','Orbalisk Armor','Darth Revan\'s Armor']){
  const r=pack.equipment.find(r=>r.name===name);assert(r?.article?.blocks.length);assert(pack.sources.some(s=>s.id===r.sourceId));
 }
 const c=hero();assert.equal(purchaseQuote({id:'equipment:darth-revan-s-armor'},1,pack,c).total,null);
 const quote=purchaseQuote({id:'equipment:av-1c-combat-armor',armorSize:'small'},1,pack,c);assert.equal(quote.total,13750);assert.equal(quote.item.weight,12.5);
 assert.equal(pack.equipment.find(r=>r.id==='equipment:neo-crusader-light-armor-kotor').cost,null);
 assert.equal(pack.equipment.find(r=>r.id==='equipment:neo-crusader-light-armor-web-enhancements').cost,3000);
});

test('tandem items coexist with body armor and both printed Dexterity caps and penalties apply',()=>{
 const c=hero('scoundrel');c.inventory=[item('battle-armor'),item('thinsuit')];let d=derive(c,pack);
 assert(!d.issues.includes('Only one suit of armor can be equipped'));assert.equal(d.defenses.reflex,22);
 assert.equal(skill(d,'acrobatics'),-3); // DEX +4, Medium −5, Light −2.
 c.inventory.push(item('heavy-battle-armor'));assert(derive(c,pack).issues.includes('Only one suit of armor can be equipped'));
 const body=pack.equipment.find(r=>r.id==='equipment:battle-armor'),tandem=pack.equipment.find(r=>r.id==='equipment:thinsuit');
 assert(armorExclusive(body,body));assert(!armorExclusive(body,tandem));assert(!armorExclusive(tandem,body));
});

test('unlisted Dex cap stays unrestricted and cannot silently turn into a zero cap',()=>{
 const c=hero();c.inventory=[item('darth-revan-s-armor')];assert.equal(derive(c,pack).defenses.reflex,22);
 c.inventory.push(item('thinsuit'));c.abilities.dex=30;assert.equal(derive(c,pack).defenses.reflex,24);
});

test('Equipment skill bonuses require proficiency and conditional checks remain explicit',()=>{
 const c=hero();c.inventory=[item('camo-armor')];const baseline=skill(derive(c,pack),'stealth');
 c.armorChecks={hiding:true};assert.equal(skill(derive(c,pack),'stealth'),baseline+10);
 c.levels[0].classId='class:scoundrel';assert.equal(skill(derive(c,pack),'stealth'),baseline-5);
 c.levels[0].classId='class:soldier';c.inventory=[item('camo-scout-armor')];assert.equal(skill(derive(c,pack),'stealth'),baseline+5);
 c.inventory=[item('shadowsuit')];c.armorChecks={};assert.equal(skill(derive(c,pack),'stealth'),baseline);
 c.armorChecks.darkness=true;assert.equal(skill(derive(c,pack),'stealth'),baseline+5);
 c.inventory=[item('seatrooper-armor')];assert.equal(skill(derive(c,pack),'swim'),4);
});

test('Katarn perception and vision preserve the printed Heavy requirement for a Medium suit',()=>{
 const c=hero();c.inventory=[item('katarn-class-commando-armor')];let d=derive(c,pack);assert.equal(skill(d,'perception'),0);assert.notEqual(d.vision,'low-light');
 c.levels[0].feats=[feat('armor-proficiency-heavy')];d=derive(c,pack);assert.equal(skill(d,'perception'),2);assert.equal(d.vision,'low-light');assert(renderStatBlock(c,d,pack).includes('Low-Light Vision'));
 c.attackTarget={darkness:true,concealment:'concealment'};c.inventory.push(item('blaster-pistol'));const lit=derive(c,pack).attacks[0].attack;c.attackTarget.darkness=false;c.attackTarget.concealment='none';assert.equal(derive(c,pack).attacks[0].attack,lit);
});

test('pressure suits have distinct extra reductions and magnetic soles affect normal movement',()=>{
 const c=hero();c.inventory=[item('light-pressure-suit')];assert.equal(derive(c,pack).speed,4);
 c.inventory=[item('medium-pressure-suit')];assert.equal(derive(c,pack).speed,3);
 c.inventory=[item('heavy-pressure-suit')];assert.equal(derive(c,pack).speed,3);
 c.inventory=[item('marine-armor')];c.species='species:gungan';let d=derive(c,pack);assert.equal(d.speed,6);assert.equal(d.speeds.swim,4);
 c.armorChecks={magneticSoles:true};d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.speeds.swim,4);
 c.condition=4;assert.equal(derive(c,pack).speed,2);
});

test('Vacuum Pod and Venom Strength remain proficiency-dependent; noncombat halves Pod penalties',()=>{
 const c=hero();c.inventory=[item('vacuum-pod')];let d=derive(c,pack);assert.equal(d.scores.str,14);assert.equal(skill(d,'acrobatics'),-6);
 c.armorChecks={noncombat:true};d=derive(c,pack);assert.equal(skill(d,'acrobatics'),-1);
 c.levels[0].feats=[feat('armor-proficiency-heavy')];d=derive(c,pack);assert.equal(d.scores.str,18);assert.equal(skill(d,'mechanics'),3);
 c.inventory=[item('venom-assault-armor')];assert.equal(derive(c,pack).scores.str,16);assert.equal(c.abilities.str,14);
});

test('Orbalisk exempts skills but preserves attack penalties; DR survives Lightsabers and does not stack',()=>{
 const c=hero();c.inventory=[item('orbalisk-armor'),item('blaster-pistol')];let d=derive(c,pack);assert.equal(skill(d,'acrobatics'),4);assert.equal(d.attacks[0].attack,-5);assert.equal(d.normalProtection.dr,10);
 assert(healthBars(c,d).includes('armor-dr-sources'));assert(renderStatBlock(c,d,pack).includes('<b>DR:</b> 10'));
 c.currentHP=100;assert.equal(damageOutcome(c,d,pack,20,{lightsaber:true}).hpDamage,10);
 c.protection.dr=15;d=derive(c,pack);assert.equal(damageOutcome(c,d,pack,20).hpDamage,5);assert.equal(damageOutcome(c,d,pack,20,{lightsaber:true}).hpDamage,10);
 assert.equal(damageOutcome(c,d,pack,20,{ignoreDR:true}).hpDamage,20);
 applyIncomingDamage(c,d,pack,20,{lightsaber:true});assert.equal(c.currentHP,90);
});

test('Microbe and Republic DR use declared damage types; Beskar and Imperial armor permit personal Lightsaber DR',()=>{
 const c=hero();c.currentHP=100;c.inventory=[item('microbe-armor')];let d=derive(c,pack);
 assert.equal(damageOutcome(c,d,pack,20).drBlocked,0);assert.equal(damageOutcome(c,d,pack,20,{energy:true}).drBlocked,2);assert.equal(damageOutcome(c,d,pack,20,{fire:true}).drBlocked,2);
 c.inventory=[item('republic-heavy-armor')];d=derive(c,pack);assert.equal(damageOutcome(c,d,pack,20,{fire:true}).drBlocked,0);assert.equal(damageOutcome(c,d,pack,20,{energy:true}).drBlocked,2);
 c.protection.dr=5;for(const id of ['light-beskar-gam','medium-beskar-gam','heavy-beskar-gam','imperial-knight-armor']){c.inventory=[item(id)];assert.equal(damageOutcome(c,derive(c,pack),pack,20,{lightsaber:true}).drBlocked,5);}
});

test('conditional armor defenses combine applicable typed bonuses and checks persist without granting anything',()=>{
 const c=hero();c.inventory=[item('knighthunter-armor')];let d=derive(c,pack);assert.equal(d.conditionalDefenses.find(r=>r.against==='use-the-force').total,d.defenses.will+5);
 c.inventory=[item('thinsuit')];d=derive(c,pack);assert.equal(d.conditionalDefenses.find(r=>r.against==='extreme-temperatures').total,d.defenses.fortitude+5);
 c.armorChecks={hiding:true,darkness:false,magneticSoles:false};validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 c.armorChecks.hiding='yes';assert.throws(()=>validateCharacter(c,pack),/armor checks/);
});


test('Blinding Helmet imposes Total Concealment without rewriting the saved target or allowing low-light Aim',()=>{
 const c=hero();c.inventory=[item('stormtrooper-armor'),item('blinding-helmet'),item('blaster-pistol')];
 c.attackTarget={concealment:'none',darkness:true};let d=derive(c,pack);assert(d.blind);assert.equal(d.attacks[0].targetModifiers.penalty,-5);assert.equal(d.attacks[0].canAimTarget,false);assert.equal(d.attacks[0].available,false);
 c.attackTarget.attackSquare=true;d=derive(c,pack);assert.equal(d.attacks[0].available,true);assert.equal(c.attackTarget.concealment,'none');
 c.inventory[1].equipped=false;assert.equal(derive(c,pack).attacks[0].targetModifiers.penalty,0);
});

test('Zero-Gravity stock armor changes effective size and rejects non-Medium stock fittings',()=>{
 const c=hero();c.levels[0].feats=[feat('armor-proficiency-heavy')];c.inventory=[item('zero-gravity-stormtrooper-armor')];const d=derive(c,pack);
 assert.equal(d.size,'large');assert.equal(d.ctx.size,'large');assert.equal(d.defenses.reflex,19);assert.equal(d.threshold,d.defenses.fortitude+5);assert.equal(skill(d,'stealth'),-1);
 assert.equal(d.weight,38);assert(renderStatBlock(c,d,pack).includes('Large Human'));
 const bare=hero();assert.equal(d.load.heavyAt,derive(bare,pack).load.heavyAt*2);
 assert.equal(purchaseQuote({id:'equipment:zero-gravity-stormtrooper-armor',armorSize:'small'},1,pack,c).item.cost,21000);
 c.inventory[0].armorSize='small';assert.throws(()=>validateCharacter(c,pack),/stock armor size/);delete c.inventory[0].armorSize;
 c.species='species:ewok';const small=derive(c,pack);assert.equal(small.size,'small');assert.equal(small.armor,null);assert(small.issues.some(issue=>issue.includes('fits medium')));
});

test('integrated vision follows explicit printed proficiency requirements independently from equipment bonuses',()=>{
 const c=hero('scoundrel');c.inventory=[item('av-1c-combat-armor')];const d=derive(c,pack);assert.equal(d.vision,'low-light');assert.equal(skill(d,'perception'),0);
 c.inventory=[item('katarn-class-commando-armor')];assert.notEqual(derive(c,pack).vision,'low-light');
});

test('declared Strength work and Beskar intimidation change checks without changing ability scores',()=>{
 const c=hero();c.inventory=[item('model-210-personal-armor')];let d=derive(c,pack);assert.equal(d.abilityCheckBonuses.str,0);
 c.armorChecks={lifting:true};d=derive(c,pack);assert.equal(d.abilityCheckBonuses.str,2);assert.equal(d.scores.str,14);
 c.levels[0].classId='class:scoundrel';assert.equal(derive(c,pack).abilityCheckBonuses.str,0);
 c.inventory=[item('light-beskar-gam')];let baseline=skill(derive(c,pack),'persuasion');c.armorChecks.intimidating=true;assert.equal(skill(derive(c,pack),'persuasion'),baseline+2);
 c.inventory[0].equipped=false;assert.equal(skill(derive(c,pack),'persuasion'),baseline);
});

test('Beskar Intimidate circumstance applies to Force Persuasion modifier substitution',()=>{
 const c=hero('jedi');c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:adept-negotiator'};
 c.levels.push({classId:'class:jedi',hpRoll:4,feats:[{id:'feat:skill-focus',choice:'skill:use-the-force'}],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 c.levels.push({classId:'class:jedi',hpRoll:4,feats:[],talent:{id:'talent:force-persuasion'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 c.inventory=[item('light-beskar-gam')];let d=derive(c,pack),before=skill(d,'persuasion');assert.equal(d.skills.find(s=>s.id==='skill:persuasion').checkSource,'skill:use-the-force');
 c.armorChecks={intimidating:true};assert.equal(skill(derive(c,pack),'persuasion'),before+2);
});
