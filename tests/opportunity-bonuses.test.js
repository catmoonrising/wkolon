import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {opportunityContext} from '../src/opportunity.js';
import {opportunityPlan,rollOpportunity} from '../src/opportunity-actions.js';
import {validatePack} from '../tools/validate-rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// The talents' prestige trees are covered by selectable-talent tests; here they sit in a Soldier tree.
const pack=structuredClone(core);for(const id of ['opportunity-fire','advantageous-strike','shoot-from-the-hip'])pack.talents.find(t=>t.id==='talent:'+id).tree='tree:weapon-specialist';
function hero(talent,{proficient=true,hip=talent==='opportunity-fire'}={}){
 const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:16,con:10,int:14,wis:10,cha:10};c.levels[0].talent={id:'talent:'+talent};
 if(hip)c.levels.push(...[null,'shoot-from-the-hip'].map(t=>({classId:'class:soldier',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]})));
 c.inventory=['knife','blaster-pistol','blaster-rifle','lightsaber'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(['knife','lightsaber'].includes(id)?{}:{shotsRemaining:20})}));
 if(!proficient)c.inventory=c.inventory.filter(e=>e.id!=='equipment:knife');
 c.opportunity={...opportunityContext(c),opponent:'Guard A',action:'Guard A, move 1',provoked:true};validateCharacter(c,pack);return c;
}
const uid=(c,id)=>c.inventory.find(e=>e.id==='equipment:'+id).uid;
const plain=(c,id)=>derive(c,pack).attacks.find(a=>a.uid===uid(c,id)).attack;
const aoo=(c,id)=>opportunityPlan(c,pack,uid(c,id)).attack;
const roller=natural=>expr=>{const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?natural+Number(m[1]):9,d20:m?[natural]:[],display:expr,coeffs:[1]};};

test('opportunity bonus records are pinned, Partial and limited to reviewed talents',()=>{
 validatePack(core);for(const [id,change] of [['opportunity-fire',e=>e.amount=3],['opportunity-fire',e=>e.weaponGroup='pistols'],['advantageous-strike',e=>delete e.proficient]]){const p=structuredClone(core);change(p.talents.find(t=>t.id==='talent:'+id).effects[0]);assert.throws(()=>validatePack(p),id);}
 const p=structuredClone(core);p.feats.find(f=>f.id==='feat:toughness').effects.push({target:'opportunityAttack',amount:2,type:'untyped',weaponGroup:'rifles'});assert.throws(()=>validatePack(p));
 for(const id of ['opportunity-fire','advantageous-strike','shoot-from-the-hip'])assert.equal(core.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('Opportunity Fire adds +2 only to Attacks of Opportunity made with Rifles',()=>{
 const c=hero('opportunity-fire');const a=aoo(c,'blaster-rifle');assert.equal(a.attack,plain(c,'blaster-rifle')+2);assert.match(a.breakdown,/Opportunity Fire: \+2/);
 assert.equal(aoo(c,'knife').attack,plain(c,'knife'));assert.equal(derive(c,pack).attacks.find(x=>x.uid===uid(c,'blaster-rifle')).attack,plain(hero('advantageous-strike',{hip:true}),'blaster-rifle'),'ordinary attacks unchanged');
 const r=rollOpportunity(c,pack,uid(c,'blaster-rifle'),roller(10));assert.match(r.text,new RegExp('Reflex ≤ '+(10+plain(c,'blaster-rifle')+2)+':'));
});
test('Advantageous Strike adds +5 to proficient melee Attacks of Opportunity only',()=>{
 const c=hero('advantageous-strike');assert.equal(aoo(c,'knife').attack,plain(c,'knife')+5);assert.match(aoo(c,'knife').breakdown,/Advantageous Strike: \+5/);
 const h=hero('advantageous-strike',{hip:true});assert.equal(aoo(h,'blaster-rifle').attack,plain(h,'blaster-rifle'));
 const ls=derive(c,pack).attacks.find(a=>a.uid===uid(c,'lightsaber'));assert.equal(ls.proficient,false);assert.equal(aoo(c,'lightsaber').attack,ls.attack,'not proficient');
});
test('Shoot from the Hip lets Rifles make Attacks of Opportunity; folded stocks retain Rifle attack benefits',()=>{
 const c=hero('advantageous-strike');assert.throws(()=>aoo(c,'blaster-rifle'),/cannot make attacks of opportunity/);
 const h=hero('advantageous-strike',{hip:true});assert.equal(aoo(h,'blaster-rifle').attack,plain(h,'blaster-rifle'));
 const f=hero('opportunity-fire');f.inventory.find(e=>e.id==='equipment:blaster-rifle').stockPosition='folded';assert.equal(aoo(f,'blaster-rifle').attack,plain(f,'blaster-rifle')+2,'folding changes proficiency and range only');
 h.levels[2].talent=null;assert.throws(()=>aoo(h,'blaster-rifle'),/cannot make attacks/);
});
test('unnamed opportunity bonuses add to Opportunistic Shooter',()=>{
 const c=hero('opportunity-fire');c.levels[0].feats=[{id:'feat:opportunistic-shooter'}];validateCharacter(c,pack);const a=aoo(c,'blaster-rifle');assert.equal(a.attack,plain(c,'blaster-rifle')+4);assert.match(a.breakdown,/Opportunistic Shooter: \+2; Opportunity Fire: \+2/);
});

test('actual Gunslinger and Melee Duelist entry grants only each legal opportunity talent',async()=>{
 const {default:fixture}=await import('../tools/weapon-family-fixtures.cjs');for(const duelist of [false,true]){const c=fixture(core,newCharacter,{duelist,talents:duelist?['advantageous-strike']:['opportunity-fire','shoot-from-the-hip']});validateCharacter(c,core);let d=derive(c,core);assert.equal(d.ctx.classLevels.get(duelist?'class:melee-duelist':'class:gunslinger'),duelist?1:5);c.opportunity={...opportunityContext(c),opponent:'Guard',action:'Move',provoked:true};const e=c.inventory[duelist?2:0];if(!duelist)e.stockPosition='folded';d=derive(c,core);const base=d.attacks.find(a=>a.uid===e.uid).attack;assert.equal(opportunityPlan(c,core,e.uid).attack.attack,base+(duelist?5:2));c.houseRules={ambiguities:{'ambiguity:folded-stock-rifle-range':'pistol-ranges'}};assert.equal(opportunityPlan(c,core,e.uid).attack.attack,derive(c,core).attacks.find(a=>a.uid===e.uid).attack+(duelist?5:2));}
});
