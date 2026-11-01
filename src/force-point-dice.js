// Force Point die steps for one check or attack (docs/force-point-dice.md).
const stepped=(die,steps)=>Math.min(12,die+2*steps);

export function forcePointCheckDice(effects,die){
 const steps={};
 for(const e of effects)if(e.target==='forcePointCheckDie'){const skill=e.skill==='$choice'?e.selection.choice:e.skill;steps[skill]=(steps[skill]||0)+e.steps;}
 return Object.fromEntries(Object.entries(steps).map(([skill,n])=>[skill,stepped(die,n)]));
}
export const forcePointAttackRules=effects=>effects.filter(e=>e.target==='forcePointAttackDie'||e.target==='forcePointAttackDamage').map(({target,weapons,steps,type})=>({target,weapons,...(steps?{steps}:{}),...(type?{type}:{})}));

const attackRows=(d,attack,target)=>attack?(d.forcePointAttackRules||[]).filter(r=>r.target===target&&r.weapons.includes(attack.id)):[];
export function forcePointDieFor(d,{skill=null,attack=null}={}){
 if(skill&&d.forcePointCheckDice?.[skill])return d.forcePointCheckDice[skill];
 const steps=attackRows(d,attack,'forcePointAttackDie').reduce((n,r)=>n+r.steps,0);
 return steps?stepped(d.forcePointDie,steps):d.forcePointDie;
}
export const forcePointExpression=(d,context)=>`${d.forcePointDice}d${forcePointDieFor(d,context)}kh1`;
export const forcePointAddsDamage=(d,attack)=>attackRows(d,attack,'forcePointAttackDamage').length>0;
