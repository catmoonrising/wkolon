import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {catchSecondWind,recoveryState,newEncounter,newDay,receiveHealing,setDead,restEightHours,syncRegenerativeHealing,checkConsciousness} from '../src/recovery.js';
import {finishNegatingPower} from '../src/negating-powers.js';
import {beginNextTurn,endCurrentTurn,endTrackedCombat,takeAction,previewPlan,describeAction} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {chargePath} from '../src/charge.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack,{classId:'class:jedi'});c.species='species:trandoshan';c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:regenerative-healing'}];c.levels[0].talent={id:'talent:equilibrium'};for(let n=2;n<=3;n++)c.levels.push({classId:'class:jedi',hpRoll:5,feats:[],talent:n===3?{id:'talent:force-recovery'}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});c.inventory=[{id:'equipment:lightsaber',uid:crypto.randomUUID(),quantity:1,equipped:true,activated:true,twoHanded:false,attackMod:0,damageMod:0}];c.currentHP=1;c.forcePoints=5;validateCharacter(c,pack);return c;}
const activate=c=>takeAction(c,pack,'second-wind',{regenerate:true},()=>{throw Error('Replacement must not roll healing dice');});
const roller=expr=>({value:expr.startsWith('1d20')?10+Number(expr.slice(4)):5,d20:expr.startsWith('1d20')?[10]:[],display:expr,coeffs:[1]});

test('the exact pinned Trandoshan feat grants the closed healing effect',()=>{
 validatePack(pack);const r=pack.feats.find(f=>f.id==='feat:regenerative-healing'),s=pack.sources.find(s=>s.id===r.sourceId);assert.equal(s.revision,20752);assert.deepEqual(r.effects,[{target:'regenerativeHealing',amount:5,dailyUses:1}]);assert.equal(r.automation,'partial');
 const c=hero(),d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id===r.id));assert(d.ctx.talents.some(t=>t.id==='talent:force-recovery'));assert.equal(d.recovery.secondWind.regeneration.amount,5);
 const p=structuredClone(pack);p.feats.find(f=>f.id===r.id).effects[0].amount=10;assert.throws(()=>validatePack(p));c.species='species:human';assert.equal(derive(c,pack).recovery.secondWind.regeneration,null);
});
test('activation spends the wind and feat use, replaces all immediate HP and never rolls Force Recovery',()=>{
 const c=hero();beginNextTurn(c,pack);const before=derive(c,pack).recovery.secondWind.remaining;activate(c);assert.equal(c.currentHP,1);assert.equal(c.forcePoints,5);assert.equal(c.recovery.secondWindsSpent,1);assert(c.recovery.secondWindEncounter&&c.recovery.regenerationUsed&&c.recovery.regenerationActive);assert.equal(derive(c,pack).recovery.secondWind.remaining,before-1);assert.equal(c.actionState.spent.length,1);validateCharacter(c,pack);
});
test('explicit, duplicate and implicit own turn ends pulse once and retain save boundaries',()=>{
 const c=hero();beginNextTurn(c,pack);activate(c);endCurrentTurn(c,pack);assert.equal(c.currentHP,6);endCurrentTurn(c,pack);assert.equal(c.currentHP,6);validateCharacter(c,pack);
 const saved=JSON.parse(JSON.stringify(c));beginNextTurn(saved,pack);assert.equal(saved.currentHP,6);endCurrentTurn(saved,pack);assert.equal(saved.currentHP,11);beginNextTurn(saved,pack);beginNextTurn(saved,pack);assert.equal(saved.currentHP,16,'New Turn implicitly ends the previous unended turn');validateCharacter(saved,pack);
});
test('Charge also pulses once; a following End Turn cannot heal twice',()=>{
 const c=hero();beginNextTurn(c,pack);activate(c);const path=chargePath(c);path.squares=2;takeAction(c,pack,'charge',{uid:c.inventory[0].uid,path},roller);assert.equal(c.currentHP,6);assert(c.actionState.ended);endCurrentTurn(c,pack);assert.equal(c.currentHP,6);
});
test('queued activation is free of mutation and reserves both uses in the preview',()=>{
 const c=hero();beginNextTurn(c,pack);queueAction(c,'second-wind',{regenerate:true});queueAction(c,'second-wind',{regenerate:true});const before=structuredClone(c),view=previewPlan(c,pack);assert.deepEqual(c,before);assert.equal(view[0].name,'Regenerative Healing');assert(!view[0].issue);assert(view[1].issue);assert.equal(c.currentHP,1);assert.equal(recoveryState(c).secondWindsSpent,0);
});
test('healing to full ends the effect permanently, including normal healing and manual HP normalization',()=>{
 const c=hero();activate(c);receiveHealing(c,derive(c,pack),pack,100000);assert(!c.recovery.regenerationActive);c.currentHP=1;endCurrentTurn(c,pack);assert.equal(c.currentHP,1);
 const q=hero();activate(q);q.currentHP=derive(q,pack).hp;assert(syncRegenerativeHealing(q,derive(q,pack)));q.currentHP=1;endCurrentTurn(q,pack);assert.equal(q.currentHP,1);
 const cap=hero();activate(cap);cap.currentHP=derive(cap,pack).hp-2;endCurrentTurn(cap,pack);assert.equal(cap.currentHP,derive(cap,pack).hp);assert(!cap.recovery.regenerationActive);
});
test('Negate Energy healing and regaining consciousness also end regeneration on reaching full HP',()=>{
 const c=hero();activate(c);c.currentHP=derive(c,pack).hp-2;
 finishNegatingPower(c,derive(c,pack),pack,'power:negate-energy',{total:10},{amount:5,options:{type:'normal',energy:true}},{heal:true});assert.equal(c.currentHP,derive(c,pack).hp);assert(!c.recovery.regenerationActive);
 const q=hero();activate(q);q.currentHP=derive(q,pack).hp-1;q.condition=5;checkConsciousness(q,derive(q,pack),pack,()=>({value:20,d20:[18]}));assert.equal(q.currentHP,derive(q,pack).hp);assert(!q.recovery.regenerationActive);
});
test('unconscious pulses use the existing literal replacement and additive healing interpretations',()=>{
 for(const mode of ['replace','add']){const c=hero();activate(c);c.currentHP=20;c.condition=5;c.recovery.persistent=['injury'];if(mode==='add')c.houseRules={ambiguities:{'ambiguity:unconscious-healing':'add'}};endCurrentTurn(c,pack);assert.equal(c.currentHP,mode==='add'?25:5);assert.equal(c.condition,4);assert.deepEqual(c.recovery.persistent,['injury']);assert(c.recovery.regenerationActive);}
});
test('encounter, rest, death and source loss end healing; only a new day restores the feat use',()=>{
 for(const clear of [c=>newEncounter(c),c=>endTrackedCombat(c),c=>restEightHours(c,derive(c,pack),pack),c=>setDead(c,true,pack)]){const c=hero();activate(c);clear(c);assert(!c.recovery.regenerationActive);assert(c.recovery.regenerationUsed);validateCharacter(c,pack);}
 const c=hero();activate(c);newDay(c,pack);assert(!c.recovery.regenerationActive&&!c.recovery.regenerationUsed);newEncounter(c);c.currentHP=1;activate(c);
 c.levels[0].feats=[];assert(syncRegenerativeHealing(c,derive(c,pack)));assert(!c.recovery.regenerationActive);assert(c.recovery.regenerationUsed);
});
test('ordinary Second Wind remains available independently of the daily regeneration choice',()=>{
 const c=hero();activate(c);newEncounter(c);c.currentHP=1;assert.throws(()=>activate(c),/Regenerative Healing unavailable/);const d=derive(c,pack),result=catchSecondWind(c,d,pack,()=>({value:5}));assert.equal(result.forceRecovery,5);assert.equal(c.currentHP,1+d.recovery.secondWind.healing+5);assert.equal(c.forcePoints,5);assert(c.recovery.regenerationUsed);
});
test('legacy saves default cleanly, malformed recovery flags and invalid actions fail atomically',()=>{
 const c=hero();c.recovery=recoveryState(c);for(const k of ['regenerationUsed','regenerationActive','regenerationEnded'])delete c.recovery[k];validateCharacter(c,pack);assert.equal(recoveryState(c).regenerationActive,false);
 for(const [key,value] of [['regenerationUsed','yes'],['regenerationActive',1],['regenerationEnded',[]]]){const q=structuredClone(c);q.recovery[key]=value;assert.throws(()=>validateCharacter(q,pack),/regenerative healing/);}
 const bad=structuredClone(c);bad.recovery.regenerationActive=true;assert.throws(()=>validateCharacter(bad,pack),/regenerative healing/);
 for(const o of [{regenerate:'yes'},{regenerate:true}]){const q=structuredClone(c);q.species='species:human';const before=structuredClone(q);assert.throws(()=>takeAction(q,pack,'second-wind',o));assert.deepEqual(q,before);}
 const used=hero();activate(used);const before=structuredClone(used);assert.throws(()=>describeAction(used,pack,'second-wind',{regenerate:true}));assert.deepEqual(used,before);
});
