import {validAttackReference} from './attack-refs.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';
import {FULL_ATTACK_SOURCES,planFullAttack} from './full-attacks.js';
import {validateDefensiveCombat} from './defensive-combat.js';
import {planCharge,validateCharge} from './charge.js';
import {validateAcrobaticsMovement} from './acrobatics-movement.js';
import {validateBalance} from './balance.js';
import {validateEscapeBonds} from './escape-bonds.js';
import {validateFalling} from './falling.js';
import {validateCombatMovement} from './combat-movement.js';
import {validateOpportunity} from './opportunity.js';
import {validateFollowUps} from './attack-follow-ups.js';
import {validateRoutineProgress} from './routine-progress.js';
import {validateAttackTarget} from './attack-targets.js';

const uuid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export const emptyProtection=()=>({dr:0,drBypass:'',sr:0,srMax:0});
export function prepareCombatState(c){
 c.protection??=emptyProtection();c.routines??=[];c.xp??=0;c.darkSideScore??=0;
 for(const item of c.inventory)item.uid??=crypto.randomUUID();
 return c;
}
export function validateCombatState(c,bad){
 validateDefensiveCombat(c,bad);
 validateCharge(c,bad);
 validateAttackTarget(c,bad);
 validateOpportunity(c,bad);
 validateCombatMovement(c,bad);
 validateAcrobaticsMovement(c,bad);
 validateBalance(c,bad);
 validateEscapeBonds(c,bad);
 validateFalling(c,bad);
 validateFollowUps(c,bad);
 if(c.fullAttackPenalties!==undefined){
  const p=c.fullAttackPenalties;
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['twoWeapons','doubleAttack','tripleAttack'].includes(k))||
    !['twoWeapons','doubleAttack','tripleAttack'].every(k=>[0,...(k==='twoWeapons'?[-2,-5,-10]:[-5])].includes(p[k])))bad('Full Attack penalties');
 }
 for(const key of ['xp','darkSideScore'])if(c[key]!==undefined&&!integer(c[key],0,1000000000))bad(key);
 const uids=c.inventory.filter(i=>i.uid!==undefined).map(i=>i.uid);
 if(uids.some(id=>!uuid(id)||id===c.id)||new Set(uids).size!==uids.length)bad('inventory IDs');
 if(c.protection!==undefined){
  const p=c.protection;
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['dr','drBypass','sr','srMax'].includes(k))||!['dr','sr','srMax'].every(k=>integer(p[k],0,100000))||p.sr>p.srMax||typeof p.drBypass!=='string'||p.drBypass.length>2000)bad('DR or SR');
 }
 if(c.routines===undefined){validateRoutineProgress(c,bad);return;}
 if(!Array.isArray(c.routines)||c.routines.length>20)bad('routines');
 const ids=new Set();
 for(const r of c.routines){
  if(!r||Object.keys(r).some(k=>!['id','name','steps','kind'].includes(k))||r.kind!==undefined&&r.kind!=='fullAttack'||!uuid(r.id)||ids.has(r.id)||typeof r.name!=='string'||r.name.length>200||!Array.isArray(r.steps)||r.steps.length>50)bad('routine');
  ids.add(r.id);let count=0;
  for(const s of r.steps){
   if(!s||Object.keys(s).some(k=>!['id','attackId','count','attackMod','damageMod','source'].includes(k))||
     (r.kind==='fullAttack'?!FULL_ATTACK_SOURCES.includes(s.source)||s.count!==1:s.source!==undefined)||
     !uuid(s.id)||ids.has(s.id)||!validAttackReference(s.attackId)||!integer(s.count,1,20)||!integer(s.attackMod,-1000,1000)||!integer(s.damageMod,-1000,1000))bad('routine step');
   ids.add(s.id);count+=s.count;
  }
  if(r.kind==='fullAttack'&&(r.steps.filter(s=>s.source==='base').length!==1||new Set(r.steps.map(s=>s.source)).size!==r.steps.length))bad('Full Attack sources');
  if(count>100)bad('maximum 100 attacks per routine');
 }
 validateRoutineProgress(c,bad);
}
export function protectedDamage(protection,amount,rules,ignoreDR=false){
 if(!integer(amount,0,1000000000))throw new Error('Enter valid damage');
 const srBlocked=Math.min(amount,protection.sr),afterShield=amount-srBlocked;
 const drBlocked=ignoreDR?0:Math.min(afterShield,protection.dr);
 return {hpDamage:afterShield-drBlocked,srBlocked,drBlocked,srAfter:Math.max(0,protection.sr-(amount>protection.sr?rules.shieldLoss:0))};
}
export function defenseRangeRows(results){
 const total=r=>r.total-(r.coverBonus||0);
 if(results.some(r=>r.areaType)){
  const totals=[...new Set(results.filter(r=>!r.naturalHit&&!r.naturalMiss&&!r.failedArea).map(total))].sort((a,b)=>b-a);
  const ranges=totals.length?[{lo:totals[0]+1,hi:null},...totals.map((t,i)=>({lo:totals[i+1]===undefined?null:totals[i+1]+1,hi:t}))]:[{lo:null,hi:null}];
  return ranges.map(row=>{
   const defense=row.hi??Infinity;let damage=0,evasion=0,cover=0,splash=0;
   for(const r of results){
    if(r.failedArea||r.naturalMiss&&!r.areaType)continue;
    const hit=!r.naturalMiss&&(r.naturalHit||total(r)>=defense),half=Math.floor((r.damage-(hit?0:r.hitOnlyDamage||0))/2);
    damage+=hit?r.damage:r.areaType&&!r.targetCover?half:0;
    evasion+=r.areaType?(hit?half:0):(hit?r.damage:0);
    cover+=hit?r.damage:0;
    if(r.areaType==='splash'&&hit)splash+=half;
   }
   return {...row,damage,evasion,cover,splash};
  });
 }
 const critical=results.filter(r=>r.naturalHit).reduce((n,r)=>n+r.damage,0);
 const hits=results.filter(r=>!r.naturalHit&&!r.naturalMiss);
 const totals=[...new Set(hits.map(total))].sort((a,b)=>b-a);
 if(!totals.length)return [{lo:null,hi:null,damage:critical}];
 const rows=[{lo:totals[0]+1,hi:null,damage:critical}];let damage=critical;
 totals.forEach((t,i)=>{damage+=hits.filter(r=>total(r)===t).reduce((n,r)=>n+r.damage,0);rows.push({lo:totals[i+1]===undefined?null:totals[i+1]+1,hi:t,damage});});
 return rows;
}
const signed=n=>n>=0?'+'+n:String(n);
export function rollCombatRoutine(routine,d,pack,roller=evalExpr){
 const plan=planFullAttack(routine,d,pack),result=rollRoutine(plan.routine,plan.attacks,pack.rules.combat,roller);
 return {...result,...(plan.penalties?{fullAttackPenalties:plan.penalties}:{})};
}
export function rollCharge(c,d,pack,uid,roller=evalExpr){
 const plan=planCharge(c,d,pack,uid),r={name:'Charge',steps:[{attackId:uid,count:1,attackMod:0,damageMod:0}]};
 routinePlan(r,[plan.attack]);
 const check=plan.dc===null?null:plan.path.acrobatics===null?roller('1d20'+signed(plan.skill.total)):{value:plan.path.acrobatics,display:String(plan.path.acrobatics)};
 const success=!check||check.value>=plan.dc,movementCost=success?plan.successfulCost:plan.normalCost;
 const stopped=plan.nimbleRequired&&!success||movementCost>plan.maximum;
 const checkText=check?`Acrobatics ${check.value} / DC ${plan.dc}; `:'',note=`${checkText}${plan.path.squares} squares (${movementCost}/${plan.maximum} movement); no further actions this turn`;
 const result=stopped?{text:'Charge: '+note+'; no attack',html:'<b>Charge</b>: '+escape(note)+'; no attack',results:[],ammunitionSpent:[]}:
  rollRoutine(r,[plan.attack],pack.rules.combat,roller);
 return {...result,text:stopped?result.text:result.text+'; '+note,html:stopped?result.html:result.html+'<div>'+escape(note)+'</div>',chargeReflexPenalty:plan.reflexPenalty,
  ...(check&&plan.path.acrobatics!==null?{chargeEnteredTotal:plan.path.acrobatics}:{}),bracingConsumed:true,aimConsumed:d.attacks.filter(a=>a.aimed).map(a=>a.uid),charge:{attackBonus:plan.attackBonus,damageBonus:plan.damageBonus,movementCost,check,dc:plan.dc,nimbleRequired:plan.nimbleRequired,stopped}};
}
export function routinePlan(routine,attacks){
 if(!routine.steps.length)throw new Error('Add an attack');
 const spending=new Map();
 const plan=routine.steps.map(s=>{
  const attack=attacks.find(a=>a.uid===s.attackId);
  if(!attack)throw new Error('Attack unavailable');
  if(!integer(s.count,1,20))throw new Error('Attack count must be 1–20');
  if(attack.ammunition?.remaining!==null&&attack.ammunition?.remaining!==undefined){
   const shots=(spending.get(attack.uid)?.shots||0)+s.count*attack.ammunition.cost;
   if(shots>attack.ammunition.remaining&&!attack.ammunition.freeReloads)throw new Error(`${attack.name}: needs ${shots} ${shots===1?'shot':'shots'}; ${attack.ammunition.remaining} loaded`);
   spending.set(attack.uid,{uid:attack.uid,shots,...(shots>attack.ammunition.remaining?{reloadShots:shots-attack.ammunition.remaining}:{})});
  }
  if(attack.available===false)throw new Error(attack.issue||'Attack unavailable');
  if(attack.damage===null)throw new Error(attack.damageAction||'Choose ammunition');
  return {step:s,attack};
 });
 if(plan.reduce((n,p)=>n+p.step.count,0)>100)throw new Error('Maximum 100 attacks per routine');
 return {plan,ammunitionSpent:[...spending.values()]};
}
export function routineIssue(routine,attacks){try{routinePlan(routine,attacks);return '';}catch(e){return e.message;}}
export function rollRoutine(routine,attacks,rules,roller=evalExpr,defense='Reflex'){
 if(!['Reflex','Fortitude'].includes(defense))throw new Error('Unsupported defense');
 const {plan,ammunitionSpent}=routinePlan(routine,attacks);
 const results=[],aimConsumed=new Set(attacks.filter(a=>a.aimed).map(a=>a.uid));let mightySwingConsumed=false;
 for(const {step:s,attack:original} of plan)for(let i=0;i<s.count;i++){
  let a={...original};
  const expire=variant=>{if(!variant)return;const attack=a.attack+(variant.attack===undefined?0:variant.attack-original.attack);a={...a,...variant,attack};};
  if(results.length){expire(original.unAimed);expire(original.unBraced);}
  if(mightySwingConsumed)expire(original.unSwing);
  if(a.mightySwing)mightySwingConsumed=true;
  const strike=results.length?null:a.battleStrike;
  if(results.length&&a.battleStrike)a.attack-=a.battleStrike.attackBonus;
  const attackRoll=roller('1d20'+signed(a.attack+s.attackMod)),die=attackRoll.d20[0];
  const naturalHit=die===rules.naturalHit,naturalMiss=die===rules.naturalMiss;
  const failedArea=!!a.areaType&&attackRoll.value<rules.areaMinimumRoll;
  const critical=!naturalMiss&&die>=(a.criticalThreat||rules.naturalHit)&&!a.areaType,multiplier=a.criticalMultiplier||rules.criticalMultiplier;
  let damageRoll=null,damage=0,hitOnlyDamage=0;
  if(!failedArea&&(!naturalMiss||a.areaType)){
   const expr=(critical?(a.rollCriticalDamageDisplay||a.criticalDamageDisplay||a.rollDamageDisplay||a.damageDisplay):(a.rollDamageDisplay||a.damageDisplay))+(s.damageMod?signed(s.damageMod):'');
   damageRoll=roller(critical?`(${expr})*${multiplier}`:expr);
   const baseValue=damageRoll.value;
   damage=Math.max(rules.minimumDamage*(critical?multiplier:1),baseValue);
   damageRoll={...damageRoll,value:damage};
   if(strike&&!naturalMiss){
    const expr=strike.dice+'d'+strike.die,extra=roller(critical?'('+expr+')*'+multiplier:expr);
    if(!Number.isSafeInteger(extra.value)||extra.value<strike.dice*(critical?multiplier:1)||extra.value>strike.dice*strike.die*(critical?multiplier:1)||!Number.isSafeInteger(baseValue+extra.value))throw new Error('Invalid power damage roll');
    const combined=Math.max(rules.minimumDamage*(critical?multiplier:1),baseValue+extra.value);hitOnlyDamage=combined-damage;damage=combined;damageRoll={...damageRoll,value:damage,display:damageRoll.display+' + '+extra.display};
   }
  }
  results.push({uid:a.uid,weaponId:a.id,mode:a.mode,...(a.bonusHPOnDamage?{bonusHPOnDamage:a.bonusHPOnDamage}:{}),attackBonus:a.attack+s.attackMod,...(Number.isInteger(a.targetModifiers?.targetPenalty)?{targetBonus:a.targetModifiers.targetPenalty}:{}),name:a.name,total:attackRoll.value,damage,...(hitOnlyDamage?{hitOnlyDamage}:{}),...(strike?{battleStrikePrevious:strike.previous}:{}),naturalHit,naturalMiss,failedArea,critical,areaType:a.areaType,aimed:!!a.aimed,braced:!!a.braced,mightySwing:!!a.mightySwing,ignoresDarkness:!!a.ignoresDarkness,coverBonus:a.coverBonus||0,targetCover:!!a.targetCover,attackRoll,damageRoll});
 }
 const rows=defenseRangeRows(results),range=r=>r.lo===null?(r.hi===null?'Any':`≤ ${r.hi}`):r.hi===null?`${r.lo}+`:r.lo===r.hi?String(r.lo):`${r.lo}–${r.hi}`;
 const area=results.some(r=>r.areaType),splash=results.some(r=>r.areaType==='splash'),defenseLabel=defense+(results.some(r=>r.coverBonus)?' (before cover)':'');
 const details=results.map(r=>`<div><b>${escape(r.name)}</b>: ${r.attackRoll.display} = ${totalHtml(r.attackRoll)}${r.naturalMiss||r.failedArea?', Miss':r.critical?(r.naturalHit?', Critical':', Critical if hits'):r.naturalHit?', Hit':''}${r.damageRoll?` | ${r.damageRoll.display} = ${totalHtml(r.damageRoll)}`:''}${r.aimed?', Ignores cover':''}${r.coverBonus?', Target Reflex +'+r.coverBonus+' cover':''}${r.braced?', Braced':''}${r.mightySwing?', Mighty Swing':''}${r.ignoresDarkness?', Ignores Concealment from darkness':''}</div>`).join('');
 const reloads=ammunitionSpent.filter(s=>s.reloadShots).map(s=>`${attacks.find(a=>a.uid===s.uid).name}: ${s.reloadShots}`).join('; ');
 return {...(results[0]?.battleStrikePrevious!==undefined?{battleStrikePrevious:results[0].battleStrikePrevious}:{}),results,rows,aimConsumed:[...aimConsumed],bracingConsumed:attacks.some(a=>a.braced),mightySwingConsumed,ammunitionSpent,...(attacks.some(a=>typeof a.flatFooted==='boolean')?{flatFooted:attacks.some(a=>a.flatFooted)}:{}),text:`${routine.name||'Routine'}: ${rows.map(r=>`${defenseLabel} ${range(r)}: ${r.damage} damage`).join('; ')}`,
  html:`<b>${escape(routine.name||'Routine')}</b><table class="routine-result"><thead><tr><th>${defenseLabel}</th><th title="Rolled damage, before target damage-type effects, DR and SR">Damage</th>${area?'<th>Evasion</th><th>Cover</th>':''}${splash?'<th>Splash</th>':''}</tr></thead><tbody>${rows.map(r=>`<tr><td>${range(r)}</td><td>${r.damage}</td>${area?`<td>${r.evasion}</td><td>${r.cover}</td>`:''}${splash?`<td>${r.splash}</td>`:''}</tr>`).join('')}</tbody></table><details><summary>Rolls</summary>${details}${reloads?`<div>Free reloads: ${escape(reloads)}</div>`:''}</details>`};
}
