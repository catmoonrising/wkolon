import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack,eligible} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
import {featureGraph} from '../src/feature-trees.js';
import {articleText} from '../src/wiki-content.js';

const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const talent=id=>({id:'talent:'+id});
const item=id=>({id:'equipment:'+id,quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
function hero(cls='soldier',t='armored-defense'){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.levels[0].classId='class:'+cls;c.levels[0].feats=[];c.levels[0].talent=talent(t);return c;
}
function level(c,t,cls='soldier'){
 c.levels.push({classId:'class:'+cls,hpRoll:4,feats:[],talent:t?talent(t):null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
}

test('Scout and Soldier have all four reviewed Core trees with complete, separately pinned talent sections',()=>{
 const trees={scout:['awareness','camouflage','fringer','survivor'],soldier:['armor-specialist','brawler','commando','weapon-specialist']};
 const counts={awareness:6,camouflage:3,fringer:4,survivor:4,'armor-specialist':5,brawler:5,commando:7,'weapon-specialist':3};
 for(const [cls,list] of Object.entries(trees)){
  const r=pack.classes.find(r=>r.id==='class:'+cls);assert(list.every(n=>r.talentTrees.includes('tree:'+n)));assert(pack.sources.some(s=>s.id===r.talentAccessSourceId));
  for(const tree of list.map(n=>'tree:'+n)){const talents=pack.talents.filter(t=>t.tree===tree&&pack.catalog.records.some(r=>r.kind==='talent'&&r.mechanicsIds.includes(t.id)&&r.books.includes('Core Rulebook')));assert.equal(talents.length,counts[tree.slice(5)]);
   for(const t of talents){const source=pack.sources.find(s=>s.id===t.sourceId);assert.equal(source.section,t.name);if(!['Reset Initiative','Weak Point'].includes(t.name))assert(articleText(t.article).includes('Core Rulebook'));}
  }
 }
 const c=hero('scout','long-stride'),ctx=derive(c,pack).ctx;
 const allowed=pack.talents.filter(t=>trees.scout.map(n=>'tree:'+n).includes(t.tree)).map(t=>t.id);
 const graph=featureGraph(pack,{type:'talents',ctx,allowedIds:allowed,selected:null});
 assert(graph.nodes.has('talent:improved-concealment|'));assert(!graph.nodes.get('talent:improved-concealment|').available);assert(!graph.nodes.has('talent:melee-smash|'));
});

test('Armor Mastery, Second Skin and Improved Armored Defense use effective armor bonuses with proficiency',()=>{
 const c=hero();c.abilities.dex=20;c.inventory=[item('stormtrooper-armor')];level(c);level(c,'armor-mastery');
 let before=derive(c,pack);assert.equal(before.defenses.reflex,21);
 level(c);level(c,'second-skin');let after=derive(c,pack);
 assert.equal(after.defenses.reflex,before.defenses.reflex+1);assert.equal(after.defenses.fortitude,before.defenses.fortitude+3); // two heroic levels and +1 equipment
 level(c);level(c,'improved-armored-defense');after=derive(c,pack);assert.equal(after.defenses.reflex,25); // 10 + (7 + floor(7/2)) + 4 capped DEX + 1 class
 assert.equal(pack.equipment.find(r=>r.id==='equipment:stormtrooper-armor').armorBonus,6);assert.equal(after.armor.maxDex,3);
 c.levels[0].classId='class:scout';c.levels[0].startingFeat=null;
 assert.equal(derive(c,pack).defenses.reflex,21); // no Medium proficiency: unchanged armor 6, capped DEX 3, highest class bonus 2
 validateCharacter(c,pack);
});

test('Juggernaut removes both armor movement restrictions only while proficient; conditions still halve speed',()=>{
 const c=hero();c.levels[0].feats=[{id:'feat:armor-proficiency-heavy'}];c.inventory=[item('heavy-battle-armor')];level(c);level(c,'juggernaut');
 let d=derive(c,pack);assert.equal(d.speed,6);assert.equal(d.runSpeed,24);
 c.condition=4;d=derive(c,pack);assert.equal(d.speed,3);assert.equal(d.runSpeed,12);
 c.condition=0;c.levels[0].feats=[];d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.runSpeed,12);
 c.inventory[0].equipped=false;assert.equal(derive(c,pack).speed,6);
 c.inventory[0].equipped=true;c.levels[0].feats=[{id:'feat:armor-proficiency-heavy'}];c.levels[0].talent=talent('juggernaut');c.levels[2].talent=talent('armored-defense');
 assert.equal(derive(c,pack).speed,4); // later prerequisite cannot authorize the earlier selection
});

test('Long Stride improves natural land and swim speeds in Light/no armor, before Condition Track halving',()=>{
 const c=hero('scout','long-stride');c.species='species:gungan';let d=derive(c,pack);assert.equal(d.speed,8);assert.equal(d.speeds.swim,6);
 c.inventory=[item('blast-helmet-and-vest')];d=derive(c,pack);assert.equal(d.speed,8);assert.equal(d.speeds.swim,6);
 c.condition=4;d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.speeds.swim,3);
 c.condition=0;c.inventory=[item('battle-armor')];d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.speeds.swim,3);
 c.inventory[0].equipped=false;assert.equal(derive(c,pack).speed,8);
});

test('Melee Smash adds one damage without changing ranged attacks or multiplying its bonus for two hands',()=>{
 const c=hero('soldier','melee-smash');c.inventory=[item('blaster-pistol'),{...item('lightsaber'),twoHanded:true}];
 const d=derive(c,pack);c.levels[0].talent=null;const before=derive(c,pack);
 assert.equal(d.attacks[0].damageBonus,before.attacks[0].damageBonus);assert.equal(d.attacks[1].damageBonus,before.attacks[1].damageBonus+1);
 assert.equal(d.attacks[1].attack,before.attacks[1].attack);
});

test('weapon talent secondary choices require the chosen proficiency/focus and condition talents do not apply passively',()=>{
 const c=hero('soldier','indomitable');level(c);level(c,'indomitable');c.condition=3;
 const d=derive(c,pack);assert.equal(d.ctx.talents.filter(t=>t.id==='talent:indomitable').length,2);assert.equal(c.condition,3);
 const ix=indexPack(pack),ctx=d.ctx,can=(id,choice)=>eligible(ix.talents.get('talent:'+id),{id:'talent:'+id,choice},ctx,ix,'talents');
 assert(can('devastating-attack','rifles'));assert(!can('devastating-attack','heavy-weapons'));assert(!can('penetrating-attack','rifles'));
 ctx.feats.push({id:'feat:weapon-focus',choice:'rifles'});assert(can('penetrating-attack','rifles'));assert(!can('penetrating-attack','pistols'));
 assert(!can('harm-s-way'));ctx.trained.add('skill:initiative');assert(can('harm-s-way'));
 const bad=structuredClone(pack);bad.talents.find(r=>r.id==='talent:long-stride').effects[0].when='proficientArmor';assert.throws(()=>validatePack(bad),/Missing passive condition/);
});
