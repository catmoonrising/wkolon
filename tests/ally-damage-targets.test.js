import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
const row=(feats=[],talent=null)=>({classId:'class:soldier',hpRoll:5,feats:feats.map(id=>({id:'feat:'+id})),talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Kel Dor Soldier: Justice Seeker at level 1, Coordinated Attack at level 3, Combined Mercenary Fire at level 5.
function merc({justice=true,mercenary=true}={}){const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:kel-dor';c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:10,cha:10};
 c.levels[0].feats=justice?[{id:'feat:justice-seeker'}]:[];c.levels.push(row(),row(['coordinated-attack']),row(),row([],mercenary?'combined-mercenary-fire':null));
 c.inventory=[item('blaster-rifle'),item('knife'),item('frag-grenade')];validateCharacter(c,pack);return c;}
const dmg=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid).damageDisplay;};
const plus=(s,n)=>s+'+'+n; // opponent-trait damage is appended as its own term

test('ally-damage target records are pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:justice-seeker').effects[0].against='damagedByAlly';assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:justice-seeker').automation,'partial');assert.equal(pack.talents.find(t=>t.id==='talent:combined-mercenary-fire').automation,'partial');
});
test('each declared window adds +2 damage; both add; area attacks excluded',()=>{
 const c=merc(),d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:justice-seeker')&&d.ctx.talents.some(t=>t.id==='talent:combined-mercenary-fire'));
 for(const i of [0,1]){const base=dmg(c,i,{});assert.equal(dmg(c,i,{damagedYourAlly:true}),plus(base,2));assert.equal(dmg(c,i,{damagedByAlly:true}),plus(base,2));assert.equal(dmg(c,i,{damagedYourAlly:true,damagedByAlly:true}),plus(base,4));}
 assert.equal(dmg(c,2,{damagedYourAlly:true,damagedByAlly:true}),dmg(c,2,{}),'area attack excluded');
 const j=merc({mercenary:false});assert.equal(dmg(j,0,{damagedByAlly:true}),dmg(j,0,{}),'talent required');assert(!derive(j,pack).targetTraitsUsed.includes('damagedByAlly'));
 const m=merc({justice:false});assert.equal(dmg(m,0,{damagedYourAlly:true}),dmg(m,0,{}),'feat required');
 const human=structuredClone(c);human.species='species:human';human.attackTarget={damagedYourAlly:true};const h=derive(human,pack);assert(h.issues.some(s=>/Justice Seeker is not eligible/.test(s)));assert.equal(h.attacks.find(a=>a.uid===c.inventory[0].uid).damageDisplay,dmg(c,0,{}),"ineligible Justice Seeker grants nothing");
});
