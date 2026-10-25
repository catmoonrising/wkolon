import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
// Legal Ember of Vahl member: Soldier with Force Sensitivity, Initiate of Vahl at level 1 and Sword of Vahl at level 3.
function cultist(sword=true){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:12,cha:12};c.forceTraditions=[{id:'tradition:ember-of-vahl',level:1,darkSideScore:0}];
 c.levels[0].feats=[{id:'feat:force-sensitivity'}];c.levels[0].talent={id:'talent:initiate-of-vahl'};const row=t=>({classId:'class:soldier',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});c.levels.push(row(null),row(sword?'sword-of-vahl':null));
 c.inventory=[item('knife'),item('blaster-pistol')];validateCharacter(c,pack);return c;}
const attacks=c=>derive(c,pack).attacks;

test('Sword of Vahl metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:sword-of-vahl').effects[0].weaponGroup='pistols';assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:sword-of-vahl').automation,'partial');
});
test('+1 Force bonus on Simple Weapons and Unarmed Attacks only; Force bonuses do not stack',()=>{
 const c=cultist(),b=cultist(false),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:sword-of-vahl'&&!d.ctx.inactiveTalents.has(t.id)));
 const by=(x,pred)=>attacks(x).find(pred);
 assert.equal(by(c,a=>a.uid===c.inventory[0].uid).attack,by(b,a=>a.uid===b.inventory[0].uid).attack+1,'Knife');
 assert.equal(by(c,a=>a.unarmed).attack,by(b,a=>a.unarmed).attack+1,'Unarmed Attack');
 assert.equal(by(c,a=>a.uid===c.inventory[1].uid).attack,by(b,a=>a.uid===b.inventory[1].uid).attack,'Pistol excluded');
 assert.equal(d.specialAttackPenalty,derive(b,pack).specialAttackPenalty,'weaponless totals unchanged');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:sword-of-vahl').effects.push({target:'attacks',amount:2,type:'force'});
 assert.equal(derive(c,p).attacks.find(a=>a.uid===c.inventory[0].uid).attack,by(b,a=>a.uid===b.inventory[0].uid).attack+2,'highest Force bonus only');
});
