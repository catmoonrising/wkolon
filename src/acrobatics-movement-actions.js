import {applyMoveFeatEffects} from './turn-feat-effects.js';
import {planAcrobaticsMove,planProneAction,acrobaticsMoveCost} from './acrobatics-movement.js';
import {ambiguityValue} from './house-rules.js';
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
 const plan=planAcrobaticsMove(c,d,pack),p=plan.path;
 const shared=p.crossTerrain&&p.tumble&&ambiguityValue(c,pack,'ambiguity:tumble-cross-check')==='shared';
 const entered=p.tumble&&p.checkMode==='take10'?10+plan.skill.total:p.check??(shared?p.terrainCheck:null);
 const sharedRoll=shared?check(plan,entered,roller):null;
 const terrainRoll=shared?sharedRoll:p.crossTerrain?check({...plan,dc:pack.rules.acrobaticsMovement.crossTerrain.dc},p.terrainCheck,roller):null;
 const tumbleRoll=shared?sharedRoll:p.tumble?check(plan,entered,roller):null;
 if(tumbleRoll&&p.checkMode==='take10')tumbleRoll.display='10 + '+plan.skill.total+' (Take 10)';
 const crossSucceeded=terrainRoll?.success??false,tumbleSucceeded=tumbleRoll?.success??true;
 const cost=acrobaticsMoveCost(c,pack,crossSucceeded,d),success=(terrainRoll?.success??true)&&tumbleSucceeded;
 const movementComplete=cost<=plan.maximum&&tumbleSucceeded;
 const qualifiedSquares=tumbleRoll?.success?p.tumbled.squares:0,protectedSquares=movementComplete?qualifiedSquares:0;
 const protectionUnconfirmed=qualifiedSquares>0&&!movementComplete,rolled=tumbleRoll||terrainRoll;
 beginAction(c,true);
 const featEffects=movementComplete?applyMoveFeatEffects(c,d,pack,p.displacement):[];
 if(tumbleRoll&&c.acrobaticsMovement?.check!==undefined)c.acrobaticsMovement.check=null;
 if(terrainRoll&&c.acrobaticsMovement?.terrainCheck!==undefined)c.acrobaticsMovement.terrainCheck=null;
 const name=p.tumble?'Tumble':'Move',note=`${p.path.squares} squares (${cost}/${plan.maximum} movement; ${p.mode})`;
 const checks=shared?[{name:'Tumble + Cross Difficult Terrain',roll:sharedRoll,dc:plan.dc}]:[...(terrainRoll?[{name:'Cross Difficult Terrain',roll:terrainRoll,dc:pack.rules.acrobaticsMovement.crossTerrain.dc}]:[]),...(tumbleRoll?[{name:terrainRoll?'Tumble':'Acrobatics',roll:tumbleRoll,dc:plan.dc}]:[])];
 const outcomes=[];
 if(terrainRoll&&!terrainRoll.success)outcomes.push('Cross Difficult Terrain failed; normal terrain costs');
 if(cost>plan.maximum)outcomes.push('route exceeds Speed; movement unconfirmed');
 if(tumbleRoll)outcomes.push(tumbleRoll.success?(protectionUnconfirmed?'Tumble succeeded; protection applies only to squares actually tumbled':`${protectedSquares} squares avoid attacks of opportunity`):'Failure; movement can provoke'+(p.occupied?'; passage through occupied squares unconfirmed':''));
 const outcome=outcomes.join('; '),text=`${name}: ${checks.map(c=>`${c.name} ${c.roll.value} / DC ${c.dc}; `).join('')}${note}${outcome?'; '+outcome:''}`;
 const html=`<b>${name}</b>: ${checks.map(c=>`${c.name} ${c.roll.display} = ${totalHtml(c.roll)} / DC ${c.dc}; `).join('')}${escape(note)}${outcome?'; '+escape(outcome):''}`;
 return {...plan,featEffects,plannedCost:plan.cost,cost,terrainRoll,tumbleRoll,rolled,checks,success,qualifiedSquares,protectedSquares,protectionUnconfirmed,movementComplete,text,html};
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
