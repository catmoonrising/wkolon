import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack} from '../src/rules.js';
import {usePower,recoverSuite,take10Power,useAdeptPower} from '../src/force-powers.js';
import {setPowerAction,powerActivationIssue} from '../src/power-activation.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const copy=id=>({id:crypto.randomUUID(),powerId:'power:'+id,spent:false}),f=id=>({id:'feat:'+id});
function hero(){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:12,wis:18,cha:16};c.levels[0].classId='class:jedi';c.levels[0].feats=[f('force-training')];c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:force-focus'};c.levels[0].forcePowers=[copy('assured-strike'),copy('enlighten'),copy('corruption')];c.inventory=[{id:'equipment:lightsaber',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];return c;}
test('all 88 official Force-power pages have mapped choices and all 90 entries retain reviewed full articles',()=>{
 validatePack(pack);assert.equal(pack.forcePowers.length,90);const titles=new Set(pack.forcePowers.map(p=>pack.sources.find(s=>s.id===p.sourceId).title));const index=JSON.parse(fs.readFileSync(new URL('../data/reference-index.json',import.meta.url)));for(const r of index.records.filter(r=>r.kind==='forcePower'))assert(titles.has(r.name),r.name);for(const p of pack.forcePowers)assert(p.article.blocks.length&&pack.catalog.records.some(r=>r.mechanicsIds.includes(p.id)&&r.status==='available'));
 assert.equal(pack.forcePowers.filter(p=>p.descriptors.includes('lightsaber-form')).length,24);
});
test('power versions and mixed-kind pages keep their own source sections',()=>{
 const text=id=>articleText(ix.forcePowers.get('power:'+id).article);assert(text('dark-transfer-legacy-era-campaign-guide').includes('One other living creature'));assert(text('dark-transfer-web-enhancements').includes('One creature touched'));assert(!text('dark-transfer-web-enhancements').includes('One other living creature'));
 assert(text('force-storm-force-unleashed-campaign-guide').includes('vortex'));assert(!text('force-storm-force-unleashed-campaign-guide').includes('acid rain'));assert(text('force-storm-jedi-academy-training-manual').includes('acid rain'));assert(!text('intercept').includes('Dogfight'));assert(text('intercept').includes('incoming projectile'));assert(!text('corruption').includes('Destiny Bonus'));
});
test('new descriptors are explicit and changing action does not alter them',()=>{
 assert.deepEqual(ix.forcePowers.get('power:assured-strike').descriptors,['lightsaber-form']);assert(ix.forcePowers.get('power:enlighten').descriptors.includes('light-side'));assert(ix.forcePowers.get('power:corruption').descriptors.includes('dark-side'));assert(ix.forcePowers.get('power:force-storm-force-unleashed-campaign-guide').descriptors.includes('telekinetic'));assert(!ix.forcePowers.get('power:force-storm-jedi-academy-training-manual').descriptors.includes('telekinetic'));
});
test('form activation requires a carried, equipped and activated Lightsaber, including Take10/Adept guards',()=>{
 const c=hero(),id=c.levels[0].forcePowers[0].id;let d=derive(c,pack);assert.equal(powerActivationIssue(c,d,pack,d.forcePowers[0]),'');c.inventory[0].activated=false;d=derive(c,pack);assert.match(powerActivationIssue(c,d,pack,d.forcePowers[0]),/activated/);const before=structuredClone(c);assert.throws(()=>usePower(c,d,pack,id,20),/activated/);assert.deepEqual(c,before);assert(!d.attacks.find(a=>a.uid===c.inventory[0].uid).available);
 for(const mutate of [x=>x.inventory[0].equipped=false,x=>x.inventory[0].carried=false,x=>x.inventory=[]]){const bad=hero();mutate(bad);assert.throws(()=>usePower(bad,derive(bad,pack),pack,bad.levels[0].forcePowers[0].id,12),/activated/);}
 c.inventory[0].activated=true;d=derive(c,pack);const enhanced={...d,forcePowers:d.forcePowers.map(p=>({...p,take10:true,adept:true}))};take10Power(c,enhanced,pack,id);assert(c.levels[0].forcePowers[0].spent);recoverSuite(c,derive(c,pack));useAdeptPower(c,{...derive(c,pack),forcePowers:enhanced.forcePowers},pack,id,[10,12]);assert.equal(c.forcePoints,4);
});
test('alternative activation actions are saved per copy and reject invalid choices before mutations',()=>{
 const c=hero(),p=c.levels[0].forcePowers[1];assert.deepEqual(ix.forcePowers.get(p.powerId).actions,['reaction','swift-action']);setPowerAction(c,pack,p.id,'swift-action');validateCharacter(c,pack);assert.equal(derive(JSON.parse(JSON.stringify(c)),pack).forcePowers.find(r=>r.copyId===p.id).action,'swift-action');const before=structuredClone(c);assert.throws(()=>setPowerAction(c,pack,p.id,'standard-action'),/unavailable/);assert.deepEqual(c,before);p.action='invented';assert.throws(()=>validateCharacter(c,pack),/power action/);assert.throws(()=>usePower(c,derive(c,pack),pack,p.id,12),/action unavailable/);
});
test('supplemental powers spend only their copy and retain natural-20 suite recovery and DSS behavior',()=>{
 const c=hero(),p=c.levels[0].forcePowers[2];usePower(c,derive(c,pack),pack,p.id,20);assert(p.spent);assert.equal(c.darkSideScore,1);assert(c.forcePowerRecoveryPending);assert(!c.levels[0].forcePowers[0].spent);assert.throws(()=>usePower(c,derive(c,pack),pack,p.id,12),/unavailable/);recoverSuite(c,derive(c,pack),{endTurn:true});assert(!p.spent);assert(!c.forcePowerRecoveryPending);
});
test('inactive Lightsabers lose wielded defenses without disabling an active second blade',()=>{
 const c=hero();c.levels[0].feats.push({id:'feat:weapon-focus',choice:'lightsabers'});for(let i=1;i<9;i++)c.levels.push({classId:'class:jedi',hpRoll:4,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});c.levels[7].classId='class:jedi-knight';c.levels[2].talent={id:'talent:weapon-specialization-lightsabers'};c.levels[7].entryDeclarations=Object.fromEntries(ix.classes.get('class:jedi-knight').entrySpecials.map(r=>[r.id,true]));c.levels[7].talent={id:'talent:niman'};const d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:niman'));c.inventory[0].activated=false;const off=derive(c,pack);assert.equal(off.defenses.reflex,d.defenses.reflex-1);assert.equal(off.defenses.will,d.defenses.will-1);c.inventory.push({...c.inventory[0],uid:crypto.randomUUID(),activated:true});assert.equal(derive(c,pack).defenses.will,d.defenses.will);
});
test('new activation state validates without affecting legacy suite copies or non-Lightsaber equipment',()=>{
 const c=hero();validateCharacter(c,pack);c.inventory[0].activated=false;validateCharacter(c,pack);c.inventory[0].activated='yes';assert.throws(()=>validateCharacter(c,pack),/activation/);c.inventory[0].activated=false;c.inventory[0].id='equipment:knife';assert.throws(()=>validateCharacter(c,pack),/activation/);const old=hero();old.levels[0].forcePowers[0]=copy('surge');validateCharacter(old,pack);usePower(old,derive(old,pack),pack,old.levels[0].forcePowers[0].id,10);
});
