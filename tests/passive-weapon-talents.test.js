import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import {targetModifiers} from '../src/attack-targets.js';
import {validatePack} from '../tools/validate-rules.js';
const real=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),pack=structuredClone(real),{newCharacter}=api;
// Prestige tree access needs a long entry build; open the trees and test the effects. tools/passive-weapon-talents-checks.cjs uses a legal Soldier.
pack.classes.find(k=>k.id==='class:soldier').talentTrees=[...new Set(pack.talents.map(t=>t.tree))];
const derive=c=>api.derive(c,pack);
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
function hero(talents=[],inventory=[],abilities={},feats=[],start=0){
 const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:16,dex:18,con:12,int:10,wis:10,cha:10,...abilities};c.levels[0].talent=null;
 for(let i=1;i<12;i++)c.levels.push({classId:'class:soldier',hpRoll:6,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 talents.forEach((id,i)=>c.levels[i*2+start].talent={id:'talent:'+id,manualRequirements:true});feats.forEach(([id,choice,level=0])=>c.levels[level].feats.push({id:'feat:'+id,...(choice?{choice}:{})}));c.inventory=inventory;return c;
}
const row=(c,id)=>derive(c).attacks.find(a=>a.id==='equipment:'+id);
const unarmed=c=>derive(c).attacks.find(a=>a.unarmed);

test('records are Partial and the validator rejects an owned rule on a feat',()=>{
 validatePack(real);
 for(const id of ['multiattack-proficiency-advanced-melee-weapons','multiattack-proficiency-exotic-weapons','flurry-of-blows','master-of-elegance','hammerblow','keen-shot','blind-shot','knight-armor-mastery'])assert.equal(real.talents.find(t=>t.id==='talent:'+id).automation,'partial',id);
 const bad=structuredClone(real);bad.feats[0].automation='partial';bad.feats[0].effects=[{target:'unarmedStrengthAttack'}];assert.throws(()=>validatePack(bad));
});
test('Multiattack Proficiency stacks per selection and matches only its group',()=>{
 const melee=item('vibroblade');
 const one=hero(['multiattack-proficiency-advanced-melee-weapons'],[melee,item('blaster-pistol')]),two=hero(['multiattack-proficiency-advanced-melee-weapons','multiattack-proficiency-advanced-melee-weapons'],[melee,item('blaster-pistol')]);
 assert.equal(row(one,'vibroblade').multiattackReduction,2);assert.equal(row(two,'vibroblade').multiattackReduction,4);assert.equal(row(one,'blaster-pistol').multiattackReduction||0,0);
 const exotic=hero(['exotic-weapons-master','multiattack-proficiency-exotic-weapons'],[item('atlatl'),item('bowcaster'),item('vibroblade')],{},[['exotic-weapon-proficiency','equipment:atlatl']]);
 assert.equal(row(exotic,'atlatl').multiattackReduction,2);assert.equal(row(exotic,'bowcaster').multiattackReduction,2);assert.equal(row(exotic,'vibroblade').multiattackReduction||0,0);
 const flurry=hero(['flurry-of-blows'],[item('vibroblade')]);assert.equal(unarmed(flurry).multiattackReduction,2);assert.equal(row(flurry,'vibroblade').multiattackReduction||0,0);
});
test('Discblade and bug talents stay Manual because their weapons have no attack row',()=>{
 for(const[talent,weapon]of [['weapon-specialization-discblade','discblade'],['bugbite','razor-bug'],['bugbite','thud-bug']]){assert.equal(real.talents.find(t=>t.id==='talent:'+talent).automation,'manual');assert.equal(real.equipment.find(e=>e.id==='equipment:'+weapon).manualAttack,true);}
});
test('Master of Elegance uses Dexterity on Light melee, doubled two-handed, never lowering Strength',()=>{
 const elegant=['single-weapon-flourish-i','master-of-elegance'],finesse=[['weapon-finesse'],['double-attack','simple-weapons',5]],knife=x=>hero(elegant,[item('knife',x)],{},finesse,8),plain=row(hero([],[item('knife')],{},finesse),'knife').damageBonus,one=row(knife(),'knife').damageBonus,both=row(knife({twoHanded:true}),'knife').damageBonus;
 assert.equal(one,plain+1,'DEX 4 replaces STR 3');assert.equal(both,plain+5,'double DEX 8');
 const strong=hero(elegant,[item('knife')],{str:20,dex:10},finesse,8);assert.equal(row(strong,'knife').damageBonus,row(hero([],[item('knife')],{str:20,dex:10},finesse),'knife').damageBonus);
 const big=hero(elegant,[item('atlatl')],{},finesse,8);assert.equal(row(big,'atlatl').damageBonus,row(hero([],[item('atlatl')],{},finesse),'atlatl').damageBonus,'Medium is not Light');
 assert.equal(unarmed(hero(elegant,[],{},finesse,8)).damageBonus,unarmed(hero([],[],{},finesse)).damageBonus,'not Unarmed');
});
test('Hammerblow adds Strength once more only while wielding nothing',()=>{
 const base=unarmed(hero()).attack,c=hero(['hammerblow']);assert.equal(unarmed(c).attack,base+3);assert.match(unarmed(c).breakdown,/Hammerblow: \+3/);
 const armed=hero(['hammerblow'],[item('vibroblade')]);assert.equal(unarmed(armed).attack,unarmed(hero([],[item('vibroblade')])).attack);
 const weak=hero(['hammerblow'],[],{str:8});assert.equal(unarmed(weak).attack,unarmed(hero([],[],{str:8})).attack,'no doubling of a penalty');
});
test('Keen Shot removes the Concealment penalty; Blind Shot also Total Concealment, ranged Pistols and Rifles only',()=>{
 const penalty=(talents,inv,id,concealment)=>{const c=hero(talents,inv);c.attackTarget={concealment,attackSquare:true};const d=derive(c);return row(c,id).targetModifiers?.penalty??targetModifiers(c,pack,d.ctx,{},d.attacks.find(a=>a.id==='equipment:'+id)).penalty;};
 const rows=()=>[item('blaster-pistol'),item('vibroblade')];
 assert(penalty([],rows(),'blaster-pistol','concealment')<0);
 assert.equal(penalty(['acute-senses','keen-shot'],rows(),'blaster-pistol','concealment'),0);assert.equal(penalty(['acute-senses','keen-shot'],rows(),'vibroblade','concealment'),0);assert(penalty(['acute-senses','keen-shot'],rows(),'blaster-pistol','total')<0);
 assert.equal(penalty(['blind-shot'],rows(),'blaster-pistol','concealment'),0);assert.equal(penalty(['blind-shot'],rows(),'blaster-pistol','total'),0);assert(penalty(['blind-shot'],rows(),'vibroblade','concealment')<0);
 const c=hero(['blind-shot'],rows());c.attackTarget={concealment:'total'};assert.match(row(c,'blaster-pistol').targetModifiers?.issue??'',/Attack square/);
});
test('Knight Armor Mastery uses the improved Reflex calculation and satisfies both prerequisites',()=>{
 const armor=()=>item('battle-armor'),reflex=t=>derive(hero(t,[armor()])).defenses.reflex;
 assert.equal(reflex(['knight-armor-mastery']),reflex(['armored-defense','improved-armored-defense']));assert(reflex(['knight-armor-mastery'])>reflex([]));
 const c=hero(['knight-armor-mastery']),ix=api.indexPack(pack),ctx=derive(c).ctx;
 assert(ctx.talents.some(t=>t.id==='talent:knight-armor-mastery'));for(const value of ['talent:armored-defense','talent:improved-armored-defense'])assert(api.prerequisite({kind:'talent',value},ctx,ix),value);assert(!api.prerequisite({kind:'talent',value:'talent:juggernaut'},ctx,ix));
});


test('source-defined effect scopes and prerequisite aliases cannot be reassigned',()=>{
 for(const [id,change] of [
  ['keen-shot',r=>r.effects[0].concealment=['concealment','total']],
  ['blind-shot',r=>r.effects[0].weaponGroups=['heavy-weapons']],
  ['master-of-elegance',r=>r.effects[0].amount=4],
  ['flurry-of-blows',r=>r.effects[0].weaponGroup='rifles'],
  ['knight-armor-mastery',r=>r.countsAsTalents=['talent:force-perception']],
  ['knight-armor-mastery',r=>delete r.countsAsTalents]
 ]){const bad=structuredClone(real);change(bad.talents.find(r=>r.id==='talent:'+id));assert.throws(()=>validatePack(bad));}
 const bad=structuredClone(real);bad.talents.find(r=>r.id==='talent:acute-senses').countsAsTalents=['talent:armored-defense'];assert.throws(()=>validatePack(bad),/Unsupported prerequisite aliases/);
});
