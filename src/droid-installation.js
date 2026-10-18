import {droidSystemSize,droidSystemUsesSize,droidSystemQuote} from './droid-systems.js';
import {increaseNaturalDie} from './natural-weapons.js';
import {armorExclusive} from './armor.js';
import {UNARMED_ID} from './feature-choices.js';

const record=(pack,e)=>pack.equipment.find(r=>r.id===e.id);
const body=(c,pack)=>pack.species.find(s=>s.id===c.species);
const origin=e=>e.droidGrant||e.droidStarting;
const slot=(c,pack,name)=>c.inventory.find(e=>e.droidGrant?.speciesId===c.species&&e.droidGrant.slot===name);
const entry=(id,fields)=>({id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...fields});
const bucket=size=>['fine','diminutive','tiny','small'].includes(size)?'small':size==='medium'?'medium':'large';
export const droidStartingSpent=(c,speciesId=c.species)=>Math.round(c.inventory.reduce((n,e)=>n+(e.droidStarting?.speciesId===speciesId?e.droidStarting.paid:0),0)*1e9)/1e9;
export const startingSystemEligible=r=>!!r.droidSystem?.startingEligible;

// Called independently of module visibility. Once claimed, deleting a supplied
// part never grants another one. Editing body size refits only provided parts.
export function prepareDroidSystems(c,pack){
 const species=body(c,pack),grant=species.droidStartingPackage;
 const stacks=c.inventory.filter(e=>record(pack,e)?.droidSystem&&e.quantity>1);
 if(c.inventory.length+stacks.reduce((n,e)=>n+e.quantity-1,0)+(grant&&!c.droidSystems?.[species.id]?2:0)>1000)throw new Error('Inventory is full.');
 let changed=false;
 for(const e of stacks){
  const count=e.quantity,paid=e.droidStarting?.paid;
  e.quantity=1;if(e.droidStarting)e.droidStarting.paid=paid/count;
  for(let i=1;i<count;i++)c.inventory.push({...structuredClone(e),uid:crypto.randomUUID(),equipped:false});
  changed=true;
 }
 if(!grant)return changed;
 const size=droidSystemSize({},pack,c);
 if(!c.droidSystems?.[species.id]&&c.inventory.length>998)throw new Error('Inventory is full.');
 c.droidSystems??={};
 if(!c.droidSystems[species.id]){
  const cpu=entry(grant.processor,{droidGrant:{speciesId:species.id,slot:'processor'}}),locomotion=entry(grant.locomotionBySize[size],{systemSize:size,systemOrdinal:1,droidGrant:{speciesId:species.id,slot:'locomotion'}});
  c.inventory.push(cpu,locomotion);c.droidSystems[species.id]={prepared:true,locomotion:locomotion.uid,bipedal:false};changed=true;
 }
 for(const e of c.inventory.filter(e=>e.droidGrant?.speciesId===species.id&&e.droidGrant.slot!=='processor')){
  if(e.systemSize!==size){e.systemSize=size;changed=true;}
  if(e.droidGrant.slot==='locomotion'&&e.id!==grant.locomotionBySize[size]){e.id=grant.locomotionBySize[size];changed=true;}
 }
 return changed;
}
export function chooseDroidArm(c,pack,index,id){
 if(![1,2].includes(index)||!body(c,pack).droidStartingPackage)throw new Error('Starting arm unavailable');
 const r=pack.equipment.find(r=>r.id===id&&r.droidSystem?.appendageDamage);
 if(!r)throw new Error('Choose an arm appendage');
 const needed=(c.droidSystems?.[c.species]?0:2)+(slot(c,pack,'arm-'+index)?0:1);if(c.inventory.length+needed>1000)throw new Error('Inventory is full.');
 prepareDroidSystems(c,pack);const key='arm-'+index,old=slot(c,pack,key),fields={systemSize:droidSystemSize({},pack,c),droidGrant:{speciesId:c.species,slot:key}};
 if(old){old.id=id;old.systemSize=fields.systemSize;old.carried=true;old.equipped=true;delete old.weightOverride;}
 else {if(c.inventory.length>=1000)throw new Error('Inventory is full.');c.inventory.push(entry(id,fields));}
}
export function addStartingDroidSystem(c,pack,item,paid){
 const species=body(c,pack),r=record(pack,item);
 if(!species.droidStartingPackage||!startingSystemEligible(r)||!Number.isFinite(paid)||paid<0||droidStartingSpent(c)+paid>species.droidStartingPackage.credits)throw new Error('Starting allowance exceeded or item unavailable');
 const count=item.quantity??1;
 if(!Number.isInteger(count)||count<1||count>999||c.inventory.length+(c.droidSystems?.[c.species]?count:count+2)>1000)throw new Error('Inventory is full or quantity is invalid.');
 prepareDroidSystems(c,pack);const additions=[];
 const configs=Array.from({length:count},(_,i)=>({...item,...(r.droidSystem.category==='locomotion'?{systemOrdinal:Math.min(6,(item.systemOrdinal||6)+i)}:{})})),costs=configs.map(e=>droidSystemQuote(r,e,pack,c).cost),base=costs.every(n=>n!==null)?costs.reduce((a,b)=>a+b,0):0;
 for(const [i,config]of configs.entries())additions.push(entry(item.id,{...config,quantity:1,uid:crypto.randomUUID(),droidStarting:{speciesId:species.id,paid:base?paid*costs[i]/base:paid/count},equipped:false}));
 c.inventory.push(...additions);return additions[0];
}
export function installedDroidSystems(c,pack){
 const species=body(c,pack),enabled=!!(species.isDroid||species.usesDroidSystems),size=droidSystemSize({},pack,c);
 return enabled?c.inventory.filter(e=>{
  const r=record(pack,e);
  return r?.droidSystem&&e.equipped&&e.carried!==false&&(!e.droidGrant||e.droidGrant.speciesId===species.id)&&(!droidSystemUsesSize(r)||droidSystemSize(e,pack,c)===size)&&r.droidSystem.category!=='external';
 }):[];
}
export function droidSystemsState(c,pack){
 const species=body(c,pack),enabled=!!(species.isDroid||species.usesDroidSystems),grant=species.droidStartingPackage,size=droidSystemSize({},pack,c),saved=c.droidSystems?.[species.id];
 const installed=installedDroidSystems(c,pack),virtual=[];
 if(enabled&&grant&&!saved){
  virtual.push({id:grant.processor,quantity:1,equipped:true,droidGrant:{speciesId:species.id,slot:'processor'}},{id:grant.locomotionBySize[size],quantity:1,equipped:true,systemSize:size,systemOrdinal:1,droidGrant:{speciesId:species.id,slot:'locomotion'}});
 }
 const all=[...installed,...virtual],processors=all.filter(e=>record(pack,e).droidSystem.processor),locomotions=all.filter(e=>record(pack,e).droidSystem.movement);
 const processor=processors.length===1?record(pack,processors[0]).droidSystem.processor:null;
 const locomotion=locomotions.find(e=>e.uid===saved?.locomotion)||locomotions[0]||null;
 const movement=locomotion?record(pack,locomotion).droidSystem.movement:null;
 const sensors=all.map(e=>record(pack,e)).filter(r=>r.droidSystem.vision);
 const vision=sensors.some(r=>r.droidSystem.vision==='darkvision')?'darkvision':sensors.some(r=>r.droidSystem.vision==='low-light')?'low-light':null;
 const issues=[];
 const tracked=!!(grant||saved);
 if(enabled&&tracked&&species.isDroid&&!processor)issues.push(processors.length?'Choose one Processor':'Install a Processor');
 if(enabled&&grant)for(let i=1;i<=grant.appendages;i++)if(!slot(c,pack,'arm-'+i))issues.push('Choose arm '+i+' appendage');
 for(const e of c.inventory.filter(e=>e.equipped&&e.carried!==false&&record(pack,e)?.droidSystem&&(!e.droidGrant||e.droidGrant.speciesId===species.id))){
  const r=record(pack,e);if(enabled&&droidSystemUsesSize(r)&&droidSystemSize(e,pack,c)!==size)issues.push(r.name+' fits '+droidSystemSize(e,pack,c)+' Droids');
 }
 const humanoidArmor=!!saved?.bipedal&&all.filter(e=>e.id==='equipment:hand').reduce((n,e)=>n+e.quantity,0)>=2;
 return {enabled,size,humanoidArmor,prepared:!!saved,owned:c.inventory.filter(e=>record(pack,e)?.droidSystem),installed:all,virtual,processor,locomotion,movement,baseSpeed:movement?.[bucket(size)]??0,vision,perceptionBonus:Math.max(0,...sensors.map(r=>r.skillBonuses?.['skill:perception']||0)),inoperative:enabled&&tracked&&species.isDroid&&!processor,issues};
}
export function applyInstalledDroidSystems(species,c,pack){
 if(!species.isDroid&&!species.usesDroidSystems)return species;
 const s=droidSystemsState(c,pack);
 // Species without a reviewed system package retain their printed processor
 // and speed until their own stock chassis has been imported.
 if(!species.droidStartingPackage&&!c.droidSystems?.[species.id]&&!s.installed.length)return species;
 return {...species,...(s.processor||species.droidStartingPackage||c.droidSystems?.[species.id]?{heuristicProcessor:s.processor==='heuristic'}:{}),...(s.movement||species.droidStartingPackage||c.droidSystems?.[species.id]?{speed:s.baseSpeed}:{}),...(s.vision==='darkvision'||s.vision==='low-light'&&species.vision!=='darkvision'?{vision:s.vision}:{}),...(s.locomotion?.id==='equipment:flying'?{speeds:{...species.speeds,fly:s.baseSpeed}}:{})};
}
export function installDroidSystem(c,pack,uid,installed){
 const species=body(c,pack),e=c.inventory.find(e=>e.uid===uid),r=e&&record(pack,e);
 if(!r?.droidSystem||!species.isDroid&&!species.usesDroidSystems||r.droidSystem.category==='external')throw new Error('Droid System installation unavailable');
 if(installed&&droidSystemUsesSize(r)&&droidSystemSize(e,pack,c)!==droidSystemSize({},pack,c))throw new Error('Droid System size does not fit');
 if(installed&&e.droidGrant&&e.droidGrant.speciesId!==species.id)throw new Error('System belongs to another starting package');
 if(installed&&r.droidSystem.processor)for(const other of installedDroidSystems(c,pack))if(record(pack,other).droidSystem.processor)other.equipped=false;
 if(installed&&r.kind==='armor')for(const other of c.inventory)if(other!==e&&armorExclusive(r,record(pack,other)))other.equipped=false;
 e.equipped=installed;if(installed)e.carried=true;
 if(installed&&r.droidSystem.movement){c.droidSystems??={};c.droidSystems[species.id]??={prepared:true,locomotion:null};c.droidSystems[species.id].locomotion=e.uid;}
}
export function droidCarryingWeight(c,pack,e,weight){
 const o=origin(e);return o?.speciesId===c.species&&(body(c,pack).isDroid||body(c,pack).usesDroidSystems)&&record(pack,e)?.droidSystem.category!=='processor'?0:weight;
}
export function droidAppendageWeapons(c,pack,steps=0){
 if(!body(c,pack).isDroid&&!body(c,pack).usesDroidSystems)return [];
 return installedDroidSystems(c,pack).flatMap(e=>{
  const r=record(pack,e),base=r.droidSystem.appendageDamage?.[droidSystemSize({},pack,c)];if(!base)return [];
  const primaryAppendage=e.droidGrant?.speciesId===c.species&&e.droidGrant.slot==='arm-1';
  return [{id:UNARMED_ID,uid:primaryAppendage?c.id:e.uid,inventoryUid:e.uid,primaryAppendage,name:r.name+(e.droidGrant?.slot.startsWith('arm-')?' (Arm '+e.droidGrant.slot.slice(4)+')':''),kind:'weapon',mode:'melee',group:'simple-weapons',size:droidSystemSize({},pack,c),unarmed:true,droidAppendage:true,damage:increaseNaturalDie(base,steps,pack),damageType:'Bludgeoning',sourceId:r.sourceId,article:r.article}];
 });
}
export function validateDroidInstallation(c,pack,bad){
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v);
 const identities=new Map();for(const e of c.inventory)identities.set(e.uid,(identities.get(e.uid)||0)+1);
 for(const e of c.inventory)if(record(pack,e)?.droidSystem&&(!uuid(e.uid)||e.uid===c.id||identities.get(e.uid)!==1))bad('Droid System identity');
 if(c.droidSystems!==undefined){
  if(!obj(c.droidSystems)||Object.keys(c.droidSystems).length>pack.species.length)bad('Droid Systems state');
  for(const [id,s]of Object.entries(c.droidSystems)){
   if(!pack.species.some(r=>r.id===id&&(r.isDroid||r.usesDroidSystems))||!obj(s)||Object.keys(s).some(k=>!['prepared','locomotion','bipedal'].includes(k))||s.prepared!==true||s.bipedal!==undefined&&typeof s.bipedal!=='boolean'||s.locomotion!==null&&!uuid(s.locomotion))bad('Droid Systems state');
  }
 }
 const slots=new Set();
 for(const e of c.inventory)for(const key of ['droidGrant','droidStarting'])if(e[key]!==undefined){
  const o=e[key],species=obj(o)&&pack.species.find(s=>s.id===o.speciesId),r=record(pack,e);
  if(!species?.droidStartingPackage||!r.droidSystem||!uuid(e.uid)||!obj(o)||Object.keys(o).some(k=>!['speciesId',key==='droidGrant'?'slot':'paid'].includes(k))||!c.droidSystems?.[species.id]?.prepared||e.droidGrant&&e.droidStarting)bad('Droid starting equipment');
  if(key==='droidStarting'){if(!startingSystemEligible(r)||!Number.isFinite(o.paid)||o.paid<0||o.paid>species.droidStartingPackage.credits)bad('Droid starting allowance');}
  else{
   const id=o.speciesId+':'+o.slot;
   if(slots.has(id)||e.quantity!==1||!['processor','locomotion','arm-1','arm-2'].includes(o.slot))bad('Droid starting slot');slots.add(id);
   if(o.slot==='processor'&&e.id!==species.droidStartingPackage.processor||o.slot==='locomotion'&&!Object.values(species.droidStartingPackage.locomotionBySize).includes(e.id)||o.slot.startsWith('arm-')&&!r.droidSystem.appendageDamage)bad('Droid starting part');
  }
 }
 for(const species of pack.species.filter(s=>s.droidStartingPackage))if(droidStartingSpent(c,species.id)>species.droidStartingPackage.credits)bad('Droid starting allowance');
}
