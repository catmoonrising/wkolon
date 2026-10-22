import {incomingDamageDeclaration} from './damage-declarations.js';
import {activeLightsabers} from './power-activation.js';
import {applyIncomingDamage,damageOutcome} from './incoming-damage.js';
import {skillRerollSources,compatibleReroll,rerollUsesAvailable,useSkillReroll,spendRerollUse} from './skill-rerolls.js';
const integer=(n,a,b)=>Number.isInteger(n)&&n>=a&&n<=b;
const has=(d,id)=>d.ctx.talents.some(t=>t.id===id&&!d.ctx.inactiveTalents.has(id));
export const deflectionRule=(pack,id)=>pack.rules.deflectionActions?.find(r=>r.id===id);
export function deflectionPenalty(c,pack,ctx){const style=pack.rules.deflectionModifiers?.find(r=>ctx?.talents.some(t=>t.id===r.talentId&&!ctx.inactiveTalents.has(t.id)));return (c.deflectionAttempts||0)*(style?.penaltyPerPriorAttempt??pack.rules.deflection.penaltyPerPriorAttempt);}
export const pendingDeflection=c=>c.actionState?.plan.find(s=>['block','deflect'].includes(s.action)&&s.status==='waiting');
export function assertDeflectionResolved(c){if(pendingDeflection(c))throw new Error('Resolve Block or Deflect first');}
export function deflectionDeclaration(o,rule){
 const incoming=incomingDamageDeclaration(o.incoming),kind=o.kind??'single',target=o.target??'self';
 if(!rule.kinds.includes(kind)||!['self','adjacent'].includes(target)||!integer(o.attackRoll,-100000,100000)||!['failed','always','none'].includes(o.rerolls??'failed'))throw new Error('Invalid attack declaration');
 for(const key of ['hit','cover','capital','pointDefense','attackerForcePoint','allyEvasion'])if(o[key]!==undefined&&typeof o[key]!=='boolean')throw new Error('Invalid attack declaration');
 const sonicDamage=o.sonicDamage??0;if(!integer(sonicDamage,0,incoming.amount)||sonicDamage&&!incoming.options.sonic)throw new Error('Invalid Sonic damage');
 if(rule.sonicException&&incoming.options.sonic&&(!sonicDamage||sonicDamage===incoming.amount))throw new Error('Sonic ranged weapons cannot be Deflected');
 if(rule.capitalRequiresPointDefense&&o.capital&&!o.pointDefense)throw new Error('Capital attacks require Point-Defense');
 if(target==='adjacent'&&incoming.options.spendForcePoint)throw new Error('Resolve the ally\'s survival separately');
 if(kind==='force-lightning'&&incoming.options.type!=='normal')throw new Error('Force Lightning requires normal damage');
 return {incoming,kind,target,attackRoll:o.attackRoll,hit:o.hit!==false,cover:!!o.cover,sonicDamage,capital:!!o.capital,pointDefense:!!o.pointDefense,attackerForcePoint:!!o.attackerForcePoint,allyEvasion:!!o.allyEvasion,rerolls:o.rerolls??'failed'};
}
export function deflectionDamage(c,d,pack,rule,o,success){
 const s=deflectionDeclaration(o,rule),area=['area','autofire'].includes(s.kind),special=rule.halfOnSuccess.includes(s.kind),evasion=s.target==='self'?has(d,pack.rules.deflection.evasionTalentId):s.allyEvasion;
 let amount=s.incoming.amount;
 if((area&&s.attackRoll<pack.rules.combat.areaMinimumRoll)||!s.hit&&(!area&&s.kind!=='force-lightning'||area&&(s.cover||evasion)))amount=0;
 else if(success){
  if(!s.hit)amount=0;
  else {const remainder=rule.sonicException?s.sonicDamage:0;amount=(special?Math.floor((amount-remainder)/2):0)+remainder;}
 }else if(!s.hit)amount=Math.floor(amount/2);
 if(area&&s.hit&&evasion)amount=Math.floor(amount/2);
 const conditionSteps=s.kind==='force-lightning'&&s.hit?(s.attackerForcePoint?pack.rules.deflection.forceLightningEnhancedConditionSteps:pack.rules.deflection.forceLightningConditionSteps):0;
 const options={...s.incoming.options,conditionSteps,requiresUseTheForce:s.incoming.options.requiresUseTheForce||s.kind==='force-lightning'};
 if(success&&rule.sonicException&&s.sonicDamage&&amount===s.sonicDamage&&!special){options.energy=true;options.otherDamage=false;options.fire=false;options.cold=false;options.electrical=false;}
 return {amount,options,target:s.target,success};
}
export function deflectionPlan(c,d,pack,id,o){
 const rule=deflectionRule(pack,id);if(!rule||!has(d,rule.talentId))throw new Error('Talent unavailable');
 if(d.incapacitated||d.helpless||!d.skills.find(s=>s.id===pack.rules.deflection.skillId)?.available)throw new Error('Use the Force unavailable');
 if(d.flatFooted)throw new Error('Unavailable while flat-footed');if(o.aware!==true)throw new Error('Confirm awareness of the attack');
 if(!activeLightsabers(c,pack).length)throw new Error('Requires an activated, wielded Lightsaber');
 const declaration=deflectionDeclaration(o,rule),forceCost=declaration.target==='adjacent'?pack.rules.deflection.adjacentForcePoints:0;
 if((c.deflectionAttempts||0)>=10000)throw new Error('Too many reactions this turn');
 if(forceCost&&(c.actionState?.forceSpent||d.forceCurrent<forceCost))throw new Error('Force Point unavailable');
 if(forceCost&&declaration.incoming.options.spendForcePoint)throw new Error('Only one Force Point per round');
 // Preflight the failure without changing any resources. Allies resolve protection separately.
 if(declaration.target==='self'){const failed=deflectionDamage(c,d,pack,rule,declaration,false);if(failed.amount||failed.options.conditionSteps)damageOutcome(c,d,pack,failed.amount,failed.options);}
 const skill=d.skills.find(s=>s.id===pack.rules.deflection.skillId),penalty=deflectionPenalty(c,pack,d.ctx);
 return {rule,declaration,forceCost,penalty,bonus:skill.total-penalty};
}
export function deflectionRerollSources(c,d,pack,step){
 const saved=step.options.deflectionCheck;if(!saved)return [];
 const skill=d.skills.find(s=>s.id===pack.rules.deflection.skillId),species=pack.species.find(s=>s.id===c.species),ticket={applications:[step.action]};
 if(d.incapacitated||d.helpless||!skill?.available)return [];
 return skillRerollSources(skill,species,d).filter(s=>saved.allowed.includes(s.id)&&!saved.used.includes(s.id)&&rerollUsesAvailable(s)&&compatibleReroll(ticket,s)&&(s.when!=='failedBlockOrDeflect'||step.result.check.total<step.options.attackRoll));
}
export function snapshotDeflectionRerolls(c,d,pack,id,o,check){
 const skill=d.skills.find(s=>s.id===pack.rules.deflection.skillId),species=pack.species.find(s=>s.id===c.species);
 const allowed=skillRerollSources(skill,species,d).filter(s=>rerollUsesAvailable(s)&&compatibleReroll({applications:[id]},s)).map(s=>s.id);
 return {allowed,used:[],rolls:[check.natural],bonus:check.bonus};
}
export function rerollDeflection(c,d,pack,step,sourceId,roller){
 const source=deflectionRerollSources(c,d,pack,step).find(s=>s.id===sourceId);if(!source)throw new Error('Reroll unavailable');
 const saved=step.options.deflectionCheck,r=roller('1d20'+(saved.bonus>=0?'+':'')+saved.bonus),natural=r.d20?.[0];if(!integer(natural,1,20)||r.value!==natural+saved.bonus)throw new Error('Invalid reroll');
 const ticket={allowed:new Set(saved.allowed),used:new Set(saved.used),applications:[step.action],roll:{value:step.result.check.total,natural:step.result.check.natural}};
 useSkillReroll(ticket,source,{value:r.value,natural});spendRerollUse(c,source);saved.used=[...ticket.used];saved.rolls.push(natural);step.result.check={natural:ticket.roll.natural,bonus:saved.bonus,total:ticket.roll.value};return r;
}
export function finishDeflection(c,d,pack,step){
 const rule=deflectionRule(pack,step.action),outcome=deflectionDamage(c,d,pack,rule,step.options,step.result.check.total>=step.options.attackRoll);
 let text=step.action==='block'?'Block':'Deflect';text+=': Use the Force '+step.result.check.total+' / '+step.options.attackRoll;
 if(outcome.target==='adjacent')return {text:text+'; Force Points -1; ally '+(outcome.options.type==='normal'?'':outcome.options.type+' ')+'damage '+outcome.amount+(outcome.options.conditionSteps?'; Condition Track -'+outcome.options.conditionSteps:''),outcome};
 if(!outcome.amount&&!outcome.options.conditionSteps)return {text:text+'; no damage',outcome};
 const damage=applyIncomingDamage(c,d,pack,outcome.amount,outcome.options);
 return {text:text+`; SR -${damage.srBlocked}, DR -${damage.drBlocked}; HP ${damage.beforeHP} → ${damage.afterHP}`+(damage.conditionSteps?'; Condition Track -'+damage.conditionSteps:'')+(damage.dead?'; '+(d.ctx.isDroid?'Destroyed':'Dead'):'')+(damage.forcePointSpent?'; Force Points -1':''),outcome,damage};
}
export function validateDeflection(c,pack,bad){
 if(c.deflectionAttempts!==undefined&&!integer(c.deflectionAttempts,0,10000))bad('Block/Deflect attempts');
 for(const step of [...(c.actionState?.plan||[]),...(c.actionState?.history||[])]){
  const rule=deflectionRule(pack,step.action);if(!rule||step.status==='queued')continue;
  try{
   deflectionDeclaration(step.options,rule);const r=step.result,s=step.options.deflectionCheck;
   if(step.options.aware!==true||!s||Object.keys(s).sort().join()!=='allowed,bonus,rolls,used'||!Array.isArray(s.allowed)||s.allowed.length>40||s.allowed.some(k=>typeof k!=='string'||!k||k.length>200)||new Set(s.allowed).size!==s.allowed.length||!Array.isArray(s.used)||s.used.some(k=>!s.allowed.includes(k))||new Set(s.used).size!==s.used.length||!Array.isArray(s.rolls)||s.rolls.length!==s.used.length+1||s.rolls.some(n=>!integer(n,1,20))||!integer(s.bonus,-100000,100000)||r.check.bonus!==s.bonus||r.check.total!==r.check.natural+r.check.bonus||!s.rolls.includes(r.check.natural)||r.fpAllowed||r.enhanceAllowed||step.status==='waiting'&&!r.rerollAllowed)throw new Error();
  }catch{bad('Block/Deflect result');return;}
 }
}
