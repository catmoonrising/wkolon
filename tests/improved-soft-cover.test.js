import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {setTriggeredDefense,clearTriggeredDefenses,triggeredDefenseControls} from '../src/triggered-defenses.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
import fixtures from '../tools/charlatan-fixtures.cjs';
const {charlatan}=fixtures(pack,{newCharacter,derive,validateCharacter});

test('Improved Soft Cover is a reviewed start-of-next-turn cover trigger and Partial',()=>{
 validatePack(pack);assert.equal(pack.talents.find(t=>t.id==='talent:improved-soft-cover').automation,'partial');
 assert.deepEqual(pack.rules.triggeredDefenseBonuses.find(r=>r.id==='improved-soft-cover'),{id:'improved-soft-cover',recordId:'talent:improved-soft-cover',trigger:'swift-adjacent-creature',effect:{target:'defenseBonus',defense:'reflex',amount:2,type:'cover'},duration:'start-next-turn',action:'swift',sourceIds:['source:wiki-trickery-talent-tree-improved-soft-cover']});
 assert.equal(pack.sources.find(s=>s.id==='source:wiki-trickery-talent-tree-improved-soft-cover').revision,19801);
 const p=structuredClone(pack);p.rules.triggeredDefenseBonuses.find(r=>r.id==='improved-soft-cover').effect.type='dodge';assert.throws(()=>validatePack(p));
});

test('the declared Swift Action adds +2 cover to Reflex until New Turn',()=>{
 const c=charlatan(),d=derive(c,pack),ctx=d.ctx;assert(ctx.talents.some(t=>t.id==='talent:improved-soft-cover'));
 assert.match(triggeredDefenseControls(c,pack,ctx),/Improved Soft Cover/);assert.match(triggeredDefenseControls(c,pack,ctx),/Reflex \+2 until your next turn/);
 setTriggeredDefense(c,pack,ctx,'improved-soft-cover',true);validateCharacter(c,pack);
 assert.deepEqual(derive(c,pack).defenses,{...d.defenses,reflex:d.defenses.reflex+2});
 const back=JSON.parse(JSON.stringify(c));validateCharacter(back,pack);assert.equal(derive(back,pack).defenses.reflex,d.defenses.reflex+2,'reload');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:innocuous').effects.push({target:'defenseBonus',defense:'reflex',amount:3,type:'cover'});
 assert.equal(derive(c,p).defenses.reflex,derive({...c,triggeredDefenses:undefined},p).defenses.reflex,'cover bonuses do not stack');
 clearTriggeredDefenses(c);assert.equal(derive(c,pack).defenses.reflex,d.defenses.reflex,'ends at the start of your next turn');
});

test('requires the talent',()=>{
 const c=charlatan(false),ctx=derive(c,pack).ctx;assert.throws(()=>setTriggeredDefense(c,pack,ctx,'improved-soft-cover',true),/unavailable/);
});
