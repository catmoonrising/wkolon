import {clearAiming,clearBracing} from './attack-techniques.js';
import {clearFollowUps} from './attack-follow-ups.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

export const ESCAPE_BONDS_NAMES={'ropes':'Ropes','net':'Net','binder-cuffs':'Binder Cuffs','grapple':'Grapple','tight-space':'Tight space','manacles':'Manacles'};
export const ESCAPE_BONDS_DURATIONS={'1-minute':'1 minute','5-rounds':'5 rounds','full-round-action':'Full-Round Action','standard-action':'Standard Action','move-action':'Move Action'};
export const escapeBondsState=c=>({restraint:'binder-cuffs',fast:false,dexterityCheck:null,grappleCheck:null,dc:null,check:null,...c.escapeBonds});
export function validateEscapeBonds(c,bad){
 if(c.escapeBonds===undefined)return;
 const p=c.escapeBonds;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['restraint','fast','dexterityCheck','grappleCheck','dc','check'].includes(k)))bad('Escape Bonds state');
 if(p.restraint!==undefined&&!Object.hasOwn(ESCAPE_BONDS_NAMES,p.restraint))bad('Escape Bonds restraint');
 if(p.fast!==undefined&&typeof p.fast!=='boolean')bad('Escape Bonds faster attempt');
 for(const key of ['dexterityCheck','grappleCheck','dc','check'])if(p[key]!==undefined&&p[key]!==null&&(!Number.isInteger(p[key])||Math.abs(p[key])>100000))bad('Escape Bonds '+key);
}
export function escapeBondsDetails(c,pack){
 const p=escapeBondsState(c),r=pack.rules.escapeBonds,restraint=r.restraints[p.restraint];
 const baseDC=restraint.dc.kind==='fixed'?restraint.dc.value:restraint.dc.kind==='opponent-check'?(p[restraint.dc.check+'Check']===null?null:p[restraint.dc.check+'Check']+restraint.dc.increase):p.dc;
 return {path:p,restraint,baseDC,dc:baseDC===null?null:baseDC+(p.fast?r.fast.dcIncrease:0),duration:p.fast?restraint.fastDuration:restraint.duration};
}
export function planEscapeBonds(c,d,pack){
 validateEscapeBonds(c,message=>{throw new Error('Invalid '+message);});
 const plan=escapeBondsDetails(c,pack),r=pack.rules.escapeBonds,skill=d.skills.find(s=>s.id===r.skillId);
 if(d.incapacitated||d.helpless||!skill?.available)throw new Error('Escape Bonds unavailable');
 if(plan.path.fast&&!d.ctx.trained.has(r.skillId))throw new Error('Faster escape requires trained Acrobatics');
 if(plan.dc===null)throw new Error(plan.restraint.dc.kind==='opponent-check'?`Enter opponent's ${plan.restraint.dc.check==='dexterity'?'Dexterity':'Grapple'} check`:'Enter the manacles DC');
 return {...plan,skill};
}
export function escapeBonds(c,d,pack,roller=evalExpr){
 const plan=planEscapeBonds(c,d,pack),p=plan.path;
 const roll=p.check===null?roller('1d20'+(plan.skill.total>=0?'+':'')+plan.skill.total):{value:p.check,display:String(p.check)};
 if(!Number.isInteger(roll.value)||Math.abs(roll.value)>100000||p.check===null&&(!Array.isArray(roll.d20)||roll.d20.length!==1||!Number.isInteger(roll.d20[0])||roll.d20[0]<1||roll.d20[0]>20))throw new Error('Invalid Escape Bonds roll');
 const success=roll.value>=plan.dc,movementSquares=success?(plan.restraint.movementSquares||0):0;
 // Resolve one complete attempt, including its printed duration. No unspecified
 // restraint penalties or automatic round advancement are inferred from prose.
 clearFollowUps(c);clearAiming(c);clearBracing(c);delete c.routineProgress;
 c.escapeBonds={...p,check:null};
 const name=ESCAPE_BONDS_NAMES[p.restraint],duration=ESCAPE_BONDS_DURATIONS[plan.duration];
 const outcome=success?(movementSquares?`${movementSquares} square`:'Escaped'):(plan.restraint.movementSquares?'No movement':'No escape');
 const text=`Escape Bonds (${name}): Acrobatics ${roll.value} / DC ${plan.dc}; ${duration}; ${outcome}`;
 const html=`<b>Escape Bonds (${escape(name)})</b>: ${roll.display} = ${totalHtml(roll)} / DC ${plan.dc}; ${escape(duration)}; ${escape(outcome)}`;
 return {...plan,roll,success,movementSquares,text,html};
}
