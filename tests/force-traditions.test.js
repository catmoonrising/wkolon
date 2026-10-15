import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack,talentTrees,eligible} from '../src/rules.js';
import {featureChoices} from '../src/feature-choices.js';
import {featureGraph} from '../src/feature-trees.js';
import {usePower} from '../src/force-powers.js';
import {classRequirement} from '../src/class-advancement.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack),access=pack.rules.traditionTalentAccess;
const membership=(id,level=1,darkSideScore=0)=>({id:'tradition:'+id,level,darkSideScore});
const talent=id=>({id:'talent:'+id});
function hero(cls='jedi'){const c=newCharacter(pack,{classId:'class:'+cls});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];return c;}
function level(c,extra={}){c.levels.push({classId:c.levels[0].classId,hpRoll:4,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});}
function shaded(){const c=hero();c.forceTraditions=[membership('aing-tii-monk')];c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=['force-lightning','surge','enlighten'].map(name=>({id:crypto.randomUUID(),powerId:'power:'+name,spent:false}));c.levels[0].talent={id:'talent:many-shades-of-the-force',choice:'power:force-lightning'};return c;}

test('all 26 tradition trees have 122 talents, exact sections, membership sources and typed access guards',()=>{
 assert.equal(access.length,26);const trees=new Set(access.map(r=>r.tree)),records=pack.talents.filter(t=>trees.has(t.tree));assert.equal(records.length,122);
 for(const r of access){const page=pack.rulePages.find(p=>p.id===r.ruleId);assert.equal(page.sourceId,r.sourceId);assert(articleText(page.article).includes(r.name.replace(/^The /,'')),r.name);for(const t of records.filter(t=>t.tree===r.tree)){assert.equal(t.automation,t.id==='talent:many-shades-of-the-force'?'partial':'manual');if(t.id!=='talent:many-shades-of-the-force')assert.deepEqual(t.effects,[]);assert(t.prerequisite.requirements.some(p=>p.kind==='tradition'&&p.value===r.id));assert(articleText(t.article).includes('Only Force-users that are part of'),t.name);assert.equal(pack.sources.find(s=>s.id===t.sourceId).section,t.name);}}
 validatePack(pack);
});

test('memberships permit multiple traditions and open their trees for any Force-sensitive class without adding slots',()=>{
 const c=hero('soldier');c.trainedSkills=[];c.levels[0].feats=[{id:'feat:force-sensitivity'}];c.forceTraditions=[membership('dathomiri-witch'),membership('jensaarai-defender')];c.levels[0].talent=talent('adept-spellcaster');const d=derive(c,pack),trees=talentTrees(ix.classes.get('class:soldier'),d.ctx,pack);assert(trees.includes('tree:dathomiri-witch'));assert(trees.includes('tree:jensaarai-defender'));assert(!trees.includes('tree:krath'));assert(d.ctx.talents.some(s=>s.id==='talent:adept-spellcaster'));assert.equal(d.ctx.talents.length,1);assert.equal(c.levels[0].feats.length,1);
 c.levels[0].feats=[];const noForce=derive(c,pack);assert(!talentTrees(ix.classes.get('class:soldier'),noForce.ctx,pack).includes('tree:dathomiri-witch'));assert(!noForce.ctx.talents.some(s=>s.id==='talent:adept-spellcaster'));validateCharacter(c,pack);
});

test('joining later cannot authorize earlier talents and snapshots do not acquire future memberships',()=>{
 const c=hero();c.forceTraditions=[membership('dathomiri-witch',3)];c.levels[0].talent=talent('adept-spellcaster');level(c);level(c,{talent:talent('adept-spellcaster')});let d=derive(c,pack);assert(!d.rows[0].ctx.forceTraditions.has('tradition:dathomiri-witch'));assert(d.rows[2].ctx.forceTraditions.has('tradition:dathomiri-witch'));assert.equal(d.ctx.talents.find(s=>s.id==='talent:adept-spellcaster').level,3);
 c.forceTraditions[0].level=1;d=derive(c,pack);assert.equal(d.ctx.talents.find(s=>s.id==='talent:adept-spellcaster').level,1);c.forceTraditions=[];assert(!derive(c,pack).ctx.talents.some(s=>s.id==='talent:adept-spellcaster'));
});

test('strict membership species and training requirements prevent unrelated characters from unlocking trees',()=>{
 const c=hero();c.forceTraditions=[membership('baran-do-sage'),membership('felucian-shaman')];let d=derive(c,pack);assert.equal(d.ctx.forceTraditions.size,0);assert(d.issues.some(s=>s.includes('membership requirements')));
 c.species='species:kel-dor';d=derive(c,pack);assert(d.ctx.forceTraditions.has('tradition:baran-do-sage'));assert(!d.ctx.forceTraditions.has('tradition:felucian-shaman'));
 c.species='species:felucian';d=derive(c,pack);assert(d.ctx.forceTraditions.has('tradition:felucian-shaman'));c.trainedSkills=[];assert(!derive(c,pack).ctx.forceTraditions.has('tradition:felucian-shaman'));
});

test('overview shorthand does not bar explicit outsider membership exceptions',()=>{
 const c=hero();c.forceTraditions=['aing-tii-monk','ember-of-vahl','tyia-adept','shaper-of-kro-var','disciple-of-twilight','korunnai-adept'].map(id=>membership(id));const d=derive(c,pack);for(const m of c.forceTraditions)assert(d.ctx.forceTraditions.has(m.id),m.id);assert.equal(d.ctx.forceTraditions.size,6);
});

test('membership DSS is checked at joining and does not change the character score',()=>{
 const c=hero();c.forceTraditions=[membership('bando-gora-captain',1,0),membership('believer-disciple',1,2)];let d=derive(c,pack);assert(!d.ctx.forceTraditions.has('tradition:bando-gora-captain'));assert(d.ctx.forceTraditions.has('tradition:believer-disciple'));assert.equal(c.darkSideScore,0);c.forceTraditions[0].darkSideScore=1;d=derive(c,pack);assert(d.ctx.forceTraditions.has('tradition:bando-gora-captain'));
});

test('Many Shades requires a known Light or Dark power and removes the descriptor from all suite copies',()=>{
 const c=shaded(),r=ix.talents.get('talent:many-shades-of-the-force');let d=derive(c,pack);assert(d.ctx.talents.some(s=>s.id===r.id));assert(featureChoices(r,pack).includes('power:force-lightning'));assert(!featureChoices(r,pack).includes('power:surge'));assert(ix.forcePowers.get('power:force-lightning').descriptors.includes('dark-side'));
 for(const choice of ['power:surge','power:dark-rage']){c.levels[0].talent.choice=choice;assert(!derive(c,pack).ctx.talents.some(s=>s.id===r.id));}c.levels[0].talent.choice='power:enlighten';assert(derive(c,pack).ctx.talents.some(s=>s.id===r.id));c.forceTraditions=[];d=derive(c,pack);assert(!d.ctx.talents.some(s=>s.id===r.id));validateCharacter(c,pack);
});

test('tradition prerequisites are small readable graph nodes with the membership article',()=>{
 const c=shaded(),ctx=derive(c,pack).ctx,r=ix.talents.get('talent:many-shades-of-the-force');ctx.talents=[];const graph=featureGraph(pack,{type:'talents',ctx,allowedIds:[r.id],allowedTrees:[r.tree]});const node=[...graph.nodes.values()].find(n=>!n.main&&n.name==='The Aing-Tii Monks');assert(node?.owned);assert(node.records[0].article);assert(graph.nodes.get(r.id+'|').available);
 assert(classRequirement({kind:'forceTalents',min:1},derive(c,pack).ctx,ix,{}));
});

test('membership files and power-choice metadata reject duplicate, unknown and malformed entries',()=>{
 const c=hero();for(const entries of [[membership('missing')],[membership('tyia-adept'),membership('tyia-adept')],[membership('tyia-adept',0)],[membership('tyia-adept',1,-1)],[{...membership('tyia-adept'),automatic:true}],null]){c.forceTraditions=entries;assert.throws(()=>validateCharacter(c,pack),/memberships/);}delete c.forceTraditions;validateCharacter(c,pack);
 const broken=structuredClone(pack);broken.rules.traditionTalentAccess[0].ruleId='rule:missing';assert.throws(()=>validatePack(broken));const bad=structuredClone(pack);bad.talents.find(t=>t.id==='talent:many-shades-of-the-force').choicePowerDescriptors=['telekinetic'];assert.throws(()=>validatePack(bad));
});


test('Many Shades changes actual activation DSS, all matching copies and Light powers without mutating rules or hiding other descriptors',()=>{
 const c=shaded();c.levels[0].forcePowers[1].powerId='power:force-lightning';const before=structuredClone(ix.forcePowers.get('power:force-lightning'));let d=derive(c,pack);const copies=d.forcePowers.filter(p=>p.id==='power:force-lightning');assert.equal(copies.length,2);assert(copies.every(p=>!p.descriptors.includes('dark-side')));assert.deepEqual(copies[0].removedDescriptors,['dark-side']);assert(d.forcePowers.find(p=>p.id==='power:enlighten').descriptors.includes('light-side'));usePower(c,d,pack,copies[0].copyId,12);assert.equal(c.darkSideScore,0);assert(c.levels[0].forcePowers[0].spent);assert(!c.levels[0].forcePowers[1].spent);assert.deepEqual(ix.forcePowers.get('power:force-lightning'),before);
 c.forceTraditions=[];d=derive(c,pack);assert(d.forcePowers.filter(p=>p.id==='power:force-lightning').every(p=>p.descriptors.includes('dark-side')));usePower(c,d,pack,c.levels[0].forcePowers[1].id,12);assert.equal(c.darkSideScore,1);
 c.forceTraditions=[membership('aing-tii-monk')];c.levels[0].talent.choice='power:enlighten';d=derive(c,pack);assert(!d.forcePowers.find(p=>p.id==='power:enlighten').descriptors.includes('light-side'));assert(d.forcePowers.find(p=>p.id==='power:force-lightning').descriptors.includes('dark-side'));assert(articleText(ix.forcePowers.get('power:enlighten').article).includes('Light Side'));
});
