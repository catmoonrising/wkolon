import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {setTriggeredDefense,clearEncounterTriggers,triggeredDefenseControls} from '../src/triggered-defenses.js';
import fixtures from '../tools/class-defense-fixtures.cjs';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const {adept}=fixtures(pack,{newCharacter,derive,validateCharacter});
function sentinel(talent='gradual-resistance'){
 const c=adept('force-perception');c.name='Gradual Resistance';c.levels[6].talent={id:'talent:'+talent};validateCharacter(c,pack);assert.deepEqual(derive(c,pack).issues,[]);return c;
}
const rows=c=>derive(c,pack).conditionalDefenses.filter(r=>r.against==='damaging-force-power').map(r=>[r.defense,r.total]);

test('Gradual Resistance is a reviewed encounter trigger and Partial',()=>{
 validatePack(pack);assert.equal(pack.talents.find(t=>t.id==='talent:gradual-resistance').automation,'partial');
 const r=pack.rules.triggeredDefenseBonuses.find(r=>r.id==='gradual-resistance');assert.equal(r.duration,'encounter');assert.equal(r.trigger,'damaged-by-force-power');
 assert.deepEqual(r.effects.map(e=>[e.defense,e.against,e.amount,e.type]),[['reflex','damaging-force-power',2,'force'],['fortitude','damaging-force-power',2,'force'],['will','damaging-force-power',2,'force']]);
 assert.equal(pack.sources.find(s=>s.id===r.sourceIds[0]).revision,26765);
 const p=structuredClone(pack);p.rules.triggeredDefenseBonuses.find(r=>r.id==='gradual-resistance').effects[0].amount=5;assert.throws(()=>validatePack(p));
});

test('after Force Power damage, every Defense gains +2 Force vs. that power until the encounter ends',()=>{
 const c=sentinel(),d=derive(c,pack),ctx=d.ctx;assert.deepEqual(rows(c),[]);
 assert.match(triggeredDefenseControls(c,pack,ctx),/Gradual Resistance/);assert.match(triggeredDefenseControls(c,pack,ctx),/Will \+2 vs\. the damaging Force Power until the end of the encounter/);
 setTriggeredDefense(c,pack,ctx,'gradual-resistance',true);validateCharacter(c,pack);
 assert.deepEqual(rows(c),[['reflex',d.defenses.reflex+2],['fortitude',d.defenses.fortitude+2],['will',d.defenses.will+2]]);assert.deepEqual(derive(c,pack).defenses,d.defenses,'unconditional Defenses unchanged');
 const back=JSON.parse(JSON.stringify(c));validateCharacter(back,pack);assert.deepEqual(rows(back),rows(c),'reload');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:equilibrium').effects.push({target:'defenses',amount:3,type:'force'});
 assert.equal(derive(c,p).conditionalDefenses.find(r=>r.against==='damaging-force-power'&&r.defense==='will').total,derive(c,p).defenses.will,'a larger Force bonus supersedes');
 clearEncounterTriggers(c);assert.deepEqual(rows(c),[]);
});

test('requires the talent',()=>{
 const c=sentinel('force-intuition'),ctx=derive(c,pack).ctx;assert.throws(()=>setTriggeredDefense(c,pack,ctx,'gradual-resistance',true),/unavailable/);
});
