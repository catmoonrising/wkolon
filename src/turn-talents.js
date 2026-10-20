import {activeLightsabers} from './power-activation.js';

export function validateTurnTalents(c,pack,bad){
 if(c.turnTalents===undefined)return;
 const rows=c.turnTalents;
 if(!Array.isArray(rows)||rows.length>(pack.rules.turnTalentActions||[]).length||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='amount,id'||!pack.rules.turnTalentActions?.some(rule=>rule.id===r.id)||![1,2,3,4,6].includes(r.amount)))bad('turn talents');
}
export function activeTurnTalents(c,pack,ctx){
 return (c.turnTalents||[]).flatMap(s=>{
  const rule=pack.rules.turnTalentActions.find(r=>r.id===s.id);
  if(!rule)return [];
  const count=ctx.talents.filter(t=>t.id===rule.talentId&&!ctx.inactiveTalents.has(t.id)).length;
  const doubled=ctx.talents.some(t=>t.id===rule.doubleTalentId&&!ctx.inactiveTalents.has(t.id));
  const amount=Math.min(s.amount,Math.min(rule.maximum,count*rule.amountPerSelection)*(doubled?2:1));
  return amount?[{...s,amount,rule,name:pack.talents.find(t=>t.id===rule.talentId).name}]:[];
 });
}
export function turnTalentEffects(c,pack,ctx,{flatFooted,helpless}){
 return flatFooted||helpless?[]:activeTurnTalents(c,pack,ctx).map(s=>({...s.rule.effect,amount:s.amount}));
}
export function turnTalentPlan(c,d,pack,id){
 const rule=pack.rules.turnTalentActions?.find(r=>r.id===id),has=id=>d.ctx.talents.some(t=>t.id===id&&!d.ctx.inactiveTalents.has(t.id));
 if(!rule||!has(rule.talentId))throw new Error('Talent unavailable');
 if(d.incapacitated||d.helpless)throw new Error('Actions unavailable while helpless');
 const weapons=activeLightsabers(c,pack);
 if(!weapons.length)throw new Error('Requires an activated, wielded Lightsaber');
 const rank=d.ctx.talents.filter(t=>t.id===rule.talentId&&!d.ctx.inactiveTalents.has(t.id)).length;
 const amount=Math.min(rule.maximum,rank*rule.amountPerSelection)*(has(rule.doubleTalentId)&&weapons.length>=rule.doubleWeaponCount?2:1);
 if((c.turnTalents?.find(r=>r.id===id)?.amount||0)>=amount)throw new Error('Already active');
 return {rule,amount};
}
export function applyTurnTalent(c,id,amount){c.turnTalents=(c.turnTalents||[]).filter(r=>r.id!==id);c.turnTalents.push({id,amount});}
export function clearTurnTalents(c){delete c.turnTalents;}
