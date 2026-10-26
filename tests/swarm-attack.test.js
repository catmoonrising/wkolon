import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {attackTargetControls} from '../src/attack-targets-ui.js';
import {validatePack} from '../tools/validate-rules.js';
import fixture from '../tools/designated-target-fixtures.cjs';
import * as rules from '../src/rules.js';
import * as profiles from '../src/ability-profiles.js';
import * as generation from '../src/ability-generation.js';
import * as species from '../src/species-choices.js';
import * as installation from '../src/droid-installation.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const row=(feats=[])=>({classId:'class:soldier',hpRoll:5,feats:feats.map(id=>({id:'feat:'+id})),talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
const f=fixture(pack,{...rules,...profiles,...generation,...species,...installation});
function soldier(swarm=true){const c=f.mercenary();if(!swarm)c.levels[5].feats[0]={id:'feat:toughness'};c.inventory=c.inventory.filter(e=>e.id==='equipment:knife'||e.id==='equipment:blaster-pistol').reverse();return c;}
const at=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).attack;};

test('Swarm Attack metadata is pinned and Partial; the adjacent-ally count is a strict integer 0 to 100000',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:swarm-attack').effects[0].mode='ranged';assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:swarm-attack').automation,'partial');
 const c=soldier();for(const n of [-1,100001,2.5])assert.throws(()=>validateCharacter({...c,attackTarget:{alliesAdjacentToTarget:n}},pack),/alliesAdjacentToTarget/);
});
test('+1 circumstance per adjacent ally on melee attacks only; the control has no "or more" maximum',()=>{
 const c=soldier(),d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:swarm-attack'));
 for(const n of [1,3,7])assert.equal(at(c,0,{alliesAdjacentToTarget:n}),at(c,0,{})+n);
 assert.equal(at(c,1,{alliesAdjacentToTarget:3}),at(c,1,{}),'ranged excluded');
 const html=attackTargetControls(c,()=>'','',false,d.targetTraitsUsed);assert.match(html,/data-attack-target="alliesAdjacentToTarget"/);assert.match(html,/type="number" min="0" max="100000"/);
 const none=soldier(false);assert.equal(at(none,0,{alliesAdjacentToTarget:3}),at(none,0,{}),'feat required');
});
