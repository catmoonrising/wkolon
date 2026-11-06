import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import {takeAction,describeAction,executeAction,previewPlan,beginNextTurn,endCurrentTurn,endTrackedCombat} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {declaredBonusHPGrants,claimDeclaredBonusHP} from '../src/bonus-hit-points.js';
import {newEncounter,newDay,setDead} from '../src/recovery.js';
import {validatePack} from '../tools/validate-rules.js';
import {applyIncomingDamage} from '../src/incoming-damage.js';
import make from '../tools/armored-augmentation-fixtures.cjs';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const derive=c=>api.derive(c,pack),noRoll=()=>{throw Error('Should not roll');};
const options=c=>({talentId:'talent:armored-augmentation-i',choice:'threshold',armorUid:c.inventory.find(e=>e.id==='equipment:battle-armor').uid});
const activate=c=>takeAction(c,pack,'encounter-talent',options(c),noRoll);
const vital=c=>takeAction(c,pack,'vital-encouragement',{},noRoll);
const save=c=>{const q=JSON.parse(JSON.stringify(c));api.validateCharacter(q,pack);return q;};
const untouched=(c,fn,re)=>{const before=structuredClone(c);assert.throws(fn,re);assert.deepEqual(c,before);};

test('source-bound Partial records and legal acquisition histories',()=>{
 validatePack(pack);for(const id of ['armored-augmentation-i','armored-augmentation-ii','vital-encouragement'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
 assert.deepEqual(derive(f.knight()).issues,[]);assert.deepEqual(derive(f.vital()).issues,[]);
 const bad=structuredClone(pack);bad.talents.find(t=>t.id==='talent:armored-augmentation-i').activation.forcePoints=0;assert.throws(()=>validatePack(bad),/Armored Augmentation/);
 const action=structuredClone(pack);action.rules.actionEconomy.actions.find(a=>a.id==='vital-encouragement').type='reaction';assert.throws(()=>validatePack(action),/Vital Encouragement/);
});
test('Armored Augmentation spends one Swift and FP, persists through turns, ends at encounter boundary',()=>{
 const c=f.knight(),before=derive(c),fp=c.forcePoints;beginNextTurn(c,pack);activate(c);let d=derive(c);
 assert.equal(d.threshold,before.threshold+before.armor.armorBonus);assert.equal(d.timedDR,2*before.armor.fortitudeBonus);assert.equal(c.forcePoints,fp-1);assert.deepEqual(c.actionState.spent,['swift']);assert.equal(c.actionState.forceSpent,true);
 untouched(c,()=>activate(c),/already active/);beginNextTurn(c,pack);assert.equal(derive(c).threshold,d.threshold);assert.equal(derive(save(c)).normalProtection.dr,d.timedDR);
 newEncounter(c);assert.equal(derive(c).threshold,before.threshold);assert.equal(derive(c).timedDR,0);activate(c);
});
test('armor selection binds to the exact worn inventory UID without transferring between identical suits',()=>{
 const c=f.knight(),base=derive(c).threshold;activate(c);const first=c.inventory[0],other=f.item('battle-armor',{equipped:false});c.inventory.push(other);
 first.equipped=false;other.equipped=true;let q=save(c);assert.equal(derive(q).threshold,base);assert.equal(derive(q).normalProtection.dr,0);
 other.equipped=false;first.equipped=true;assert(derive(c).threshold>base);
 c.inventory=c.inventory.filter(e=>e.uid!==first.uid);const bare=structuredClone(c);delete bare.talentActivations;assert.equal(derive(save(c)).threshold,derive(bare).threshold);untouched(c,()=>activate(c),/already active/);
});
test('no worn armor, unproficient armor and a different or forged target fail before costs',()=>{
 for(const mode of ['none','heavy','other']){
  const c=f.knight(),o=options(c);if(mode==='none')c.inventory[0].equipped=false;if(mode==='heavy')c.inventory[0].id='equipment:heavy-battle-armor';if(mode==='other')o.armorUid=crypto.randomUUID();
  untouched(c,()=>takeAction(c,pack,'encounter-talent',o,noRoll),/armor/);
 }
 const c=f.knight();activate(c);for(const armorUid of ['',3,null,'a'.repeat(101)]){const q=structuredClone(c);q.talentActivations[0].armorUid=armorUid;assert.throws(()=>api.validateCharacter(q,pack),/talent activations/);}
 const q=structuredClone(c);delete q.talentActivations[0].armorUid;assert.throws(()=>api.validateCharacter(q,pack),/talent activations/);
});
test('actual armor DR, displayed protection, strongest source and source loss remain consistent',()=>{
 const c=f.knight();activate(c);let d=derive(c);assert.equal(d.normalProtection.dr,d.timedDR);const hp=c.currentHP,hit=applyIncomingDamage(c,d,pack,12);assert.equal(hit.drBlocked,d.timedDR);assert.equal(c.currentHP,hp-(12-d.timedDR));
 c.protection={sr:0,srMax:0,dr:d.timedDR+5,drBypass:''};assert.equal(derive(c).normalProtection.dr,d.timedDR+5);
 c.levels[9].talent=null;assert.equal(derive(c).timedDR,0);c.levels[7].talent=null;delete c.protection;assert.equal(derive(c).threshold,derive(f.knight()).threshold);assert.equal(c.talentActivations.length,1);
});
test('Vital Encouragement is a Free Action with history, nonstacking bonus HP and a once-per-encounter ledger',()=>{
 const c=f.vital(),d=derive(c),fp=c.forcePoints,hp=c.currentHP;assert.equal(describeAction(c,pack,'vital-encouragement').cost.type,'free');c.bonusHP=100;vital(c);
 assert.equal(c.bonusHP,100);assert.equal(c.currentHP,hp);assert.equal(c.forcePoints,fp);assert.deepEqual(c.actionState.spent,[]);assert.deepEqual(c.bonusHPGrantsUsed,['vital-encouragement']);assert.equal(c.actionState.plan.at(-1).status,'done');assert.equal(c.actionState.plan.at(-1).action,'vital-encouragement');
 untouched(c,()=>vital(c),/unavailable/);beginNextTurn(c,pack);untouched(c,()=>vital(c),/unavailable/);
 const q=save(c);newEncounter(q);assert.equal(q.bonusHPGrantsUsed,undefined);vital(q);assert.equal(q.bonusHP,10+Math.floor(d.level/2));
});
test('queued Vital uses reserve once on preview only and recheck state atomically on execution',()=>{
 const c=f.vital(),a=queueAction(c,'vital-encouragement'),b=queueAction(c,'vital-encouragement'),before=structuredClone(c),rows=previewPlan(c,pack);
 assert(!rows[0].issue);assert.match(rows[1].issue,/unavailable/);assert.deepEqual(c,before);c.flatFooted=true;untouched(c,()=>executeAction(c,pack,a.id,noRoll),/unavailable|flat-footed/);c.flatFooted=false;executeAction(c,pack,a.id,noRoll);untouched(c,()=>executeAction(c,pack,b.id,noRoll),/unavailable/);
});
test('Vital cannot act while helpless, unconscious, dead, flat-footed, off turn or after losing its source',()=>{
 for(const change of [c=>c.condition=5,c=>c.currentHP=0,c=>setDead(c,true,pack),c=>c.flatFooted=true,c=>{beginNextTurn(c,pack);endCurrentTurn(c,pack);},c=>c.levels[0].talent=null]){
  const c=f.vital();change(c);untouched(c,()=>vital(c),/unavailable|helpless|flat-footed/);assert(!declaredBonusHPGrants(pack,derive(c),c).some(g=>g.id==='vital-encouragement'));untouched(c,()=>claimDeclaredBonusHP(c,derive(c),pack,'vital-encouragement'),/unavailable/);
 }
});
test('death and revival preserve spent use; encounter, day and combat endings reset it',()=>{
 const c=f.vital();vital(c);setDead(c,true,pack);assert.equal(c.bonusHP,undefined);assert.deepEqual(c.bonusHPGrantsUsed,['vital-encouragement']);setDead(c,false,pack);c.currentHP=1;c.condition=4;untouched(c,()=>vital(c),/unavailable/);save(c);
 for(const reset of [c=>newEncounter(c),c=>newDay(c,pack),c=>endTrackedCombat(c)]){const q=structuredClone(c);reset(q);assert.equal(q.bonusHPGrantsUsed,undefined);vital(q);}
 for(const value of ['x',[1],['a','a'],['not-a-grant'],['thrive-on-chaos']]){const q=f.vital();q.bonusHPGrantsUsed=value;assert.throws(()=>api.validateCharacter(q,pack),/bonus HP grants/);}
});
