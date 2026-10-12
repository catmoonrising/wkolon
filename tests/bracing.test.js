import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {bracingState,declareBracing} from '../src/attack-techniques.js';
import {rollRoutine} from '../src/combat.js';
import {reloadWeapon,spendAttackResources} from '../src/ammunition.js';
import {newEncounter,newDay,setDead,restEightHours,catchSecondWind,startRage,recoverCondition,recordKnockout} from '../src/recovery.js';
import {rollBellow} from '../src/species-actions.js';
import {usePower,recoverPower,recoverSuite} from '../src/force-powers.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,more={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...more});
function hero(str=13){
 const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str,dex:13,con:10,int:10,wis:10,cha:10};
 c.levels[0].classId='class:soldier';c.levels[0].feats=[{id:'feat:weapon-proficiency-heavy-weapons'},{id:'feat:burst-fire'}];
 c.inventory=[item('heavy-repeating-blaster',{shotsRemaining:20}),item('light-repeating-blaster',{shotsRemaining:20}),item('blaster-rifle',{shotsRemaining:20})];return c;
}
const routine=(...steps)=>({name:'Bracing',steps:steps.map(([attackId,count=1])=>({attackId,count,attackMod:0,damageMod:0}))});
const roll=(expressions=[],natural=12)=>expr=>{expressions.push(expr);return {value:expr.startsWith('1d20')?natural:10,d20:expr.startsWith('1d20')?[natural]:[],display:expr,coeffs:[1]};};

test('bracing uses pinned, closed data and validates exclusive saved declarations',()=>{
 validatePack(pack);const c=hero();declareBracing(c,pack,c.inventory[0].uid,true);validateCharacter(c,pack);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 const passage=pack.rulePages.find(r=>r.id==='rule:bracing');assert.equal(pack.sources.find(s=>s.id===passage.sourceId).revision,27406);assert.match(articleText(passage.article),/immediately before making your attack/);
 for(const mutate of [c=>c.inventory[0].braced='yes',c=>c.inventory[1].braced=true,c=>c.inventory[2].braced=true,c=>c.inventory[2].aimed=true]){const bad=structuredClone(c);mutate(bad);assert.throws(()=>validateCharacter(bad,pack),/bracing/);}
 const bad=structuredClone(pack);bad.rules.bracing.penalty=-1;assert.throws(()=>validatePack(bad),/bracing/);
});

test('only autofire-only weapons can brace, with the user-approved pistol-only stock requirement',()=>{
 const c=hero();assert(derive(c,pack).attacks[0].bracing.available);assert(derive(c,pack).attacks[1].bracing.available);assert(!derive(c,pack).attacks[2].bracing.available);
 const before=structuredClone(c);assert.throws(()=>declareBracing(c,pack,c.inventory[2].uid,true),/autofire-only/);assert.deepEqual(c,before);
 const pistol={autofireOnly:true,group:'pistols'};assert(!bracingState(pistol,{},pack,c).available);pistol.retractableStock={};assert(bracingState(pistol,{},pack,c).available);assert(!bracingState(pistol,{stockPosition:'folded'},pack,c).available);assert(!bracingState(pistol,{stockPosition:'none'},pack,c).available);
 assert(!bracingState({autofireOnly:true,group:'exotic-weapons'},{},pack,c).available);assert(!bracingState({autofireOnly:true,group:'rifles',retractableStock:{}},{stockPosition:'folded'},pack,c).available);
});

test('bracing reduces only the immediately following attack penalty and consumes on a miss',()=>{
 const c=hero();let attacks=derive(c,pack).attacks;const before=attacks[0].attack;declareBracing(c,pack,attacks[0].uid,true);attacks=derive(c,pack).attacks;assert.equal(attacks[0].attack,before+3);assert.equal(attacks[0].ammunition.cost,10);assert.equal(attacks[0].areaType,'burst');
 const result=rollRoutine(routine([attacks[0].uid,2]),attacks,pack.rules.combat,roll([],1));assert.deepEqual(result.results.map(r=>r.braced),[true,false]);assert.match(result.results[1].attackRoll.display,new RegExp('1d20\\'+(before<0?'-':'+')+Math.abs(before)));assert.equal(result.ammunitionSpent[0].shots,20);assert(result.bracingConsumed);assert(c.inventory[0].braced);spendAttackResources(c,result);assert(!c.inventory[0].braced);assert.equal(c.inventory[0].shotsRemaining,0);
 c.inventory[0].shotsRemaining=20;declareBracing(c,pack,c.inventory[0].uid,true);attacks=derive(c,pack).attacks;const mixed=rollRoutine(routine([attacks[2].uid],[attacks[0].uid]),attacks,pack.rules.combat,roll());assert(mixed.results.every(r=>!r.braced));assert(mixed.bracingConsumed);spendAttackResources(c,mixed);assert(!c.inventory[0].braced);
});

test('braced Burst Fire keeps its five-shot cost and criticals, with a saved low-Strength alternative',()=>{
 const c=hero(12),e=c.inventory[0];e.attackTechnique='burst-fire';const unbraced=derive(c,pack).attacks[0];declareBracing(c,pack,e.uid,true);let a=derive(c,pack).attacks[0];assert.equal(a.attack,unbraced.attack+8);assert.equal(a.damage,'5d10');assert.equal(a.ammunition.cost,5);assert.equal(a.areaType,null);
 c.houseRules={ambiguities:{'ambiguity:bracing-burst-fire':'burst-penalty'}};a=derive(c,pack).attacks[0];assert.equal(a.attack,unbraced.attack);assert(a.braced);validateCharacter(c,pack);
 const result=rollRoutine(routine([a.uid]),[a],pack.rules.combat,roll([],20));assert(result.results[0].critical);assert.equal(result.ammunitionSpent[0].shots,5);spendAttackResources(c,result);assert.equal(e.shotsRemaining,15);assert(!e.braced);
 c.abilities.str=13;declareBracing(c,pack,e.uid,true);a=derive(c,pack).attacks[0];assert.equal(a.bracing.penalty,-2);
});

test('declaring bracing replaces Aim and other braces; reload and time resets clear it atomically',()=>{
 const c=hero();c.inventory[2].aimed=true;declareBracing(c,pack,c.inventory[0].uid,true);assert(!c.inventory[2].aimed);declareBracing(c,pack,c.inventory[1].uid,true);assert(!c.inventory[0].braced);assert(c.inventory[1].braced);
 reloadWeapon(c,pack,c.inventory[2].uid);assert(!c.inventory[1].braced);
 for(const action of [c=>newEncounter(c),c=>newDay(c,pack),c=>restEightHours(c,derive(c,pack),pack),c=>setDead(c,true)]){const fresh=hero();declareBracing(fresh,pack,fresh.inventory[0].uid,true);action(fresh);assert(!fresh.inventory[0].braced);}
 declareBracing(c,pack,c.inventory[0].uid,true);c.condition=5;const before=structuredClone(c);assert.throws(()=>declareBracing(c,pack,c.inventory[1].uid,true),/unavailable/);assert.deepEqual(c,before);
});

test('failed routine preflight and changed ammunition preserve bracing',()=>{
 const c=hero();declareBracing(c,pack,c.inventory[0].uid,true);c.inventory[0].shotsRemaining=5;let attacks=derive(c,pack).attacks;const before=structuredClone(c);assert.throws(()=>rollRoutine(routine([attacks[0].uid]),attacks,pack.rules.combat,()=>assert.fail('Preflight before dice')),/shots/);assert.deepEqual(c,before);
 c.inventory[0].shotsRemaining=20;attacks=derive(c,pack).attacks;const result=rollRoutine(routine([attacks[0].uid]),attacks,pack.rules.combat,roll());c.inventory[0].shotsRemaining=0;const changed=structuredClone(c);assert.throws(()=>spendAttackResources(c,result),/Ammunition changed/);assert.deepEqual(c,changed);
});

test('implemented recovery, species and Force actions interrupt bracing, while invalid actions preserve it',()=>{
 const c=hero();c.currentHP=1;declareBracing(c,pack,c.inventory[0].uid,true);catchSecondWind(c,derive(c,pack),pack);assert(!c.inventory[0].braced);
 c.condition=1;declareBracing(c,pack,c.inventory[0].uid,true);recoverCondition(c,derive(c,pack));assert(!c.inventory[0].braced);
 c.species='species:wookiee';declareBracing(c,pack,c.inventory[0].uid,true);startRage(c,derive(c,pack));assert(!c.inventory[0].braced);
 const b=hero();b.species='species:ithorian';declareBracing(b,pack,b.inventory[0].uid,true);rollBellow(b,derive(b,pack),pack,0,null,roll());assert(!b.inventory[0].braced);declareBracing(b,pack,b.inventory[0].uid,true);recordKnockout(b);assert(!b.inventory[0].braced);
 const f=hero();f.levels[0].classId='class:jedi';f.levels[0].feats=[{id:'feat:force-training'},{id:'feat:weapon-proficiency-heavy-weapons'}];f.trainedSkills=['skill:use-the-force'];const copy={id:crypto.randomUUID(),powerId:'power:battle-strike',spent:false};f.levels[0].forcePowers=[copy];
 declareBracing(f,pack,f.inventory[0].uid,true);const before=structuredClone(f);assert.throws(()=>usePower(f,derive(f,pack),pack,copy.id,0),/Invalid power roll/);assert.deepEqual(f,before);
 usePower(f,derive(f,pack),pack,copy.id,12);assert(!f.inventory[0].braced);declareBracing(f,pack,f.inventory[0].uid,true);recoverPower(f,derive(f,pack),pack,copy.id);assert(!f.inventory[0].braced);
 declareBracing(f,pack,f.inventory[0].uid,true);f.mightySwing=true;recoverSuite(f,derive(f,pack));assert(!f.inventory[0].braced);assert(!f.mightySwing);
});
