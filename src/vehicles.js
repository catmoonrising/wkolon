import {validateReferencePage} from './reference-library.js';
import {articleText,wikiURL} from './wiki-content.js';
export const VEHICLE_TYPES={'airspeeder':'Airspeeder','capital-ship':'Capital Ship','space-transport':'Space Transport',speeder:'Speeder',starfighter:'Starfighter',walker:'Walker',tracked:'Tracked',wheeled:'Wheeled','space-station':'Space Station',stock:'Stock'};
export const VEHICLE_LISTS={'airspeeder':'Airspeeders','capital-ship':'Capital Ships','space-transport':'Space Transports',speeder:'Speeders',starfighter:'Starfighters',walker:'Walkers',tracked:'Tracked Vehicles',wheeled:'Wheeled Vehicles','space-station':'Space Stations',stock:'Stock Starships'};
export function validateVehicleReferences(pack,index,stockPage=null){
 let templates=new Map();if(pack.vehicles?.some(v=>v.stockTemplate)){const ref=index.records.find(r=>r.name==='Stock Starships');if(!stockPage||!ref)throw new Error('Missing stock template article');validateReferencePage(stockPage,ref,index);const table=stockPage.article.blocks.find(n=>n.tag==='table');const visit=function*(n){if(n&&typeof n==='object'){if(n.tag==='tr')yield n;for(const c of n.children||[])yield*visit(c);}};for(const row of visit(table)){const cells=row.children.filter(n=>n?.tag==='td').map(n=>articleText({blocks:[n]}).trim());if(cells.length===11)templates.set(cells[0],cells[1]);}if(templates.size!==12)throw new Error('Invalid stock template table');}
 const refs=new Map(index.records.map(r=>[r.id,r])),bySource=new Map(index.records.map(r=>[r.source.id,r])),sources=new Map(pack.sources.map(s=>[s.id,s]));
 const sourceMatches=ref=>{const s=sources.get(ref?.source.id);return s&&!s.section&&Object.keys(ref.source).every(k=>s[k]===ref.source[k]);};
 for(const v of pack.vehicles||[]){
  const ref=refs.get(v.referenceId);if(!ref||ref.name!==(v.stockTemplate?'Stock Starships':v.name)||ref.source.id!==v.sourceId||!sourceMatches(ref))throw new Error('Changed vehicle reference: '+v.name);
  if(v.stockTemplate&&(templates.get(v.stockTemplate)!==v.listings[0].size))throw new Error('Changed stock template: '+v.name);
  for(const l of v.listings){const parent=bySource.get(l.sourceId);if(!parent||parent.name!==VEHICLE_LISTS[l.type]||!sourceMatches(parent))throw new Error('Changed vehicle listing: '+v.name);}
 }
 return pack;
}
export function validateVehicleData(r,pack,bad){
 const obj=v=>v&&typeof v==='object'&&!Array.isArray(v),short=v=>v===null||typeof v==='string'&&v.length<=100;
 if(!obj(r)||Object.keys(r).sort().join(',')!==(r.stockTemplate?'automation,id,listings,name,referenceId,sourceId,stockTemplate':'automation,id,listings,name,referenceId,sourceId')||!/^reference:[a-f0-9]{16}$/.test(r.referenceId)||r.sourceId!=='source:'+r.referenceId.replace(':','-')||r.automation!=='manual'||!pack.sources.some(s=>s.id===r.sourceId&&s.title===(r.stockTemplate?'Stock Starships':r.name)&&!s.section))bad('Vehicle reference');
 if(r.stockTemplate!==undefined&&(typeof r.stockTemplate!=='string'||!r.stockTemplate||r.name!=='Stock '+r.stockTemplate||r.id!=='vehicle:stock-'+r.stockTemplate.toLowerCase().replace(/[^a-z0-9]+/g,'-')||r.listings?.length!==1||r.listings[0].type!=='stock'||r.listings[0].sourceId!==r.sourceId||r.listings[0].challengeLevel!==null))bad('Stock template');
 if(!r.stockTemplate&&r.listings?.some(l=>l.type==='stock'))bad('Stock template declaration');
 if(!Array.isArray(r.listings)||!r.listings.length||r.listings.length>100)bad('Vehicle listings');
 for(const l of r.listings)if(!obj(l)||Object.keys(l).sort().join(',')!=='challengeLevel,section,size,sourceId,type,url'||!Object.hasOwn(VEHICLE_TYPES,l.type)||!short(l.size)||!short(l.challengeLevel)||typeof l.section!=='string'||l.section.length>200||!wikiURL(l.url)||!pack.sources.some(s=>s.id===l.sourceId))bad('Vehicle listing');
}
export function validateOwnedVehicles(c,pack,bad){
 if(c.vehicles===undefined)return;
 if(!Array.isArray(c.vehicles)||c.vehicles.length>100)bad('Owned vehicles');
 const ids=new Set();for(const v of c.vehicles){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).sort().join(',')!=='name,uid,vehicleId'||typeof v.uid!=='string'||!/^[a-f0-9-]{36}$/.test(v.uid)||ids.has(v.uid)||!pack.vehicles?.some(r=>r.id===v.vehicleId)||typeof v.name!=='string'||v.name.length>100||/[\r\n\x00]/.test(v.name))bad('Owned vehicle');ids.add(v.uid);}
}
export function addOwnedVehicle(c,pack,id){
 if(!pack.vehicles?.some(r=>r.id===id))throw new Error('Unknown vehicle');if((c.vehicles||[]).length>=100)throw new Error('Vehicle limit reached');
 const v={uid:crypto.randomUUID(),vehicleId:id,name:''};c.vehicles=[...(c.vehicles||[]),v];return v;
}
export function nameOwnedVehicle(c,pack,uid,name){
 const v=c.vehicles?.find(v=>v.uid===uid);if(!v)throw new Error('Unknown vehicle');const copy={...c,vehicles:c.vehicles.map(r=>r===v?{...r,name}:r)};validateOwnedVehicles(copy,pack,message=>{throw new Error('Invalid '+message);});v.name=name;
}
export function removeOwnedVehicle(c,uid){if(c.vehicles)c.vehicles=c.vehicles.filter(v=>v.uid!==uid);}
