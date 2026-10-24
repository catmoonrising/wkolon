import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {acrobaticsMove} from '../src/acrobatics-movement-actions.js';
import {acrobaticsPath} from '../src/acrobatics-movement.js';
import {beginNextTurn,endCurrentTurn,endTrackedCombat,takeAction,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {newEncounter,newDay} from '../src/recovery.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:scoundrel',hpRoll:4,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Core Scoundrel: Misfortune talents at levels 1 and 3, Improved Skirmisher requires Skirmisher.
function hero(talents=['skirmisher','improved-skirmisher'],{squares=2,displacement=1}={}){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:12};c.trainedSkills=['skill:acrobatics','skill:deception','skill:perception','skill:stealth'];
 c.levels[0].talent=talents[0]?{id:'talent:'+talents[0]}:null;c.levels.push(row(null),row(talents[1]||null));
 c.inventory=[{id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];
 c.acrobaticsMovement={...acrobaticsPath(c),displacement,path:{squares,diagonal:0,difficult:0,diagonalDifficult:0,lowObjects:0,diagonalLowObjects:0}};validateCharacter(c,pack);return c;
}
const move=c=>acrobaticsMove(c,derive(c,pack),pack);
const attack=c=>derive(c,pack).attacks[0].attack;

test('Skirmisher metadata is pinned and both talents remain Partial',()=>{
 validatePack(pack);for(const change of [r=>r.minimumSquares=1,r=>r.minimumDisplacement=0,r=>r.effect.type='dodge',r=>r.duration='end-next-turn']){const p=structuredClone(pack);change(p.rules.moveTalentEffects[0]);assert.throws(()=>validatePack(p));}
 for(const id of ['skirmisher','improved-skirmisher'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
 const d=derive(hero(),pack);for(const id of ['skirmisher','improved-skirmisher'])assert(d.ctx.talents.some(t=>t.id==='talent:'+id)&&!d.ctx.inactiveTalents.has('talent:'+id));
});
test('a completed Move of at least 2 squares ending elsewhere grants +1 attack and +1 Defenses',()=>{
 const c=hero(),a=attack(c),d0=derive(c,pack);move(c);assert.deepEqual(c.moveTalentEffects,['skirmisher','improved-skirmisher']);
 const d=derive(c,pack);assert.equal(d.attacks[0].attack,a+1);for(const k of ['reflex','fortitude','will'])assert.equal(d.defenses[k],d0.defenses[k]+1,k);
 assert.match(renderStatBlock(c,d,pack),/<b>Skirmisher:<\/b> Attack \+1/);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 move(c);assert.equal(attack(c),a+1,'repeating refreshes rather than stacks');
});
test('movement boundaries: fewer than 2 squares or ending in the starting square do not qualify',()=>{
 for(const opts of [{squares:1,displacement:1},{squares:4,displacement:0}]){const c=hero(undefined,opts),a=attack(c);move(c);assert.equal(c.moveTalentEffects,undefined,JSON.stringify(opts));assert.equal(attack(c),a);}
 const failed=hero();failed.acrobaticsMovement.tumble=true;failed.acrobaticsMovement.check=0;const r=move(failed);assert.equal(failed.moveTalentEffects,undefined);
 const one=hero(['skirmisher']);move(one);assert.deepEqual(one.moveTalentEffects,['skirmisher']);
 const none=hero([null]);move(none);assert.equal(none.moveTalentEffects,undefined);
});
test('the bonus lasts through End turn until the start of the next turn and is cleared by resets',()=>{
 const c=hero(),a=attack(c);beginNextTurn(c,pack);move(c);endCurrentTurn(c,pack);assert.equal(attack(c),a+1);beginNextTurn(c,pack);assert.equal(attack(c),a);assert.equal(c.moveTalentEffects,undefined);
 for(const reset of [x=>endTrackedCombat(x),x=>newEncounter(x),x=>newDay(x,pack)]){const x=hero();move(x);reset(x);assert.equal(x.moveTalentEffects,undefined);}
 const lost=hero();move(lost);lost.levels[0].talent=null;assert.equal(attack(lost),attack(hero([null])));
});
test('Actions Move applies it; queued previews mutate nothing; saved rows validate strictly',()=>{
 const c=hero();beginNextTurn(c,pack);const s=queueAction(c,'move',{path:structuredClone(c.acrobaticsMovement)}),before=structuredClone(c);assert(!previewPlan(c,pack).find(r=>r.id===s.id).issue);assert.deepEqual(c,before);
 takeAction(c,pack,'move',{path:structuredClone(c.acrobaticsMovement)},()=>{throw Error('no roll');});assert.deepEqual(c.moveTalentEffects,['skirmisher','improved-skirmisher']);
 for(const rows of [null,['invented'],['skirmisher','skirmisher'],'skirmisher'])assert.throws(()=>validateCharacter({...c,moveTalentEffects:rows},pack),/move talent effects/);
});
