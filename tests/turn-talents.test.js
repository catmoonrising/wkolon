import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,describeAction,executeAction,previewPlan,beginNextTurn,endCurrentTurn,endTrackedCombat} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {startNextTurn} from '../src/attack-techniques.js';
import {newDay,newEncounter,restEightHours} from '../src/recovery.js';
import {activeTurnTalents,turnTalentPlan} from '../src/turn-talents.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const level=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:4,startingFeat:null,feats:[],talent:talent?{id:'talent:'+talent}:null,trainedSkills:[],abilityIncreases:[]});
function hero(ranks=1,jar=false){
 const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:16,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:lightsaber-defense'};
 for(let i=2;i<=7;i++)c.levels.push(level('jedi',i%2===1&&i<=ranks*2-1?'lightsaber-defense':null));
 if(jar){const cls=pack.classes.find(r=>r.id==='class:jedi-knight'),entryDeclarations=Object.fromEntries((cls.entrySpecials||[]).map(s=>[s.id,true]));c.levels.push({...level('jedi-knight','niman'),entryDeclarations},level('jedi-knight'),{...level('jedi-knight','jar-kai'),entryDeclarations});}
 c.inventory=[weapon()];return c;
}
const weapon=(extra={})=>({id:'equipment:lightsaber',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const run=c=>takeAction(c,pack,'lightsaber-defense',{},()=>{throw Error('Should not roll');});
const aware=d=>d.conditionalDefenses.find(r=>r.defense==='reflex'&&r.against==='aware');
test('turn talent metadata pins action, exact effects, rank cap and Jar Kai condition',()=>{
 validatePack(pack);for(const change of [r=>r.maximum=4,r=>r.effect.type='dodge',r=>r.doubleWeaponCount=1,r=>r.sourceIds=[]]){const p=structuredClone(pack);change(p.rules.turnTalentActions[0]);assert.throws(()=>validatePack(p));}
});
test('Lightsaber Defense is activated with one Swift action and no FP, displaying a conditional Reflex total',()=>{
 const c=hero(),before=derive(c,pack),fp=c.forcePoints;assert(!aware(before));assert.equal(c.turnTalents,undefined);run(c);const d=derive(c,pack);assert.equal(d.defenses.reflex,before.defenses.reflex);assert.equal(aware(d).total,before.defenses.reflex+1);assert.equal(aware(d).type,'deflection');assert.equal(c.forcePoints,fp);assert.deepEqual(c.actionState.spent,['swift']);assert(!c.actionState.forceSpent);validateCharacter(c,pack);assert(renderStatBlock(c,d,pack).includes('while aware'));assert(renderStatBlock(c,d,pack).includes('Reflex +1'));
});
test('rank contributions cap at three and Jar Kai doubles that result while wielding two Lightsabers',()=>{
 for(const ranks of [1,2,3]){const c=hero(ranks,true);c.inventory.push(weapon());assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:jar-kai'));assert.equal(turnTalentPlan(c,derive(c,pack),pack,'lightsaber-defense').amount,ranks*2);run(c);assert.equal(aware(derive(c,pack)).amount,ranks*2);}
 const c=hero(3);run(c);assert.equal(aware(derive(c,pack)).amount,3);
});
test('a quantity stack, inactive second Lightsaber and a single double-bladed Lightsaber do not enable Jar Kai',()=>{
 for(const rows of [[weapon({quantity:2})],[weapon(),weapon({activated:false})],[weapon({id:'equipment:double-bladed-lightsaber'})]]){const c=hero(1,true);c.inventory=rows;assert.equal(turnTalentPlan(c,derive(c,pack),pack,'lightsaber-defense').amount,1);}
});
test('activation requires an equipped, carried, activated Lightsaber; stale or missing gear costs nothing',()=>{
 for(const patch of [{activated:false},{equipped:false},{carried:false},{id:'equipment:blaster-pistol'}]){const c=hero();Object.assign(c.inventory[0],patch);const before=structuredClone(c);assert.throws(()=>run(c),/Lightsaber/);assert.deepEqual(c,before);}
 const c=hero(),s=queueAction(c,'lightsaber-defense');c.inventory=[];const before=structuredClone(c);assert.throws(()=>executeAction(c,pack,s.id),/Lightsaber/);assert.deepEqual(c,before);
});
test('Flat-footed suppresses deflection even if Uncanny Dodge preserves Dexterity, without consuming the activation',()=>{
 const c=hero();c.levels.push(level('scout','acute-senses'),level('scout'),level('scout','improved-initiative'),level('scout'),level('scout','uncanny-dodge-i'));run(c);const d=derive(c,pack);assert(aware(d));c.flatFooted=true;const flat=derive(c,pack);assert(flat.ctx.talents.some(t=>t.id==='talent:uncanny-dodge-i'));assert(!aware(flat));assert(c.turnTalents);c.flatFooted=false;assert(aware(derive(c,pack)));
});
test('helpless state suppresses the benefit and forbids activating while incapacitated',()=>{
 const c=hero();run(c);c.helpless=true;assert(!aware(derive(c,pack)));c.helpless=false;assert(aware(derive(c,pack)));
 for(const patch of [{condition:5},{currentHP:0},{helpless:true}]){const c=Object.assign(hero(),patch),before=structuredClone(c);assert.throws(()=>run(c),/helpless/);assert.deepEqual(c,before);}
});
test('deflection bonuses compete through shared stacking while Niman and other types add',()=>{
 const c=hero(1,true);c.inventory.push(weapon());const base=derive(c,pack).defenses.reflex;run(c);assert.equal(aware(derive(c,pack)).total,base+2);
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:lightsaber-defense').effects.push({target:'defenseBonus',defense:'reflex',amount:4,type:'deflection'});const d=derive(c,p);assert.equal(d.defenses.reflex,base+4);assert(!aware(d));
});
test('a used bonus snapshots the activation and can be increased by another paid Swift without stacking',()=>{
 const c=hero(1,true);run(c);assert.equal(c.turnTalents[0].amount,1);c.inventory.push(weapon());run(c);assert.equal(c.turnTalents.length,1);assert.equal(c.turnTalents[0].amount,2);assert.deepEqual(c.actionState.spent,['swift','move']);const before=structuredClone(c);assert.throws(()=>run(c),/Already active/);assert.deepEqual(c,before);c.inventory[1].equipped=false;assert.equal(aware(derive(c,pack)).amount,2);
});
test('build edits suppress lost talents and limit a snapshot without granting newly acquired ranks for free',()=>{
 const c=hero(2);run(c);c.levels[2].talent=null;assert.equal(aware(derive(c,pack)).amount,1);c.levels[0].talent=null;assert(!aware(derive(c,pack)));assert.equal(c.turnTalents[0].amount,2);
 const q=hero();run(q);q.levels[2].talent={id:'talent:lightsaber-defense'};assert.equal(aware(derive(q,pack)).amount,1);
 const r=hero(1,true);r.inventory.push(weapon());run(r);r.levels[9].talent=null;assert.equal(aware(derive(r,pack)).amount,1);
});
test('saved activations survive reload and end turn, then expire at start of next turn or combat/encounter/day/rest reset',()=>{
 const c=hero();run(c);const q=JSON.parse(JSON.stringify(c));validateCharacter(q,pack);endCurrentTurn(q,pack);assert(aware(derive(q,pack)));beginNextTurn(q,pack);assert.equal(q.turnTalents,undefined);assert(!aware(derive(q,pack)));
 for(const reset of [startNextTurn,newEncounter,newDay,endTrackedCombat,(c,p)=>restEightHours(c,derive(c,p),p)]){const c=hero();run(c);reset(c,pack);assert.equal(c.turnTalents,undefined);validateCharacter(c,pack);}
});
test('queue previews are free and reject duplicate activations using only their simulated state',()=>{
 const c=hero();queueAction(c,'lightsaber-defense');queueAction(c,'lightsaber-defense');const before=structuredClone(c),rows=previewPlan(c,pack);assert(!rows[0].issue);assert.match(rows[1].issue,/Already active/);assert.deepEqual(c,before);
});
test('legacy saves remain unchanged and turn state rejects unknown IDs, impossible amounts, duplicate or extra fields',()=>{
 const c=hero();validateCharacter(c,pack);derive(c,pack);assert.equal(c.turnTalents,undefined);
 for(const rows of [null,[{id:'invented',amount:1}],[{id:'lightsaber-defense',amount:5}],[{id:'lightsaber-defense',amount:1,rounds:4}],[{id:'lightsaber-defense',amount:1},{id:'lightsaber-defense',amount:2}]])assert.throws(()=>validateCharacter({...c,turnTalents:rows},pack),/turn talents/);
});
