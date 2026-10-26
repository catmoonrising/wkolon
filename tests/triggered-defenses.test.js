import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fixture from '../tools/trigger-fixtures.cjs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {beginNextTurn,endCurrentTurn,endTrackedCombat,takeAction} from '../src/action-engine.js';
import {newEncounter,newDay} from '../src/recovery.js';
import {setTriggeredDefense,triggeredDefenseControls} from '../src/triggered-defenses.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const heroes=()=>fixture(pack,newCharacter),set=(c,id,on=true)=>setTriggeredDefense(c,pack,derive(c,pack).ctx,id,on);
test('eight source-pinned declared triggers include distinct duration scopes',()=>{
 validatePack(pack);assert.equal(pack.rules.triggeredDefenseBonuses.length,11);assert(pack.rules.triggeredDefenseBonuses.some(r=>r.id==='focused-warrior'));assert.equal(pack.talents.find(t=>t.id==='talent:focused-warrior').automation,'partial');for(const change of [p=>p.rules.triggeredDefenseBonuses[0].effect.amount=3,p=>p.rules.triggeredDefenseBonuses[4].duration='start-next-turn']){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
});
test('real Bothan/Gamorrean features update Will/Fortitude and the Fortitude-based threshold without self-stacking',()=>{
 const {bothan:b,gamorrean:g}=heroes();for(const [c,id,key] of [[b,'bothan-will','will'],[g,'increased-resistance','fortitude']]){validateCharacter(c,pack);assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:'+id));const before=derive(c,pack);set(c,id);set(c,id);let d=derive(c,pack);assert.equal(d.defenses[key],before.defenses[key]+2);assert.equal(d.threshold,before.threshold+(key==='fortitude'?2:0));const restored=JSON.parse(JSON.stringify(c));validateCharacter(restored,pack);assert.equal(derive(restored,pack).defenses[key],d.defenses[key]);endCurrentTurn(c,pack);assert.equal(derive(c,pack).defenses[key],d.defenses[key]);beginNextTurn(c,pack);assert.equal(derive(c,pack).defenses[key],before.defenses[key]);assert.equal(c.triggeredDefenses,undefined);}
});
test('Dodge declarations add and are suppressed only while Dexterity is denied',()=>{
 const {mobile:c}=heroes();validateCharacter(c,pack);const d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:rebel-military-training'));assert(d.ctx.feats.some(f=>f.id==='feat:moving-target'));set(c,'moving-target');set(c,'rebel-military-training');assert.equal(derive(c,pack).defenses.reflex,d.defenses.reflex+3);c.flatFooted=true;const plain=structuredClone(c);delete plain.triggeredDefenses;assert.equal(derive(c,pack).defenses.reflex,derive(plain,pack).defenses.reflex);c.flatFooted=false;assert.equal(derive(c,pack).defenses.reflex,d.defenses.reflex+3);beginNextTurn(c,pack);assert.equal(derive(c,pack).defenses.reflex,d.defenses.reflex);
});
test('unowned/wrong-species declarations and malformed saved rows fail without mutation',()=>{
 const {bothan:c}=heroes();const before=structuredClone(c);for(const [id,on] of [['revenge',true],['unknown',true],['bothan-will',1]]){assert.throws(()=>set(c,id,on));assert.deepEqual(c,before);}for(const fields of [{triggeredDefenses:['revenge']},{encounterTriggers:['bothan-will']},{triggeredDefenses:['bothan-will','bothan-will']},{triggeredDefenses:'bothan-will'}])assert.throws(()=>validateCharacter({...c,...fields},pack));c.species='species:human';assert.throws(()=>set(c,'bothan-will'));assert.equal(triggeredDefenseControls(c,pack,derive(c,pack).ctx),'');
});
test('Revenge is an actual Dark Side talent: distinct bonus types stack, damage applies to all weapon modes, inactive sources suppress saved triggers',()=>{
 const {revenge:c}=heroes();validateCharacter(c,pack);let d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:revenge'&&!d.ctx.inactiveTalents.has(t.id)));const before=d.attacks;set(c,'revenge');set(c,'revenge');d=derive(c,pack);for(const a of before){const b=d.attacks.find(b=>b.uid===a.uid);assert.equal(b.attack,a.attack+2);assert.equal(b.damageBonus,a.damageBonus+2);}const bm=pack.talents.find(t=>t.id==='talent:battle-meditation');c.talentActivations=[{id:bm.id,choice:bm.activation.choices[0].id}];assert.equal(derive(c,pack).attacks[0].attack,before[0].attack+3,'Insight and Force bonuses stack');c.darkSideScore=0;assert.equal(derive(c,pack).attacks[0].attack,before[0].attack+1);c.darkSideScore=1;assert.equal(derive(c,pack).attacks[0].attack,before[0].attack+3);beginNextTurn(c,pack);assert.deepEqual(c.encounterTriggers,['revenge']);endTrackedCombat(c);assert.equal(c.encounterTriggers,undefined);assert.equal(derive(c,pack).attacks[0].attack,before[0].attack);
});
test('new encounter/day clear both scopes, while validation accepts a saved legitimate encounter trigger',()=>{
 for(const reset of [c=>newEncounter(c),c=>newDay(c,pack)]){const {revenge:c,mobile:m}=heroes();set(c,'revenge');set(m,'moving-target');validateCharacter(JSON.parse(JSON.stringify(c)),pack);reset(c);reset(m);assert.equal(c.encounterTriggers,undefined);assert.equal(m.triggeredDefenses,undefined);}
});

test('Revenge and a real Battle Strike resolve competing Force attack bonuses once',()=>{
 const {revenge:c}=heroes();c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=Array.from({length:3},()=>({id:crypto.randomUUID(),powerId:'power:battle-strike',spent:false}));validateCharacter(c,pack);const before=derive(c,pack).attacks[0].attack;set(c,'revenge');takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers[0].id,fp:'none'},()=>({value:25,d20:[15],display:'25',coeffs:[1]}));const d=derive(c,pack);assert.equal(d.attacks[0].attack,before+2);assert.equal(d.battleStrike.attackBonus,0);assert.equal(d.battleStrike.dice,3);assert.deepEqual(c.actionState.spent,['swift']);validateCharacter(c,pack);
});

function mercenary(){const c=newCharacter(pack,{classId:"class:soldier"});c.abilityMethod="manual";c.abilities={str:14,dex:12,con:12,int:10,wis:12,cha:10};c.levels[0].talent={id:"talent:focused-warrior"};validateCharacter(c,pack);assert(derive(c,pack).ctx.talents.some(t=>t.id==="talent:focused-warrior"&&!derive(c,pack).ctx.inactiveTalents.has(t.id)));return {c,p:pack};}
const hero=(species)=>{const h=heroes();return species==="bothan"?h.bothan:h.gamorrean;};

test('Focused Warrior is lost, not suppressed, when Surprised or Flat-Footed; other triggers survive',async()=>{
 const {endFlatFootedTriggers}=await import('../src/triggered-defenses.js');const {setActionPhase}=await import('../src/surprise-round.js');
 const {c,p}=mercenary(),w=derive(c,p).defenses.will;
 c.flatFooted=true;const before=structuredClone(c);assert.throws(()=>setTriggeredDefense(c,p,derive(c,p).ctx,'focused-warrior',true,{flatFooted:derive(c,p).flatFooted}),/flat-footed/);assert.deepEqual(c,before);c.flatFooted=false;
 set(c,'focused-warrior',true,p);assert.equal(derive(c,p).defenses.will,w+5);c.flatFooted=true;assert.equal(endFlatFootedTriggers(c,p,derive(c,p).flatFooted),true);assert.equal(c.triggeredDefenses,undefined);c.flatFooted=false;assert.equal(derive(c,p).defenses.will,w,'not restored when Flat-Footed ends');
 assert.equal(endFlatFootedTriggers(c,p,false),false);set(c,'focused-warrior',true,p);assert.equal(derive(c,p).defenses.will,w+5,'a new trigger restores it');
 setActionPhase(c,'aware',p);assert.equal(c.triggeredDefenses,undefined,'entering a surprise phase removes it');
 const b=hero('bothan','bothan-will');set(b,'bothan-will');b.flatFooted=true;assert.equal(endFlatFootedTriggers(b,pack,true),false);assert.deepEqual(b.triggeredDefenses,['bothan-will']);
 const legacy=mercenary().c;legacy.triggeredDefenses=['focused-warrior'];legacy.flatFooted=true;validateCharacter(legacy,p);assert.equal(endFlatFootedTriggers(legacy,p,derive(legacy,p).flatFooted),true);validateCharacter(legacy,p);
});

test('Focused Warrior treats an explicit Surprised phase as a loss independently of Flat-Footed, but not Aware alone',async()=>{
 const {endFlatFootedTriggers}=await import('../src/triggered-defenses.js');const {emptyActionState}=await import('../src/action-economy.js');
 const {c,p}=mercenary(),w=derive(c,p).defenses.will;
 c.actionState={...emptyActionState(),phase:'surprised',active:true};c.flatFooted=false;validateCharacter(c,p);let before=structuredClone(c);
 assert.throws(()=>set(c,'focused-warrior',true,p),/Surprised or flat-footed/);assert.deepEqual(c,before,'rejected atomically');
 c.triggeredDefenses=['focused-warrior'];assert.equal(derive(c,p).defenses.will,w,'suppressed while Surprised');assert.equal(endFlatFootedTriggers(c,p,false),true);assert.equal(c.triggeredDefenses,undefined,'removed while Surprised');
 const a=mercenary().c;a.actionState={...emptyActionState(),phase:'aware',active:true};a.flatFooted=false;validateCharacter(a,p);set(a,'focused-warrior',true,p);assert.equal(derive(a,p).defenses.will,w+5,'Aware and no longer flat-footed may gain a fresh trigger');assert.equal(endFlatFootedTriggers(a,p,false),false);
 const d=mercenary().c;d.flatFooted=true;before=structuredClone(d);assert.throws(()=>setTriggeredDefense(d,p,derive(d,p).ctx,'focused-warrior',true),/flat-footed/,'direct setter reads saved Flat-Footed without options');assert.deepEqual(d,before);
 const b=hero('bothan','bothan-will');b.actionState={...emptyActionState(),phase:'surprised',active:true};b.flatFooted=false;set(b,'bothan-will');assert.deepEqual(b.triggeredDefenses,['bothan-will'],'other trigger rows unaffected');assert.equal(endFlatFootedTriggers(b,pack,false),false);
});

test('Knight\'s Morale and For the Cause last until the end of the next turn from either side of the boundary',()=>{
 const p=structuredClone(pack);for(const id of ['knight-s-morale','for-the-cause']){const t=p.talents.find(t=>t.id==='talent:'+id);t.tree='tree:weapon-specialist';t.prerequisite={kind:'all',requirements:[]};}
 const make=()=>{const c=newCharacter(p,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:12,con:12,int:10,wis:12,cha:10};c.levels[0].talent={id:'talent:knight-s-morale'};c.levels.push({classId:'class:soldier',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:soldier',hpRoll:5,feats:[],talent:{id:'talent:for-the-cause'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});c.inventory=[{id:'equipment:knife',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];validateCharacter(c,p);return c;};
 const s=(c,id)=>setTriggeredDefense(c,p,derive(c,p).ctx,id,true);
 const own=make(),d0=derive(own,p);beginNextTurn(own,p);s(own,'knight-s-morale');s(own,'for-the-cause');assert.deepEqual(own.turnEndTriggers,[{id:'knight-s-morale',endsRemaining:2,ended:false},{id:'for-the-cause',endsRemaining:2,ended:false}]);
 let d=derive(own,p);for(const k of ['reflex','fortitude','will'])assert.equal(d.defenses[k],d0.defenses[k]+1);assert.equal(d.attacks[0].attack,d0.attacks[0].attack+2);assert.equal(d.attacks[0].damageBonus,d0.attacks[0].damageBonus+2);
 endCurrentTurn(own,p);beginNextTurn(own,p);assert.equal(derive(own,p).defenses.will,d0.defenses.will+1);endCurrentTurn(own,p);assert.equal(own.turnEndTriggers,undefined);
 const off=make();beginNextTurn(off,p);endCurrentTurn(off,p);s(off,'knight-s-morale');assert.deepEqual(off.turnEndTriggers,[{id:'knight-s-morale',endsRemaining:1,ended:true}]);beginNextTurn(off,p);assert.equal(derive(off,p).defenses.will,d0.defenses.will+1);endCurrentTurn(off,p);assert.equal(off.turnEndTriggers,undefined);
 const q=make();beginNextTurn(q,p);endCurrentTurn(q,p);s(q,'knight-s-morale');s(q,'knight-s-morale');assert.equal(q.turnEndTriggers.length,1,'refresh, not stack');validateCharacter(JSON.parse(JSON.stringify(q)),p);
 for(const reset of [x=>endTrackedCombat(x),x=>newEncounter(x),x=>newDay(x,p)]){const x=make();s(x,'for-the-cause');reset(x);assert.equal(x.turnEndTriggers,undefined);}
 for(const rows of [null,[{id:'bothan-will',endsRemaining:1,ended:false}],[{id:'knight-s-morale',endsRemaining:3,ended:false}],[{id:'knight-s-morale',endsRemaining:1}]])assert.throws(()=>validateCharacter({...q,turnEndTriggers:rows},p),/triggered defenses/);
 for(const id of ['knight-s-morale','for-the-cause'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
