import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as api from '../src/rules.js';import make from '../tools/mind-trick-fixtures.cjs';import {validatePack} from '../tools/validate-rules.js';
import {mentalPowerSelection,mentalPowerSnapshot,validateMentalPowerSnapshot,resolveMentalPower} from '../src/mental-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),snapshot=(selection={})=>mentalPowerSnapshot(api.derive(f.adept(),pack),pack,selection),resolve=(total,selection={},enhanced=false)=>resolveMentalPower(pack,{total},snapshot(selection),{enhanced});
test('Mind Trick pins24983 and complete legal Adept/Mastery access without a Dark Side descriptor',()=>{
 validatePack(pack);const power=pack.forcePowers.find(r=>r.id==='power:mind-trick');assert.equal(pack.sources.find(s=>s.id===power.sourceId).revision,24983);assert(power.descriptors.includes('mind-affecting'));assert(!power.descriptors.includes('dark-side'));for(const mastery of [false,true]){const c=f.adept({mastery}),d=api.derive(c,pack);assert.deepEqual(d.issues,[]);assert(d.forcePowers.find(p=>p.id===power.id).adept);assert.equal(!!d.forcePowers.find(p=>p.id===power.id).take10,mastery);}
});
test('known Will comparisons are inclusive and hidden Will stays conditional for every mode',()=>{
 for(const mode of ['hallucination','feint','suggestion','fear']){const extra=mode==='suggestion'?{communicates:true,safe:true}:{};assert.equal(resolve(19,{mode,will:20,...extra}).succeeded,false);assert.equal(resolve(20,{mode,will:20,...extra}).succeeded,true);const hidden=resolve(20,{mode,...extra});assert.equal(hidden.succeeded,null);assert.equal(hidden.rows[0].maximum,20);assert.equal(hidden.rows[1].minimum,21);assert.match(hidden.text,/Will ≤ 20/);}
});
test('Suggestion requires communication and safety; exact FP Attitude margins never invent allegiance',()=>{
 for(const [total,steps]of [[20,1],[24,1],[25,2],[29,2],[30,3],[40,5]]){const out=resolve(total,{mode:'suggestion',will:20,communicates:true,safe:true},true);assert.equal(out.attitudeSteps,steps);assert(!out.text.toLowerCase().includes('ally'));}
 for(const selection of [{mode:'suggestion'},{mode:'suggestion',communicates:true},{mode:'suggestion',safe:true}])assert.throws(()=>snapshot(selection),/communication/);
 assert.throws(()=>resolve(19,{mode:'suggestion',will:20,communicates:true,safe:true},true),/enhancement/);assert.throws(()=>resolve(30,{mode:'feint'},true),/enhancement/);const unknown=resolve(30,{mode:'suggestion',communicates:true,safe:true},true);assert.equal(unknown.attitudeSteps,null);assert.match(unknown.text,/On success/);
});
test('Fear uses Character Level, fails on equal/higher targets and preserves the wounded end condition',()=>{
 assert.equal(snapshot({mode:'fear'}).characterLevel,8);for(const level of [8,9,100])assert.equal(resolve(30,{mode:'fear',level,will:10}).succeeded,false);const out=resolve(30,{mode:'fear',level:7,will:10});assert.equal(out.succeeded,true);assert.equal(out.maximumTargetLevel,7);assert.equal(out.duration,'1-minute');assert.equal(out.endsWhenWounded,true);assert.match(out.text,/ending if wounded/);assert.match(resolve(30,{mode:'fear'}).text,/level below 8/);
});
test('snapshot normalization is independent and closed, with target Intelligence and canonical saved values guarded',()=>{
 const target={mode:'feint',will:10,intelligence:3},s=snapshot(target);target.will=99;assert.equal(s.selection.will,10);assert.doesNotThrow(()=>validateMentalPowerSnapshot(pack,s));
 for(const selection of [{intelligence:2},{intelligence:0},{mode:'unknown'},{mode:['feint']},{will:'10'},{level:-1},{safe:1},{hidden:true}])assert.throws(()=>mentalPowerSelection(pack,selection));
 for(const mutate of [s=>s.characterLevel=-1,s=>s.extra=true,s=>s.selection.mode=null,s=>s.selection.communicates=null,s=>delete s.selection.will]){const bad=structuredClone(s);mutate(bad);assert.throws(()=>validateMentalPowerSnapshot(pack,bad));}assert.throws(()=>resolve(1.5));
});
