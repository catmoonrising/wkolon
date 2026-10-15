import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,validateCharacter,derive} from '../src/rules.js';
import {startingEquipmentGrants,claimStartingEquipment,canRollStartingCredits,resolveEquipment,purchaseQuote} from '../src/equipment.js';
import {validatePack} from '../tools/validate-rules.js';
import {articleText} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=()=>Object.assign(newCharacter(pack,{classId:'class:scoundrel'}),{species:'species:kel-dor'});

test('reviewed grants preserve Kel Dor equipment text, replacement prices and unspecified weights',()=>{
 validatePack(pack);
 const c=hero(),g=startingEquipmentGrants(c,pack)[0];assert.equal(g.items.length,3);
 const source=pack.sources.find(s=>s.id===g.sourceId);assert.equal(source.title,'Kel Dor');assert.equal(source.revision,26685);assert.equal(source.section,'Special Equipment');
 const text=articleText(pack.rulePages.find(p=>p.sourceId===g.sourceId).article);
 assert(text.includes('begin play with these items at no cost'));assert(text.includes('poisonous to other'));assert(text.includes('200 credits'));
 claimStartingEquipment(c,pack,g.id);assert.equal(c.credits,0);
 const [mask,goggles,filters]=c.inventory.map(e=>resolveEquipment(e,pack,c));
 assert.equal(mask.cost,2000);assert.equal(goggles.cost,null);assert.equal(filters.cost,200);assert([mask,goggles,filters].every(e=>e.weight===null));
 assert.equal(purchaseQuote(c.inventory[0],1,pack,c).total,2000);
 assert.equal(purchaseQuote(c.inventory[1],1,pack,c).total,null);validateCharacter(c,pack);
});

test('equipment is granted once across edits, reloads, removal and species changes',()=>{
 const c=hero();claimStartingEquipment(c,pack,c.species);const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);
 assert(startingEquipmentGrants(saved,pack)[0].claimed);assert.throws(()=>claimStartingEquipment(saved,pack,saved.species),/unavailable/);
 saved.inventory=[];saved.species='species:human';assert.deepEqual(startingEquipmentGrants(saved,pack),[]);
 saved.species='species:kel-dor';assert.throws(()=>claimStartingEquipment(saved,pack,saved.species),/unavailable/);assert.equal(saved.inventory.length,0);
});

test('Jedi and species grants coexist without replacing owned or equipped equipment',()=>{
 const c=hero();c.levels[0].classId='class:jedi';
 claimStartingEquipment(c,pack,'class:jedi');const saber=c.inventory[0];assert(saber.equipped);
 claimStartingEquipment(c,pack,c.species);assert.equal(c.inventory.length,4);assert(c.inventory[0].equipped);assert.equal(c.credits,0);assert(canRollStartingCredits(c));
 assert(derive(c,pack).attacks.some(a=>a.name==='Lightsaber'));validateCharacter(c,pack);
 const owned=hero();owned.inventory=[{...saber,startingGrant:undefined}];owned.levels[0].classId='class:jedi';const previous=owned.inventory[0];
 assert.deepEqual(claimStartingEquipment(owned,pack,'class:jedi'),[]);assert.equal(owned.inventory[0],previous);assert.equal(owned.inventory.length,1);assert(!canRollStartingCredits(owned));
});

test('multiclass advancement grants no creation equipment and cannot roll starting credits',()=>{
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.levels.push({...structuredClone(c.levels[0]),classId:'class:jedi',hpRoll:5});
 assert.deepEqual(startingEquipmentGrants(c,pack),[]);assert.throws(()=>claimStartingEquipment(c,pack,'class:jedi'),/unavailable/);assert(!canRollStartingCredits(c));
});

test('free equipment allows starting credits, ordinary possessions and prior rolls block them',()=>{
 const c=hero();assert(canRollStartingCredits(c));claimStartingEquipment(c,pack,c.species);assert(canRollStartingCredits(c));
 c.credits=1;assert(!canRollStartingCredits(c));c.credits=0;c.startingCreditsRolled=true;assert(!canRollStartingCredits(c));
 delete c.startingCreditsRolled;delete c.inventory[0].startingGrant;assert(!canRollStartingCredits(c));
});

test('unknown gear weight stays unknown until entered and can be restored to unspecified',()=>{
 const c=hero();claimStartingEquipment(c,pack,c.species);let d=derive(c,pack);assert(d.weightUnknown);assert.equal(d.weight,0);
 c.inventory.forEach((e,i)=>e.weightOverride=(i+1)/10);d=derive(c,pack);assert(!d.weightUnknown);assert(Math.abs(d.weight-.6)<1e-10);validateCharacter(c,pack);
 delete c.inventory[0].weightOverride;assert(derive(c,pack).weightUnknown);
});

test('legacy saves still validate; forged claims, origins, quantities and rule references fail',()=>{
 validateCharacter(newCharacter(pack,{classId:'class:scoundrel'}),pack);
 const c=hero();claimStartingEquipment(c,pack,c.species);
 for(const mutate of [c=>c.startingEquipmentClaims=null,c=>c.startingEquipmentClaims.push(c.species),c=>c.startingEquipmentClaims=['species:human'],c=>c.inventory[0].startingGrant='class:jedi',c=>c.inventory[0].quantity=2,c=>c.startingCreditsRolled=1]){
  const bad=structuredClone(c);mutate(bad);assert.throws(()=>validateCharacter(bad,pack),/starting equipment|starting credits/);
 }
 const p=structuredClone(pack);p.species.find(s=>s.id===c.species).startingEquipment.items[0].equipmentId='equipment:missing';assert.throws(()=>validatePack(p),/Unknown equipment/);
 const full=hero();full.inventory=Array.from({length:1000},()=>({id:'equipment:medpac',quantity:1,equipped:false,twoHanded:false,attackMod:0,damageMod:0}));assert.throws(()=>claimStartingEquipment(full,pack,full.species),/full/);assert.equal(full.startingEquipmentClaims,undefined);assert.equal(full.inventory.length,1000);
});
