import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {createHouseRules,ambiguityValue} from '../src/house-rules.js';
import {validatePack} from '../tools/validate-rules.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const id='ambiguity:sprint-heavy-armor';
const item=name=>({id:'equipment:'+name,quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const level=(cls,talent=null,feats=[])=>({classId:'class:'+cls,hpRoll:4,feats,talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function runner(){
 const c=newCharacter(pack);c.levels[0].classId='class:scout';c.levels[0].talent={id:'talent:sprint'};
 c.levels[0].feats=[{id:'feat:armor-proficiency-light'},{id:'feat:armor-proficiency-medium'}];return c;
}

test('ambiguity settings preserve explicit choices and defaults for older saves, rejecting unknown values',()=>{
 const c=runner();assert.equal(ambiguityValue(c,pack,id),'armor-limit');const ui=createHouseRules(pack);ui.setTab('ambiguities');
 let html=ui.render(c);assert(html.includes('Ambiguities')&&html.includes('data-ambiguity'));
 assert(html.includes('five times')&&html.includes('three times'));assert(!html.includes('Hard March'));assert(!html.toLowerCase().includes('droid'));
 assert(ui.change({hasAttribute:n=>n==='data-ambiguity',dataset:{ambiguity:id},value:'sprint-limit'},c));
 const restored=JSON.parse(JSON.stringify(c));validateCharacter(restored,pack);assert.equal(ambiguityValue(restored,pack,id),'sprint-limit');
 assert.equal(ambiguityValue(newCharacter(pack),pack,id),'armor-limit');
 restored.houseRules.ambiguities[id]='invented';assert.throws(()=>validateCharacter(restored,pack),/ambiguities/);
 restored.houseRules.ambiguities={'ambiguity:invented':'sprint-limit'};assert.throws(()=>validateCharacter(restored,pack),/ambiguities/);
});

test('Sprint always calculates normal running; heavy armor follows the saved interpretation, with Juggernaut exempt',()=>{
 const c=runner();let d=derive(c,pack);assert.equal(d.runMultiplier,5);assert.equal(d.runSpeed,30);
 c.inventory=[item('blast-helmet-and-vest')];assert.equal(derive(c,pack).runSpeed,30);
 c.inventory=[item('heavy-battle-armor')];d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.runSpeed,12);
 c.houseRules={ambiguities:{[id]:'sprint-limit'}};d=derive(c,pack);assert.equal(d.speed,4);assert.equal(d.runSpeed,20);
 assert(renderStatBlock(c,d,pack).includes('4 Squares (Run 20 Squares)'));
 c.levels.push(level('scout',null,[{id:'feat:armor-proficiency-heavy'}]),level('soldier','armored-defense'),level('soldier'),level('soldier','juggernaut'));
 c.houseRules.ambiguities[id]='armor-limit';d=derive(c,pack);assert.equal(d.speed,6);assert.equal(d.runSpeed,30);
 c.condition=4;d=derive(c,pack);assert.equal(d.speed,3);assert.equal(d.runSpeed,15);
 c.levels[0].talent=null;assert.equal(derive(c,pack).runMultiplier,4); // the setting alone cannot grant Sprint
});

test('the droid heavy-armor exception applies only to native speeds other than 4/6, without a House Rules setting',()=>{
 const fixture=structuredClone(pack),species={...fixture.species[0],id:'species:droid-fixture',isDroid:true,speeds:{fly:6}};fixture.species.push(species);
 const c=newCharacter(fixture);c.species=species.id;c.inventory=[item('heavy-battle-armor')];
 for(const [speed,expected] of [[4,3],[6,4],[7,7],[8,8]]){species.speed=speed;const d=derive(c,fixture);assert.equal(d.speed,expected);assert.equal(d.runSpeed,expected*3);assert.equal(d.speeds.fly,4);}
 c.condition=4;assert.equal(derive(c,fixture).speed,4);c.condition=0;
 species.isDroid=false;assert.equal(derive(c,fixture).speed,6);
 species.isDroid=true;c.inventory=[item('battle-armor')];assert.equal(derive(c,fixture).speed,6); // Heavy-only exception
 assert.equal(c.houseRules,undefined);validateCharacter(c,fixture);
});

test('ambiguity records require pinned passages and supported options; running effects reject invalid multipliers',()=>{
 const p=structuredClone(pack);p.rules.ambiguities[0].default='invented';assert.throws(()=>validatePack(p),/Invalid ambiguity default/);
 p.rules.ambiguities[0].default='armor-limit';p.rules.ambiguities[0].passages[0].ruleId='rule:missing';assert.throws(()=>validatePack(p),/Invalid ambiguity passage/);
 const bad=structuredClone(pack);bad.talents.find(t=>t.id==='talent:sprint').effects[0].amount=2;assert.throws(()=>validatePack(bad),/Invalid running multiplier/);
});
