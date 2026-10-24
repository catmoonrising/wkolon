import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollRoutine} from '../src/combat.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:scoundrel',hpRoll:4,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function hero(ranks=1){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:12};c.levels[0].talent=ranks?{id:'talent:sneak-attack'}:null;
 for(let n=2;n<=2*Math.max(ranks,1)-1;n++)c.levels.push(row(n%2&&(n+1)/2<=ranks?'sneak-attack':null));
 c.inventory=['knife','blaster-pistol','frag-grenade'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));validateCharacter(c,pack);return c;
}
const at=(c,id,extra={})=>{const q=structuredClone(c),e=q.inventory.find(e=>e.id==='equipment:'+id);Object.assign(e,extra);return derive(q,pack).attacks.find(a=>a.uid===e.uid);};
const denied=c=>{c.attackTarget={dexDenied:true};validateCharacter(c,pack);return c;};

test('Sneak Attack metadata and the declared target flag are strict',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:sneak-attack').effects[0].maximum=20;assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:sneak-attack').automation,'partial');
 const c=hero();c.attackTarget={dexDenied:'yes'};assert.throws(()=>validateCharacter(c,pack),/attack target dexDenied/);
});
test('melee attacks against a Dexterity-denied target add 1d6 per selection',()=>{
 const c=hero(2),plain=at(c,'knife');assert.equal(plain.sneakAttack,undefined);denied(c);const a=at(c,'knife');
 assert.equal(a.sneakAttack.dice,2);assert.equal(a.damageDisplay,plain.damageDisplay+'+2d6');assert.equal(a.attack,plain.attack);assert.match(a.breakdown,/Sneak Attack: \+2d6/);
 const none=denied(hero(0));assert.equal(at(none,'knife').sneakAttack,undefined);
 const lost=denied(hero(2));lost.levels[2].talent=null;assert.equal(at(lost,'knife').sneakAttack.dice,1);
});
test('ranged attacks need a declared distance of at most 6 squares; per-target area resolution remains manual',()=>{
 const c=denied(hero());assert.equal(at(c,'blaster-pistol').sneakAttack,undefined);assert.equal(at(c,'blaster-pistol',{distance:6}).sneakAttack.dice,1);assert.equal(at(c,'blaster-pistol',{distance:7}).sneakAttack,undefined);
 const g=at(c,'frag-grenade',{distance:3});assert(g.areaType);assert.equal(g.sneakAttack,undefined);
});
test('the dice are capped at 10d6, rolled with the attack, multiplied on a critical and omitted from the stat block',()=>{
 const p=structuredClone(pack);const c=denied(hero(1));const d=derive(c,p);const knife=d.attacks.find(a=>a.name.startsWith('Knife'));
 const calls=[];const roller=expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?20+Number(m[1]):5,d20:m?[20]:[],display:expr,coeffs:[1]};};
 rollRoutine({name:'Knife',steps:[{attackId:knife.uid,count:1,attackMod:0,damageMod:0}]},d.attacks,pack.rules.combat,roller);assert(calls.some(e=>/^\(.*\+1d6\)\*2$/.test(e)),calls.join(' | '));
 assert.doesNotMatch(renderStatBlock(c,d,pack),/\+1d6/);
 const many=denied(hero(10));assert.equal(at(many,'knife').sneakAttack.dice,10);
 const capped=structuredClone(pack);capped.talents.find(t=>t.id==='talent:sneak-attack').effects[0].maximum=3;const q=structuredClone(many),e=q.inventory.find(e=>e.id==='equipment:knife');assert.equal(derive(q,capped).attacks.find(a=>a.uid===e.uid).sneakAttack.dice,3);
});
