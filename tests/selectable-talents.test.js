import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack,eligible,prerequisite} from '../src/rules.js';
import {featureChoices,talentTreeIds} from '../src/feature-choices.js';
import {featureGraph,createFeatureTrees} from '../src/feature-trees.js';
import {classRequirement} from '../src/class-advancement.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const t=(id,rest={})=>({id:'talent:'+id,...rest});
function hero(cls='soldier'){const c=newCharacter(pack,{classId:'class:'+cls});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};return c;}

test('supplemental talents preserve explicit review status, typed prerequisites and exact source articles',()=>{
 assert.equal(pack.talents.length,1191);const additions=pack.talents.slice(194);assert.equal(additions.length,997);
 const reviewed=new Set(['talent:noble-fencing-style','talent:idealist','talent:watchful-step','talent:engineer-lineage','talent:dark-deception','talent:commanding-presence','talent:stolen-form','talent:many-shades-of-the-force','talent:steady-under-pressure','talent:difficult-to-sense','talent:body-control','talent:soft-to-solid','talent:wan-shen-defense','talent:force-of-will','talent:environmentally-shielded','talent:jedi-hunter']);
 for(const r of additions){assert.equal(r.automation,reviewed.has(r.id)?'partial':'manual',r.name);if(!reviewed.has(r.id))assert.deepEqual(r.effects,[]);assert(r.article?.blocks.length);const source=pack.sources.find(s=>s.id===r.sourceId);assert.equal(source.section,r.name);assert(source.sha256&&source.revision);assert(pack.catalog.records.some(c=>c.kind==='talent'&&c.status==='available'&&c.mechanicsIds.includes(r.id)));}
 const r=ix.talents.get('talent:armored-augmentation-ii'),ctx=derive(hero(),pack).ctx,s={id:r.id,manualRequirements:true};
 assert(!eligible(r,s,ctx,ix,'talents'));ctx.talents.push(t('armored-augmentation-i'));assert(eligible(r,s,ctx,ix,'talents'));assert(!eligible(r,{id:r.id},ctx,ix,'talents'));
 const alt=ix.talents.get('talent:spynet-agent');assert(eligible(alt,{id:alt.id,manualRequirements:true},ctx,ix,'talents')); // unknown OR does not become a Bothan-only requirement
});

test('class access includes all published heroic trees without opening other class trees',()=>{
 const counts={jedi:4,noble:16,scoundrel:14,scout:14,soldier:13};
 for(const [name,count]of Object.entries(counts))assert.equal(ix.classes.get('class:'+name).talentTrees.length,count);
 const c=hero('noble'),ctx=derive(c,pack).ctx,allowedTrees=ix.classes.get('class:noble').talentTrees;
 const allowedIds=pack.talents.filter(r=>talentTreeIds(r).some(id=>allowedTrees.includes(id))).map(r=>r.id);
 const graph=featureGraph(pack,{type:'talents',ctx,allowedIds,allowedTrees});
 assert(graph.nodes.has('talent:assured-skill|'));assert(!graph.nodes.has('talent:armored-defense|'));
 assert(graph.groups.includes('tree:superior-skills'));assert(!graph.groups.includes('tree:armor-specialist'));
 assert(createFeatureTrees(pack).render({key:'source-tree-names',type:'talents',ctx,allowedIds,allowedTrees}).includes('Superior Skills'));
});

test('Light Side talents save DSS zero, survive later corruption as inactive and reactivate at zero',()=>{
 const c=hero('jedi');c.levels[0].talent=t('surge-of-light',{darkSideScore:0});validateCharacter(c,pack);
 let d=derive(c,pack);assert(d.ctx.talents.some(s=>s.id==='talent:surge-of-light'));assert(!d.ctx.inactiveTalents.size);
 c.darkSideScore=1;d=derive(c,pack);assert(d.ctx.talents.some(s=>s.id==='talent:surge-of-light'));assert(d.ctx.inactiveTalents.has('talent:surge-of-light'));
 assert(!prerequisite({kind:'talent',value:'talent:surge-of-light'},d.ctx,ix));assert(!eligible(ix.talents.get('talent:surge-of-light'),t('surge-of-light'),d.ctx,ix,'talents'));
 c.darkSideScore=0;d=derive(JSON.parse(JSON.stringify(c)),pack);assert(!d.ctx.inactiveTalents.size);assert(prerequisite({kind:'talent',value:'talent:surge-of-light'},d.ctx,ix));
 delete c.levels[0].talent.darkSideScore;assert.throws(()=>validateCharacter(c,pack),/acquisition DSS/);
 c.levels[0].talent.darkSideScore=1;assert.throws(()=>validateCharacter(c,pack),/acquisition DSS/);
 const bad=structuredClone(pack);bad.talents.find(r=>r.id==='talent:surge-of-light').prerequisite.requirements[0].max=-1;assert.throws(()=>validatePack(bad),/Dark Side/);
});

test('reviewed reprints share progression and repeat limits while retaining both source articles and tabs',()=>{
 const r=ix.talents.get('talent:multiattack-proficiency-rifles');assert.deepEqual(talentTreeIds(r),['tree:weapon-master','tree:carbineer']);
 const sourceRecords=pack.catalog.records.filter(c=>c.kind==='talent'&&c.mechanicsIds.includes(r.id));assert.equal(sourceRecords.length,2);assert.equal(new Set(sourceRecords.map(c=>c.sourceId)).size,2);
 const c=hero();c.levels=Array.from({length:8},(_,i)=>({classId:i===7?'class:gunslinger':'class:soldier',hpRoll:i?6:null,feats:i===0?[{id:'feat:point-blank-shot'},{id:'feat:precise-shot'}]:i===2?[{id:'feat:quick-draw'}]:[],talent:i===7?{id:r.id}:null,startingFeat:null,abilityIncreases:[3,7].includes(i)?['str','dex']:[],trainedSkills:[]}));
 const d=derive(c,pack);assert(d.ctx.talents.some(s=>s.id===r.id));assert(!d.issues.some(s=>s.includes('Multiattack Proficiency')));
 assert(classRequirement({kind:'talentTrees',values:['tree:carbineer','tree:weapon-master'],min:1},d.ctx,ix,{}));assert(!classRequirement({kind:'talentTrees',values:['tree:carbineer','tree:weapon-master'],min:2},d.ctx,ix,{}));
 const graph=featureGraph(pack,{type:'talents',ctx:d.ctx,allowedIds:[r.id],allowedTrees:['tree:carbineer']});assert.deepEqual(graph.groups,['tree:carbineer']);assert.equal([...graph.nodes.values()].filter(n=>n.main).length,1);
 const bad=structuredClone(pack);bad.talents.find(t=>t.id===r.id).additionalTrees=['tree:weapon-master'];assert.throws(()=>validatePack(bad),/additional talent trees/);
});

test('secondary choices retain printed restrictions and repeat-by-choice or fixed repeat caps',()=>{
 const ctx=derive(hero('noble'),pack).ctx,assured=ix.talents.get('talent:assured-skill');
 assert(!eligible(assured,{id:assured.id},ctx,ix,'talents'));assert(eligible(assured,{id:assured.id,choice:'skill:acrobatics'},ctx,ix,'talents'));
 ctx.talents.push({id:assured.id,choice:'skill:acrobatics'});assert(!eligible(assured,{id:assured.id,choice:'skill:acrobatics'},ctx,ix,'talents'));assert(eligible(assured,{id:assured.id,choice:'skill:perception'},ctx,ix,'talents'));
 const accurate=ix.talents.get('talent:accurate-blow');assert(featureChoices(accurate,pack).includes('lightsabers'));assert(!featureChoices(accurate,pack).includes('pistols'));assert(!featureChoices(accurate,pack).includes('equipment:bowcaster'));
 const vehicle=ix.talents.get('talent:vehicle-focus');assert.deepEqual(featureChoices(vehicle,pack),['airspeeders','capital-ships','space-transports','speeders','starfighters','walkers']);
 for(const[id,max]of [['close-contact',2],['inspire-loyalty',3],['commanding-officer',3],['sentinel-strike',5]]){const r=ix.talents.get('talent:'+id);ctx.talents=Array.from({length:max-1},()=>({id:r.id}));assert(eligible(r,{id:r.id},ctx,ix,'talents'),id);ctx.talents.push({id:r.id});assert(!eligible(r,{id:r.id},ctx,ix,'talents'),id);}
});

test('tree-wide rules and book attribution remain in the isolated talent articles',()=>{
 for(const[id,passage]of [['born-leader',"can't use any of these Talents on yourself"],['blind-shot','may only be used with Pistols or Rifles'],['armored-augmentation-i','Legacy Era Campaign Guide'],['engineer-lineage','Starships of the Galaxy']]){
  const record=ix.talents.get('talent:'+id);assert(record,id);assert(articleText(record.article).includes(passage),id);
 }
 const ctx=derive(hero('jedi'),pack).ctx,r=ix.talents.get('talent:adversary-lore');ctx.feats=[];assert(!eligible(r,{id:r.id},ctx,ix,'talents'));ctx.houseRules={jediCounseling:{'jc:106-jedi-multiclassing':false}};assert(eligible(r,{id:r.id},ctx,ix,'talents'));
});
