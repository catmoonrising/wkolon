import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollRoutine} from '../src/combat.js';
import {validatePack} from '../tools/validate-rules.js';
import fixture from '../tools/tradition-mount-fixtures.cjs';
import * as api from '../src/rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const pack=core,f=fixture(pack,api);
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const row=t=>({classId:'class:scoundrel',hpRoll:4,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function assassin(second=true){const c=f.assassin();if(!second)c.levels[9].talent={id:'talent:sneak-attack'};return c;}
const attack=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid);};

test('Murderous Arts II metadata is pinned and Partial',()=>{
 validatePack(core);const p=structuredClone(core);p.talents.find(t=>t.id==='talent:murderous-arts-ii').effects[0].die=8;assert.throws(()=>validatePack(p));
 assert.equal(core.talents.find(t=>t.id==='talent:murderous-arts-ii').automation,'partial');
});
test('a declared Marked target adds a separate 1d6 on melee and ranged attacks; area excluded; crits multiply it',()=>{
 const c=assassin();assert(derive(c,pack).targetTraitsUsed.includes('markedTarget'));
 for(const i of [0,1]){const a=attack(c,i,{markedTarget:true}),b=attack(c,i,{});assert.equal(a.damageDisplay,b.damageDisplay+'+1d6');assert.match(a.breakdown,/Murderous Arts II: \+1d6/);}
 assert.equal(attack(c,2,{markedTarget:true}).damageDisplay,attack(c,2,{}).damageDisplay,'area excluded');
 const none=assassin(false);assert.equal(attack(none,0,{markedTarget:true}).damageDisplay,attack(none,0,{}).damageDisplay);
 const q=structuredClone(c);q.attackTarget={markedTarget:true};const d=derive(q,pack),a=d.attacks.find(x=>x.uid===q.inventory[1].uid),calls=[];
 rollRoutine({name:'Shot',steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]},d.attacks,pack.rules.combat,expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?20+Number(m[1]):5,d20:m?[20]:[],display:expr,coeffs:[1]};});
 assert(calls.some(e=>/^\(.*\+1d6\)\*2$/.test(e)),calls.join(' | '));
});
test('weapon-die opponent dice are unchanged by the fixed-die field',()=>{
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:murderous-arts-i').effects=[{target:'targetDice',against:'markedTarget',dice:1}];
 const c=assassin(false),q=structuredClone(c);q.attackTarget={markedTarget:true};const b=structuredClone(c);b.attackTarget={};
 assert.equal(derive(q,p).attacks.find(a=>a.uid===c.inventory[0].uid).damage,derive(b,p).attacks.find(a=>a.uid===c.inventory[0].uid).damage,'base expression');
 assert.equal(derive(q,p).attacks.find(a=>a.uid===c.inventory[0].uid).damageDisplay,derive(b,p).attacks.find(a=>a.uid===c.inventory[0].uid).damageDisplay+'+1d4','weapon die (Knife d4)');
});
