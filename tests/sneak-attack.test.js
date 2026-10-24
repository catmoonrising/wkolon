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

test('Advantageous Positioning makes a declared flanked target count as denied Dexterity',()=>{
 const p=structuredClone(pack);const t=p.talents.find(t=>t.id==='talent:advantageous-positioning');t.tree='tree:misfortune';t.prerequisite={kind:'all',requirements:[]};
 const c=newCharacter(p,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:12};c.levels[0].talent={id:'talent:sneak-attack'};c.levels.push(row(null),row('advantageous-positioning'));
 c.inventory=[{id:'equipment:knife',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];c.attackTarget={flanking:true};validateCharacter(c,p);
 assert.equal(derive(c,p).attacks.find(a=>a.uid===c.inventory[0].uid).sneakAttack.dice,1);c.levels[2].talent=null;assert.equal(derive(c,p).attacks.find(a=>a.uid===c.inventory[0].uid).sneakAttack,undefined);
 assert.equal(pack.talents.find(t=>t.id==='talent:advantageous-positioning').automation,'partial');assert.throws(()=>validateCharacter({...c,attackTarget:{flanking:1}},p),/attack target flanking/);
});


test('a legal Assassin uses Shift and Advantageous Positioning with their existing Sneak Attack',()=>{
 const c=hero();c.trainedSkills=['skill:stealth','skill:deception','skill:perception','skill:initiative','skill:persuasion'];c.levels[0].feats=[{id:'feat:precise-shot'},{id:'feat:improved-defenses'}];for(let n=2;n<=7;n++){c.levels.push(row(n===3?'dastardly-strike':null));if(n===6)c.levels.at(-1).feats=[{id:'feat:sniper'}];}
 for(let n=1;n<=3;n++)c.levels.push({classId:'class:assassin',hpRoll:4,feats:[],talent:n===1?{id:'talent:shift'}:n===3?{id:'talent:advantageous-positioning'}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});validateCharacter(c,pack);let d=derive(c,pack);assert(!d.ctx.inactiveClasses.has('class:assassin'));assert(d.ctx.talents.some(t=>t.id==='talent:advantageous-positioning')&&!d.ctx.inactiveTalents.has('talent:advantageous-positioning'));assert.equal(at(c,'knife').sneakAttack,undefined);
 c.attackTarget={flanking:true};assert.equal(at(c,'knife').sneakAttack.dice,1);assert.equal(c.attackTarget.dexDenied,undefined,'the declaration does not rewrite the opponent for other characters');
});
