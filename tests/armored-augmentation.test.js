import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import {takeAction,beginNextTurn} from '../src/action-engine.js';
import {declaredBonusHPGrants,claimDeclaredBonusHP} from '../src/bonus-hit-points.js';
import {newEncounter} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';
const real=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),pack=structuredClone(real);
// Tree access needs a prestige entry; open the trees and test the effects.
pack.classes.find(k=>k.id==='class:soldier').talentTrees=[...new Set(pack.talents.map(t=>t.tree))];
const derive=c=>api.derive(c,pack),noRoll=()=>{throw Error('Should not roll');};
const armor=(id='battle-armor')=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
function hero(talents,inventory=[armor()],feats=[]){const c=api.newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:12,dex:12,con:12,int:10,wis:10,cha:12};for(let i=1;i<12;i++)c.levels.push({classId:'class:soldier',hpRoll:6,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});c.levels[0].talent=null;talents.forEach((id,i)=>c.levels[i*2].talent={id:'talent:'+id,manualRequirements:true});feats.forEach(id=>c.levels[0].feats.push({id:'feat:'+id}));c.inventory=inventory;c.currentHP=api.derive(c,pack).hp;return c;}
const activate=c=>takeAction(c,pack,'encounter-talent',{talentId:'talent:armored-augmentation-i',choice:'threshold'},noRoll);
const worn=()=>pack.equipment.find(e=>e.id==='equipment:battle-armor');

test('records are Partial and activation is pinned',()=>{
 validatePack(real);for(const id of ['armored-augmentation-i','armored-augmentation-ii','vital-encouragement'])assert.equal(real.talents.find(t=>t.id==='talent:'+id).automation,'partial');
 const bad=structuredClone(real);bad.talents.find(t=>t.id==='talent:armored-augmentation-i').activation.forcePoints=0;assert.throws(()=>validatePack(bad),/Armored Augmentation/);
});
test('Armored Augmentation I adds the Armor bonus to Damage Threshold for the encounter at Swift and one Force Point',()=>{
 const c=hero(['armored-augmentation-i']),before=derive(c).threshold,fp=c.forcePoints;beginNextTurn(c,pack);activate(c);
 assert.equal(derive(c).threshold,before+worn().armorBonus);assert.equal(c.forcePoints,fp-1);
 assert.throws(()=>activate(c),/already active/);beginNextTurn(c,pack);assert.equal(derive(c).threshold,before+worn().armorBonus,'lasts past the next turn');
 newEncounter(c);assert.equal(derive(c).threshold,before);activate(c);
});
test('removing the armor suppresses it; no armor gives nothing',()=>{
 const c=hero(['armored-augmentation-i']),before=derive(c).threshold;beginNextTurn(c,pack);activate(c);c.inventory[0].equipped=false;assert.equal(derive(c).threshold,derive(hero(['armored-augmentation-i'],[])).threshold);c.inventory[0].equipped=true;assert(derive(c).threshold>before);
});
test('Armored Augmentation II adds DR of twice the Fortitude bonus only while active, strongest source only',()=>{
 const c=hero(['armored-augmentation-i','armored-augmentation-ii']);beginNextTurn(c,pack);assert.equal(derive(c).timedDR,0,'not until activated');activate(c);assert.equal(derive(c).timedDR,2*worn().fortitudeBonus);
 const one=hero(['armored-augmentation-i']);beginNextTurn(one,pack);activate(one);assert.equal(derive(one).timedDR,0,'I alone gives no DR');
});
test('Vital Encouragement grants 10 + half Heroic Level once per encounter and replaces only when larger',()=>{
 const c=hero(['vital-encouragement'],[],['force-sensitivity']),d=derive(c),g=declaredBonusHPGrants(pack,d,c).find(r=>r.id==='vital-encouragement');assert.equal(g.amount,10+Math.floor(d.level/2));
 c.bonusHP=100;claimDeclaredBonusHP(c,d,pack,'vital-encouragement');assert.equal(c.bonusHP,100);delete c.bonusHP;
 assert.equal(declaredBonusHPGrants(pack,d,c).some(r=>r.id==='vital-encouragement'),false);assert.throws(()=>claimDeclaredBonusHP(c,d,pack,'vital-encouragement'),/unavailable/);
 api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);newEncounter(c);assert.equal(c.bonusHPGrantsUsed,undefined);claimDeclaredBonusHP(c,d,pack,'vital-encouragement');assert.equal(c.bonusHP,g.amount);
});
test('invalid saves are rejected',()=>{
 for(const value of ['x',[1],['a','a']]){const c=hero(['vital-encouragement'],[],['force-sensitivity']);c.bonusHPGrantsUsed=value;assert.throws(()=>api.validateCharacter(c,pack));}
});
