import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,previewPlan,beginNextTurn,endCurrentTurn,endTrackedCombat} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {newEncounter,newDay} from '../src/recovery.js';
import {damageOutcome,applyIncomingDamage} from '../src/incoming-damage.js';
import {defenseAbilityDetails} from '../src/defense-abilities.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const level=(talent=null)=>({classId:'class:jedi',hpRoll:4,startingFeat:null,feats:[],talent:talent?{id:'talent:'+talent}:null,trainedSkills:[],abilityIncreases:[]});
function hero(talents=['body-control'],abilities={}){
 const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:10,wis:12,cha:16,...abilities};c.trainedSkills=['skill:use-the-force'];
 c.forceTraditions=[{id:'tradition:matukai-adept',level:1,darkSideScore:0}];c.levels[0].talent={id:'talent:'+talents[0]};
 for(let n=2;n<=7;n++)c.levels.push(level(n%2&&talents[(n-1)/2]?talents[(n-1)/2]:null));
 c.inventory=[];c.forcePoints=5;c.currentHP=derive(c,pack).hp;validateCharacter(c,pack);return c;
}
const wanShen=(extra={})=>({id:'equipment:wan-shen',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:true,attackMod:0,damageMod:0,...extra});
const lightsaber=()=>({id:'equipment:lightsaber',uid:crypto.randomUUID(),quantity:1,equipped:true,activated:true,twoHanded:false,attackMod:0,damageMod:0});
const noRoll=()=>{throw Error('Should not roll');};
const body=(c,o={})=>takeAction(c,pack,'encounter-talent',{talentId:'talent:body-control',choice:'immunity',...o},noRoll);
let attacks=0;
const solid=(c,o={damaged:true})=>takeAction(c,pack,'soft-to-solid',{trigger:'Attack '+(++attacks),...o},noRoll);
const melee=d=>d.conditionalDefenses.find(r=>r.defense==='reflex'&&r.against==='melee-aware');
const aware=d=>d.conditionalDefenses.find(r=>r.defense==='reflex'&&r.against==='aware');

test('Matukai metadata pins exact actions, effects, caps and sources',()=>{
 validatePack(pack);
 for(const change of [p=>p.talents.find(t=>t.id==='talent:body-control').activation.action='standard',p=>p.talents.find(t=>t.id==='talent:body-control').activation.choices[0].effects[0].hazards.pop(),p=>p.talents.find(t=>t.id==='talent:body-control').effects[0].ability='wis',p=>p.rules.reactionTalentActions[0].damageReduction=5,p=>p.rules.reactionTalentActions[0].forcePoints=0,p=>p.rules.turnTalentActions[1].maximum=4,p=>p.rules.turnTalentActions[1].effect.against='aware',p=>p.rules.turnTalentActions[1].weaponId='equipment:quarterstaff',p=>{p.rules.actionEconomy.actions.find(a=>a.id==='soft-to-solid').type='swift';},p=>delete p.talents.find(t=>t.id==='talent:soft-to-solid').automation]){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
 for(const id of ['body-control','soft-to-solid','wan-shen-defense'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
 assert.equal(pack.talents.find(t=>t.id==='talent:physical-surge').automation,'manual');assert.equal(pack.talents.find(t=>t.id==='talent:wan-shen-kata').automation,'manual');
});

test('Body Control selects CHA instead of CON for Fortitude without adding them, and threshold follows',()=>{
 const c=hero(),d=derive(c,pack),plain=hero(['soft-to-solid']),p=derive(plain,pack);
 assert.equal(d.defenseAbilities.fortitude.ability,'cha');assert.deepEqual(d.defenseAbilities.fortitude.options.map(o=>o.ability),['con','cha']);
 assert.equal(d.defenses.fortitude,p.defenses.fortitude+3);assert.equal(d.threshold,p.threshold+3);assert.match(d.breakdowns.fortitude,/\(CHA\)/);
 assert.equal(p.defenseAbilities.fortitude.options.length,1);
 c.defenseAbilities={fortitude:'con'};validateCharacter(c,pack);assert.equal(derive(c,pack).defenses.fortitude,p.defenses.fortitude);
 const low=hero(['body-control'],{con:16,cha:10});assert.equal(derive(low,pack).defenseAbilities.fortitude.ability,'con');low.defenseAbilities={fortitude:'cha'};assert.equal(derive(low,pack).defenses.fortitude,derive(hero(['soft-to-solid'],{con:16,cha:10}),pack).defenses.fortitude-3);
 c.levels[0].talent=null;const lost=derive(c,pack);assert.equal(lost.defenses.fortitude,p.defenses.fortitude);assert.equal(lost.defenseAbilities.fortitude.ability,'con');
 c.defenseAbilities={fortitude:'wis'};assert.throws(()=>validateCharacter(c,pack),/defense abilities/);
});

test('Constitution replacements do not apply to a body whose Fortitude does not use CON',()=>{
 const effects=[{target:'defenseAbility',defense:'fortitude',ability:'cha'},{target:'defenseAbility',defense:'fortitude',ability:'str'}],mods={str:1,dex:0,con:0,int:0,wis:0,cha:4};
 const opts=(fortitudeAbility)=>defenseAbilityDetails({},pack,effects,mods,{dex:0,armorMaxDex:null,dexDenied:false,helpless:false,fortitudeAbility}).fortitude;
 assert.deepEqual(opts('con').options.map(o=>o.ability),['con','cha','str']);assert.equal(opts('con').ability,'cha');
 assert.deepEqual(opts('str').options.map(o=>o.ability),['str']);assert.equal(opts('str').modifier,1);
});

test('Body Control immunity is one Swift Action and one FP for the encounter, without stacking or hazard automation',()=>{
 const c=hero(),fp=c.forcePoints;assert.deepEqual(derive(c,pack).hazardImmunities,[]);
 const r=body(c);assert.match(r.text,/Body Control \(Poison, Radiation, Disease immunity\); Force Points -1/);assert.equal(c.forcePoints,fp-1);assert.deepEqual(c.actionState.spent,['swift']);assert(c.actionState.forceSpent);
 assert.deepEqual(derive(c,pack).hazardImmunities,['poison','radiation','disease']);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 assert.throws(()=>body(c),/already active/);beginNextTurn(c,pack);assert.deepEqual(derive(c,pack).hazardImmunities.length,3);
 assert.match(renderStatBlock(c,derive(c,pack),pack),/Poison, Radiation, Disease immunity/);
 c.levels[0].talent=null;assert.deepEqual(derive(c,pack).hazardImmunities,[]);c.levels[0].talent={id:'talent:body-control'};
 endTrackedCombat(c);assert.deepEqual(derive(c,pack).hazardImmunities,[]);
 body(c);newEncounter(c);assert.deepEqual(derive(c,pack).hazardImmunities,[]);body(c);newDay(c,pack);assert.equal(c.talentActivations,undefined);
});

test('Body Control preflight rejects missing or already spent Force Points without mutation',()=>{
 const c=hero();c.forcePoints=0;let before=structuredClone(c);assert.throws(()=>body(c),/Not enough Force Points/);assert.deepEqual(c,before);
 const q=hero();beginNextTurn(q,pack);q.actionState.forceSpent=true;before=structuredClone(q);assert.throws(()=>body(q),/already spent/);assert.deepEqual(q,before);
 const r=hero(['soft-to-solid']);assert.throws(()=>body(r),/Talent unavailable/);
});

test('Soft to Solid requires a declared attack, spends one FP as a Reaction and protects only later damage',()=>{
 const c=hero(['soft-to-solid']),fp=c.forcePoints;beginNextTurn(c,pack);const hp=c.currentHP;
 let before=structuredClone(c);assert.throws(()=>solid(c,{damaged:false}),/Confirm damage from an attack/);assert.deepEqual(c,before);
 applyIncomingDamage(c,derive(c,pack),pack,12,{});assert.equal(c.currentHP,hp-12);
 const r=solid(c);assert.equal(r.text,'Soft to Solid: DR 10; Force Points -1');assert.equal(c.currentHP,hp-12);assert.equal(c.forcePoints,fp-1);assert.deepEqual(c.actionState.spent,[]);assert.equal(c.actionState.reactions.length,1);
 const d=derive(c,pack);assert.equal(d.timedDR,10);let x=damageOutcome(c,d,pack,15,{});assert.equal(x.drBlocked,10);assert.equal(x.hpDamage,5);
 assert.equal(damageOutcome(c,d,pack,15,{lightsaber:true}).drBlocked,0);
 c.protection={...c.protection,dr:15};assert.equal(damageOutcome(c,derive(c,pack),pack,15,{}).drBlocked,15);
 assert.match(renderStatBlock(c,derive(c,pack),pack),/<b>Soft to Solid:<\/b> DR 10/);
 c.levels[0].talent=null;assert.equal(derive(c,pack).timedDR,0);
});

test('Soft to Solid lasts until the end of the next own turn from either side of the turn boundary',()=>{
 const own=hero(['soft-to-solid']);beginNextTurn(own,pack);solid(own);assert.deepEqual(own.reactionTalents,[{id:'soft-to-solid',endsRemaining:2,ended:false}]);
 endCurrentTurn(own,pack);endCurrentTurn(own,pack);assert.equal(derive(own,pack).timedDR,10);beginNextTurn(own,pack);assert.equal(derive(own,pack).timedDR,10);endCurrentTurn(own,pack);assert.equal(own.reactionTalents,undefined);
 const implicit=hero(['soft-to-solid']);beginNextTurn(implicit,pack);solid(implicit);beginNextTurn(implicit,pack);assert.equal(derive(implicit,pack).timedDR,10);beginNextTurn(implicit,pack);assert.equal(derive(implicit,pack).timedDR,0);
 const off=hero(['soft-to-solid']);beginNextTurn(off,pack);endCurrentTurn(off,pack);solid(off);assert.deepEqual(off.reactionTalents,[{id:'soft-to-solid',endsRemaining:1,ended:true}]);
 beginNextTurn(off,pack);assert.equal(derive(off,pack).timedDR,10);endCurrentTurn(off,pack);assert.equal(derive(off,pack).timedDR,0);
 const idle=hero(['soft-to-solid']);solid(idle);assert.deepEqual(idle.reactionTalents,[{id:'soft-to-solid',endsRemaining:1,ended:true}]);beginNextTurn(idle,pack);assert.equal(derive(idle,pack).timedDR,10);endCurrentTurn(idle,pack);assert.equal(derive(idle,pack).timedDR,0);
});

test('Soft to Solid refreshes only when it extends the duration and never stacks DR',()=>{
 const c=hero(['soft-to-solid']);beginNextTurn(c,pack);endCurrentTurn(c,pack);solid(c);let before=structuredClone(c);assert.throws(()=>solid(c),/Already active|already spent/);assert.deepEqual(c,before);
 beginNextTurn(c,pack);const fp=c.forcePoints;solid(c);assert.equal(c.forcePoints,fp-1);assert.deepEqual(c.reactionTalents,[{id:'soft-to-solid',endsRemaining:2,ended:false}]);assert.equal(derive(c,pack).timedDR,10);
 const q=hero(['soft-to-solid']);beginNextTurn(q,pack);solid(q);q.actionState.forceSpent=false;before=structuredClone(q);assert.throws(()=>solid(q),/Already active/);assert.deepEqual(q,before);
});

test('Soft to Solid resets, previews, validation and helpless preflight are atomic',()=>{
 for(const reset of [c=>endTrackedCombat(c),c=>newEncounter(c),c=>newDay(c,pack)]){const c=hero(['soft-to-solid']);solid(c);reset(c);assert.equal(c.reactionTalents,undefined);assert.equal(derive(c,pack).timedDR,0);}
 const c=hero(['soft-to-solid']);beginNextTurn(c,pack);const s=queueAction(c,'soft-to-solid',{damaged:true,trigger:'Queued attack'}),before=structuredClone(c),rows=previewPlan(c,pack);assert(!rows.find(r=>r.id===s.id).issue);assert.deepEqual(c,before);
 for(const rows of [null,[{id:'invented',endsRemaining:1,ended:false}],[{id:'soft-to-solid',endsRemaining:3,ended:false}],[{id:'soft-to-solid',endsRemaining:1}],[{id:'soft-to-solid',endsRemaining:1,ended:false},{id:'soft-to-solid',endsRemaining:2,ended:false}]])assert.throws(()=>validateCharacter({...c,reactionTalents:rows},pack),/reaction talents/);
 const h=hero(['soft-to-solid']);h.helpless=true;const hb=structuredClone(h);assert.throws(()=>solid(h),/helpless/);assert.deepEqual(h,hb);
});

test('Wan-Shen Defense needs a wielded Wan-Shen and grants capped melee-only deflection while aware',()=>{
 const c=hero(['wan-shen-defense']),base=derive(c,pack).defenses.reflex;let before=structuredClone(c);
 assert.throws(()=>takeAction(c,pack,'wan-shen-defense',{},noRoll),/Requires a wielded Wan-Shen/);assert.deepEqual(c,before);
 c.inventory=[wanShen({equipped:false})];assert.throws(()=>takeAction(c,pack,'wan-shen-defense',{},noRoll),/Wan-Shen/);c.inventory=[wanShen({carried:false})];assert.throws(()=>takeAction(c,pack,'wan-shen-defense',{},noRoll),/Wan-Shen/);
 c.inventory=[wanShen()];const fp=c.forcePoints,r=takeAction(c,pack,'wan-shen-defense',{},noRoll);assert.equal(r.text,'Wan-Shen Defense: Reflex +1 (vs. melee while aware)');assert.deepEqual(c.actionState.spent,['swift']);assert.equal(c.forcePoints,fp);
 const d=derive(c,pack);assert.equal(d.defenses.reflex,base);assert.equal(melee(d).total,base+1);assert.equal(melee(d).type,'deflection');assert(!aware(d));
 assert.match(renderStatBlock(c,derive(c,pack),pack),/Reflex \+1 \(vs\. melee while aware\)/);
 c.flatFooted=true;assert(!melee(derive(c,pack)));c.flatFooted=false;c.inventory=[];assert.equal(melee(derive(c,pack)).total,base+1);
 c.houseRules={ambiguities:{'ambiguity:lightsaber-defense-weapon-change':'require-weapon'}};assert.equal(melee(derive(c,pack)).total,base+1);delete c.houseRules;
 beginNextTurn(c,pack);assert(!melee(derive(c,pack)));assert.equal(c.turnTalents,undefined);
 const three=hero(['wan-shen-defense','wan-shen-defense','wan-shen-defense']);three.inventory=[wanShen()];takeAction(three,pack,'wan-shen-defense',{},noRoll);assert.equal(melee(derive(three,pack)).total,derive(three,pack).defenses.reflex+3);assert.throws(()=>takeAction(three,pack,'wan-shen-defense',{},noRoll),/Already active/);
 const four=hero(['wan-shen-defense','wan-shen-defense','wan-shen-defense','wan-shen-defense']);assert(derive(four,pack).issues.some(s=>s.includes('Wan-Shen Defense')));
 three.levels[2].talent=null;assert.equal(melee(derive(three,pack)).total,derive(three,pack).defenses.reflex+2);
});

test('Wan-Shen Defense and Lightsaber Defense share one highest deflection bonus against melee',()=>{
 const c=hero(['wan-shen-defense','wan-shen-defense','lightsaber-defense']);c.inventory=[wanShen(),lightsaber()];const base=derive(c,pack).defenses.reflex;
 takeAction(c,pack,'lightsaber-defense',{},noRoll);takeAction(c,pack,'wan-shen-defense',{},noRoll);
 let d=derive(c,pack);assert.equal(aware(d).total,base+1);assert.equal(melee(d).total,base+2);
 const q=hero(['lightsaber-defense','lightsaber-defense','wan-shen-defense']);q.inventory=[wanShen(),lightsaber()];takeAction(q,pack,'lightsaber-defense',{},noRoll);takeAction(q,pack,'wan-shen-defense',{},noRoll);
 d=derive(q,pack);assert.equal(aware(d).total,d.defenses.reflex+2);assert(!melee(d),'equal melee row is redundant');
 c.inventory=[wanShen()];assert.equal(melee(derive(c,pack)).total,base+2);
});
