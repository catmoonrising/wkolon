import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
// Legal level-1 Noble with Droid Hunter (proficient with Pistols and Simple Weapons, not Rifles).
function noble(feat=true){const c=newCharacter(pack,{classId:'class:noble'});c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:12,wis:10,cha:14};c.levels[0].feats=feat?[{id:'feat:droid-hunter'}]:[];c.inventory=[item('blaster-pistol'),item('ion-pistol'),item('blaster-rifle'),item('knife')];validateCharacter(c,pack);return c;}
const row=(c,i,target)=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);return derive(q,pack).attacks.find(a=>a.uid===q.inventory[i].uid);};

test('Droid Hunter metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:droid-hunter').effects[0].ionAmount=6;assert.throws(()=>validatePack(p));
 assert.equal(pack.feats.find(f=>f.id==='feat:droid-hunter').automation,'partial');
});
test('+2 against a declared Droid, +4 instead with an Ion weapon, proficient weapons only',()=>{
 const c=noble(),d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:droid-hunter'));assert(d.targetTraitsUsed.includes('droidEnemy'));
 for(const [i,n] of [[0,2],[1,4],[3,2]])assert.equal(row(c,i,{droidEnemy:true}).damageDisplay,row(c,i,{}).damageDisplay+'+'+n,c.inventory[i].id);
 assert.match(row(c,1,{}).damageType,/Ion/);
 const rifle=row(c,2,{});assert.equal(rifle.proficient,false,'fixture: Rifles not proficient');assert.equal(row(c,2,{droidEnemy:true}).damageDisplay,rifle.damageDisplay,'non-proficient weapon excluded');
 const none=noble(false);assert.equal(row(none,0,{droidEnemy:true}).damageDisplay,row(none,0,{}).damageDisplay,'feat required');
});
