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
const row=(feats=[],talent=null)=>({classId:'class:soldier',hpRoll:5,feats:feats.map(id=>({id:'feat:'+id})),talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
const f=fixture(pack,{...rules,...profiles,...generation,...species,...installation});
function merc(teamwork=true){const c=f.mercenary();if(!teamwork)c.levels[6].talent={id:'talent:armored-defense'};return c;}
const dmg=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).damageDisplay;};

test("Mercenary's Teamwork metadata is pinned and Partial; the count is a strict integer 0 to 5",()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:mercenary-s-teamwork').effects[0].maximum=12;assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:mercenary-s-teamwork').automation,'partial');
 const c=merc();for(const n of [-1,6,1.5,'2',true])assert.throws(()=>validateCharacter({...c,attackTarget:{alliesDamagedTarget:n}},pack),/attack target alliesDamagedTarget/);
 validateCharacter({...c,attackTarget:{alliesDamagedTarget:5}},pack);
});
test('+2 damage per declared ally, capped at +10, on non-area attacks; control shown only to owners',()=>{
 const c=merc(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:mercenary-s-teamwork'));assert(d.targetTraitsUsed.includes('alliesDamagedTarget'));
 const base=dmg(c,0,{});for(const n of [1,3,5])assert.equal(dmg(c,0,{alliesDamagedTarget:n}),base+'+'+(2*n));
 assert.equal(dmg(c,0,{alliesDamagedTarget:0}),base);assert.equal(dmg(c,2,{alliesDamagedTarget:3}),dmg(c,2,{}),'area excluded');
 assert.equal(dmg(c,0,{alliesDamagedTarget:2,damagedByAlly:true}),base+'+6','adds to Combined Mercenary Fire');
 const ref=()=>'',html=attackTargetControls(c,ref,'',false,d.targetTraitsUsed);assert.match(html,/data-attack-target="alliesDamagedTarget"/);assert.match(html,/>5\+</);
 const none=merc(false);assert.doesNotMatch(attackTargetControls(none,ref,'',false,derive(none,pack).targetTraitsUsed),/alliesDamagedTarget/);assert.equal(dmg(none,0,{alliesDamagedTarget:3}),dmg(none,0,{}));
});
