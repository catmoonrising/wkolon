import {endTurnEffects,startTurnEffects} from './effect-duration.js';

export const reactionTalentRule=(pack,id)=>pack.rules.reactionTalentActions?.find(r=>r.id===id);
export const defenseReactionRule=(pack,id)=>pack.rules.encounterDefenseReactions?.find(r=>r.id===id);
const ownsRecord=(ctx,id)=>ctx.feats.some(f=>f.id===id)||ctx.talents.some(t=>t.id===id&&!ctx.inactiveTalents.has(t.id));
export const ownsDefenseReaction=(pack,ctx,id)=>{const r=defenseReactionRule(pack,id);return !!r&&ownsRecord(ctx,r.recordId);};
function validateDefenseReactions(c,pack,bad){
 const used=c.defenseReactionsUsed,rows=c.defenseReactions;
 if(used!==undefined&&(!Array.isArray(used)||new Set(used).size!==used.length||used.some(id=>!defenseReactionRule(pack,id))))bad('defense reactions');
 if(rows===undefined)return;
 if(!Array.isArray(rows)||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='defense,ended,endsRemaining,id,until'||!defenseReactionRule(pack,r.id)?.defenses.includes(r.defense)||defenseReactionRule(pack,r.id).duration!==r.until||![1,2].includes(r.endsRemaining)||typeof r.ended!=='boolean'||!used?.includes(r.id)))bad('defense reactions');
}
export function validateReactionTalents(c,pack,bad){
 validateDefenseReactions(c,pack,bad);
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
const defenseAmount=(rule,mods)=>rule.ability?mods[rule.ability]:rule.amount;
export const defenseReactionEffects=(c,pack,ctx,mods)=>(c.defenseReactions||[]).flatMap(s=>{const rule=defenseReactionRule(pack,s.id);return ownsRecord(ctx,rule.recordId)?[{target:'defenseBonus',defense:s.defense,amount:defenseAmount(rule,mods),type:rule.type}]:[];});
export const activeDefenseReactions=(c,pack,ctx,mods)=>(c.defenseReactions||[]).flatMap(s=>{const rule=defenseReactionRule(pack,s.id);return ownsRecord(ctx,rule.recordId)?[{...s,rule,name:[...pack.feats,...pack.talents].find(r=>r.id===rule.recordId).name,benefit:s.defense[0].toUpperCase()+s.defense.slice(1)+' +'+defenseAmount(rule,mods)}]:[];});
export function defenseReactionPlan(c,d,pack,id,o){
 const rule=defenseReactionRule(pack,id);
 if(!rule||!ownsRecord(d.ctx,rule.recordId))throw new Error('Talent unavailable');
 const defense=o.defense??(rule.defenses.length===1?rule.defenses[0]:null);
 if(!rule.defenses.includes(defense))throw new Error('Choose a Defense');
 if(c.defenseReactionsUsed?.includes(id))throw new Error('Already used this encounter');
 return {rule,defense,...(rule.duration==='start-next-turn'?{endsRemaining:1,ended:true}:snapshot(c))};
}
export function applyDefenseReaction(c,id,{rule,defense,endsRemaining,ended}){c.defenseReactionsUsed=[...(c.defenseReactionsUsed||[]),id];c.defenseReactions=[...(c.defenseReactions||[]),{id,defense,until:rule.duration,endsRemaining,ended}];}
function turnDefenseReactions(c,update){if(!c.defenseReactions)return;c.defenseReactions=update(c.defenseReactions);if(!c.defenseReactions.length)delete c.defenseReactions;}
export function applyReactionTalent(c,id,{endsRemaining,ended}){c.reactionTalents=(c.reactionTalents||[]).filter(s=>s.id!==id);c.reactionTalents.push({id,endsRemaining,ended});}
export function endReactionTalentTurn(c){turnDefenseReactions(c,endTurnEffects);if(!c.reactionTalents)return;c.reactionTalents=endTurnEffects(c.reactionTalents);if(!c.reactionTalents.length)delete c.reactionTalents;}
export function startReactionTalentTurn(c){turnDefenseReactions(c,rows=>startTurnEffects(rows.filter(r=>r.until!=='start-next-turn')));if(!c.reactionTalents)return;c.reactionTalents=startTurnEffects(c.reactionTalents);if(!c.reactionTalents.length)delete c.reactionTalents;}
export function clearReactionTalents(c){delete c.reactionTalents;delete c.defenseReactions;delete c.defenseReactionsUsed;}
