import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,validateCharacter} from '../src/rules.js';
import {carryingLimits,createSpeciesChecks} from '../src/species-rules.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const hero=species=>{const c=newCharacter(pack);c.species='species:'+species;c.abilityMethod='manual';c.abilities={str:10,dex:18,con:10,int:10,wis:10,cha:10};return c;};
const item=(id,quantity=1,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
function fixture(species,values){
 const c=hero(species),logs=[],checks=createSpeciesChecks({current:()=>c,derived:()=>derive(c,pack),log:(...args)=>logs.push(args)},expr=>({value:values.shift(),display:expr,coeffs:[],rollId:1}));
 return {c,logs,checks,roll:id=>checks.click({dataset:{skillRoll:'skill:'+id}},ix.species.get(c.species)),reroll:id=>checks.click({dataset:{speciesReroll:'skill:'+id}},ix.species.get(c.species))};
}

test('species rerolls respect mandatory replacement and keeping the better result; each pending check rerolls once',()=>{
 const d=fixture('duros',[20,5]);d.roll('pilot');d.reroll('pilot');assert(d.logs[1][1].includes('kept 5'));d.reroll('pilot');assert.equal(d.logs.length,2);
 const h=fixture('hutt',[20,5]);h.roll('persuasion');h.reroll('persuasion');assert(h.logs[1][1].includes('kept 20'));
 const s=derive(d.c,pack).skills.find(s=>s.id==='skill:pilot');assert(d.checks.controls(s,ix.species.get(d.c.species),false).includes('disabled'));
});

test('conditional rerolls retain their scope, cannot reroll Take 10, and reject stale or substituted checks',()=>{
 const w=fixture('wookiee',[15,4]);w.roll('persuasion');const s=derive(w.c,pack).skills.find(s=>s.id==='skill:persuasion');assert(w.checks.controls(s,ix.species.get(w.c.species),false).includes('Intimidate'));
 w.c.condition=1;w.reroll('persuasion');assert.equal(w.logs.length,1);
 const g=fixture('gungan',[15,4]);g.roll('swim');g.checks.click({dataset:{speciesTake10:'skill:swim'}},ix.species.get(g.c.species));g.reroll('swim');assert.equal(g.logs.length,2);assert(g.logs[1][1].startsWith('Swim: 10'));
 assert(!g.checks.controls({...derive(g.c,pack).skills.find(s=>s.id==='skill:swim'),checkSource:'skill:use-the-force'},ix.species.get(g.c.species),false));
 g.c.condition=5;g.roll('swim');assert.equal(g.logs.length,2);
});

test('species senses preserve distinctions and stat blocks include vision and scent',()=>{
 const d=hero('sullustan');assert(renderStatBlock(d,derive(d,pack),pack).includes('Darkvision'));
 const g=hero('gungan');assert(renderStatBlock(g,derive(g,pack),pack).includes('Low-Light Vision'));assert.equal(ix.species.get(g.species).holdBreathMultiplier,25);
 const e=hero('ewok');assert(renderStatBlock(e,derive(e,pack),pack).includes('Scent 10 Squares'));
 assert.equal(ix.species.get('species:hutt').proneImmune,true);
 assert(!ix.species.get('species:neimoidian-core-rulebook').skillRerolls,'Neimoidian copy error remains manual');
});

test('carrying limits scale by Strength squared and size, with inclusive Heavy Load boundary',()=>{
 const r=pack.rules.encumbrance;
 assert.deepEqual(carryingLimits(10,'medium',25,r),{weight:25,heavyAt:25,lift:50,strain:100,heavy:true,overloaded:false,tooHeavy:false});
 assert.equal(carryingLimits(10,'small',0,r).heavyAt,18.75);assert.equal(carryingLimits(10,'large',0,r).lift,100);
 assert(carryingLimits(10,'medium',50.1,r).overloaded);assert(!carryingLimits(10,'medium',100,r).tooHeavy);assert(carryingLimits(10,'medium',101,r).tooHeavy);
});

test('Heavy Load applies specified skills, combines armor by the worse limit, and respects the Sprint ambiguity',()=>{
 const c=hero('human');let d=derive(c,pack);const skill=id=>d.skills.find(s=>s.id==='skill:'+id).total,base=skill('acrobatics');
 c.inventory=[item('blaster-pistol',25)];d=derive(c,pack);assert.equal(skill('acrobatics'),base-10);assert.equal(skill('persuasion'),0);assert.equal(d.speed,4);assert.equal(d.runMultiplier,3);assert.equal(d.defenses.reflex,derive(hero('human'),pack).defenses.reflex);
 c.levels[0].classId='class:scout';c.levels[0].talent={id:'talent:sprint'};assert.equal(derive(c,pack).runMultiplier,3);c.houseRules={ambiguities:{'ambiguity:sprint-heavy-load':'sprint-limit'}};assert.equal(derive(c,pack).runMultiplier,5);
 c.inventory=[item('battle-armor'),item('blaster-rifle',3)];d=derive(c,pack);assert(d.load.heavy);assert.equal(d.speed,4);
});

test('straining removes positive Dexterity and dodge, too much weight prevents movement, and uncarried items have no effects',()=>{
 const c=hero('human');c.levels[0].classId='class:soldier';c.levels[0].feats=[{id:'feat:martial-arts-i'}];const original=derive(c,pack);
 c.inventory=[item('blaster-pistol',51)];let d=derive(c,pack);assert.equal(d.speed,1);assert.equal(d.runMultiplier,0);assert.equal(d.defenses.reflex,original.defenses.reflex-5);
 c.inventory[0].quantity=101;assert.equal(derive(c,pack).speed,0);
 c.inventory[0].carried=false;d=derive(c,pack);assert.equal(d.weight,0);assert.equal(d.speed,6);assert.equal(d.attacks.length,1);validateCharacter(c,pack);
 c.inventory[0].carried='false';assert.throws(()=>validateCharacter(c,pack),/carried equipment/);
});
