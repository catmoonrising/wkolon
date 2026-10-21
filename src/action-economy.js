// This module has no rules-engine dependency, so character validation can use it.
export const ACTION_TYPES=['full','standard','move','swift','free','reaction'];
export const ACTION_NAMES={full:'Full-Round',standard:'Standard',move:'Move',swift:'Swift',free:'Free',reaction:'Reaction'};
export const emptyActionState=()=>({version:1,active:false,phase:'normal',turn:1,spent:[],ended:false,reactions:[],forceSpent:false,recover:{count:0,lastTurn:0},plan:[],history:[]});
export const actionState=c=>c.actionState||emptyActionState();
export function checkForcePointAvailable(c,d,{power=null,forceCost=0,reaction=false}={}){
 const s=actionState(c);
 return !reaction&&!d.incapacitated&&!d.helpless&&!d.flatFooted&&!s.ended&&!s.forceSpent&&d.forceCurrent>0&&!forceCost&&(!power||!power.descriptors.includes('dark-side')&&!(power.descriptors.includes('light-side')&&c.darkSideScore>0));
}
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
const string=(v,max=2000)=>typeof v==='string'&&v.length<=max;
function boundedJSON(v,depth=0){
 if(depth>6)return false;
 if(v===null||typeof v==='boolean')return true;
 if(typeof v==='number')return Number.isFinite(v)&&Math.abs(v)<=Number.MAX_SAFE_INTEGER;
 if(typeof v==='string')return v.length<=2000;
 if(Array.isArray(v))return v.length<=100&&v.every(x=>boundedJSON(x,depth+1));
 return object(v)&&Object.keys(v).length<=40&&Object.entries(v).every(([k,x])=>/^[a-zA-Z][a-zA-Z0-9-]{0,60}$/.test(k)&&!['constructor','prototype'].includes(k)&&boundedJSON(x,depth+1));
}
export function validateActionState(c,bad){
 if(c.actionState===undefined)return;
 const s=c.actionState,fail=()=>bad('action state');
 if(!object(s)||Object.keys(s).some(k=>!Object.keys(emptyActionState()).includes(k))||s.version!==1||s.phase!==undefined&&!['normal','aware','surprised'].includes(s.phase)||typeof s.active!=='boolean'||!integer(s.turn,1,1000000000)||!Array.isArray(s.spent)||s.spent.some(k=>!['standard','move','swift'].includes(k))||new Set(s.spent).size!==s.spent.length||typeof s.ended!=='boolean'||typeof s.forceSpent!=='boolean'||!Array.isArray(s.reactions)||s.reactions.length>100||s.reactions.some(k=>!string(k,200)||!k.trim())||new Set(s.reactions).size!==s.reactions.length||!object(s.recover)||Object.keys(s.recover).sort().join()!=='count,lastTurn'||!integer(s.recover.count,0,2)||!integer(s.recover.lastTurn,0,s.turn)||!Array.isArray(s.plan)||s.plan.length>30||!Array.isArray(s.history)||s.history.length>100){fail();return;}
 const ids=new Set();
 for(const step of [...s.plan,...s.history]){
  if(!object(step)||Object.keys(step).some(k=>!['id','action','options','status','result','turn'].includes(k))||!string(step.id,36)||!/^[a-f0-9-]{36}$/.test(step.id)||ids.has(step.id)||!string(step.action,100)||!/^[a-z][a-z0-9-]*$/.test(step.action)||!object(step.options)||!boundedJSON(step.options)||!['queued','done','waiting'].includes(step.status)||step.turn!==undefined&&!integer(step.turn,1,s.turn)){fail();return;}
  ids.add(step.id);
  if(step.status==='queued'&&(step.result!==undefined||step.turn!==undefined)||step.status!=='queued'&&(!integer(step.turn,1,s.turn)||!object(step.result)||!string(step.result.text)||Object.keys(step.result).some(k=>!['text','check','fpAllowed','enhanceAllowed'].includes(k)))){fail();return;}
  const check=step.result?.check;
  if(check!==undefined&&(!object(check)||Object.keys(check).sort().join()!=='bonus,natural,total'||!integer(check.natural,1,20)||!integer(check.bonus,-100000,100000)||!integer(check.total,-100000,100000))){fail();return;}
  if(['fpAllowed','enhanceAllowed'].some(k=>step.result?.[k]!==undefined&&typeof step.result[k]!=='boolean')){fail();return;}
 }
 if(s.history.some(step=>step.status!=='done')||s.plan.filter(step=>step.status==='waiting').length>1)fail();
}
export function costLabel(cost){return (cost.type==='full'?'Full-Round':cost.type==='free'||cost.type==='reaction'?ACTION_NAMES[cost.type]:(cost.count||1)+' '+ACTION_NAMES[cost.type])+(cost.also?' + '+ACTION_NAMES[cost.also]:'');}
export function allocateActions(state,cost,rules,trigger=''){
 if(!ACTION_TYPES.includes(cost.type)||!integer(cost.count??1,1,3))throw new Error('Invalid action cost');
 if(cost.type==='reaction'){
  const key=trigger.trim().normalize('NFKC').toLowerCase();
  if(!key)throw new Error('Identify the triggering action or effect');
  if(state.reactions.includes(key))throw new Error('Already reacted to this trigger');
  return {slots:[],reaction:key};
 }
 if(cost.type==='free')return {slots:[]};
 if(state.ended)throw new Error('Turn ended');
 const slots=cost.type==='full'?rules.fullRound.slice():[];
 if(cost.type!=='full')for(let i=0;i<(cost.count||1);i++){
  const slot=rules.substitutions[cost.type]?.find(k=>!state.spent.includes(k)&&!slots.includes(k));
  if(!slot)throw new Error('Not enough '+ACTION_NAMES[cost.type]+' actions');
  slots.push(slot);
 }
 if(slots.some(k=>state.spent.includes(k)))throw new Error('Full-Round requires Standard, Move and Swift');
 if(cost.also){const extra=allocateActions({...state,spent:[...state.spent,...slots]},{type:cost.also},rules);slots.push(...extra.slots);}
 return {slots};
}
export function spendActions(state,allocation){state.spent.push(...allocation.slots);if(allocation.reaction)state.reactions.push(allocation.reaction);}
export function queueAction(c,action,options={}){
 if(c.actionState?.plan.length>=30)throw new Error('Maximum 30 planned actions');
 if(!string(action,100)||!/^[a-z][a-z0-9-]*$/.test(action)||!object(options)||!boundedJSON(options))throw new Error('Invalid action choices');
 c.actionState??=emptyActionState();
 const step={id:crypto.randomUUID(),action,options:structuredClone(options),status:'queued'};
 c.actionState.plan.push(step);return step;
}
export function archivePlan(c){
 const s=c.actionState;if(!s)return;
 s.history.push(...s.plan.filter(p=>p.status==='done'));s.history=s.history.slice(-100);s.plan=s.plan.filter(p=>p.status!=='done');
}
export function clearSurprisePhase(c){if(c.actionState?.phase&&c.actionState.phase!=='normal'){c.flatFooted=false;c.actionState.phase='normal';}}
export function resetActionTurn(c){
 const s=c.actionState;if(!s)return;
 if(s.plan.some(p=>p.status==='waiting'))throw new Error('Resolve the pending Force Point choice');
 clearSurprisePhase(c);archivePlan(c);s.turn++;s.phase='normal';s.spent=[];s.reactions=[];s.forceSpent=false;s.ended=false;if(s.recover.lastTurn<s.turn-1)s.recover.count=0;
}
