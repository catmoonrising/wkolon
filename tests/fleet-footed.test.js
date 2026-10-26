import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {planRunningAttack} from '../src/combat-movement.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Legal Human Scout: Running Attack and Fleet-Footed at level 1 (Human bonus feat).
function runner(fleet=true,path={before:{squares:3},after:{squares:3}}){const c=newCharacter(pack,{classId:'class:scout'});c.species='species:human';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:12,wis:10,cha:10};
 c.levels[0].feats=[{id:'feat:running-attack'},...(fleet?[{id:'feat:fleet-footed'}]:[])];c.inventory=[{id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];c.runningAttack=path;validateCharacter(c,pack);return c;}
const plan=c=>planRunningAttack(c,derive(c,pack),pack,c.inventory[0].uid);

test('Fleet-Footed metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:fleet-footed').effects[0].amount=4;assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:fleet-footed').automation,'partial');
});
test('Speed +2 for the Running Attack only with movement before and after',()=>{
 const base=plan(runner(false)).maximum;assert.equal(plan(runner()).maximum,base+2*pack.rules.combatMovement.running.speedMultiplier);
 assert.equal(plan(runner(true,{before:{squares:3},after:{squares:0}})).maximum,base,'no movement after');
 const far={before:{squares:4},after:{squares:base-3}};assert.throws(()=>plan(runner(false,far)),/exceeds Speed/);assert.equal(plan(runner(true,far)).cost,base+1);
});
