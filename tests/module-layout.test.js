import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {MODULES,FEATURE_MODULES,moduleRelevant,moduleVisible} from '../src/sheet-modules.js';
import {migrateModuleLayout,validatedLayout} from '../src/module-layout.js';
import {featureEntries} from '../src/feature-views.js';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {spendDestinyPoint} from '../src/heroic-traits.js';
const rect={x:80,y:300,w:500,h:320,hc:50,z:9};
const legacy=(extra={})=>({free:false,activated:true,map:{features:{...rect},header:{x:8,y:8,w:400,h:160}},collapsed:{features:true},stacks:{},...extra});
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));

test('legacy Features and Character migrate to independent stacks with geometry and folded state intact',()=>{
 const old=legacy(),copy=structuredClone(old),d=migrateModuleLayout(old);assert.deepEqual(old,copy);assert.equal(d.moduleVersion,2);assert(!d.map.features);assert(!Object.hasOwn(d.collapsed,'features'));for(const id of FEATURE_MODULES){assert.deepEqual(d.map[id],rect);assert(d.collapsed[id]);}assert.deepEqual(d.stacks['split-features'],{members:FEATURE_MODULES,active:'species-features'});assert.deepEqual(d.stacks['split-header'].members,['header','languages','destiny','destiny-points','traditions']);assert.deepEqual(d.map.languages,old.map.header);assert.deepEqual(migrateModuleLayout(d),d);
});

test('splitting a member in an existing stack preserves its neighbors, order and active tab',()=>{
 const old=legacy({stacks:{custom:{members:['notes','features','hp'],active:'features'}}});const d=migrateModuleLayout(old);assert.deepEqual(d.stacks.custom.members,['notes',...FEATURE_MODULES,'hp']);assert.equal(d.stacks.custom.active,'species-features');old.stacks.custom.active='notes';assert.equal(migrateModuleLayout(old).stacks.custom.active,'notes');
});

test('existing separate positions and stacks win over a legacy combined placement',()=>{
 const old=legacy();old.map.talents={x:800,y:44,w:240,h:210};old.map.feats={x:0,y:0,w:250};old.collapsed.feats=false;old.visibility={features:false,feats:true};old.stacks.keep={members:['talents','notes'],active:'talents'};const d=migrateModuleLayout(old);assert.deepEqual(d.map.talents,old.map.talents);assert.deepEqual(d.map.feats,old.map.feats);assert.deepEqual(d.stacks.keep,old.stacks.keep);assert(!d.stacks['split-features'].members.includes('talents'));assert(!d.stacks['split-features'].members.includes('feats'));assert.equal(d.collapsed.feats,false);assert.equal(d.visibility.feats,true);assert.equal(d.visibility['species-features'],false);
});

test('fresh flow and collapse-only layouts remain flow without manufactured positions',()=>{
 const flow=migrateModuleLayout({map:{},collapsed:{dice:true}});assert.equal(flow.activated,false);assert.deepEqual(flow.map,{});assert.deepEqual(flow.stacks,{});const folded=migrateModuleLayout({map:{},collapsed:{features:true}});assert(FEATURE_MODULES.every(id=>folded.collapsed[id]));assert.deepEqual(folded.map,{});assert.deepEqual(folded.stacks,{});
});

test('header insertion preserves an existing group and a deliberately placed language module',()=>{
 const old=legacy({stacks:{group:{members:['hp','header','force'],active:'hp'}}});let d=migrateModuleLayout(old);assert.deepEqual(d.stacks.group.members,['hp','header','languages','destiny','destiny-points','traditions','force']);assert.equal(d.stacks.group.active,'hp');old.map.languages={x:500,y:100,w:270};d=migrateModuleLayout(old);assert.deepEqual(d.map.languages,old.map.languages);assert(!d.stacks.group.members.includes('languages'));
});

test('migrated stack IDs avoid collisions and members are never assigned twice',()=>{
 const old=legacy({stacks:{'split-features':{members:['notes','hp'],active:'notes'}}});const d=migrateModuleLayout(old);assert.deepEqual(d.stacks['split-features-1'].members,FEATURE_MODULES);assert.deepEqual(d.stacks['split-features'].members,['notes','hp']);assert.doesNotThrow(()=>validatedLayout(d));
});

test('invalid layout geometry, preferences, versions and duplicate stack memberships are rejected',()=>{
 for(const change of [d=>d.map.features.w=0,d=>d.map.features.x=Infinity,d=>d.visibility={feats:'yes'},d=>d.moduleVersion=3,d=>d.stacks={a:{members:['hp','hp'],active:'hp'}},d=>d.stacks={a:{members:['hp','notes'],active:'hp'},b:{members:['notes','force'],active:'force'}}]){const d=legacy();change(d);assert.throws(()=>migrateModuleLayout(d));}
 const d=migrateModuleLayout(legacy());d.visibility.feats=false;const checked=validatedLayout(d);d.map.feats.x=999;assert.equal(checked.map.feats.x,rect.x);assert.equal(checked.visibility.feats,false);
});

test('registry visibility supports relevant defaults and explicit overrides without changing character data',()=>{
 assert.equal(new Set(MODULES.map(d=>d.id)).size,MODULES.length);assert(!MODULES.some(d=>d.id==='features'));const c=newCharacter(pack,{classId:'class:soldier'}),d=derive(c,pack),before=structuredClone(c);assert(moduleRelevant('feats',c,d));assert(!moduleRelevant('force-techniques',c,d));assert(!moduleRelevant('destiny',c,d));assert.equal(moduleVisible('talents',{},false),false);assert.equal(moduleVisible('talents',{talents:true},false),true);assert.equal(moduleVisible('feats',{feats:false},true),false);assert.deepEqual(c,before);
});

test('feature views retain earned order, automatic sources and mechanical records',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'});c.levels[0].talent={id:'talent:melee-smash'};c.levels[0].feats=[{id:'feat:toughness'}];c.levels.push({classId:'class:soldier',hpRoll:4,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:soldier',hpRoll:4,feats:[],talent:{id:'talent:stunning-strike'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});const d=derive(c,pack),before=structuredClone(c),entries=featureEntries(c,d,pack);assert(entries.some(e=>e.module==='feats'&&e.s.automatic&&e.label==='Weapon Proficiency (Rifles)'));const talents=entries.filter(e=>e.module==='talents');assert.equal(talents[0].label,'Melee Smash');assert(talents.every((e,i)=>!i||e.s.level>=talents[i-1].s.level));assert.deepEqual(c,before);assert.equal(derive(c,pack).hp,d.hp);assert(entries.every(e=>pack.feats.includes(e.r)||pack.talents.includes(e.r)||pack.classes.includes(e.r)||pack.classChoices.includes(e.r)));
});

test('Destiny spending changes only its point counter and rejects empty, Background and pending characters',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'});c.story={kind:'destiny',id:'destiny:rescue',details:'Save the crew.',points:1};const before=structuredClone(c),d=derive(c,pack);assert(moduleRelevant('destiny',c,d));assert(moduleRelevant('destiny-points',c,d));assert.deepEqual(spendDestinyPoint(c,d),{before:1,after:0});before.story.points=0;assert.deepEqual(c,before);assert.throws(()=>spendDestinyPoint(c,d));assert.throws(()=>spendDestinyPoint({...c,story:{kind:'background'}},d));assert.throws(()=>spendDestinyPoint({...c,story:{...c.story,points:1}},{level:0}));validateCharacter(c,pack);
});
