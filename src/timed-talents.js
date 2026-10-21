// Combat Sequence revision 26725: six seconds per round.
export const ROUNDS_PER_MINUTE=10;
export function validateTimedTalents(c,pack,bad){
 if(c.timedTalents===undefined)return;
 const rows=c.timedTalents;
 if(!Array.isArray(rows)||rows.length>pack.rules.timedTalentActions.length||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>{
  const rule=pack.rules.timedTalentActions.find(x=>x.id===r?.id);
  return !r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='id,rounds'||!rule||!Number.isInteger(r.rounds)||r.rounds<1||r.rounds>rule.durationRounds;
 }))bad('timed talents');
}
export function activeTimedTalents(c,pack,ctx){
 return (c.timedTalents||[]).flatMap(s=>{const rule=pack.rules.timedTalentActions.find(r=>r.id===s.id);return rule&&ctx.talents.some(t=>t.id===rule.talentId)&&!ctx.inactiveTalents.has(rule.talentId)?[{...s,rule,name:pack.talents.find(t=>t.id===rule.talentId).name,benefit:s.rounds+' rounds'}]:[];});
}
export function timedTalentPlan(c,d,pack,id){
 const rule=pack.rules.timedTalentActions.find(r=>r.id===id);
 if(!rule||!d.ctx.talents.some(t=>t.id===rule.talentId)||d.ctx.inactiveTalents.has(rule.talentId))throw new Error('Talent unavailable');
 if(d.helpless||d.incapacitated)throw new Error('Actions unavailable while helpless');
 return rule;
}
export function applyTimedTalent(c,rule){c.timedTalents=(c.timedTalents||[]).filter(s=>s.id!==rule.id);c.timedTalents.push({id:rule.id,rounds:rule.durationRounds});}
export function setTimedTalentRounds(c,pack,id,rounds){
 const rule=pack.rules.timedTalentActions.find(r=>r.id===id),s=c.timedTalents?.find(s=>s.id===id);
 if(!s||!rule||!Number.isInteger(rounds)||rounds<0||rounds>rule.durationRounds)throw new Error('Invalid remaining rounds');
 if(rounds)s.rounds=rounds;else c.timedTalents=c.timedTalents.filter(row=>row.id!==id);
 if(!c.timedTalents.length)delete c.timedTalents;
}
export function advanceTimedTalents(c,rounds=1){
 if(!Number.isInteger(rounds)||rounds<0||rounds>1000000000)throw new Error('Invalid elapsed rounds');
 if(!c.timedTalents)return;
 c.timedTalents=c.timedTalents.flatMap(s=>s.rounds>rounds?[{...s,rounds:s.rounds-rounds}]:[]);
 if(!c.timedTalents.length)delete c.timedTalents;
}
export function clearTimedTalents(c){delete c.timedTalents;}
