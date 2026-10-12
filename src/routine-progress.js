export const routineSignature=r=>JSON.stringify({kind:r.kind,steps:r.steps});
export function validateRoutineProgress(c,bad){
 if(c.routineProgress===undefined)return;
 const p=c.routineProgress,r=c.routines?.find(r=>r.id===p?.id);
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['id','index','signature'].includes(k))||!r||!Number.isInteger(p.index)||p.index<1||p.index>=r.steps.reduce((n,s)=>n+s.count,0)||p.signature!==routineSignature(r))bad('routine progress');
}
