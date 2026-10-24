import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Carbineer access is covered by selectable-talent tests; here the talents sit in a Soldier tree.
const pack=structuredClone(core);for(const id of ['close-contact','rifle-master'])pack.talents.find(t=>t.id==='talent:'+id).tree='tree:weapon-specialist';
const row=t=>({classId:'class:soldier',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function hero(talents=[],feats=[]){
 const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:10};c.levels[0].talent=talents[0]?{id:'talent:'+talents[0]}:null;c.levels[0].feats=feats.map(id=>({id}));
 for(let n=2;n<=5;n++)c.levels.push(row(n%2?talents[(n-1)/2]:null));
 c.inventory=['blaster-rifle','blaster-carbine','blaster-pistol'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,shotsRemaining:20}));validateCharacter(c,pack);return c;
}
const at=(c,id,distance)=>{const q=structuredClone(c),e=q.inventory.find(e=>e.id==='equipment:'+id);e.distance=distance;return derive(q,pack).attacks.find(a=>a.uid===e.uid);};
const lim=core.rules.weaponRanges.limits.rifles,limp=core.rules.weaponRanges.limits.pistols;

test('Carbineer range records are pinned and Partial',()=>{
 validatePack(core);for(const [id,change] of [['close-contact',e=>e.maximum=15],['close-contact',e=>e.amount=10],['rifle-master',e=>e.weaponGroup='pistols']]){const p=structuredClone(core);change(p.talents.find(t=>t.id==='talent:'+id).effects[0]);assert.throws(()=>validatePack(p),id);}
 for(const id of ['close-contact','rifle-master'])assert.equal(core.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('Close Contact extends Rifle Point-Blank Range by 5 squares per selection to a maximum of 10',()=>{
 const base=hero();assert.equal(at(base,'blaster-rifle',lim[0]+5).range.band,1);
 const one=hero(['close-contact']);assert.equal(at(one,'blaster-rifle',lim[0]+5).range.band,0);assert.equal(at(one,'blaster-rifle',lim[0]+6).range.band,1);assert.equal(at(one,'blaster-carbine',lim[0]+5).range.band,0);
 assert.equal(at(one,'blaster-rifle',lim[1]).range.band,1,'Short Range still ends at the same distance');assert.equal(at(one,'blaster-rifle',lim[1]+1).range.band,2);
 const two=hero(['close-contact','close-contact']);assert.equal(at(two,'blaster-rifle',lim[0]+10).range.band,0);assert.equal(at(two,'blaster-rifle',lim[0]+11).range.band,1);
 assert.deepEqual(at(two,'blaster-pistol',6).range.limits,at(base,'blaster-pistol',6).range.limits,'Pistols unchanged');
 const pbs=hero(['close-contact'],['feat:point-blank-shot']),plain=hero([],['feat:point-blank-shot']);assert.equal(at(pbs,'blaster-rifle',lim[0]+5).attack,at(plain,'blaster-rifle',lim[0]+5).attack+1+2,'Point-Blank Shot and no Short penalty in the extended band');
 const folded=hero(['close-contact']);folded.inventory[0].stockPosition='folded';const f=at(folded,'blaster-rifle',10);assert.equal(f.group,'pistols');assert.deepEqual(f.range.limits,[limp[0]+5,...limp.slice(1)]);folded.houseRules={ambiguities:{'ambiguity:folded-stock-rifle-range':'pistol-ranges'}};assert.deepEqual(at(folded,'blaster-rifle',10).range.limits,limp);
});
test('Rifle Master treats Rifles as Accurate: no Short Range penalty, Accurate table beyond',()=>{
 const base=hero(),m=hero(['rifle-master']);const d=lim[0]+1;assert.equal(at(base,'blaster-rifle',d).range.penalty,-2);assert.equal(at(m,'blaster-rifle',d).range.penalty,0);assert.equal(at(m,'blaster-carbine',d).range.penalty,0);
 assert.equal(at(m,'blaster-rifle',lim[1]+1).range.penalty,-5);assert.equal(at(m,'blaster-rifle',lim[2]+1).range.penalty,-10);assert.equal(at(m,'blaster-pistol',13).range.penalty,at(base,'blaster-pistol',13).range.penalty);
 m.levels[0].talent=null;assert.equal(at(m,'blaster-rifle',d).range.penalty,-2);
});

test('real Gunslinger access grants repeated range talents, proficiency and both folded-stock readings',async()=>{
 const {default:fixture}=await import('../tools/weapon-family-fixtures.cjs');const c=fixture(core,newCharacter,{talents:['close-contact','close-contact','rifle-master']});validateCharacter(c,core);let d=derive(c,core);assert.equal(d.level,12);assert.equal(d.ctx.classLevels.get('class:gunslinger'),5);assert.equal(d.ctx.talents.filter(t=>t.id==='talent:close-contact'&&!d.ctx.inactiveTalents.has(t.id)).length,2);const e=c.inventory[0];e.stockPosition='folded';e.distance=core.rules.weaponRanges.limits.pistols[0]+10;d=derive(c,core);let a=d.attacks.find(a=>a.uid===e.uid);assert.equal(a.range.band,0);assert(a.proficient);assert.equal(a.printedGroup,'rifles');assert.equal(a.group,'pistols');c.houseRules={ambiguities:{'ambiguity:folded-stock-rifle-range':'pistol-ranges'}};a=derive(c,core).attacks.find(a=>a.uid===e.uid);assert.equal(a.range.band,1);assert.equal(a.range.penalty,-2);c.levels[0].feats=[];d=derive(c,core);assert(!d.ctx.classLevels.has('class:gunslinger'));assert.equal(d.attacks.find(a=>a.uid===e.uid).range.penalty,-2);
});
