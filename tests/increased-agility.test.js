import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Legal Scout: Conditioning at level 1, Increased Agility at level 3.
function scout(species,feat=true){const c=newCharacter(pack,{classId:'class:scout'});c.species=species;c.abilityMethod='manual';c.abilities={str:13,dex:14,con:13,int:12,wis:10,cha:10};c.levels[0].feats=[{id:'feat:conditioning'}];
 c.levels.push({classId:'class:scout',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:scout',hpRoll:5,feats:feat?[{id:'feat:increased-agility'}]:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});validateCharacter(c,pack);return derive(c,pack);}

test('Increased Agility metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:increased-agility').effects.pop();assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:increased-agility').automation,'partial');
});
test('existing Swim and Climb Speeds gain 2 squares; no Speed is granted',()=>{
 const g=scout('species:gungan'),gb=scout('species:gungan',false);assert(g.ctx.feats.some(f=>f.id==='feat:increased-agility'));assert.equal(g.speeds.swim,gb.speeds.swim+2);assert.equal(g.speed,gb.speed,'land Speed unchanged');
 const geo=scout('species:geonosian-clone-wars-campaign-guide'),geoB=scout('species:geonosian-clone-wars-campaign-guide',false);assert.equal(geo.speeds.climb,geoB.speeds.climb+2);assert.equal(geo.speeds.fly,geoB.speeds.fly);
 const h=scout('species:human');assert.equal(h.speeds.swim,undefined);assert.equal(h.speeds.climb,undefined);
});
