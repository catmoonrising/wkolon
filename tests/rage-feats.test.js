import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,previewPlan,beginNextTurn,endTrackedCombat} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {startRage,endRage,newEncounter,newDay,setDead,recoveryState} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const lvl=feats=>({classId:'class:soldier',hpRoll:5,feats,talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function wookiee(feats,extra=[]){
 const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:wookiee';c.abilityMethod='manual';c.abilities={str:16,dex:12,con:14,int:10,wis:10,cha:8};c.trainedSkills=['skill:climb','skill:jump','skill:swim'];c.levels[0].feats=feats.map(id=>({id}));
 c.levels.push(lvl([]),lvl(extra.map(id=>({id}))));validateCharacter(c,pack);return c;
}
const noRoll=()=>{throw Error('no roll');};
const channel=c=>takeAction(c,pack,'channel-rage',{},noRoll);
const skill=(c,id)=>derive(c,pack).skills.find(s=>s.id==='skill:'+id);

test('Rage feat metadata is pinned and Partial',()=>{
 validatePack(pack);for(const [id,change] of [['channel-rage',e=>e.amount=2],['powerful-rage',e=>e.amount=2]]){const p=structuredClone(pack);change(p.feats.find(f=>f.id==='feat:'+id).effects[0]);assert.throws(()=>validatePack(p),id);}
 for(const id of ['channel-rage','powerful-rage'])assert.equal(pack.feats.find(f=>f.id==='feat:'+id).automation,'partial');
 const human=newCharacter(pack,{classId:'class:soldier'});human.levels[0].feats=[{id:'feat:channel-rage'}];assert(!derive(human,pack).ctx.feats.some(f=>f.id==='feat:channel-rage'),'requires the Rage trait');
});
test('Channel Rage spends the daily Rage for an encounter-long +5 Will without Raging',()=>{
 const c=wookiee(['feat:channel-rage']),d0=derive(c,pack);assert.equal(d0.recovery.rage.remaining,1);const r=channel(c);assert.equal(r.text,'Channel Rage: Will +5 until the end of the encounter');
 const d=derive(c,pack);assert.equal(d.defenses.will,d0.defenses.will+5);assert.equal(d.recovery.rage.remaining,0);assert.equal(d.recovery.rage.active,false);assert.deepEqual(c.actionState.spent,['swift']);
 assert.equal(d.attacks[0].attack,d0.attacks[0].attack,'no Rage attack bonus');assert(d.skills.find(s=>s.id==='skill:mechanics').available===d0.skills.find(s=>s.id==='skill:mechanics').available,'no Rage skill restriction');
 assert.throws(()=>startRage(c,d),/Rage unavailable/);beginNextTurn(c,pack);assert.equal(derive(c,pack).defenses.will,d0.defenses.will+5);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 newEncounter(c);assert.equal(derive(c,pack).defenses.will,d0.defenses.will);assert.equal(derive(c,pack).recovery.rage.remaining,0,'daily use stays spent');newDay(c,pack);assert.equal(derive(c,pack).recovery.rage.remaining,1);
});
test('Channel Rage preflight, Extra Rage, resets, previews and ownership',()=>{
 const c=wookiee(['feat:channel-rage']);startRage(c,derive(c,pack));endRage(c);let before=structuredClone(c);assert.throws(()=>channel(c),/Channel Rage unavailable/);assert.deepEqual(c,before);
 const raging=wookiee(['feat:channel-rage'],['feat:extra-rage']);startRage(raging,derive(raging,pack));assert.throws(()=>channel(raging),/unavailable/);
 const two=wookiee(['feat:channel-rage'],['feat:extra-rage']);channel(two);assert.throws(()=>channel(two),/unavailable/);assert.equal(derive(two,pack).recovery.rage.remaining,1);
 for(const reset of [x=>endTrackedCombat(x),x=>setDead(x,true)]){const x=wookiee(['feat:channel-rage']);channel(x);reset(x);assert.equal(x.recovery.channelRage,false);}
 const q=wookiee(['feat:channel-rage']);beginNextTurn(q,pack);const s=queueAction(q,'channel-rage',{});before=structuredClone(q);assert(!previewPlan(q,pack).find(r=>r.id===s.id).issue);assert.deepEqual(q,before);
 const none=wookiee([]);assert.throws(()=>channel(none),/Requires Channel Rage/);
 const lost=wookiee(['feat:channel-rage']),w=derive(lost,pack).defenses.will;channel(lost);lost.levels[0].feats=[];assert.equal(derive(lost,pack).defenses.will,w);
 assert.throws(()=>validateCharacter({...lost,recovery:{...lost.recovery,channelRage:'yes'}},pack),/recovery state/);
});
test('Powerful Rage adds +4 to Strength checks and Strength-based skills only while Raging',()=>{
 const c=wookiee(['feat:powerful-rage']),d0=derive(c,pack);startRage(c,d0);const d=derive(c,pack);
 for(const id of ['climb','jump','swim'])assert.equal(d.skills.find(s=>s.id==='skill:'+id).total,d0.skills.find(s=>s.id==='skill:'+id).total+4,id);
 assert.equal(d.skills.find(s=>s.id==='skill:perception').total,d0.skills.find(s=>s.id==='skill:perception').total);assert.equal(d.abilityCheckBonuses.str,d0.abilityCheckBonuses.str+4);assert.match(d.skills.find(s=>s.id==='skill:climb').breakdown,/4 Powerful Rage/);
 endRage(c);assert.doesNotMatch(skill(c,'climb').breakdown,/Powerful Rage/,'post-Rage fatigue applies but the +4 ends');
 const plain=wookiee([]);startRage(plain,derive(plain,pack));assert.equal(skill(plain,'climb').total,derive(wookiee([]),pack).skills.find(s=>s.id==='skill:climb').total);
});

test('Channel Rage is once per day even with Extra Rage uses left in later encounters',()=>{
 const c=wookiee(['feat:channel-rage'],['feat:extra-rage']);assert.equal(derive(c,pack).recovery.rage.remaining,2);channel(c);assert.equal(c.recovery.channelRageUsed,true);
 newEncounter(c);assert.equal(c.recovery.channelRage,false);assert.equal(c.recovery.channelRageUsed,true);const before=structuredClone(c);assert.throws(()=>channel(c),/Channel Rage unavailable/);assert.deepEqual(c,before);
 beginNextTurn(c,pack);const q=structuredClone(c);const s=queueAction(q,'channel-rage',{});assert.match(previewPlan(q,pack).find(r=>r.id===s.id).issue,/unavailable/);
 assert.equal(derive(c,pack).recovery.rage.remaining,1);startRage(c,derive(c,pack));assert.equal(derive(c,pack).recovery.rage.remaining,0,'the Extra Rage use still funds an ordinary Rage');
 endRage(c);newDay(c,pack);assert.equal(c.recovery.channelRageUsed,false);channel(c);assert.equal(c.recovery.channelRage,true);
 assert.throws(()=>validateCharacter({...c,recovery:{...c.recovery,channelRageUsed:1}},pack),/recovery state/);
 const legacy=structuredClone(c);delete legacy.recovery.channelRageUsed;validateCharacter(legacy,pack);
});

test('a legacy active Channel without channelRageUsed keeps its daily use through encounter resets',()=>{
 for(const reset of [x=>newEncounter(x),x=>endTrackedCombat(x)]){
  const c=wookiee(['feat:channel-rage'],['feat:extra-rage']);c.recovery={...recoveryState(c),ragesSpent:1,channelRage:true};delete c.recovery.channelRageUsed;validateCharacter(c,pack);
  reset(c);assert.equal(c.recovery.channelRage,false);assert.equal(c.recovery.channelRageUsed,true);const before=structuredClone(c);assert.throws(()=>channel(c),/Channel Rage unavailable/);assert.deepEqual(c,before);
  newDay(c,pack);assert.equal(c.recovery.channelRageUsed,false);channel(c);assert.equal(c.recovery.channelRage,true);
 }
 const raged=wookiee(['feat:channel-rage'],['feat:extra-rage']);startRage(raged,derive(raged,pack));endRage(raged);newEncounter(raged);assert.notEqual(raged.recovery.channelRageUsed,true,'ordinary Rage use does not imply a Channel');channel(raged);
});
