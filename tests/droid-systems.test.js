import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {chooseSpeciesOption} from '../src/species-choices.js';
import {resolveEquipment,purchaseQuote,equipmentFamilies} from '../src/equipment.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const entry=(id,fields={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:false,twoHanded:false,attackMod:0,damageMod:0,...fields});
const resolve=(id,fields={},c={})=>resolveEquipment(entry(id,fields),pack,c);

test('all official Droid System imports retain sources, articles, variants and reviewed pricing models',()=>{
 const systems=pack.equipment.filter(r=>r.droidSystem);assert.equal(systems.length,134);assert.equal(new Set(systems.map(r=>r.sourceId)).size,111);
 for(const r of systems){assert(r.article.blocks.length,r.name);assert(pack.sources.some(s=>s.id===r.sourceId&&s.revision>0),r.name);assert(pack.catalog.records.some(c=>c.mechanicsIds.includes(r.id)),r.name);}
 for(const [name,count] of [['Hardened Systems',4],['Shield Generator System',4],['Remote Processor',4],['Translator Unit',4],['Holographic Image Disguiser',2]])assert.equal(equipmentFamilies(pack,'gear').find(f=>f.name===name).records.length,count);
 validatePack(pack);
});
test('locomotion prices use source speeds squared and the explicit installation number',()=>{
 for(const [id,base,speeds] of [['walking',10,[4,6,8]],['wheeled',5,[6,8,10]],['tracked',20,[4,6,8]],['hovering',100,[6,6,6]],['flying',200,[9,12,12]]]){
  for(const [size,factor,i] of [['tiny',5,0],['small',2,0],['medium',1,1],['large',2,2],['colossal',20,2]]){
   for(const [j,fee]of [0,500,1000,2000,5000].entries()){
    const r=resolve(id,{systemSize:size,systemOrdinal:j+1});assert.equal(r.cost,(base*speeds[i]**2+fee)*factor);assert.equal(r.systemSpeed,speeds[i]);
   }
  }
 }
 assert.equal(resolve('walking').cost,null);assert.equal(resolve('walking',{systemOrdinal:6}).cost,null);
 assert.equal(resolve('stationary',{systemOrdinal:1}).cost,0);assert.equal(resolve('stationary',{systemOrdinal:2}).cost,500);
});
test('accessory weights invert size factors only for Small and smaller bodies',()=>{
 const id=pack.equipment.find(r=>r.family==='Hardened Systems'&&r.variant.replace(/\s/g,'')==='x2')?.id||pack.equipment.find(r=>r.family==='Hardened Systems').id;
 const base=pack.equipment.find(r=>r.id===id);
 for(const [size,factor] of Object.entries(pack.rules.droidSystems.costFactors)){
  const r=resolveEquipment({id,systemSize:size},pack),accessory=['fine','diminutive','tiny','small'].includes(size)?2/factor:factor;
  assert.equal(r.cost,base.cost*factor);assert.equal(r.weight,base.weight*accessory);
  assert.equal(resolve('hand',{systemSize:size}).weight,5*factor);
  assert.equal(resolve('droid-oil-bath',{systemSize:size}).weight,600*accessory);
 }
 assert.equal(resolve('improved-sensor-package',{systemSize:'tiny'}).weight,2.5);
 assert.equal(resolve('heuristic-processor',{systemSize:'large'}).weight,5);
});
test('Droid armor uses Droid factors rather than humanoid armor scaling and keeps license prices',()=>{
 const c=newCharacter(pack),small=entry('quadanium-plating',{systemSize:'small'}),q=purchaseQuote(small,1,pack,c);
 assert.equal(q.item.cost,5000);assert.equal(q.item.weight,10);assert.equal(q.item.wearerSize,'small');assert.equal(q.fee,250);assert.equal(q.total,5250);
 assert.equal(purchaseQuote(small,1,pack,c,{license:false}).total,5000);
 assert.equal(resolve('plasteel-shell',{systemSize:'large'}).cost,800);assert.equal(resolve('plasteel-shell',{systemSize:'large'}).weight,4);
 assert.equal(resolve('stormtrooper-armor',{armorSize:'small'}).weight,5);
});
test('compartment purchases preserve chosen capacity and reject unsupported body limits',()=>{
 const c=newCharacter(pack);c.inventory=[entry('compartment-space',{systemSize:'small',systemUnits:5})];validateCharacter(c,pack);
 let r=resolveEquipment(c.inventory[0],pack,c);assert.equal(r.cost,250);assert.equal(r.weight,null);assert(r.name.includes('5 kg'));
 assert.equal(resolve('compartment-space',{systemSize:'small',systemUnits:6}).cost,null);
 assert.equal(resolve('compartment-space',{systemSize:'tiny'}).cost,null);
 for(const systemUnits of [0,-1,1.5,NaN])assert.equal(resolve('compartment-space',{systemSize:'small',systemUnits}).cost,null);
 assert.equal(resolve('compartment-space',{systemSize:'colossal',systemUnits:5000}).cost,250000);
});
test('unknown prices and weights remain manual and negative receiver pricing never grants purchase credits',()=>{
 assert.equal(resolve('remote-receiver').cost,null);assert.equal(resolve('remote-receiver').weight,1);
 for(const id of ['extra-legs','jump-servos'])assert.equal(resolve(id).cost,null);
 assert.equal(resolve('walking',{systemOrdinal:1}).weight,null);
 assert.equal(resolve('walking',{systemOrdinal:1,weightOverride:12}).weight,12);
 assert.equal(purchaseQuote(entry('remote-receiver'),2,pack,{}).total,null);
});
test('default system size follows species choices while purchased parts retain their saved size',()=>{
 const c=newCharacter(pack);c.species='species:custom-droid';chooseSpeciesOption(c,pack,'size','small');
 assert.equal(resolve('walking',{systemOrdinal:1},c).cost,320);chooseSpeciesOption(c,pack,'size','medium');assert.equal(resolve('walking',{systemOrdinal:1},c).cost,360);
 const e=entry('hand',{systemSize:'small'});c.inventory=[e];assert.equal(resolveEquipment(e,pack,c).cost,100);validateCharacter(c,pack);
 const saved=JSON.parse(JSON.stringify(c));assert.equal(resolveEquipment(saved.inventory[0],pack,saved).systemSize,'small');
});
test('built-in armor preserves normal speed and heavy armor still limits running',()=>{
 const c=newCharacter(pack,{classId:'class:soldier'});c.species='species:custom-droid';chooseSpeciesOption(c,pack,'size','medium');
 c.inventory=[entry('neutronium-plating',{systemSize:'medium',equipped:true,weightOverride:0})];
 const d=derive(c,pack);assert.equal(d.speed,6);assert.equal(d.runMultiplier,3);validateCharacter(c,pack);
 c.species='species:human';assert.equal(derive(c,pack).armor,null);assert(derive(c,pack).issues.some(s=>s.includes('requires a Droid body')));
});
test('save validation rejects malformed Droid System configuration and rules data',()=>{
 const badConfigurations=[['hand',{systemSize:'wrong'}],['hand',{systemUnits:3}],['walking',{systemOrdinal:0}],['walking',{systemOrdinal:2.5}],['walking',{systemOrdinal:7}],['compartment-space',{systemUnits:-1}],['compartment-space',{systemUnits:1.5}],['compartment-space',{systemUnits:5001}],['blaster-pistol',{systemSize:'small'}],['plasteel-shell',{systemSize:'small',armorSize:'medium'}]];
 for(const [id,fields]of badConfigurations){const c=newCharacter(pack);c.inventory=[entry(id,fields)];assert.throws(()=>validateCharacter(c,pack),id+' '+JSON.stringify(fields));}
 for(const change of [p=>p.rules.droidSystems.costFactors.small=1,p=>p.rules.droidSystems.additionalLocomotionCosts.push(10000),p=>p.equipment.find(r=>r.id==='equipment:hand').droidSystem.appendageDamage.medium='Infinity',p=>p.equipment.find(r=>r.id==='equipment:walking').droidSystem.movement.climbAllowed='yes']){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
});
