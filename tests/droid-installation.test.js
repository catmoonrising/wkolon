import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {chooseSpeciesOption} from '../src/species-choices.js';
import {setGenerationMethod,setPoolScore,assignScore} from '../src/ability-generation.js';
import {prepareDroidSystems,chooseDroidArm,installDroidSystem,addStartingDroidSystem,droidStartingSpent,droidSystemsState} from '../src/droid-installation.js';
import {resolveEquipment,purchaseQuote,canRollStartingCredits} from '../src/equipment.js';
import {movementCost,planRunningAttack,planWithdraw} from '../src/combat-movement.js';
import {planAcrobaticsMove} from '../src/acrobatics-movement.js';
import {chargeMovementCost,planCharge} from '../src/charge.js';
import {rollRoutine} from '../src/combat.js';
import {moduleRelevant} from '../src/sheet-modules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const part=(id,fields={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:false,carried:true,twoHanded:false,attackMod:0,damageMod:0,...fields});
function hero(size='medium'){
 const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:custom-droid';chooseSpeciesOption(c,pack,'size',size);chooseSpeciesOption(c,pack,'degree','degree-4');chooseSpeciesOption(c,pack,'language','basic');setGenerationMethod(c,'manual',pack);
 for(const [i,a]of ['str','dex','int','wis','cha'].entries()){setPoolScore(c,i,14,pack);assignScore(c,a,i,pack);}
 prepareDroidSystems(c,pack);return c;
}
const arm=(c,i)=>c.inventory.find(e=>e.droidGrant?.slot==='arm-'+i);
const skill=(c,id)=>derive(c,pack).skills.find(s=>s.id==='skill:'+id);
const add=(c,id,fields={})=>{const e=part(id,fields);c.inventory.push(e);return e;};
const install=(c,id,fields={})=>{const e=add(c,id,fields);installDroidSystem(c,pack,e.uid,true);return e;};

test('starting package grants processor and locomotion once, requires explicit arm choices, and keeps class credits separate',()=>{
 const c=hero();assert.equal(c.inventory.length,2);assert.equal(c.credits,0);assert(canRollStartingCredits(c));assert.equal(droidStartingSpent(c),0);assert(!prepareDroidSystems(c,pack));
 assert(derive(c,pack).issues.includes('Choose arm 1 appendage'));chooseDroidArm(c,pack,1,'equipment:hand');chooseDroidArm(c,pack,2,'equipment:claw');assert.equal(c.inventory.length,4);assert(!derive(c,pack).issues.includes('Choose arm 1 appendage'));
 const id=arm(c,1).uid;chooseDroidArm(c,pack,1,'equipment:instrument');assert.equal(arm(c,1).uid,id);assert.equal(c.inventory.length,4);assert(canRollStartingCredits(c));validateCharacter(c,pack);
 c.inventory.splice(c.inventory.findIndex(e=>e.droidGrant.slot==='processor'),1);prepareDroidSystems(c,pack);assert(!c.inventory.some(e=>e.droidGrant.slot==='processor'));assert(derive(c,pack).incapacitated);
});
test('editing body size refits provided parts without regenerating removed parts or changing purchased sizes',()=>{
 const c=hero('small'),loc=c.inventory.find(e=>e.droidGrant.slot==='locomotion');assert.equal(loc.id,'equipment:tracked');chooseDroidArm(c,pack,1,'equipment:hand');const bought=add(c,'hand',{systemSize:'small'});chooseSpeciesOption(c,pack,'size','medium');prepareDroidSystems(c,pack);assert.equal(loc.id,'equipment:walking');assert.equal(loc.systemSize,'medium');assert.equal(arm(c,1).systemSize,'medium');assert.equal(bought.systemSize,'small');assert.equal(derive(c,pack).speed,6);validateCharacter(c,pack);
});
test('starting locomotion, appendages and accessories are weight-exempt; the provided processor and later purchases are not',()=>{
 const c=hero('small');chooseDroidArm(c,pack,1,'equipment:hand');chooseDroidArm(c,pack,2,'equipment:claw');assert.equal(derive(c,pack).weight,5);assert(!derive(c,pack).weightUnknown);
 const sensor=addStartingDroidSystem(c,pack,part('improved-sensor-package',{systemSize:'small'}),200);assert.equal(resolveEquipment(sensor,pack,c).weight,2.5);assert.equal(derive(c,pack).weight,5);
 add(c,'improved-sensor-package');assert.equal(derive(c,pack).weight,7.5);assert(canRollStartingCredits({...c,inventory:c.inventory.filter(e=>e.droidGrant||e.droidStarting)}));
 const virtual=hero();delete virtual.droidSystems;virtual.inventory=[];const before=JSON.stringify(virtual);assert.equal(derive(virtual,pack).weight,5);assert.equal(JSON.stringify(virtual),before);
});
test('the starting allowance records actual quote totals without paying class credits and rejects excess or ineligible parts',()=>{
 const c=hero();c.credits=1234;const armor=part('plasteel-shell',{systemSize:'medium'}),quote=purchaseQuote(armor,1,pack,c);addStartingDroidSystem(c,pack,armor,quote.total);assert.equal(droidStartingSpent(c),400);assert.equal(c.credits,1234);assert.equal(derive(c,pack).weight,5);
 assert.throws(()=>addStartingDroidSystem(c,pack,part('heuristic-processor'),0),/unavailable/);assert.throws(()=>addStartingDroidSystem(c,pack,part('blaster-pistol'),0),/unavailable/);const before=JSON.stringify(c);assert.throws(()=>addStartingDroidSystem(c,pack,part('hand'),601),/exceeded/);assert.equal(JSON.stringify(c),before);validateCharacter(c,pack);
});
test('sensors grant vision and nonstacking Equipment Perception only while installed in a Droid body',()=>{
 const c=hero(),before=skill(c,'perception').total,sensor=add(c,'improved-sensor-package');assert.equal(skill(c,'perception').total,before);installDroidSystem(c,pack,sensor.uid,true);assert.equal(skill(c,'perception').total,before+2);assert.equal(derive(c,pack).vision,'low-light');install(c,'improved-sensor-package');assert.equal(skill(c,'perception').total,before+2);
 const dark=install(c,'darkvision-package');assert.equal(derive(c,pack).vision,'darkvision');dark.carried=false;assert.equal(derive(c,pack).vision,'low-light');c.species='species:human';assert.notEqual(derive(c,pack).vision,'darkvision');assert(moduleRelevant('droid-systems',c,derive(c,pack)));validateCharacter(c,pack);
});
test('Basic Processor restricts untrained skills and nonproficient weapons; removing the active processor prevents actions',()=>{
 const c=hero();c.levels[0].classId='class:scoundrel';assert(skill(c,'stealth').available);const weapon=add(c,'lightsaber',{equipped:true}),basic=install(c,'basic-processor');assert(!skill(c,'stealth').available);assert(skill(c,'climb').available);c.trainedSkills=['skill:stealth'];assert(skill(c,'stealth').available);let a=derive(c,pack).attacks.find(a=>a.uid===weapon.uid);assert(!a.available);assert.match(a.issue,/Basic Processor/);
 c.levels[0].feats.push({id:'feat:weapon-proficiency-lightsabers'});a=derive(c,pack).attacks.find(a=>a.uid===weapon.uid);assert(a.available);installDroidSystem(c,pack,basic.uid,false);assert(derive(c,pack).incapacitated);assert(derive(c,pack).helpless);assert.equal(derive(c,pack).defenseAbilities.reflex.modifier,-5);assert(derive(c,pack).issues.includes('Install a Processor'));validateCharacter(c,pack);
});
test('Droid appendages replace organic fists, retain routine IDs, use bludgeoning damage and gain Martial Arts one die step',()=>{
 const c=hero();assert(!derive(c,pack).attacks.some(a=>a.uid===c.id));chooseDroidArm(c,pack,1,'equipment:hand');chooseDroidArm(c,pack,2,'equipment:claw');let d=derive(c,pack),hand=d.attacks.find(a=>a.uid===c.id),claw=d.attacks.find(a=>a.uid===arm(c,2).uid);assert.equal(hand.damage,'1d3');assert.equal(claw.damage,'1d4');assert(hand.unarmed);assert(!hand.natural);assert.equal(hand.damageType,'Bludgeoning');assert(!hand.opportunityWeapon);
 c.levels[0].feats.push({id:'feat:martial-arts-i'});d=derive(c,pack);assert.equal(d.attacks.find(a=>a.uid===c.id).damage,'1d4');assert.equal(d.attacks.find(a=>a.uid===claw.uid).damage,'1d6');assert(d.attacks.find(a=>a.uid===c.id).opportunityWeapon);
 arm(c,2).attackMod=3;arm(c,2).damageMod=4;arm(c,2).attackTechnique='normal';arm(c,2).targetKind='object';validateCharacter(c,pack);const saved=JSON.parse(JSON.stringify(c));assert.equal(derive(saved,pack).attacks.find(a=>a.uid===claw.uid).attack,d.attacks.find(a=>a.uid===claw.uid).attack+3);
 const routine={name:'Hand',steps:[{attackId:c.id,count:1,attackMod:0,damageMod:0}]};const result=rollRoutine(routine,d.attacks,pack.rules.combat,()=>({value:10,d20:[10],display:'10',coeffs:[1]}));assert.equal(result.results.length,1);
});
test('tracked, wheeled, hovering and flying locomotion update actual speed, Climb and terrain costs',()=>{
 const c=hero('small');assert.equal(derive(c,pack).speed,4);const trackedClimb=skill(c,'climb').total,track=c.inventory.find(e=>e.droidGrant.slot==='locomotion');installDroidSystem(c,pack,track.uid,false);assert.equal(skill(c,'climb').total,trackedClimb+5);
 const wheel=install(c,'wheeled',{systemSize:'small',systemOrdinal:1,weightOverride:0});let d=derive(c,pack);assert.equal(d.speed,6);assert(!skill(c,'climb').available);assert.equal(movementCost({squares:2,diagonal:0,difficult:1,diagonalDifficult:1},pack.rules.combatMovement,d),12);
 installDroidSystem(c,pack,wheel.uid,false);const hover=install(c,'hovering',{systemSize:'small',systemOrdinal:1,weightOverride:0});d=derive(c,pack);assert.equal(d.speed,6);assert(skill(c,'climb').available);assert.equal(movementCost({squares:2,diagonal:0,difficult:1,diagonalDifficult:1},pack.rules.combatMovement,d),3);
 installDroidSystem(c,pack,hover.uid,false);install(c,'flying',{systemSize:'small',systemOrdinal:1,weightOverride:0});d=derive(c,pack);assert.equal(d.speed,9);assert.equal(d.speeds.fly,9);validateCharacter(c,pack);
});
test('terrain policy reaches Move, Charge, Withdraw and Running Attack, with unsupported sizes excluded from installation',()=>{
 const c=hero('small');chooseDroidArm(c,pack,1,'equipment:hand');c.trainedSkills=['skill:acrobatics'];c.levels[0].feats.push({id:'feat:running-attack'});let d=derive(c,pack);
 c.acrobaticsMovement={path:{squares:4,difficult:4}};assert.equal(planAcrobaticsMove(c,d,pack).cost,4);
 c.chargePath={squares:4,difficultSquares:4};assert.equal(chargeMovementCost(c,pack,false,d),4);assert.equal(planCharge(c,d,pack,c.id).normalCost,4);
 c.withdraw={clearThreats:true,path:{squares:2,difficult:2}};assert.equal(planWithdraw(c,d,pack).cost,2);
 c.runningAttack={before:{squares:2,difficult:2},after:{squares:2,difficult:2}};assert.equal(planRunningAttack(c,d,pack,c.id).cost,4);
 const wrong=add(c,'flying',{systemSize:'large',systemOrdinal:1,weightOverride:0});assert.throws(()=>installDroidSystem(c,pack,wrong.uid,true),/does not fit/);assert(!wrong.equipped);
});
test('malformed origins, duplicate grants, unsupported state and overspent allowances cannot be imported',()=>{
 const c=hero();chooseDroidArm(c,pack,1,'equipment:hand');
 const mutations=[r=>r.droidSystems[r.species].prepared=false,r=>r.droidSystems[r.species].locomotion='bad',r=>r.inventory[0].droidGrant.slot='bad',r=>r.inventory.push({...structuredClone(r.inventory[0]),uid:crypto.randomUUID()}),r=>r.inventory[0].quantity=2,r=>r.inventory[0].droidStarting={speciesId:r.species,paid:1},r=>r.inventory.push(part('hand',{droidStarting:{speciesId:r.species,paid:1001}})),r=>r.inventory.push(part('blaster-pistol',{droidStarting:{speciesId:r.species,paid:0}}))];
 for(const mutate of mutations){const r=structuredClone(c);mutate(r);assert.throws(()=>validateCharacter(r,pack));}
 for(const uid of [undefined,c.id,c.inventory[0].uid]){const r=structuredClone(c);r.inventory[1].uid=uid;assert.throws(()=>validateCharacter(r,pack));}
 const cloned=structuredClone(c);validateCharacter(cloned,pack);assert.equal(droidSystemsState(cloned,pack).processor,'heuristic');
});
test('humanoid armor requires declared bipedal anatomy and two installed Hands, while built-in armor does not',()=>{
 const c=hero();chooseDroidArm(c,pack,1,'equipment:hand');chooseDroidArm(c,pack,2,'equipment:hand');const armor=add(c,'battle-armor',{armorSize:'medium',equipped:true});assert.equal(derive(c,pack).armor,null);
 c.droidSystems[c.species].bipedal=true;assert.equal(derive(c,pack).armor.id,armor.id);arm(c,2).carried=false;assert.equal(derive(c,pack).armor,null);assert(derive(c,pack).issues.includes('Humanoid armor requires a bipedal body and two Hands'));
 const builtIn=install(c,'plasteel-shell',{systemSize:'medium'});assert.equal(derive(c,pack).armor.id,builtIn.id);assert(armor.equipped);validateCharacter(c,pack);
});
test('worn Heavy Armor slows native speeds 4 and 6 only; built-in Heavy Armor preserves movement',()=>{
 const c=hero();chooseDroidArm(c,pack,1,'equipment:hand');chooseDroidArm(c,pack,2,'equipment:hand');c.droidSystems[c.species].bipedal=true;
 const walk=c.inventory.find(e=>e.droidGrant.slot==='locomotion');const wheels=install(c,'wheeled',{systemSize:'medium',systemOrdinal:2,weightOverride:0});const worn=add(c,'heavy-battle-armor',{armorSize:'medium',equipped:true});assert.equal(derive(c,pack).speed,8);assert.equal(derive(c,pack).runMultiplier,3);
 installDroidSystem(c,pack,walk.uid,true);assert.equal(derive(c,pack).speed,4);install(c,'neutronium-plating',{systemSize:'medium',weightOverride:0});assert.equal(derive(c,pack).armorItems.length,2);assert.equal(derive(c,pack).speed,4);worn.equipped=false;assert.equal(derive(c,pack).speed,6);assert.equal(derive(c,pack).runMultiplier,3);
 installDroidSystem(c,pack,wheels.uid,true);assert.equal(derive(c,pack).speed,8);validateCharacter(c,pack);
});
test('Wheeled costs reach Move and Charge preflight',()=>{
 const c=hero();chooseDroidArm(c,pack,1,'equipment:hand');install(c,'wheeled',{systemSize:'medium',systemOrdinal:2,weightOverride:0});c.acrobaticsMovement={path:{squares:2,difficult:2}};c.chargePath={squares:2,difficultSquares:2};const d=derive(c,pack);assert.equal(planAcrobaticsMove(c,d,pack).cost,8);assert.equal(planCharge(c,d,pack,c.id).normalCost,8);
 assert.equal(planAcrobaticsMove(c,derive(c,pack),pack).cost,8);
});
test('built-in and worn armor coexist without stacking bonuses or discarding proficient armor talents',()=>{
 const c=hero();chooseDroidArm(c,pack,1,'equipment:hand');chooseDroidArm(c,pack,2,'equipment:hand');c.droidSystems[c.species].bipedal=true;setPoolScore(c,1,10,pack);
 for(let n=2;n<=10;n++)c.levels.push({classId:'class:soldier',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 c.levels[0].talent={id:'talent:armored-defense'};c.levels[2].talent={id:'talent:improved-armored-defense'};
 const worn=add(c,'battle-armor',{armorSize:'medium',equipped:true}),before=derive(c,pack);install(c,'neutronium-plating',{systemSize:'medium',weightOverride:0});const after=derive(c,pack);
 assert.equal(after.armorItems.length,2);assert.equal(after.armor.id,worn.id);assert.equal(after.defenses.reflex,before.defenses.reflex);assert.equal(after.defenses.fortitude,before.defenses.fortitude);assert.equal(after.runMultiplier,3);validateCharacter(c,pack);
});
test('bulk starting purchases and earlier stacks retain total receipts, weights and the original attack reference',()=>{
 const c=hero(),first=addStartingDroidSystem(c,pack,part('hand',{quantity:3,systemSize:'medium'}),150),hands=c.inventory.filter(e=>e.id==='equipment:hand');assert.equal(hands.length,3);assert.equal(droidStartingSpent(c),150);assert(hands.every(e=>e.quantity===1));assert.equal(new Set(hands.map(e=>e.uid)).size,3);
 installDroidSystem(c,pack,first.uid,true);const before=derive(c,pack).weight;validateCharacter(c,pack);
 c.inventory=c.inventory.filter(e=>!hands.includes(e));first.quantity=3;first.droidStarting.paid=150;c.inventory.push(first);assert(prepareDroidSystems(c,pack));assert.equal(droidStartingSpent(c),150);assert.equal(c.inventory.find(e=>e.uid===first.uid).quantity,1);assert.equal(c.inventory.filter(e=>e.id==='equipment:hand'&&e.equipped).length,1);assert.equal(derive(c,pack).weight,before);validateCharacter(c,pack);
});
test('bulk locomotion purchases advance surcharge numbers and keep per-part starting receipts',()=>{
 const c=hero(),item=part('wheeled',{systemSize:'medium',systemOrdinal:2});assert.equal(purchaseQuote(item,2,pack,c).total,2140);assert.equal(purchaseQuote({...item,systemOrdinal:5},2,pack,c).total,null);
 const stationary=part('stationary',{systemSize:'medium',systemOrdinal:1,quantity:2}),q=purchaseQuote(stationary,2,pack,c);assert.equal(q.total,500);addStartingDroidSystem(c,pack,stationary,q.total);const added=c.inventory.filter(e=>e.id==='equipment:stationary');assert.deepEqual(added.map(e=>e.systemOrdinal),[1,2]);assert.deepEqual(added.map(e=>e.droidStarting.paid),[0,500]);assert.equal(droidStartingSpent(c),500);validateCharacter(c,pack);
});
