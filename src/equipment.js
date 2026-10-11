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
 const mode=r.modes?.find(m=>m.id===(e.weaponMode||r.modes[0].id));
 const launcher=r.launchers?.find(l=>l.id===(e.launcher||r.launchers[0].id));
 const ammunition=r.ammunition&&pack.equipment.find(w=>w.id===e.ammunitionId);
 if(mode)tags.push(mode.name);
 if(launcher&&launcher.id!=='hand')tags.push(launcher.name);
 if(ammunition)tags.push(ammunition.name);
 if(e.fireMode==='autofire')tags.push('Autofire');
 const throwing=e.attackStyle==='thrown'&&(mode?.thrown??r.thrown);
 if(throwing)tags.push('Thrown');
 return {...r,...mode,...(launcher?{rangeType:launcher.rangeType,accurate:launcher.accurate}:{}),...(ammunition?{damage:ammunition.damage,damageType:ammunition.damageType,areaType:ammunition.areaType,stunDamage:ammunition.stunDamage}:{}),...(throwing?{mode:'ranged',rangeType:'thrown'}:{}),id:r.id,cost,weight,name:r.family?`${r.family} (${tags.join(', ')})`:r.name+(tags.length?` (${tags.join(', ')})`:'')};
}
export function purchaseQuote(e,quantity,pack,c,{license=true,market='normal',benefits={}}={}){
 const item=resolveEquipment(e,pack,c);
 const rating=(item.availability||[]).map(id=>pack.rules.licensing.ratings[id]).find(Boolean);
 const multiplier=market==='black-market'&&rating?Math.max(1,rating.blackMarket-(benefits.blackMarketReduction||0)):market==='offworld'&&item.availability.includes('rare')?2:1;
 const price=item.cost===null?null:item.cost*multiplier;
 const connections=!!rating&&price!==null&&market!=='black-market'&&(benefits.licenseAllowance||0)>0&&price*quantity<=benefits.licenseAllowance;
 const fee=rating&&license&&market!=='black-market'&&!connections&&item.cost!==null?item.cost*rating.percent/100:0;
 return {item,rating,fee,connections,total:price===null?null:(price+fee)*quantity,licenseStatus:connections?'approved':fee?'pending':'none'};
}
export function validateInventoryOptions(e,pack,bad){
 const r=pack.equipment.find(r=>r.id===e.id);
 if(e.options!==undefined&&(!Array.isArray(e.options)||new Set(e.options).size!==e.options.length||e.options.some(id=>!r.upgrades?.some(u=>u.id===id))))bad('equipment options');
 if(e.armorSize!==undefined&&(r.kind!=='armor'||!['small','medium','large'].includes(e.armorSize)))bad('armor size');
 if(e.weightOverride!==undefined&&(!Number.isFinite(e.weightOverride)||e.weightOverride<0||e.weightOverride>1000000))bad('equipment weight');
 if(e.licenseStatus!==undefined&&!['none','pending','approved','denied'].includes(e.licenseStatus))bad('license status');
 if(e.mechanical!==undefined&&typeof e.mechanical!=='boolean')bad('mechanical equipment');
 if(e.carried!==undefined&&typeof e.carried!=='boolean')bad('carried equipment');
 if(e.distance!==undefined&&(r.kind!=='weapon'||!Number.isInteger(e.distance)||e.distance<0||e.distance>100000))bad('weapon distance');
 if(e.weaponMode!==undefined&&!r.modes?.some(m=>m.id===e.weaponMode))bad('weapon mode');
 if(e.attackStyle!==undefined&&(!(r.thrown||r.modes?.some(m=>m.thrown))||!['melee','thrown'].includes(e.attackStyle)||e.attackStyle==='thrown'&&!(r.modes?.find(m=>m.id===(e.weaponMode||r.modes[0].id))?.thrown??r.thrown)))bad('attack style');
 if(e.launcher!==undefined&&!r.launchers?.some(l=>l.id===e.launcher))bad('weapon launcher');
 if(e.fireMode!==undefined&&(!r.autofire||r.autofireOnly||!['single','autofire'].includes(e.fireMode)))bad('fire mode');
 if(e.ammunitionId!==undefined&&(r.ammunition!=='grenade'||!pack.equipment.some(w=>w.id===e.ammunitionId&&['equipment:frag-grenade','equipment:ion-grenade','equipment:stun-grenade'].includes(w.id))))bad('grenade ammunition');
}
