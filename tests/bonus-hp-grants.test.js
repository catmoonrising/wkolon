import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {declaredBonusHPGrants,claimDeclaredBonusHP} from '../src/bonus-hit-points.js';
import {applyIncomingDamage} from '../src/incoming-damage.js';
import {newEncounter,setDead} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Tree access is covered elsewhere; the reviewed talents sit in a Soldier tree here.
const pack=structuredClone(core);for(const id of ['thrive-on-chaos','shoulder-to-shoulder','bando-gora-surge']){const t=pack.talents.find(t=>t.id==='talent:'+id);t.tree='tree:weapon-specialist';t.prerequisite={kind:'all',requirements:[]};}
const row=t=>({classId:'class:soldier',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function hero(){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:12,dex:12,con:12,int:12,wis:12,cha:12};c.levels[0].talent={id:'talent:thrive-on-chaos'};c.levels.push(row(null),row('shoulder-to-shoulder'),row(null),row('bando-gora-surge'));c.currentHP=derive(c,pack).hp;validateCharacter(c,pack);return c;}
const claim=(c,id)=>claimDeclaredBonusHP(c,derive(c,pack),pack,id);

test('bonus HP grant metadata is pinned and the talents are Partial',()=>{
 validatePack(core);for(const change of [r=>r[0].base=10,r=>r[1].level='character',r=>r[2].levelDivisor=2]){const p=structuredClone(core);change(p.rules.bonusHPGrants);assert.throws(()=>validatePack(p));}
 for(const id of ['thrive-on-chaos','shoulder-to-shoulder','bando-gora-surge'])assert.equal(core.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('declared grants compute printed amounts and never stack',()=>{
 const c=hero();assert.deepEqual(declaredBonusHPGrants(pack,derive(c,pack)).map(g=>[g.id,g.amount]),[['thrive-on-chaos',7],['shoulder-to-shoulder',5],['bando-gora-surge',10]]);
 assert.equal(claim(c,'shoulder-to-shoulder').after,5);assert.equal(claim(c,'thrive-on-chaos').after,7);assert.equal(claim(c,'shoulder-to-shoulder').after,7,'smaller grant does not replace');assert.equal(claim(c,'bando-gora-surge').after,10);
 const hp=c.currentHP;applyIncomingDamage(c,derive(c,pack),pack,4,{});assert.equal(c.bonusHP,6);assert.equal(c.currentHP,hp);
 newEncounter(c);assert.equal(c.bonusHP,undefined);validateCharacter(c,pack);
});
test('grants require the talent and a living character',()=>{
 const c=hero();c.levels[2].talent=null;assert(!declaredBonusHPGrants(pack,derive(c,pack)).some(g=>g.id==='shoulder-to-shoulder'));assert.throws(()=>claim(c,'shoulder-to-shoulder'),/unavailable/);
 const d=hero();setDead(d,true);assert.deepEqual(declaredBonusHPGrants(pack,derive(d,pack)),[]);assert.throws(()=>claim(d,'thrive-on-chaos'),/unavailable/);
});

test('Luck Favors the Bold grants 5 + half Heroic Level only while conscious',()=>{
 const p=structuredClone(pack);const t=p.talents.find(t=>t.id==='talent:luck-favors-the-bold');t.tree='tree:weapon-specialist';t.prerequisite={kind:'all',requirements:[]};
 const c=newCharacter(p,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:12,dex:12,con:12,int:12,wis:12,cha:12};c.levels[0].talent={id:'talent:luck-favors-the-bold'};c.levels.push(row(null),row(null));c.currentHP=derive(c,p).hp;validateCharacter(c,p);
 assert.equal(declaredBonusHPGrants(p,derive(c,p)).find(g=>g.id==='luck-favors-the-bold').amount,6);assert.equal(claimDeclaredBonusHP(c,derive(c,p),p,'luck-favors-the-bold').after,6);
 c.condition=5;assert(!declaredBonusHPGrants(p,derive(c,p)).some(g=>g.id==='luck-favors-the-bold'));c.condition=0;c.currentHP=0;assert.throws(()=>claimDeclaredBonusHP(c,derive(c,p),p,'luck-favors-the-bold'),/unavailable/);
 assert.equal(core.talents.find(t=>t.id==='talent:luck-favors-the-bold').automation,'partial');
});


test('published class and tradition prerequisites expose all four grants without a modified pack',()=>{
 const make=cls=>{const c=newCharacter(core,{classId:'class:'+cls});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:12,wis:12,cha:14};return c;};
 const add=(c,cls,talent=null)=>c.levels.push({classId:'class:'+cls,hpRoll:4,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 const check=(c,id,amount)=>{validateCharacter(c,core);const d=derive(c,core);assert(d.ctx.talents.some(t=>t.id==='talent:'+id)&&!d.ctx.inactiveTalents.has('talent:'+id),id);assert.equal(declaredBonusHPGrants(core,d).find(r=>r.id===id).amount,amount);assert.equal(claimDeclaredBonusHP(c,d,core,id).after,amount);};
 const opportunist=make('scoundrel');opportunist.levels[0].talent={id:'talent:advantageous-opening'};add(opportunist,'scoundrel');add(opportunist,'scoundrel','thrive-on-chaos');check(opportunist,'thrive-on-chaos',6);
 const noble=make('noble');noble.levels[0].talent={id:'talent:face-the-foe'};add(noble,'noble');add(noble,'noble','luck-favors-the-bold');check(noble,'luck-favors-the-bold',6);
 const commando=make('soldier');commando.levels[0].talent={id:'talent:armored-defense'};commando.levels[0].feats=[{id:'feat:martial-arts-i'},{id:'feat:point-blank-shot'}];for(let n=2;n<=7;n++)add(commando,'soldier');add(commando,'elite-trooper','shoulder-to-shoulder');check(commando,'shoulder-to-shoulder',8);
 const bando=make('jedi');bando.trainedSkills=['skill:use-the-force'];bando.darkSideScore=1;bando.forceTraditions=[{id:'tradition:bando-gora-captain',level:1,darkSideScore:1}];bando.levels[0].talent={id:'talent:bando-gora-surge'};check(bando,'bando-gora-surge',6);
});
