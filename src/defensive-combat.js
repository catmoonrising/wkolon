import {clearFollowUps} from './attack-follow-ups.js';
import {clearBracing} from './attack-techniques.js';
import {resolveEquipment} from './equipment.js';
import {counselingEnabled,ambiguityValue} from './house-rules.js';

export function flurryState(c,pack,ctx,size,helpless=false){
 const rule=pack.rules.flurry,owned=ctx.feats.some(f=>f.id===rule.featId),selected=!!c.flurry;
 const weapons=c.inventory.filter(e=>e.equipped&&e.carried!==false).map(e=>resolveEquipment(e,pack,c)).filter(w=>w.kind==='weapon'&&!w.unarmed);
 const light=w=>w.group==='lightsabers'||!!w.size&&pack.rules.weaponSizeOrder.indexOf(w.size)<pack.rules.weaponSizeOrder.indexOf(size);
 const onlyLight=weapons.length?weapons.every(light):counselingEnabled(c,'jc:112-unarmed-attacks-and-weapon-finesse');
 const reason=!owned?'Requires Flurry':helpless?'Attack unavailable':selected?'Used this turn':!onlyLight?'Requires only Light Weapons or Lightsabers':'';
 return {owned,selected,onlyLight,reason,available:!reason,attackBonus:selected&&owned&&(onlyLight||ambiguityValue(c,pack,'ambiguity:flurry-weapon-change')==='retain-bonus')?rule.attackBonus:0,reflexPenalty:selected?rule.reflexPenalty:0};
}
export function declareFlurry(c,d){
 if(!d.flurry.available||d.defensiveCombat.attacksBlocked)throw new Error(d.flurry.reason||'Attack unavailable');
 c.flurry=true;
}

export function defensiveCombatState(c,pack,ctx,dexDenied=false){
 const rule=pack.rules.defensiveCombat,has=id=>ctx.feats.some(f=>f.id===id);
 const stance=c.defenseStance||'none',selected=c.meleeDefense||0,owned=has(rule.meleeDefense.featId);
 const maximum=Math.min(rule.meleeDefense.maximum,ctx.bab),reason=selected&&(!owned?'Requires Melee Defense':selected>maximum?'Melee Defense exceeds its maximum':'')||'';
 const melee=reason?0:selected,trained=ctx.trained.has(rule.acrobatics),fight=stance==='fight',total=stance==='total';
 const stanceBonus=total?(trained?rule.trainedTotalDefense:rule.totalDefense):(fight?(trained?rule.trainedFightDefense:rule.fightDefense):0);
 return {stance,selected,owned,maximum,reason,melee,trained,dexDenied,
  attackPenalty:(fight?rule.fightPenalty:0)-melee,dodgeBonus:dexDenied?0:stanceBonus+melee,
  attacksBlocked:total||!!reason,dodgeOwned:has(rule.dodge.featId),mobilityOwned:has(rule.mobility.featId),
  runningOwned:has(pack.rules.combatMovement.running.featId),runningDodgeBonus:pack.rules.combatMovement.running.dodgeBonus,
  opponent:c.dodgeOpponent||'',dodgeAmount:dexDenied?0:rule.dodge.bonus,mobilityAmount:dexDenied?0:rule.mobility.bonus};
}

export function defensiveConditionalTotals(state,reflex){
 const rows=[],add=(against,amount,opponent)=>rows.push({defense:'reflex',against,amount,type:'dodge',total:reflex+amount,...(opponent?{opponent}:{})});
 if(state.dodgeOwned&&state.opponent)add('dodge-opponent',state.dodgeAmount,state.opponent);
 if(state.mobilityOwned)add('movement-opportunity',state.mobilityAmount);
 if(state.dodgeOwned&&state.opponent&&state.mobilityOwned)add('opponent-movement-opportunity',state.dodgeAmount+state.mobilityAmount,state.opponent);
 if(state.runningOwned&&state.dodgeOwned){add('running-attack-opportunity',state.dexDenied?0:state.runningDodgeBonus);if(state.mobilityOwned)add('running-attack-movement-opportunity',(state.dexDenied?0:state.runningDodgeBonus)+state.mobilityAmount);}
 return rows;
}

export function conditionalDefenseLabel(row){
 return row.against==='force-powers'?'vs. Force Powers':row.against==='aware'?'while aware':row.against==='melee-aware'?'vs. melee while aware':row.against==='poison'?'vs. Poison':row.against==='reprogram'?'vs. Reprogram':row.against==='deception'?'vs. Deception':row.against==='dark-side-powers'?'vs. Dark Side powers':row.against==='light-side-powers'?'vs. Light Side powers':row.against==='damaging-force-power'?'vs. the damaging Force Power':row.against==='natural-hazards'?'vs. Natural Hazards':row.against==='environmental-hazards'?'vs. environmental Hazards':row.against==='adjacent-obstacle'?'adjacent to an obstacle':row.against==='grab-grapple'?'vs. Grab/Grapple':row.against==='read-emotions-or-attitude'?'vs. reading emotions or Attitude':row.against==='persuasion'?'vs. Persuasion':row.against==='extreme-temperatures'?'vs. Extreme Temperatures':row.against==='deception-or-persuasion'?'vs. Deception/Persuasion':row.against==='dodge-opponent'?`vs. ${row.opponent}`:row.against==='movement-opportunity'?'vs. movement AoO':
  row.against==='opponent-movement-opportunity'?`vs. ${row.opponent} movement AoO`:row.against==='running-attack-opportunity'?'vs. Running Attack AoO':row.against==='running-attack-movement-opportunity'?'vs. Running Attack movement AoO':'vs. Use the Force';
}

export function declareDefenseStance(c,d,stance){
 if(!['fight','total'].includes(stance)||d.incapacitated)throw new Error('Defensive action unavailable');
 if(d.defensiveCombat.stance==='total'&&stance!=='total')throw new Error('Total Defense lasts until your next turn');
 clearFollowUps(c);delete c.routineProgress;
 c.defenseStance=stance;
 if(stance==='total'){
  clearBracing(c);for(const e of c.inventory)if(e.aimed!==undefined)e.aimed=false;
  if(c.mightySwing!==undefined)c.mightySwing=false;
 }
}

export function declareMeleeDefense(c,d,amount){
 if(!Number.isInteger(amount)||amount<0||amount>d.defensiveCombat.maximum)throw new Error('Melee Defense must be from 0 to '+d.defensiveCombat.maximum);
 if(amount&&(!d.defensiveCombat.owned||d.incapacitated||d.defensiveCombat.stance==='total'))throw new Error('Melee Defense unavailable');
 if(amount<(c.meleeDefense||0))throw new Error('Use Next turn to reduce Melee Defense');
 c.meleeDefense=amount;
}

export function designateDodgeOpponent(c,d,name){
 if(typeof name!=='string'||name.length>200||!d.defensiveCombat.dodgeOwned||d.incapacitated)throw new Error('Dodge opponent unavailable');
 c.dodgeOpponent=name.trim();
}

export function validateDefensiveCombat(c,bad){
 if(c.flurry!==undefined&&typeof c.flurry!=='boolean')bad('Flurry declaration');
 if(c.helpless!==undefined&&typeof c.helpless!=='boolean')bad('helpless state');
 if(c.defenseStance!==undefined&&!['none','fight','total'].includes(c.defenseStance))bad('defense stance');
 if(c.meleeDefense!==undefined&&(!Number.isInteger(c.meleeDefense)||c.meleeDefense<0||c.meleeDefense>5))bad('Melee Defense');
 if(c.dodgeOpponent!==undefined&&(typeof c.dodgeOpponent!=='string'||c.dodgeOpponent.length>200))bad('Dodge opponent');
}
