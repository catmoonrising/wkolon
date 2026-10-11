import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
import {purchaseQuote} from '../src/equipment.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const feat=id=>({id:'feat:'+id});
const item=(id,more={})=>({uid:crypto.randomUUID(),id:'equipment:'+id,quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...more});
function hero(cls='soldier'){
 const c=newCharacter(pack);c.levels[0].classId='class:'+cls;c.abilityMethod='manual';
 c.levels[0].feats=[];c.inventory=[];return c;
}

test('all eleven Core armor entries have reviewed selectable mechanics and complete articles',()=>{
 const armor=pack.catalog.records.filter(r=>r.kind==='armor');assert.equal(armor.length,11);
 assert(armor.every(r=>r.status==='available'&&r.mechanicsIds.length===1));
 assert(pack.equipment.filter(r=>r.kind==='armor').every(r=>r.article.blocks.length));
 validatePack(pack);
});

test('armor slows normal and swimming speeds with proficiency, then condition halves them',()=>{
 const c=hero();c.species='species:gungan';c.inventory=[item('battle-armor')];
 let d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.speeds.swim,3);assert.equal(d.runSpeed,16);
 c.condition=4;d=derive(c,pack);assert.equal(d.speed,2);assert.equal(d.speeds.swim,1);assert.equal(d.runSpeed,8);
 c.condition=0;c.levels[0].classId='class:scoundrel';d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.speeds.swim,3);
 c.species='species:ewok';assert.equal(derive(c,pack).speed,3);
 c.inventory=[item('padded-flight-suit')];assert.equal(derive(c,pack).speed,4);
 c.inventory[0].equipped=false;assert.equal(derive(c,pack).speed,4);
});

test('heavy proficiency enables Fortitude bonuses and removes checks penalty without removing speed limits',()=>{
 const c=hero();c.inventory=[item('heavy-battle-armor'),item('blaster-pistol')];
 const before=derive(c,pack);assert.equal(before.speed,4);assert.equal(before.runSpeed,12);
 c.levels[0].feats=[feat('armor-proficiency-heavy')];
 const after=derive(c,pack);assert(after.ctx.feats.some(f=>f.id==='feat:armor-proficiency-heavy'));
 assert.equal(after.defenses.fortitude,before.defenses.fortitude+4);
 assert.equal(after.attacks[0].attack,before.attacks[0].attack+10);
 assert.equal(after.skills.find(s=>s.id==='skill:initiative').total,before.skills.find(s=>s.id==='skill:initiative').total+10);
 assert.equal(after.skills.find(s=>s.id==='skill:perception').total,before.skills.find(s=>s.id==='skill:perception').total);
 assert.equal(after.speed,4);assert.equal(after.runSpeed,12);
 c.condition=4;assert.equal(derive(c,pack).runSpeed,6);
 c.inventory[0].equipped=false;assert.equal(derive(c,pack).speed,3);assert.equal(derive(c,pack).runSpeed,12);
});

test('Scout and Soldier can take Heavy as a class bonus feat, with Medium required',()=>{
 for(const cls of ['scout','soldier','noble']){
  const c=hero(cls);c.levels[0].feats=[feat('armor-proficiency-light'),feat('armor-proficiency-medium')];
  c.levels.push({classId:'class:'+cls,hpRoll:4,feats:[feat('armor-proficiency-heavy')],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
  const d=derive(c,pack);assert.equal(d.ctx.feats.some(f=>f.id==='feat:armor-proficiency-heavy'),cls!=='noble');
 }
 const c=hero('scout');c.levels[0].feats=[feat('armor-proficiency-heavy')];
 assert(!derive(c,pack).ctx.feats.some(f=>f.id==='feat:armor-proficiency-heavy'));
});

test('Powersuit Strength affects checks and melee damage only while equipped and proficient',()=>{
 const c=hero();c.inventory=[item('lightsaber',{twoHanded:true})];
 const before=derive(c,pack),saved=structuredClone(c.abilities);
 c.inventory.push(item('corellian-powersuit'));let after=derive(c,pack);
 assert.equal(after.scores.str,before.scores.str+2);assert.equal(after.mods.str,before.mods.str+1);
 assert.equal(after.attacks[0].attack,before.attacks[0].attack+1);
 assert.equal(after.attacks[0].damageBonus,before.attacks[0].damageBonus+2);
 assert.equal(after.skills.find(s=>s.id==='skill:climb').total,before.skills.find(s=>s.id==='skill:climb').total+1);
 assert.deepEqual(c.abilities,saved);assert.equal(after.ctx.scores.str,before.ctx.scores.str);
 c.inventory[1].equipped=false;assert.equal(derive(c,pack).scores.str,before.scores.str);
 c.inventory[1].equipped=true;c.levels[0].classId='class:scoundrel';after=derive(c,pack);
 assert.equal(after.scores.str,before.scores.str);assert.equal(after.equipmentAbilities.str,undefined);
 validateCharacter(c,pack);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
});

test('new armor prices use fitted size and license percentages; printed stats use equipped effects',()=>{
 const c=hero();const quote=purchaseQuote({id:'equipment:corellian-powersuit',armorSize:'small'},1,pack,c);
 assert.equal(quote.total,5500);assert.equal(quote.item.weight,10);assert.equal(quote.fee,500);
 c.inventory=[item('heavy-battle-armor')];const html=renderStatBlock(c,derive(c,pack),pack);
 assert(html.includes('4 Squares (Run 12 Squares)'));
 c.inventory=[item('corellian-powersuit')];assert(renderStatBlock(c,derive(c,pack),pack).includes('Str 17'));
});

test('armor contract rejects unsupported ability effects, bad speed factors and unpinned movement',()=>{
 const bad=structuredClone(pack);bad.equipment.find(r=>r.id==='equipment:corellian-powersuit').abilityBonuses={con:2};
 assert.throws(()=>validatePack(bad),/Unsupported equipment ability bonus/);
 const speed=structuredClone(pack);speed.rules.armorMovement.speedMultipliers.medium=-1;
 assert.throws(()=>validatePack(speed),/Invalid armor speed multiplier/);
 speed.rules.armorMovement.speedMultipliers.medium=.75;speed.rules.armorMovement.sourceIds=['source:missing'];
 assert.throws(()=>validatePack(speed),/Missing armor movement source/);
});
