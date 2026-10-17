import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ABILITIES,newCharacter,derive,validateCharacter,indexPack,eligible} from '../src/rules.js';
import {generationState,setGenerationMethod,assignScore,setPoolScore,setRolledPool} from '../src/ability-generation.js';
import {chooseSpeciesOption} from '../src/species-choices.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {createSpeciesBrowser} from '../src/species-browser.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),fixed={str:15,dex:13,con:10,int:12,wis:10,cha:8},ix=indexPack(pack);
const hero=()=>{const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:republic-clone';c.levels[0].feats=[];c.levels[0].talent=null;c.trainedSkills=[];return c;};

test('Republic Clone uses the exact fixed array and only one selected +2, not hidden generated values',()=>{
 const c=hero();c.abilityMethod='manual';delete c.abilityGeneration;c.abilities=Object.fromEntries(ABILITIES.map(a=>[a,30]));let d=derive(c,pack);assert.deepEqual(d.ctx.scores,fixed);assert.equal(d.hp,30);assert(d.issues.includes('Choose Republic Clone Ability'));
 for(const ability of ABILITIES){chooseSpeciesOption(c,pack,'ability',ability);d=derive(c,pack);assert.deepEqual(d.ctx.scores,{...fixed,[ability]:fixed[ability]+2});assert(!d.issues.some(s=>/Choose Republic Clone Ability|Assign all six|Standard package|Point-buy/.test(s)));}
 c.abilities.dex=3;chooseSpeciesOption(c,pack,'ability','str');assert(eligible(ix.feats.get('feat:dodge'),{id:'feat:dodge'},derive(c,pack).ctx,ix,'feats'));assert.deepEqual(ix.species.get(c.species).fixedAbilities,fixed);validateCharacter(c,pack);
});

test('normal generation is preserved while fixed scores ignore its incomplete or over-budget state',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'});setGenerationMethod(c,'point-buy',pack);setPoolScore(c,0,18,pack);assignScore(c,'str',0,pack);c.pointBudget=0;const prior=JSON.stringify({method:c.abilityMethod,abilities:c.abilities,generation:c.abilityGeneration});assert(derive(c,pack).issues.some(s=>s.includes('Point-buy budget')));
 c.species='species:republic-clone';let d=derive(c,pack);assert(!d.issues.some(s=>/Point-buy|Assign all six|Standard package/.test(s)));assert.equal(d.pointCost,0);assert.deepEqual(generationState(c,pack),{fixed:true,pool:ABILITIES.map(a=>fixed[a]),assign:Object.fromEntries(ABILITIES.map((a,i)=>[a,i]))});
 assert.equal(setGenerationMethod(c,'standard',pack),false);assert.equal(assignScore(c,'str',1,pack),false);assert.equal(setPoolScore(c,0,8,pack),false);assert.equal(setRolledPool(c,[18,18,18,18,18,18],pack),false);assert.equal(JSON.stringify({method:c.abilityMethod,abilities:c.abilities,generation:c.abilityGeneration}),prior);
 chooseSpeciesOption(c,pack,'ability','con');c.species='species:human';assert.equal(generationState(c,pack).assign.str,0);assert.equal(c.abilities.str,18);assert(derive(c,pack).issues.some(s=>s.includes('Point-buy budget')));c.species='species:republic-clone';assert.equal(derive(c,pack).scores.con,12);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 for(const method of ['standard','manual','rolled']){c.species='species:human';setGenerationMethod(c,method,pack);c.species='species:republic-clone';assert(!derive(c,pack).issues.some(s=>/Assign all six|Standard package|Point-buy/.test(s)));}
});

test('Clone bonus feat and class-skill training slots use the fixed Intelligence and chosen increase',()=>{
 const c=hero();chooseSpeciesOption(c,pack,'ability','cha');c.trainedSkills=ix.classes.get('class:soldier').skills.slice(0,5);let d=derive(c,pack);assert.equal(d.rows[0].slots.length,2);assert.equal(d.ctx.trained.size,5);assert(!d.issues.some(s=>s.includes('starting trained skills')));assert.equal(d.ctx.speciesTraining.size,0,'the extra skill is a selectable class-skill slot');
 chooseSpeciesOption(c,pack,'ability','int');d=derive(c,pack);assert.equal(d.scores.int,14);assert(d.issues.some(s=>s.includes('choose 6 starting trained skills')));c.trainedSkills=ix.classes.get('class:soldier').skills.slice(0,6);assert(!derive(c,pack).issues.some(s=>s.includes('starting trained skills')));assert.deepEqual(ix.species.get(c.species).languages,['Basic']);
});

test('later ability increases, equipment and stat blocks use the fixed starting scores',()=>{
 const c=hero();chooseSpeciesOption(c,pack,'ability','con');resizeLevelPlan(c,pack,4);for(let i=1;i<4;i++)choosePlannedClass(c,pack,i,'class:soldier');c.levels[3].abilityIncreases=['str','con'];let d=derive(c,pack);assert.equal(d.scores.str,16);assert.equal(d.scores.con,13);assert.equal(d.hp,52);assert.equal(d.rows[0].scores.con,12);assert.equal(d.rows[3].scores.con,13);
 c.inventory=[{id:'equipment:corellian-powersuit',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];d=derive(c,pack);assert.equal(d.ctx.scores.str,16);assert.equal(d.scores.str,18);assert(renderStatBlock(c,d,pack).includes('Str 18'));assert.deepEqual(ix.species.get(c.species).fixedAbilities,fixed);validateCharacter(c,pack);
 const browser=createSpeciesBrowser(pack);browser.search('Republic Clone');const html=browser.results(c.species);assert(html.includes('STR 15, DEX 13, CON 10, INT 12, WIS 10, CHA 8'));
});

test('fixed-score contract and saved increase reject missing, extra and invalid values',()=>{
 for(const value of [null,[],{}, {...fixed,str:2},{...fixed,str:31},{...fixed,con:10.5},{...fixed,extra:10}]){const p=structuredClone(pack);p.species.find(r=>r.id==='species:republic-clone').fixedAbilities=value;assert.throws(()=>validatePack(p));}
 const c=hero();for(const value of ['all',['str','dex'],3]){c.speciesChoices={[c.species]:{ability:value}};assert.throws(()=>validateCharacter(c,pack));}
});
