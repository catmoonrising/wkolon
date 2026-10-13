import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {escapeBonds,escapeBondsDetails,escapeBondsState,planEscapeBonds} from '../src/escape-bonds.js';
import {escapeBondsControls,escapeBondsIssue} from '../src/escape-bonds-ui.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function fixture(trained=false){const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:14,wis:10,cha:10};c.trainedSkills=trained?['skill:acrobatics']:[];return c;}

test('fixed restraints and tight space retain their printed DCs and action times',()=>{
 const c=fixture();
 for(const [restraint,dc,duration] of [['net',15,'full-round-action'],['binder-cuffs',25,'1-minute'],['tight-space',20,'full-round-action']]){
  c.escapeBonds={restraint};const p=planEscapeBonds(c,derive(c,pack),pack);assert.equal(p.dc,dc);assert.equal(p.duration,duration);
 }
 assert.equal(pack.rules.escapeBonds.trainedOnly,false);assert.equal(pack.rules.escapeBonds.take10,false);assert.equal(pack.rules.escapeBonds.take20,false);
});
test('ropes use opponent Dexterity +10; grapples use the opposing grapple check, including ties',()=>{
 const c=fixture();c.escapeBonds={restraint:'ropes'};assert.throws(()=>planEscapeBonds(c,derive(c,pack),pack),/opponent's Dexterity check/);
 c.escapeBonds.dexterityCheck=14;c.escapeBonds.check=24;let r=escapeBonds(c,derive(c,pack),pack);assert(r.success);assert.equal(r.dc,24);assert.equal(r.duration,'1-minute');
 c.escapeBonds={restraint:'grapple'};assert.throws(()=>planEscapeBonds(c,derive(c,pack),pack),/opponent's Grapple check/);
 c.escapeBonds.grappleCheck=24;c.escapeBonds.check=24;r=escapeBonds(c,derive(c,pack),pack);assert(r.success);assert.equal(r.dc,24);assert.equal(r.duration,'standard-action');
 c.escapeBonds={restraint:'ropes',dexterityCheck:-12};assert.equal(planEscapeBonds(c,derive(c,pack),pack).dc,-2);
});
test('trained faster attempts add 10 DC and use each specified shorter duration',()=>{
 const c=fixture(true);
 for(const [restraint,baseDC,duration] of [['ropes',24,'5-rounds'],['binder-cuffs',25,'5-rounds'],['manacles',30,'5-rounds'],['net',15,'standard-action'],['tight-space',20,'standard-action'],['grapple',14,'move-action']]){
  c.escapeBonds={restraint,fast:true,dexterityCheck:14,grappleCheck:14,dc:30,check:baseDC+10};const r=escapeBonds(c,derive(c,pack),pack);
  assert.equal(r.dc,baseDC+10);assert.equal(r.duration,duration);assert(r.success);
 }
});
test('untrained and removed training cannot grant faster escapes but ordinary attempts remain legal',()=>{
 const c=fixture();c.escapeBonds={restraint:'net',fast:true,check:25};const before=structuredClone(c);
 assert.throws(()=>escapeBonds(c,derive(c,pack),pack,()=>{throw Error('should not roll');}),/trained Acrobatics/);assert.deepEqual(c,before);
 c.trainedSkills=['skill:acrobatics'];assert(planEscapeBonds(c,derive(c,pack),pack));c.trainedSkills=[];assert(escapeBondsIssue(c,derive(c,pack),pack));
 assert(!escapeBondsControls(c,derive(c,pack),pack).includes('disabled title="Requires trained Acrobatics"')); // Stale setting can be unchecked.
 c.escapeBonds.fast=false;assert(escapeBonds(c,derive(c,pack),pack).success);
});
test('manacles require a declared DC rather than copying the binder-cuff DC',()=>{
 const c=fixture();c.escapeBonds={restraint:'manacles',check:30};assert.equal(escapeBondsDetails(c,pack).dc,null);
 assert.throws(()=>escapeBonds(c,derive(c,pack),pack),/manacles DC/);assert.equal(c.escapeBonds.check,30);
 c.escapeBonds.dc=30;const r=escapeBonds(c,derive(c,pack),pack);assert(r.success);assert.equal(r.duration,'1-minute');
});
test('tight space moves exactly one square on success and none on failure',()=>{
 const c=fixture();c.prone=true;c.escapeBonds={restraint:'tight-space',check:19};let r=escapeBonds(c,derive(c,pack),pack);assert(!r.success);assert.equal(r.movementSquares,0);assert(r.text.includes('No movement'));
 c.escapeBonds.check=20;r=escapeBonds(c,derive(c,pack),pack);assert(r.success);assert.equal(r.movementSquares,1);assert(r.text.includes('1 square'));assert(c.prone);
});
test('dice use current Acrobatics total, including condition penalties, without automatic natural-1/20 outcomes',()=>{
 const c=fixture(true);c.abilities.dex=30;c.condition=1;c.escapeBonds={restraint:'net'};let expression;
 const d=derive(c,pack),skill=d.skills.find(s=>s.id==='skill:acrobatics');assert.equal(skill.total,14);
 let r=escapeBonds(c,d,pack,expr=>{expression=expr;return {value:1+skill.total,d20:[1],display:expr};});assert.equal(expression,'1d20+14');assert(r.success);
 c.trainedSkills=[];c.abilities.dex=14;c.condition=0;c.escapeBonds={restraint:'binder-cuffs'};
 r=escapeBonds(c,derive(c,pack),pack,expr=>({value:22,d20:[20],display:expr}));assert(!r.success);
});
test('failed attempts clear immediate attacks, Aim, Brace and routine progress without spending HP, FP or ammo',()=>{
 const c=fixture();c.escapeBonds={restraint:'net',check:14};c.inventory=[{id:'equipment:blaster-pistol',uid:'pistol',quantity:1,equipped:true,aimed:true,shotsRemaining:20}];c.followUp={tickets:[{id:'ticket'}],selected:'ticket',immediate:true};c.routineProgress={id:'routine'};
 const hp=c.currentHP,fp=c.forcePoints;const r=escapeBonds(c,derive(c,pack),pack);assert(!r.success);assert.equal(c.escapeBonds.check,null);assert.equal(c.inventory[0].aimed,false);assert.deepEqual(c.followUp.tickets,[]);assert(!c.routineProgress);assert.equal(c.inventory[0].shotsRemaining,20);assert.equal(c.currentHP,hp);assert.equal(c.forcePoints,fp);
 c.inventory=[{id:'equipment:heavy-repeating-blaster',uid:'heavy',quantity:1,equipped:true,braced:true,shotsRemaining:20}];c.escapeBonds.check=14;escapeBonds(c,derive(c,pack),pack);assert.equal(c.inventory[0].braced,false);assert.equal(c.inventory[0].shotsRemaining,20);
});
test('unavailable or malformed attempts do not roll or change saved state',()=>{
 const c=fixture();c.escapeBonds={restraint:'net'};
 for(const patch of [{currentHP:0},{condition:5},{helpless:true}]){const blocked={...c,...patch},before=structuredClone(blocked);assert.throws(()=>escapeBonds(blocked,derive(blocked,pack),pack,()=>{throw Error('should not roll');}),/unavailable/);assert.deepEqual(blocked,before);}
 for(const result of [{value:NaN},{value:15,d20:[0]},{value:15,d20:[21]},{value:15,d20:[10,5]},{value:15.5,d20:[10]}]){const before=structuredClone(c);assert.throws(()=>escapeBonds(c,derive(c,pack),pack,()=>result),/Invalid Escape Bonds roll/);assert.deepEqual(c,before);}
});
test('closed saved state accepts dormant drafts and rejects malformed fields without changing older characters',()=>{
 const c=fixture();const before=structuredClone(c);assert.equal(escapeBondsState(c).restraint,'binder-cuffs');assert.deepEqual(c,before);validateCharacter(c,pack);
 c.escapeBonds={restraint:'ropes',fast:false,dexterityCheck:14,dc:30,check:25};const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.deepEqual(saved.escapeBonds,c.escapeBonds);
 for(const patch of [{restraint:'constructor'},{fast:1},{check:Infinity},{dexterityCheck:1.5},{dc:NaN},{unexpected:true}])assert.throws(()=>validateCharacter({...saved,escapeBonds:{...saved.escapeBonds,...patch}},pack),/Escape Bonds/);
});
test('controls expose exact article help, useful opponent labels and the missing manacles DC',()=>{
 const c=fixture();c.escapeBonds={restraint:'ropes'};let html=escapeBondsControls(c,derive(c,pack),pack);assert(html.includes('Opponent’s Dexterity'));assert(html.includes('Escape Bonds mechanics'));assert(html.includes('disabled title="Requires trained Acrobatics"'));assert(!html.includes('Take 10'));
 c.escapeBonds={restraint:'manacles'};html=escapeBondsControls(c,derive(c,pack),pack);assert(html.includes('Base DC'));assert(html.includes('not specified in RAW'));assert(html.includes('Enter the manacles DC'));
});
