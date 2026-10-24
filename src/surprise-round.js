import {endFlatFootedTriggers} from './triggered-defenses.js';
import {emptyActionState} from './action-economy.js';
import {hasRageTechnique} from './rage-powers.js';
export const ACTION_PHASES=[['normal','Normal'],['aware','Surprise (Aware)'],['surprised','Surprised']];
export const actionPhase=s=>s?.phase||'normal';
export const actionPhaseLocked=c=>!!c.actionState&&(c.actionState.ended||c.actionState.spent.length>0||c.actionState.reactions.length>0||c.actionState.plan.some(s=>s.status!=='queued'));
export function setActionPhase(c,phase,pack){
 if(!ACTION_PHASES.some(([id])=>id===phase))throw new Error('Invalid round');
 if(actionPhaseLocked(c))throw new Error('Choose the round before acting');
 c.actionState??=emptyActionState();const old=actionPhase(c.actionState);c.actionState.phase=phase;c.actionState.active=true;
 if(phase!=='normal'){c.flatFooted=true;if(pack)endFlatFootedTriggers(c,pack,c.flatFooted);}else if(old!=='normal')c.flatFooted=false;
}
export function surpriseActionIssue(c,d,pack,view){
 const s=c.actionState,phase=actionPhase(s);if(phase==='normal')return '';
 const exception=view.power?.id===pack.rules.surpriseRound.exception.powerId&&hasRageTechnique(d.ctx,pack);
 if(phase==='surprised'&&!exception)return 'Surprised';
 if(['free','reaction'].includes(view.cost.type))return '';
 if(!pack.rules.surpriseRound.types.includes(view.cost.type)||(view.cost.count||1)!==1||view.cost.also&&view.cost.also!=='free')return 'One Standard, Move or Swift action in a Surprise Round';
 if(s?.spent.length)return 'Surprise Round action already used';
 return '';
}
