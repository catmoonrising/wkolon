import {endTurnEffects,startTurnEffects} from './effect-duration.js';
import {ambiguityValue} from './house-rules.js';

export function validateTurnFeatEffects(c,pack,bad){
 if(c.turnFeatEffects===undefined)return;
 const rows=c.turnFeatEffects;
 if(!Array.isArray(rows)||rows.length>pack.rules.turnFeatEffects.length||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='ended,endsRemaining,id'||!pack.rules.turnFeatEffects.some(x=>x.id===r.id)||![1,2].includes(r.endsRemaining)||typeof r.ended!=='boolean'))bad('turn feat effects');
}
export function activeTurnFeatEffects(c,pack,ctx){
 return (c.turnFeatEffects||[]).flatMap(s=>{const rule=pack.rules.turnFeatEffects.find(r=>r.id===s.id);return rule&&ctx.feats.some(f=>f.id===rule.featId)?[{...s,rule,name:pack.feats.find(f=>f.id===rule.featId).name,benefit:'Thrown attacks +'+rule.effect.amount}]:[];});
}
export function turnFeatAttackEffects(c,pack,ctx,w){
 return w.mode==='ranged'&&w.rangeType==='thrown'?activeTurnFeatEffects(c,pack,ctx).map(s=>s.rule.effect):[];
}
export function applyMoveFeatEffects(c,d,pack,displacement){
 const activated=[];
 if(!Number.isInteger(displacement)||displacement<0)return activated;
 for(const rule of pack.rules.turnFeatEffects){
  if(displacement<rule.displacement||!d.ctx.feats.some(f=>f.id===rule.featId))continue;
  const endsRemaining=ambiguityValue(c,pack,rule.ambiguityId)==='next-turn'?2:1;
  const previous=c.turnFeatEffects?.find(s=>s.id===rule.id);
  c.turnFeatEffects=(c.turnFeatEffects||[]).filter(s=>s.id!==rule.id);
  c.turnFeatEffects.push({id:rule.id,endsRemaining:Math.max(endsRemaining,previous?.endsRemaining||0),ended:false});activated.push(rule.id);
 }
 return activated;
}
export function endTurnFeatEffects(c){
 if(!c.turnFeatEffects)return;
 c.turnFeatEffects=endTurnEffects(c.turnFeatEffects);
 if(!c.turnFeatEffects.length)delete c.turnFeatEffects;
}
export function startTurnFeatEffects(c){
 if(!c.turnFeatEffects)return;
 c.turnFeatEffects=startTurnEffects(c.turnFeatEffects);
 if(!c.turnFeatEffects.length)delete c.turnFeatEffects;
}
export function clearTurnFeatEffects(c){delete c.turnFeatEffects;}
