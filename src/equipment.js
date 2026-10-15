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
 const scale=r.kind==='armor'&&!r.energyShield?armorScale(r.wearerSize||e.armorSize):1;
 const base=r.cost===null?null:(r.retractableStock&&e.stockPosition==='none'?r.retractableStock.withoutCost:r.cost)*scale;
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
 const weight=e.weightOverride??(unknownWeight||r.weight===null?null:r.weight*scale);
 const tags=[r.variant,...options.map(u=>u.name),...(r.kind==='armor'&&!r.energyShield&&(r.wearerSize||e.armorSize)&&(r.wearerSize||e.armorSize)!=='medium'?[(r.wearerSize||e.armorSize).replace(/^./,s=>s.toUpperCase())]:[])].filter(Boolean);
 const mode=r.modes?.find(m=>m.id===(e.weaponMode||r.modes[0].id));
 const launcher=r.launchers?.find(l=>l.id===(e.launcher||r.launchers[0].id));
 const ammunition=r.ammunition&&pack.equipment.find(w=>w.id===e.ammunitionId);
 if(mode)tags.push(mode.name);
 if(launcher&&launcher.id!=='hand')tags.push(launcher.name);
 if(ammunition)tags.push(ammunition.name);
 if(e.fireMode==='autofire')tags.push('Autofire');
 if(r.retractableStock&&e.stockPosition==='folded')tags.push('Stock Folded');
 if(r.retractableStock&&e.stockPosition==='none')tags.push('No Stock');
 const throwing=e.attackStyle==='thrown'&&(mode?.thrown??r.thrown);
 if(throwing)tags.push('Thrown');
 const stun=!!ammunition?.stunOnly||!!r.stunOnly||e.damageSetting==='stun';
 const damageType=stun?(r.stunDamageType||ammunition?.damageType||r.damageType)+' (Stun)':ammunition?.damageType||r.damageType;
 if(stun&&!r.stunOnly&&!ammunition?.stunOnly)tags.push('Stun');
 return {...r,...mode,...(launcher?{rangeType:launcher.rangeType,accurate:launcher.accurate}:{}),...(ammunition?{damage:ammunition.damage,areaType:ammunition.areaType,stunDamage:ammunition.stunDamage}:{}),...(stun&&r.stunDamage?{damage:r.stunDamage}:{}),...(r.retractableStock&&e.stockPosition==='folded'?{group:'pistols',rangeType:'pistols'}:{}),...(throwing?{mode:'ranged',rangeType:'thrown'}:{}),damageType,damageEffect:stun?'stun':damageType==='Ion'?'ion':'normal',id:r.id,cost,weight,name:r.family?`${r.family} (${tags.join(', ')})`:r.name+(tags.length?` (${tags.join(', ')})`:'')};
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
 if(e.armorSize!==undefined&&(r.kind!=='armor'||r.energyShield||!['small','medium','large'].includes(e.armorSize)))bad('armor size');
 if(r.wearerSize&&e.armorSize!==undefined&&e.armorSize!==r.wearerSize)bad('stock armor size');
 if(e.weightOverride!==undefined&&(!Number.isFinite(e.weightOverride)||e.weightOverride<0||e.weightOverride>1000000))bad('equipment weight');
 if(e.licenseStatus!==undefined&&!['none','pending','approved','denied'].includes(e.licenseStatus))bad('license status');
 if(e.mechanical!==undefined&&typeof e.mechanical!=='boolean')bad('mechanical equipment');
 if(e.activated!==undefined&&(r.group!=='lightsabers'||typeof e.activated!=='boolean'))bad('Lightsaber activation');
 if(e.carried!==undefined&&typeof e.carried!=='boolean')bad('carried equipment');
 if(e.distance!==undefined&&(r.kind!=='weapon'||!Number.isInteger(e.distance)||e.distance<0||e.distance>100000))bad('weapon distance');
 if(e.weaponMode!==undefined&&!r.modes?.some(m=>m.id===e.weaponMode))bad('weapon mode');
 if(e.attackStyle!==undefined&&(!(r.thrown||r.modes?.some(m=>m.thrown))||!['melee','thrown'].includes(e.attackStyle)||e.attackStyle==='thrown'&&!(r.modes?.find(m=>m.id===(e.weaponMode||r.modes[0].id))?.thrown??r.thrown)))bad('attack style');
 if(e.launcher!==undefined&&!r.launchers?.some(l=>l.id===e.launcher))bad('weapon launcher');
 if(e.fireMode!==undefined&&(!r.autofire||r.autofireOnly||!['single','autofire'].includes(e.fireMode)))bad('fire mode');
 if(e.ammunitionId!==undefined&&(r.ammunition!=='grenade'||!pack.equipment.some(w=>w.id===e.ammunitionId&&['equipment:frag-grenade','equipment:ion-grenade','equipment:stun-grenade'].includes(w.id))))bad('grenade ammunition');
 if(e.stockPosition!==undefined&&(!r.retractableStock||!['none','extended','folded'].includes(e.stockPosition)))bad('stock position');
 if(e.oneHanded!==undefined&&(r.kind!=='weapon'||r.mode!=='ranged'||typeof e.oneHanded!=='boolean'))bad('weapon grip');
 if(e.aimed!==undefined&&(r.kind!=='weapon'||typeof e.aimed!=='boolean'))bad('aim');
 if(e.damageSetting!==undefined&&(!r.stunDamage||!['normal','stun'].includes(e.damageSetting)))bad('damage setting');
 if(e.targetKind!==undefined&&(r.kind!=='weapon'||!['creature','object','vehicle'].includes(e.targetKind)))bad('attack target');
 if(e.scopeUid!==undefined&&(!['pistols','rifles'].includes(r.group)||typeof e.scopeUid!=='string'||!/^[a-f0-9-]{36}$/.test(e.scopeUid)))bad('targeting scope');
}

export function attachedScope(entry,c,pack){
 if(!entry.scopeUid)return undefined;
 const item=c.inventory?.find(e=>e.uid===entry.scopeUid);
 return item&&item.carried!==false?pack.equipment.find(r=>r.id===item.id&&r.scope):undefined;
}
export function validateAttachments(c,pack,bad){
 const use=new Map();
 for(const e of c.inventory)if(e.scopeUid!==undefined){
  const item=c.inventory.find(item=>item.uid===e.scopeUid);
  if(!item||!pack.equipment.find(r=>r.id===item.id)?.scope)bad('targeting scope reference');
  const n=(use.get(e.scopeUid)||0)+1;use.set(e.scopeUid,n);
  if(n>item.quantity)bad('targeting scope quantity');
 }
}

// Grants are explicit, once per character, and only belong to level-one
// species/class creation. Inventory edits never replenish a claimed grant.
export function startingEquipmentGrants(c,pack){
 if(c.levels.length!==1)return [];
 return [pack.species.find(r=>r.id===c.species),!c.levels[0].pendingClass&&pack.classes.find(r=>r.id===c.levels[0].classId)]
  .filter(r=>r?.startingEquipment)
  .map(r=>({...r.startingEquipment,id:r.id,claimed:(c.startingEquipmentClaims||[]).includes(r.id)}));
}
export function claimStartingEquipment(c,pack,id){
 const grant=startingEquipmentGrants(c,pack).find(g=>g.id===id);
 if(!grant||grant.claimed)throw new Error('Starting equipment is unavailable.');
 const additions=grant.items.flatMap(item=>{
  const owned=c.inventory.filter(e=>e.id===item.equipmentId).reduce((n,e)=>n+e.quantity,0);
  return owned>=item.quantity?[]:[{id:item.equipmentId,uid:crypto.randomUUID(),quantity:item.quantity-owned,startingGrant:id,carried:true,equipped:pack.equipment.find(r=>r.id===item.equipmentId).kind==='weapon',twoHanded:false,attackMod:0,damageMod:0}];
 });
 if(c.inventory.length+additions.length>1000)throw new Error('Inventory is full.');
 c.inventory.push(...additions);
 c.startingEquipmentClaims=[...(c.startingEquipmentClaims||[]),id];
 return additions;
}
export function canRollStartingCredits(c){
 return c.levels.length===1&&!c.levels[0].pendingClass&&!c.startingCreditsRolled&&!c.credits&&!c.inventory.some(e=>!e.startingGrant);
}
export function validateStartingEquipment(c,pack,bad){
 const grants=new Map([...pack.species,...pack.classes].filter(r=>r.startingEquipment).map(r=>[r.id,r.startingEquipment]));
 const claims=c.startingEquipmentClaims||[];
 if(c.startingEquipmentClaims!==undefined&&(!Array.isArray(claims)||new Set(claims).size!==claims.length||claims.some(id=>!grants.has(id))))bad('starting equipment claims');
 if(c.startingCreditsRolled!==undefined&&typeof c.startingCreditsRolled!=='boolean')bad('starting credits');
 for(const e of c.inventory){
  if(e.startingGrant!==undefined&&(!claims.includes(e.startingGrant)||!grants.get(e.startingGrant)?.items.some(item=>item.equipmentId===e.id)))bad('starting equipment origin');
 }
 for(const id of claims)for(const item of grants.get(id).items){
  if(c.inventory.filter(e=>e.startingGrant===id&&e.id===item.equipmentId).reduce((n,e)=>n+e.quantity,0)>item.quantity)bad('starting equipment quantity');
 }
}
