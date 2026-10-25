import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter, validateCharacter, derive} from '../src/rules.js';
import {generationState, setGenerationMethod, preparePointBuy, setPointBuyScore, assignScore, setPoolScore, setRolledPool} from '../src/ability-generation.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
test('existing standard characters retain assignments; method changes reset scores',()=>{
 const c=newCharacter(pack,{classId:'class:scoundrel'});
 assert.deepEqual(Object.values(generationState(c,pack).assign),[0,1,2,3,4,5]);
 setGenerationMethod(c,'point-buy',pack);
 assert.equal(derive(c,pack).pointCost,0);
 assert.deepEqual(generationState(c,pack).pool,[8,8,8,8,8,8]);
 assert.deepEqual(Object.values(c.abilities),[8,8,8,8,8,8]);
 setGenerationMethod(c,'standard',pack);
 assert(derive(c,pack).issues.includes('Assign all six ability scores'));
 assert.equal(assignScore(c,'str',0,pack),true);
 assert.equal(assignScore(c,'dex',0,pack),false);
 assert.equal(c.abilities.str,15);
 assert.equal(assignScore(c,'str',null,pack),true);
 assert.equal(assignScore(c,'dex',0,pack),true);
 assert.doesNotThrow(()=>validateCharacter(c,pack));
});
test('equal rolled results are distinct assignments and persist in exports',()=>{
 const c=newCharacter(pack,{classId:'class:scoundrel'});setGenerationMethod(c,'rolled',pack);
 assert.equal(generationState(c,pack).pool.length,0);
 setRolledPool(c,[12,12,12,12,12,12]);
 for(const [i,a] of ['str','dex','con','int','wis','cha'].entries()) assert(assignScore(c,a,i,pack));
 const imported=validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 assert.deepEqual(imported.abilities,c.abilities);
 assert(!derive(imported,pack).issues.includes('Assign all six ability scores'));
 imported.abilityGeneration.assign.dex=0;
 assert.throws(()=>validateCharacter(imported,pack),/duplicate ability assignment/);
});

test('manual generation retains assignment and point buy directly updates its named ability',()=>{
 const c=newCharacter(pack,{classId:'class:scoundrel'});setGenerationMethod(c,'manual',pack);
 assert(setPoolScore(c,0,30,pack));assert.equal(c.abilities.str,10);
 assert(assignScore(c,'str',0,pack));assert.equal(c.abilities.str,30);
 assert(setPoolScore(c,0,12,pack));assert.equal(c.abilities.str,12);
 assert.doesNotThrow(()=>validateCharacter(c,pack));
 setGenerationMethod(c,'point-buy',pack);
 assert(setPoolScore(c,0,18,pack));assert.equal(derive(c,pack).pointCost,16);
 assert.equal(c.abilities.str,18);
 assert(assignScore(c,'str',0,pack));assert.equal(c.abilities.str,18);
 assert(!setPoolScore(c,1,19,pack));
 assert.doesNotThrow(()=>validateCharacter(c,pack));
});
test('point buy purchases named abilities directly, including repeated scores and saved budgets',()=>{
 const c=newCharacter(pack);setGenerationMethod(c,'point-buy',pack);c.pointBudget=28;
 for(const [a,n]of Object.entries({str:10,dex:12,con:13,int:14,wis:13,cha:14}))assert(setPointBuyScore(c,a,n,pack));
 assert.equal(derive(c,pack).pointCost,28);assert.deepEqual(c.abilities,{str:10,dex:12,con:13,int:14,wis:13,cha:14});assert(!derive(c,pack).issues.some(i=>i.startsWith('Assign all')));
 const before=structuredClone(c);assert(!setPointBuyScore(c,'dex',19,pack));assert(!setPointBuyScore(c,'foo',12,pack));assert.deepEqual(c,before);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 assert(setPointBuyScore(c,'dex',14,pack));assert.equal(c.abilities.wis,13);assert.equal(derive(c,pack).pointCost,30);
});
test('legacy point-buy pools preserve assigned scores and distribute unassigned purchases without discarding them',()=>{
 const c=newCharacter(pack);c.abilityMethod='point-buy';c.abilityGeneration={pool:[18,12,8,8,8,8],assign:{str:null,dex:1,con:0,int:null,wis:null,cha:null}};c.abilities={str:10,dex:12,con:18,int:10,wis:10,cha:10};validateCharacter(c,pack);
 assert(preparePointBuy(c,pack));assert.deepEqual(c.abilities,{str:8,dex:12,con:18,int:8,wis:8,cha:8});assert.equal(derive(c,pack).pointCost,20);validateCharacter(c,pack);const saved=structuredClone(c);assert(!preparePointBuy(c,pack));assert.deepEqual(c,saved);
 delete c.abilityGeneration;assert(setPointBuyScore(c,'str',14,pack));assert.equal(c.abilities.con,18);validateCharacter(c,pack);
});
