import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,ABILITIES,eligible,indexPack,progression} from '../src/rules.js';
import {resolveEquipment,purchaseQuote,equipmentFamilies} from '../src/equipment.js';
import {articleText} from '../src/wiki-content.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=(species='human',cls='soldier')=>{const c=newCharacter(pack);c.species='species:'+species;c.levels[0].classId='class:'+cls;c.abilityMethod='manual';c.abilities=Object.fromEntries(ABILITIES.map(a=>[a,10]));return c;};
const item=(id,extra={})=>({id:'equipment:'+id,quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const toggle=(c,id,on)=>{c.houseRules??={};c.houseRules.jediCounseling??={};c.houseRules.jediCounseling[id]=on;};

test('species variants keep their own modifiers, languages, training benefits and exact article',()=>{
 const core=hero('neimoidian-core-rulebook','noble'),goi=hero('neimoidian-galaxy-of-intrigue','noble');
 core.trainedSkills=goi.trainedSkills=['skill:deception','skill:persuasion'];
 const a=derive(core,pack),b=derive(goi,pack);
 assert.deepEqual(a.scores,{str:8,dex:10,con:10,int:12,wis:12,cha:10});assert.equal(b.scores.cha,12);
 assert.equal(a.ctx.feats.filter(f=>f.id==='feat:skill-focus').length,1);assert.equal(b.ctx.feats.filter(f=>f.id==='feat:skill-focus').length,2);
 const ar=pack.species.find(s=>s.id===core.species),br=pack.species.find(s=>s.id===goi.species);
 assert(ar.languages.includes('Pak Pak'));assert(!br.languages.includes('Pak Pak'));
 assert(articleText(ar.article).includes('Deceptive:'));assert(!articleText(br.article).includes('Deceptive:'));
 assert(!articleText(ar.article).includes('Conditional Bonus Feats:'));
 assert.deepEqual(pack.species.find(s=>s.id==='species:ithorian').languages,['Basic','Ithorese']);
});

test('both Vong versions reject Force access; only Core penalizes mechanical tools and attacks',()=>{
 for(const variant of ['core-rulebook','legacy-era-campaign-guide']){
  const c=hero('yuuzhan-vong-'+variant);c.levels[0].feats=[{id:'feat:force-sensitivity'}];c.trainedSkills=['skill:use-the-force'];c.inventory=[item('blaster-pistol')];c.mechanicalSkills=['skill:mechanics'];
  let d=derive(c,pack);assert(!d.ctx.feats.some(f=>f.id==='feat:force-sensitivity'));assert(!d.skills.find(s=>s.id==='skill:use-the-force').available);assert.equal(d.forceMaximum,0);assert.equal(d.forceCurrent,0);
  assert.equal(d.skills.find(s=>s.id==='skill:mechanics').total,variant==='core-rulebook'?-5:0);
  assert.equal(d.attacks[0].attack,-4); // Core's -5 tools; Legacy's -5 nonproficiency.
  c.inventory[0].mechanical=false;d=derive(c,pack);assert.equal(d.attacks[0].attack,variant==='core-rulebook'?1:-4);
  c.levels[0].classId='class:jedi';d=derive(c,pack);assert.equal(d.bab,0);assert(d.issues.some(s=>s.includes('cannot be Jedi')));
  validateCharacter(c,pack);
 }
});

test('Comlink fees follow the user formula; grouped items retain concrete inventory names',()=>{
 const c=hero(),long={id:'equipment:comlink-long-range',options:['video']};
 assert.equal(resolveEquipment(long,pack,c).cost,750);
 long.options=['encryption','holo'];let r=resolveEquipment(long,pack,c);
 assert.equal(r.cost,4000);assert.equal(r.name,'Comlink (Long-Range, Encryption, Holo Capability)');
 c.inventory=[item('comlink-long-range',{options:['encryption','holo']})];assert(renderStatBlock(c,derive(c,pack),pack).includes(r.name));
 c.houseRules={comlinkUpgradeFees:false};assert.equal(resolveEquipment(long,pack,c).cost,12500);
 long.options=['miniaturized'];assert.equal(resolveEquipment(long,pack,c).cost,500);assert.equal(resolveEquipment(long,pack,c).weight,null);
 assert.equal(resolveEquipment({...long,weightOverride:.2},pack,c).weight,.2);
 const names=equipmentFamilies(pack,'gear').map(r=>r.name);assert.equal(names.filter(n=>n==='Comlink').length,1);assert.equal(names.filter(n=>n==='Utility Belt').length,1);
 assert.equal(resolveEquipment({id:'equipment:utility-belt-empty'},pack).name,'Utility Belt (Empty)');
});

test('license fees use normal fitted costs, are separate from market prices, and do not grant approval',()=>{
 const c=hero();let q=purchaseQuote({id:'equipment:blaster-pistol'},2,pack,c);assert.equal(q.total,1100);assert.equal(q.fee,50);assert.deepEqual(q.rating,{percent:10,blackMarket:3,dc:15,days:2});assert.equal(q.licenseStatus,'pending');
 assert.equal(purchaseQuote({id:'equipment:blaster-pistol'},1,pack,c,{license:false}).total,500);
 q=purchaseQuote({id:'equipment:blaster-pistol'},1,pack,c,{market:'black-market'});assert.equal(q.total,1500);assert.equal(q.fee,0);
 q=purchaseQuote({id:'equipment:stormtrooper-armor',armorSize:'small'},1,pack,c);assert.equal(q.item.weight,5);assert.equal(q.fee,800);assert.equal(q.total,4800);
 q=purchaseQuote({id:'equipment:stormtrooper-armor',armorSize:'large'},1,pack,c,{market:'offworld'});assert.equal(q.total,35200);assert.equal(q.item.weight,20);
 q=purchaseQuote({id:'equipment:combat-jumpsuit',armorSize:'small'},1,pack,c);assert.equal(q.total,787.5);c.credits=212.5;validateCharacter(c,pack);
 assert.equal(purchaseQuote({id:'equipment:vonduun-crabshell'},1,pack,c).total,null);
 c.inventory=[item('vonduun-crabshell')];assert.equal(derive(c,pack).defenses.fortitude,18);validateCharacter(c,pack);
});

test('Counseling defaults off; toggles change supported rules and leave RAW-equivalent clarifications unchanged',()=>{
 const c=hero('wookiee');c.levels[0].feats=[{id:'feat:weapon-focus',choice:'rifles'}];c.inventory=[item('bowcaster')];
 assert.equal(derive(c,pack).attacks[0].attack,0);toggle(c,'jc:112-weapon-familiarity-with-feats-and-talents',true);assert.equal(derive(c,pack).attacks[0].attack,1);toggle(c,'jc:112-weapon-familiarity-with-feats-and-talents',false);assert.equal(derive(c,pack).attacks[0].attack,0);
 const j=hero('human','jedi');j.levels[0].classId='class:scout';j.levels.push({classId:'class:jedi',hpRoll:6,startingFeat:{id:'feat:weapon-proficiency-lightsabers'},talent:{id:'talent:block'},feats:[],abilityIncreases:[],trainedSkills:[]});
 assert(derive(j,pack).ctx.talents.some(t=>t.id==='talent:block'));toggle(j,'jc:106-jedi-multiclassing',true);assert(!derive(j,pack).ctx.talents.some(t=>t.id==='talent:block'));assert(derive(j,pack).issues.some(s=>s.includes('Block is not eligible')));
 const d=derive(c,pack);toggle(c,'jc:114-conditions-and-damage-threshold',true);assert.equal(derive(c,pack).threshold,d.threshold);
 assert.equal(pack.jediCounseling.length,57);for(const topic of pack.jediCounseling)assert(articleText(pack.rulePages.find(r=>r.id===topic.ruleId).article).length>40);
 validateCharacter(c,pack);toggle(c,'jc:999-invented',true);assert.throws(()=>validateCharacter(c,pack),/Jedi Counseling/);
});

test('partial proficiency Counseling never replaces an explicit feat prerequisite',()=>{
 const c=hero('gungan','scout'),ix=indexPack(pack),ctx=progression(c,pack).ctx;
 const w=ix.equipment.get('equipment:electropole');
 const focus=ix.feats.get('feat:weapon-focus');assert(!eligible(focus,{id:focus.id,choice:w.group},ctx,ix,'feats'));
 toggle(ctx,'jc:112-weapon-focus-proficiency',true);assert(eligible(focus,{id:focus.id,choice:w.group},ctx,ix,'feats'));
 assert(!ctx.feats.some(f=>f.id==='feat:weapon-proficiency-advanced-melee-weapons'));
 toggle(ctx,'jc:112-weapon-familiarity-with-feats-and-talents',true);
 assert(!eligible(focus,{id:focus.id,choice:w.group},ctx,ix,'feats'));
 assert(eligible(focus,{id:focus.id,choice:'simple-weapons'},ctx,ix,'feats'));
});

test('invalid inventory variants and House Rules cannot enter persistence',()=>{
 const c=hero();c.inventory=[item('comlink-short-range',{options:['miniaturized']})];assert.throws(()=>validateCharacter(c,pack),/equipment options/);
 c.inventory=[item('comlink-long-range',{options:['video','video']})];assert.throws(()=>validateCharacter(c,pack),/equipment options/);
 c.inventory=[];c.houseRules={comlinkUpgradeFees:'true'};assert.throws(()=>validateCharacter(c,pack),/Comlink pricing/);
});
