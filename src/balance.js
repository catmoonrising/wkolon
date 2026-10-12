import {movementSegment,movementCost,validateSegment} from './combat-movement.js';
import {clearAiming,clearBracing} from './attack-techniques.js';
import {clearFollowUps} from './attack-follow-ups.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

export const balanceState=c=>({width:'8-15',unstable:false,check:null,catchCheck:null,active:false,activeDC:null,...c.balance,path:movementSegment({squares:1,...c.balance?.path})});
export const balanceFlatFooted=(c,ctx)=>!!c.balance?.active&&!ctx.trained.has('skill:acrobatics');
export function validateBalance(c,bad){
 if(c.balance===undefined)return;
 const p=c.balance;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['width','unstable','check','catchCheck','active','activeDC','path'].includes(k)))bad('Balance state');
 if(p.width!==undefined&&!['8-15','4-7','under-4'].includes(p.width))bad('Balance width');
 for(const key of ['unstable','active'])if(p[key]!==undefined&&typeof p[key]!=='boolean')bad('Balance '+key);
 for(const key of ['check','catchCheck'])if(p[key]!==undefined&&p[key]!==null&&(!Number.isInteger(p[key])||Math.abs(p[key])>100000))bad('Balance check');
 if(p.activeDC!==undefined&&p.activeDC!==null&&![10,15,20,25].includes(p.activeDC))bad('Balance DC');
 if(p.active&&!Number.isInteger(p.activeDC))bad('active Balance DC');
 if(p.path!==undefined)validateSegment(p.path,bad);
}
export const balanceDC=(c,pack)=>{const p=balanceState(c),r=pack.rules.balance;return r.widthDCs[p.width]+(p.unstable?r.unstableDCIncrease:0);};
export function planBalance(c,d,pack,recheck=false){
 validateBalance(c,message=>{throw new Error('Invalid '+message);});
 const p=balanceState(c),r=pack.rules.balance,skill=d.skills.find(s=>s.id===r.skillId);
 if(d.incapacitated||d.helpless||!skill?.available)throw new Error('Balance unavailable');
 if(recheck&&!p.active)throw new Error('Not balancing');
 const cost=movementCost(p.path,pack.rules[r.movementCostRule]),maximum=Math.floor(d.speed*r.speedMultiplier);
 if(!recheck){
  if(c.prone)throw new Error('Stand up before balancing');
  if(d.load?.overloaded)throw new Error('Straining requires full-round movement');
  if(!p.path.squares)throw new Error('Choose movement squares');
  if(cost>maximum)throw new Error('Balance exceeds half Speed');
 }
 return {path:p,skill,dc:recheck?p.activeDC:balanceDC(c,pack),cost,maximum,recheck};
}
function check(skill,entered,dc,roller){
 const roll=entered===null?roller('1d20'+(skill.total>=0?'+':'')+skill.total):{value:entered,display:String(entered)};
 if(!Number.isInteger(roll.value)||Math.abs(roll.value)>100000||entered===null&&(!Array.isArray(roll.d20)||roll.d20.length!==1||!Number.isInteger(roll.d20[0])||roll.d20[0]<1||roll.d20[0]>20))throw new Error('Invalid Balance roll');
 return {...roll,success:roll.value>=dc};
}
export function balance(c,d,pack,recheck=false,roller=evalExpr){
 const plan=planBalance(c,d,pack,recheck),p=plan.path,r=pack.rules.balance,roll=check(plan.skill,p.check,plan.dc,roller);
 // Validate both rolls before changing character state.
 const caught=roll.success?null:check(plan.skill,p.catchCheck,r.catchDC,roller),fell=!!caught&&!caught.success;
 if(!recheck||!roll.success){clearFollowUps(c);clearAiming(c);clearBracing(c);delete c.routineProgress;}
 c.balance={...p,check:null,...(caught?{catchCheck:null}:{}),active:!fell,activeDC:plan.dc};
 if(!roll.success)c.prone=true;
 const name=recheck?'Balance recheck':'Balance',outcome=roll.success?(recheck?'Keeps balance':`${p.path.squares} squares (${plan.cost}/${plan.maximum} movement)`):`Prone; Catch ${caught.value} / DC ${r.catchDC}; ${fell?'Fall':'Caught ledge or wire'}`;
 const text=`${name}: Acrobatics ${roll.value} / DC ${plan.dc}; ${outcome}`;
 const html=`<b>${name}</b>: ${roll.display} = ${totalHtml(roll)} / DC ${plan.dc}; ${escape(outcome)}`;
 return {...plan,roll,caught,fell,success:roll.success,text,html};
}
export function stopBalancing(c){if(c.balance)c.balance.active=false;}
export function balanceAfterDamage(c,d,pack,roller=evalExpr){
 if(d.incapacitated||d.helpless||!d.skills.find(s=>s.id===pack.rules.balance.skillId)?.available){stopBalancing(c);c.prone=true;return {fell:true,text:'Balance: unavailable; Fall',html:'<b>Balance</b>: unavailable; Fall'};}
 return balance(c,d,pack,true,roller);
}
