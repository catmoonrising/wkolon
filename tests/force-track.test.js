import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/force-track-fixtures.cjs';
import {takeAction,finishForceChoice,beginNextTurn,endCurrentTurn,endTrackedCombat,previewNextTurn} from '../src/action-engine.js';
import {choosePowerEffectTier} from '../src/power-effect-choices.js';
import {finishTrackingPower,trackingPowerSnapshot,activeTrackingPowers,followTrackingQuarry,setTrackingMinutes,removeTrackingPower} from '../src/tracking-powers.js';
import {advanceTimedTalents} from '../src/timed-talents.js';
import {recoverSuite} from '../src/force-powers.js';
import {newDay,newEncounter,restEightHours} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';

const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),pid='power:force-track',copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id===pid&&!p.spent).copyId;
const opts=c=>({powerId:copy(c),action:'swift-action',fp:'none',enhance:true,tracking:{quarry:'  Mara  ',second:'  Talon  '}});
const roll=(natural=20,bonus=16)=>e=>({value:natural+bonus,d20:[natural],display:e});

test('ForceTrack20424 and six-second rounds have closed data and genuine feature builds',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-force-track').revision,20424);assert.equal(pack.rules.trackingPowers[0].durationRounds,600);
 for(const mastery of [false,true]){const d=api.derive(f.adept({mastery}),pack),p=d.forcePowers.find(p=>p.id===pid);assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}
 const bad=structuredClone(pack);bad.rules.trackingPowers[0].durationRounds=60;assert.throws(()=>validatePack(bad));
});

test('all check boundaries select trail age, one hour and one/two named quarries without invented rolls',()=>{
 for(const total of [14,15,19,20,24,25,29,30,60])for(const enhanced of [false,true]){
  const c=f.adept(),snapshot=trackingPowerSnapshot(pack,pid,{quarry:' Mara ',second:' Talon '});const r=finishTrackingPower(c,pack,crypto.randomUUID(),pid,{total},{enhanced,snapshot});
  if(total<15){assert.equal(r.text,'No effect');assert.equal(c.trackingPowerEffects,undefined);continue;}
  const age=total>=30?1440:total>=25?60:total>=20?10:1,s=activeTrackingPowers(c,pack)[0];assert.equal(s.trailMinutes,age);assert.equal(s.minutes,60);assert.deepEqual(s.quarries,enhanced?['Mara','Talon']:['Mara']);assert.equal(s.rounds,600);assert.match(r.text,/without Survival checks for up to 1 hour/);api.validateCharacter(c,pack);
 }
});

test('saved FP/tier choice freezes names, spends once and leaves ordinary Survival and caster state unchanged',()=>{
 const c=f.adept(),fp=c.forcePoints,d=api.derive(c,pack);takeAction(c,pack,'power',opts(c),roll());const q=JSON.parse(JSON.stringify(c)),s=q.actionState.plan[0],check=structuredClone(s.result.check);choosePowerEffectTier(q,pack,s.id,15);s.options.tracking={quarry:'Changed',second:'Other'};
 finishForceChoice(q,pack,s.id,'enhance',()=>assert.fail('No extra check'));assert.equal(q.forcePoints,fp-1);assert.deepEqual(q.trackingPowerEffects[0].quarries,['Mara','Talon']);assert.equal(activeTrackingPowers(q,pack)[0].trailMinutes,1);assert.deepEqual(q.actionState.plan[0].result.check,check);assert.equal(q.currentHP,c.currentHP);assert.equal(q.condition,c.condition);assert.equal(q.darkSideScore,0);assert.deepEqual(api.derive(q,pack).skills.find(s=>s.id==='skill:survival'),d.skills.find(s=>s.id==='skill:survival'));assert.deepEqual(q.actionState.spent,['swift']);api.validateCharacter(q,pack);
 const before=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,s.id,'enhance',()=>assert.fail('No replay')));assert.deepEqual(q,before);
 const original=Math.random;Math.random=()=>assert.fail('Following does not roll');try{const r=followTrackingQuarry(q,pack,q.trackingPowerEffects[0].id,1);assert.match(r.text,/Track Talon, no Survival check/);assert.deepEqual(q,before);}finally{Math.random=original;}
});

test('actual game time advances even without talent timers, previews and initial Start turn are pure',()=>{
 const c=f.adept();beginNextTurn(c,pack);takeAction(c,pack,'power',{...opts(c),enhance:false,effectDC:15},roll());assert.equal(c.trackingPowerEffects[0].rounds,600);const before=structuredClone(c),rng=Math.random,uuid=crypto.randomUUID;
 Math.random=()=>assert.fail('Preview must not roll');crypto.randomUUID=()=>assert.fail('Preview must not allocate identities');try{previewNextTurn(c,pack);assert.deepEqual(c,before);}finally{Math.random=rng;crypto.randomUUID=uuid;}
 beginNextTurn(c,pack);assert.equal(c.trackingPowerEffects[0].rounds,599);assert.equal(c.timedTalents,undefined);advanceTimedTalents(c,9);assert.equal(c.trackingPowerEffects[0].rounds,590);
 recoverSuite(c,api.derive(c,pack));assert.equal(c.trackingPowerEffects[0].rounds,580);advanceTimedTalents(c,580);assert.equal(c.trackingPowerEffects,undefined);
 const q=f.adept();finishTrackingPower(q,pack,crypto.randomUUID(),pid,{total:15},{snapshot:trackingPowerSnapshot(pack,pid,{quarry:'Mara'})});beginNextTurn(q,pack);assert.equal(q.trackingPowerEffects[0].rounds,600);
});

test('End combat, encounter and natural20 recovery preserve duration; explicit day and eight-hour rest expire it',()=>{
 const c=f.adept();takeAction(c,pack,'power',{...opts(c),enhance:false,effectDC:15},roll());endCurrentTurn(c,pack);assert.equal(c.trackingPowerEffects[0].rounds,600);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));endTrackedCombat(c);assert.equal(c.trackingPowerEffects[0].rounds,600);newEncounter(c);assert.equal(c.trackingPowerEffects[0].rounds,600);c.forcePoints++;assert.equal(c.trackingPowerEffects[0].rounds,600);newDay(c,pack);assert.equal(c.trackingPowerEffects,undefined);
 const q=f.adept();takeAction(q,pack,'power',{...opts(q),enhance:false,effectDC:15},roll());restEightHours(q,api.derive(q,pack),pack);assert.equal(q.trackingPowerEffects,undefined);
});

test('minutes edits handle floating point exactly, remove only one activation and never allow invalid or duplicate rows',()=>{
 const c=f.adept(),snapshot=trackingPowerSnapshot(pack,pid,{quarry:'Mara'});
 for(let n=0;n<2;n++)finishTrackingPower(c,pack,crypto.randomUUID(),pid,{total:20},{snapshot});const [a,b]=c.trackingPowerEffects;setTrackingMinutes(c,pack,a.id,59.9);assert.equal(a.rounds,599);assert.equal(b.rounds,600);
 for(const x of [-.1,.15,60.1,NaN,Infinity,'1']){const before=structuredClone(c);assert.throws(()=>setTrackingMinutes(c,pack,a.id,x));assert.deepEqual(c,before);}
 setTrackingMinutes(c,pack,a.id,0);assert.equal(c.trackingPowerEffects.length,1);assert.equal(c.trackingPowerEffects[0].id,b.id);removeTrackingPower(c,b.id);assert.equal(c.trackingPowerEffects,undefined);
});

test('quarry names and active effects remain bounded/escaped and independent of copies or action history',()=>{
 for(const q of [{quarry:''},{quarry:'x'.repeat(101)},{quarry:'Mara',second:'Mara'},{quarry:3},{quarry:'Mara',extra:true}])assert.throws(()=>trackingPowerSnapshot(pack,pid,q));
 const c=f.adept(),r=finishTrackingPower(c,pack,crypto.randomUUID(),pid,{total:30},{snapshot:trackingPowerSnapshot(pack,pid,{quarry:'<script>quarry</script>'})});assert(!r.html.includes('<script>'));assert(r.html.includes('&lt;script&gt;'));c.levels.flatMap(l=>l.forcePowers||[]).forEach(p=>{if(p.powerId===pid)p.powerId='power:surge';});delete c.actionState;assert.match(followTrackingQuarry(c,pack,c.trackingPowerEffects[0].id,0).text,/quarry/);api.validateCharacter(c,pack);
 for(const key of ['rounds','tier']){const bad=structuredClone(c);bad.trackingPowerEffects[0][key]=0;assert.throws(()=>api.validateCharacter(bad,pack));}const bad=structuredClone(c);bad.trackingPowerEffects.push({...bad.trackingPowerEffects[0]});assert.throws(()=>api.validateCharacter(bad,pack));
});

test('ordinary FP unlocks an age tier, while genuine Adept/Mastery and old manual history preserve shared behavior',()=>{
 const c=f.adept({mastery:true}),fp=c.forcePoints;c.skillModifiers={'skill:use-the-force':8-api.derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total};takeAction(c,pack,'power',{...opts(c),fp:'ask'},roll(10,8));finishForceChoice(c,pack,c.actionState.plan[0].id,true,()=>({value:2,display:'2'}));finishForceChoice(c,pack,c.actionState.plan[0].id,false,()=>assert.fail('No reroll'));assert.equal(activeTrackingPowers(c,pack)[0].trailMinutes,10);assert.deepEqual(c.trackingPowerEffects[0].quarries,['Mara']);assert.equal(c.forcePoints,fp-1);
 const m=f.adept({mastery:true});takeAction(m,pack,'power',{...opts(m),rollMode:'take10',enhance:false,effectDC:15},()=>assert.fail('Mastery must not roll'));assert.equal(m.trackingPowerEffects[0].rounds,600);beginNextTurn(m,pack);takeAction(m,pack,'power',{...opts(m),rollMode:'adept',enhance:false,effectDC:15},roll());assert.equal(m.trackingPowerEffects.length,2);assert(m.forcePowerRecoveryPending);
 const old=f.adept();takeAction(old,pack,'power',opts(old),roll());const s=old.actionState.plan[0];delete s.options.effectPowerId;delete s.options.trackingPowerSnapshot;delete s.result.effectChoiceAllowed;api.validateCharacter(old,pack);const r=finishForceChoice(old,pack,s.id,'enhance',()=>assert.fail('Legacy must not reroll'));assert.match(r.text,/enhancement manual/);assert.equal(old.trackingPowerEffects,undefined);
});
