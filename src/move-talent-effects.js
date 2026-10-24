// Talents triggered by a completed Move; benefits last until the start of the next turn.
export const moveTalentRule=(pack,id)=>pack.rules.moveTalentEffects?.find(r=>r.id===id);
const owned=(ctx,rule)=>ctx.talents.some(t=>t.id===rule.talentId&&!ctx.inactiveTalents.has(t.id));
export function validateMoveTalentEffects(c,pack,bad){
 if(c.moveTalentEffects===undefined)return;
 const rows=c.moveTalentEffects;
 if(!Array.isArray(rows)||new Set(rows).size!==rows.length||rows.some(id=>!moveTalentRule(pack,id)))bad('move talent effects');
}
export function activeMoveTalentEffects(c,pack,ctx){
 return (c.moveTalentEffects||[]).flatMap(id=>{const rule=moveTalentRule(pack,id);return rule&&owned(ctx,rule)?[{id,rule,name:pack.talents.find(t=>t.id===rule.talentId).name,benefit:(rule.effect.target==='attacks'?'Attack':'Defenses')+' +'+rule.effect.amount}]:[];});
}
export const moveTalentModifiers=(c,pack,ctx)=>activeMoveTalentEffects(c,pack,ctx).map(s=>s.rule.effect);
export const moveTalentsOwned=(pack,ctx)=>(pack.rules.moveTalentEffects||[]).some(r=>owned(ctx,r));
export function applyMoveTalentEffects(c,d,pack,{squares,displacement}){
 if(!Number.isInteger(squares)||!Number.isInteger(displacement))return [];
 const activated=(pack.rules.moveTalentEffects||[]).filter(r=>owned(d.ctx,r)&&squares>=r.minimumSquares&&displacement>=r.minimumDisplacement).map(r=>r.id);
 if(activated.length)c.moveTalentEffects=[...new Set([...(c.moveTalentEffects||[]),...activated])];
 return activated;
}
export function clearMoveTalentEffects(c){delete c.moveTalentEffects;}
