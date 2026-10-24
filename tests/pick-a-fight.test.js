import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {beginNextTurn} from '../src/action-engine.js';
import {setActionPhase} from '../src/surprise-round.js';
import {emptyActionState} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:soldier',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function brawler(talents=['cantina-brawler','pick-a-fight']){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:12,con:12,int:10,wis:10,cha:10};c.levels[0].talent={id:'talent:'+talents[0]};c.levels.push(row(null),row(talents[1]||null));c.inventory=[{id:'equipment:knife',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];validateCharacter(c,pack);return c;}
const attack=c=>derive(c,pack).attacks[0].attack;
test("Pick a Fight adds +1 morale to the user's attacks only during a surprise phase",()=>{
 validatePack(pack);assert.equal(pack.talents.find(t=>t.id==='talent:pick-a-fight').automation,'partial');
 const c=brawler(),base=attack(c);assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:pick-a-fight'));
 c.actionState=emptyActionState();setActionPhase(c,'aware');validateCharacter(c,pack);assert.equal(attack(c),base+1);
 c.actionState.phase='surprised';assert.equal(attack(c),base+1);
 c.actionState.phase='normal';assert.equal(attack(c),base);
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:pick-a-fight').effects.push({target:'attacks',amount:2,type:'morale'});c.actionState.phase='aware';assert.equal(derive(c,p).attacks[0].attack,base+2,'morale bonuses do not stack');
 const none=brawler(['cantina-brawler']);none.actionState=emptyActionState();setActionPhase(none,'aware');assert.equal(attack(none),attack(brawler(['cantina-brawler'])));
});

test('Pick a Fight uses real legal class choices, expires on the first regular turn and survives reload before it',()=>{
 const c=brawler();assert(!derive(c,pack).issues.some(i=>/Pick a Fight/.test(i)));const base=attack(c);setActionPhase(c,'aware');const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(attack(saved),base+1);beginNextTurn(saved,pack);assert.equal(attack(saved),base);assert.equal(saved.actionState.phase,'normal');
});

test('conditional morale attacks apply to ranged weapons and Bellow only during the surprise round',async()=>{
 const {bellowDetails}=await import('../src/species-actions.js');const c=brawler();c.species='species:ithorian';c.inventory.push({id:'equipment:blaster-rifle',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:true,attackMod:0,damageMod:0});validateCharacter(c,pack);const initial=derive(c,pack),base=bellowDetails(c,initial,pack).attack;
 for(const phase of ['aware','surprised']){setActionPhase(c,phase);const d=derive(c,pack);for(const a of initial.attacks)assert.equal(d.attacks.find(x=>x.uid===a.uid).attack,a.attack+1);assert.equal(bellowDetails(c,d,pack).attack,base+1);}
 beginNextTurn(c,pack);const normal=derive(c,pack);assert.equal(bellowDetails(c,normal,pack).attack,base);for(const a of initial.attacks)assert.equal(normal.attacks.find(x=>x.uid===a.uid).attack,a.attack);c.levels[2].talent=null;setActionPhase(c,'aware');assert.equal(bellowDetails(c,derive(c,pack),pack).attack,base);
});
