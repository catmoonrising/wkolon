import {ambiguityValue} from './house-rules.js';
import {modifierIncrease} from './modifiers.js';

export const attackTarget=c=>({cover:'none',concealment:'none',darkness:false,prone:false,helpless:false,adjacentToAlly:false,attackSquare:false,dexDenied:false,jedi:false,forceSensitive:false,darkSide:false,...c.attackTarget});
export const TARGET_TRAITS=[['dexDenied','Denied Dexterity'],['jedi','Jedi'],['forceSensitive','Force Sensitivity'],['darkSide','Dark Side Score 1+']];
export function targetConcealment(target,vision,scope=false){
 if(!target.darkness)return target.concealment;
 if(vision==='darkvision'||target.concealment!=='total'&&(vision==='low-light'||scope))return 'none';
 return target.concealment;
}
export function canAimAtTarget(c,species){
 const target={...attackTarget(c),...(species.blind?{concealment:'total',darkness:false}:{})};
 return target.cover!=='total'&&targetConcealment(target,species.vision)!=='total';
}
export function targetModifiers(c,pack,ctx,species,a){
 const rule=pack.rules.attackTargets,target={...attackTarget(c),...(species.blind?{concealment:'total',darkness:false}:{})},melee=a.mode==='melee',ranged=a.mode==='ranged';
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
 return {penalty:prone+helpless+ownProne+intoMelee+conceal,targetPenalty:prone+helpless+intoMelee+conceal,coverBonus,targetCover:cover>0,issue,
  breakdown:[['Prone target',prone],['Helpless target',helpless],['Prone',ownProne],['Into melee',intoMelee],['Concealment',conceal]].filter(([,n])=>n).map(([name,n])=>`${name}: ${n>0?'+':''}${n}`).join('; ')};
}
// Apply once to each attack variant so losing Aim restores both range and darkness
// penalties, and cover remains a defense bonus rather than an attack penalty.
// Extra dice against a declared Dexterity-denied opponent, joined to every damage expression.
export function sneakAttackDice(c,ctx,effects,a){
 const rows=effects.filter(e=>e.target==='sneakAttack');
 if(!rows.length||!attackTarget(c).dexDenied||a.areaType||!['melee','ranged'].includes(a.mode))return null;
 if(a.mode==='ranged'&&!(Number.isFinite(a.targetDistance)&&a.targetDistance<=rows[0].rangedSquares))return null;
 return {dice:Math.min(rows[0].maximum,rows.length),die:rows[0].die};
}
// Reviewed opponent-trait bonuses: typed attack increase, flat damage and extra weapon dice.
export function targetTraitBonuses(c,pack,effects,a,mods={}){
 const t=attackTarget(c),match=e=>t[e.against]&&(!e.mode||a.mode===e.mode);
 if(a.areaType||!a.damage)return null;
 const source=e=>(pack.talents.find(r=>r.id===e.selection?.id)||pack.feats.find(r=>r.id===e.selection?.id))?.name||'';
 const attackRows=effects.filter(e=>e.target==='targetAttack'&&match(e)),damageRows=effects.filter(e=>e.target==='targetDamage'&&match(e)),diceRows=effects.filter(e=>e.target==='targetDice'&&match(e));
 if(!attackRows.length&&!damageRows.length&&!diceRows.length)return null;
 const die=/d(\d+)/.exec(a.damage)?.[1];
 return {attack:modifierIncrease(a.attackModifierRows||[],attackRows.map(e=>({amount:e.amount,type:e.type}))),damage:damageRows.reduce((n,e)=>n+Math.max(e.minimum,mods[e.ability]??0),0),dice:die?diceRows.reduce((n,e)=>n+e.dice,0):0,die,
  sources:[...attackRows.map(e=>source(e)+': +'+e.amount+' attack'),...damageRows.map(e=>source(e)+': +'+Math.max(e.minimum,mods[e.ability]??0)+' damage'),...diceRows.map(e=>source(e)+': +'+e.dice+'d'+die)]};
}
function withExtraDamage(a,terms,breakdown,attack=0){
 if(!terms&&!attack)return a;
 const add=row=>Object.fromEntries(['damageDisplay','criticalDamageDisplay','rollDamageDisplay','rollCriticalDamageDisplay'].filter(k=>typeof row[k]==='string'&&row.damage).map(k=>[k,row[k]+terms]));
 return {...a,...add(a),attack:a.attack+attack,...Object.fromEntries(['unAimed','unBraced','unSwing'].filter(k=>a[k]).map(k=>[k,{...a[k],...(terms?add({...a,...a[k]}):{}),...(a[k].attack!==undefined?{attack:a[k].attack+attack}:{})}])),breakdown:a.breakdown+breakdown};
}
export function applyAttackTarget(a,c,pack,ctx,species,effects=[],mods={}){
 const sneak=sneakAttackDice(c,ctx,effects,a);
 if(sneak)a={...withExtraDamage(a,'+'+sneak.dice+'d'+sneak.die,'; Sneak Attack: +'+sneak.dice+'d'+sneak.die),sneakAttack:sneak};
 const traits=targetTraitBonuses(c,pack,effects,a,mods);
 if(traits)a={...withExtraDamage(a,(traits.damage?'+'+traits.damage:'')+(traits.dice?'+'+traits.dice+'d'+traits.die:''),traits.sources.map(s=>'; '+s).join(''),traits.attack),targetTraits:traits};
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
 const t=c.attackTarget,flags=['darkness','prone','helpless','adjacentToAlly','attackSquare',...TARGET_TRAITS.map(([key])=>key)];
 if(!t||typeof t!=='object'||Array.isArray(t)||Object.keys(t).some(k=>!['cover','concealment',...flags].includes(k)))bad('attack target');
 if(t.cover!==undefined&&!['none','cover','improved','total'].includes(t.cover))bad('target cover');
 if(t.concealment!==undefined&&!['none','concealment','total'].includes(t.concealment))bad('target concealment');
 for(const key of flags)if(t[key]!==undefined&&typeof t[key]!=='boolean')bad('attack target '+key);
}
