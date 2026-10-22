// Prices use physical body size, independent of combat size overrides.
export const droidSystemUsesSize=record=>!!record.droidSystem&&(record.droidSystem.category==='locomotion'||['factor','locomotion','capacity'].includes(record.droidSystem.costModel)||['factor','accessory'].includes(record.droidSystem.weightModel));
export function droidSystemSize(entry,pack,c={}){
 if(entry.systemSize)return entry.systemSize;
 if(entry.armorSize)return entry.armorSize;
 const species=pack.species.find(s=>s.id===c.species),group=species?.creationChoices?.find(g=>g.kind==='size');
 return group?.options.find(o=>o.id===(c.speciesChoices?.[species.id]?.[group.id]??group.defaultOption))?.size||species?.size||'medium';
}

export function droidSystemQuote(record,entry,pack,c={}){
 const model=record.droidSystem,size=droidSystemSize(entry,pack,c),factor=pack.rules.droidSystems.costFactors[size];
 if(!Number.isFinite(factor))return {cost:null,weight:null,systemSize:size,purchasePending:true};
 const bucket=['fine','diminutive','tiny','small'].includes(size)?'small':size==='medium'?'medium':'large';
 const native=pack.species.find(s=>s.id===entry.droidGrant?.speciesId)?.droidChassis?.systems.find(s=>s.slot===entry.droidGrant.slot&&(s.alternatives||[s.id]).includes(record.id));
 const speed=native?.speed??model.movement?.[bucket],units=entry.systemUnits??1,ordinal=entry.systemOrdinal;
 let cost=record.cost,weight=record.weight;
 if(model.costModel==='manual')cost=null;
 else if(model.costModel==='factor')cost=cost===null?null:cost*factor;
 else if(model.costModel==='locomotion')cost=cost===null||speed===undefined?null:cost*factor*speed**2;
 else if(model.costModel==='capacity')cost=model.capacityBySize[size]===undefined||!Number.isInteger(units)||units<1||units>model.capacityBySize[size]?null:cost*units;
 // An unspecified installation number cannot silently omit the surcharge.
 if(model.category==='locomotion'){
  const extra=Number.isInteger(ordinal)&&ordinal>=1?pack.rules.droidSystems.additionalLocomotionCosts[ordinal-1]:undefined;
  cost=cost===null||extra===undefined?null:cost+extra*factor;
 }
 if(model.weightModel==='manual')weight=null;
 else if(model.weightModel==='factor')weight=weight===null?null:weight*factor;
 else if(model.weightModel==='accessory')weight=weight===null?null:weight*(bucket==='small'?2/factor:factor);
 return {cost,weight,systemSize:size,systemSpeed:speed,systemCapacity:model.costModel==='capacity'?units:undefined,purchasePending:cost===null};
}

export function validateDroidInventory(entry,record,pack,bad){
 for(const field of ['systemSize','systemUnits','systemOrdinal'])if(entry[field]!==undefined&&!record.droidSystem)bad('Droid System configuration');
 if(!record.droidSystem)return;
 if(entry.systemSize!==undefined&&!Object.hasOwn(pack.rules.droidSystems.costFactors,entry.systemSize))bad('Droid System size');
 if(entry.systemSize!==undefined&&entry.armorSize!==undefined&&entry.systemSize!==entry.armorSize)bad('Droid armor size');
 if(entry.systemUnits!==undefined&&(record.droidSystem.costModel!=='capacity'||!Number.isInteger(entry.systemUnits)||entry.systemUnits<1||entry.systemUnits>5000))bad('Droid compartment capacity');
 // Six means that the source supplies no price, not a five-system limit.
 if(entry.systemOrdinal!==undefined&&(record.droidSystem.category!=='locomotion'||!Number.isInteger(entry.systemOrdinal)||entry.systemOrdinal<1||entry.systemOrdinal>6))bad('Locomotion System number');
}

export function validateDroidSystemData(record,pack,bad){
 const d=record.droidSystem;if(d===undefined)return;
 if(!pack.rules.droidSystems)bad('Missing Droid System rules');
 const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),sizes=Object.keys(pack.rules.droidSystems?.costFactors||{});
 if(!object(d)||!Object.keys(d).every(k=>['category','costModel','weightModel','movement','processor','appendageDamage','vision','capacityBySize','builtIn','startingEligible'].includes(k)))bad('Droid System fields');
 if(d.startingEligible!==undefined&&d.startingEligible!==true)bad('Droid starting eligibility');
 if(!['locomotion','processor','appendage','accessory','upgrade','external','armor'].includes(d.category)||!['flat','factor','locomotion','capacity','manual'].includes(d.costModel)||!['flat','factor','accessory','manual'].includes(d.weightModel))bad('Droid System pricing model');
 if(d.costModel==='manual'&&record.cost!==null||d.weightModel==='manual'&&record.weight!==null)bad('Droid System manual price or weight');
 if(d.movement!==undefined){
  const m=d.movement;
  if(d.category!=='locomotion'||!object(m)||Object.keys(m).sort().join(',')!=='climbAllowed,climbPenalty,large,medium,small,terrain'||!['small','medium','large'].every(k=>Number.isInteger(m[k])&&m[k]>=0&&m[k]<=100)||!['normal','ignore','double'].includes(m.terrain)||![-5,0].includes(m.climbPenalty)||typeof m.climbAllowed!=='boolean')bad('Droid locomotion');
 }
 if(d.costModel==='locomotion'&&!d.movement)bad('Droid locomotion price');
 if(d.processor!==undefined&&(d.category!=='processor'||!['basic','heuristic'].includes(d.processor)))bad('Droid Processor');
 if(d.appendageDamage!==undefined&&(d.category!=='appendage'||!object(d.appendageDamage)||!Object.entries(d.appendageDamage).every(([size,die])=>sizes.includes(size)&&(die===null||typeof die==='string'&&/^(?:1|[1-9]\d*d[1-9]\d*)$/.test(die)))))bad('Droid appendage damage');
 if(d.vision!==undefined&&!['darkvision','low-light'].includes(d.vision))bad('Droid sensor vision');
 if(d.costModel==='capacity'&&(d.category!=='accessory'||!object(d.capacityBySize)||!Object.entries(d.capacityBySize).length||!Object.entries(d.capacityBySize).every(([size,n])=>sizes.includes(size)&&Number.isInteger(n)&&n>0&&n<=5000)))bad('Droid compartment limits');
 if(d.capacityBySize!==undefined&&d.costModel!=='capacity')bad('Droid compartment price');
 if(d.builtIn!==undefined&&(d.builtIn!==true||d.category!=='armor'||record.kind!=='armor'))bad('Built-in Droid armor');
}
