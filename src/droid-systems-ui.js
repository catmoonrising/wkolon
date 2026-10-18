import {clearFollowUps} from './attack-follow-ups.js';
import {clearBracing} from './attack-techniques.js';
import {chooseDroidArm,installDroidSystem} from './droid-installation.js';
import {droidSystemSize,droidSystemUsesSize} from './droid-systems.js';
import {escapeHTML as escape} from './wiki-content.js';
export function createDroidSystemsUI(pack,{current,derived,changed,error,reference}){
 function render(creation=false){
  const c=current(),species=pack.species.find(s=>s.id===c.species),s=derived().droidSystems,grant=species.droidStartingPackage;
  const owned=c.inventory.filter(e=>pack.equipment.find(r=>r.id===e.id)?.droidSystem),locomotions=s.installed.filter(e=>pack.equipment.find(r=>r.id===e.id).droidSystem.movement&&e.uid);
  const arms=grant?[1,2].map(i=>{const chosen=c.inventory.find(e=>e.droidGrant?.speciesId===c.species&&e.droidGrant.slot==='arm-'+i);return `<label>Arm ${i}<select data-droid-arm="${i}"><option value="">Choose appendage</option>${pack.equipment.filter(r=>r.droidSystem?.appendageDamage).map(r=>`<option value="${r.id}" ${chosen?.id===r.id?'selected':''}>${escape(r.name)}</option>`).join('')}</select></label>`;}).join(''):'';
  const anatomy=s.prepared&&s.enabled?`<label class="checkbox"><input type="checkbox" data-droid-bipedal ${c.droidSystems[c.species]?.bipedal?'checked':''}>Bipedal</label>`:'';
  const active=locomotions.length>1?`<label>Locomotion<select data-droid-locomotion>${locomotions.map(e=>`<option value="${e.uid}" ${s.locomotion?.uid===e.uid?'selected':''}>${escape(pack.equipment.find(r=>r.id===e.id).name)}</option>`).join('')}</select></label>`:'';
  const rows=owned.map(e=>{
   const r=pack.equipment.find(r=>r.id===e.id),fits=!droidSystemUsesSize(r)||droidSystemSize(e,pack,c)===s.size,canInstall=s.enabled&&r.droidSystem.category!=='external'&&(!e.droidGrant||e.droidGrant.speciesId===c.species);
   return `<div class="droid-system-row">${reference(r,r.name+(e.droidGrant?.slot.startsWith('arm-')?' (Arm '+e.droidGrant.slot.slice(4)+')':''),null,`${creation?'cr-':''}droid-${e.uid}`)}${canInstall?`<label class="checkbox"><input type="checkbox" data-droid-installed="${e.uid}" ${e.equipped?'checked':''} ${!fits&&!e.equipped?'disabled':''}>Installed</label>`:''}</div>`;
  }).join('');
  return `<div class="droid-systems"><div class="actions">${arms}${anatomy}${active}</div>${rows}</div>`;
 }
 function change(el){
  if(!el.hasAttribute('data-droid-bipedal')&&!el.hasAttribute('data-droid-arm')&&!el.hasAttribute('data-droid-installed')&&!el.hasAttribute('data-droid-locomotion'))return false;
  try{
   const c=current();
   if(el.hasAttribute('data-droid-bipedal'))c.droidSystems[c.species].bipedal=el.checked;
   else if(el.hasAttribute('data-droid-arm'))chooseDroidArm(c,pack,Number(el.dataset.droidArm),el.value);
   else if(el.hasAttribute('data-droid-installed'))installDroidSystem(c,pack,el.dataset.droidInstalled,el.checked);
   else{
    const state=derived().droidSystems;if(!state.installed.some(e=>e.uid===el.value&&pack.equipment.find(r=>r.id===e.id).droidSystem.movement))throw new Error('Locomotion unavailable');
    c.droidSystems[c.species].locomotion=el.value;
   }
   clearFollowUps(c);delete c.routineProgress;clearBracing(c);
  }catch(e){error(e.message);}
  changed();return true;
 }
 return {render,change};
}
