import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,eligible,validateCharacter} from '../src/rules.js';
import {featureChoices} from '../src/feature-choices.js';
import {featureGraph} from '../src/feature-trees.js';
import {rollRoutine} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const f=(id,choice)=>({id:'feat:'+id,...(choice?{choice}:{})});
const ids=['accelerated-strike','conditioning','critical-strike','force-readiness','gearhead','improved-rapid-strike','increased-agility','logic-upgrade-self-defense','logic-upgrade-tactician','mandalorian-training','poison-resistance','power-blast','quick-skill','republic-military-training','sith-military-training','sniper-shot','tumble-defense','withdrawal-strike'];
function hero(){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:12,con:14,int:10,wis:10,cha:10};c.levels=Array.from({length:9},(_,i)=>({classId:'class:soldier',hpRoll:i?6:null,feats:i===0?[f('rapid-strike'),f('martial-arts-i')]:i===1?[f('improved-rapid-strike')]:i===3?[f('mighty-swing')]:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));return c;}
const can=(id,ctx,choice)=>eligible(ix.feats.get('feat:'+id),f(id,choice),ctx,ix,'feats');
const weapon=(id,more={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...more});
test('all eighteen reviewed KOTOR feats retain pinned complete articles and catalog links',()=>{
 for(const id of ids){const r=ix.feats.get('feat:'+id);assert(r);const record=pack.catalog.records.find(c=>c.mechanicsIds.includes(r.id));assert.equal(record.status,'available');assert(record.books.includes('Knights of the Old Republic Campaign Guide'));assert.equal(r.article.sourceId,r.sourceId);assert(articleText(r.article).includes('Effect:'));}
 assert.equal(ix.feats.get('feat:implant-training').automation,'manual');assert(ix.feats.get('feat:implant-training').manualPrerequisites.length);
});
test('KOTOR heroic bonus lists match the reviewed class lists and leave military/droid feats general',()=>{
 const expected={jedi:['accelerated-strike','critical-strike','force-readiness','improved-rapid-strike','tumble-defense','withdrawal-strike'],noble:['quick-skill'],scoundrel:['gearhead','poison-resistance','quick-skill','sniper-shot'],scout:['conditioning','gearhead','increased-agility','poison-resistance'],soldier:['accelerated-strike','conditioning','critical-strike','improved-rapid-strike','increased-agility','power-blast','sniper-shot','tumble-defense','withdrawal-strike']};
 for(const [cls,values] of Object.entries(expected))assert.deepEqual(ix.classes.get('class:'+cls).bonusFeats.filter(id=>ids.includes(id.slice(5))).sort(),values.map(id=>'feat:'+id).sort());
});
test('ability, BAB, prerequisite feat and droid requirements enforce their printed limits',()=>{
 const ctx=derive(hero(),pack).ctx;ctx.bab=5;assert(!can('accelerated-strike',ctx));ctx.bab=6;assert(can('accelerated-strike',ctx));assert(can('conditioning',ctx));ctx.scores.con=12;assert(!can('conditioning',ctx));assert(!can('poison-resistance',ctx));assert(!can('increased-agility',ctx));ctx.feats.push(f('conditioning'));assert(can('increased-agility',ctx));assert(!can('logic-upgrade-self-defense',ctx));ctx.isDroid=true;assert(can('logic-upgrade-self-defense',ctx));ctx.bab=3;assert(!can('logic-upgrade-tactician',ctx));ctx.bab=4;assert(can('logic-upgrade-tactician',ctx));assert(!can('mandalorian-training',ctx));ctx.feats.push(f('charging-fire'));assert(can('mandalorian-training',ctx));
 const graph=featureGraph(pack,{type:'feats',ctx,allowedIds:['feat:logic-upgrade-tactician']});assert([...graph.nodes.values()].some(n=>!n.main&&n.name==='Droid'&&n.owned));
});
test('Critical Strike requires melee Weapon Focus; Sniper Shot excludes Heavy proficiency',()=>{
 const ctx=derive(hero(),pack).ctx;ctx.feats=[f('weapon-focus','pistols')];assert(!can('critical-strike',ctx));ctx.feats=[f('weapon-focus','simple-weapons')];assert(can('critical-strike',ctx));ctx.feats=[f('weapon-focus','equipment:atlatl')];assert(can('critical-strike',ctx));ctx.feats=[f('weapon-focus','equipment:flamethrower')];assert(!can('critical-strike',ctx));
 ctx.feats=[f('weapon-proficiency-heavy-weapons')];assert(!can('sniper-shot',ctx));ctx.feats=[f('weapon-proficiency-pistols')];assert(can('sniper-shot',ctx));ctx.feats=[];assert(!can('sniper-shot',ctx));
});
test('Withdrawal Strike offers only melee groups/exotics and requires proficiency with its chosen option',()=>{
 const r=ix.feats.get('feat:withdrawal-strike'),choices=featureChoices(r,pack),ctx=derive(hero(),pack).ctx;assert(choices.includes('simple-weapons'));assert(choices.includes('equipment:atlatl'));assert(!choices.includes('equipment:bowcaster'));assert(!choices.includes('rifles'));assert(can('withdrawal-strike',ctx,'simple-weapons'));assert(!can('withdrawal-strike',ctx,'equipment:atlatl'));ctx.feats.push(f('exotic-weapon-proficiency','equipment:atlatl'));assert(can('withdrawal-strike',ctx,'equipment:atlatl'));
});
test('Improved Rapid Strike restricts size-relative Light melee weapons or Lightsabers and never exempts low Dexterity',()=>{
 const c=hero();c.inventory=[weapon('knife',{attackTechnique:'improved-rapid-strike'}),weapon('mace',{attackTechnique:'improved-rapid-strike'}),weapon('lightsaber',{attackTechnique:'improved-rapid-strike'})];c.levels[2].feats=[f('weapon-proficiency-lightsabers')];let d=derive(c,pack);assert(d.attacks[0].available);assert.equal(d.attacks[0].damage,'3d4');assert.equal(d.attacks[0].technique.penalty,-10);assert(!d.attacks[1].available);assert.match(d.attacks[1].issue,/Light Melee Weapon/);assert(d.attacks[2].available);assert.equal(d.attacks[2].damage,'4d8');assert.equal(d.attacks[2].technique.penalty,-10);
 c.abilities.dex=13;assert.equal(derive(c,pack).attacks[0].technique.penalty,-5);c.species='species:hutt';assert(derive(c,pack).attacks[1].available,'Mace is Light relative to a Large wielder');validateCharacter(c,pack);
});
test('Improved Rapid Strike does not stack with Mighty Swing and its critical dice propagate through routines',()=>{
 const c=hero();c.inventory=[weapon('knife',{attackTechnique:'improved-rapid-strike'})];c.mightySwing=true;const a=derive(c,pack).attacks[0];assert.equal(a.damage,'3d4');assert.equal(a.unSwing.damage,'3d4');const expressions=[];const result=rollRoutine({steps:[{attackId:a.uid,count:2,attackMod:0,damageMod:0}]},[a],pack.rules.combat,expr=>{expressions.push(expr);return expr.startsWith('1d20')?{value:20+a.attack,d20:[20],display:'20'}:{value:18,display:expr};});assert(result.results.every(r=>r.critical));assert.match(expressions[1],/^\(3d4.*\)[*]2$/);assert.match(expressions[3],/^\(3d4.*\)[*]2$/);assert(result.mightySwingConsumed);spendAttackResources(c,result);assert(!c.mightySwing);
 c.levels[1].feats=[];assert(!derive(c,pack).attacks[0].available);assert.match(derive(c,pack).attacks[0].issue,/Requires Improved Rapid Strike/);
});
