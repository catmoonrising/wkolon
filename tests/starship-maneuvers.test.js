import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {learnStarshipManeuver,removeStarshipManeuver,setStarshipManeuverSpent} from '../src/starship-maneuvers.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {moduleRelevant} from '../src/sheet-modules.js';
import {createStarshipManeuvers} from '../src/starship-maneuvers-ui.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:13,cha:14};c.trainedSkills=['skill:pilot'];c.levels[0].feats=[{id:'feat:vehicular-combat'},{id:'feat:starship-tactics'}];return c;}
const extra=(abilityIncreases=[])=>({classId:'class:soldier',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases,trainedSkills:[]});
test('27 official maneuvers have full text and typed actions/descriptors; Intercept excludes its Force power section',()=>{
 assert.equal(pack.starshipManeuvers.length,27);const intercept=pack.starshipManeuvers.find(r=>r.name==='Intercept');assert.equal(intercept.action,'reaction');assert.equal(pack.sources.find(s=>s.id===intercept.sourceId).section,'Starship Maneuver');assert(articleText(intercept.article).includes('initiate a Dogfight'));assert(!articleText(intercept.article).includes('telekinetically hurl'));assert(pack.forcePowers.some(p=>p.name==='Intercept'));
 for(const r of pack.starshipManeuvers){assert.equal(r.automation,'manual');assert(r.article.blocks.length);assert(pack.catalog.records.some(c=>c.kind==='starshipManeuver'&&c.mechanicsIds.includes(r.id)));}validatePack(pack);
});
test('Tactics grants separate bounded maneuver choices, supports duplicates and keeps manual spent state',()=>{
 const c=hero();let d=derive(c,pack);assert.equal(d.maneuverSlots,2);assert.equal(d.rows[0].maneuverChoices,2);assert.equal(d.powerSlots,0);const first=learnStarshipManeuver(c,d,pack,0,'maneuver:snap-roll');d=derive(c,pack);const second=learnStarshipManeuver(c,d,pack,0,'maneuver:snap-roll');d=derive(c,pack);assert.notEqual(first.id,second.id);assert.equal(d.starshipManeuvers.length,2);assert(!d.issues.some(s=>s.includes('Starship Maneuvers')));assert.throws(()=>learnStarshipManeuver(c,d,pack,0,'maneuver:afterburn'));
 setStarshipManeuverSpent(c,d,first.id,true);d=derive(c,pack);assert.equal(d.starshipManeuvers[0].spent,true);assert.equal(d.starshipManeuvers[1].spent,false);assert(renderStatBlock(c,d,pack).includes('Starship Maneuvers'));assert(moduleRelevant('starship-maneuvers',c,d));validateCharacter(c,pack);
 removeStarshipManeuver(c,first.id);d=derive(c,pack);assert.equal(d.starshipManeuvers.length,1);assert.equal(d.starshipManeuvers[0].copyId,second.id);assert(d.issues.some(s=>s.includes('choose 2 Starship Maneuvers')));
});
test('repeat training and Wisdom growth award choices at the correct level, with prerequisite replay',()=>{
 const c=hero();c.levels.push(extra(),extra(),extra(['wis','con']));c.levels[2].feats=[{id:'feat:starship-tactics'}];for(let i=0;i<2;i++)learnStarshipManeuver(c,derive(c,pack),pack,0,'maneuver:afterburn');let d=derive(c,pack);assert.equal(d.rows[1].maneuverChoices,0);assert.equal(d.rows[2].maneuverChoices,2);for(let i=0;i<2;i++)learnStarshipManeuver(c,derive(c,pack),pack,2,'maneuver:target-lock');d=derive(c,pack);assert.equal(d.rows[3].maneuverChoices,2);assert.equal(d.maneuverSlots,6);for(let i=0;i<2;i++)learnStarshipManeuver(c,derive(c,pack),pack,3,'maneuver:intercept');d=derive(c,pack);assert.equal(d.starshipManeuvers.length,6);assert.throws(()=>learnStarshipManeuver(c,d,pack,1,'maneuver:afterburn'));validateCharacter(c,pack);
 c.levels[0].feats[0]=null;d=derive(c,pack);assert.equal(d.maneuverSlots,0);assert.equal(d.starshipManeuvers.length,0);assert.equal(c.levels.flatMap(l=>l.starshipManeuvers||[]).length,6);assert(d.issues.some(s=>s.includes('Starship Tactics is not eligible')));assert(moduleRelevant('starship-maneuvers',c,d));
});
test('minimum one, no pending-class grants, Force descriptor learning and old files remain valid',()=>{
 const c=hero();c.abilities.wis=6;assert.equal(derive(c,pack).maneuverSlots,1);c.levels[0].pendingClass=true;assert.equal(derive(c,pack).maneuverSlots,0);delete c.levels[0].pendingClass;c.abilities.wis=13;learnStarshipManeuver(c,derive(c,pack),pack,0,'maneuver:target-sense');assert.equal(derive(c,pack).starshipManeuvers[0].descriptors[0],'force');assert(!derive(c,pack).ctx.trained.has('skill:use-the-force'));validateCharacter(c,pack);validateCharacter(newCharacter(pack),pack);
});
test('malformed copies, duplicate identities, unknown IDs, unsupported effects and descriptors are rejected',()=>{
 const c=hero();learnStarshipManeuver(c,derive(c,pack),pack,0,'maneuver:afterburn');for(const patch of [{id:'bad'},{maneuverId:'power:intercept'},{spent:1},{action:'reaction'}]){const copy=structuredClone(c);Object.assign(copy.levels[0].starshipManeuvers[0],patch);assert.throws(()=>validateCharacter(copy,pack));}c.levels[0].starshipManeuvers.push({...c.levels[0].starshipManeuvers[0]});assert.throws(()=>validateCharacter(c,pack));
 for(const mutate of [p=>p.starshipManeuvers[0].descriptors.push('homebrew'),p=>p.starshipManeuvers[0].sourceId='source:unknown',p=>p.feats.find(f=>f.id==='feat:starship-tactics').effects[0].minimum=0]){const p=structuredClone(pack);mutate(p);assert.throws(()=>validatePack(p));}
});
test('manual module has exact disclosures and spent controls without fabricated vehicle rolls',()=>{
 const c=hero();learnStarshipManeuver(c,derive(c,pack),pack,0,'maneuver:afterburn');const ui=createStarshipManeuvers(pack,{current:()=>c,derived:()=>derive(c,pack),changed:()=>{},error:e=>{throw new Error(e);}}),sheet=ui.sheet(),library=ui.library(0);assert(sheet.includes('data-maneuver-spent'));assert(sheet.includes('Manual'));assert(!sheet.includes('data-use-power'));assert(!sheet.includes('data-use-maneuver'));assert(library.includes('data-learn-maneuver'));assert(library.includes('Time:'));assert(ui.manager().includes('Level 1'));
});
