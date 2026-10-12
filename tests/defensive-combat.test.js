import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {declareDefenseStance,declareMeleeDefense,designateDodgeOpponent} from '../src/defensive-combat.js';
import {rollCombatRoutine} from '../src/combat.js';
import {bellowDetails,rollBellow} from '../src/species-actions.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {newEncounter,newDay,restEightHours} from '../src/recovery.js';
import {recoverSuite} from '../src/force-powers.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){
 const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:12,dex:18,con:12,int:14,wis:10,cha:10};
 c.levels=Array.from({length:6},(_,i)=>({classId:'class:soldier',hpRoll:i?5:null,feats:i===0?[{id:'feat:melee-defense'},{id:'feat:dodge'}]:i===2?[{id:'feat:mobility'}]:i===5?[{id:'feat:double-attack',choice:'pistols'}]:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));
 c.inventory=[{id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,shotsRemaining:10}];return c;
}
function trainAcrobatics(c){c.levels[1].classId='class:scoundrel';c.levels[2].feats.push({id:'feat:skill-training',choice:'skill:acrobatics'});}
function uncanny(c){c.levels.push(...Array.from({length:5},(_,i)=>({classId:'class:scout',hpRoll:3,feats:[],talent:i===0?{id:'talent:acute-senses'}:i===2?{id:'talent:improved-initiative'}:i===4?{id:'talent:uncanny-dodge-i'}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]})));}
const noDice=()=>assert.fail('No dice before eligibility checks');
const routine=c=>({name:'Attack',steps:[{attackId:c.inventory[0].uid,count:1,attackMod:0,damageMod:0}]});
const row=(d,against)=>d.conditionalDefenses.find(r=>r.against===against);

test('defensive actions retain exact reviewed text and a closed mechanics mapping',()=>{
 validatePack(pack);
 assert.match(articleText(pack.rulePages.find(r=>r.id==='rule:fight-defensively').article),/Standard Action/);
 assert.match(articleText(pack.rulePages.find(r=>r.id==='rule:total-defense').article),/not even Attacks of Opportunity/);
 assert.match(articleText(pack.rulePages.find(r=>r.id==='rule:helpless').article),/Dexterity score is treated as if it were 0/);
 const bad=structuredClone(pack);bad.rules.defensiveCombat.trainedTotalDefense=5;assert.throws(()=>validatePack(bad),/defensive stance/i);
});

test('Fight Defensively gives 2 or 5 dodge and penalizes every attack until next turn',()=>{
 const c=hero(),before=derive(c,pack);declareDefenseStance(c,before,'fight');let d=derive(c,pack);
 assert.equal(d.defenses.reflex,before.defenses.reflex+2);assert.equal(d.specialAttackPenalty,-5);
 assert.deepEqual(d.attacks.map(a=>a.attack),before.attacks.map(a=>a.attack-5));assert(d.attacks.every(a=>a.breakdown.includes('Defense: -5')));
 assert.equal(d.threshold,before.threshold);assert.equal(d.defenses.fortitude,before.defenses.fortitude);assert.equal(d.defenses.will,before.defenses.will);
 trainAcrobatics(c);d=derive(c,pack);assert.equal(d.defensiveCombat.dodgeBonus,5);
 c.forcePowerRecoveryPending=true;recoverSuite(c,d,{endTurn:true});assert.equal(derive(c,pack).defensiveCombat.stance,'fight');
 startNextTurn(c);assert.equal(derive(c,pack).defensiveCombat.dodgeBonus,0);assert.equal(c.defenseStance,'none');
});

test('Total Defense blocks attacks, Full Attacks and Bellow before resources or dice',()=>{
 const c=hero(),before=derive(c,pack);c.species='species:ithorian';c.inventory[0].aimed=true;c.inventory[0].braced=true;c.mightySwing=true;
 declareDefenseStance(c,derive(c,pack),'total');let d=derive(c,pack);assert.equal(d.defensiveCombat.dodgeBonus,5);assert(d.attacks.every(a=>!a.available));
 assert(!c.inventory[0].aimed&&!c.inventory[0].braced&&!c.mightySwing);assert(!bellowDetails(c,d,pack).available);
 const snapshot=structuredClone(c);assert.throws(()=>rollCombatRoutine(routine(c),d,pack,noDice),/Total Defense/);
 const full={...routine(c),kind:'fullAttack',steps:[{...routine(c).steps[0],source:'base'},{...routine(c).steps[0],source:'doubleAttack'}]};
 assert.throws(()=>rollCombatRoutine(full,d,pack,noDice),/Total Defense/);assert.throws(()=>rollBellow(c,d,pack,0,null,noDice),/unavailable/);assert.deepEqual(c,snapshot);
 assert.throws(()=>declareDefenseStance(c,d,'fight'),/until your next turn/);assert.throws(()=>declareMeleeDefense(c,d,1),/unavailable/);
 trainAcrobatics(c);assert.equal(derive(c,pack).defensiveCombat.dodgeBonus,10);
 startNextTurn(c);d=derive(c,pack);assert(d.attacks.every(a=>a.available));assert(bellowDetails(c,d,pack).available);assert.equal(c.inventory[0].shotsRemaining,10);assert.equal(c.forcePoints,before.forceCurrent);
});

test('Melee Defense is limited by BAB and 5, persists on all rolls, and cannot be reduced early',()=>{
 const c=hero(),before=derive(c,pack);declareMeleeDefense(c,before,5);let d=derive(c,pack);
 assert.equal(d.defenses.reflex,before.defenses.reflex+5);assert.deepEqual(d.attacks.map(a=>a.attack),before.attacks.map(a=>a.attack-5));
 for(const amount of [-1,1.5,6])assert.throws(()=>declareMeleeDefense(c,d,amount),/must be/);
 assert.throws(()=>declareMeleeDefense(c,d,4),/Next turn/);assert.equal(c.meleeDefense,5);
 c.levels=c.levels.slice(0,2);d=derive(c,pack);assert.equal(d.defensiveCombat.maximum,2);assert.equal(d.defensiveCombat.melee,0);assert.throws(()=>rollCombatRoutine(routine(c),d,pack,noDice),/maximum/);
 startNextTurn(c);declareMeleeDefense(c,derive(c,pack),2);c.levels[0].feats=c.levels[0].feats.filter(f=>f.id!=='feat:melee-defense');d=derive(c,pack);assert.equal(d.defensiveCombat.melee,0);assert.throws(()=>rollCombatRoutine(routine(c),d,pack,noDice),/Requires Melee Defense/);
});

test('distinct defensive dodge bonuses stack; opponent and movement totals remain conditional',()=>{
 const c=hero();trainAcrobatics(c);const before=derive(c,pack);declareDefenseStance(c,before,'fight');declareMeleeDefense(c,derive(c,pack),3);designateDodgeOpponent(c,derive(c,pack),'Vader');
 const d=derive(c,pack);assert.equal(d.defenses.reflex,before.defenses.reflex+8);assert.equal(d.specialAttackPenalty,-8);
 assert.equal(row(d,'dodge-opponent').total,d.defenses.reflex+1);assert.equal(row(d,'movement-opportunity').total,d.defenses.reflex+5);assert.equal(row(d,'opponent-movement-opportunity').total,d.defenses.reflex+6);
 startNextTurn(c);assert.equal(c.dodgeOpponent,'Vader');assert.equal(row(derive(c,pack),'dodge-opponent').total,before.defenses.reflex+1);
});

test('losing Dexterity removes dodge bonuses, preserves negative Dexterity, and retains attack penalties',()=>{
 const c=hero(),before=derive(c,pack);c.defenseStance='fight';c.meleeDefense=3;c.dodgeOpponent='Vader';c.flatFooted=true;let d=derive(c,pack);
 assert.equal(d.defenses.reflex,before.defenses.reflex-4);assert.equal(d.defensiveCombat.dodgeBonus,0);assert.equal(d.defensiveCombat.attackPenalty,-8);
 assert(d.conditionalDefenses.every(r=>r.total===d.defenses.reflex));
 uncanny(c);d=derive(c,pack);const plain=structuredClone(c);plain.defenseStance='none';plain.meleeDefense=0;plain.flatFooted=false;assert.equal(d.defenses.reflex,derive(plain,pack).defenses.reflex+5);assert.equal(row(d,'dodge-opponent').amount,1);
 c.levels=c.levels.slice(0,6);c.abilities.dex=6;c.flatFooted=false;const negative=derive(c,pack).defenses.reflex;c.flatFooted=true;assert.equal(derive(c,pack).defenses.reflex,negative-5);
 c.flatFooted=false;c.abilities.dex=18;c.inventory[0].quantity=500;d=derive(c,pack);assert(d.load.overloaded);assert.equal(d.defensiveCombat.dodgeBonus,0);
});

test('Helpless uses Dexterity 0 independently of Uncanny Dodge and loses all dodge bonuses',()=>{
 const c=hero();uncanny(c);const before=derive(c,pack);c.defenseStance='total';c.meleeDefense=3;c.dodgeOpponent='Vader';c.helpless=true;
 let d=derive(c,pack);assert(d.helpless);assert.equal(d.defenses.reflex,before.defenses.reflex-9);assert.equal(d.defensiveCombat.dodgeBonus,0);assert.equal(row(d,'opponent-movement-opportunity').amount,0);
 startNextTurn(c);assert(c.helpless);assert.equal(derive(c,pack).defenses.reflex,d.defenses.reflex);
 c.helpless=false;c.currentHP=0;assert.equal(derive(c,pack).defenses.reflex,d.defenses.reflex);
 c.currentHP=1;c.condition=5;assert.equal(derive(c,pack).defenses.reflex,d.defenses.reflex+pack.rules.conditionPenalties[5]);
 c.condition=0;c.abilities.dex=2;c.helpless=true;assert.match(derive(c,pack).breakdowns.reflex,/-5 ability/);
});

test('saved defensive choices validate, escape opponent names, and print conditional defenses',()=>{
 const c=hero();c.defenseStance='fight';c.meleeDefense=2;c.dodgeOpponent='<Vader & apprentice>';validateCharacter(c,pack);
 const d=derive(c,pack),html=renderStatBlock(c,d,pack);assert(html.includes('Fight Defensively; Melee Defense 2'));assert(html.includes('&lt;Vader &amp; apprentice&gt;'));assert(!html.includes('<Vader'));
 for(const extra of [{defenseStance:'off'},{meleeDefense:6},{meleeDefense:NaN},{helpless:1},{dodgeOpponent:'x'.repeat(201)}])assert.throws(()=>validateCharacter({...c,...extra},pack),/Invalid/);
 const before=structuredClone(c);derive(c,pack);assert.deepEqual(c,before);
});

test('encounter, day and rest start a new turn without erasing a designated opponent',()=>{
 for(const reset of [c=>newEncounter(c),c=>newDay(c,pack),c=>restEightHours(c,derive(c,pack),pack)]){
  const c=hero();c.defenseStance='fight';c.meleeDefense=2;c.dodgeOpponent='Vader';reset(c);assert.equal(c.defenseStance,'none');assert.equal(c.meleeDefense,0);assert.equal(c.dodgeOpponent,'Vader');
 }
});
