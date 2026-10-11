import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

const uuid=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
export const emptyProtection=()=>({dr:0,drBypass:'',sr:0,srMax:0});
export function prepareCombatState(c){
 c.protection??=emptyProtection();c.routines??=[];c.xp??=0;c.darkSideScore??=0;
 for(const item of c.inventory)item.uid??=crypto.randomUUID();
 return c;
}
export function validateCombatState(c,bad){
 for(const key of ['xp','darkSideScore'])if(c[key]!==undefined&&!integer(c[key],0,1000000000))bad(key);
 const uids=c.inventory.filter(i=>i.uid!==undefined).map(i=>i.uid);
 if(uids.some(id=>!uuid(id)||id===c.id)||new Set(uids).size!==uids.length)bad('inventory IDs');
 if(c.protection!==undefined){
  const p=c.protection;
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['dr','drBypass','sr','srMax'].includes(k))||!['dr','sr','srMax'].every(k=>integer(p[k],0,100000))||p.sr>p.srMax||typeof p.drBypass!=='string'||p.drBypass.length>2000)bad('DR or SR');
 }
 if(c.routines===undefined)return;
 if(!Array.isArray(c.routines)||c.routines.length>20)bad('routines');
 const ids=new Set();
 for(const r of c.routines){
  if(!r||Object.keys(r).some(k=>!['id','name','steps'].includes(k))||!uuid(r.id)||ids.has(r.id)||typeof r.name!=='string'||r.name.length>200||!Array.isArray(r.steps)||r.steps.length>50)bad('routine');
  ids.add(r.id);let count=0;
  for(const s of r.steps){
   if(!s||Object.keys(s).some(k=>!['id','attackId','count','attackMod','damageMod'].includes(k))||!uuid(s.id)||ids.has(s.id)||!uuid(s.attackId)||!integer(s.count,1,20)||!integer(s.attackMod,-1000,1000)||!integer(s.damageMod,-1000,1000))bad('routine step');
   ids.add(s.id);count+=s.count;
  }
  if(count>100)bad('maximum 100 attacks per routine');
 }
}
export function protectedDamage(protection,amount,rules,ignoreDR=false){
 if(!integer(amount,0,1000000000))throw new Error('Enter valid damage');
 const srBlocked=Math.min(amount,protection.sr),afterShield=amount-srBlocked;
 const drBlocked=ignoreDR?0:Math.min(afterShield,protection.dr);
 return {hpDamage:afterShield-drBlocked,srBlocked,drBlocked,srAfter:Math.max(0,protection.sr-(amount>protection.sr?rules.shieldLoss:0))};
}
export function defenseRangeRows(results){
 if(results.some(r=>r.areaType)){
  const totals=[...new Set(results.filter(r=>!r.naturalHit&&!r.naturalMiss&&!r.failedArea).map(r=>r.total))].sort((a,b)=>b-a);
  const ranges=totals.length?[{lo:totals[0]+1,hi:null},...totals.map((t,i)=>({lo:totals[i+1]===undefined?null:totals[i+1]+1,hi:t}))]:[{lo:null,hi:null}];
  return ranges.map(row=>{
   const defense=row.hi??Infinity;let damage=0,evasion=0,cover=0,splash=0;
   for(const r of results){
    if(r.failedArea||r.naturalMiss&&!r.areaType)continue;
    const hit=!r.naturalMiss&&(r.naturalHit||r.total>=defense),half=Math.floor(r.damage/2);
    damage+=hit?r.damage:r.areaType?half:0;
    evasion+=r.areaType?(hit?half:0):(hit?r.damage:0);
    cover+=hit?r.damage:0;
    if(r.areaType==='splash'&&hit)splash+=half;
   }
   return {...row,damage,evasion,cover,splash};
  });
 }
 const critical=results.filter(r=>r.naturalHit).reduce((n,r)=>n+r.damage,0);
 const hits=results.filter(r=>!r.naturalHit&&!r.naturalMiss);
 const totals=[...new Set(hits.map(r=>r.total))].sort((a,b)=>b-a);
 if(!totals.length)return [{lo:null,hi:null,damage:critical}];
 const rows=[{lo:totals[0]+1,hi:null,damage:critical}];let damage=critical;
 totals.forEach((t,i)=>{damage+=hits.filter(r=>r.total===t).reduce((n,r)=>n+r.damage,0);rows.push({lo:totals[i+1]===undefined?null:totals[i+1]+1,hi:t,damage});});
 return rows;
}
const signed=n=>n>=0?'+'+n:String(n);
export function routinePlan(routine,attacks){
 if(!routine.steps.length)throw new Error('Add an attack');
 const spending=new Map();
 const plan=routine.steps.map(s=>{
  const attack=attacks.find(a=>a.uid===s.attackId);
  if(!attack)throw new Error('Attack unavailable');
  if(!integer(s.count,1,20))throw new Error('Attack count must be 1–20');
  if(attack.ammunition?.remaining!==null&&attack.ammunition?.remaining!==undefined){
   const shots=(spending.get(attack.uid)?.shots||0)+s.count*attack.ammunition.cost;
   if(shots>attack.ammunition.remaining)throw new Error(`${attack.name}: needs ${shots} ${shots===1?'shot':'shots'}; ${attack.ammunition.remaining} loaded`);
   spending.set(attack.uid,{uid:attack.uid,shots});
  }
  if(attack.available===false)throw new Error('Attack unavailable');
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
 const results=[],aimConsumed=new Set(attacks.filter(a=>a.aimed).map(a=>a.uid));
 for(const {step:s,attack:original} of plan)for(let i=0;i<s.count;i++){
  const a=results.length&&original.unAimed?{...original,...original.unAimed}:original;
  const attackRoll=roller('1d20'+signed(a.attack+s.attackMod)),die=attackRoll.d20[0];
  const naturalHit=die===rules.naturalHit,naturalMiss=die===rules.naturalMiss;
  const failedArea=!!a.areaType&&attackRoll.value<rules.areaMinimumRoll;
  const critical=naturalHit&&!a.areaType,multiplier=a.criticalMultiplier||rules.criticalMultiplier;
  let damageRoll=null,damage=0;
  if(!failedArea&&(!naturalMiss||a.areaType)){
   const expr=a.damageDisplay+(s.damageMod?signed(s.damageMod):'');
   damageRoll=roller(critical?`(${expr})*${multiplier}`:expr);
   damage=Math.max(rules.minimumDamage*(critical?multiplier:1),damageRoll.value);
   damageRoll={...damageRoll,value:damage};
  }
  results.push({name:a.name,total:attackRoll.value,damage,naturalHit,naturalMiss,failedArea,critical,areaType:a.areaType,aimed:!!a.aimed,ignoresDarkness:!!a.ignoresDarkness,attackRoll,damageRoll});
 }
 const rows=defenseRangeRows(results),range=r=>r.lo===null?(r.hi===null?'Any':`≤ ${r.hi}`):r.hi===null?`${r.lo}+`:r.lo===r.hi?String(r.lo):`${r.lo}–${r.hi}`;
 const area=results.some(r=>r.areaType),splash=results.some(r=>r.areaType==='splash');
 const details=results.map(r=>`<div><b>${escape(r.name)}</b>: ${r.attackRoll.display} = ${totalHtml(r.attackRoll)}${r.naturalMiss||r.failedArea?' · Miss':r.critical?' · Critical':r.naturalHit?' · Hit':''}${r.damageRoll?` | ${r.damageRoll.display} = ${totalHtml(r.damageRoll)}`:''}${r.aimed?' · Ignores cover':''}${r.ignoresDarkness?' · Ignores Concealment from darkness':''}</div>`).join('');
 return {results,rows,aimConsumed:[...aimConsumed],ammunitionSpent,text:`${routine.name||'Routine'}: ${rows.map(r=>`${defense} ${range(r)}: ${r.damage} damage`).join('; ')}`,
  html:`<b>${escape(routine.name||'Routine')}</b><table class="routine-result"><thead><tr><th>${defense}</th><th title="Rolled damage, before target damage-type effects, DR and SR">Damage</th>${area?'<th>Evasion</th><th>Cover</th>':''}${splash?'<th>Splash</th>':''}</tr></thead><tbody>${rows.map(r=>`<tr><td>${range(r)}</td><td>${r.damage}</td>${area?`<td>${r.evasion}</td><td>${r.cover}</td>`:''}${splash?`<td>${r.splash}</td>`:''}</tr>`).join('')}</tbody></table><details><summary>Rolls</summary>${details}</details>`};
}
