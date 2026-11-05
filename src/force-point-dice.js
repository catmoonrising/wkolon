// Force Point die steps for one check or attack (docs/force-point-dice.md).
import {modifierIncrease} from './modifiers.js';
const stepped=(die,steps)=>Math.min(12,die+2*steps);

export function forcePointCheckDice(effects,die){
 const steps={};
 for(const e of effects)if(e.target==='forcePointCheckDie'){const skill=e.skill==='$choice'?e.selection.choice:e.skill;steps[skill]=(steps[skill]||0)+e.steps;}
 return Object.fromEntries(Object.entries(steps).map(([skill,n])=>[skill,stepped(die,n)]));
}
export const forcePointAttackRules=effects=>effects.filter(e=>e.target==='forcePointAttackDie'||e.target==='forcePointAttackDamage').map(({target,weapons,steps,type})=>({target,weapons,...(steps?{steps}:{}),...(type?{type}:{})}));

const attackRows=(d,attack,target)=>attack?(d.forcePointAttackRules||[]).filter(r=>r.target===target&&r.weapons.includes(attack.id)):[];
export function forcePointDieFor(d,{skill=null,attack=null}={}){
 if(skill){const source=d.skills?.find(s=>s.id===skill)?.checkSource||skill;return d.forcePointCheckDice?.[source]||d.forcePointDie;}
 const steps=attackRows(d,attack,'forcePointAttackDie').reduce((n,r)=>n+r.steps,0);
 return steps?stepped(d.forcePointDie,steps):d.forcePointDie;
}
export const forcePointExpression=(d,context)=>`${d.forcePointDice}d${forcePointDieFor(d,context)}kh1`;
export const forcePointAddsDamage=(d,attack)=>attackRows(d,attack,'forcePointAttackDamage').length>0;
export const forcePointDamageIncrease=(d,attack,amount)=>modifierIncrease(attack?.damageModifierRows||[],attackRows(d,attack,'forcePointAttackDamage').map(r=>({type:r.type,amount})));
export function rollForcePoint(d,context,roller){
 const result=roller(forcePointExpression(d,context));
 if(!Number.isInteger(result?.value)||result.value<1||result.value>forcePointDieFor(d,context))throw new Error('Invalid Force Point roll');
 return result;
}
