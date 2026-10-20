import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {acrobaticsMoveCost} from '../src/acrobatics-movement.js';
import {acrobaticsMove} from '../src/acrobatics-movement-actions.js';
import {acrobaticsMoveControls} from '../src/acrobatics-movement-ui.js';
import {bracingState} from '../src/attack-techniques.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const set=(c,id,value)=>{c.houseRules??={};c.houseRules.ambiguities??={};c.houseRules.ambiguities['ambiguity:'+id]=value;};
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
function hero(cls='scoundrel'){const c=newCharacter(pack,{classId:'class:'+cls});c.abilityMethod='manual';c.abilities={str:14,dex:10,con:14,int:18,wis:14,cha:14};c.trainedSkills=['skill:acrobatics'];return c;}
const route=c=>{c.acrobaticsMovement={tumble:true,crossTerrain:true,path:{squares:2,difficult:2},tumbled:{squares:2,difficult:2}};};
const noDice=()=>assert.fail('No dice expected');
test('all six newly reopened settings preserve defaults and expose only saved supported choices with exact source passages',()=>{
 validatePack(pack);const c=hero();for(const id of ['lightsaber-defense-weapon-change','bracing-stock','tumble-cross-check','tumble-cost','predictive-defense-dexterity-limits','team-feat-allies']){const r=pack.rules.ambiguities.find(r=>r.id==='ambiguity:'+id);assert(r);assert.equal(r.options.length,2);set(c,id,r.options[1].value);}validateCharacter(c,pack);validateCharacter(JSON.parse(JSON.stringify(c)),pack);set(c,'bracing-stock','invented');assert.throws(()=>validateCharacter(c,pack),/ambiguities/);
});
test('Bracing stock clause is pistol-only by default and can require a retractable stock for all three weapon groups',()=>{
 const c=hero('soldier'),w=pack.equipment.find(r=>r.id==='equipment:heavy-repeating-blaster'),e=item('heavy-repeating-blaster');assert(bracingState(w,e,pack,c).available);set(c,'bracing-stock','all-groups');assert(!bracingState(w,e,pack,c).available);assert(bracingState({...w,retractableStock:true},e,pack,c).available);assert(!bracingState({...w,retractableStock:true},{...e,stockPosition:'folded'},pack,c).available);
});
test('shared Tumble/Terrain check rolls exactly once, resolves both outcomes and records one check',()=>{
 for(const value of [15,14]){const c=hero();route(c);set(c,'tumble-cross-check','shared');let count=0;const r=acrobaticsMove(c,derive(c,pack),pack,expr=>{count++;return {value,d20:[12],display:expr};});assert.equal(count,1);assert.equal(r.checks.length,1);assert.equal(r.terrainRoll.success,value===15);assert.equal(r.tumbleRoll.success,value===15);assert.equal(r.cost,value===15?4:8);assert.equal(r.movementComplete,value===15);}
});
test('shared entered check uses the visible Tumble field and hides the obsolete separate Terrain check',()=>{
 const c=hero();route(c);c.acrobaticsMovement.check=15;c.acrobaticsMovement.terrainCheck=14;set(c,'tumble-cross-check','shared');const html=acrobaticsMoveControls(c,derive(c,pack),pack);assert(!html.includes('data-acrobatics-movement="terrainCheck"'));const r=acrobaticsMove(c,derive(c,pack),pack,noDice);assert(r.success);assert.equal(r.checks.length,1);assert.equal(c.acrobaticsMovement.terrainCheck,null);assert.equal(c.acrobaticsMovement.check,null);
});
test('separate DC15 checks remain the default and can independently succeed or fail',()=>{
 const c=hero();route(c);c.acrobaticsMovement.check=14;c.acrobaticsMovement.terrainCheck=15;const r=acrobaticsMove(c,derive(c,pack),pack,noDice);assert.equal(r.checks.length,2);assert(r.terrainRoll.success);assert(!r.tumbleRoll.success);
});
test('flat-two Tumble replaces only tumbled squares, including diagonal terrain; Sokan still uses one',()=>{
 const c=hero();c.acrobaticsMovement={tumble:true,path:{squares:3,diagonalDifficult:1},tumbled:{squares:1,diagonalDifficult:1}};const d=derive(c,pack);assert.equal(acrobaticsMoveCost(c,pack,false,d),10);set(c,'tumble-cost','flat-two');assert.equal(acrobaticsMoveCost(c,pack,false,d),4);assert.equal(acrobaticsMoveCost(c,pack,false,{...d,tumbleSokan:true}),3);
});
test('turning Tumble off does not evaluate its leftover Take10 mode for an ordinary Move',()=>{
 const c=hero();c.acrobaticsMovement={tumble:false,checkMode:'take10',path:{squares:1}};const r=acrobaticsMove(c,derive(c,pack),pack,noDice);assert.equal(r.cost,1);assert.equal(r.checks.length,0);
});
test('Predictive Defense can apply Dexterity denial to replacement Intelligence without changing the default',()=>{
 const c=hero();c.levels[0].feats=[{id:'feat:predictive-defense'}];c.flatFooted=true;const normal=derive(c,pack);assert.equal(normal.defenseAbilities.reflex.ability,'int');assert.equal(normal.defenseAbilities.reflex.modifier,4);set(c,'predictive-defense-dexterity-limits','dexterity-limits');const restricted=derive(c,pack);assert.equal(restricted.defenseAbilities.reflex.modifier,0);assert.equal(restricted.defenses.reflex,normal.defenses.reflex-4);
});
test('Team feats can count self while keeping the saved ally count, caps and Competence nonstacking intact',()=>{
 const c=hero('soldier');c.trainedSkills=['skill:swim'];c.levels[0].feats=[{id:'feat:aquatic-specialists'}];const base=derive(c,pack),skill=d=>d.skills.find(s=>s.id==='skill:swim').total;assert.equal(base.teamSkills[0].bonus,3);set(c,'team-feat-allies','include-self');const self=derive(c,pack);assert.equal(self.teamSkills[0].allies,0);assert.equal(self.teamSkills[0].bonus,4);assert.equal(skill(self),skill(base)+1);c.levels[0].feats.push({id:'feat:skill-focus',choice:'skill:swim'});assert.equal(derive(c,pack).teamSkills[0].bonus,4);assert.equal(skill(derive(c,pack)),skill(base)+2);c.teamFeatAllies={'feat:aquatic-specialists':1000};assert.equal(derive(c,pack).teamSkills[0].bonus,7);
});
