import {repulsePowerRule,repulsePowerSnapshot} from './repulse.js';
import {trackingPowerRule,trackingPowerSnapshot} from './tracking-powers.js';
import {checkedMaintenancePlan,finishCheckedMaintenance} from './checked-maintenance.js';
import {mentalPowerRule,mentalPowerSnapshot,mentalEnhancementAvailable} from './mental-powers.js';
import {conditionPowerRule,conditionPowerSnapshot,conditionEnhancementAvailable} from './condition-powers.js';
import {opportunityPowerRule,hasOpportunityForm,clearOpportunityPowers} from './opportunity-powers.js';
import {displacementPowerRule,forceThrustSnapshot} from './force-thrust.js';
import {thresholdPowerRule,thresholdPowerPlan} from './threshold-powers.js';
import {powerEffectChoiceRule,powerEnhancementChoices} from './power-effect-choices.js';
import {offensivePowerRule,offensivePowerSnapshot,offensivePowerHit,validOffensivePowerLimit,historicalManualPower} from './offensive-powers.js';
import {craftActionId,craftingPlan,craftItem} from './crafting.js';
import {triggeredDefenseRule,triggeredDefenseActivation,setTriggeredDefense,clearTriggeredDefenses,endTriggerTurn} from './triggered-defenses.js';
import {applyMoveTalentEffects,clearMoveTalentEffects} from './move-talent-effects.js';
import {deflectionRule,deflectionPlan,deflectionRerollSources,snapshotDeflectionRerolls,rerollDeflection,finishDeflection,assertDeflectionResolved} from './deflection.js';
import {balanceAfterDamage} from './balance.js';
import {negatingPowerRule,negateEnergyPlan,assertNegationResolved} from './negating-powers.js';
import {maintainedPowers,powerMaintenancePlan,renewMaintainedPower} from './maintained-powers.js';
import {resistancePowerRule,resistForceSelection,resistancePowerLabel,assertResistanceResolved,pendingResistanceChecks,recordResistanceDamageCheck,finishResistanceDamageCheck,removeResistancePower} from './resistance-powers.js';
import {ragePowerRule,hasRageTechnique,endRagePowerTurn,clearRagePowers} from './rage-powers.js';
import {actionPhase,surpriseActionIssue} from './surprise-round.js';
import {jumpState,planJump,rollJump,finishJump} from './jump.js';
import {reviewedPowerRule as selfPowerRule,reviewedPowerTier as selfPowerTier,finishPowerEffectResult} from './power-effects.js';
import {movementPowerRule} from './movement-powers.js';
import {endSelfPowerTurn,reopenSelfPowerTurn,consumeBattleStrike} from './self-power-effects.js';
import {timedTalentPlan,applyTimedTalent,advanceTimedTalents} from './timed-talents.js';
import {endTurnFeatEffects,clearTurnFeatEffects,applyMoveFeatEffects} from './turn-feat-effects.js';
import {clearBonusHP} from './bonus-hit-points.js';
import {turnTalentPlan,applyTurnTalent,clearTurnTalents,turnTalentBenefit} from './turn-talents.js';
import {reactionTalentRule,reactionTalentPlan,applyReactionTalent,endReactionTalentTurn,clearReactionTalents} from './reaction-talents.js';
import {conditionalDefenseLabel} from './defensive-combat.js';
import {defenseShiftRule,defenseShiftPlan,applyDefenseShift,clearDefenseShifts,defenseShiftText} from './defense-shifts.js';
import {balance,planBalance} from './balance.js';
import {conditionRecoveryPlan,applyConditionRecovery} from './condition-recovery.js';
import {skillActionPlan,rollSkillAction,finishSkillAction} from './skill-actions.js';
import {talentActivation,applyTalentActivation,endEncounterTalents} from './talent-activations.js';
import {escapeBonds,planEscapeBonds} from './escape-bonds.js';
import {canAim} from './weapon-rules.js';
import {derive,validateCharacter,signed} from './rules.js';
import {ACTION_TYPES,pendingChoiceMessage,actionState,emptyActionState,allocateActions,spendActions,archivePlan,queueAction,resetActionTurn,checkForcePointAvailable} from './action-economy.js';
import {rollCombatRoutine,rollCharge,routinePlan} from './combat.js';
import {planFullAttack} from './full-attacks.js';
import {rollRoutineStep,routineStepPlan} from './routine-steps.js';
import {spendAttackResources,reloadWeapon,ammunitionProfile} from './ammunition.js';
import {clearAiming,clearBracing,declareBracing,startNextTurn} from './attack-techniques.js';
import {clearFollowUps} from './attack-follow-ups.js';
import {acrobaticsMove,proneAction} from './acrobatics-movement-actions.js';
import {planAcrobaticsMove,planProneAction} from './acrobatics-movement.js';
import {withdraw,rollRunningAttack,runningAttackPlan} from './combat-movement-actions.js';
import {planWithdraw} from './combat-movement.js';
import {planCharge} from './charge.js';
import {catchSecondWind,advanceRegenerativeHealing,startRegenerativeHealingTurn,endRegenerativeHealing,startRage,startChannelRage,endChannelRage,recoverCondition,recoverActions,advanceRage,recoveryState} from './recovery.js';
import {declareDefenseStance} from './defensive-combat.js';
import {usePower,take10Power,useAdeptPower,selectAdeptNatural,recoverPower,recoverSuite,turnEndRecoveryDue} from './force-powers.js';
import {powerActivationIssue,powerQuickening} from './power-activation.js';
import {rollOpportunity} from './opportunity-actions.js';
import {planOpportunity,startNextRound,opportunityContext} from './opportunity.js';
import {rollCleave,followThrough} from './attack-follow-up-actions.js';
import {planCleave,planFollowThrough,followUpState} from './attack-follow-ups.js';
import {bellowDetails,rollBellow} from './species-actions.js';
import {activateEnergyShield,rechargeEnergyShield,energyShieldDetails} from './energy-shields.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

const typeOf=s=>({'standard-action':'standard','move-action':'move','swift-action':'swift','full-round-action':'full','free-action':'free','reaction':'reaction'})[s];
const assert=(ok,message)=>{if(!ok)throw new Error(message);};
const attackRoutine=a=>({name:a.name,steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]});
const paths={jump:'jump',move:'acrobaticsMovement',withdraw:'withdraw',charge:'chargePath','running-attack':'runningAttack',balance:'balance','balance-recheck':'balance','escape-bonds':'escapeBonds',opportunity:'opportunity',cleave:'followUp','follow-through':'followUp'};
function withOptions(c,id,o){
 const q=structuredClone(c),key=paths[id];if(!key||o.path===undefined)return q;
 const pick=keys=>Object.fromEntries(keys.filter(k=>Object.hasOwn(o.path,k)).map(k=>[k,structuredClone(o.path[k])]));
 // Plans snapshot declarations, never resource histories or trigger tickets.
 if(id==='opportunity')q[key]={...opportunityContext(q),...pick(['opponent','action','distance','provoked','terrain','entersAdjacent'])};
 else if(['cleave','follow-through'].includes(id))q[key]={...followUpState(q),...pick(['selected','opponent','nextOpponent','dropped','immediate','inReach','moveBefore','mode','path'])};
 else if(['balance','balance-recheck'].includes(id))q[key]={...q.balance,...pick(['width','unstable','check','catchCheck','path'])};
 else q[key]=structuredClone(o.path);
 return q;
}
export function defaultActionOptions(c,d,pack,id){
 const o={};
 if(['attack','charge','running-attack','aim','brace','reload','opportunity'].includes(id))o.uid=d.attacks.find(a=>id==='charge'?a.mode==='melee':id==='aim'?a.mode==='ranged'&&a.canAimTarget:id==='brace'?a.bracing?.available:id==='reload'?c.inventory.some(e=>e.uid===a.uid&&ammunitionProfile(e,pack)):id==='opportunity'?a.opportunityWeapon:true)?.uid||'';
 if(['routine','routine-step'].includes(id)){o.routineId=c.routines.find(r=>r.kind!=='fullAttack')?.id||'';o.cost='full';o.confirmed=false;}
 if(['full-attack','full-attack-step'].includes(id))o.routineId=c.routines.find(r=>r.kind==='fullAttack')?.id||'';
 if(paths[id]&&c[paths[id]])o.path=structuredClone(c[paths[id]]);
 if(id==='maintain-power')o.effectId=[...(c.shieldPowerEffects||[]),...(c.resistancePowerEffects||[])].find(s=>s.untilTurn===actionState(c).turn)?.id||'';
 if(id==='jump'){o.path=jumpState(c);o.fp='ask';}
 if(id==='power'){const p=d.forcePowers.find(p=>!p.spent);o.powerId=p?.copyId||'';o.action=p?.action||'standard-action';o.rollMode='roll';o.fp='ask';o.enhance=!!selfPowerRule(pack,p?.id)&&!powerQuickening(pack,p?.id);}
 if(id==='recover-power')o.powerId=d.forcePowers.find(p=>p.spent)?.copyId||'';
 if(pack.rules.skillActions?.some(r=>r.id===id)){o.powerId=d.forcePowers.find(p=>p.spent)?.copyId||'';o.rollMode='roll';o.fp='ask';o.safe=false;}
 if(['shield','shield-recharge'].includes(id))o.uid=c.inventory.find(e=>pack.equipment.find(r=>r.id===e.id)?.energyShield)?.uid||'';
 if(deflectionRule(pack,id)){o.attackRoll=0;o.aware=false;o.kind='single';o.target='self';o.hit=true;o.rerolls='failed';o.incoming={amount:0,options:{type:'normal',against:[]}};}
 if(id==='bellow'){o.extraDice=0;o.strong=false;}
 if(id===craftActionId)o.supplies=false;
 if(reactionTalentRule(pack,id))o.damaged=false;
 if(defenseShiftRule(pack,id)){o.bonus='reflex';o.penalty='will';}
 if(triggeredDefenseRule(pack,id)?.action)o.adjacent=false;
 if(id==='encounter-talent'){const t=pack.talents.find(t=>t.activation&&d.ctx.talents.some(s=>s.id===t.id)&&!d.ctx.inactiveTalents.has(t.id));o.talentId=t?.id||'';o.choice=t?.activation.choices.find(o=>!c.talentActivations?.some(s=>s.id===t.id&&s.choice===o.id))?.id||'';}
 if(id.startsWith('manual-'))o.note=pack.rules.actionEconomy.actions.find(r=>r.id===id)?.name==='Other'?'':pack.rules.actionEconomy.actions.find(r=>r.id===id)?.name||'';
 return o;
}
export function describeAction(c,pack,id,options={},checkBudget=true){
 const def=pack.rules.actionEconomy.actions.find(r=>r.id===id);assert(def,'Unknown action');
 const q=withOptions(c,id,options);validateCharacter(q,pack);const d=derive(q,pack),s=actionState(q),o=options;
 const view={...def,cost:{type:def.type,count:def.count,...(def.also?{also:def.also}:{})},name:def.name,manual:id.startsWith('manual-'),character:q,derived:d};
 try{
 assertResistanceResolved(q);assertDeflectionResolved(q);
 assert(!d.incapacitated&&!d.helpless,'Actions unavailable while helpless');
 const a=d.attacks.find(a=>a.uid===o.uid),entry=q.inventory.find(e=>e.uid===o.uid);
 switch(id){
 case 'attack':assert(a,'Choose an attack');view.name=a.name;view.routine=attackRoutine(a);view.attackPlan=routinePlan(view.routine,d.attacks);break;
 case 'routine':case 'routine-step':{
  const r=q.routines.find(r=>r.id===o.routineId);assert(r&&r.kind!=='fullAttack','Choose a routine');view.name=r.name||'Offensive Routine';view.manual=true;view.cost.type=o.cost||'full';assert(o.confirmed,'Confirm the routine and its action cost');
  const p=id==='routine-step'?routineStepPlan(q,d,pack,r.id):{routine:r,attacks:d.attacks};view.routine=p.routine;view.attackPlan=routinePlan(p.routine,p.attacks);view.nextRoutineProgress=p.progress;
  view.continuation=id==='routine-step'&&q.routineProgress?.id===r.id&&[...s.plan,...s.history].some(p=>p.status==='done'&&p.action===id&&p.turn===s.turn&&p.options.routineId===r.id);break;
 }
 case 'full-attack':case 'full-attack-step':{
  const r=q.routines.find(r=>r.id===o.routineId);assert(r?.kind==='fullAttack','Choose a Full Attack routine');view.name=r.name||'Full Attack';
  const plan=id==='full-attack'?planFullAttack(r,d,pack):routineStepPlan(q,d,pack,r.id);view.routine=plan.routine;view.attackPlan=routinePlan(plan.routine,plan.attacks);view.nextRoutineProgress=plan.progress;
  view.continuation=id==='full-attack-step'&&q.routineProgress?.id===r.id&&[...s.plan,...s.history].some(p=>p.status==='done'&&p.action===id&&p.turn===s.turn&&p.options.routineId===r.id);break;
 }
 case 'charge':planCharge(q,d,pack,o.uid);break;
 case 'running-attack':{const p=runningAttackPlan(q,pack,o.uid);view.attackPlan=routinePlan(p.routine,[p.attack]);break;}
 case 'balance':case 'balance-recheck':planBalance(q,d,pack,id==='balance-recheck');break;
 case 'escape-bonds':{const p=planEscapeBonds(q,d,pack);view.cost.type=typeOf(p.duration);assert(view.cost.type,'Resolve this duration outside turn tracking');break;}
 case 'block':case 'deflect':view.deflection=deflectionPlan(q,d,pack,id,o);view.forceCost=view.deflection.forceCost;break;
 case 'maintain-power':{const p=powerMaintenancePlan(q,d,pack,o.effectId);view.maintenance=p;view.name='Maintain '+p.name;view.cost.type=p.rule.maintenance;if(p.rule.maintenanceCheck){view.upkeep=checkedMaintenancePlan(q,d,pack,p,o);view.forceCost=view.upkeep.forceCost;view.fpAllowed=view.upkeep.fpAllowed;}break;}
 case 'jump':{const p=planJump(q,d,pack);assert(p.timeMultiplier===1,'Take 20 requires time outside tracked turns');view.jump=p;view.name=p.name;view.cost.count=p.path.moves;view.fpAllowed=!p.noCheck&&p.path.checkMode==='roll'&&p.path.check===null&&checkForcePointAvailable(q,d);break;}
 case 'move':planAcrobaticsMove(q,d,pack);break;
 case 'withdraw':planWithdraw(q,d,pack);break;
 case 'prone':case 'stand':case 'acrobatics-prone':{
  assert(id==='acrobatics-prone'||!!q.prone===(id==='stand'),id==='stand'?'Already standing':'Already prone');const p=planProneAction(q,d,pack,id==='acrobatics-prone');view.name=p.standing?'Stand Up':'Fall Prone';view.cost.type=typeOf(p.action);break;
 }
 case 'aim':assert(a?.mode==='ranged'&&!a.areaType&&a.canAimTarget&&entry,'Choose a ranged weapon with line of sight');assert(canAim(a,entry),'Weapon cannot Aim');view.name='Aim ('+a.name+')';break;
 case 'brace':assert(a?.bracing?.available&&entry,a?.bracing?.reason||'Choose an autofire-only weapon');view.cost.count=pack.rules.bracing.swiftActions;break;
 case 'mighty-swing':assert(d.ctx.feats.some(f=>f.id==='feat:mighty-swing'),'Requires Mighty Swing');view.cost.count=pack.rules.mightySwing.swiftActions;break;
 case 'reload':{const p=entry&&ammunitionProfile(entry,pack);assert(p,'Choose a weapon to reload');view.cost.type=typeOf(p.reloadAction);assert(view.cost.type,'Reload duration requires manual resolution');assert(o.confirmed,'Confirm a reload supply is available');view.name='Reload ('+pack.equipment.find(r=>r.id===entry.id).name+')';break;}
 case 'recover':assert(d.recovery.recoverable,'Recover unavailable');view.cost.count=o.count??1;assert(Number.isInteger(view.cost.count)&&view.cost.count>=1&&view.cost.count<=3,'Choose 1 to 3 Swift actions');break;
 case 'second-wind':assert(o.regenerate===undefined||typeof o.regenerate==='boolean','Invalid Second Wind choice');if(o.regenerate){assert(d.recovery.secondWind.regeneration?.available,'Regenerative Healing unavailable');view.name='Regenerative Healing';}view.cost.type=d.recovery.secondWind.action.startsWith('Free')?'free':'swift';assert(d.recovery.secondWind.available,d.recovery.secondWind.reason);assert(!s.ended,'Second Wind requires your turn');break;
 case 'rage':assert(d.recovery.rage?.remaining&&!d.recovery.rage.active,'Rage unavailable');break;
 case 'channel-rage':assert(d.ctx.feats.some(f=>f.id==='feat:channel-rage'),'Requires Channel Rage');assert(d.recovery.rage?.remaining&&!d.recovery.rage.active&&!recoveryState(q).channelRage&&!recoveryState(q).channelRageUsed,'Channel Rage unavailable');break;
 case 'damage-reduction-10':view.timedTalent=timedTalentPlan(q,d,pack,id);view.forceCost=view.timedTalent.forcePoints;break;
 case 'lightsaber-defense':case 'wan-shen-defense':case 'shadow-armor':view.turnTalent=turnTalentPlan(q,d,pack,id);break;
 case 'shift-defense-i':case 'shift-defense-ii':case 'shift-defense-iii':view.defenseShift=defenseShiftPlan(q,d,pack,id,o);break;
 case 'soft-to-solid':view.reactionTalent=reactionTalentPlan(q,d,pack,id,o);view.forceCost=view.reactionTalent.rule.forcePoints;break;
 case 'resilience':case 'equilibrium':case 'indomitable':view.conditionRecovery=conditionRecoveryPlan(q,d,pack,id);view.forceCost=view.conditionRecovery.rule.forcePoints;break;
 case 'bellow':assert(bellowDetails(q,d,pack,o.extraDice??0,{strong:o.strong??false})?.available,'Bellow unavailable');break;
 case 'craft-frag-grenade':view.crafting=craftingPlan(q,d,pack,id,o);break;
 case 'improved-soft-cover':view.triggeredDefense=triggeredDefenseActivation(q,d,pack,id,o);view.cost.type=view.triggeredDefense.action;break;
 case 'total-defense':break;
 case 'encounter-talent':{const t=talentActivation(q,pack,d,o.talentId,o.choice);view.name=t.talent.name+' ('+t.option.name+')';view.cost.type=t.activation.action;view.forceCost=t.activation.forcePoints;break;}
 case 'force-bonus':assert(!s.ended,'Force Point bonus requires your turn');view.forceCost=1;break;
 case 'power':{
  const p=d.forcePowers.find(p=>p.copyId===o.powerId);assert(p,'Choose a power');assert(!o.action||p.actions?.includes(o.action)||p.action===o.action,'Power action changed');
  assert(o.repulsePowerResolution===undefined,'Repulse result is resolved after the check');
  assert(o.offensiveHitConfirmed===undefined,'Confirm a successful hit after the check');
  assert(o.powerEnhancementChoice===undefined,'Choose an enhancement after the check');
  if(o.targetReflex!==undefined&&o.targetReflex!==null)assert(offensivePowerRule(pack,p.id)?.enhancement.requiresHit&&Number.isInteger(o.targetReflex)&&Math.abs(o.targetReflex)<=100000,'Invalid target Reflex');
  const activationEnhancement=offensivePowerRule(pack,p.id)?.enhancement.timing==='activation';
  assert(o.activationEnhancement===undefined||activationEnhancement&&typeof o.activationEnhancement==='boolean','Invalid activation enhancement');
  view.activationEnhancement=activationEnhancement&&o.activationEnhancement===true;
  if(o.action)p.action=o.action;assert(!powerActivationIssue(q,d,pack,p),powerActivationIssue(q,d,pack,p));view.power=p;view.name=p.name;assert(o.effectDC===undefined||validOffensivePowerLimit(pack,p.id,o.effectDC),'Power effect unavailable');view.selfPower=selfPowerRule(pack,p.id);view.manual=!view.selfPower;view.cost.type=typeOf(p.action);assert(view.cost.type,'Power duration requires manual resolution');
  assert(['roll','take10','adept'].includes(o.rollMode||'roll'),'Invalid power check');assert(o.rollMode!=='take10'||p.take10,'Power Mastery required');assert(o.rollMode!=='adept'||p.adept,'Force Power Adept required');
  if(view.selfPower&&!offensivePowerRule(pack,p.id)&&!negatingPowerRule(pack,p.id)&&!thresholdPowerRule(pack,p.id)&&!displacementPowerRule(pack,p.id)&&!conditionPowerRule(pack,p.id)&&!mentalPowerRule(pack,p.id))assert((q.opportunityPowerEffects?.length||0)+(q.selfPowerEffects?.length||0)+(q.movementPowerEffects?.length||0)+(q.ragePowerEffects?.length||0)+(q.shieldPowerEffects?.length||0)+(q.resistancePowerEffects?.length||0)+(q.trackingPowerEffects?.length||0)<1000,'Too many active effects');
  assert(o.destiny===undefined||typeof o.destiny==='boolean','Invalid Destiny choice');
  if(movementPowerRule(pack,p.id))assert(!s.ended,'Turn ended');
  if(o.destiny){assert(movementPowerRule(pack,p.id),'Power has no Destiny option');assert(q.story?.kind==='destiny'&&q.story.points>0&&d.level,'Destiny Point unavailable');view.destinyCost=1;}
  assert(o.quicken===undefined||typeof o.quicken==='boolean','Invalid quickening choice');
  const quickening=powerQuickening(pack,p.id);if(o.quicken){assert(quickening,'Power has no accelerated activation');assert(o.rollMode!=='adept','Only one Force Point per round');view.cost.type=quickening.action;}
  view.forceCost=(o.rollMode==='adept'?1:0)+(o.quicken?quickening.forcePoints:0)+(view.activationEnhancement?1:0);assert(!(o.rollMode==='adept'&&(view.activationEnhancement||!activationEnhancement&&o.enhance)),'Only one Force Point per round');
  view.fpAllowed=checkForcePointAvailable(q,d,{power:p,forceCost:view.forceCost,reaction:view.cost.type==='reaction'});
  const requirement=pack.rules.actionEconomy.powerRequirements?.[p.id];if(requirement?.notFlatFooted)assert(!d.flatFooted,'Power unavailable while flat-footed');if(requirement?.aware)assert(o.aware,'Confirm awareness of the attack');
  view.enhanceAllowed=!activationEnhancement&&!quickening&&!!o.enhance&&!s.forceSpent&&d.forceCurrent>0&&!view.forceCost;
  if(trackingPowerRule(pack,p.id))view.trackingSnapshot=trackingPowerSnapshot(pack,p.id,o.tracking);else assert(o.tracking===undefined,'Power does not select quarries');
  view.conditionSnapshot=conditionPowerSnapshot(d,pack,p.id,o.technometry);if(conditionPowerRule(pack,p.id)?.kind!=='memory-access')assert(o.technometry===undefined,'Power does not use a Technometry target');
  if(resistancePowerRule(pack,p.id)?.kind==='defense')view.resistForce=resistForceSelection(o.resistForce);else assert(o.resistForce===undefined,'Power does not select Defenses');
  if(mentalPowerRule(pack,p.id)){view.mental=mentalPowerSnapshot(d,pack,o.mental);if(view.mental.selection.mode!=='suggestion')view.enhanceAllowed=false;}else assert(o.mental===undefined,'Power does not use a mental target');
  if(repulsePowerRule(pack,p.id))view.repulse=repulsePowerSnapshot(pack,o.repulse);else assert(o.repulse===undefined,'Power does not use Repulse targets');
  if(displacementPowerRule(pack,p.id)&&!repulsePowerRule(pack,p.id)){view.thrust=forceThrustSnapshot(q,d,pack,o.thrust);if(view.thrust.target.mode==='door')view.enhanceAllowed=false;}else assert(o.thrust===undefined,'Power does not use a thrust target');
  if(negatingPowerRule(pack,p.id))view.negation=negateEnergyPlan(q,d,pack,p.id,o.incoming,{forceCost:view.forceCost});else if(thresholdPowerRule(pack,p.id))view.threshold=thresholdPowerPlan(q,d,pack,p.id,o.incoming,{forceCost:view.forceCost,enhanceAsk:!!o.enhance});else assert(o.incoming===undefined,'Power does not use incoming damage');
  break;
 }
 case 'recover-power':assert(d.forcePowers.some(p=>p.copyId===o.powerId&&p.spent),'Choose a spent power');view.forceCost=pack.rules.forcePowerRecovery.forcePointCost;break;
 case 'force-focus':view.skillAction=skillActionPlan(q,d,pack,id,o);view.fpAllowed=checkForcePointAvailable(q,d);break;
 case 'opportunity':planOpportunity(q,d,pack,o.uid);break;
 case 'cleave':{const p=planCleave(q,d,pack);assert(!d.flatFooted,'Free actions unavailable while flat-footed');if(p.move)view.cost={type:'move',count:1,also:'free'};break;}
 case 'follow-through':planFollowThrough(q,d,pack);break;
 case 'shield':assert(energyShieldDetails(q,d,pack,o.uid).available,'Shield activation unavailable');break;
 case 'shield-recharge':assert(energyShieldDetails(q,d,pack,o.uid).rechargeAvailable,'Shield recharge unavailable');view.cost.count=pack.rules.combat.rechargeActions;break;
 default:assert(view.manual,'Action unavailable');assert(typeof o.note==='string'&&o.note.trim(),'Describe the action');view.name=o.note.trim();
 }
 const phaseIssue=surpriseActionIssue(q,d,pack,view);assert(!phaseIssue,phaseIssue);
 assert(ACTION_TYPES.includes(view.cost.type),'Unsupported action duration');
 if(view.cost.type==='free'&&id!=='opportunity')assert(!d.flatFooted,'Free actions unavailable while flat-footed');
 if(view.forceCost){assert(!s.forceSpent,'Force Point already spent this round');assert(d.forceCurrent>=view.forceCost,'Not enough Force Points');}
 if(o.fp==='before'){assert(id==='attack','This action does not support that Force Point choice');assert(!s.forceSpent&&d.forceCurrent>0&&!d.flatFooted&&!s.ended,'Force Point bonus unavailable');}
 if(checkBudget)view.allocation=view.continuation?{slots:[]}:allocateActions(s,view.cost,pack.rules.actionEconomy,o.trigger||'');
 return view;
 }catch(e){e.actionView={name:view.name,cost:view.cost,manual:view.manual};throw e;}
}
const invalidate=c=>{clearFollowUps(c);clearAiming(c);clearBracing(c);delete c.routineProgress;};
function recoverProgress(c,d,pack,count){
 const s=c.actionState;if(s.recover.lastTurn<s.turn-1)s.recover.count=0;
  s.recover.count+=count;s.recover.lastTurn=s.turn;
  const needed=recoverActions(d,pack),steps=Math.min(c.condition,Math.floor(s.recover.count/needed));s.recover.count%=needed;
  for(let i=0;i<steps;i++)recoverCondition(c,d);
  if(c.condition===0)s.recover.count=0;
 return {steps,needed};
}
function resolve(c,pack,id,o,v,roller,activationId){
 const d=v.derived;let r;
 if(id==='attack'||id==='full-attack'||id==='routine'){
  const routine=structuredClone(v.routine);let fp;
  if(o.fp==='before'){fp=roller(`${d.forcePointDice}d${d.forcePointDie}kh1`);routine.steps[0].attackMod+=fp.value;c.forcePoints--;c.actionState.forceSpent=true;}
  r=rollCombatRoutine(routine,d,pack,roller);spendAttackResources(c,r);if(fp){r.text+='; Force Point +'+fp.value;r.html+='<div>Force Point: '+fp.display+' = '+totalHtml(fp)+'</div>';}
 }else if(id==='full-attack-step'||id==='routine-step'){r=rollRoutineStep(c,d,pack,o.routineId,roller);spendAttackResources(c,r);}
 else if(id==='charge'){r=rollCharge(c,d,pack,o.uid,roller);spendAttackResources(c,r);endTurnFeatEffects(c);endSelfPowerTurn(c);endReactionTalentTurn(c);endTriggerTurn(c);endRagePowerTurn(c);advanceRegenerativeHealing(c,pack);c.actionState.ended=true;}
 else if(id==='running-attack'){r=rollRunningAttack(c,pack,o.uid,roller);spendAttackResources(c,r);}
 else if(id==='balance'||id==='balance-recheck')r=balance(c,d,pack,id==='balance-recheck',roller);
 else if(id==='escape-bonds')r=escapeBonds(c,d,pack,roller);
 else if(v.deflection){
  clearFollowUps(c);clearAiming(c);clearBracing(c);
  const p=v.deflection;Object.assign(o,p.declaration);c.deflectionAttempts=(c.deflectionAttempts||0)+1;if(p.forceCost)c.forcePoints=d.forceCurrent-p.forceCost;
  const x=roller('1d20'+signed(p.bonus)),natural=x.d20?.[0];assert(Number.isInteger(natural)&&natural>=1&&natural<=20&&x.value===natural+p.bonus,'Invalid Use the Force check');
  const check={natural,bonus:p.bonus,total:x.value};o.deflectionCheck=snapshotDeflectionRerolls(c,d,pack,id,o,check);
  const step=c.actionState.plan.find(s=>s.id===activationId);step.result={text:v.name+': Use the Force '+check.total+' / '+o.attackRoll,check,fpAllowed:false,enhanceAllowed:false};
  const rerollAllowed=o.rerolls!=='none'&&(o.rerolls==='always'||check.total<o.attackRoll)&&deflectionRerollSources(c,d,pack,step).length>0;
  r={...step.result,rerollAllowed,html:x.display+' = '+totalHtml(x)};if(!rerollAllowed){step.status='done';const finished=finishDeflection(c,d,pack,step);r.text=finished.text;if(finished.damage?.balanceCheckRequired)r.text+='; '+balanceAfterDamage(c,derive(c,pack),pack,roller).text;}
 }
 else if(id==='maintain-power'){
  invalidate(c);
  if(v.upkeep){
   const upkeep=v.upkeep;if(upkeep.forceCost){c.forcePoints=d.forceCurrent-upkeep.forceCost;c.actionState.forceSpent=true;}
   const rolls=Array.from({length:upkeep.rollMode==='adept'?2:1},()=>roller('1d20'+signed(upkeep.bonus)));
   for(const x of rolls)assert(Number.isInteger(x.d20?.[0])&&x.d20[0]>=1&&x.d20[0]<=20&&x.value===x.d20[0]+upkeep.bonus,'Invalid upkeep roll');
   const natural=upkeep.rollMode==='adept'?selectAdeptNatural(rolls.map(x=>x.d20[0])):rolls[0].d20[0],check={natural,bonus:upkeep.bonus,total:natural+upkeep.bonus};
   r={text:v.name+': Use the Force '+check.total+(upkeep.forceCost?'; Force Points -1':''),html:rolls.map(x=>x.display+' = '+totalHtml(x)).join('; '),check,fpAllowed:upkeep.fpAllowed,enhanceAllowed:false};
   if(!(r.fpAllowed&&o.fp==='ask'))r.text+='; '+finishCheckedMaintenance(c,pack,o.maintenancePowerSnapshot,check);
   r.html=escape(r.text)+'<div>'+r.html+'</div>';
  }else {renewMaintainedPower(c,o.effectId,v.maintenance.family);r={text:'Maintain '+v.maintenance.name+': '+(v.maintenance.family==='shield'?'SR '+v.maintenance.row.sr:resistancePowerLabel(v.maintenance.row,pack))};}
 }
 else if(id==='jump'){r=rollJump(v.jump,roller);o.jumpResolution={dc:v.jump.dc,cost:v.jump.cost,maximum:v.jump.maximum,noCheck:v.jump.noCheck};const finished=finishJump(c,v.jump,r.check);r.fpAllowed=v.fpAllowed;r.enhanceAllowed=false;if(!(r.fpAllowed&&o.fp==='ask')){r.text+='; '+finished.text;r.html=escape(r.text)+(r.html?'<div>'+r.html+'</div>':'');}}
 else if(id==='move')r=acrobaticsMove(c,d,pack,roller);
 else if(id==='withdraw')r=withdraw(c,d,pack);
 else if(['prone','stand','acrobatics-prone'].includes(id))r=proneAction(c,d,pack,id==='acrobatics-prone',roller);
 else if(id==='aim'){invalidate(c);c.inventory.find(e=>e.uid===o.uid).aimed=true;}
 else if(id==='brace')declareBracing(c,pack,o.uid,true);
 else if(id==='mighty-swing'){invalidate(c);c.mightySwing=true;}
 else if(id==='reload'){const p=reloadWeapon(c,pack,o.uid,d.flatFooted);r={text:v.name+': '+p.capacity+' shots'};}
 else if(id==='recover'){
  invalidate(c);const {steps,needed}=recoverProgress(c,d,pack,v.cost.count),s=c.actionState;
  r={text:'Recover: '+(steps?'+'+steps+' condition '+(steps===1?'step':'steps'):s.recover.count+' / '+needed+' Swift')};
 }else if(id==='second-wind'){const x=catchSecondWind(c,d,pack,roller,{regenerate:o.regenerate??false});r={text:x.regenerative?'Regenerative Healing: +5 HP/turn':'Second Wind: +'+x.healed+' HP'+(x.conditionRecovery?'; +'+x.conditionRecovery+' condition step':'')+(x.exhaustion?'; exhaustion':'')};}
 else if(id==='rage'){startRage(c,d);r={text:'Rage: '+d.recovery.rage.duration+' rounds'};}
 else if(id==='channel-rage'){startChannelRage(c,d);r={text:'Channel Rage: Will +5 until the end of the encounter'};}
 else if(v.timedTalent){invalidate(c);applyTimedTalent(c,v.timedTalent);c.forcePoints-=v.forceCost;r={text:v.name+': '+v.timedTalent.durationRounds+' rounds; Force Points -'+v.forceCost};}
 else if(v.turnTalent){invalidate(c);applyTurnTalent(c,id,v.turnTalent.amount);r={text:v.name+': '+turnTalentBenefit(v.turnTalent.rule,v.turnTalent.bonus??v.turnTalent.amount)};}
 else if(v.defenseShift){invalidate(c);applyDefenseShift(c,id,v.defenseShift);r={text:v.name+': '+defenseShiftText(v.defenseShift.rule,v.defenseShift)+(v.defenseShift.persistent?'; no automatic expiry':'')};}
 else if(v.reactionTalent){clearFollowUps(c);clearAiming(c);clearBracing(c);applyReactionTalent(c,id,v.reactionTalent);c.forcePoints-=v.forceCost;r={text:v.name+': DR '+v.reactionTalent.rule.damageReduction+'; Force Points -'+v.forceCost};}
 else if(v.conditionRecovery){invalidate(c);applyConditionRecovery(c,v.conditionRecovery);c.forcePoints-=v.forceCost;r={text:v.name+': '+(c.condition===0?'Normal State':'+'+v.conditionRecovery.steps+' condition steps')+(v.conditionRecovery.rule.removePersistent?'; persistent conditions removed':'')+(v.forceCost?'; Force Points -'+v.forceCost:'')};}
 else if(id==='bellow')r=rollBellow(c,d,pack,o.extraDice??0,o.damage??null,roller,{strong:o.strong??false});
 else if(v.crafting){craftItem(c,v.crafting);r={text:'Craft '+v.crafting.item.name};}
 else if(v.triggeredDefense)setTriggeredDefense(c,pack,d.ctx,id,true,{flatFooted:d.flatFooted});
 else if(id==='total-defense')declareDefenseStance(c,d,'total');
 else if(id==='encounter-talent'){invalidate(c);applyTalentActivation(c,o.talentId,o.choice);c.forcePoints-=v.forceCost;r={text:v.name+(v.forceCost?'; Force Points -'+v.forceCost:'')};}
 else if(id==='force-bonus'){const x=roller(`${d.forcePointDice}d${d.forcePointDie}kh1`);c.forcePoints--;r={text:'Force Point: +'+x.value,html:x.display+' = '+totalHtml(x)};}
 else if(id==='power'){
  if(v.negation)o.incoming=structuredClone(v.negation.incoming);
  const copy=c.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===o.powerId);copy.action=v.power.action;
  if(o.quicken||v.activationEnhancement){c.forcePoints=d.forceCurrent-v.forceCost;c.actionState.forceSpent=true;}
  const bonus=d.skills.find(s=>s.id==='skill:use-the-force').total;let check;
  if(o.rollMode==='take10'){take10Power(c,d,pack,o.powerId,{action:o.quicken?powerQuickening(pack,v.power.id).action+'-action':null});check={natural:10,bonus,total:10+bonus};}
  else if(o.rollMode==='adept'){const rolls=[roller('1d20'+signed(bonus)),roller('1d20'+signed(bonus))],x=useAdeptPower(c,d,pack,o.powerId,rolls.map(r=>r.d20[0]));check={natural:x.selected,bonus,total:x.selected+bonus};r={html:rolls.map(r=>r.display+' = '+totalHtml(r)).join('; ')};}
  else {const x=roller('1d20'+signed(bonus));usePower(c,d,pack,o.powerId,x.d20[0],{action:o.quicken?powerQuickening(pack,v.power.id).action+'-action':null});check={natural:x.d20[0],bonus,total:x.value};r={html:x.display+' = '+totalHtml(x)};}
  r={...r,text:v.name+': Use the Force '+check.total+(o.rollMode==='take10'?' (Take 10)':o.rollMode==='adept'?' (Force Power Adept)':'')+(v.forceCost?'; Force Points -1':'')+(v.selfPower?'':'; effects manual'),check,fpAllowed:v.fpAllowed,enhanceAllowed:v.enhanceAllowed&&(conditionPowerRule(pack,v.power.id)?conditionEnhancementAvailable(pack,v.power.id,check.total,o.conditionPowerSnapshot,o.effectDC??null):v.mental?mentalEnhancementAvailable(v.mental,check.total):v.negation?check.total>=v.negation.incoming.amount:!v.selfPower||!!selfPowerTier(pack,v.power.id,check.total))};
  if(offensivePowerRule(pack,v.power.id)?.enhancement.requiresHit&&offensivePowerHit(pack,v.power.id,check,o.offensivePowerSnapshot)===false)r.enhanceAllowed=false;
  if((o.effectDC===undefined||o.effectDC===null)&&powerEffectChoiceRule(pack,v.power.id)?.thresholds?.filter(t=>t.dc<=check.total).length>1)r.effectChoiceAllowed=true;
  const effectHeading=r.text;let effectHTML='';if(v.selfPower&&!(r.fpAllowed&&o.fp==='ask'||r.enhanceAllowed||r.effectChoiceAllowed)){const effect=finishPowerEffectResult(c,d,pack,activationId,v.power.id,check,false,!!o.destiny,{focusAllowed:o.rageFocusAllowed,formAllowed:o.opportunityFormAllowed,incoming:o.incoming,offensivePowerSnapshot:o.offensivePowerSnapshot,trackingPowerSnapshot:o.trackingPowerSnapshot,forceThrustSnapshot:o.forceThrustSnapshot,repulsePowerSnapshot:o.repulsePowerSnapshot,mentalPowerSnapshot:o.mentalPowerSnapshot,resistForceSnapshot:o.resistForceSnapshot,conditionPowerSnapshot:o.conditionPowerSnapshot,effectDC:o.effectDC,roller});r.text+='; '+effect.text;effectHTML=effect.html||'';}
  r.html=escape(effectHTML?effectHeading:r.text)+(r.html?'<div>'+r.html+'</div>':'')+effectHTML;
 }else if(v.skillAction){
  invalidate(c);const x=rollSkillAction(v.skillAction,roller);r={...x,text:v.name+': '+x.text,fpAllowed:v.fpAllowed};
  if(!(r.fpAllowed&&o.fp==='ask'))r.text+='; '+finishSkillAction(c,d,pack,id,o,r.check);
 }else if(id==='recover-power'){const p=recoverPower(c,d,pack,o.powerId);r={text:p.name+' recovered; Force Points -1'};}
 else if(id==='opportunity'){r=rollOpportunity(c,pack,o.uid,roller);spendAttackResources(c,r);}
 else if(id==='cleave'){r=rollCleave(c,pack,roller);spendAttackResources(c,r);}
 else if(id==='follow-through')r=followThrough(c,d,pack);
 else if(id==='shield')activateEnergyShield(c,d,pack,o.uid);
 else if(id==='shield-recharge'){const x=rechargeEnergyShield(c,d,pack,o.uid,roller);r={text:'Shield recharge: Mechanics '+x.roll.value+'; SR '+x.before+' → '+x.after,html:x.roll.display+' = '+totalHtml(x.roll)};}
 else {invalidate(c);r={text:v.name+' (Manual)'};}
 if(v.forceCost)c.actionState.forceSpent=true;
 return {text:r?.text||v.name,...(r?.html?{html:r.html}:{}),...(r?.check?{check:r.check,fpAllowed:r.fpAllowed,enhanceAllowed:r.enhanceAllowed,...(r.rerollAllowed!==undefined?{rerollAllowed:r.rerollAllowed}:{}),...(r.effectChoiceAllowed?{effectChoiceAllowed:true}:{})}:{})};
}
function commit(c,q){for(const k of Object.keys(c))if(!Object.hasOwn(q,k))delete c[k];Object.assign(c,q);}
export function executeAction(c,pack,stepId,roller=evalExpr){
 const original=c.actionState?.plan.find(p=>p.id===stepId);assert(original?.status==='queued','Action already resolved or unavailable');assert(!c.actionState.plan.some(p=>p.status==='waiting'),pendingChoiceMessage(c));
 const v=describeAction(c,pack,original.action,original.options),q=v.character;q.actionState??=emptyActionState();if(!q.actionState.active&&v.cost.type==='reaction')q.actionState.ended=true;if(!q.actionState.active&&(['full','standard','move','swift'].includes(v.cost.type)||v.selfPower&&v.cost.type==='free')&&reopenSelfPowerTurn(q))v.derived=derive(q,pack);q.actionState.active=true;let step=q.actionState.plan.find(p=>p.id===stepId);
 if(v.upkeep)step.options.maintenancePowerSnapshot=structuredClone(v.upkeep.snapshot);
 if(v.trackingSnapshot)step.options.trackingPowerSnapshot=structuredClone(v.trackingSnapshot);else delete step.options.trackingPowerSnapshot;
 if(v.conditionSnapshot)step.options.conditionPowerSnapshot=structuredClone(v.conditionSnapshot);
 if(v.resistForce)step.options.resistForceSnapshot=structuredClone(v.resistForce);
 if(v.selfPower)step.options.effectPowerId=v.power.id;else delete step.options.effectPowerId;
 if(offensivePowerRule(pack,v.power?.id))step.options.offensivePowerSnapshot=offensivePowerSnapshot(v.derived,pack,v.power.id,step.options);else delete step.options.offensivePowerSnapshot;
 if(opportunityPowerRule(pack,v.power?.id))step.options.opportunityFormAllowed=hasOpportunityForm(v.derived.ctx,pack);else delete step.options.opportunityFormAllowed;
 if(v.mental)step.options.mentalPowerSnapshot=v.mental;else delete step.options.mentalPowerSnapshot;
 if(v.repulse)step.options.repulsePowerSnapshot=structuredClone(v.repulse);else delete step.options.repulsePowerSnapshot;
 if(v.thrust)step.options.forceThrustSnapshot=v.thrust;else delete step.options.forceThrustSnapshot;
 if(v.threshold)step.options.incoming=v.threshold.incoming;
 if(v.power&&ragePowerRule(pack,v.power.id))step.options.rageFocusAllowed=hasRageTechnique(v.derived.ctx,pack);else delete step.options.rageFocusAllowed;
 const result=resolve(q,pack,step.action,step.options,v,roller,step.id);spendActions(q.actionState,v.allocation);step=q.actionState.plan.find(p=>p.id===stepId);
 step.result={text:result.text.slice(0,2000),...(result.check?{check:result.check,fpAllowed:result.fpAllowed,enhanceAllowed:result.enhanceAllowed,...(result.rerollAllowed!==undefined?{rerollAllowed:result.rerollAllowed}:{}),...(result.effectChoiceAllowed?{effectChoiceAllowed:true}:{})}:{})};step.turn=q.actionState.turn;step.status=(result.effectChoiceAllowed||result.rerollAllowed||result.fpAllowed&&step.options.fp==='ask'||result.enhanceAllowed)?'waiting':'done';
 validateCharacter(q,pack);commit(c,q);return result;
}
export function finishForceChoice(c,pack,stepId,spend,roller=evalExpr){
 const q=structuredClone(c),s=q.actionState;let step=s?.plan.find(p=>p.id===stepId);assert(step?.status==='waiting'&&step.result?.check&&!step.result.rerollAllowed,'No pending check');
 if(step.options.effectPowerId){const power=derive(q,pack).forcePowers.find(p=>p.copyId===step.options.powerId);assert(power?.id===step.options.effectPowerId,'Power unavailable');}
 const confirmation=spend==='enhance-hit',named=typeof spend==='string'&&spend.startsWith('enhance:')?spend.slice(8):undefined,mode=confirmation||named!==undefined?'enhance':spend===true?'bonus':spend===false?'none':spend;assert(['bonus','enhance','none'].includes(mode),'Invalid Force Point choice');let extra;
 const choices=powerEnhancementChoices(pack,step.options.effectPowerId);
 if(mode==='enhance'&&choices.length){assert(choices.some(x=>x.id===named),'Choose an enhancement');step.options.powerEnhancementChoice=named;}else assert(named===undefined,'Power does not use this enhancement');
 const hitRule=offensivePowerRule(pack,step.options.effectPowerId),requiresHit=!!hitRule?.enhancement.requiresHit&&!historicalManualPower(pack,step.options.effectPowerId,step.options);
 if(mode==='enhance'&&hitRule?.enhancement.timing==='activation')assert(historicalManualPower(pack,step.options.effectPowerId,step.options),'Enhancement must be chosen at activation');
 if(confirmation)assert(requiresHit,'Power does not use hit confirmation');
 if(mode==='enhance'&&requiresHit){const hit=offensivePowerHit(pack,hitRule.powerId,step.result.check,step.options.offensivePowerSnapshot);assert(hit===true||hit===null&&confirmation,'Confirm a successful hit after the check');if(confirmation)step.options.offensiveHitConfirmed=true;}
 if(mode!=='none'){
  const d=derive(q,pack);assert(!s.forceSpent&&d.forceCurrent>0,'Force Point unavailable');
  if(mode==='bonus'){
   const skillAction=step.action==='jump'||step.action==='maintain-power'&&!!step.options.maintenancePowerSnapshot||pack.rules.skillActions?.some(r=>r.id===step.action),power=skillAction?null:d.forcePowers.find(p=>p.copyId===step.options.powerId);
   assert(step.result.fpAllowed&&(skillAction||power)&&checkForcePointAvailable(q,d,{power,reaction:step.options.action==='reaction'}),'Force Point bonus unavailable');extra=roller(`${d.forcePointDice}d${d.forcePointDie}kh1`);assert(Number.isInteger(extra.value)&&extra.value>=1&&extra.value<=d.forcePointDie,'Invalid Force Point roll');step.result.check.total+=extra.value;step.result.text+='; Force Point +'+extra.value+' = '+step.result.check.total;
  }else {assert(step.result.enhanceAllowed,'Enhancement unavailable');step.result.text+=(confirmation?'; Hit confirmed':'')+'; Force Points -1'+(step.action==='power'&&selfPowerRule(pack,derive(q,pack).forcePowers.find(p=>p.copyId===step.options.powerId)?.id)&&!historicalManualPower(pack,derive(q,pack).forcePowers.find(p=>p.copyId===step.options.powerId)?.id,step.options)?'':'; enhancement manual');}
  q.forcePoints--;s.forceSpent=true;
 }
 // A boosted check can unlock another earned effect tier. Commit the FP,
 // retain the check and ask before applying effects or rolling damage.
 const offensive=powerEffectChoiceRule(pack,step.options.effectPowerId);
 if(mode==='bonus'&&offensive?.thresholds&&step.options.effectDC==null&&offensive.thresholds.filter(t=>t.dc<=step.result.check.total).length>1){
  step.result.effectChoiceAllowed=true;step.result.fpAllowed=false;step.result.enhanceAllowed=false;
  validateCharacter(q,pack);commit(c,q);return {text:step.result.text,html:escape(step.result.text)+(extra?'<div>'+extra.display+' = '+totalHtml(extra)+'</div>':'')};
 }
 if(pack.rules.skillActions?.some(r=>r.id===step.action))step.result.text+='; '+finishSkillAction(q,derive(q,pack),pack,step.action,step.options,step.result.check);
 if(step.action==='maintain-power'&&step.options.maintenancePowerSnapshot)step.result.text+='; '+finishCheckedMaintenance(q,pack,step.options.maintenancePowerSnapshot,step.result.check);
 if(step.action==='jump'){const snapshot=step.options.jumpResolution;assert(snapshot&&Number.isFinite(snapshot.dc)&&snapshot.dc>=0&&snapshot.dc<=2400000&&Number.isFinite(snapshot.cost)&&snapshot.cost>=0&&Number.isFinite(snapshot.maximum)&&snapshot.maximum>=snapshot.cost&&typeof snapshot.noCheck==='boolean','Invalid saved Jump');step.result.text+='; '+finishJump(q,{...snapshot,path:step.options.path},step.result.check).text;}
 const effectHeading=step.result.text;let effectHTML='';if(step.action==='power'){const power=derive(q,pack).forcePowers.find(p=>p.copyId===step.options.powerId);if(power&&selfPowerRule(pack,power.id)&&!historicalManualPower(pack,power.id,step.options)){const effect=finishPowerEffectResult(q,derive(q,pack),pack,step.id,power.id,step.result.check,mode==='enhance',!!step.options.destiny,{focusAllowed:step.options.rageFocusAllowed,formAllowed:step.options.opportunityFormAllowed,incoming:step.options.incoming,offensivePowerSnapshot:step.options.offensivePowerSnapshot,trackingPowerSnapshot:step.options.trackingPowerSnapshot,offensiveHitConfirmed:step.options.offensiveHitConfirmed,forceThrustSnapshot:step.options.forceThrustSnapshot,repulsePowerSnapshot:step.options.repulsePowerSnapshot,mentalPowerSnapshot:step.options.mentalPowerSnapshot,resistForceSnapshot:step.options.resistForceSnapshot,conditionPowerSnapshot:step.options.conditionPowerSnapshot,powerEnhancementChoice:step.options.powerEnhancementChoice,effectDC:step.options.effectDC,roller});step=q.actionState.plan.find(p=>p.id===stepId);step.result.text+='; '+effect.text;effectHTML=effect.html||'';}}
  step=q.actionState.plan.find(p=>p.id===stepId);step.status='done';validateCharacter(q,pack);commit(c,q);return {text:step.result.text,...(extra||effectHTML?{html:escape(effectHTML?effectHeading:step.result.text)+(extra?'<div>'+extra.display+' = '+totalHtml(extra)+'</div>':'')+effectHTML}:{})};
}

export function takeAction(c,pack,id,o={},roller=evalExpr){
 // Invalid immediate actions must not even create a queued step.
 describeAction(c,pack,id,o);const q=structuredClone(c);if(q.actionState?.plan.length>=30)archivePlan(q);const step=queueAction(q,id,o),result=executeAction(q,pack,step.id,roller);commit(c,q);return result;
}
function nextTurnPlan(c,pack,{maintain=[],maintenanceOptions={}}={}){
 const q=structuredClone(c),previous=q.actionState;assertResistanceResolved(q);
 assert(Array.isArray(maintain)&&maintain.every(id=>typeof id==='string')&&new Set(maintain).size===maintain.length,'Invalid maintenance choices');
 assert(maintenanceOptions&&typeof maintenanceOptions==='object'&&!Array.isArray(maintenanceOptions)&&Object.entries(maintenanceOptions).every(([id,o])=>maintain.includes(id)&&o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>['rollMode','fp'].includes(k))),'Invalid upkeep options');
 const live=maintainedPowers(q,pack);assert(maintain.every(id=>live.some(s=>s.id===id)),'Power maintenance unavailable');
 const carry=live.filter(s=>maintain.includes(s.id)).map(s=>({family:s.family,row:structuredClone((s.family==='shield'?q.shieldPowerEffects:q.resistancePowerEffects).find(r=>r.id===s.id))}));
 if(actionPhase(previous)!=='normal')q.flatFooted=false;assert(!previous?.plan.some(p=>p.status==='waiting'),pendingChoiceMessage(q));
 if(turnEndRecoveryDue(q))recoverSuite(q,derive(q,pack),{endTurn:true});
 if(previous?.active)advanceTimedTalents(q);
 advanceRegenerativeHealing(q,pack);startRegenerativeHealingTurn(q);q.deflectionAttempts=0;startNextTurn(q);startNextRound(q);
 if(previous){advanceRage(q);resetActionTurn(q);}else q.actionState=emptyActionState();q.actionState.active=true;
 for(const {family,row}of carry){const key=family==='shield'?'shieldPowerEffects':'resistancePowerEffects';q[key]??=[];q[key].push(row);}
 const steps=maintain.map(effectId=>{const source=live.find(s=>s.id===effectId),checked=!!source.rule.maintenanceCheck,options=maintenanceOptions[effectId]||{};assert(checked||!Object.keys(options).length,'Power does not use an upkeep check');return {effectId,checked,options:checked?{effectId,rollMode:'roll',fp:'ask',...options}:{effectId}};});
 // Commit required FP costs before any optional FP decision can consume them.
 steps.sort((a,b)=>(a.checked?1:0)-(b.checked?1:0)||Number(b.options.rollMode==='adept')-Number(a.options.rollMode==='adept'));
 assert(q.actionState.plan.length+steps.length<=30,'Maximum 30 planned actions');
 const budget=structuredClone(q);
 for(const step of steps){const view=describeAction(budget,pack,'maintain-power',step.options);spendActions(budget.actionState,view.allocation);if(view.forceCost){budget.forcePoints-=view.forceCost;budget.actionState.forceSpent=true;}step.cost=view.cost;}
 return {character:q,steps};
}
export function previewNextTurn(c,pack,options={}){return nextTurnPlan(c,pack,options).steps.map(s=>({effectId:s.effectId,cost:s.cost}));}
export function beginNextTurn(c,pack,options={},roller=evalExpr){
 const {character:q,steps}=nextTurnPlan(c,pack,options),results=[];
 if(!steps.some(s=>s.checked))for(const step of steps)results.push(takeAction(q,pack,'maintain-power',step.options,roller));
 else {
  const existing=q.actionState.plan.splice(0),ids=steps.map(s=>queueAction(q,'maintain-power',s.options).id);q.actionState.plan.push(...existing);
  for(const id of ids){if(q.actionState.plan.some(s=>s.status==='waiting'))break;results.push(executeAction(q,pack,id,roller));}
 }
 validateCharacter(q,pack);commit(c,q);return results;
}
export function endCurrentTurn(c,pack){const q=structuredClone(c);assertResistanceResolved(q);assert(!q.actionState?.plan.some(p=>p.status==='waiting'),pendingChoiceMessage(q));if(turnEndRecoveryDue(q))recoverSuite(q,derive(q,pack),{endTurn:true});endTurnFeatEffects(q);endSelfPowerTurn(q);endReactionTalentTurn(q);endTriggerTurn(q);endRagePowerTurn(q);advanceRegenerativeHealing(q,pack);if(q.actionState)q.actionState.ended=true;validateCharacter(q,pack);commit(c,q);}
export function endTrackedCombat(c){assertResistanceResolved(c);assert(!c.actionState?.plan.some(p=>p.status==='waiting'),pendingChoiceMessage(c));endRegenerativeHealing(c);clearOpportunityPowers(c);clearRagePowers(c);if(actionPhase(c.actionState)!=='normal')c.flatFooted=false;clearTurnFeatEffects(c);clearBonusHP(c);endEncounterTalents(c);clearTurnTalents(c);clearReactionTalents(c);clearDefenseShifts(c);clearMoveTalentEffects(c);clearTriggeredDefenses(c);endChannelRage(c);if(c.actionState){archivePlan(c);c.actionState.active=false;c.actionState.phase='normal';c.actionState.spent=[];c.actionState.ended=false;c.actionState.reactions=[];c.actionState.forceSpent=false;c.actionState.recover={count:0,lastTurn:0};}}
export function previewPlan(c,pack){
 const q=structuredClone(c),rows=[];q.actionState??=emptyActionState();let stopped=false,uncertainMovement=false;
 for(const step of q.actionState.plan){
  if(step.status!=='queued'){const powerId=step.options.effectPowerId||q.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===step.options.powerId)?.powerId,name=step.action==='power'&&pack.forcePowers.find(p=>p.id===powerId)?.name||step.action==='maintain-power'&&step.options.maintenancePowerSnapshot&&'Maintain '+pack.forcePowers.find(p=>p.id===step.options.maintenancePowerSnapshot.powerId)?.name;rows.push({id:step.id,status:step.status,...(name?{name}:{})});if(step.status==='waiting')stopped=true;continue;}
  try{
   assert(!uncertainMovement||!['jump','move','charge','running-attack','withdraw','balance'].includes(step.action),'Resolve the power first');
   const v=describeAction(q,pack,step.action,step.options);assert(!stopped,'Resolve the previous step first');if(!q.actionState.active&&(['full','standard','move','swift'].includes(v.cost.type)||v.selfPower&&v.cost.type==='free')){if(reopenSelfPowerTurn(q))v.derived=derive(q,pack);q.actionState.active=true;}spendActions(q.actionState,v.allocation);
   if(v.attackPlan||['charge','bellow','cleave','opportunity'].includes(step.action))consumeBattleStrike(q);
   if(v.attackPlan)for(const x of v.attackPlan.ammunitionSpent){const e=q.inventory.find(e=>e.uid===x.uid);e.shotsRemaining+=x.reloadShots||0;e.shotsRemaining-=x.shots;}
   if(['full-attack-step','routine-step'].includes(step.action)){if(v.nextRoutineProgress)q.routineProgress=v.nextRoutineProgress;else delete q.routineProgress;step.status='done';step.turn=q.actionState.turn;step.result={text:'Preview'};}
   if(step.action==='recover')recoverProgress(q,v.derived,pack,v.cost.count);
   if(step.action==='second-wind'){if(step.options.regenerate)catchSecondWind(q,v.derived,pack,()=>{throw new Error('Unexpected healing roll');},{regenerate:true});else{q.recovery=recoveryState(q);q.recovery.secondWindsSpent++;q.recovery.secondWindEncounter=true;}}
   if(step.action==='rage'){q.recovery=recoveryState(q);q.recovery.ragesSpent++;q.recovery.rageRounds=v.derived.recovery.rage.duration;}
   if(step.action==='channel-rage'){q.recovery=recoveryState(q);q.recovery.ragesSpent++;q.recovery.channelRage=true;q.recovery.channelRageUsed=true;}
   if(v.timedTalent){clearAiming(q);clearBracing(q);applyTimedTalent(q,v.timedTalent);}
   if(v.turnTalent){clearAiming(q);clearBracing(q);applyTurnTalent(q,step.action,v.turnTalent.amount);}
   if(v.defenseShift){clearAiming(q);clearBracing(q);applyDefenseShift(q,step.action,v.defenseShift);}
   if(v.reactionTalent){clearAiming(q);clearBracing(q);applyReactionTalent(q,step.action,v.reactionTalent);}
   if(v.conditionRecovery){clearAiming(q);clearBracing(q);applyConditionRecovery(q,v.conditionRecovery);}
   if(v.crafting)craftItem(q,v.crafting);
   if(v.triggeredDefense)setTriggeredDefense(q,pack,v.derived.ctx,step.action,true,{flatFooted:v.derived.flatFooted});
   if(step.action==='total-defense')declareDefenseStance(q,v.derived,'total');
   if(step.action==='reload'){const e=q.inventory.find(e=>e.uid===step.options.uid);e.shotsRemaining=ammunitionProfile(e,pack).capacity;}
   if(step.action==='aim'){clearAiming(q);q.inventory.find(e=>e.uid===step.options.uid).aimed=true;}
   if(step.action==='encounter-talent'){clearAiming(q);clearBracing(q);applyTalentActivation(q,step.options.talentId,step.options.choice);}
   if(v.deflection)q.deflectionAttempts=(q.deflectionAttempts||0)+1;
   if(v.forceCost){q.forcePoints-=v.forceCost;q.actionState.forceSpent=true;}
   if(v.destinyCost)q.story.points-=v.destinyCost;
   if(step.action==='power'){q.levels.flatMap(l=>l.forcePowers||[]).find(p=>p.id===step.options.powerId).spent=true;if(movementPowerRule(pack,v.power.id))uncertainMovement=true;}
   if(step.action==='move'&&!v.character.acrobaticsMovement?.tumble&&!v.character.acrobaticsMovement?.crossTerrain){applyMoveFeatEffects(q,v.derived,pack,v.character.acrobaticsMovement?.displacement||0);applyMoveTalentEffects(q,v.derived,pack,{squares:v.character.acrobaticsMovement?.path?.squares??1,displacement:v.character.acrobaticsMovement?.displacement||0});}
   if(step.action==='charge'){endTurnFeatEffects(q);endSelfPowerTurn(q);endReactionTalentTurn(q);endTriggerTurn(q);endRagePowerTurn(q);advanceRegenerativeHealing(q,pack);q.actionState.ended=true;}
   rows.push({id:step.id,name:v.name,cost:v.cost,manual:v.manual});
  }catch(e){rows.push({id:step.id,issue:e.message});stopped=true;}
 }
 return rows;
}

export function rollResistanceMaintenance(c,pack,id,roller=evalExpr){
 const q=structuredClone(c),d=derive(q,pack),row=pendingResistanceChecks(q).find(s=>s.id===id),skill=d.skills.find(s=>s.id==='skill:use-the-force');
 assert(row&&!row.pending.check,'Maintenance check unavailable');
 if(d.incapacitated||d.helpless||!skill?.available){removeResistancePower(q,id);commit(c,q);return {text:pack.forcePowers.find(p=>p.id===row.powerId).name+' released'};}
 const r=roller('1d20'+signed(skill.total));recordResistanceDamageCheck(q,id,{natural:r.d20?.[0],bonus:skill.total,total:r.value});
 const dc=resistancePowerRule(pack,row.powerId).damageCheck.baseDC+row.pending.damage;
 const text=pack.forcePowers.find(p=>p.id===row.powerId).name+': Use the Force '+r.value+' (DC '+dc+')';validateCharacter(q,pack);commit(c,q);return {text,html:r.display+' = '+totalHtml(r)};
}
export function finishResistanceMaintenance(c,pack,id,spend=false,roller=evalExpr){
 assert(typeof spend==='boolean','Invalid Force Point choice');const q=structuredClone(c),d=derive(q,pack);let extra;
 assert(pendingResistanceChecks(q).some(s=>s.id===id&&s.pending.check),'Maintenance roll unavailable');
 if(spend){assert(checkForcePointAvailable(q,d),'Force Point unavailable');extra=roller(`${d.forcePointDice}d${d.forcePointDie}kh1`);assert(Number.isInteger(extra.value)&&extra.value>=1&&extra.value<=d.forcePointDie,'Invalid Force Point roll');q.forcePoints=d.forceCurrent-1;q.actionState.forceSpent=true;}
 const name=pack.forcePowers.find(p=>p.id===pendingResistanceChecks(q).find(s=>s.id===id).powerId).name,result=finishResistanceDamageCheck(q,pack,id,extra?.value||0);validateCharacter(q,pack);commit(c,q);return {text:name+': '+result.total+' / '+result.dc+'; '+(result.success?'maintained':'released')+(extra?'; Force Point +'+extra.value:''),...result};
}

export function finishDeflectionChoice(c,pack,stepId,sourceId=null,roller=evalExpr){
 const q=structuredClone(c);let step=q.actionState?.plan.find(s=>s.id===stepId);assert(step?.status==='waiting'&&step.result?.rerollAllowed&&deflectionRule(pack,step.action),'No pending Block or Deflect');
 let html;if(sourceId!==null){const r=rerollDeflection(q,derive(q,pack),pack,step,sourceId,roller);html=r.display+' = '+totalHtml(r);}
 const keepWaiting=sourceId!==null&&(step.options.rerolls==='always'||step.result.check.total<step.options.attackRoll)&&deflectionRerollSources(q,derive(q,pack),pack,step).length>0;
 let text=(step.action==='block'?'Block':'Deflect')+': Use the Force '+step.result.check.total+' / '+step.options.attackRoll;
 if(!keepWaiting){step.status='done';step.result.rerollAllowed=false;const finished=finishDeflection(q,derive(q,pack),pack,step);text=finished.text;if(finished.damage?.balanceCheckRequired)text+='; '+balanceAfterDamage(q,derive(q,pack),pack,roller).text;}
 step=q.actionState.plan.find(s=>s.id===stepId);step.result.text=text;validateCharacter(q,pack);commit(c,q);return {text,...(html?{html}:{})};
}
