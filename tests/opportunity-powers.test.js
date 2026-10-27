import {finishResistancePower,renewResistancePower,requireResistanceDamageChecks} from '../src/resistance-powers.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import * as api from '../src/rules.js';import make from '../tools/high-ground-defense-fixtures.cjs';
import {emptyActionState} from '../src/action-economy.js';import {startNextTurn} from '../src/attack-techniques.js';import {opportunityView,opportunityPlan,rollOpportunity} from '../src/opportunity-actions.js';import {finishSelfPower} from '../src/self-power-effects.js';import {validatePack} from '../tools/validate-rules.js';
import {opportunityPowerTier,finishOpportunityPower,chooseOpportunityPowerTier,opportunityPowerMovement,withOpportunityPowerDice} from '../src/opportunity-powers.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),id='power:high-ground-defense';
function ready(options={}){const c=f.adept(options);c.actionState=emptyActionState();c.actionState.active=true;c.opportunity={opponent:'Guard',action:'Move1',distance:1,provoked:true,used:[]};return c;}
const cast=(c,total,extra={})=>finishOpportunityPower(c,pack,crypto.randomUUID(),id,{total},extra);
test('closed reviewed power tiers pin20436 and real Sokan/Mastery eligibility',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-high-ground-defense').revision,20436);for(const [total,tier]of [[14,0],[15,1],[19,1],[20,2],[24,2],[25,3],[29,3],[30,4],[50,4]])assert.equal(opportunityPowerTier(pack,id,total),tier);
 const c=ready({sokan:true}),d=api.derive(c,pack);assert.deepEqual(d.issues,[]);assert(d.ctx.talents.some(t=>t.id==='talent:sokan'));assert(d.forcePowers.find(p=>p.id===id).take10);assert(d.forcePowers.find(p=>p.id===id).adept);
});
test('Force bonus changes only AoOs, maxes across copies and competes with Battle Strike',()=>{
 const c=ready(),view=opportunityView(c,pack),a=view.attacks.find(a=>a.id==='equipment:lightsaber');assert(a);const normal=a.attack;
 cast(c,20);assert.equal(opportunityPlan(c,pack,a.uid).attack.attack,normal+1);assert.equal(api.derive(c,pack).attacks.find(x=>x.uid===a.uid).attack,normal);
 finishSelfPower(c,pack,crypto.randomUUID(),'power:battle-strike',{total:15});assert.equal(api.derive(c,pack).attacks.find(x=>x.uid===a.uid).attack,normal+1);assert.equal(opportunityPlan(c,pack,a.uid).attack.attack,normal+1,'two +1 Force sources do not add');
 cast(c,30);assert.equal(opportunityPlan(c,pack,a.uid).attack.attack,normal+5);cast(c,25);assert.equal(opportunityPlan(c,pack,a.uid).attack.attack,normal+5);api.validateCharacter(c,pack);
});
test('Sokan weapon dice preserve ordinary damage and stack unnamed per-copy grants; lost Sokan suppresses them',()=>{
 const c=ready({sokan:true}),a=opportunityView(c,pack).attacks.find(a=>a.id==='equipment:lightsaber'),normal=structuredClone(a);cast(c,15,{formAllowed:true});let opp=opportunityPlan(c,pack,a.uid).attack;assert.equal(opp.damage,'3d8');assert.equal(opp.damageDisplay,normal.damageDisplay.replace('2d8','3d8'));cast(c,30,{formAllowed:true});opp=opportunityPlan(c,pack,a.uid).attack;assert.equal(opp.damage,'4d8');assert.equal(api.derive(c,pack).attacks.find(x=>x.uid===a.uid).damage,normal.damage);
 c.levels[10].talent={id:'talent:deflect'};assert.equal(opportunityPlan(c,pack,a.uid).attack.damage,normal.damage);
});
test('extra weapon die handles fixed d1 natural damage, critical profiles and independent Battle Strike riders',()=>{
 assert.deepEqual(withOpportunityPowerDice({damage:'2d1',damageDisplay:'2+4',rollDamageDisplay:'2+4',criticalDamageDisplay:'2d2+4'},1),{damage:'3d1',damageDisplay:'3+4',rollDamageDisplay:'3+4',criticalDamageDisplay:'3d2+4'});
 const a={damage:'2d8',damageDisplay:'2d8+5+2d6 on hit',rollDamageDisplay:'2d8+5',battleStrike:{dice:2}};const out=withOpportunityPowerDice(a,1);assert.equal(out.damageDisplay,'3d8+5+2d6 on hit');assert.equal(out.rollDamageDisplay,'3d8+5');assert.deepEqual(out.battleStrike,{dice:2});assert.equal(a.damage,'2d8');
});
test('failed, lesser, enhanced, duplicate and saved states preserve permissions and turn expiry',()=>{
 const c=ready();assert.equal(cast(c,14),null);assert(!c.opportunityPowerEffects);const row=cast(c,30,{enhanced:true});assert.equal(opportunityPowerMovement(c,pack),1);chooseOpportunityPowerTier(c,row.id,1);assert.equal(c.opportunityPowerEffects[0].tier,1);assert.throws(()=>chooseOpportunityPowerTier(c,row.id,5));assert.throws(()=>finishOpportunityPower(c,pack,row.id,id,{total:20}),/already resolved/);api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);const bad=structuredClone(c);bad.opportunityPowerEffects[0].formAllowed=1;assert.throws(()=>api.validateCharacter(bad,pack));startNextTurn(c);assert(!c.opportunityPowerEffects);assert.equal(opportunityPowerMovement(c,pack),0);
});

test('a pending resistance check rejects direct turn reset without deleting High Ground Defense',()=>{
 const c=ready(),resistance=finishResistancePower(c,pack,crypto.randomUUID(),'power:energy-resistance',{total:20});c.actionState.turn++;renewResistancePower(c,resistance.id);cast(c,30);requireResistanceDamageChecks(c,pack,1);api.validateCharacter(c,pack);const before=structuredClone(c);assert.throws(()=>startNextTurn(c),/Resolve or release Energy Resistance/);assert.deepEqual(c,before);
});
