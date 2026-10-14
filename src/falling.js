import {ambiguityValue} from './house-rules.js';
import {damageOutcome,applyIncomingDamage} from './incoming-damage.js';
import {stopBalancing} from './balance.js';
import {clearAiming,clearBracing} from './attack-techniques.js';
import {clearFollowUps} from './attack-follow-ups.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

export const fallingState=c=>({kind:'fall',meters:3,reduction:'none',check:null,jumpCheck:null,jumpMode:'roll',calm:false,safe:false,natural:null,damage:null,ignoreDR:false,survive:false,...c.falling});
export function validateFalling(c,bad){
 if(c.falling===undefined)return;
 const p=c.falling;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['kind','meters','reduction','check','jumpCheck','jumpMode','calm','safe','natural','damage','ignoreDR','survive'].includes(k)))bad('Falling state');
 if(p.kind!==undefined&&!['fall','jump'].includes(p.kind))bad('fall type');
 if(p.meters!==undefined&&(!Number.isFinite(p.meters)||p.meters<0||p.meters>1e9))bad('fall height');
 if(p.reduction!==undefined&&!['none','acrobatics','jump','both'].includes(p.reduction))bad('fall reduction');
 if(p.jumpMode!==undefined&&!['roll','take10','take20'].includes(p.jumpMode))bad('Jump Down mode');
 for(const key of ['check','jumpCheck'])if(p[key]!==undefined&&p[key]!==null&&(!Number.isInteger(p[key])||Math.abs(p[key])>100000))bad('fall check');
 if(p.natural!==undefined&&p.natural!==null&&(!Number.isInteger(p.natural)||p.natural<1||p.natural>20))bad('fall attack die');
 if(p.damage!==undefined&&p.damage!==null&&(!Number.isInteger(p.damage)||p.damage<0||p.damage>1e9))bad('fall damage');
 for(const key of ['calm','safe','ignoreDR','survive'])if(p[key]!==undefined&&typeof p[key]!=='boolean')bad('fall '+key);
}
export function planFalling(c,d,pack){
 validateFalling(c,message=>{throw new Error('Invalid '+message);});
 const p=fallingState(c),r=pack.rules.falling,checks=[];
 if(d.recovery.dead)throw new Error('Character is dead or destroyed');
 if(!p.meters)throw new Error('Enter fall height');
 if(p.reduction==='both'&&ambiguityValue(c,pack,r.combinationAmbiguityId)!=='both')throw new Error('Fall reductions are mutually exclusive');
 for(const type of ['acrobatics','jump'])if(p.reduction===type||p.reduction==='both'){
  const record=r.reduction[type],skill=d.skills.find(s=>s.id===record.skillId),trained=d.ctx.trained.has(record.skillId);
  if(d.incapacitated||d.helpless||!skill?.available)throw new Error('Fall reduction unavailable');
  if(type==='jump'&&p.kind!=='jump')throw new Error('Jump reduction requires an intentional Jump Down');
  if((record.trainedOnly||type==='jump'&&ambiguityValue(c,pack,record.trainingAmbiguityId)==='trained')&&!trained)throw new Error('Requires trained '+(type==='jump'?'Jump':'Acrobatics'));
  const mode=type==='acrobatics'?'roll':p.jumpMode,entered=type==='acrobatics'?p.check:p.jumpCheck;
  const speciesTake10=type==='jump'&&skill.checkSource===skill.id&&pack.species.find(s=>s.id===c.species)?.take10Skills?.includes(skill.id);
  if(mode==='take10'&&!speciesTake10){
   if(!trained)throw new Error('Take 10 requires trained Jump');
   if(!p.calm)throw new Error('Take 10 requires no rush, threats, distraction or danger');
  }
  if(mode==='take20'&&!p.safe)throw new Error('Take 20 requires safe retries and plenty of time');
  if(mode!=='roll'&&skill.checkSource!==skill.id)throw new Error('Enter a total for the substituted Jump check');
  if(p.damage!==null&&mode==='roll'&&entered===null)throw new Error('Enter reduction totals before entering damage');
  checks.push({type,skill,mode,entered,dc:r.reductionDC});
 }
 const plan={path:p,rule:r,checks,defense:d.defenses[r.defense]};
 const known=knownFallingDistance(plan);
 if(p.damage!==null){const dice=known.dice;if(p.damage<dice||p.damage>dice*r.damageDie)throw new Error(`Enter ${dice}d${r.damageDie} damage (${dice}–${dice*r.damageDie})`);}
 return plan;
}
function reductionResult(record,roll,r){
 const success=roll.value>=record.dc,reduced=success?r.reductionMeters*(1+Math.floor((roll.value-record.dc)/r.extraReductionMargin)):0;
 return {...record,roll,success,reduced};
}
export function fallingDistance(plan,reductions){
 const {path:p,rule:r}=plan,base=plan.checks.length?Math.min(p.meters,r.maximumReductionDistance):p.meters;
 const reduced=reductions.reduce((sum,c)=>sum+c.reduced,0),effective=Math.max(0,base-reduced),dice=Math.min(r.maximumDice,Math.floor(effective/r.metersPerDie));
 return {base,reduced,effective,dice};
}
export function knownFallingDistance(plan){
 const reductions=[];
 for(const check of plan.checks){
  const value=check.mode==='take10'?10+check.skill.total:check.mode==='take20'?20+check.skill.total:check.entered;
  if(value===null)return null;
  reductions.push(reductionResult(check,{value},plan.rule));
 }
 return fallingDistance(plan,reductions);
}
function skillRoll(record,r,roller){
 const total=record.mode==='take10'?10+record.skill.total:record.mode==='take20'?20+record.skill.total:record.entered;
 const roll=total===null?roller('1d20'+(record.skill.total>=0?'+':'')+record.skill.total):{value:total,display:record.mode==='roll'?String(total):`${record.mode==='take10'?'10':'20'} ${record.skill.total>=0?'+':'−'} ${Math.abs(record.skill.total)}`};
 if(!Number.isInteger(roll.value)||Math.abs(roll.value)>100000||total===null&&(!Array.isArray(roll.d20)||roll.d20.length!==1||!Number.isInteger(roll.d20[0])||roll.d20[0]<1||roll.d20[0]>20))throw new Error('Invalid fall reduction roll');
 return reductionResult(record,roll,r);
}
export function resolveFalling(c,d,pack,roller=evalExpr){
 const plan=planFalling(c,d,pack),p=plan.path,r=plan.rule,reductions=plan.checks.map(check=>skillRoll(check,r,roller)),distance=fallingDistance(plan,reductions);
 const attackRoll=p.natural===null?roller('1d20+'+r.attackBonus):{value:p.natural+r.attackBonus,d20:[p.natural],display:String(p.natural)+' + '+r.attackBonus};
 const natural=attackRoll.d20?.[0];
 if(!Array.isArray(attackRoll.d20)||!Number.isInteger(natural)||natural<1||natural>20||attackRoll.d20.length!==1||attackRoll.value!==natural+r.attackBonus)throw new Error('Invalid falling attack roll');
 const hit=natural!==r.naturalMiss&&(natural===r.naturalHit||attackRoll.value>=plan.defense),critical=natural===r.naturalHit;
 const damageRoll=p.damage!==null?{value:p.damage,display:String(p.damage)}:distance.dice?roller(`${distance.dice}d${r.damageDie}`):{value:0,display:'0'};
 if(!Number.isInteger(damageRoll.value)||damageRoll.value<distance.dice||damageRoll.value>distance.dice*r.damageDie)throw new Error('Invalid falling damage roll');
 const amount=critical?damageRoll.value*r.criticalMultiplier:hit?damageRoll.value:Math.floor(damageRoll.value/r.missDivisor);
 // A resolved fall ends balancing. Preview the damage before mutating anything,
 // so an invalid Force Point survival declaration cannot leave a half-applied fall.
 const landed={...c,balance:c.balance?{...c.balance,active:false}:undefined};
 const options={ignoreDR:p.ignoreDR,spendForcePoint:p.survive};damageOutcome(landed,d,pack,amount,options);
 stopBalancing(c);
 const damage=applyIncomingDamage(c,d,pack,amount,options),standing=reductions.some(check=>check.success)&&damage.hpDamage===0;
 c.prone=!standing;
 // An accidental fall is not an action or automatic loss of line of sight.
 // Intentional jumping spends the character's movement/preparation instead.
 if(p.kind==='jump'){clearAiming(c);clearBracing(c);clearFollowUps(c);delete c.routineProgress;}
 c.falling={...p,natural:null,damage:null,...(reductions.some(check=>check.type==='acrobatics')?{check:null}:{}),...(reductions.some(check=>check.type==='jump'&&check.mode==='roll')?{jumpCheck:null}:{})};
 const checksText=reductions.map(check=>`${check.skill.name} ${check.roll.value} / DC ${check.dc}${check.mode==='take20'?'; Take 20 (20× time)':check.mode==='take10'?'; Take 10':''}; −${check.reduced} m`).join('; ');
 const outcome=`${critical?'Critical':hit?'Hit':'Miss; half damage'}; ${amount} damage; SR −${damage.srBlocked}, DR −${damage.drBlocked}; HP ${damage.beforeHP} → ${damage.afterHP}${damage.conditionSteps?`; −${damage.conditionSteps} condition steps`:''}${damage.dead?'; '+(pack.species.find(s=>s.id===c.species).isDroid?'Destroyed':'Dead'):''}${damage.forcePointSpent?'; −1 Force Point':''}; ${standing?'On feet':'Prone'}`;
 const text=`${p.kind==='jump'?'Jump Down':'Fall'} ${p.meters} m${checksText?'; '+checksText:''}; ${distance.effective} m for damage (${distance.dice}d${r.damageDie}); Attack ${attackRoll.value} vs Fortitude ${plan.defense}; ${outcome}`;
 const html=`<b>${p.kind==='jump'?'Jump Down':'Fall'} ${p.meters} m</b>${reductions.map(check=>`<div>${escape(check.skill.name)}: ${check.roll.display} = ${totalHtml(check.roll)} / DC ${check.dc}${check.mode==='take20'?'; Take 20 (20× time)':check.mode==='take10'?'; Take 10':''}; −${check.reduced} m</div>`).join('')}<div>${distance.effective} m for damage (${distance.dice}d${r.damageDie}); Attack ${attackRoll.display} = ${totalHtml(attackRoll)} vs Fortitude ${plan.defense}; Damage ${damageRoll.display} = ${totalHtml(damageRoll)}</div><div>${escape(outcome)}</div>`;
 return {...plan,reductions,...distance,attackRoll,hit,critical,damageRoll,amount,damage,standing,text,html};
}
