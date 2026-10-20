import {recordBonusHPTrigger} from './bonus-hit-points.js';
import {routineSignature} from './routine-progress.js';
import {progression} from './rules.js';
import {balanceFlatFooted} from './balance.js';
import {clearBracing} from './attack-techniques.js';
import {followUpState,applyFollowUpClaim,recordAttackFollowUps,clearFollowUps} from './attack-follow-ups.js';

export function ammunitionProfile(entry,pack){
 const profiles=pack.equipment.find(w=>w.id===entry.id)?.ammunitionProfiles;
 return profiles?.find(p=>p.id===(entry.ammoProfile??profiles[0].id));
}

export function ammunitionState(entry,pack,autofire=false,shotCost,{flatFooted=false}={}){
 const profile=ammunitionProfile(entry,pack);
 if(!profile)return null;
 const cost=shotCost??(autofire?pack.rules.ammunition.autofireShots:1);
 const freeReloads=profile.reloadAction==='free-action'&&!!entry.freeReloads&&!flatFooted;
 return {...profile,remaining:entry.shotsRemaining??null,cost,freeReloads,available:freeReloads||cost<=profile.capacity&&(entry.shotsRemaining===undefined||entry.shotsRemaining>=cost)};
}

export function validateAmmunition(entry,pack,bad){
 const profile=ammunitionProfile(entry,pack);
 if(entry.ammoProfile!==undefined&&(!profile||typeof entry.ammoProfile!=='string'))bad('ammunition profile');
 if(entry.shotsRemaining!==undefined&&(!profile||!Number.isInteger(entry.shotsRemaining)||entry.shotsRemaining<0||entry.shotsRemaining>profile.capacity))bad('loaded shots');
 if(entry.freeReloads!==undefined&&(profile?.reloadAction!=='free-action'||typeof entry.freeReloads!=='boolean'))bad('free reloads');
}

// Records a supplied reload. It never creates supplies, debits an assumed
// battery, or invents a conversion for partially used packs across weapons.
export function reloadWeapon(c,pack,uid,flatFooted){
 // Derivation normally supplies the current context. Direct action callers
 // still get the same Balance restriction, including training granted by feats.
 flatFooted??=!!c.flatFooted||(c.balance?.active?balanceFlatFooted(c,progression(c,pack).ctx):false);
 const entry=c.inventory.find(e=>e.uid===uid),profile=entry&&ammunitionProfile(entry,pack);
 if(!profile)throw new Error('Weapon cannot be reloaded.');
 if(profile.reloadAction==='free-action'&&flatFooted)throw new Error('Free Actions are unavailable while flat-footed.');
 clearFollowUps(c);if(profile.reloadAction!=='free-action')delete c.routineProgress;
 entry.shotsRemaining=profile.capacity;
 clearBracing(c);
 for(const item of c.inventory)if(pack.equipment.find(r=>r.id===item.id)?.kind==='weapon')item.aimed=false;
 return profile;
}

export function spendAttackResources(c,result){
 // Check all references and quantities before making any change.
 if(result.routineDefinition){const r=c.routines?.find(r=>r.id===result.routineDefinition.id);if(!r||routineSignature(r)!==result.routineDefinition.signature)throw new Error('Routine changed; roll again.');}
 if(result.followUpConsume&&JSON.stringify(followUpState(c))!==JSON.stringify(result.followUpPrevious))throw new Error('Follow-up changed; roll again.');
 if(Object.hasOwn(result,'routineProgressPrevious')&&JSON.stringify(c.routineProgress??null)!==JSON.stringify(result.routineProgressPrevious))throw new Error('Routine progress changed; roll again.');
 if(result.opportunitySpent&&JSON.stringify(c.opportunity?.used||[])!==JSON.stringify(result.opportunityPrevious))throw new Error('Opportunity history changed; roll again.');
 const spending=(result.ammunitionSpent||[]).map(({uid,shots,reloadShots=0})=>{
  const entry=c.inventory.find(e=>e.uid===uid);
  if(!entry||!Number.isInteger(shots)||shots<0||!Number.isInteger(reloadShots)||reloadShots<0||!Number.isInteger(entry.shotsRemaining)||entry.shotsRemaining+reloadShots<shots||reloadShots&&(entry.freeReloads!==true||c.flatFooted||result.flatFooted||reloadShots!==Math.max(0,shots-entry.shotsRemaining)))throw new Error('Ammunition changed; roll again.');
  return {entry,shots,reloadShots};
 });
 if(result.followUpConsume)applyFollowUpClaim(c,result.followUpConsume);
 if(result.opportunitySpent){c.opportunity??={};c.opportunity.used??=[];c.opportunity.used.push({...result.opportunitySpent});c.opportunity.provoked=false;}
 for(const {entry,shots,reloadShots} of spending)entry.shotsRemaining+=reloadShots-shots;
 for(const uid of result.aimConsumed||[]){const entry=c.inventory.find(e=>e.uid===uid);if(entry)entry.aimed=false;}
 if(result.mightySwingConsumed)c.mightySwing=false;
 if(result.bracingConsumed)clearBracing(c);
 if(result.fullAttackPenalties)c.fullAttackPenalties={...result.fullAttackPenalties};
 if(result.chargeReflexPenalty!==undefined)c.chargeReflexPenalty=result.chargeReflexPenalty;
 if(result.results){
  recordAttackFollowUps(c,result,!!result.followUpConsume?.cleave);
  recordBonusHPTrigger(c,result);
  if(Object.hasOwn(result,'routineProgress')){if(result.routineProgress)c.routineProgress=result.routineProgress;else delete c.routineProgress;}
  else if(!result.followUpConsume?.cleave)delete c.routineProgress;
 }
 if(result.chargeEnteredTotal!==undefined&&c.chargePath?.acrobatics===result.chargeEnteredTotal)c.chargePath.acrobatics=null;
}
