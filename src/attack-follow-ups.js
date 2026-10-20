import {validAttackReference} from './attack-refs.js';
import {ambiguityValue} from './house-rules.js';
import {movementSegment,movementCost,movementSpeed,validateSegment} from './combat-movement.js';

const identity=s=>s.trim().normalize('NFKC').toLowerCase();
export const followUpState=c=>({tickets:[],selected:null,opponent:'',nextOpponent:'',dropped:false,immediate:false,inReach:false,cleavesSpent:0,followThroughSpent:false,moveBefore:false,mode:'normal',...c.followUp,path:movementSegment({squares:1,...c.followUp?.path})});
export function clearFollowUps(c){
 if(!c.followUp)return;
 Object.assign(c.followUp,{tickets:[],selected:null,dropped:false,immediate:false,inReach:false});
}
export function nextCombatantTurn(c){
 clearFollowUps(c);if(c.followUp)c.followUp.followThroughSpent=false;
 delete c.routineProgress;
}
export function nextFollowUpRound(c){
 clearFollowUps(c);if(c.followUp)c.followUp.cleavesSpent=0;
 delete c.routineProgress;
}
// Only the final attack of a bulk roll remains immediate. Stepwise routines
// expose each attack before later attacks consume their one-use declarations.
export function recordAttackFollowUps(c,result,append=false){
 const attack=result.results?.at(-1);
 if(!attack?.uid||!attack.weaponId||!['melee','ranged'].includes(attack.mode)){clearFollowUps(c);return;}
 const p=followUpState(c),ticket={id:crypto.randomUUID(),uid:attack.uid,weaponId:attack.weaponId,name:attack.name,mode:attack.mode,bonus:attack.attackBonus,...(Number.isInteger(attack.targetBonus)?{targetBonus:attack.targetBonus}:{}),damage:attack.damage,blocked:!!(attack.naturalMiss||attack.failedArea),claims:[]};
 p.tickets=append?[...p.tickets,ticket]:[ticket];
 if(p.tickets.length>100)p.tickets.splice(1,p.tickets.length-100);
 p.selected=ticket.id;p.opponent=append?p.nextOpponent:'';p.nextOpponent='';p.dropped=false;p.immediate=false;p.inReach=false;
 c.followUp=p;
}
export function followUpDetails(c,d,pack){
 const p=followUpState(c),rule=pack.rules.cleave,has=id=>d.ctx.feats.some(f=>f.id===id);
 return {state:p,ticket:p.tickets.find(t=>t.id===p.selected),cleave:has(rule.featId),great:has(rule.greatFeatId),followThrough:has(rule.followThrough.featId)};
}
function trigger(c,d,pack){
 const detail=followUpDetails(c,d,pack),p=detail.state,t=detail.ticket;
 if(d.incapacitated||d.helpless)throw new Error('Follow-up unavailable');
 if(!t||t.blocked||t.damage<1)throw new Error('Requires a successful damaging weapon attack');
 if(!p.opponent.trim()||!p.dropped)throw new Error('Confirm the opponent was reduced to 0 HP');
 if(!p.immediate)throw new Error('Must resolve immediately after the triggering attack');
 const claim=t.claims.find(u=>identity(u.opponent)===identity(p.opponent));
 return {...detail,claim};
}
export function planFollowThrough(c,d,pack,{beforeCleave=false}={}){
 validateFollowUps(c,message=>{throw new Error('Invalid '+message);});
 const q=trigger(c,d,pack),p=q.state;
 if(!q.followThrough)throw new Error('Requires Follow Through');
 if(!beforeCleave&&q.ticket.mode!=='melee')throw new Error('Follow Through requires a melee trigger');
 if(beforeCleave&&!q.cleave)throw new Error('Requires Cleave');
 if(p.followThroughSpent||q.claim?.followThrough)throw new Error('Follow Through already used this turn');
 if(d.load?.overloaded)throw new Error('Straining requires full-round movement');
 const cost=movementCost(p.path,pack.rules.combatMovement,d,p.mode),maximum=movementSpeed(d,p.mode)*pack.rules.cleave.followThrough.speedMultiplier;
 if(!p.path.squares)throw new Error('Choose movement squares');
 if(cost>maximum)throw new Error('Follow Through movement exceeds Speed');
 return {...q,cost,maximum};
}
export function planCleave(c,d,pack){
 validateFollowUps(c,message=>{throw new Error('Invalid '+message);});
 const q=trigger(c,d,pack),p=q.state,t=q.ticket,rule=pack.rules.cleave;
 if(!q.cleave)throw new Error('Requires Cleave');
 if(!q.great&&p.cleavesSpent>=rule.perRound)throw new Error('Cleave already used this round');
 if(q.claim?.cleave)throw new Error('Already cleaved from this opponent');
 if(!p.nextOpponent.trim()||identity(p.opponent)===identity(p.nextOpponent))throw new Error('Choose another opponent');
 if(!p.inReach)throw new Error('Opponent must be within reach at the extra attack');
 const attack=d.attacks.find(a=>a.uid===t.uid&&a.id===t.weaponId&&a.mode===rule.attackMode);
 if(!attack)throw new Error('Requires the same weapon ready for a melee attack');
 if(!attack.available||!attack.damage)throw new Error(attack.issue||'Attack unavailable');
 const move=p.moveBefore?planFollowThrough(c,d,pack,{beforeCleave:true}):null;
 const recalculate=ambiguityValue(c,pack,'ambiguity:cleave-target-bonus')==='recalculate';
 if(recalculate&&!Number.isInteger(t.targetBonus))throw new Error('Roll a new triggering attack to record target modifiers');
 const targetBonus=recalculate?attack.targetModifiers?.targetPenalty||0:t.targetBonus;
 const bonus=t.bonus+(recalculate?targetBonus-t.targetBonus:0);
 return {...q,move,attack:{...attack,attack:bonus,targetModifiers:{...attack.targetModifiers,targetPenalty:targetBonus},...(attack.unSwing?{unSwing:{...attack.unSwing,attack:bonus}}:{})}};
}
export function applyFollowUpClaim(c,consume){
 const p=followUpState(c),ticket=p.tickets.find(t=>t.id===consume.ticketId);
 let claim=ticket.claims.find(u=>identity(u.opponent)===identity(consume.opponent));
 if(!claim){claim={opponent:consume.opponent,cleave:false,followThrough:false};ticket.claims.push(claim);}
 if(consume.cleave){claim.cleave=true;p.cleavesSpent++;}
 if(consume.followThrough){claim.followThrough=true;p.followThroughSpent=true;p.moveBefore=false;}
 c.followUp=p;
}
export function validateFollowUps(c,bad){
 if(c.followUp===undefined)return;
 const p=c.followUp,obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max,uuid=v=>typeof v==='string'&&/^[a-f0-9-]{36}$/.test(v),name=v=>typeof v==='string'&&v.length<=200;
 if(!obj(p)||Object.keys(p).some(k=>!Object.keys(followUpState({})).includes(k)))bad('follow-up state');
 for(const key of ['opponent','nextOpponent'])if(p[key]!==undefined&&!name(p[key]))bad('follow-up opponent');
 for(const key of ['dropped','immediate','inReach','followThroughSpent','moveBefore'])if(p[key]!==undefined&&typeof p[key]!=='boolean')bad('follow-up '+key);
 if(p.cleavesSpent!==undefined&&!integer(p.cleavesSpent,0,1000000000))bad('Cleave count');
 if(p.mode!==undefined&&(typeof p.mode!=='string'||!/^[a-z][a-z-]{0,29}$/.test(p.mode)))bad('follow-up movement mode');
 if(p.path!==undefined)validateSegment(p.path,bad);
 if(p.tickets!==undefined){
  if(!Array.isArray(p.tickets)||p.tickets.length>100)bad('follow-up tickets');const ids=new Set();
  for(const t of p.tickets){
   if(!obj(t)||Object.keys(t).some(k=>!['id','uid','weaponId','name','mode','bonus','targetBonus','damage','blocked','claims'].includes(k))||!uuid(t.id)||ids.has(t.id)||!validAttackReference(t.uid)||typeof t.weaponId!=='string'||!/^equipment:[a-z0-9-]+$/.test(t.weaponId)&&t.weaponId!=='attack:unarmed'||!name(t.name)||!['melee','ranged'].includes(t.mode)||!integer(t.bonus,-100000,100000)||t.targetBonus!==undefined&&!integer(t.targetBonus,-100000,100000)||!integer(t.damage,0,Number.MAX_SAFE_INTEGER)||typeof t.blocked!=='boolean'||!Array.isArray(t.claims)||t.claims.length>1000)bad('follow-up ticket');
   ids.add(t.id);const opponents=new Set();
   for(const u of t.claims){if(!obj(u)||Object.keys(u).some(k=>!['opponent','cleave','followThrough'].includes(k))||!name(u.opponent)||!u.opponent.trim()||typeof u.cleave!=='boolean'||typeof u.followThrough!=='boolean'||!u.cleave&&!u.followThrough||opponents.has(identity(u.opponent)))bad('follow-up claim');opponents.add(identity(u.opponent));}
  }
 }
 if(p.selected!==undefined&&p.selected!==null&&(!uuid(p.selected)||!p.tickets?.some(t=>t.id===p.selected)))bad('selected follow-up ticket');
}
