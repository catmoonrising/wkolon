import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {addOwnedVehicle,nameOwnedVehicle,removeOwnedVehicle,validateVehicleReferences} from '../src/vehicles.js';
import {createVehiclesUI} from '../src/vehicles-ui.js';
import {moduleRelevant} from '../src/sheet-modules.js';
import {createRulesCatalog} from '../src/rules-catalog.js';
import {validatePack} from '../tools/validate-rules.js';
const load=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url))),pack=load('data/core.json'),index=load('data/reference-index.json');
test('471 pinned vehicles retain table provenance, nullable unknowns and Manual status without article duplication',()=>{
 assert.equal(pack.vehicles.length,471);assert.equal(new Set(pack.vehicles.map(v=>v.id)).size,471);for(const v of pack.vehicles){assert.equal(v.automation,'manual');assert(v.listings.length);assert.equal(v.article,undefined);assert(index.records.some(r=>r.id===v.referenceId&&r.name===v.name));}assert(pack.vehicles.some(v=>v.listings.some(l=>l.challengeLevel===null)));validatePack(pack);validateVehicleReferences(pack,index);
 const hardcell=pack.vehicles.find(v=>v.name==='Hardcell-Class Interstellar Transport');assert(hardcell.listings.some(l=>l.type==='space-transport'));assert(pack.vehicles.some(v=>v.name==='Modified Tsmeu-6 Personal Wheel Bike'));assert(pack.vehicles.some(v=>v.name==='Corellian YX-1980 Space Transport'));
});
test('owned vehicles have separate identities and names without spending or changing character combat stats',()=>{
 const c=newCharacter(pack),before=derive(c,pack),id=pack.vehicles.find(v=>v.name==='X-Wing Starfighter').id;assert(!moduleRelevant('vehicles',c,before));const first=addOwnedVehicle(c,pack,id),second=addOwnedVehicle(c,pack,id);assert.notEqual(first.uid,second.uid);assert.equal(c.credits,0);assert.equal(derive(c,pack).hp,before.hp);assert.equal(derive(c,pack).defenses.reflex,before.defenses.reflex);assert(moduleRelevant('vehicles',c,derive(c,pack)));nameOwnedVehicle(c,pack,first.uid,'Red Five');assert.equal(first.name,'Red Five');assert.equal(second.name,'');validateCharacter(c,pack);removeOwnedVehicle(c,first.uid);assert.equal(c.vehicles.length,1);assert.equal(c.vehicles[0].uid,second.uid);validateCharacter(newCharacter(pack),pack);
});
test('vehicle ownership is bounded and rejects malformed IDs, names and unreviewed state',()=>{
 const c=newCharacter(pack);addOwnedVehicle(c,pack,pack.vehicles[0].id);for(const patch of [{uid:'wrong'},{vehicleId:'vehicle:homebrew'},{name:'bad\nname'},{hp:100}]){const copy=structuredClone(c);Object.assign(copy.vehicles[0],patch);assert.throws(()=>validateCharacter(copy,pack));}assert.throws(()=>nameOwnedVehicle(c,pack,c.vehicles[0].uid,'x'.repeat(101)));c.vehicles.push({...c.vehicles[0]});assert.throws(()=>validateCharacter(c,pack));c.vehicles=[];for(let i=0;i<100;i++)addOwnedVehicle(c,pack,pack.vehicles[0].id);assert.throws(()=>addOwnedVehicle(c,pack,pack.vehicles[0].id));
});
test('reference and catalog validators reject source changes and lazy references on ordinary rules',()=>{
 for(const mutate of [p=>p.vehicles[0].referenceId='reference:0000000000000000',p=>p.vehicles[0].listings[0].type='homebrew',p=>p.catalog.records.find(r=>r.kind==='vehicle').referenceId='reference:0000000000000000',p=>{const r=p.catalog.records.find(r=>r.kind==='feat');delete r.ruleId;r.referenceId=pack.vehicles[0].referenceId;}]){const p=structuredClone(pack);mutate(p);assert.throws(()=>validatePack(p));}
 const p=structuredClone(pack);p.sources.find(s=>s.id===p.vehicles[0].sourceId).revision++;assert.throws(()=>validateVehicleReferences(p,index),/Changed vehicle reference/);
});
test('vehicle references participate in source/full-text catalog searches after lazy index loading',()=>{
 const catalog=createRulesCatalog(pack);catalog.setReferences(index);catalog.filter('vehicle',true);catalog.search('astromech');assert(catalog.matches().some(r=>r.name==='X-Wing Starfighter'));assert(catalog.matches().every(r=>r.status==='available'&&r.referenceId&&r.kind==='vehicle'));catalog.filter('',false);catalog.search('Acclamator II-Class Assault Ship');const id=pack.vehicles.find(v=>v.name==='Acclamator II-Class Assault Ship').referenceId;assert.equal(catalog.matches().filter(r=>r.referenceId===id).length,1);
});
test('catalog loading is lazy, shared and retryable and does not preload every vehicle article',async()=>{
 const c=newCharacter(pack);let calls=0,fail=true;const ui=createVehiclesUI(pack,{current:()=>c,changed:()=>{},save:()=>{},error:()=>{},library:{load:async()=>{calls++;if(fail)throw new Error('offline');return index;},article:()=>{throw new Error('Unexpected article preload');}},refresh:()=>{}});assert.equal(calls,0);await assert.rejects(ui.load());assert(ui.results().includes('data-vehicle-retry'));fail=false;await Promise.all([ui.load(),ui.load()]);assert.equal(calls,2);assert.equal(ui.matches().length,471);assert(ui.manager().includes('data-vehicle-search'));assert.equal(c.vehicles,undefined);
});
test('switching characters cancels delayed ownership and a failed article fetch never grants a vehicle',async()=>{
 const a=newCharacter(pack),b=newCharacter(pack);let active=a,resolve,rejected=false;const result=new Promise(r=>resolve=r),errors=[];const ui=createVehiclesUI(pack,{current:()=>active,changed:()=>{},save:()=>{},error:e=>errors.push(e),library:{load:async()=>index,article:()=>rejected?Promise.reject(new Error('unavailable')):result},refresh:()=>{}});const button={dataset:{addVehicle:pack.vehicles[0].id},disabled:false,hasAttribute:k=>k==='data-add-vehicle'},event={target:{closest:()=>button}};ui.click(event);active=b;resolve({});await new Promise(r=>setTimeout(r,0));assert.equal(a.vehicles,undefined);assert.equal(b.vehicles,undefined);rejected=true;ui.click(event);await new Promise(r=>setTimeout(r,0));assert.equal(b.vehicles,undefined);assert.deepEqual(errors,['unavailable']);
});
