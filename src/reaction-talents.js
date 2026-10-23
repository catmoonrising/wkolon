import {endTurnEffects,startTurnEffects} from './effect-duration.js';

export const reactionTalentRule=(pack,id)=>pack.rules.reactionTalentActions?.find(r=>r.id===id);
export function validateReactionTalents(c,pack,bad){
 if(c.reactionTalents===undefined)return;
 const rows=c.reactionTalents;
 if(!Array.isArray(rows)||rows.length>(pack.rules.reactionTalentActions||[]).length||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='ended,endsRemaining,id'||!reactionTalentRule(pack,r.id)||![1,2].includes(r.endsRemaining)||typeof r.ended!=='boolean'))bad('reaction talents');
}
export function activeReactionTalents(c,pack,ctx){
 return (c.reactionTalents||[]).flatMap(s=>{const rule=reactionTalentRule(pack,s.id);return rule&&ctx.talents.some(t=>t.id===rule.talentId&&!ctx.inactiveTalents.has(t.id))?[{...s,rule,name:pack.talents.find(t=>t.id===rule.talentId).name,benefit:'DR '+rule.damageReduction}]:[];});
}
export const reactionTalentDR=(c,pack,ctx)=>Math.max(0,...activeReactionTalents(c,pack,ctx).map(s=>s.rule.damageReduction));
// Own active, unended turn: this turn and the next one end. Otherwise the
// upcoming own turn is the next turn, so only its end remains.
function snapshot(c){const s=c.actionState;return s?.active&&!s.ended?{endsRemaining:2,ended:false}:{endsRemaining:1,ended:true};}
export function reactionTalentPlan(c,d,pack,id,o){
 const rule=reactionTalentRule(pack,id);
 if(!rule||!d.ctx.talents.some(t=>t.id===rule.talentId&&!d.ctx.inactiveTalents.has(t.id)))throw new Error('Talent unavailable');
 if(o.damaged!==true)throw new Error('Confirm damage from an attack');
 const next=snapshot(c),current=c.reactionTalents?.find(s=>s.id===id);
 if(current&&current.endsRemaining>=next.endsRemaining)throw new Error('Already active');
 return {rule,...next};
}
export function applyReactionTalent(c,id,{endsRemaining,ended}){c.reactionTalents=(c.reactionTalents||[]).filter(s=>s.id!==id);c.reactionTalents.push({id,endsRemaining,ended});}
export function endReactionTalentTurn(c){if(!c.reactionTalents)return;c.reactionTalents=endTurnEffects(c.reactionTalents);if(!c.reactionTalents.length)delete c.reactionTalents;}
export function startReactionTalentTurn(c){if(!c.reactionTalents)return;c.reactionTalents=startTurnEffects(c.reactionTalents);if(!c.reactionTalents.length)delete c.reactionTalents;}
export function clearReactionTalents(c){delete c.reactionTalents;}
