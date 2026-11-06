import {ambiguityValue} from './house-rules.js';
import {armorProficient} from './armor.js';
// Activation state is separate from advancement selections and calculated totals.
export function validateTalentActivations(c,pack,bad){
 if(c.talentActivations===undefined)return;
 const rows=c.talentActivations,choices=pack.talents.flatMap(t=>(t.activation?.choices||[]).map(o=>t.id+'|'+o.id));
 if(!Array.isArray(rows)||rows.length>choices.length||new Set(rows.map(r=>r?.id+'|'+r?.choice)).size!==rows.length||rows.some(r=>{
  if(!r||typeof r!=='object'||Array.isArray(r)||!choices.includes(r.id+'|'+r.choice))return true;
  const armor=pack.talents.find(t=>t.id===r.id)?.activation.target==='worn-armor';
  return Object.keys(r).sort().join()!==(armor?'armorUid,choice,id':'choice,id')||armor&&(typeof r.armorUid!=='string'||!r.armorUid.trim()||r.armorUid.length>100);
 }))bad('talent activations');
}
const unconscious=c=>c.currentHP===0||c.condition===5||!!c.recovery?.dead;
const lostWhenUnconscious=(c,pack,a)=>!!a?.endsWhenUnconscious||!!a?.unconsciousAmbiguityId&&ambiguityValue(c,pack,a.unconsciousAmbiguityId)==='self-lost';
export function activeTalentActivations(c,pack,ctx){
 return (c.talentActivations||[]).flatMap(s=>{
  if(!ctx.talents.some(t=>t.id===s.id)||ctx.inactiveTalents.has(s.id))return [];
  const talent=pack.talents.find(t=>t.id===s.id),option=talent?.activation?.choices.find(o=>o.id===s.choice);
  if(lostWhenUnconscious(c,pack,talent?.activation)&&unconscious(c))return [];
  const override=ctx.talents.filter(t=>!ctx.inactiveTalents.has(t.id)).flatMap(t=>pack.talents.find(r=>r.id===t.id)?.effects||[]).find(e=>e.target==='activationAmount'&&e.talent===s.id&&e.choice===s.choice);
  return option?[{...s,name:talent.name,benefit:option.name,effects:override?option.effects.map(e=>({...e,amount:override.amount})):option.effects}]:[];
 });
}
export const encounterTalentEffects=(c,pack,ctx)=>activeTalentActivations(c,pack,ctx).flatMap(s=>s.effects.map(e=>({...e,selection:{id:s.id,choice:s.choice},...(s.armorUid?{armorUid:s.armorUid}:{})})));
export const activationArmor=d=>d.armorItems.filter(r=>armorProficient(r,d.ctx));
export function talentActivation(c,pack,d,id,choice,armorUid){
 const talent=pack.talents.find(t=>t.id===id),activation=talent?.activation,option=activation?.choices.find(o=>o.id===choice);
 if(!activation||!d.ctx.talents.some(t=>t.id===id)||d.ctx.inactiveTalents.has(id))throw new Error('Talent unavailable');
 if(!option)throw new Error('Choose a benefit');
 if(c.talentActivations?.some(s=>s.id===id&&s.choice===choice))throw new Error('Benefit already active');
 if(activation.target==='worn-armor'){
  const armor=activationArmor(d);if(!armor.length)throw new Error('Wear proficient armor');
  if(armorUid===undefined&&armor.length===1)armorUid=armor[0].uid;
  if(!armor.some(r=>r.uid===armorUid))throw new Error('Choose worn proficient armor');
 }else if(armorUid!==undefined)throw new Error('Talent does not target armor');
 return {talent,activation,option,...(armorUid!==undefined?{armorUid}:{})};
}
export function applyTalentActivation(c,id,choice,armorUid){
 c.talentActivations??=[];c.talentActivations.push({id,choice,...(armorUid!==undefined?{armorUid}:{})});
}
export function endEncounterTalents(c){delete c.talentActivations;delete c.encounterTriggers;delete c.turnEndTriggers;}
// "Lost if you fall unconscious or die": removal, not suppression, once known.
export function endUnconsciousTalents(c,pack){
 if(!c.talentActivations||!unconscious(c))return false;
 const before=c.talentActivations.length;
 c.talentActivations=c.talentActivations.filter(s=>!lostWhenUnconscious(c,pack,pack.talents.find(t=>t.id===s.id)?.activation));
 const changed=c.talentActivations.length!==before;
 if(!c.talentActivations.length)delete c.talentActivations;
 return changed;
}
