import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,ABILITIES,validateCharacter} from '../src/rules.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(name){const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:'+name;c.abilityMethod='manual';c.abilities=Object.fromEntries(ABILITIES.map(a=>[a,10]));validateCharacter(c,pack);return c;}
test('reviewed species retain complete official articles, fixed scores and distinct published languages',()=>{
 for(const [name,scores,languages]of [
  ['advozse',{con:12,wis:12,dex:8},['Advb','Basic']],['aleena',{dex:12,cha:8},['Aleena','Basic']],
  ['altiri',{},['Altirish','Basic']],['amani',{str:12,int:8,cha:8},['Amanese']],
  ['anarrian',{},['Anarrese','Basic']],['arcona',{cha:12,wis:8},['Arconese','Basic']],['arkanian',{int:12,cha:8},['Arkanian','Basic']],
 ]){
  const c=hero(name),d=derive(c,pack),r=pack.species.find(r=>r.id===c.species);
  assert.deepEqual(d.scores,{str:10,dex:10,con:10,int:10,wis:10,cha:10,...scores});assert.deepEqual(r.languages,languages);
  assert.equal(r.automation,'partial');assert(articleText(r.article).includes('Species Traits'));
  assert(pack.catalog.records.some(x=>x.mechanicsIds.includes(r.id)&&x.status==='available'));
 }
});
test('species fixed traits affect size, natural armor, Fortitude, training and starting feats',()=>{
 const human=derive(hero('human'),pack),advozse=derive(hero('advozse'),pack),aleena=derive(hero('aleena'),pack),arcona=derive(hero('arcona'),pack),amani=derive(hero('amani'),pack);
 assert.equal(advozse.defenses.reflex,human.defenses.reflex);assert(advozse.breakdowns.reflex.includes('1 natural armor'));assert.equal(advozse.vision,'low-light');
 assert.equal(aleena.speed,4);assert.equal(aleena.defenses.reflex,human.defenses.reflex+2);assert.equal(aleena.skills.find(s=>s.id==='skill:stealth').total,6);
 assert.equal(arcona.defenses.fortitude,human.defenses.fortitude+2);assert.equal(amani.defenses.fortitude,human.defenses.fortitude+1);
 assert(amani.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-simple-weapons'));assert(!amani.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-rifles'||f.id==='feat:weapon-proficiency-pistols'));
 assert(derive(hero('altiri'),pack).issues.some(t=>t.includes('choose 4 starting trained skills')));
 assert.equal(derive(hero('anarrian'),pack).rows[0].slots.filter(s=>s.kind==='general').length,2);
 assert.equal(derive(hero('arkanian'),pack).vision,'darkvision');
});
test('unautomated species abilities remain readable without silently granting permanent bonuses',()=>{
 for(const [name,passage]of [['aleena','Quick Energy'],['altiri','Visually Striking'],['amani','Reach'],['anarrian','Strength Surge'],['arkanian','Intellectual Reputation']]){
  const r=pack.species.find(r=>r.id==='species:'+name);assert(articleText(r.article).includes(passage));
 }
 assert.equal(derive(hero('aleena'),pack).speed,4);assert.equal(derive(hero('arkanian'),pack).skills.find(s=>s.id==='skill:persuasion').total,-1);
});
