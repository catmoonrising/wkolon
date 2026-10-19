import {VEHICLE_TYPES,addOwnedVehicle,nameOwnedVehicle,removeOwnedVehicle} from './vehicles.js';
import {automationBadge} from './feature-status.js';
import {createListSort} from './list-sort.js';
import {displayText,escapeHTML as escape} from './wiki-content.js';
const unique=values=>[...new Set(values.filter(v=>v!==null))];
export function createVehiclesUI(pack,{current,changed,save,error,library,refresh}){
 let index=null,pending=null,failure=false;const search=new Map();const drafts=new Map(),adding=new Set();
 const draft=()=>{const id=current().id;if(!drafts.has(id))drafts.set(id,{query:'',type:'',offset:0});return drafts.get(id);};
 const sort=createListSort([{key:'name',label:'Vehicle'},{key:'type',label:'Type',get:r=>unique(r.listings.map(l=>VEHICLE_TYPES[l.type])).join(', ')},{key:'size',label:'Size',get:r=>unique(r.listings.map(l=>l.size)).join(', ')},{key:'cl',label:'CL',numeric:true,get:r=>{const values=r.listings.map(l=>/^CL (\d+)$/.exec(l.challengeLevel||'')).filter(Boolean).map(m=>Number(m[1]));return values.length?Math.max(...values):null;}}]);
 function repaint(){refresh?.(results());}
 function load(){if(index)return Promise.resolve(index);if(!pending){failure=false;pending=library.load().then(value=>{index=new Map(value.records.map(r=>[r.id,r]));for(const r of pack.vehicles)search.set(r.id,(r.name+' '+(index.get(r.referenceId)?.searchText||'')).toLocaleLowerCase());return value;}).catch(e=>{failure=true;throw e;}).finally(()=>{pending=null;repaint();});}return pending;}
 function matches(){const d=draft(),terms=d.query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);return sort.rows(pack.vehicles.filter(r=>(!d.type||r.listings.some(l=>l.type===d.type))&&terms.every(term=>(search.get(r.id)||r.name.toLocaleLowerCase()).includes(term))));}
 function results(){
  if(!index)return failure?'<p role="alert">Catalog unavailable. <button type="button" data-vehicle-retry>Retry</button></p>':'<p role="status">Loading…</p>';
  const d=draft(),found=matches();d.offset=Math.min(d.offset,Math.max(0,Math.floor((found.length-1)/50)*50));const rows=found.slice(d.offset,d.offset+50);
  return `<div class="table-scroll"><table class="vehicle-catalog"><thead><tr><th></th>${sort.headers()}</tr></thead><tbody>${rows.map(r=>`<tr><td><button type="button" data-add-vehicle="${r.id}" ${adding.has(current().id+':'+r.id)||(current().vehicles||[]).length>=100?'disabled':''}>Add owned</button></td><td><button type="button" class="rule-link" data-rule-reference="${r.referenceId}">${escape(displayText(r.name))}</button>${automationBadge(r)}</td><td>${escape(unique(r.listings.map(l=>VEHICLE_TYPES[l.type])).join(', '))}</td><td>${escape(unique(r.listings.map(l=>l.size)).join(', ')||'?')}</td><td>${escape(unique(r.listings.map(l=>l.challengeLevel)).join(', ')||'?')}</td></tr>`).join('')}</tbody></table></div><span role="status">${found.length?d.offset+1+'–'+(d.offset+rows.length)+' / ':''}${found.length}</span>${found.length>50?` <button type="button" data-vehicle-page="prev" ${d.offset===0?'disabled':''}>Previous</button> <button type="button" data-vehicle-page="next" ${d.offset+50>=found.length?'disabled':''}>Next</button>`:''}`;
 }
 function owned(){return (current().vehicles||[]).map(v=>{const r=pack.vehicles.find(r=>r.id===v.vehicleId);return `<div class="owned-vehicle"><div class="actions"><button type="button" class="rule-link" data-rule-reference="${r.referenceId}">${escape(displayText(r.name))}</button>${automationBadge(r)}<button type="button" data-remove-vehicle="${v.uid}" aria-label="Remove ${escape(r.name)}">×</button></div><input type="text" maxlength="100" data-vehicle-name="${v.uid}" aria-label="${escape(r.name)} name" placeholder="Name" value="${escape(v.name)}"></div>`;}).join('');}
 return {load,matches,results,
  sheet:()=>`<div class="actions"><button type="button" data-action="manage-vehicles">Manage</button></div>${owned()}`,
  manager(){if(!index&&!pending&&!failure)load().catch(()=>{});const d=draft();return `${owned()}<div class="actions"><input type="search" data-vehicle-search placeholder="Search" aria-label="Search vehicles" value="${escape(d.query)}"><select data-vehicle-type aria-label="Vehicle type"><option value="">All types</option>${Object.entries(VEHICLE_TYPES).map(([id,name])=>`<option value="${id}" ${d.type===id?'selected':''}>${name}</option>`).join('')}</select></div><div data-vehicle-results>${results()}</div>`;},
  input(el){if(el.hasAttribute('data-vehicle-search')){draft().query=el.value;draft().offset=0;repaint();return true;}if(el.hasAttribute('data-vehicle-name')){try{nameOwnedVehicle(current(),pack,el.dataset.vehicleName,el.value);document.querySelectorAll(`[data-vehicle-name="${el.dataset.vehicleName}"]`).forEach(other=>{if(other!==el)other.value=el.value;});save();}catch(e){error(e.message);}return true;}return false;},
  change(el){if(el.hasAttribute('data-vehicle-name'))return true;if(!el.hasAttribute('data-vehicle-type'))return false;draft().type=el.value;draft().offset=0;repaint();return true;},
  click(event){const el=event.target.closest('[data-add-vehicle],[data-remove-vehicle],[data-vehicle-page],[data-vehicle-retry]');
   if(!el){if(event.target.closest('[data-vehicle-results]')&&sort.click(event,()=>{draft().offset=0;repaint();}))return true;return false;}
   if(el.hasAttribute('data-vehicle-retry')){load().catch(()=>{});repaint();return true;}
   if(el.hasAttribute('data-vehicle-page')){draft().offset=Math.max(0,draft().offset+(el.dataset.vehiclePage==='next'?50:-50));repaint();return true;}
   if(el.hasAttribute('data-remove-vehicle')){removeOwnedVehicle(current(),el.dataset.removeVehicle);changed();return true;}
   const c=current(),r=pack.vehicles.find(r=>r.id===el.dataset.addVehicle),key=c.id+':'+r?.id;if(!r||el.disabled||adding.has(key))return true;adding.add(key);repaint();
   library.article(r.referenceId).then(()=>{if(current()!==c)return;addOwnedVehicle(c,pack,r.id);changed();}).catch(e=>error(e.message)).finally(()=>{adding.delete(key);repaint();});return true;
  }
 };
}
