import {movementSpeed} from './combat-movement.js';
import {clearAiming,clearBracing} from './attack-techniques.js';
import {clearFollowUps} from './attack-follow-ups.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

export const jumpState=c=>({kind:'long',meters:3,runUp:0,pole:false,moves:1,checkMode:'roll',check:null,calm:false,safe:false,...c.jump});
export function validateJump(c,bad){
 if(c.jump===undefined)return;
 const p=jumpState(c);
 if(!c.jump||typeof c.jump!=='object'||Array.isArray(c.jump)||Object.keys(c.jump).some(k=>!Object.keys(jumpState({})).includes(k))||!['long','high'].includes(p.kind)||!Number.isFinite(p.meters)||p.meters<=0||p.meters>100000||!Number.isInteger(p.runUp)||p.runUp<0||p.runUp>100000||![1,2].includes(p.moves)||!['roll','take10','take20'].includes(p.checkMode)||p.check!==null&&(!Number.isInteger(p.check)||Math.abs(p.check)>100000)||['pole','calm','safe'].some(k=>typeof p[k]!=='boolean'))bad('Jump declaration');
}
export function planJump(c,d,pack){
 validateJump(c,message=>{throw new Error('Invalid '+message);});
 const p=jumpState(c),rule=pack.rules.jumpMovement,skill=d.skills.find(s=>s.id===rule.skillId),noCheck=!!d.movementPowers?.jumpWithoutCheck;
 if(d.incapacitated||d.helpless)throw new Error('Jump unavailable');
 if(d.load?.overloaded)throw new Error('Straining requires full-round movement');
 if(!noCheck&&!skill?.available)throw new Error('Jump unavailable');
 const cost=p.runUp+p.meters/rule.metersPerSquare,maximum=movementSpeed(d)*p.moves;
 if(cost>maximum+1e-9)throw new Error('Jump exceeds movement');
 const running=!!d.movementPowers?.runningStart||p.runUp>=rule.runningStartSquares;
 const dc=p.meters*rule.dcPerMeter[p.kind]*(running?1:rule.standingMultiplier)*(p.kind==='high'&&p.pole?rule.poleMultiplier:1);
 if(!noCheck){
  const native=skill.checkSource===skill.id,specialTake10=native&&pack.species.find(s=>s.id===c.species)?.take10Skills?.includes(skill.id);
  const trained=d.ctx.trained.has(skill.checkSource||skill.id);
  if(p.checkMode==='take10'&&!specialTake10&&(!trained||!p.calm))throw new Error('Take 10 requires training and no pressure');
  if(p.checkMode==='take20'&&c.movementPowerEffects?.length)throw new Error('Surge expires before Take 20 completes');
  if(p.checkMode==='take20'&&!p.safe)throw new Error('Take 20 requires safe retries');
 }
 return {path:p,rule,skill,cost,maximum,running,dc,noCheck,name:p.kind==='long'?'Long Jump':'High Jump',timeMultiplier:!noCheck&&p.checkMode==='take20'?rule.take20TimeMultiplier:1};
}
export function rollJump(plan,roller=evalExpr){
 if(plan.noCheck)return {text:plan.name+': no check (Surge)',check:null};
 const p=plan.path,bonus=plan.skill.total;
 const natural=p.checkMode==='take10'?10:p.checkMode==='take20'?20:null;
 const roll=natural===null&&p.check===null?roller('1d20'+(bonus>=0?'+':'')+bonus):null;
 const total=natural!==null?natural+bonus:p.check??roll?.value;
 const die=natural??roll?.d20?.[0];
 if(!Number.isInteger(total)||Math.abs(total)>100000||roll&&(!Number.isInteger(die)||die<1||die>20||total!==die+bonus))throw new Error('Invalid Jump check');
 const check={natural:die??10,bonus,total};
 const text=plan.name+': '+total+' / DC '+plan.dc+(natural===10?' (Take 10)':natural===20?' (Take 20, '+plan.timeMultiplier+'x time)':'');
 return {text,check,html:roll?roll.display+' = '+totalHtml(roll):undefined};
}
export function finishJump(c,plan,check){
 if(!plan.noCheck&&(!check||!Number.isInteger(check.total)))throw new Error('Jump check unavailable');
 clearAiming(c);clearBracing(c);clearFollowUps(c);delete c.routineProgress;
 if(c.jump?.check!==undefined)c.jump.check=null;
 const success=plan.noCheck||check.total>=plan.dc;
 return {success,text:(success?'Success':'Failed')+'; '+plan.path.meters+' m ('+Number(plan.cost.toFixed(3))+'/'+plan.maximum+' squares)'};
}
export function jump(c,d,pack,roller=evalExpr){
 const plan=planJump(c,d,pack),r=rollJump(plan,roller),finished=finishJump(c,plan,r.check);
 return {...plan,...r,...finished,text:r.text+'; '+finished.text,html:escape(r.text+'; '+finished.text)+(r.html?'<div>'+r.html+'</div>':'')};
}
