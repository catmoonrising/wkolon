import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {acrobaticsMove} from '../src/acrobatics-movement-actions.js';
import {acrobaticsPath} from '../src/acrobatics-movement.js';
import {beginNextTurn,endCurrentTurn,endTrackedCombat,takeAction,executeAction,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {newDay,newEncounter,restEightHours} from '../src/recovery.js';
import {activeTurnFeatEffects} from '../src/turn-feat-effects.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(alt=false){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.species='species:nelvaanian';c.levels[0].feats=[{id:'feat:anointed-hunter'}];c.levels[0].talent={id:'talent:fool-s-luck'};c.trainedSkills=['skill:acrobatics'];c.inventory=['frag-grenade','knife','blaster-pistol'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));c.acrobaticsMovement={...acrobaticsPath(c),displacement:2,path:{squares:2,diagonal:0,difficult:0,diagonalDifficult:0,lowObjects:0,diagonalLowObjects:0}};
 if(alt)c.houseRules={ambiguities:{'ambiguity:anointed-hunter-duration':'next-turn'}};return c;
}
const thrown=c=>derive(c,pack).attacks.find(a=>a.id==='equipment:frag-grenade').attack;
const active=c=>activeTurnFeatEffects(c,pack,derive(c,pack).ctx);
const move=c=>acrobaticsMove(c,derive(c,pack),pack);

test('completed Move uses declared net displacement, activates +1 competence only for thrown profiles and refreshes without stacking',()=>{
 const c=hero(),before=derive(c,pack);validateCharacter(c,pack);validatePack(pack);const r=move(c);assert(r.movementComplete);assert.deepEqual(r.featEffects,['anointed-hunter']);assert.equal(thrown(c),before.attacks.find(a=>a.id==='equipment:frag-grenade').attack+1);
 assert.equal(derive(c,pack).attacks.find(a=>a.id==='equipment:knife').attack,before.attacks.find(a=>a.id==='equipment:knife').attack);assert.equal(derive(c,pack).attacks.find(a=>a.id==='equipment:blaster-pistol').attack,before.attacks.find(a=>a.id==='equipment:blaster-pistol').attack);
 c.inventory[1].attackStyle='thrown';const on=derive(c,pack).attacks.find(a=>a.id==='equipment:knife').attack;delete c.turnFeatEffects;assert.equal(derive(c,pack).attacks.find(a=>a.id==='equipment:knife').attack,on-1);move(c);move(c);assert.equal(c.turnFeatEffects.length,1);assert.equal(c.turnFeatEffects[0].endsRemaining,1);assert.match(renderStatBlock(c,derive(c,pack),pack),/Thrown attacks \+1/);
});
test('route length alone, incomplete movement, failed tumble and missing feat never activate Anointed Hunter',()=>{
 for(const displacement of [0,1]){const c=hero();c.acrobaticsMovement.displacement=displacement;move(c);assert.equal(active(c).length,0);}
 const unknown=hero();delete unknown.acrobaticsMovement.displacement;move(unknown);assert.equal(active(unknown).length,0);
 const failed=hero();failed.acrobaticsMovement.tumble=true;failed.acrobaticsMovement.check=0;const r=move(failed);assert(!r.movementComplete);assert.equal(active(failed).length,0);
 const missing=hero();missing.levels[0].feats=[];move(missing);assert.equal(active(missing).length,0);
 const far=hero();far.acrobaticsMovement.path.squares=6;far.acrobaticsMovement.path.difficult=6;far.acrobaticsMovement.crossTerrain=true;far.acrobaticsMovement.terrainCheck=0;const out=move(far);assert(!out.movementComplete);assert.equal(active(far).length,0);
});
test('prose expiry is end of current turn, including implicit Next turn and Charge early end',()=>{
 for(const end of [c=>endCurrentTurn(c,pack),startNextTurn,c=>beginNextTurn(c,pack)]){const c=hero();move(c);assert.equal(active(c).length,1);end(c);assert.equal(active(c).length,0);}
 const c=hero();beginNextTurn(c,pack);takeAction(c,pack,'move',{path:c.acrobaticsMovement});assert.equal(active(c).length,1);takeAction(c,pack,'charge',{uid:c.inventory[1].uid,path:{squares:2}});assert(c.actionState.ended);assert.equal(active(c).length,0);
});
test('table expiry survives own End turn and reload, expires at end of next turn, and repeated End turn does not consume twice',()=>{
 const c=hero(true);beginNextTurn(c,pack);move(c);endCurrentTurn(c,pack);assert.equal(c.turnFeatEffects[0].endsRemaining,1);assert(c.turnFeatEffects[0].ended);endCurrentTurn(c,pack);assert.equal(active(c).length,1);
 const loaded=JSON.parse(JSON.stringify(c));validateCharacter(loaded,pack);beginNextTurn(loaded,pack);assert.equal(active(loaded).length,1);endCurrentTurn(loaded,pack);assert.equal(active(loaded).length,0);
 const legacy=hero(true);move(legacy);startNextTurn(legacy);assert.equal(active(legacy).length,1);startNextTurn(legacy);assert.equal(active(legacy).length,0);
});
test('competence bonuses do not stack with Fool Luck, feat loss suppresses, and toggling duration does not rewrite saved expiry',()=>{
 const c=hero(true),base=thrown(c);c.talentActivations=[{id:'talent:fool-s-luck',choice:'attacks'}];assert.equal(thrown(c),base+1);move(c);assert.equal(thrown(c),base+1);c.houseRules.ambiguities['ambiguity:anointed-hunter-duration']='current-turn';endCurrentTurn(c,pack);assert.equal(active(c).length,1);c.levels[0].feats=[];assert.equal(active(c).length,0);
});
test('queued Move previews leave real state and resources untouched, execution spends one Move and records effect',()=>{
 const c=hero();beginNextTurn(c,pack);const step=queueAction(c,'move',{path:structuredClone(c.acrobaticsMovement)}),before=structuredClone(c),p=previewPlan(c,pack);assert.equal(p[0].issue,undefined);assert.deepEqual(c,before);const fp=c.forcePoints;executeAction(c,pack,step.id);assert.equal(active(c).length,1);assert.deepEqual(c.actionState.spent,['move']);assert.equal(c.forcePoints,fp);
 const bad=hero();bad.acrobaticsMovement.displacement=3;const snapshot=structuredClone(bad);assert.throws(()=>takeAction(bad,pack,'move',{path:bad.acrobaticsMovement}),/displacement/);assert.deepEqual(bad,snapshot);
});
test('encounter, combat, rest and day boundaries clear effects; saved malformed effects and displacement are rejected',()=>{
 for(const reset of [endTrackedCombat,newEncounter,c=>newDay(c,pack),c=>restEightHours(c,derive(c,pack),pack)]){const c=hero(true);move(c);reset(c);assert.equal(c.turnFeatEffects,undefined);}
 const c=hero();for(const displacement of [-1,3,1.5,'2']){const q=structuredClone(c);q.acrobaticsMovement.displacement=displacement;assert.throws(()=>validateCharacter(q,pack),/displacement/);}
 for(const rows of [null,[{id:'other',endsRemaining:1,ended:false}],[{id:'anointed-hunter',endsRemaining:0,ended:false}],[{id:'anointed-hunter',endsRemaining:2,ended:0}]])assert.throws(()=>validateCharacter({...c,turnFeatEffects:rows},pack));
});
