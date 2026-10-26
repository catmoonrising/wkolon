import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/trigger-followup-fixtures.cjs';
import * as api from '../src/rules.js';
import {beginNextTurn,endCurrentTurn,takeAction,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {setTriggeredDefense} from '../src/triggered-defenses.js';
import {deflectionPlan,deflectionRerollSources,rerollDeflection} from '../src/deflection.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const incoming={aware:true,attackRoll:100,kind:'single',target:'self',incoming:{amount:0,options:{type:'normal'}},rerolls:'always'};

test('complete Jedi Knight, Force Adept and Charlatan builds retain actual prerequisites',()=>{
 for(const c of [f.acuity(),f.talisman(),f.talisman(true),f.charlatan(),f.charlatan(false)])assert.deepEqual(api.derive(c,pack).issues,[]);
});
test('Acuity scopes its +2 to Block/Deflect and keeps the original modifier for Soresu rerolls',()=>{
 const c=f.acuity();beginNextTurn(c,pack);const base=api.derive(c,pack),normal=base.skills.find(s=>s.id==='skill:use-the-force').total;setTriggeredDefense(c,pack,base.ctx,'defensive-acuity',true);let d=api.derive(c,pack);assert.equal(d.skills.find(s=>s.id==='skill:use-the-force').total,normal);assert.equal(d.deflectionCheckBonus,2);
 for(const id of ['block','deflect'])assert.equal(deflectionPlan(c,d,pack,id,{...incoming,trigger:'attack-'+id}).bonus,normal+2);
 const roller=n=>expr=>({value:n+Number(expr.slice(4)||0),d20:[n],display:expr,coeffs:[1]});takeAction(c,pack,'deflect',{...incoming,trigger:'reroll-test'},roller(2));const step=c.actionState.plan.at(-1);assert.equal(step.status,'waiting');assert.equal(step.options.deflectionCheck.bonus,normal+2);
 setTriggeredDefense(c,pack,api.derive(c,pack).ctx,'defensive-acuity',false);d=api.derive(c,pack);assert.equal(d.deflectionCheckBonus,0);const source=deflectionRerollSources(c,d,pack,step).find(r=>r.talentId==='talent:soresu');assert(source);rerollDeflection(c,d,pack,step,source.id,roller(10));assert.equal(step.result.check.bonus,normal+2);assert.equal(step.result.check.total,normal+12);api.validateCharacter(c,pack);
});
test('Soft Cover preflights adjacency and Swift budget, queues without spending, and clears without a refund',()=>{
 const c=f.charlatan(),before=api.derive(c,pack).defenses.reflex;beginNextTurn(c,pack);const clean=structuredClone(c);assert.throws(()=>takeAction(c,pack,'improved-soft-cover',{adjacent:false}),/adjacent creature/);assert.deepEqual(c,clean);
 queueAction(c,'improved-soft-cover',{adjacent:true});assert.deepEqual(c.actionState.spent,[]);assert.equal(api.derive(c,pack).defenses.reflex,before);assert.equal(previewPlan(c,pack)[0].issue,undefined);assert.deepEqual(c.actionState.spent,[]);
 // Execute the planned step through the same public engine used by the UI.
 return import('../src/action-engine.js').then(({executeAction})=>{executeAction(c,pack,c.actionState.plan[0].id);assert.deepEqual(c.actionState.spent,['swift']);assert.equal(api.derive(c,pack).defenses.reflex,before+2);const saved=JSON.parse(JSON.stringify(c));api.validateCharacter(saved,pack);assert.equal(api.derive(saved,pack).defenses.reflex,before+2);setTriggeredDefense(c,pack,api.derive(c,pack).ctx,'improved-soft-cover',false);assert.deepEqual(c.actionState.spent,['swift']);assert.equal(api.derive(c,pack).defenses.reflex,before);
  c.actionState.spent=['standard','move','swift'];const full=structuredClone(c);assert.throws(()=>takeAction(c,pack,'improved-soft-cover',{adjacent:true}),/Not enough Swift/);assert.deepEqual(c,full);beginNextTurn(c,pack);takeAction(c,pack,'improved-soft-cover',{adjacent:true});beginNextTurn(c,pack);assert.equal(api.derive(c,pack).defenses.reflex,before);
 });
});
test('Acuity lasts through the next turn end, while Dark Side talismans use highest Force and descriptor-only rows',()=>{
 const c=f.acuity();beginNextTurn(c,pack);setTriggeredDefense(c,pack,api.derive(c,pack).ctx,'defensive-acuity',true);endCurrentTurn(c,pack);assert.equal(api.derive(c,pack).deflectionCheckBonus,2);beginNextTurn(c,pack);assert.equal(api.derive(c,pack).deflectionCheckBonus,2);endCurrentTurn(c,pack);assert.equal(api.derive(c,pack).deflectionCheckBonus,0);
 for(const citadel of [false,true]){const t=f.talisman(citadel),d=api.derive(t,pack),row=d.conditionalDefenses.find(r=>r.defense==='will'&&r.against==='light-side-powers');assert(row);assert.equal(row.total,d.defenses.will+(citadel?0:1));assert(!d.conditionalDefenses.some(r=>r.against==='dark-side-powers'));t.inventory[0].carried=false;assert(!api.derive(t,pack).conditionalDefenses.some(r=>r.against==='light-side-powers'));}
});
