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
test('only five source-pinned declared triggers are enabled, while Focused Warrior stays manual',()=>{
 validatePack(pack);assert.equal(pack.rules.triggeredDefenseBonuses.length,5);assert(!pack.rules.triggeredDefenseBonuses.some(r=>r.id==='focused-warrior'));assert.equal(pack.talents.find(t=>t.id==='talent:focused-warrior').automation,'manual');for(const change of [p=>p.rules.triggeredDefenseBonuses[0].effect.amount=3,p=>p.rules.triggeredDefenseBonuses[4].duration='start-next-turn']){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
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
