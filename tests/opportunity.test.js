import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {opportunityContext,opportunityState,startNextRound} from '../src/opportunity.js';
import {opportunityPlan,rollOpportunity} from '../src/opportunity-actions.js';
import {spendAttackResources} from '../src/ammunition.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {newEncounter,newDay,restEightHours,setDead} from '../src/recovery.js';
import {ambiguityValue,createHouseRules} from '../src/house-rules.js';
import {validatePack} from '../tools/validate-rules.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ambiguity='ambiguity:opportunity-limit';
function hero(reflexes=true){
 const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:16,con:10,int:14,wis:10,cha:10};c.levels[0].classId='class:soldier';c.levels[0].feats=reflexes?[{id:'feat:combat-reflexes'}]:[];
 c.inventory=['knife','blaster-pistol','blaster-rifle'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='knife'?{}:{shotsRemaining:20})}));c.opportunity={...opportunityContext(c),opponent:'Guard A',action:'Guard A, move 1',provoked:true};return c;
}
const roller=(natural=12,calls=[])=>expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?natural+Number(m[1]):9,d20:m?[natural]:[],display:expr,coeffs:[1]};};
const noDice=()=>assert.fail('No dice before validation');
const shot=c=>c.inventory[1].uid;
function attack(c,uid=shot(c),natural=12){const result=rollOpportunity(c,pack,uid,roller(natural));spendAttackResources(c,result);return result;}
const declare=(c,opponent,action)=>Object.assign(c.opportunity,{opponent,action,provoked:true});
function interpretation(c,value){c.houseRules={ambiguities:{[ambiguity]:value}};}

test('Combat Reflexes adds the current Dexterity modifier to the one-per-round quota',()=>{
 const c=hero();let d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:combat-reflexes'));assert.equal(opportunityState(c,pack,d.ctx,d.mods).maximum,4);
 const ordinary=hero(false);d=derive(ordinary,pack);assert.equal(opportunityState(ordinary,pack,d.ctx,d.mods).maximum,1);
 c.abilities.dex=8;d=derive(c,pack);assert.equal(opportunityState(c,pack,d.ctx,d.mods).maximum,1);
});
test('default independently enforces both opponent and event limits; approved alternatives survive saving',()=>{
 const c=hero();assert.equal(ambiguityValue(c,pack,ambiguity),'both');attack(c);
 declare(c,'guard a','Guard A, load 1');assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/opponent/);
 declare(c,'Guard B','guard a, move 1');assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/provoking action/);
 interpretation(c,'opponent');attack(c);assert.equal(c.opportunity.used.length,2);
 declare(c,'Guard B','Other event');assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/opponent/);
 interpretation(c,'action');attack(c);assert.equal(c.opportunity.used.length,3);
 declare(c,'Guard C','other event');assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/provoking action/);
 interpretation(c,'both');assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/provoking action/);
 const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(saved.opportunity.used.length,3);
 const ui=createHouseRules(pack);ui.setTab('ambiguities');const html=ui.render(c);for(const label of ['Opponent + provoking action','Opponent only','Provoking action only'])assert(html.includes(label));
});
test('switching interpretations cannot replay a recorded opponent/event pair or refill the quota',()=>{
 const c=hero();attack(c);interpretation(c,'opponent');declare(c,'Guard B','Guard A, move 1');attack(c);
 interpretation(c,'action');declare(c,'Guard A','Guard A, move 1');assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/provoking action/);
 for(let i=2;i<4;i++){declare(c,'Guard A','Extra '+i);attack(c);}assert.equal(c.inventory[1].shotsRemaining,16);
 interpretation(c,'opponent');declare(c,'Guard C','New');assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/remaining this round/);
});
test('only melee, pistols, folded stocks, and Martial Arts I unarmed attacks can make opportunities',()=>{
 const c=hero(),d=derive(c,pack);assert(d.attacks.find(a=>a.uid===c.inventory[0].uid).opportunityWeapon);assert(d.attacks.find(a=>a.uid===shot(c)).opportunityWeapon);
 assert.throws(()=>rollOpportunity(c,pack,c.inventory[2].uid,noDice),/Weapon cannot/);
 c.inventory[2].stockPosition='folded';assert(opportunityPlan(c,pack,c.inventory[2].uid));c.inventory[2].stockPosition='extended';assert.throws(()=>rollOpportunity(c,pack,c.inventory[2].uid,noDice),/Weapon cannot/);
 assert.throws(()=>rollOpportunity(c,pack,c.id,noDice),/Weapon cannot/);
 c.levels[0].feats.push({id:'feat:martial-arts-i'});assert(opportunityPlan(c,pack,c.id));
 c.inventory[0].attackStyle='thrown';assert.throws(()=>rollOpportunity(c,pack,c.inventory[0].uid,noDice),/Weapon cannot/);
});
test('flat-footed requires Combat Reflexes; helplessness and Total Defense still prevent attacks',()=>{
 const c=hero(false);c.flatFooted=true;assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/Flat-footed/);
 c.levels[0].feats=[{id:'feat:combat-reflexes'}];assert(opportunityPlan(c,pack,shot(c)));
 c.helpless=true;assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/helpless/);c.helpless=false;
 c.defenseStance='total';assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/Total Defense/);c.defenseStance='none';c.condition=5;assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/helpless/);
});
test('Cover blocks opportunities even with Aim; Total Concealment cannot be bypassed by targeting a square',()=>{
 const c=hero();c.inventory[1].aimed=true;
 for(const cover of ['cover','improved','total']){c.attackTarget={cover};assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/Cover prevents/);}
 c.attackTarget={concealment:'total',attackSquare:true,darkness:true};assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/Total Concealment/);
 c.species='species:sullustan';assert(opportunityPlan(c,pack,shot(c)));c.attackTarget.darkness=false;assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/Total Concealment/);
 c.attackTarget={concealment:'concealment'};assert(opportunityPlan(c,pack,shot(c)));
});
test('opportunity range is independent of ordinary weapon distance and uses one full-bonus attack',()=>{
 const c=hero();c.inventory[1].distance=100000;assert.equal(derive(c,pack).attacks[1].available,false);c.opportunity.distance=1;
 const plan=opportunityPlan(c,pack,shot(c)),result=attack(c);assert.equal(result.results.length,1);assert.equal(result.results[0].total,12+plan.attack.attack);assert.equal(c.inventory[1].distance,100000);
 c.opportunity.distance=100000;declare(c,'Guard B','Move B');assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/unavailable/);
});
test('natural misses spend ammunition and opportunity; failed preflight and stale histories spend neither',()=>{
 const c=hero();const result=attack(c,shot(c),1);assert(result.results[0].naturalMiss);assert.equal(c.opportunity.used.length,1);assert.equal(c.inventory[1].shotsRemaining,19);assert.equal(c.opportunity.provoked,false);
 declare(c,'Guard B','Guard B, move');c.inventory[1].shotsRemaining=0;assert.throws(()=>rollOpportunity(c,pack,shot(c),noDice),/unavailable/);assert.equal(c.opportunity.used.length,1);
 c.inventory[1].shotsRemaining=19;const pending=rollOpportunity(c,pack,shot(c),roller());c.opportunity.used.push({opponent:'Guard C',action:'Guard C, move'});assert.throws(()=>spendAttackResources(c,pending),/history changed/);assert.equal(c.inventory[1].shotsRemaining,19);
 c.opportunity.used.pop();c.inventory[1].shotsRemaining=0;assert.throws(()=>spendAttackResources(c,pending),/Ammunition changed/);assert.equal(c.opportunity.used.length,1);
});
test('next round resets quota, not until-next-turn penalties; turns and death do not replenish opportunities',()=>{
 const c=hero();attack(c);startNextTurn(c);assert.equal(c.opportunity.used.length,1);setDead(c,true);assert.equal(c.opportunity.used.length,1);setDead(c,false);c.currentHP=derive(c,pack).hp;c.condition=0;
 c.powerAttack=1;c.chargeReflexPenalty=-2;c.mightySwing=true;c.fullAttackPenalties={twoWeapons:-10,doubleAttack:0,tripleAttack:0};startNextRound(c);
 assert.equal(c.opportunity.used.length,0);assert.equal(c.opportunity.action,'');assert.equal(c.opportunity.provoked,false);assert.equal(c.mightySwing,false);assert.equal(c.powerAttack,1);assert.equal(c.chargeReflexPenalty,-2);assert.equal(c.fullAttackPenalties.twoWeapons,-10);
 for(const reset of [c=>newEncounter(c),c=>newDay(c,pack),c=>restEightHours(c,derive(c,pack),pack)]){declare(c,'Guard A','Next event');attack(c);reset(c);assert.equal(c.opportunity.used.length,0);}
});
test('character validation rejects invalid counters, forged properties and duplicate normalized events',()=>{
 const c=hero();validateCharacter(c,pack);
 for(const p of [null,[],{distance:0},{distance:1.5},{provoked:1},{opponent:5},{remaining:100},{used:7},{used:[{opponent:'A',action:''}]},{used:[{opponent:'A',action:'M'},{opponent:' a ',action:' m '}]}])assert.throws(()=>validateCharacter({...c,opportunity:p},pack),/opportunity/);
});
test('opportunity mappings retain the conflicting pinned passages and reject invented constants',()=>{
 validatePack(pack);const a=pack.rules.ambiguities.find(a=>a.id===ambiguity);assert.equal(a.default,'both');for(const passage of a.passages)assert(passage.fullText);
 const pages=a.passages.map(p=>articleText(pack.rulePages.find(r=>r.id===p.ruleId).article));assert(pages.some(t=>t.includes('one Attack of Opportunity on a single opponent')));assert(pages.some(t=>/one Attack of Opportunity per provoking action/i.test(t)));
 const bad=structuredClone(pack);bad.rules.opportunity.basePerRound=2;assert.throws(()=>validatePack(bad),/opportunity/);
});
