import {ambiguityValue} from './house-rules.js';

export const attackTarget=c=>({cover:'none',concealment:'none',darkness:false,prone:false,helpless:false,adjacentToAlly:false,attackSquare:false,...c.attackTarget});
export function targetConcealment(target,vision,scope=false){
 if(!target.darkness)return target.concealment;
 if(vision==='darkvision'||target.concealment!=='total'&&(vision==='low-light'||scope))return 'none';
 return target.concealment;
}
export function canAimAtTarget(c,species){
 const target=attackTarget(c);
 return target.cover!=='total'&&targetConcealment(target,species.vision)!=='total';
}
export function targetModifiers(c,pack,ctx,species,a){
 const rule=pack.rules.attackTargets,target=attackTarget(c),melee=a.mode==='melee',ranged=a.mode==='ranged';
 const concealment=targetConcealment(target,species.vision,a.ignoresDarkness);
 let prone=melee&&target.prone?rule.prone.targetMeleeBonus:ranged&&target.prone?rule.prone.targetRangedPenalty:0;
 const helpless=melee&&target.helpless?rule.helplessMeleeBonus:0;
 if(prone>0&&helpless&&ambiguityValue(c,pack,'ambiguity:prone-helpless')==='no-stack')prone=0;
 const ownProne=melee&&c.prone?rule.prone.ownMeleePenalty:0;
 const intoMelee=ranged&&target.adjacentToAlly&&!ctx.feats.some(f=>f.id===rule.preciseShot)?rule.intoMeleePenalty:0;
 const conceal=concealment==='total'?rule.totalConcealmentPenalty:concealment==='concealment'?rule.concealmentPenalty:0;
 const cover=target.cover==='cover'?rule.coverBonus:target.cover==='improved'?rule.improvedCoverBonus:0;
 const coverBonus=a.ignoresCover&&!a.areaType?0:cover;
 const issue=target.cover==='total'?'Target has Total Cover':concealment==='total'&&!target.attackSquare?'Total Concealment: choose Attack square':'';
 return {penalty:prone+helpless+ownProne+intoMelee+conceal,coverBonus,targetCover:cover>0,issue,
  breakdown:[['Prone target',prone],['Helpless target',helpless],['Prone',ownProne],['Into melee',intoMelee],['Concealment',conceal]].filter(([,n])=>n).map(([name,n])=>`${name}: ${n>0?'+':''}${n}`).join('; ')};
}
// Apply once to each attack variant so losing Aim restores both range and darkness
// penalties, and cover remains a defense bonus rather than an attack penalty.
export function applyAttackTarget(a,c,pack,ctx,species){
 const target=targetModifiers(c,pack,ctx,species,a),issue=a.issue||target.issue;
 const variants=Object.fromEntries(['unAimed','unBraced'].filter(k=>a[k]).map(k=>{
  const variant={...a,...a[k]},t=targetModifiers(c,pack,ctx,species,variant);
  return [k,{...a[k],attack:variant.attack+t.penalty,...(k==='unAimed'?{coverBonus:t.coverBonus,targetCover:t.targetCover}:{})}];
 }));
 return {...a,...variants,attack:a.attack+target.penalty,coverBonus:target.coverBonus,targetCover:target.targetCover,
  canAimTarget:canAimAtTarget(c,species),available:a.available&&!issue,issue,
  breakdown:a.breakdown+(target.breakdown?'; '+target.breakdown:'')+(target.coverBonus?`; Target Reflex: +${target.coverBonus} cover`:''),targetModifiers:target};
}
export function validateAttackTarget(c,bad){
 if(c.prone!==undefined&&typeof c.prone!=='boolean')bad('prone state');
 if(c.attackTarget===undefined)return;
 const t=c.attackTarget,flags=['darkness','prone','helpless','adjacentToAlly','attackSquare'];
 if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).some(k=>!['cover','concealment',...flags].includes(k)))bad('attack target');
 if(t.cover!==undefined&&!['none','cover','improved','total'].includes(t.cover))bad('target cover');
 if(t.concealment!==undefined&&!['none','concealment','total'].includes(t.concealment))bad('target concealment');
 for(const key of flags)if(t[key]!==undefined&&typeof t[key]!=='boolean')bad('attack target '+key);
}
