import {nextFollowUpRound} from './attack-follow-ups.js';
import {ambiguityValue} from './house-rules.js';
import {attackTarget,targetConcealment} from './attack-targets.js';

export const opportunityContext=c=>({opponent:'',action:'',distance:1,provoked:false,used:[],...c.opportunity});
export const opportunityKey=value=>value.trim().normalize('NFKC').toLowerCase();
export function opportunityState(c,pack,ctx,mods){
 const rule=pack.rules.opportunity,reflexes=ctx.feats.some(f=>f.id===rule.reflexes),used=opportunityContext(c).used.length;
 const maximum=rule.basePerRound+(reflexes?Math.max(0,mods.dex):0);
 return {reflexes,used,maximum,remaining:Math.max(0,maximum-used),limit:ambiguityValue(c,pack,'ambiguity:opportunity-limit')??rule.defaultLimit};
}
export function weaponCanOpportunity(w,entry,pack,ctx){
 const rule=pack.rules.opportunity;
 if(w.unarmed)return ctx.feats.some(f=>f.id===rule.unarmedRequires);
 return w.mode==='melee'||rule.groups.includes(w.group)||rule.foldedStock&&!!w.retractableStock&&entry.stockPosition==='folded';
}
// The player identifies a provoking event and confirms that it occurs within
// the threatened area. No square grid or opponent combat state is inferred.
export function planOpportunity(c,d,pack,uid){
 const p=opportunityContext(c),state=opportunityState(c,pack,d.ctx,d.mods),target=attackTarget(c);
 const fail=message=>{throw new Error(message);};
 if(d.incapacitated||d.helpless)fail('Cannot attack while helpless');
 if(c.flatFooted&&!state.reflexes)fail('Flat-footed: requires Combat Reflexes');
 if(!state.remaining)fail('No attacks of opportunity remaining this round');
 if(!p.opponent.trim()||!p.action.trim())fail('Identify opponent and provoking action');
 if(!p.provoked)fail('Confirm a provoking action in your threatened area');
 const opponent=opportunityKey(p.opponent),action=opportunityKey(p.action);
 if(state.limit!=='action'&&p.used.some(u=>opportunityKey(u.opponent)===opponent))fail('Already attacked this opponent this round');
 if(state.limit!=='opponent'&&p.used.some(u=>opportunityKey(u.action)===action))fail('Already attacked for this provoking action');
 // A single attack cannot be repeated by toggling interpretations mid-round.
 if(p.used.some(u=>opportunityKey(u.opponent)===opponent&&opportunityKey(u.action)===action))fail('Already attacked for this opponent and action');
 if(target.cover!=='none')fail('Cover prevents attacks of opportunity');
 const species=pack.species.find(s=>s.id===c.species);
 if(targetConcealment(target,species.vision)==='total')fail('Total Concealment prevents attacks of opportunity');
 const attack=d.attacks.find(a=>a.uid===uid);
 if(!attack?.opportunityWeapon)fail('Weapon cannot make attacks of opportunity');
 if(!attack.available||!attack.damage)fail(attack.issue||'Attack unavailable');
 return {attack,spent:{opponent:p.opponent.trim(),action:p.action.trim()},previous:structuredClone(p.used)};
}
export function startNextRound(c){
 nextFollowUpRound(c);
 if(c.opportunity){c.opportunity.used=[];c.opportunity.provoked=false;c.opportunity.action='';}
 if(c.mightySwing!==undefined)c.mightySwing=false;
}
export function validateOpportunity(c,bad){
 if(c.opportunity===undefined)return;
 const p=c.opportunity,obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),name=v=>typeof v==='string'&&v.length<=200;
 if(!obj(p)||Object.keys(p).some(k=>!['opponent','action','distance','provoked','used'].includes(k)))bad('opportunity state');
 for(const key of ['opponent','action'])if(p[key]!==undefined&&!name(p[key]))bad('opportunity '+key);
 if(p.distance!==undefined&&(!Number.isInteger(p.distance)||p.distance<1||p.distance>100000))bad('opportunity distance');
 if(p.provoked!==undefined&&typeof p.provoked!=='boolean')bad('opportunity provoked');
 if(p.used!==undefined){
  if(!Array.isArray(p.used)||p.used.length>1000)bad('opportunity history');
  const pairs=new Set();
  for(const u of p.used){
   if(!obj(u)||Object.keys(u).some(k=>!['opponent','action'].includes(k))||!name(u.opponent)||!u.opponent.trim()||!name(u.action)||!u.action.trim())bad('opportunity history entry');
   const pair=JSON.stringify([opportunityKey(u.opponent),opportunityKey(u.action)]);
   if(pairs.has(pair))bad('duplicate opportunity');pairs.add(pair);
  }
 }
}
