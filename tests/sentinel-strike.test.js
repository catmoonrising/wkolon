import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollRoutine} from '../src/combat.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
import fixtures from '../tools/blade-context-fixtures.cjs';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:jedi',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Core Jedi: Jedi Sentinel talents at levels 1, 3, 5...
function jedi(ranks){
 const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:12,cha:12};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent=ranks?{id:'talent:sentinel-strike'}:null;
 for(let n=2;n<=Math.max(1,2*ranks-1);n++)c.levels.push(row(n%2&&(n+1)/2<=ranks?'sentinel-strike':null));
 c.inventory=['lightsaber','knife'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,...(id==='lightsaber'?{activated:true}:{}),twoHanded:false,attackMod:0,damageMod:0}));validateCharacter(c,pack);return c;
}
const at=(c,id,target,rules)=>{const q=structuredClone(c);q.attackTarget=target;if(rules)q.houseRules={ambiguities:{'ambiguity:sentinel-strike-scope':rules}};validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory.find(e=>e.id==='equipment:'+id).uid);};

test('Sentinel Strike metadata and its scope switch are pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:sentinel-strike').effects[0].maximum=10;assert.throws(()=>validatePack(p));
 const amb=pack.rules.ambiguities.find(a=>a.id==='ambiguity:sentinel-strike-scope');assert.equal(amb.default,'denied-dexterity');assert.deepEqual(amb.options.map(o=>o.value),['denied-dexterity','any-lightsaber']);
 assert.equal(pack.talents.find(t=>t.id==='talent:sentinel-strike').automation,'partial');
});
test('Lightsaber attacks against a denied-Dexterity target gain 1d6 per selection; other weapons and targets do not',()=>{
 const c=jedi(2),plain=at(c,'lightsaber',{}),d=at(c,'lightsaber',{dexDenied:true});assert(derive(c,pack).ctx.talents.filter(t=>t.id==='talent:sentinel-strike').length===2);
 assert.equal(plain.sentinelStrike,undefined);assert.equal(d.sentinelStrike.dice,2);assert.equal(d.damageDisplay,plain.damageDisplay+'+2d6');assert.match(d.breakdown,/Sentinel Strike: \+2d6/);
 assert.equal(at(c,'knife',{dexDenied:true}).sentinelStrike,undefined,'Lightsaber attacks only');
 const lost=jedi(2);lost.levels[2].talent=null;assert.equal(at(lost,'lightsaber',{dexDenied:true}).sentinelStrike.dice,1);
 assert(derive(c,pack).targetTraitsUsed.includes('dexDenied'));
});
test('the any-Lightsaber alternative ignores the target condition; the cap is 5d6',()=>{
 const c=jedi(1);assert.equal(at(c,'lightsaber',{},'any-lightsaber').sentinelStrike.dice,1);assert.equal(at(c,'knife',{},'any-lightsaber').sentinelStrike,undefined);
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:sentinel-strike').maxSelections=7;const many=jedi(5);for(let n=12;n<=13;n++)many.levels.push(row(n%2?'sentinel-strike':null));const q=structuredClone(many);q.attackTarget={dexDenied:true};
 assert.equal(derive(q,p).attacks.find(a=>a.uid===q.inventory[0].uid).sentinelStrike.dice,5);
});
test('the dice stack with critical multiplication and stay out of the printed stat block',()=>{
 const c=jedi(1);c.attackTarget={dexDenied:true};const d=derive(c,pack),a=d.attacks.find(x=>x.uid===c.inventory[0].uid),calls=[];
 rollRoutine({name:'Saber',steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]},d.attacks,pack.rules.combat,expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?20+Number(m[1]):5,d20:m?[20]:[],display:expr,coeffs:[1]};});
 assert(calls.some(e=>/^\(.*\+1d6\)\*2$/.test(e)),calls.join(' | '));assert.doesNotMatch(renderStatBlock(c,d,pack),/\+1d6/);
});
test('actual multiclass grants share denied Dexterity without bypassing range, ownership or prerequisites',()=>{
 const {blade:c}=fixtures(pack,newCharacter);validateCharacter(c,pack);const d=derive(c,pack);
 assert.equal(d.ctx.inactiveClasses.size,0);
 for(const id of ['sentinel-strike','sneak-attack','squad-superiority','opportunistic-strike','no-escape'])assert(d.ctx.talents.some(t=>t.id==='talent:'+id&&!d.ctx.inactiveTalents.has(t.id)),id);
 c.attackTarget={squadAdjacent:true};const both=derive(c,pack).attacks.find(a=>a.uid===c.inventory[0].uid);assert.equal(both.sneakAttack.dice,1);assert.equal(both.sentinelStrike.dice,2);
 c.inventory[2].distance=7;assert.equal(derive(c,pack).attacks.find(a=>a.uid===c.inventory[2].uid).sneakAttack,undefined,'ranged Sneak Attack still stops at six squares');
 c.levels[4].talent=null;assert.equal(derive(c,pack).attacks.find(a=>a.uid===c.inventory[0].uid).sentinelStrike,undefined,'losing Squad Superiority disables that declaration');
 c.attackTarget={withdrewFromYou:true};assert.equal(derive(c,pack).attacks.find(a=>a.uid===c.inventory[0].uid).sentinelStrike.dice,2);
 c.levels[6].talent=null;const lost=derive(c,pack);assert(!lost.ctx.talents.some(t=>t.id==='talent:no-escape'));assert.equal(lost.attacks.find(a=>a.uid===c.inventory[0].uid).sentinelStrike,undefined,'No Escape loses its effect with its prerequisite');
});
