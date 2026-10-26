import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {setTriggeredDefense,startTriggerTurn,endTriggerTurn,triggeredDefenseControls} from '../src/triggered-defenses.js';
import fixtures from '../tools/class-defense-fixtures.cjs';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const {adept}=fixtures(pack,{newCharacter,derive,validateCharacter});
const item=(id,rest={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...rest});
function guardian(talent='defensive-acuity'){
 const c=adept('force-perception');c.name='Defensive Acuity';c.levels[6].talent={id:'talent:'+talent};c.inventory=[item('lightsaber'),item('knife'),item('blaster-pistol')];
 validateCharacter(c,pack);assert.deepEqual(derive(c,pack).issues,[]);return c;
}
const damage=(c,i)=>derive(c,pack).attacks.find(a=>a.uid===c.inventory[i].uid).damage;

test('Defensive Acuity is a reviewed end-of-next-turn trigger and Partial',()=>{
 validatePack(pack);assert.equal(pack.talents.find(t=>t.id==='talent:defensive-acuity').automation,'partial');
 assert.deepEqual(pack.rules.triggeredDefenseBonuses.find(r=>r.id==='defensive-acuity'),{id:'defensive-acuity',recordId:'talent:defensive-acuity',trigger:'fight-defensively',effects:[{target:'groupDice',weaponGroup:'lightsabers',mode:'melee',dice:1},{target:'deflectionCheckBonus',amount:2,type:'circumstance',circumstance:'defensive-acuity'}],duration:'end-next-turn',sourceIds:['source:wiki-jedi-guardian-talent-tree-defensive-acuity','source:wiki-fight-defensively']});
 assert.equal(pack.sources.find(s=>s.id==='source:wiki-jedi-guardian-talent-tree-defensive-acuity').revision,26764);
 const p=structuredClone(pack);p.rules.triggeredDefenseBonuses.find(r=>r.id==='defensive-acuity').effects[0].dice=2;assert.throws(()=>validatePack(p));
});

test('after Fight Defensively, melee Lightsaber attacks gain one die until the end of the next turn',()=>{
 const c=guardian(),before=[0,1,2].map(i=>damage(c,i));assert.match(before[0],/^2d8/);
 const ctx=derive(c,pack).ctx;assert.match(triggeredDefenseControls(c,pack,ctx),/Defensive Acuity/);assert.match(triggeredDefenseControls(c,pack,ctx),/Damage \+1 die, Block\/Deflect \+2 until the end of your next turn/);
 setTriggeredDefense(c,pack,ctx,'defensive-acuity',true);validateCharacter(c,pack);
 assert.equal(damage(c,0),before[0].replace('2d8','3d8'));assert.equal(damage(c,1),before[1],'Lightsabers only');assert.equal(damage(c,2),before[2],'melee rows only');
 const back=JSON.parse(JSON.stringify(c));validateCharacter(back,pack);assert.equal(damage(back,0),damage(c,0),'reload');
 endTriggerTurn(c);assert.equal(damage(c,0),before[0].replace('2d8','3d8'),'set outside your turn: lasts through your next turn');startTriggerTurn(c);assert.equal(damage(c,0),before[0].replace('2d8','3d8'));endTriggerTurn(c);assert.equal(c.turnEndTriggers,undefined);assert.equal(damage(c,0),before[0],'expires at the end of your next turn');
});

test('requires the talent',()=>{
 const c=guardian('force-intuition'),ctx=derive(c,pack).ctx;assert.throws(()=>setTriggeredDefense(c,pack,ctx,'defensive-acuity',true),/unavailable/);
 c.turnEndTriggers=[{id:'defensive-acuity',endsRemaining:1,ended:true}];validateCharacter(c,pack);assert.match(damage(c,0),/^2d8/);
});
