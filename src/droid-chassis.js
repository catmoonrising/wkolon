import {droidSystemQuote} from './droid-systems.js';

const speciesFor=(c,pack)=>pack.species.find(s=>s.id===c.species);
const record=(id,pack)=>pack.equipment.find(e=>e.id===id);
const nativeIds=s=>s.alternatives||[s.id];
const entryFor=(s,species,id=s.id)=>({id,quantity:1,systemSize:species.size,...(s.units?{systemUnits:s.units}:{}),...(s.ordinal?{systemOrdinal:s.ordinal}:{})});
export function chassisSlot(species,slot){return species?.droidChassis?.systems.find(s=>s.slot===slot);}
export function chassisSpeed(c,pack,entry){
 const species=speciesFor(c,pack),slot=entry?.droidGrant?.speciesId===species.id&&chassisSlot(species,entry.droidGrant.slot);
 return slot&&nativeIds(slot).includes(entry.id)?slot.speed:undefined;
}
export function chassisVirtualSystems(species){
 return (species.droidChassis?.systems||[]).map(s=>({...entryFor(s,species),equipped:true,carried:true,twoHanded:false,attackMod:0,damageMod:0,droidGrant:{speciesId:species.id,slot:s.slot,baseId:s.id}}));
}
export function prepareChassis(c,pack){
 const species=speciesFor(c,pack);
 if(!species.droidChassis||c.droidSystems?.[species.id])return false;
 const rows=chassisVirtualSystems(species).map(e=>({...e,uid:crypto.randomUUID()}));
 if(c.inventory.length+rows.length>1000)throw new Error('Inventory is full.');
 c.inventory.push(...rows);c.droidSystems??={};c.droidSystems[species.id]={prepared:true,locomotion:rows.find(e=>record(e.id,pack).droidSystem.movement)?.uid||null,bipedal:false,gmChanges:false};
 return true;
}
function quote(c,pack,species,slot,item){
 const r=record(item.id,pack),q=droidSystemQuote(r,item,pack,c);
 if(q.cost!==null&&r.droidSystem.movement&&nativeIds(slot).includes(r.id)&&slot.speed!==undefined){
  const factor=pack.rules.droidSystems.costFactors[species.size];
  q.cost+=r.cost*factor*(slot.speed**2-q.systemSpeed**2);
 }
 return q.cost;
}
export function chassisSwapAllowed(c,pack,entry,id){
 const species=speciesFor(c,pack),slot=entry?.droidGrant?.speciesId===species.id&&chassisSlot(species,entry.droidGrant.slot),candidate=record(id,pack);
 if(!slot||!candidate?.droidSystem||candidate.droidSystem.category==='external')return false;
 if(nativeIds(slot).includes(id))return true;
 const basis=entry.droidGrant.baseId||slot.id;
 if(!nativeIds(slot).includes(basis))return false;
 const initial=entryFor(slot,species,basis),replacement=entryFor(slot,species,id);
 if(candidate.droidSystem.costModel!=='capacity')delete replacement.systemUnits;
 if(candidate.droidSystem.category!=='locomotion')delete replacement.systemOrdinal;
 else if(!replacement.systemOrdinal)return false;
 const base=quote(c,pack,species,slot,initial),cost=quote(c,pack,species,slot,replacement);
 return base!==null&&cost!==null&&Math.abs(cost-base)<=base*species.droidChassis.swapTolerance+1e-7;
}
export function swapChassisSystem(c,pack,uid,id){
 const e=c.inventory.find(e=>e.uid===uid);
 if(!chassisSwapAllowed(c,pack,e,id))throw new Error('Choose a system within 10% of the original cost');
 const species=speciesFor(c,pack),slot=chassisSlot(species,e.droidGrant.slot),r=record(id,pack);
 e.id=id;e.equipped=true;e.carried=true;delete e.weightOverride;delete e.systemUnits;delete e.systemOrdinal;
 if(nativeIds(slot).includes(id))e.droidGrant.baseId=id;
 if(r.droidSystem.costModel==='capacity')e.systemUnits=slot.units||1;
 if(r.droidSystem.category==='locomotion')e.systemOrdinal=slot.ordinal;
 if(r.droidSystem.processor)for(const other of c.inventory)if(other!==e&&other.equipped&&record(other.id,pack)?.droidSystem?.processor)other.equipped=false;
 if(r.kind==='armor')for(const other of c.inventory)if(other!==e&&other.equipped&&record(other.id,pack)?.droidSystem?.builtIn)other.equipped=false;
 return e;
}
export function validateChassisData(species,pack,bad){
 const d=species.droidChassis;if(d===undefined)return;
 if(!species.isDroid||!species.noConstitution||species.droidStartingPackage||!d||Object.keys(d).sort().join()!=='swapTolerance,systems'||d.swapTolerance!==.1||!Array.isArray(d.systems)||!d.systems.length||d.systems.length>100||new Set(d.systems.map(s=>s?.slot)).size!==d.systems.length){bad('Droid chassis');return;}
 for(const s of d.systems){
  const r=s&&record(s.id,pack);
  if(!s||Object.keys(s).some(k=>!['slot','id','units','speed','ordinal','alternatives'].includes(k))||!/^chassis-[1-9]\d*$/.test(s.slot)||!r?.droidSystem||s.units!==undefined&&(r.droidSystem.costModel!=='capacity'||!Number.isInteger(s.units)||s.units<1)||s.speed!==undefined&&(!r.droidSystem.movement||!Number.isInteger(s.speed)||s.speed<0)||s.ordinal!==undefined&&(!r.droidSystem.movement||!Number.isInteger(s.ordinal)||s.ordinal<1||s.ordinal>5)||s.alternatives!==undefined&&(!Array.isArray(s.alternatives)||!s.alternatives.includes(s.id)||!s.alternatives.every(id=>record(id,pack)?.droidSystem?.movement)))bad('Droid chassis system');
 }
}
export function validateChassisGrant(c,pack,e,species,bad){
 const slot=chassisSlot(species,e.droidGrant.slot);
 if(!slot||!nativeIds(slot).includes(e.droidGrant.baseId)||!chassisSwapAllowed({...c,species:species.id},pack,e,e.id))bad('Droid chassis grant');
 const r=record(e.id,pack);
 if(r.droidSystem.costModel==='capacity'&&e.systemUnits!==(slot.units||1)||r.droidSystem.movement&&e.systemOrdinal!==slot.ordinal)bad('Droid chassis configuration');
}
