// Declared turn and encounter triggers, with shared typed modifiers.
import {escapeHTML as escape} from './wiki-content.js';
import {endTurnEffects,startTurnEffects} from './effect-duration.js';
export const triggeredDefenseRule=(pack,id)=>pack.rules.triggeredDefenseBonuses?.find(r=>r.id===id);
const owns=(ctx,id)=>ctx.feats.some(f=>f.id===id)||ctx.talents.some(t=>t.id===id&&!ctx.inactiveTalents.has(t.id));
export const ownedTriggeredDefenses=(pack,ctx)=>(pack.rules.triggeredDefenseBonuses||[]).filter(r=>owns(ctx,r.recordId));
// Turn-length rows live in triggeredDefenses (cleared by New Turn); encounter rows in encounterTriggers.
const keyFor=r=>r.duration==='encounter'?'encounterTriggers':r.duration==='end-next-turn'?'turnEndTriggers':'triggeredDefenses';
const rowId=x=>typeof x==='string'?x:x?.id;
// Printed "Surprised or Flat-Footed": an explicit Surprised round counts even if the checkbox was cleared; Aware alone does not.
const lostState=(c,flatFooted)=>!!flatFooted||c.flatFooted===true||c.actionState?.phase==='surprised';
const hasRow=(c,r)=>(c[keyFor(r)]||[]).some(x=>rowId(x)===r.id);
export function validateTriggeredDefenses(c,pack,bad){
 if(c.turnEndTriggers!==undefined){const rows=c.turnEndTriggers;if(!Array.isArray(rows)||new Set(rows.map(r=>r?.id)).size!==rows.length||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join()!=='ended,endsRemaining,id'||triggeredDefenseRule(pack,r.id)?.duration!=='end-next-turn'||![1,2].includes(r.endsRemaining)||typeof r.ended!=='boolean'))bad('triggered defenses');}
 for(const key of ['triggeredDefenses','encounterTriggers']){
  if(c[key]===undefined)continue;
  const rows=c[key];
  if(!Array.isArray(rows)||new Set(rows).size!==rows.length||rows.some(id=>{const r=triggeredDefenseRule(pack,id);return !r||keyFor(r)!==key;}))bad('triggered defenses');
 }
}
export function triggeredDefenseEffects(c,pack,ctx,{flatFooted,dexDenied}){
 return [...(c.triggeredDefenses||[]),...(c.encounterTriggers||[]),...(c.turnEndTriggers||[]).map(rowId)].flatMap(id=>{const r=triggeredDefenseRule(pack,id);return r&&owns(ctx,r.recordId)&&!(r.lostWhenFlatFooted&&lostState(c,flatFooted))&&!(r.lostWhenDexDenied&&dexDenied)?r.effects||[r.effect]:[];});
}
export function setTriggeredDefense(c,pack,ctx,id,on,{flatFooted=false}={}){
 const r=triggeredDefenseRule(pack,id),key=r&&keyFor(r);
 if(!r||!owns(ctx,r.recordId)||typeof on!=='boolean')throw new Error('Trigger unavailable');
 if(on&&r.lostWhenFlatFooted&&lostState(c,flatFooted))throw new Error('Unavailable while Surprised or flat-footed');
 if(key==='turnEndTriggers'){
  // Own active, unended turn: this turn and the next end; otherwise only the next one.
  const s=c.actionState,next=s?.active&&!s.ended?{endsRemaining:2,ended:false}:{endsRemaining:1,ended:true},old=c[key]?.find(x=>x.id===id);
  if(on&&old&&old.endsRemaining>=next.endsRemaining)return;
  c[key]=(c[key]||[]).filter(x=>x.id!==id);if(on)c[key].push({id,...next});
 }else{c[key]=(c[key]||[]).filter(x=>x!==id);if(on)c[key].push(id);}
 if(!c[key].length)delete c[key];
}
export function clearEncounterTriggers(c){delete c.encounterTriggers;delete c.turnEndTriggers;}
export function endTriggerTurn(c){if(!c.turnEndTriggers)return;c.turnEndTriggers=endTurnEffects(c.turnEndTriggers);if(!c.turnEndTriggers.length)delete c.turnEndTriggers;}
export function startTriggerTurn(c){if(!c.turnEndTriggers)return;c.turnEndTriggers=startTurnEffects(c.turnEndTriggers);if(!c.turnEndTriggers.length)delete c.turnEndTriggers;}
// "You lose this bonus ... if you are Surprised or Flat-Footed": removal, so it needs a new trigger.
export function endFlatFootedTriggers(c,pack,flatFooted){
 if(!lostState(c,flatFooted))return false;let changed=false;
 for(const key of ['triggeredDefenses','encounterTriggers']){
  if(!c[key])continue;const kept=c[key].filter(id=>!triggeredDefenseRule(pack,id)?.lostWhenFlatFooted);
  if(kept.length!==c[key].length){changed=true;if(kept.length)c[key]=kept;else delete c[key];}
 }
 return changed;
}
export function clearTriggeredDefenses(c){delete c.triggeredDefenses;}
export function triggeredDefenseControls(c,pack,ctx){
 const label=e=>(e.defense?e.defense[0].toUpperCase()+e.defense.slice(1):e.target==='attacks'?'Attack':e.target==='defenses'?'Defenses':'Damage')+' +'+e.amount;
 return ownedTriggeredDefenses(pack,ctx).map(r=>{const name=([...pack.feats,...pack.talents].find(x=>x.id===r.recordId)).name,title=(r.effects||[r.effect]).map(label).join(', ')+(r.duration==='encounter'?' until the end of the encounter':r.duration==='end-next-turn'?' until the end of your next turn':' until your next turn');return `<label class="checkbox" title="${escape(title)}"><input type="checkbox" data-triggered-defense="${r.id}" ${hasRow(c,r)?'checked':''}>${escape(name)}</label>`;}).join('');
}
