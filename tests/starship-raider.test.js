import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:scoundrel',hpRoll:4,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Core Scoundrel: Spacehound at level 1, Starship Raider at level 3.
function raider(talent=true){const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:12};c.levels[0].talent={id:'talent:spacehound'};c.levels.push(row(null),row(talent?'starship-raider':null));
 c.inventory=['blaster-pistol','knife','frag-grenade'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));validateCharacter(c,pack);return c;}
const attacks=(c,aboard)=>{const q=structuredClone(c);q.attackTarget=aboard?{aboardStarship:true}:{};validateCharacter(q,pack);return derive(q,pack).attacks;};

test('Starship Raider metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:starship-raider').effects[0].amount=2;assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:starship-raider').automation,'partial');
});
test('+1 on every personal attack, including area attacks, only while declared aboard a Starship',()=>{
 const c=raider(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:starship-raider'));assert(d.targetTraitsUsed.includes('aboardStarship'));
 const off=attacks(c,false),on=attacks(c,true);assert(off.some(a=>a.areaType),'fixture includes an area attack');
 for(const a of off)assert.equal(on.find(b=>b.uid===a.uid).attack,a.attack+1,a.name);
 const none=raider(false);for(const a of attacks(none,false))assert.equal(attacks(none,true).find(b=>b.uid===a.uid).attack,a.attack,'no talent, no bonus');
 assert(!derive(none,pack).targetTraitsUsed.includes('aboardStarship'),'flag hidden without the talent');
 assert.throws(()=>validateCharacter({...c,attackTarget:{aboardStarship:1}},pack),/attack target aboardStarship/);
 const q=structuredClone(c);q.attackTarget={aboardStarship:true};assert.equal(renderStatBlock(q,derive(q,pack),pack),renderStatBlock(c,derive(c,pack),pack),'printed stat block omits declared context');
});
