import {planAcrobaticsMove,planProneAction,acrobaticsPath} from './acrobatics-movement.js';
import {clearAiming,clearBracing} from './attack-techniques.js';
import {clearFollowUps} from './attack-follow-ups.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

function check(plan,entered,roller){
 if(!plan.skill)return null;
 const r=entered===null?roller('1d20'+(plan.skill.total>=0?'+':'')+plan.skill.total):{value:entered,display:String(entered)};
 if(!Number.isInteger(r.value)||r.value< -100000||r.value>100000||entered===null&&(!Array.isArray(r.d20)||r.d20.length!==1||!Number.isInteger(r.d20[0])||r.d20[0]<1||r.d20[0]>20))throw new Error('Invalid Acrobatics roll');
 return {...r,success:r.value>=plan.dc};
}
function beginAction(c,moveAction){
 clearFollowUps(c);clearAiming(c);clearBracing(c);
 if(moveAction)delete c.routineProgress;
}
export function acrobaticsMove(c,d,pack,roller=evalExpr){
 const plan=planAcrobaticsMove(c,d,pack),rolled=check(plan,plan.path.check,roller),success=rolled?.success??true;
 beginAction(c,true);
 if(rolled&&c.acrobaticsMovement?.check!==undefined)c.acrobaticsMovement.check=null;
 const protectedSquares=rolled?.success?plan.path.tumbled.squares:0;
 const movementComplete=success;
 const name=plan.path.tumble?'Tumble':'Move',note=`${plan.path.path.squares} squares (${plan.cost}/${plan.maximum} movement; ${plan.path.mode})`;
 const outcome=rolled?(success?`${protectedSquares} squares avoid attacks of opportunity`:'Failure; movement can provoke'+(plan.path.occupied?'; passage through occupied squares unconfirmed':'')):'';
 const text=`${name}: ${rolled?`Acrobatics ${rolled.value} / DC ${plan.dc}; `:''}${note}${outcome?'; '+outcome:''}`;
 return {...plan,rolled,success,protectedSquares,movementComplete,text,html:`<b>${name}</b>: ${rolled?`${rolled.display} = ${totalHtml(rolled)} / DC ${plan.dc}; `:''}${escape(note)}${outcome?'; '+escape(outcome):''}`};
}
export function proneAction(c,d,pack,acrobatics=false,roller=evalExpr){
 const plan=planProneAction(c,d,pack,acrobatics),rolled=check(plan,null,roller),success=rolled?.success??true;
 // A failed trained attempt changes no position and never spends the ordinary
 // Move/Swift alternative automatically. The action economy remains explicit.
 beginAction(c,success&&plan.action==='move-action');
 if(success)c.prone=!plan.standing;
 const name=plan.standing?'Stand Up':'Fall Prone',action=plan.action.replaceAll('-',' ');
 const text=`${name}: ${rolled?`Acrobatics ${rolled.value} / DC ${plan.dc}; ${success?'Success':'Failure'}; `:''}${action}`;
 return {...plan,rolled,success,text,html:`<b>${name}</b>: ${rolled?`${rolled.display} = ${totalHtml(rolled)} / DC ${plan.dc}; ${success?'Success':'Failure'}; `:''}${escape(action)}`};
}
