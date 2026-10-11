export const armorScale=size=>({small:.5,medium:1,large:2})[size]??1;
export function equipmentFamilies(pack,kind){
 const families=new Map();
 for(const r of pack.equipment.filter(r=>r.kind===kind)){
  const key=r.family||r.id;
  if(!families.has(key))families.set(key,{id:r.id,name:r.family||r.name,records:[]});
  families.get(key).records.push(r);
 }
 return [...families.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function resolveEquipment(e,pack,c={}){
 const r=pack.equipment.find(r=>r.id===e.id);
 if(!r)throw new Error('Unknown equipment');
 const options=(r.upgrades||[]).filter(u=>(e.options||[]).includes(u.id));
 const scale=r.kind==='armor'?armorScale(e.armorSize):1;
 const base=r.cost===null?null:r.cost*scale;
 let cost=base;
 if(cost!==null){
  const mini=options.find(u=>u.id==='miniaturized');
  if(mini)cost*=mini.costMultiplier;
  const functional=options.filter(u=>u.id!=='miniaturized');
  // The campaign's explicit pricing: the full quoted functionality fee is
  // added to the device price. With that switch off, quoted prices multiply.
  if(c.houseRules?.comlinkUpgradeFees===false)for(const u of functional)cost*=u.costMultiplier;
  else cost+=functional.reduce((n,u)=>n+base*u.costMultiplier,0);
 }
 const unknownWeight=options.some(u=>u.changesWeight);
 const weight=e.weightOverride??(unknownWeight?null:r.weight*scale);
 const tags=[r.variant,...options.map(u=>u.name),...(r.kind==='armor'&&e.armorSize&&e.armorSize!=='medium'?[e.armorSize.replace(/^./,s=>s.toUpperCase())]:[])].filter(Boolean);
 return {...r,cost,weight,name:r.family?`${r.family} (${tags.join(', ')})`:r.name+(tags.length?` (${tags.join(', ')})`:'')};
}
export function purchaseQuote(e,quantity,pack,c,{license=true,market='normal'}={}){
 const item=resolveEquipment(e,pack,c);
 const rating=(item.availability||[]).map(id=>pack.rules.licensing.ratings[id]).find(Boolean);
 const fee=rating&&license&&market!=='black-market'&&item.cost!==null?item.cost*rating.percent/100:0;
 const price=item.cost===null?null:item.cost*(market==='black-market'&&rating?rating.blackMarket:market==='offworld'&&item.availability.includes('rare')?2:1);
 return {item,rating,fee,total:price===null?null:(price+fee)*quantity,licenseStatus:fee?'pending':'none'};
}
export function validateInventoryOptions(e,pack,bad){
 const r=pack.equipment.find(r=>r.id===e.id);
 if(e.options!==undefined&&(!Array.isArray(e.options)||new Set(e.options).size!==e.options.length||e.options.some(id=>!r.upgrades?.some(u=>u.id===id))))bad('equipment options');
 if(e.armorSize!==undefined&&(r.kind!=='armor'||!['small','medium','large'].includes(e.armorSize)))bad('armor size');
 if(e.weightOverride!==undefined&&(!Number.isFinite(e.weightOverride)||e.weightOverride<0||e.weightOverride>1000000))bad('equipment weight');
 if(e.licenseStatus!==undefined&&!['none','pending','approved','denied'].includes(e.licenseStatus))bad('license status');
 if(e.mechanical!==undefined&&typeof e.mechanical!=='boolean')bad('mechanical equipment');
}
