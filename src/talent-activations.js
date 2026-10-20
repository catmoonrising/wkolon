// Activation state is separate from advancement selections and calculated totals.
export function validateTalentActivations(c,pack,bad){
 if(c.talentActivations===undefined)return;
 const rows=c.talentActivations,choices=pack.talents.flatMap(t=>(t.activation?.choices||[]).map(o=>t.id+'|'+o.id));
 if(!Array.isArray(rows)||rows.length>choices.length||new Set(rows.map(r=>r?.id+'|'+r?.choice)).size!==rows.length||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='choice,id'||!choices.includes(r.id+'|'+r.choice)))bad('talent activations');
}
export function activeTalentActivations(c,pack,ctx){
 return (c.talentActivations||[]).flatMap(s=>{
  if(!ctx.talents.some(t=>t.id===s.id)||ctx.inactiveTalents.has(s.id))return [];
  const talent=pack.talents.find(t=>t.id===s.id),option=talent?.activation?.choices.find(o=>o.id===s.choice);
  return option?[{...s,name:talent.name,benefit:option.name,effects:option.effects}]:[];
 });
}
export const encounterTalentEffects=(c,pack,ctx)=>activeTalentActivations(c,pack,ctx).flatMap(s=>s.effects.map(e=>({...e,selection:{id:s.id,choice:s.choice}})));
export function talentActivation(c,pack,d,id,choice){
 const talent=pack.talents.find(t=>t.id===id),activation=talent?.activation,option=activation?.choices.find(o=>o.id===choice);
 if(!activation||!d.ctx.talents.some(t=>t.id===id)||d.ctx.inactiveTalents.has(id))throw new Error('Talent unavailable');
 if(!option)throw new Error('Choose a benefit');
 if(c.talentActivations?.some(s=>s.id===id&&s.choice===choice))throw new Error('Benefit already active');
 return {talent,activation,option};
}
export function applyTalentActivation(c,id,choice){
 c.talentActivations??=[];c.talentActivations.push({id,choice});
}
export function endEncounterTalents(c){delete c.talentActivations;}
