import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {planCharge} from '../src/charge.js';
import {rollCharge} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {newEncounter,newDay} from '../src/recovery.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){
 const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:18,con:10,int:14,wis:10,cha:10};
 c.levels=Array.from({length:6},(_,i)=>({classId:i===1?'class:scoundrel':'class:soldier',hpRoll:i?5:null,feats:i===0?[{id:'feat:powerful-charge'},{id:'feat:dodge'}]:i===2?[{id:'feat:mobility'},{id:'feat:skill-training',choice:'skill:acrobatics'}]:i===4?[{id:'feat:improved-charge'}]:i===5?[{id:'feat:melee-defense'}]:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));
 c.inventory=['knife','blaster-pistol'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='blaster-pistol'?{shotsRemaining:10}:{})}));return c;
}
const roller=(calls=[],natural=12,skill=40)=>expr=>{calls.push(expr);return {value:expr.startsWith('1d20')?(calls.length===1&&skill!==null?skill:natural):12,d20:expr.startsWith('1d20')?[natural]:[],display:expr,coeffs:[1]};};
const noDice=()=>assert.fail('No dice before preflight');

test('Charge uses pinned verbatim rules and closed constants for feats and Acrobatics',()=>{
 validatePack(pack);assert.match(articleText(pack.rulePages.find(r=>r.id==='rule:charge').article),/DC increases to 35/);
 const bad=structuredClone(pack);bad.rules.charge.powerful.damagePerLevel=1;assert.throws(()=>validatePack(bad),/Powerful Charge/);
 const c=hero();validateCharacter(c,pack);assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:improved-charge'));
});

test('normal Charge adds 2 competence to one attack and retains only the Reflex penalty',()=>{
 const c=hero();c.levels[0].feats[0]={id:'feat:toughness'};const before=derive(c,pack),uid=c.inventory[0].uid,plan=planCharge(c,before,pack,uid);
 assert.equal(plan.attack.attack,before.attacks[0].attack+2);assert.equal(plan.damageBonus,0);
 const calls=[],result=rollCharge(c,before,pack,uid,roller(calls,12,null));assert.equal(calls[0],'1d20+'+(before.attacks[0].attack+2));assert.equal(result.results.length,1);
 assert.equal(c.chargeReflexPenalty,undefined,'preview and rolls do not mutate');spendAttackResources(c,result);let d=derive(c,pack);
 assert.equal(d.defenses.reflex,before.defenses.reflex-2);assert.equal(d.defenses.fortitude,before.defenses.fortitude);assert.equal(d.threshold,before.threshold);assert.deepEqual(d.attacks.map(a=>a.attack),before.attacks.map(a=>a.attack));
 startNextTurn(c);assert.equal(derive(c,pack).defenses.reflex,before.defenses.reflex);
});

test('Powerful Charge adds another 2 and half level damage, including critical multiplication',()=>{
 const c=hero(),d=derive(c,pack),uid=c.inventory[0].uid,plan=planCharge(c,d,pack,uid);assert.equal(plan.attackBonus,4);assert.equal(plan.damageBonus,3);assert.equal(plan.attack.damageDisplay,d.attacks[0].damageDisplay+'+3');
 const calls=[],result=rollCharge(c,d,pack,uid,roller(calls,20,null));assert(result.results[0].critical);assert.equal(calls[1],'('+d.attacks[0].damageDisplay+'+3)*2');
 c.levels.pop();assert.equal(planCharge(c,derive(c,pack),pack,uid).damageBonus,2,'fractions round down');
 c.species='species:ewok';assert.equal(planCharge(c,derive(c,pack),pack,uid).attackBonus,2,'Small species do not qualify for Powerful Charge');
});

test('Improved Charge permits turns but retains difficult terrain costs and the Reflex penalty',()=>{
 const c=hero();c.chargePath={squares:4,turns:true,difficultSquares:2};const d=derive(c,pack),p=planCharge(c,d,pack,c.inventory[0].uid);assert(p.improved);assert.equal(p.normalCost,6);assert.equal(p.reflexPenalty,-2);
 c.chargePath.difficultSquares=3;assert.throws(()=>planCharge(c,d,pack,c.inventory[0].uid),/exceeds Speed/);
 c.chargePath.difficultSquares=0;c.levels[4].feats=[];assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.inventory[0].uid,noDice),/Turning requires Improved Charge/);
});

test('low objects use trained Acrobatics DC25; failure makes no attack and retains the turn penalty',()=>{
 const c=hero(),uid=c.inventory[0].uid;c.chargePath={squares:3,lowObjects:true};c.levels[4].feats=[{id:'feat:mighty-swing'}];c.mightySwing=true;c.inventory[1].aimed=true;c.inventory[1].braced=true;const d=derive(c,pack),calls=[];
 const failed=rollCharge(c,d,pack,uid,roller(calls,12,24));assert.equal(calls.length,1);assert(failed.charge.stopped);assert.equal(failed.charge.dc,25);assert.equal(failed.results.length,0);
 spendAttackResources(c,failed);assert.equal(c.chargeReflexPenalty,-2);assert.equal(c.inventory[1].shotsRemaining,10);assert(!c.inventory[1].braced);assert(!c.inventory[1].aimed);assert(c.mightySwing,'no melee attack consumed the swing');
 c.chargePath.acrobatics=25;const success=rollCharge(c,derive(c,pack),pack,uid,roller([],12,null));assert.equal(success.results.length,1);assert(!success.charge.stopped);spendAttackResources(c,success);assert(!c.mightySwing);assert.equal(c.chargePath.acrobatics,null,'entered checks apply to one attempt');
 c.levels[2].feats=c.levels[2].feats.slice(0,1);assert.throws(()=>rollCharge(c,derive(c,pack),pack,uid,noDice),/trained Acrobatics/);
});

test('Cross Difficult Terrain uses DC15 alone, DC35 with low objects, and normal costs on failure',()=>{
 const c=hero(),uid=c.inventory[0].uid;c.chargePath={squares:6,difficultSquares:6,crossTerrain:true,acrobatics:15};let result=rollCharge(c,derive(c,pack),pack,uid,roller([],12,null));assert.equal(result.charge.dc,15);assert.equal(result.charge.movementCost,6);assert.equal(result.results.length,1);
 c.chargePath.lowObjects=true;c.chargePath.acrobatics=34;result=rollCharge(c,derive(c,pack),pack,uid,noDice);assert.equal(result.charge.dc,35);assert(result.charge.stopped);assert.equal(result.results.length,0);
 c.chargePath.acrobatics=35;assert.equal(rollCharge(c,derive(c,pack),pack,uid,roller([],12,null)).results.length,1);
 c.chargePath={squares:3,difficultSquares:2,crossTerrain:true,acrobatics:14};result=rollCharge(c,derive(c,pack),pack,uid,roller([],12,null));assert.equal(result.charge.movementCost,5);assert(!result.charge.stopped,'a failed DC15 check still permits a path within normal movement costs');
});

test('invalid distances, ranged attacks, Total Defense and helplessness reject before dice or mutation',()=>{
 for(const state of [{chargePath:{squares:1}},{chargePath:{squares:7}},{chargePath:{squares:2,difficultSquares:3}},{defenseStance:'total'},{condition:5},{currentHP:0},{helpless:true}]){
  const c=Object.assign(hero(),state),before=structuredClone(c);assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.inventory[0].uid,noDice));assert.deepEqual(c,before);
 }
 const c=hero();assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.inventory[1].uid,noDice),/melee attack/);
 c.chargePath={squares:2,crossTerrain:true};assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.inventory[0].uid,noDice),/difficult squares/);
});

test('unarmed Charge gains the same bonuses while a thrown use of a melee weapon cannot Charge',()=>{
 const c=hero(),d=derive(c,pack),unarmed=d.attacks.find(a=>a.uid===c.id);const p=planCharge(c,d,pack,c.id);
 assert.equal(p.attack.attack,unarmed.attack+4);assert.equal(p.attack.damageBonus,unarmed.damageBonus+3);
 c.inventory[0].attackStyle='thrown';assert.throws(()=>rollCharge(c,derive(c,pack),pack,c.inventory[0].uid,noDice),/melee attack/);
});

test('Charge stacks with declared defenses, prints the result, and repeats do not compound the penalty',()=>{
 const c=hero();c.defenseStance='fight';c.meleeDefense=2;c.dodgeOpponent='Vader';const d=derive(c,pack),uid=c.inventory[0].uid;
 spendAttackResources(c,rollCharge(c,d,pack,uid,roller([],12,null)));spendAttackResources(c,rollCharge(c,derive(c,pack),pack,uid,roller([],12,null)));const after=derive(c,pack);assert.equal(after.defenses.reflex,d.defenses.reflex-2);assert.equal(after.conditionalDefenses.find(r=>r.against==='dodge-opponent').total,after.defenses.reflex+1);
 assert(renderStatBlock(c,after,pack).includes('Fight Defensively; Melee Defense 2; Charge'));
 for(const reset of [startNextTurn,newEncounter,newDay]){const clone=structuredClone(c);reset(clone);assert.equal(clone.chargeReflexPenalty,0);}
});

test('optional Charge state validates and retains path preferences across next turn',()=>{
 const c=hero();c.chargePath={squares:4,turns:true,difficultSquares:1,lowObjects:true,crossTerrain:true,acrobatics:35};c.chargeReflexPenalty=-2;validateCharacter(c,pack);startNextTurn(c);assert.equal(c.chargePath.acrobatics,null);assert.equal(c.chargePath.squares,4);
 for(const state of [{chargeReflexPenalty:-4},{chargePath:[]},{chargePath:{squares:1}},{chargePath:{turns:1}},{chargePath:{acrobatics:NaN}},{chargePath:{unknown:true}}])assert.throws(()=>validateCharacter({...c,...state},pack),/Invalid/);
});

test('Improved Charge only permits turning and does not bypass the selected difficult-terrain Nimble Charge requirement',()=>{
 const c=hero();c.houseRules={ambiguities:{'ambiguity:charge-difficult-terrain':'nimble-check'}};c.chargePath={squares:3,difficultSquares:1,turns:true,acrobatics:24};const d=derive(c,pack),plan=planCharge(c,d,pack,c.inventory[0].uid);assert(plan.improved);assert(plan.nimbleRequired);assert.equal(plan.dc,25);assert(rollCharge(c,d,pack,c.inventory[0].uid,noDice).charge.stopped);
 c.houseRules.ambiguities['ambiguity:charge-difficult-terrain']='normal-cost';assert.equal(planCharge(c,d,pack,c.inventory[0].uid).dc,null);assert(!planCharge(c,d,pack,c.inventory[0].uid).nimbleRequired);
});
