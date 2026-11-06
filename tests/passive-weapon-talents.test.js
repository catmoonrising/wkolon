import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import * as profiles from '../src/ability-profiles.js';
import * as generation from '../src/ability-generation.js';
import * as species from '../src/species-choices.js';
import * as installation from '../src/droid-installation.js';
import make from '../tools/passive-weapon-fixtures.cjs';
import {planFullAttack} from '../src/full-attacks.js';
import {takeAction,beginNextTurn} from '../src/action-engine.js';
import {setAttackAbility} from '../src/attack-abilities.js';
const setCounseling=(c,id,value)=>{c.houseRules??={};c.houseRules.jediCounseling??={};c.houseRules.jediCounseling[id]=value;};
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const derive=c=>api.derive(c,pack),weapon=(c,id)=>derive(c).attacks.find(a=>a.id==='equipment:'+id),unarmed=c=>derive(c).attacks.find(a=>a.uid===c.id);
function replace(c,id,replacement){const q=structuredClone(c),l=q.levels.find(l=>l.talent?.id==='talent:'+id);assert(l,id);l.talent={id:'talent:'+replacement};f.finish(q);return q;}
const routine=(c,uid)=>({id:crypto.randomUUID(),name:'Double Attack',kind:'fullAttack',steps:['base','doubleAttack'].map(source=>({id:crypto.randomUUID(),attackId:uid,count:1,attackMod:0,damageMod:0,source}))});

test('every effect is reached through complete legal catalog builds without opening trees',()=>{
 validatePack(pack);
 for(const c of [f.duelist(),f.duelist({elegance:true}),f.gladiator(),f.martial(),f.knight(),f.gunslinger(),f.gunslinger({species:'wookiee'}),f.hammer()]){api.validateCharacter(c,pack);assert.deepEqual(derive(c).issues,[]);assert(!c.levels.some(l=>l.talent?.pending));}
 for(const id of ['multiattack-proficiency-advanced-melee-weapons','multiattack-proficiency-exotic-weapons','flurry-of-blows','master-of-elegance','hammerblow','keen-shot','blind-shot','knight-armor-mastery'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('repeatable reductions match only their actual group and never make a Full Attack bonus',()=>{
 for(const [make,id] of [[f.duelist,'vibroblade'],[f.gladiator,'amphistaff'],[f.martial,null]])for(const selections of [1,2,3]){
  const c=make({selections}),d=derive(c),a=id?weapon(c,id):unarmed(c);assert.equal(a.multiattackReduction,2*selections);
  const p=planFullAttack(routine(c,a.uid),d,pack),rolled=p.attacks.find(x=>x.uid===a.uid);assert.equal(rolled.fullAttackPenalty,Math.min(0,-5+selections*2));assert.equal(rolled.attack,a.attack+Math.min(0,-5+selections*2));
  const other=d.attacks.find(x=>id==='vibroblade'?x.id==='equipment:blaster-pistol':x.id==='equipment:knife'||x.id==='equipment:vibroblade');assert.equal(other.multiattackReduction||0,0);
 }
});
test('an actual exotic Full Attack spends its action and honors reduction on both attacks',()=>{
 const c=f.gladiator(),a=weapon(c,'amphistaff');c.routines=[routine(c,a.uid)];beginNextTurn(c,pack);const expressions=[];
 takeAction(c,pack,'full-attack',{routineId:c.routines[0].id},expr=>{expressions.push(expr);return expr.startsWith('1d20')?{value:15,d20:[10],display:'10'}:{value:5,d20:[],display:'5'};});
 assert.deepEqual(expressions.filter(e=>e.startsWith('1d20')),Array(2).fill('1d20+'+(a.attack-1)));api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);
});
test('Master of Elegance uses optional Dexterity only on Light melee and doubles it two-handed',()=>{
 const c=f.duelist({elegance:true}),base=replace(c,'master-of-elegance','counterpunch'),d=derive(c),knife=weapon(c,'knife'),ordinary=weapon(base,'knife');
 assert(d.ctx.feats.some(x=>x.id==='feat:double-attack'&&x.choice==='advanced-melee-weapons'));assert.equal(knife.damageBonus-ordinary.damageBonus,Math.max(d.mods.str,d.mods.dex)-d.mods.str);
 const e=c.inventory.find(e=>e.id==='equipment:knife');e.twoHanded=true;assert.equal(weapon(c,'knife').damageBonus-ordinary.damageBonus,2*d.mods.dex-d.mods.str);
 assert.equal(weapon(c,'vibrosword').damageBonus,weapon(base,'vibrosword').damageBonus);assert.equal(unarmed(c).damageBonus,unarmed(base).damageBonus);
 c.abilities.str=20;c.abilities.dex=14;e.twoHanded=false;const strong=replace(c,'master-of-elegance','counterpunch');assert.equal(weapon(c,'knife').damageBonus,weapon(strong,'knife').damageBonus);f.finish(c);
});
test('Hammerblow auto selects the full Strength contribution while manual Dexterity stays available',()=>{
 const c=f.hammer(),base=replace(c,'hammerblow','counterpunch'),a=unarmed(c),d=derive(c);
 assert.equal(a.abilityDetails.ability,'str');assert.equal(a.abilityDetails.modifier,d.mods.str);assert.equal(a.attack,unarmed(base).attack-d.mods.dex+2*d.mods.str);assert.match(a.breakdown,/Hammerblow: \+3/);
 const own=d.ctx.bab;setAttackAbility(c,derive(c).attacks,c.id,'dex');assert.equal(unarmed(c).attack,own+d.mods.dex);assert(!unarmed(c).breakdown.includes('Hammerblow'));
 setAttackAbility(c,derive(c).attacks,c.id,'str');assert.equal(unarmed(c).attack,own+2*d.mods.str);setAttackAbility(c,derive(c).attacks,c.id,'auto');assert.equal(unarmed(c).attack,a.attack);
});
test('tracked held weapons, including inactive hilts, and declared other held items suppress Hammerblow',()=>{
 const c=f.hammer(),bonus=unarmed(c).attack,d=derive(c),fallback=d.ctx.bab+d.mods.dex;
 c.inventory=[f.item('lightsaber',{activated:false})];assert.equal(unarmed(c).attack,fallback);c.inventory[0].equipped=false;assert.equal(unarmed(c).attack,bonus);
 c.inventory[0].equipped=true;c.inventory[0].carried=false;assert.equal(unarmed(c).attack,bonus);c.inventory=[];
 c.unarmedModifiers={attackMod:0,damageMod:0,holdingItem:true};assert.equal(unarmed(c).attack,fallback);const q=JSON.parse(JSON.stringify(c));api.validateCharacter(q,pack);assert.equal(unarmed(q).attack,fallback);q.unarmedModifiers.holdingItem=false;assert.equal(unarmed(q).attack,bonus);
 for(const value of [1,'yes',null,{},[]]){const bad=structuredClone(c);bad.unarmedModifiers.holdingItem=value;assert.throws(()=>api.validateCharacter(bad,pack),/unarmed modifiers/);}
});
test('Keen Shot and Blind Shot keep separate scopes and still require the square for Total Concealment',()=>{
 const c=f.gunslinger(),keen=replace(c,'blind-shot','fool-s-luck'),plain=replace(keen,'keen-shot','knack');
 for(const x of [c,keen,plain])x.attackTarget={concealment:'concealment',attackSquare:true};
 assert(weapon(plain,'blaster-pistol').attack<weapon(c,'blaster-pistol').attack);assert.equal(weapon(keen,'blaster-pistol').attack,weapon(c,'blaster-pistol').attack);assert.equal(weapon(keen,'knife').attack,weapon(c,'knife').attack);
 for(const x of [c,keen,plain])x.attackTarget.concealment='total';
 assert.equal(weapon(c,'knife').attack,weapon(plain,'knife').attack);assert(weapon(keen,'blaster-pistol').attack<weapon(c,'blaster-pistol').attack);
 c.attackTarget.attackSquare=false;assert.match(weapon(c,'blaster-pistol').issue,/Attack square/);
});
test('Blind Shot and exotic reductions use saved weapon familiarity semantics',()=>{
 const c=f.gunslinger({species:'wookiee'}),without=replace(replace(c,'keen-shot','knack'),'blind-shot','fool-s-luck');
 c.attackTarget={concealment:'total',attackSquare:true};without.attackTarget={...c.attackTarget};const withFam=weapon(c,'bowcaster').attack;assert(weapon(without,'bowcaster').attack<withFam);
 setCounseling(c,'jc:112-weapon-familiarity-with-feats-and-talents',false);setCounseling(without,'jc:112-weapon-familiarity-with-feats-and-talents',false);assert.equal(weapon(c,'bowcaster').attack,weapon(without,'bowcaster').attack);
});
test('Knight Armor Mastery grants its actual calculation and prerequisite identities without owning either alias',()=>{
 const c=f.knight(),d=derive(c),ix=api.indexPack(pack),plain=replace(c,'knight-armor-mastery','knight-s-morale');
 assert(!d.ctx.talents.some(t=>['talent:armored-defense','talent:improved-armored-defense'].includes(t.id)));assert(d.defenses.reflex>derive(plain).defenses.reflex);
 for(const value of ['talent:armored-defense','talent:improved-armored-defense']){assert(api.prerequisite({kind:'talent',value},d.ctx,ix));assert(!api.prerequisite({kind:'talent',value},derive(plain).ctx,ix));}
 const before=structuredClone(c);assert(!api.prerequisite({kind:'talent',value:'talent:juggernaut'},d.ctx,ix));assert.deepEqual(c,before);f.finish(c);
});
test('holding declaration applies to natural and droid Unarmed rows too',()=>{
 const natural=f.hammer({species:'cathar'});assert(derive(natural).attacks.some(a=>a.natural));
 const droid=requireDroid();
 for(const c of [natural,droid]){const rows=derive(c).attacks.filter(a=>a.unarmed);assert(rows.length>1);assert(rows.some(a=>a.breakdown.includes('Hammerblow')));c.unarmedModifiers={attackMod:0,damageMod:0,holdingItem:true};assert(derive(c).attacks.filter(a=>a.unarmed).every(a=>!a.breakdown.includes('Hammerblow')));api.validateCharacter(c,pack);}
});
import droidFactory from '../tools/class-defense-fixtures.cjs';
function requireDroid(){const c=droidFactory(pack,{...api,...profiles,...generation,...species,...installation}).droid();c.levels[0].talent={id:'talent:hammerblow'};return f.finish(c);}

test('manual weapons stay Manual and unsupported effect scopes or aliases are rejected',()=>{
 for(const id of ['weapon-specialization-discblade','bugbite'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'manual');
 for(const [id,change] of [['keen-shot',r=>r.effects[0].concealment=['concealment','total']],['blind-shot',r=>r.effects[0].weaponGroups=['heavy-weapons']],['master-of-elegance',r=>r.effects[0].amount=4],['flurry-of-blows',r=>r.effects[0].weaponGroup='rifles'],['knight-armor-mastery',r=>r.countsAsTalents=['talent:force-perception']],['knight-armor-mastery',r=>delete r.countsAsTalents]]){const bad=structuredClone(pack);change(bad.talents.find(r=>r.id==='talent:'+id));assert.throws(()=>validatePack(bad));}
 const bad=structuredClone(pack);bad.talents.find(r=>r.id==='talent:acute-senses').countsAsTalents=['talent:armored-defense'];assert.throws(()=>validatePack(bad),/Unsupported prerequisite aliases/);
});
