import {planFullAttack} from './full-attacks.js';
import {rollRoutine,routinePlan} from './combat.js';

import {routineSignature} from './routine-progress.js';
export function routineStepPlan(c,d,pack,id){
 const r=c.routines.find(r=>r.id===id);if(!r)throw new Error('Routine unavailable');
 const signature=routineSignature(r),progress=c.routineProgress;
 if(progress?.id===id&&progress.signature!==signature)throw new Error('Routine changed; restart it');
 const index=progress?.id===id?progress.index:0,plan=planFullAttack(r,d,pack);
 const steps=r.steps.flatMap(s=>Array.from({length:s.count},()=>({...s,count:1}))),step=steps[index];
 if(!step)throw new Error('Routine complete');
 routinePlan({steps:steps.slice(index)},plan.attacks);
 if(d.incapacitated||d.helpless)throw new Error('Attack unavailable');
 return {...plan,routine:{name:(r.name||'Routine')+` · ${index+1}/${steps.length}`,steps:[step]},progress:index+1<steps.length?{id,index:index+1,signature}:null};
}
export function rollRoutineStep(c,d,pack,id,roller){
 const p=routineStepPlan(c,d,pack,id),result=rollRoutine(p.routine,p.attacks,pack.rules.combat,roller);
 return {...result,routineDefinition:{id,signature:routineSignature(c.routines.find(r=>r.id===id))},...(p.penalties?{fullAttackPenalties:p.penalties}:{}),routineProgressPrevious:structuredClone(c.routineProgress??null),routineProgress:p.progress};
}
