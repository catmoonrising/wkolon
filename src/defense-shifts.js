// Shift Defense: one Swift Action trades a penalty on one Defense (or both others) for a typed bonus to another.
import {ambiguityValue} from './house-rules.js';
const DEFENSES=['reflex','fortitude','will'];
export const defenseShiftRule=(pack,id)=>pack.rules.defenseShiftActions?.find(r=>r.id===id);
const owned=(ctx,rule)=>ctx.talents.some(t=>t.id===rule.talentId&&!ctx.inactiveTalents.has(t.id));
const title=k=>k[0].toUpperCase()+k.slice(1);
const penalised=(rule,s)=>rule.penaltyScope==='others'?DEFENSES.filter(k=>k!==s.bonus):[s.penalty];
export function validateDefenseShifts(c,pack,bad){
 if(c.defenseShifts===undefined)return;
 const rows=c.defenseShifts;
 if(!Array.isArray(rows)||rows.length>(pack.rules.defenseShiftActions||[]).length*6||new Set(rows.map(r=>r?.id+'|'+r?.bonus+'|'+r?.penalty)).size!==rows.length||rows.some(r=>{
  const rule=defenseShiftRule(pack,r?.id),keys=r&&typeof r==='object'&&!Array.isArray(r)?Object.keys(r).sort().join():'';
  if(!rule||!DEFENSES.includes(r.bonus))return true;
  if(keys!=='bonus,id,penalty'&&!(keys==='bonus,id,penalty,persistent'&&r.persistent===true&&rule.ambiguityId))return true;
  return rule.penaltyScope==='others'?r.penalty!==null:!DEFENSES.includes(r.penalty)||r.bonus===r.penalty;
 }))bad('defense shifts');
}
export function activeDefenseShifts(c,pack,ctx){
 return (c.defenseShifts||[]).flatMap((s,index)=>{const rule=defenseShiftRule(pack,s.id);return rule&&owned(ctx,rule)?[{...s,index,rule,name:pack.talents.find(t=>t.id===rule.talentId).name,benefit:title(s.bonus)+' +'+rule.bonus+', '+penalised(rule,s).map(k=>title(k)+' '+rule.penalty).join(', ')}]:[];});
}
export const defenseShiftEffects=(c,pack,ctx)=>activeDefenseShifts(c,pack,ctx).flatMap(s=>[{target:'defenseBonus',defense:s.bonus,amount:s.rule.bonus,type:s.rule.type},...penalised(s.rule,s).map(defense=>({target:'defenseBonus',defense,amount:s.rule.penalty}))]);
export function defenseShiftPlan(c,d,pack,id,o){
 const rule=defenseShiftRule(pack,id);
 if(!rule||!owned(d.ctx,rule))throw new Error('Talent unavailable');
 const others=rule.penaltyScope==='others',penalty=others?null:o.penalty;
 if(!DEFENSES.includes(o.bonus)||!others&&(!DEFENSES.includes(penalty)||o.bonus===penalty))throw new Error(others?'Choose a Defense':'Choose two different Defenses');
 if(c.defenseShifts?.some(s=>s.id===id&&s.bonus===o.bonus&&s.penalty===penalty))throw new Error('Already active');
 return {rule,bonus:o.bonus,penalty,persistent:!!rule.ambiguityId&&ambiguityValue(c,pack,rule.ambiguityId)==='permanent'};
}
export function applyDefenseShift(c,id,{bonus,penalty,persistent}){c.defenseShifts??=[];c.defenseShifts.push({id,bonus,penalty,...(persistent?{persistent:true}:{})});}
export const defenseShiftText=(rule,{bonus,penalty})=>title(bonus)+' +'+rule.bonus+', '+penalised(rule,{bonus,penalty}).map(k=>title(k)+' '+rule.penalty).join(', ');
// Rows saved under the no-automatic-expiry ruling survive every automatic reset.
export function clearDefenseShifts(c){if(!c.defenseShifts)return;c.defenseShifts=c.defenseShifts.filter(s=>s.persistent);if(!c.defenseShifts.length)delete c.defenseShifts;}
export function removeDefenseShift(c,index){
 if(!Number.isInteger(index)||!c.defenseShifts?.[index])throw new Error('Shift unavailable');
 c.defenseShifts.splice(index,1);if(!c.defenseShifts.length)delete c.defenseShifts;
}
