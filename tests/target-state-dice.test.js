import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollRoutine} from '../src/combat.js';
import {validatePack} from '../tools/validate-rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const find=(c,p,id,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,p);return derive(q,p).attacks.find(a=>a.uid===q.inventory.find(e=>e.id==='equipment:'+id).uid);};

test('target-state dice records are pinned and Partial',()=>{
 validatePack(core);const p=structuredClone(core);p.talents.find(t=>t.id==='talent:ambush-commando').effects[0].dice=3;assert.throws(()=>validatePack(p));
 for(const id of ['prime-targets','ambush-commando','invisible-attacker'])assert.equal(core.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('Prime Targets: +1 die on Lightsaber attacks against a declared target not attacked since your last turn (legal Core Jedi)',()=>{
 const c=newCharacter(core,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:12,cha:12};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:prime-targets'};c.inventory=[item('lightsaber',{activated:true}),item('knife')];validateCharacter(c,core);
 assert(derive(c,core).targetTraitsUsed.includes('notAttackedSince'));const ls=find(c,core,'lightsaber',{}),lb=find(c,core,'lightsaber',{notAttackedSince:true});assert.equal(lb.damageDisplay,ls.damageDisplay+'+1d8');
 assert.equal(find(c,core,'knife',{notAttackedSince:true}).damageDisplay,find(c,core,'knife',{}).damageDisplay,'Lightsaber only');
});
// Elite Trooper and Vanguard access is covered by the selectable-talent tests; these isolate the effect math in a Soldier tree.
const pack=structuredClone(core);for(const id of ['ambush-commando','invisible-attacker']){const t=pack.talents.find(t=>t.id==='talent:'+id);t.tree='tree:weapon-specialist';t.prerequisite={kind:'all',requirements:[]};}
function soldier(talent){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:10,cha:10};c.levels[0].talent={id:'talent:'+talent};c.inventory=[item('blaster-pistol'),item('knife'),item('frag-grenade')];validateCharacter(c,pack);return c;}
test('Ambush Commando: +2 dice on any non-area attack against a target that has not acted',()=>{
 const c=soldier('ambush-commando');for(const id of ['blaster-pistol','knife'])assert.equal(find(c,pack,id,{notYetActed:true}).damageDisplay,find(c,pack,id,{}).damageDisplay+'+2'+/d\d+/.exec(find(c,pack,id,{}).damage)[0]);
 assert.equal(find(c,pack,'frag-grenade',{notYetActed:true}).damageDisplay,find(c,pack,'frag-grenade',{}).damageDisplay,'area attacks excluded');
 const d=derive({...structuredClone(c),attackTarget:{notYetActed:true}},pack),a=d.attacks.find(x=>x.uid===c.inventory[0].uid),calls=[];
 rollRoutine({name:'Shot',steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]},d.attacks,pack.rules.combat,expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?20+Number(m[1]):5,d20:m?[20]:[],display:expr,coeffs:[1]};});
 assert(calls.some(e=>/^\(.*\+2d6\)\*2$/.test(e)),'critical multiplies the extra dice: '+calls.join(' | '));
});
test('Invisible Attacker: +1 die on ranged attacks against an unaware target only',()=>{
 const c=soldier('invisible-attacker');assert.equal(find(c,pack,'blaster-pistol',{unawareOfYou:true}).damageDisplay,find(c,pack,'blaster-pistol',{}).damageDisplay+'+1d6');
 assert.equal(find(c,pack,'knife',{unawareOfYou:true}).damageDisplay,find(c,pack,'knife',{}).damageDisplay,'melee excluded');
 assert.throws(()=>validateCharacter({...c,attackTarget:{unawareOfYou:'yes'}},pack),/attack target unawareOfYou/);
});
