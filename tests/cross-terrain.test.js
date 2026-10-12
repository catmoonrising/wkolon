import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {acrobaticsPath,acrobaticsMoveCost,planAcrobaticsMove} from '../src/acrobatics-movement.js';
import {acrobaticsMove} from '../src/acrobatics-movement-actions.js';
import {acrobaticsMoveControls} from '../src/acrobatics-movement-ui.js';
import {planCharge} from '../src/charge.js';
import {rollCharge} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {chargeControls} from '../src/charge-ui.js';
import {createHouseRules,ambiguityValue} from '../src/house-rules.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:14,wis:10,cha:10};c.levels[0].classId='class:scoundrel';c.trainedSkills=['skill:acrobatics'];c.acrobaticsMovement={crossTerrain:true,path:{squares:6,difficult:6},terrainCheck:15};return c;}
const noDice=()=>assert.fail('No dice expected');
const roller=(totals,calls=[])=>expr=>{calls.push(expr);return {value:totals.shift(),d20:[12],display:expr,coeffs:[1]};};

test('Cross Difficult Terrain success permits normal Speed while failure restores real costs without a guessed endpoint',()=>{
 const c=hero(),plan=planAcrobaticsMove(c,derive(c,pack),pack);assert.equal(plan.cost,6);assert.equal(plan.maximum,6);assert.equal(acrobaticsMoveCost(c,pack,false),12);
 let result=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(result.success);assert(result.movementComplete);assert.equal(result.cost,6);assert.equal(result.terrainRoll.value,15);assert.equal(result.tumbleRoll,null);assert.equal(c.acrobaticsMovement.terrainCheck,null);assert.equal(c.acrobaticsMovement.path.squares,6);assert.equal(result.protectedSquares,0);
 c.acrobaticsMovement.terrainCheck=14;result=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(!result.success);assert(!result.movementComplete);assert.equal(result.plannedCost,6);assert.equal(result.cost,12);assert(result.text.includes('normal terrain costs'));assert(result.text.includes('movement unconfirmed'));assert.equal(c.acrobaticsMovement.path.squares,6);
 c.acrobaticsMovement.path={squares:3,difficult:3};c.acrobaticsMovement.terrainCheck=14;result=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(!result.success);assert(result.movementComplete,'failed check can still permit the whole route at ordinary movement cost');assert.equal(result.cost,6);
});
test('Cross Difficult Terrain leaves diagonal and low-object costs intact, even with Tumble',()=>{
 const c=hero();c.acrobaticsMovement.path={squares:1,diagonalDifficult:1};assert.equal(acrobaticsMoveCost(c,pack),2);c.acrobaticsMovement.path.diagonalLowObjects=1;assert.equal(acrobaticsMoveCost(c,pack),4);assert.throws(()=>planAcrobaticsMove(c,derive(c,pack),pack),/Choose difficult terrain/);
 c.acrobaticsMovement.path={squares:3,difficult:2,diagonalDifficult:1,lowObjects:1};assert.equal(acrobaticsMoveCost(c,pack),5);assert.equal(acrobaticsMoveCost(c,pack,false),8);
 c.acrobaticsMovement.tumble=true;c.acrobaticsMovement.tumbled={squares:1,difficult:1,lowObjects:1};assert.equal(acrobaticsMoveCost(c,pack),7);assert.throws(()=>planAcrobaticsMove(c,derive(c,pack),pack),/exceeds Speed/);
 c.acrobaticsMovement.path={squares:2,difficult:2,lowObjects:1};assert.equal(planAcrobaticsMove(c,derive(c,pack),pack).cost,5);c.acrobaticsMovement.check=15;const result=acrobaticsMove(c,derive(c,pack),pack,noDice);assert.equal(result.cost,5);assert.equal(result.protectedSquares,1);
});
test('ordinary Move resolves separate DC15 terrain and Tumble checks with independent outcomes and consumed totals',()=>{
 const c=hero();c.acrobaticsMovement.path={squares:3,difficult:3};c.acrobaticsMovement.tumble=true;c.acrobaticsMovement.tumbled={squares:3,difficult:3};c.acrobaticsMovement.check=14;
 let result=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(result.terrainRoll.success);assert(!result.tumbleRoll.success);assert.equal(result.cost,6);assert.equal(result.protectedSquares,0);assert(!result.movementComplete);assert.equal(c.acrobaticsMovement.check,null);assert.equal(c.acrobaticsMovement.terrainCheck,null);assert.deepEqual(result.checks.map(c=>c.dc),[15,15]);
 c.acrobaticsMovement.terrainCheck=14;c.acrobaticsMovement.check=15;result=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(!result.terrainRoll.success);assert(result.tumbleRoll.success);assert.equal(result.cost,12);assert(!result.movementComplete);assert.equal(result.qualifiedSquares,3);assert.equal(result.protectedSquares,0);assert(result.protectionUnconfirmed);assert(result.text.includes('only to squares actually tumbled'));
 c.acrobaticsMovement.path={squares:2,difficult:2};c.acrobaticsMovement.tumbled={squares:1,difficult:1};c.acrobaticsMovement.terrainCheck=14;c.acrobaticsMovement.check=15;result=acrobaticsMove(c,derive(c,pack),pack,noDice);assert.equal(result.cost,6);assert(result.movementComplete);assert.equal(result.protectedSquares,1);assert(!result.protectionUnconfirmed);
 const calls=[];result=acrobaticsMove(c,derive(c,pack),pack,roller([15,15],calls));assert.equal(calls.length,2);assert(calls.every(expr=>expr==='1d20+'+derive(c,pack).skills.find(s=>s.id==='skill:acrobatics').total));assert(result.success);assert.equal(result.cost,3);
});
test('terrain movement preflight requires trained Acrobatics, native Speed, valid category subsets and actor readiness',()=>{
 const c=hero();c.trainedSkills=[];let before=structuredClone(c);assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/trained Acrobatics/);assert.deepEqual(c,before);c.trainedSkills=['skill:acrobatics'];
 c.acrobaticsMovement.path={squares:2,difficult:1,lowObjects:2};validateCharacter(c,pack);assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/Low object squares/);
 c.acrobaticsMovement.path={squares:2,difficult:2,lowObjects:1};c.acrobaticsMovement.tumble=true;c.acrobaticsMovement.tumbled={squares:1,difficult:1,lowObjects:0};assert.doesNotThrow(()=>planAcrobaticsMove(c,derive(c,pack),pack));c.acrobaticsMovement.tumbled={squares:2,difficult:2,lowObjects:0};assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/Tumble squares exceed/);
 c.acrobaticsMovement.tumbled={squares:1,difficult:1,lowObjects:2};assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/Low object squares/);
 c.acrobaticsMovement.tumble=false;c.acrobaticsMovement.path={squares:4,difficult:4};c.species='species:gungan';c.acrobaticsMovement.mode='swim';assert.equal(planAcrobaticsMove(c,derive(c,pack),pack).maximum,4);c.condition=4;assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/exceeds Speed/);c.condition=5;assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,noDice),/unavailable/);
});
test('low-object metadata is closed and saved, with zero defaults for older drafts and no mutation from invalid dice',()=>{
 const c=hero();assert.equal(acrobaticsPath(c).path.lowObjects,0);assert.equal(acrobaticsPath(c).terrainCheck,15);c.acrobaticsMovement.path={squares:2,difficult:2,lowObjects:1};c.acrobaticsMovement.tumble=true;c.acrobaticsMovement.tumbled={squares:1,difficult:1,lowObjects:1};c.acrobaticsMovement.terrainCheck=null;
 const before=structuredClone(c);assert.throws(()=>acrobaticsMove(c,derive(c,pack),pack,roller([15,NaN])),/Invalid Acrobatics roll/);assert.deepEqual(c,before);
 for(const bad of [{crossTerrain:'yes'},{terrainCheck:'15'},{terrainCheck:Infinity},{terrainCheck:100001},{path:{squares:2,lowObjects:-1}},{path:{squares:2,diagonalLowObjects:1.5}},{path:{squares:2,ignoreTerrain:true}}])assert.throws(()=>validateCharacter({...c,acrobaticsMovement:bad},pack));
 const restored=JSON.parse(JSON.stringify(c));validateCharacter(restored,pack);assert.equal(acrobaticsPath(restored).path.lowObjects,1);assert.equal(acrobaticsPath(restored).tumbled.lowObjects,1);assert.equal(acrobaticsPath(restored).terrainCheck,null);
});
test('failed terrain movement still breaks Aim and routine continuations, without spending ammunition or clearing turn penalties',()=>{
 const c=hero();c.inventory=[{id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,shotsRemaining:20,aimed:true}];c.routineProgress={id:crypto.randomUUID(),index:1};c.chargeReflexPenalty=-2;c.mightySwing=true;c.acrobaticsMovement.terrainCheck=14;
 const result=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(!result.success);assert(!c.inventory[0].aimed);assert.equal(c.inventory[0].shotsRemaining,20);assert.equal(c.routineProgress,undefined);assert.equal(c.chargeReflexPenalty,-2);assert(c.mightySwing);
});
test('Cross Difficult Terrain mapping preserves exact wording and rejects unprinted combined DCs or low-object exemptions',()=>{
 validatePack(pack);const text=articleText(pack.rulePages.find(r=>r.id==='rule:acrobatics').article);assert(text.includes('move through Difficult Terrain at your normal Speed'));assert(text.includes('DC increases to 35'));
 for(const patch of [{dc:35},{trainedOnly:false},{ignores:'difficult-and-low-objects'},{combinedTumbleChecks:'shared'},{noAutomaticShortening:false}]){const bad=structuredClone(pack);Object.assign(bad.rules.acrobaticsMovement.crossTerrain,patch);assert.throws(()=>validatePack(bad),/Acrobatics movement/);}
 assert(!pack.rules.ambiguities.some(a=>a.id==='ambiguity:tumble-cross-terrain'),'user chose the default only');
});
test('Move controls expose Cross Difficult Terrain, independent checks and low-object subsets with embedded mechanics',()=>{
 const c=hero();c.acrobaticsMovement.tumble=true;c.acrobaticsMovement.path={squares:2,difficult:2};c.acrobaticsMovement.tumbled={squares:1,difficult:1};const html=acrobaticsMoveControls(c,derive(c,pack),pack);assert(html.includes('Cross Difficult Terrain'));assert(html.includes('data-acrobatics-movement="terrainCheck"'));assert(html.includes('data-acrobatics-movement="check"'));assert(html.includes('Low objects within Difficult'));assert(html.includes('Low objects within Both'));assert(html.includes('rule:acrobatics'));assert(html.includes('assumes successful Cross Difficult Terrain'));assert(!html.includes('DC 35'));
 c.trainedSkills=[];assert(acrobaticsMoveControls(c,derive(c,pack),pack).includes('Requires trained Acrobatics'));
});

test('Charge keeps ordinary double-cost terrain movement by default, with a saved Nimble Charge alternative',()=>{
 const c=hero();c.chargePath={squares:3,difficultSquares:2};c.trainedSkills=[];let d=derive(c,pack),plan=planCharge(c,d,pack,c.id);assert.equal(plan.dc,null);assert.equal(plan.normalCost,5);assert(!plan.nimbleRequired);assert.equal(ambiguityValue(c,pack,'ambiguity:charge-difficult-terrain'),'normal-cost');
 const ui=createHouseRules(pack);ui.setTab('ambiguities');assert(ui.render(c).includes('Nimble Charge check (DC 25)'));assert(ui.change({hasAttribute:k=>k==='data-ambiguity',dataset:{ambiguity:'ambiguity:charge-difficult-terrain'},value:'nimble-check'},c));assert.throws(()=>planCharge(c,derive(c,pack),pack,c.id),/trained Acrobatics/);
 c.trainedSkills=['skill:acrobatics'];plan=planCharge(c,derive(c,pack),pack,c.id);assert.equal(plan.dc,25);assert.equal(plan.normalCost,5);assert(plan.nimbleRequired);const restored=JSON.parse(JSON.stringify(c));validateCharacter(restored,pack);assert.equal(planCharge(restored,derive(restored,pack),pack,restored.id).dc,25);
});
test('alternative terrain Charge failure makes no attack even when normal movement would fit, and retains the Charge turn penalty',()=>{
 const c=hero();c.houseRules={ambiguities:{'ambiguity:charge-difficult-terrain':'nimble-check'}};c.chargePath={squares:3,difficultSquares:2,acrobatics:24};const result=rollCharge(c,derive(c,pack),pack,c.id,noDice);assert(result.charge.stopped);assert.equal(result.charge.dc,25);assert.equal(result.results.length,0);assert.equal(result.charge.movementCost,5);assert(result.text.includes('no attack'));spendAttackResources(c,result);assert.equal(c.chargeReflexPenalty,-2);assert.equal(c.chargePath.acrobatics,null);
 c.chargePath.acrobatics=25;const calls=[];const success=rollCharge(c,derive(c,pack),pack,c.id,roller([18,4],calls));assert(!success.charge.stopped);assert.equal(success.results.length,1);assert.equal(success.charge.movementCost,5,'DC25 allows passage without waiving the terrain cost');
});
test('alternative terrain Charge combined with Cross Difficult Terrain uses the explicit DC35, without affecting ordinary Move',()=>{
 const c=hero();c.houseRules={ambiguities:{'ambiguity:charge-difficult-terrain':'nimble-check'}};c.chargePath={squares:6,difficultSquares:6,crossTerrain:true,acrobatics:34};let result=rollCharge(c,derive(c,pack),pack,c.id,noDice);assert.equal(result.charge.dc,35);assert(result.charge.stopped);assert.equal(result.charge.movementCost,12);
 c.chargePath.acrobatics=35;result=rollCharge(c,derive(c,pack),pack,c.id,roller([18,4]));assert(!result.charge.stopped);assert.equal(result.charge.movementCost,6);
 assert.equal(planAcrobaticsMove(c,derive(c,pack),pack).dc,15);assert.equal(acrobaticsMove(c,derive(c,pack),pack,noDice).checks.length,1);
 c.chargePath={squares:2,difficultSquares:0};assert.equal(planCharge(c,derive(c,pack),pack,c.id).dc,null);assert(!chargeControls(c,derive(c,pack),pack,c.id).includes('DC 25'));
});
test('terrain Charge alternative UI shows its check; disabling restores the no-check default and retains low-object rules',()=>{
 const c=hero();c.chargePath={squares:3,difficultSquares:2};assert(!chargeControls(c,derive(c,pack),pack,c.id).includes('Acrobatics (DC'));c.houseRules={ambiguities:{'ambiguity:charge-difficult-terrain':'nimble-check'}};assert(chargeControls(c,derive(c,pack),pack,c.id).includes('Acrobatics (DC 25)'));
 c.houseRules.ambiguities['ambiguity:charge-difficult-terrain']='normal-cost';assert.equal(planCharge(c,derive(c,pack),pack,c.id).dc,null);c.chargePath.lowObjects=true;assert.equal(planCharge(c,derive(c,pack),pack,c.id).dc,25);c.chargePath.crossTerrain=true;assert.equal(planCharge(c,derive(c,pack),pack,c.id).dc,35);
});
test('Charge ambiguity retains both exact conflicting passages and rejects unknown mappings or saved values',()=>{
 const charge=articleText(pack.rulePages.find(p=>p.id==='rule:charge').article),acrobatics=articleText(pack.rulePages.find(p=>p.id==='rule:acrobatics').article);assert(charge.includes('Charging through Difficult Terrain costs twice'));assert(acrobatics.includes('Charge through Low Objects and Difficult Terrain'));
 const a=pack.rules.ambiguities.find(a=>a.id==='ambiguity:charge-difficult-terrain');assert.equal(a.default,'normal-cost');assert.deepEqual(a.passages.map(p=>p.ruleId),['rule:charge','rule:acrobatics']);assert(a.passages.every(p=>p.fullText));
 const c=hero();c.houseRules={ambiguities:{[a.id]:'invented'}};assert.throws(()=>validateCharacter(c,pack),/ambiguities/);const bad=structuredClone(pack);bad.rules.charge.difficultTerrainAmbiguityId='ambiguity:invented';assert.throws(()=>validatePack(bad),/Charge terrain/);
});


test('Charge entered totals permit legitimate negative skill results at sheet modifier limits',()=>{
 const c=hero();c.condition=4;c.skillModifiers={'skill:acrobatics':-1000};c.chargePath={squares:2,difficultSquares:1,acrobatics:-1002};c.houseRules={ambiguities:{'ambiguity:charge-difficult-terrain':'nimble-check'}};validateCharacter(c,pack);const result=rollCharge(c,derive(c,pack),pack,c.id,noDice);assert(result.charge.stopped);assert.equal(result.charge.check.value,-1002);assert.equal(result.results.length,0);
});
