import {craftActionId,craftingRule} from './crafting.js';
import {activeMoveTalentEffects,moveTalentsOwned} from './move-talent-effects.js';
import {deflectionRule,deflectionPenalty,deflectionRerollSources} from './deflection.js';
import {negatingPowerRule} from './negating-powers.js';
import {readDamageForm} from './damage-declarations.js';
import {contextPanel} from './context-panel.js';
import {maintainedPowers} from './maintained-powers.js';
import {resistancePowerRule,activeResistancePowers,pendingResistanceChecks,chooseResistancePowerTier,removeResistancePower,clearResistancePowers} from './resistance-powers.js';
import {activeShieldPowers,chooseShieldPowerTier,removeShieldPower} from './shield-powers.js';
import {ACTION_PHASES,actionPhase,actionPhaseLocked,setActionPhase} from './surprise-round.js';
import {activeRagePowers,chooseRagePowerTier,removeRagePower,hasRageTechnique} from './rage-powers.js';
import {jumpState} from './jump.js';
import {reviewedPowerRule as selfPowerRule} from './power-effects.js';
import {movementPowerRule,activeMovementPowers,chooseMovementPowerTier,removeMovementPower} from './movement-powers.js';
import {activeSelfPowerEffects,chooseSelfPowerDice,removeSelfPowerEffect} from './self-power-effects.js';
import {activeTimedTalents,setTimedTalentRounds} from './timed-talents.js';
import {recoverActions} from './recovery.js';
import {activeTurnFeatEffects} from './turn-feat-effects.js';
import {activeTurnTalents} from './turn-talents.js';
import {ACTION_TYPES,ACTION_NAMES,pendingChoiceMessage,actionState,checkForcePointAvailable,costLabel,queueAction,archivePlan} from './action-economy.js';
import {activeTalentActivations} from './talent-activations.js';
import {activeReactionTalents} from './reaction-talents.js';
import {activeDefenseShifts,removeDefenseShift} from './defense-shifts.js';
import {finishDeflectionChoice,rollResistanceMaintenance,finishResistanceMaintenance,describeAction,defaultActionOptions,executeAction,takeAction,finishForceChoice,beginNextTurn,endCurrentTurn,endTrackedCombat,previewPlan} from './action-engine.js';
import {balanceState} from './balance.js';
import {escapeBondsState,ESCAPE_BONDS_NAMES} from './escape-bonds.js';
import {acrobaticsPath} from './acrobatics-movement.js';
import {withdrawPath,runningPath} from './combat-movement.js';
import {chargePath} from './charge.js';
import {opportunityContext} from './opportunity.js';
import {followUpState} from './attack-follow-ups.js';
import {triggeredDefenseRule,ownedTriggeredDefenses} from './triggered-defenses.js';
import {escapeHTML as escape} from './wiki-content.js';

const select=(key,label,rows,value)=>`<label>${label}<select data-action-option="${key}">${rows.map(([id,name])=>`<option value="${escape(id)}" ${id===value?'selected':''}>${escape(name)}</option>`).join('')}</select></label>`;
const input=(key,label,value,min=0,max=100000)=>`<label>${label}<input type="number" data-action-option="${key}" value="${value??''}" min="${min}" max="${max}"></label>`;
const check=(key,label,value)=>`<label><input type="checkbox" data-action-option="${key}" ${value?'checked':''}>${label}</label>`;
const text=(key,label,value='')=>`<label>${label}<input data-action-option="${key}" value="${escape(value)}" maxlength="200"></label>`;
export function createActionsUI(pack,{current,derived,changed,log,error}){
 const modal=document.getElementById('actions-modal'),body=document.getElementById('actions-body'),title=document.getElementById('actions-title');
 let draft=null,editId=null,category=null,owner=null;
 const panel=contextPanel(modal,()=>{draft=null;editId=null;owner=null;});
 const def=id=>pack.rules.actionEconomy.actions.find(r=>r.id===id);
 function options(id){const c=current(),o=defaultActionOptions(c,derived(),pack,id);if(id==='balance'||id==='balance-recheck')o.path=balanceState(c);if(id==='escape-bonds')o.path=escapeBondsState(c);if(id==='move')o.path=acrobaticsPath(c);if(id==='withdraw')o.path=withdrawPath(c);if(id==='charge')o.path=chargePath(c);if(id==='running-attack')o.path=runningPath(c);if(id==='opportunity')o.path=opportunityContext(c);if(['cleave','follow-through'].includes(id))o.path=followUpState(c);return o;}
 function relevant(id){if(id===craftActionId)return !!craftingRule(derived(),pack);if(triggeredDefenseRule(pack,id)?.action)return ownedTriggeredDefenses(pack,derived().ctx).some(r=>r.id===id);if(id==='maintain-power')return [...(current().shieldPowerEffects||[]),...(current().resistancePowerEffects||[])].some(s=>s.untilTurn===actionState(current()).turn);const d=derived(),c=current(),skill=[...(pack.rules.skillActions||[]),...(pack.rules.conditionRecoveryActions||[]),...(pack.rules.turnTalentActions||[]),...(pack.rules.reactionTalentActions||[]),...(pack.rules.defenseShiftActions||[]),...(pack.rules.timedTalentActions||[]),...(pack.rules.deflectionActions||[])].find(r=>r.id===id);if(skill)return d.ctx.talents.some(t=>t.id===skill.talentId)&&!d.ctx.inactiveTalents.has(skill.talentId);return id==='rage'?!!d.recovery.rage:id==='channel-rage'?!!d.recovery.rage&&d.ctx.feats.some(f=>f.id==='feat:channel-rage'):id==='bellow'?pack.species.find(s=>s.id===c.species)?.bellow:id==='mighty-swing'?d.ctx.feats.some(f=>f.id==='feat:mighty-swing'):id==='brace'?d.attacks.some(a=>a.bracing?.available):id==='running-attack'?d.ctx.feats.some(f=>f.id==='feat:running-attack'):id==='cleave'?d.ctx.feats.some(f=>f.id==='feat:cleave'):id==='follow-through'?d.ctx.feats.some(f=>f.id==='feat:follow-through'):id.startsWith('shield')?c.inventory.some(e=>pack.equipment.find(r=>r.id===e.id)?.energyShield):id==='acrobatics-prone'?d.ctx.trained.has('skill:acrobatics'):true;}
 function describe(id,o,budget=true){try{return describeAction(current(),pack,id,o,budget);}catch(e){return {name:def(id)?.name||id,cost:{type:def(id)?.type||'standard',count:def(id)?.count||1},...e.actionView,issue:e.message};}}
 function menu(type){
  category=type;draft=null;editId=null;owner=current().id;title.textContent=ACTION_NAMES[type];
  const entries=[];
  for(const r of pack.rules.actionEconomy.actions){
   if(!relevant(r.id))continue;
   if(r.id==='encounter-talent'){
    for(const t of pack.talents.filter(t=>t.activation&&derived().ctx.talents.some(s=>s.id===t.id)&&!derived().ctx.inactiveTalents.has(t.id)))if(t.activation.action===type)entries.push({id:r.id,o:{...options(r.id),talentId:t.id,choice:t.activation.choices.find(o=>!current().talentActivations?.some(s=>s.id===t.id&&s.choice===o.id))?.id||''},name:t.name,manual:false});
    continue;
   }
   if(r.id==='power'){
    if(type==='swift')for(const p of derived().forcePowers.filter(p=>resistancePowerRule(pack,p.id)))entries.push({id:r.id,o:{...options(r.id),powerId:p.copyId,action:p.action,quicken:true,enhance:false},name:p.name,manual:false});
    for(const p of derived().forcePowers)for(const a of p.actions||[p.action])if(({full:'full-round-action',standard:'standard-action',move:'move-action',swift:'swift-action',free:'free-action',reaction:'reaction'})[type]===a)entries.push({id:r.id,o:{...options(r.id),powerId:p.copyId,action:a},name:p.name,manual:!selfPowerRule(pack,p.id)});
    continue;
   }
   const o=options(r.id),v=describe(r.id,o,false);let dynamic=v.cost.type;
   if(r.id==='prone'&&current().prone||r.id==='stand'&&!current().prone)continue;
   if(r.id==='recover-power')dynamic='reaction';
   if(dynamic===type)entries.push({id:r.id,o,name:r.name,manual:r.id.startsWith('manual-')});
  }
  body.innerHTML=`<div class="action-menu">${entries.map((e,i)=>{const v=describe(e.id,e.o);return `<button type="button" data-action-pick="${i}" title="${escape(v.issue||'')}"><span>${escape(e.name)}</span><small>${escape(costLabel(v.cost))}${e.manual?' (Manual)':''}</small></button>`;}).join('')}</div>`;
  body.querySelectorAll('[data-action-pick]').forEach(b=>b.addEventListener('click',()=>{const e=entries[Number(b.dataset.actionPick)];draft={id:e.id,o:e.o};form();}));
  panel.open();
 }
 function routeFields(o,id){
  if(!o.path)return '';
  let fields='';const p=o.path;
  const obstacles=(prefix,segment)=>derived().ignoreDifficultTerrain||segment.lowObjects||segment.diagonalLowObjects?input(prefix+'.lowObjects','Low objects',segment.lowObjects||0)+input(prefix+'.diagonalLowObjects','Low, diagonal',segment.diagonalLowObjects||0):'';
  if(['move','withdraw'].includes(id))fields+=input('path.path.squares','Squares',p.path.squares,1)+input('path.path.diagonal','Diagonal',p.path.diagonal)+input('path.path.difficult','Difficult',p.path.difficult)+input('path.path.diagonalDifficult','Diagonal difficult',p.path.diagonalDifficult)+obstacles('path.path',p.path);
  if(id==='move'&&(derived().ctx.feats.some(f=>f.id==='feat:anointed-hunter')||moveTalentsOwned(pack,derived().ctx)))fields+=input('path.displacement','Displacement',p.displacement||0);
  if(id==='move')fields+=check('path.tumble','Tumble',p.tumble)+check('path.crossTerrain','Cross Difficult Terrain',p.crossTerrain)+input('path.tumbled.squares','Tumble squares',p.tumbled.squares)+input('path.occupied','Occupied squares',p.occupied)+input('path.tumbled.diagonal','Tumble diagonal',p.tumbled.diagonal)+input('path.tumbled.difficult','Tumble difficult',p.tumbled.difficult)+input('path.tumbled.diagonalDifficult','Tumble diagonal difficult',p.tumbled.diagonalDifficult);
  if(id==='withdraw')fields+=check('path.clearThreats','Shortest route out of threatened area',p.clearThreats);
  if(id==='charge')fields+=input('path.squares','Squares',p.squares,2)+input('path.diagonalSquares','Diagonal',p.diagonalSquares)+input('path.difficultSquares','Difficult',p.difficultSquares)+input('path.diagonalDifficultSquares','Diagonal difficult',p.diagonalDifficultSquares)+input('path.lowObjectSquares','Low objects',p.lowObjectSquares)+input('path.diagonalLowObjectSquares','Diagonal low objects',p.diagonalLowObjectSquares)+check('path.turns','Turns',p.turns)+check('path.crossTerrain','Cross Difficult Terrain',p.crossTerrain);
  if(id==='running-attack')for(const part of ['before','after'])fields+=input('path.'+part+'.squares',part==='before'?'Before attack':'After attack',p[part].squares)+input('path.'+part+'.diagonal','Diagonal '+part,p[part].diagonal)+input('path.'+part+'.difficult','Difficult '+part,p[part].difficult)+input('path.'+part+'.diagonalDifficult','Diagonal difficult '+part,p[part].diagonalDifficult)+obstacles('path.'+part,p[part]);
  if(id==='jump')return select('path.kind','Jump',[['long','Long Jump'],['high','High Jump']],p.kind)+`<label>Metres<input type="number" min="0.1" max="100000" step="0.1" data-action-option="path.meters" value="${p.meters}"></label>`+input('path.runUp','Run-up (squares)',p.runUp)+input('path.moves','Move actions',p.moves,1,2)+(p.kind==='high'?check('path.pole','Vaulting pole',p.pole):'')+(derived().movementPowers.jumpWithoutCheck?'':select('path.checkMode','Check',[['roll','Roll'],['take10','Take 10']],p.checkMode)+(p.checkMode==='take10'?check('path.calm','No pressure',p.calm):input('path.check','Total (blank to roll)',p.check,-100000)));
  if(id==='balance'||id==='balance-recheck')return select('path.width','Width',[['8-15','8-15 cm'],['4-7','4-7 cm'],['under-4','Under 4 cm']],p.width)+check('path.unstable','Slippery / unstable',p.unstable)+input('path.path.squares','Squares',p.path.squares,1)+input('path.check','Check (blank to roll)',p.check,-100000)+input('path.catchCheck','Catch (blank to roll)',p.catchCheck,-100000);
  if(id==='escape-bonds')return select('path.restraint','Restraint',Object.entries(ESCAPE_BONDS_NAMES),p.restraint)+check('path.fast','Faster attempt',p.fast)+input('path.dexterityCheck','Opponent DEX',p.dexterityCheck,-100000)+input('path.grappleCheck','Opponent grapple',p.grappleCheck,-100000)+input('path.dc','DC',p.dc,-100000)+input('path.check','Check (blank to roll)',p.check,-100000);
  if(id==='opportunity')return text('path.opponent','Opponent',p.opponent)+text('path.action','Provoking action',p.action)+input('path.distance','Distance',p.distance)+check('path.provoked','Provokes within reach',p.provoked);
  if(['cleave','follow-through'].includes(id))return '';
  if(p.mode!==undefined)fields=select('path.mode','Movement',[['normal','Normal'],...Object.keys(derived().speeds).map(k=>[k,k])],p.mode)+fields;
  return `<details open><summary>Route</summary><div class="action-fields">${fields}</div></details>`;
 }
 function form(){
  if(owner!==current().id){panel.close();return;}
  const {id,o}=draft,c=current(),d=derived();if(id==='power'){if(negatingPowerRule(pack,d.forcePowers.find(p=>p.copyId===o.powerId)?.id))o.incoming??={amount:0,options:{type:'normal',energy:false,against:[]}};else delete o.incoming;}const v=describe(id,o),r=def(id);title.textContent=r.name;
  const skillAction=pack.rules.skillActions?.find(r=>r.id===id);
  const conditionRecovery=pack.rules.conditionRecoveryActions?.find(r=>r.id===id);
  let fields='';
  if(id===craftActionId)fields+=check('supplies','Appropriate supplies',o.supplies);
  if(triggeredDefenseRule(pack,id)?.trigger==='swift-adjacent-creature')fields+=check('adjacent','Adjacent creature',o.adjacent);
  if(pack.rules.timedTalentActions?.some(r=>r.id===id)){const rule=pack.rules.timedTalentActions.find(r=>r.id===id),p=pack.rulePages.find(p=>p.sourceId===rule.sourceIds[0]);fields+=`<span>${rule.forcePoints} FP</span><button type="button" data-rule-page="rule:combat-sequence" title="Duration">${rule.durationRounds} rounds</button>${p?`<button type="button" data-rule-page="${p.id}" aria-label="${escape(r.name)} rules">ⓘ</button>`:''}`;}
  if(pack.rules.defenseShiftActions?.some(r=>r.id===id)){const rule=pack.rules.defenseShiftActions.find(r=>r.id===id),p=pack.rulePages.find(p=>p.sourceId===rule.sourceIds[0]),defs=[['reflex','Reflex'],['fortitude','Fortitude'],['will','Will']];fields+=select('bonus','Bonus +'+rule.bonus,defs,o.bonus)+(rule.penaltyScope==='others'?'':select('penalty','Penalty '+rule.penalty,defs,o.penalty))+(p?`<button type="button" data-rule-page="${escape(p.id)}" aria-label="${escape(r.name)} rules">ⓘ</button>`:'');}
  if(pack.rules.reactionTalentActions?.some(r=>r.id===id)){const rule=pack.rules.reactionTalentActions.find(r=>r.id===id),p=pack.rulePages.find(p=>p.sourceId===rule.sourceIds[0]);fields+=`<span>${rule.forcePoints} FP</span>`+check('damaged','Damaged by an attack',o.damaged)+(p?`<button type="button" data-rule-page="${escape(p.id)}" aria-label="${escape(r.name)} rules">ⓘ</button>`:'');}
  if(pack.rules.turnTalentActions?.some(r=>r.id===id)){const t=pack.talents.find(t=>t.id===pack.rules.turnTalentActions.find(r=>r.id===id).talentId),p=pack.rulePages.find(p=>p.name===t.name);if(p)fields+=`<button type="button" data-rule-page="${escape(p.id)}" aria-label="${escape(t.name)} rules">ⓘ</button>`;}
  if(conditionRecovery){
   const t=pack.talents.find(t=>t.id===conditionRecovery.talentId),page=pack.rulePages.find(p=>p.name===t.name);
   if(conditionRecovery.forcePoints)fields+=`<span>${conditionRecovery.forcePoints} FP</span>`;
   if(conditionRecovery.dailyUsesPerSelection){const owned=d.ctx.talents.filter(t=>t.id===conditionRecovery.talentId&&!d.ctx.inactiveTalents.has(t.id)).length;fields+=`<span>${Math.max(0,owned*conditionRecovery.dailyUsesPerSelection-(c.recovery?.indomitableSpent||0))} / ${owned*conditionRecovery.dailyUsesPerSelection}</span>`;}
   if(page&&page.id!==r.ruleId)fields+=`<button type="button" data-rule-page="${escape(page.id)}" aria-label="${escape(t.name)} rules">ⓘ</button>`;
  }
  if(id==='maintain-power')fields+=select('effectId','Power',[...(c.shieldPowerEffects||[]),...(c.resistancePowerEffects||[])].filter(s=>s.untilTurn===actionState(c).turn).map(s=>[s.id,pack.forcePowers.find(p=>p.id===s.powerId).name]),o.effectId);
  if(id==='encounter-talent'){
   const t=pack.talents.find(t=>t.id===o.talentId);title.textContent=t?.name||r.name;
   if((t?.activation.choices.length||0)!==1)fields+=select('choice','Benefit',[['','Choose'],...(t?.activation.choices||[]).map(o=>[o.id,o.name])],o.choice);
   const page=pack.rulePages.find(p=>p.sourceId===t?.sourceId)||pack.rulePages.find(p=>p.name===t?.name);if(page)fields+=`<button type="button" data-rule-page="${escape(page.id)}">ⓘ</button>`;
   fields+=`<span>${t?.activation.forcePoints||0} FP</span>`;
  }
  if(Object.hasOwn(o,'uid')){
   const rows=['shield','shield-recharge'].includes(id)?c.inventory.filter(e=>pack.equipment.find(r=>r.id===e.id)?.energyShield).map(e=>[e.uid,pack.equipment.find(r=>r.id===e.id).name]):d.attacks.filter(a=>id==='charge'?a.mode==='melee':id==='aim'?a.mode==='ranged'&&!a.areaType:id==='brace'?a.bracing?.available:id==='opportunity'?a.opportunityWeapon:true).map(a=>[a.uid,a.name]);
   fields+=select('uid',id.startsWith('shield')?'Shield':'Weapon',[['','Choose'],...rows],o.uid);
  }
  if(['routine','routine-step'].includes(id))fields+=select('routineId','Routine',[['','Choose'],...c.routines.filter(r=>r.kind!=='fullAttack').map(r=>[r.id,r.name||'Routine'])],o.routineId)+select('cost','Action',ACTION_TYPES.map(t=>[t,ACTION_NAMES[t]]),o.cost||'full')+check('confirmed','Routine and action cost confirmed',o.confirmed);
  if(['full-attack','full-attack-step'].includes(id))fields+=select('routineId','Routine',[['','Choose'],...c.routines.filter(r=>r.kind==='fullAttack').map(r=>[r.id,r.name||'Full Attack'])],o.routineId);
  if(['power','recover-power'].includes(id)||skillAction)fields+=select('powerId','Power',[['','Choose'],...d.forcePowers.filter(p=>id==='recover-power'||skillAction?p.spent:true).map(p=>[p.copyId,p.name+(p.spent?' (Spent)':'')])],o.powerId);
  if(skillAction){
   const skill=d.skills.find(s=>s.id===skillAction.skillId),talent=pack.talents.find(t=>t.id===skillAction.talentId),page=pack.rulePages.find(p=>p.name===talent.name);
   fields+=select('rollMode','Check',[['roll','Roll'],...(skill.trained?[['take10','Take 10']]:[])],o.rollMode||'roll');
   if(o.rollMode==='take10')fields+=check('safe','Not threatened or distracted',o.safe);
   fields+=select('fp','Force Point',[['ask','Ask after check'],['none','None']],o.fp||'none');
   fields+=`<span>DC ${skillAction.dc}</span>${page?`<button type="button" data-rule-page="${escape(page.id)}">ⓘ</button>`:''}`;
  }
  if(deflectionRule(pack,id)){
   if(!o.incoming.options.sonic)o.sonicDamage=0;
   fields+=input('attackRoll','Attack roll',o.attackRoll,-100000,100000)+select('kind','Attack',deflectionRule(pack,id).kinds.map(k=>[k,({single:'Single',area:'Area',autofire:'Autofire','force-lightning':'Force Lightning'})[k]]),o.kind)+select('target','Target',[['self','Self'],['adjacent','Adjacent ally (1 FP)']],o.target);
   fields+=input('incoming.amount',o.kind==='single'?'Damage':'Full damage',o.incoming.amount,0,1000000000)+select('incoming.options.type','Type',[['normal','Normal'],['stun','Stun'],['ion','Ion']],o.incoming.options.type||'normal');
   fields+=check('hit','Hits',o.hit)+check('aware','Aware of the attack',o.aware);
   if(['area','autofire'].includes(o.kind))fields+=check('cover','Cover',o.cover);
   for(const [key,label] of [['energy','Energy'],['sonic','Sonic'],['lightsaber','Lightsaber'],['ignoreDR','Ignore DR']])fields+=check('incoming.options.'+key,label,o.incoming.options[key]);
   if(d.energyShields?.length||d.resistancePowers?.length||d.armorItems?.some(r=>r.armorDR?.damageTypes.includes('fire')))fields+=check('incoming.options.fire','Fire',o.incoming.options.fire);
   if(d.resistancePowers?.length)for(const [key,label] of [['cold','Cold'],['electrical','Electrical']])fields+=check('incoming.options.'+key,label,o.incoming.options[key]);
   if(d.energyShields?.length)fields+=check('incoming.options.otherDamage','Other damage',o.incoming.options.otherDamage);
   if(id==='deflect'){if(o.incoming.options.sonic)fields+=input('sonicDamage','Sonic damage',o.sonicDamage||0,0,1000000000);fields+=`<details><summary>Vehicle</summary>${check('capital','Colossal (Frigate) or larger',o.capital)}${check('pointDefense','Point-Defense',o.pointDefense)}</details>`;}
   if(o.kind==='force-lightning')fields+=check('attackerForcePoint','Attacker spent FP',o.attackerForcePoint);
   if(o.target==='adjacent')fields+=check('allyEvasion','Ally has Evasion',o.allyEvasion);
   else if(d.forceCurrent>0)fields+=check('incoming.options.spendForcePoint','1 FP to survive',o.incoming.options.spendForcePoint);
   fields+=(d.conditionalThresholds||[]).map(t=>`<label><input type="checkbox" data-incoming-context="${escape(t.against)}" ${o.incoming.options.against?.includes(t.against)?'checked':''}>${escape(t.against==='use-the-force'?'Use the Force':t.against==='deception-or-persuasion'?'Deception/Persuasion':'Extreme Temperatures')}</label>`).join('');
   fields+=select('rerolls','Rerolls',[['failed','On failure'],['always','Always'],['none','None']],o.rerolls||'failed');
   const penalty=deflectionPenalty(c,pack,d.ctx);if(penalty)fields+=`<span>Use the Force -${penalty}</span>`;
   fields+=`<button type="button" data-rule-page="rule:lightsaber-combat-talent-tree" aria-label="${id==='block'?'Block':'Deflect'} rules">ⓘ</button>`;
  }
  if(id==='power'){
   const p=d.forcePowers.find(p=>p.copyId===o.powerId);
   if(p){fields+=select('action','Action',(p.actions||[p.action]).map(a=>[a,a.replaceAll('-',' ')]),o.action);
    fields+=select('rollMode','Check',[['roll','Roll'],...(p.take10?[['take10','Take 10']]:[]),...(p.adept?[['adept','Adept (1 FP)']]:[])],o.rollMode||'roll');
    fields+=(negatingPowerRule(pack,p.id)?'':select('fp','Force Point',[['ask','Ask after check'],['none','None']],o.fp||'none'))+(resistancePowerRule(pack,p.id)?check('quicken','Swift (1 FP)',o.quicken):check('enhance',negatingPowerRule(pack,p.id)?'Healing (1 FP)':'Ask about enhancement (1 FP'+(selfPowerRule(pack,p.id)?'':', Manual')+')',o.enhance));
    if(negatingPowerRule(pack,p.id)){
     fields+=input('incoming.amount','Damage',o.incoming.amount,0,1000000000)+select('incoming.options.type','Type',[['normal','Normal'],['stun','Stun'],['ion','Ion']],o.incoming.options.type||'normal');
     for(const [key,label]of [['energy','Energy'],['sonic','Sonic'],['lightsaber','Lightsaber'],['ignoreDR','Ignore DR']])fields+=check('incoming.options.'+key,label,o.incoming.options[key]);
     if(d.resistancePowers?.length||d.armorItems?.some(a=>a.armorDR?.damageTypes.includes('fire')))fields+=check('incoming.options.fire','Fire',o.incoming.options.fire);
     if(d.resistancePowers?.length)for(const [key,label]of [['cold','Cold'],['electrical','Electrical']])fields+=check('incoming.options.'+key,label,o.incoming.options[key]);
     if(d.energyShields?.length)fields+=check('incoming.options.otherDamage','Other damage',o.incoming.options.otherDamage);
     if(d.forceCurrent>0)fields+=check('incoming.options.spendForcePoint','1 FP to survive',o.incoming.options.spendForcePoint);
     fields+=(d.conditionalThresholds||[]).map(t=>`<label><input type="checkbox" data-incoming-context="${escape(t.against)}" ${o.incoming.options.against?.includes(t.against)?'checked':''}>${escape(t.against==='use-the-force'?'Use the Force':t.against==='deception-or-persuasion'?'Deception/Persuasion':'Extreme Temperatures')}</label>`).join('');
    }
    if(movementPowerRule(pack,p.id))fields+=check('destiny','Destiny Point',o.destiny);
    if(pack.rules.actionEconomy.powerRequirements?.[p.id]?.aware)fields+=check('aware','Aware of the attack',o.aware);
    fields+=`<button type="button" data-rule-page="${escape(p.ruleId||pack.rulePages.find(r=>r.sourceId===p.sourceId)?.id||'rule:force-powers')}">Mechanics</button><span class="badge">${p.automation==='partial'?'Partial':'Manual'}</span>`;
   }
  }
  if(id==='jump'&&!d.movementPowers.jumpWithoutCheck)fields+=select('fp','Force Point',[['ask','Ask after check'],['none','None']],o.fp||'none');
  if(id==='attack')fields+=select('fp','Force Point',[['none','None'],['before','Bonus before roll (1 FP)']],o.fp||'none');
  if(v.cost.type==='reaction')fields+=text('trigger','Trigger',o.trigger||'');
  if(id==='reload')fields+=check('confirmed','Reload supplied',o.confirmed);
  if(id==='second-wind'&&d.recovery.secondWind.regeneration)fields+=check('regenerate','Regenerative Healing',o.regenerate);
  if(id==='recover')fields+=select('count','Swift actions',[[1,'1'],[2,'2'],[3,'3']],o.count??1);
  if(id==='bellow')fields+=input('extraDice','Extra d6',o.extraDice)+check('strong','Strong Bellow',o.strong)+input('damage','Entered damage (over 500 dice)',o.damage);
  if(id.startsWith('manual-')&&r.name==='Other')fields+=text('note','Action',o.note||'');
  fields+=routeFields(o,id);
  body.innerHTML=`<form id="action-options"><div class="action-fields">${fields}</div><div class="actions"><span data-action-cost>${escape(costLabel(v.cost))}</span>${id.startsWith('manual-')?'<span class="badge">Manual</span>':''}${r.referenceId?`<button type="button" data-rule-reference="${r.referenceId}">ⓘ</button>`:''}${r.ruleId&&!fields.includes('data-rule-page="'+r.ruleId+'"')?`<button type="button" data-rule-page="${r.ruleId}" aria-label="${escape(r.name)} rules">ⓘ</button>`:''}</div><p class="action-error" role="status" data-action-error>${escape(v.issue||'')}</p><div class="modal-actions"><button type="button" data-action-back>Back</button><button type="button" data-action-queue>${editId?'Save':'Queue'}</button><button type="submit" ${v.issue?'disabled':''}>Run</button></div></form>`;
  body.querySelector('[data-action-back]').addEventListener('click',()=>menu(category||v.cost.type));
  body.querySelector('[data-action-queue]').addEventListener('click',()=>{try{read();if(editId){const step=c.actionState.plan.find(p=>p.id===editId);if(step?.status!=='queued')throw new Error('Action already resolved');step.options=structuredClone(draft.o);}else queueAction(c,id,draft.o);panel.close();changed();}catch(e){error(e.message);}});
  body.querySelector('form').addEventListener('submit',e=>{e.preventDefault();read();try{const result=editId?(c.actionState.plan.find(p=>p.id===editId).options=structuredClone(draft.o),executeAction(c,pack,editId)):takeAction(c,pack,id,draft.o);log('roll',result.text,result.html);panel.close();changed();}catch(e){error(e.message);}});
  body.querySelectorAll('input[data-action-option]').forEach(el=>el.addEventListener('input',()=>{read();const next=describe(id,draft.o);body.querySelector('[data-action-cost]').textContent=costLabel(next.cost);body.querySelector('[data-action-error]').textContent=next.issue||'';body.querySelector('[type="submit"]').disabled=!!next.issue;}));
  body.querySelectorAll('[data-action-option],[data-incoming-context]').forEach(el=>el.addEventListener('change',()=>{read();if(['powerId','rollMode','action','path.kind','path.checkMode','kind','target','incoming.options.sonic'].includes(el.dataset.actionOption)){if(el.dataset.actionOption==='rollMode'&&draft.o.rollMode==='take10')draft.o.fp='none';if(el.dataset.actionOption==='rollMode'&&draft.o.rollMode==='adept')draft.o.enhance=false;if(el.dataset.actionOption==='powerId'&&id==='power'){const p=d.forcePowers.find(p=>p.copyId===draft.o.powerId);draft.o.action=p?.action;draft.o.quicken=false;if(resistancePowerRule(pack,p?.id))draft.o.enhance=false;if(!movementPowerRule(pack,p?.id))draft.o.destiny=false;if(draft.o.rollMode==='take10'&&!p?.take10||draft.o.rollMode==='adept'&&!p?.adept)draft.o.rollMode='roll';}form();}else{const next=describe(id,draft.o);body.querySelector('[data-action-cost]').textContent=costLabel(next.cost);body.querySelector('[data-action-error]').textContent=next.issue||'';body.querySelector('[type="submit"]').disabled=!!next.issue;}}));
  panel.open();
 }
 function read(){if(draft.o.incoming)draft.o.incoming.options.against=[...body.querySelectorAll('[data-incoming-context]:checked')].map(el=>el.dataset.incomingContext);for(const el of body.querySelectorAll('[data-action-option]')){const keys=el.dataset.actionOption.split('.');let obj=draft.o;for(const key of keys.slice(0,-1))obj=obj[key];const value=el.type==='checkbox'?el.checked:el.type==='number'||el.dataset.actionOption==='count'?(el.value===''?null:Number(el.value)):el.value;obj[keys.at(-1)]=value;}}
 function runPlan(){const c=current();for(const step of c.actionState?.plan||[]){if(step.status==='waiting')break;if(step.status!=='queued')continue;try{const r=executeAction(c,pack,step.id);log('roll',r.text,r.html);if(step.status==='waiting'||c.actionState.plan.find(p=>p.id===step.id)?.status==='waiting')break;}catch(e){error(e.message);break;}}changed();}
 function render(){
  const c=current(),s=actionState(c),preview=previewPlan(c,pack),pending=s.plan.find(p=>p.status==='waiting');
  let selfEffects=activeSelfPowerEffects(c,pack).map(s=>`<label>${escape(s.name)}: attack +${s.rule.attackBonus}, <select data-self-power-dice="${s.id}" aria-label="${escape(s.name)} damage dice">${Array.from({length:s.maxDice},(_,i)=>`<option value="${i+1}" ${s.baseDice===i+1?'selected':''}>+${i+1+(s.enhanced?s.rule.enhancementDice:0)}d${s.rule.die}</option>`).join('')}</select><button type="button" data-self-power-remove="${s.id}" aria-label="Remove ${escape(s.name)} effect">×</button></label>`).join('');
  selfEffects+=activeMovementPowers(c,pack).map(s=>`<label>${escape(s.name)}: <select data-movement-power-tier="${s.id}" aria-label="${escape(s.name)} effect">${s.rule.thresholds.slice(0,s.maxTier).map((t,i)=>`<option value="${i+1}" ${s.tier===i+1?'selected':''}>Speed +${t.speedBonus+(s.enhanced?s.rule.enhancement.speedBonus:0)+(s.destiny?s.rule.destiny.speedBonus:0)}, Jump +${t.jumpBonus+(s.enhanced?s.rule.enhancement.jumpBonus:0)}</option>`).join('')}</select><button type="button" data-movement-power-remove="${s.id}" aria-label="Remove ${escape(s.name)} effect">×</button></label>`).join('');
  selfEffects+=activeRagePowers(c,pack).map(s=>`<label>${escape(s.name)}: <select data-rage-power-tier="${s.id}" aria-label="${escape(s.name)} effect">${s.rule.thresholds.slice(0,s.maxTier).map((t,i)=>`<option value="${i+1}" ${s.tier===i+1?'selected':''}>+${t.bonus} Rage</option>`).join('')}</select><span>${s.enhanced?'Encounter':'Turn'}</span><button type="button" data-rage-power-remove="${s.id}" aria-label="Remove ${escape(s.name)} effect">×</button></label>`).join('');
  const phase=actionPhase(s),phaseUsed=phase!=='normal'&&s.spent.length>0;
  const phaseBlocked=type=>phase!=='normal'&&(type==='full'||type==='free'&&derived().flatFooted||['standard','move','swift'].includes(type)&&phaseUsed||phase==='surprised'&&(type!=='swift'||!hasRageTechnique(derived().ctx,pack)));
  const phaseControl=`<select data-turn-phase aria-label="Round" ${actionPhaseLocked(c)?'disabled':''}>${ACTION_PHASES.map(([id,name])=>`<option value="${id}" ${phase===id?'selected':''}>${name}</option>`).join('')}</select>`;
  selfEffects+=activeShieldPowers(c,pack).map(s=>`<label>${escape(s.name)}: <select data-shield-power-tier="${s.id}" aria-label="${escape(s.name)} effect" ${s.used?'disabled':''}>${s.rule.thresholds.slice(0,s.maxTier).map((t,i)=>`<option value="${i+1}" ${s.tier===i+1?'selected':''}>SR ${t.sr+(s.enhanced?s.rule.enhancementSR:0)}</option>`).join('')}</select><span>${s.sr}/${s.srMax}</span><button type="button" data-shield-power-remove="${s.id}" aria-label="Remove ${escape(s.name)} effect">×</button></label>`).join('');
  selfEffects+=activeResistancePowers(c,pack).map(s=>`<div class="resistance-power-effect"><label>${escape(s.name)} <select data-resistance-power-tier="${s.id}" aria-label="${escape(s.name)} effect" ${s.used?'disabled':''}>${s.rule.thresholds.slice(0,s.maxTier).map((t,i)=>`<option value="${i+1}" ${s.tier===i+1?'selected':''}>DR ${t.dr}</option>`).join('')}</select></label><button type="button" data-resistance-power-remove="${s.id}" aria-label="Release ${escape(s.name)}">×</button>${s.pending?`<div class="resistance-check">${s.pending.check?`<span>Use the Force ${s.pending.check.total} (DC ${s.rule.damageCheck.baseDC+s.pending.damage})</span><button type="button" data-resistance-fp="${s.id}" ${checkForcePointAvailable(c,derived())?'':'disabled'}>+ Force Point</button><button type="button" data-resistance-keep="${s.id}">Keep</button>`:`<span>DC ${s.rule.damageCheck.baseDC+s.pending.damage}</span><button type="button" data-resistance-check="${s.id}">Use the Force</button>`}</div>`:''}</div>`).join('');
  selfEffects+=activeDefenseShifts(c,pack,derived().ctx).filter(a=>a.persistent).map(a=>`<label>${escape(a.name+' ('+a.benefit+')')}<button type="button" data-defense-shift-remove="${a.index}" aria-label="Remove ${escape(a.name)}">×</button></label>`).join('');
  const timers=activeTimedTalents(c,pack,derived().ctx).map(t=>`<label>${escape(t.name)} <input type="number" data-timed-talent="${t.id}" min="0" max="${t.rule.durationRounds}" value="${t.rounds}" aria-label="${escape(t.name)} rounds remaining"> rounds</label>`).join('');
  const active=[...activeTurnFeatEffects(c,pack,derived().ctx).map(a=>a.name+' ('+a.benefit+')'),...activeTalentActivations(c,pack,derived().ctx).map(a=>a.name+' ('+a.benefit+')'),...activeTurnTalents(c,pack,derived().ctx).map(a=>a.name+' +'+a.amount),...activeReactionTalents(c,pack,derived().ctx).map(a=>a.name+' ('+a.benefit+')'),...activeDefenseShifts(c,pack,derived().ctx).filter(a=>!a.persistent).map(a=>a.name+' ('+a.benefit+')'),...activeMoveTalentEffects(c,pack,derived().ctx).map(a=>a.name+' ('+a.benefit+')')];
  return `${selfEffects?`<div class="actions self-power-effects">${selfEffects}</div>`:''}${timers?`<div class="actions timed-talents">${timers}</div>`:''}${active.length?`<p>${active.map(escape).join(', ')}</p>`:''}<div class="action-types">${ACTION_TYPES.map(type=>`<button type="button" data-action-menu="${type}" aria-haspopup="dialog" ${(phaseBlocked(type)|| (type==='full'?(s.ended||s.spent.length):['standard','move','swift'].includes(type)&&(s.ended||pack.rules.actionEconomy.substitutions[type].every(slot=>s.spent.includes(slot)))))?'class="action-used"':''}>${ACTION_NAMES[type]}</button>`).join('')}</div>${s.ended?'<span class="badge">Turn ended</span>':''}<div class="actions">${phaseControl}<button type="button" data-turn-next>${c.actionState?.active?'New Turn':'Start turn'}</button>${c.actionState?.active?'<button type="button" data-turn-end>End turn</button><button type="button" data-combat-end>End combat</button>':''}<button type="button" data-rule-reference="${pack.rules.actionEconomy.referenceId}" aria-label="Action rules">ⓘ</button></div>${s.recover.count?`<span>Recover ${s.recover.count}/${recoverActions(derived(),pack)}</span>`:''}${s.plan.length?`<ol class="turn-plan">${s.plan.map((step,i)=>{const v=preview.find(p=>p.id===step.id),done=step.status!=='queued';return `<li data-action-step="${step.id}"><div><button type="button" class="link-button" data-turn-edit="${step.id}" ${done?'disabled':''}>${escape(v?.name||def(step.action)?.name||step.action)}</button>${v?.cost?` <small>${escape(costLabel(v.cost))}</small>`:''}${done?` <span class="badge">${step.status==='waiting'?(step.result.rerollAllowed?'Reroll?':'Force Point?'):'Done'}</span>`:''}</div>${step.result?`<details><summary>Result</summary>${escape(step.result.text)}</details>`:''}${v?.issue?`<span class="action-error">${escape(v.issue)}</span>`:''}${!done?`<button type="button" data-turn-up="${step.id}" aria-label="Move action up" ${i===0||s.plan[i-1].status!=='queued'?'disabled':''}>↑</button><button type="button" data-turn-down="${step.id}" aria-label="Move action down" ${i===s.plan.length-1||s.plan[i+1].status!=='queued'?'disabled':''}>↓</button><button type="button" data-turn-delete="${step.id}" aria-label="Remove planned action">×</button>`:''}</li>`;}).join('')}</ol><div class="actions"><button type="button" data-turn-run ${pending?'disabled':''}>Run plan</button><button type="button" data-turn-clear>Clear finished</button></div>`:''}${pending?`<div class="actions"><span>${escape(pending.result.text)}</span>${pending.result.rerollAllowed?deflectionRerollSources(c,derived(),pack,pending).map(r=>`<button type="button" data-deflection-reroll="${escape(r.id)}" data-deflection-step="${pending.id}">${escape(r.name)}</button>`).join(''):''}${pending.result.fpAllowed?`<button type="button" data-turn-fp="${pending.id}">+ Force Point</button>`:''}${pending.result.enhanceAllowed?`<button type="button" data-turn-enhance="${pending.id}">${negatingPowerRule(pack,pending.options.effectPowerId)?'Heal':'Enhance'} (1 FP${pending.action==='power'&&selfPowerRule(pack,derived().forcePowers.find(p=>p.copyId===pending.options.powerId)?.id)?'':', Manual'})</button>`:''}<button type="button" data-turn-skip="${pending.id}">Keep</button></div>`:''}${s.history.length?`<details><summary>History</summary>${s.history.slice().reverse().map(p=>`<p>${escape(p.result.text)}</p>`).join('')}</details>`:''}`;
 }
 function nextTurn(){
  const c=current(),rows=maintainedPowers(c,pack).sort((a,b)=>(a.family===b.family?0:a.family==='shield'?-1:1)||(b.sr||b.dr)-(a.sr||a.dr));
  if(!rows.length||derived().helpless){beginNextTurn(c,pack);changed();return;}
  draft=null;editId=null;owner=c.id;title.textContent='New Turn';
  body.innerHTML=`<form data-maintenance-form><div class="action-fields">${rows.map((s,i)=>`<label><input type="checkbox" data-maintain-next="${s.id}" ${rows.findIndex(r=>r.family===s.family)===i?'checked':''}>${escape(s.name)} ${s.family==='shield'?s.sr+'/'+s.srMax:'DR '+s.dr} (${escape(s.rule.maintenance[0].toUpperCase()+s.rule.maintenance.slice(1))})</label>`).join('')}</div><div class="action-error" data-maintenance-error></div><button type="submit">New Turn</button></form>`;
  const choices=()=>[...body.querySelectorAll('[data-maintain-next]:checked')].map(el=>el.dataset.maintainNext);
  function preview(){try{beginNextTurn(structuredClone(c),pack,{maintain:choices()});body.querySelector('[data-maintenance-error]').textContent='';body.querySelector('[type="submit"]').disabled=false;}catch(e){body.querySelector('[data-maintenance-error]').textContent=e.message;body.querySelector('[type="submit"]').disabled=true;}}
  body.querySelectorAll('[data-maintain-next]').forEach(el=>el.addEventListener('change',preview));preview();
  body.querySelector('form').addEventListener('submit',e=>{e.preventDefault();if(current().id!==owner){panel.close();return;}try{const results=beginNextTurn(c,pack,{maintain:choices()});for(const r of results)log('resource',r.text);panel.close();changed();}catch(e){body.querySelector('[data-maintenance-error]').textContent=e.message;}});
  if(!panel.isOpen())panel.open();
 }
 function legacy(el,event){
  panel.anchor(el,event);
  const powerUid=el.dataset.usePower||el.dataset.powerAdept||el.dataset.powerTake10,knownPower=powerUid&&selfPowerRule(pack,derived().forcePowers.find(p=>p.copyId===powerUid)?.id);
  if(pendingResistanceChecks(current()).length&&el.matches('[data-combat],[data-recovery],[data-use-power],[data-power-adept],[data-power-take10],[data-recover-power],[data-next-turn]')){error('Resolve or release Energy Resistance maintenance');return true;}
  if(!current().actionState?.active&&!knownPower&&el.dataset.recovery!=='regenerative-healing'&&!(el.hasAttribute('data-next-turn')&&maintainedPowers(current(),pack).length))return false;
  const c=current(),id=el.dataset.combat;
  const map={jump:'jump',attack:'attack',charge:'charge','running-attack':'running-attack',withdraw:'withdraw','acrobatics-move':'move',balance:'balance','balance-recheck':'balance-recheck','escape-bonds':'escape-bonds','prone-action':c.prone?'stand':'prone','acrobatics-prone':'acrobatics-prone',opportunity:'opportunity',cleave:'cleave','follow-through':'follow-through',reload:'reload'};
  let action=map[id],o=action?options(action):{};
  if(action==='jump'){o.path=jumpState(c);draft={id:action,o};owner=c.id;category='move';form();return true;}
  if(action){if(el.dataset.attackId)o.uid=el.dataset.attackId;if(action==='reload'||action==='balance-recheck'){draft={id:action,o};category=action==='balance-recheck'?'reaction':'move';owner=c.id;form();return true;}}
  else if(['run','step'].includes(id)){const r=c.routines.find(r=>r.id===el.closest('[data-routine]')?.dataset.routine);if(r?.kind!=='fullAttack'){action=id==='run'?'routine':'routine-step';o={...options(action),routineId:r?.id};draft={id:action,o};owner=c.id;category='full';form();return true;}action=id==='run'?'full-attack':'full-attack-step';o={routineId:r.id};}
  else if(['recover','second-wind','regenerative-healing','rage'].includes(el.dataset.recovery)){action=el.dataset.recovery==='regenerative-healing'?'second-wind':el.dataset.recovery;o=options(action);if(el.dataset.recovery==='regenerative-healing')o.regenerate=true;if(action==='recover')o.count=recoverActions(derived(),pack)-(actionState(c).recover.count%recoverActions(derived(),pack));}
  else if(el.dataset.usePower||el.dataset.powerAdept||el.dataset.powerTake10){action='power';o=options(action);o.powerId=el.dataset.usePower||el.dataset.powerAdept||el.dataset.powerTake10;const p=derived().forcePowers.find(p=>p.copyId===o.powerId);o.action=p.action;o.rollMode=el.dataset.powerAdept?'adept':el.dataset.powerTake10?'take10':'roll';if(o.rollMode==='take10')o.fp='none';if(knownPower)o.enhance=o.rollMode!=='adept'&&!resistancePowerRule(pack,p.id);if(resistancePowerRule(pack,p.id)||p.action==='reaction'||movementPowerRule(pack,p.id)||pack.rules.actionEconomy.powerRequirements?.[p.id]?.aware){draft={id:action,o};owner=c.id;category='reaction';form();return true;}}
  else if(el.dataset.recoverPower){action='recover-power';o={powerId:el.dataset.recoverPower};draft={id:action,o};owner=c.id;category='reaction';form();return true;}
  else if(el.dataset.energyActivate||el.dataset.energyRecharge){action=el.dataset.energyActivate?'shield':'shield-recharge';o={uid:el.dataset.energyActivate||el.dataset.energyRecharge};}
  else if(el.dataset.defenseStance==='total'){action='total-defense';}
  else if(el.dataset.action==='force-point-roll'){action='force-bonus';}
  if(el.hasAttribute('data-power-end-turn')||id==='other-turn'){try{endCurrentTurn(c,pack);changed();}catch(e){error(e.message);}return true;}
  if(el.hasAttribute('data-power-rest')){try{clearResistancePowers(c);endTrackedCombat(c);}catch(e){error(e.message);return true;}return false;}
  if(el.hasAttribute('data-next-turn')){try{nextTurn();}catch(e){error(e.message);}return true;}
  if(!action)return false;
  try{const r=takeAction(c,pack,action,o);log('roll',r.text,r.html);changed();}catch(e){error(e.message);}return true;
 }
 document.getElementById('actions-close').addEventListener('click',()=>panel.close());
 return {render,legacy,
  bellow(form){if(!current().actionState?.active)return false;try{const o={extraDice:Number(form.querySelector('[data-bellow-dice]').value),strong:!!form.querySelector('[data-bellow-strong]')?.checked,damage:form.querySelector('[data-bellow-damage]')?Number(form.querySelector('[data-bellow-damage]').value):null},r=takeAction(current(),pack,'bellow',o);log('roll',r.text,r.html);changed();}catch(e){error(e.message);}return true;},
  change(el){if(el.hasAttribute('data-resistance-power-tier')){try{chooseResistancePowerTier(current(),pack,el.dataset.resistancePowerTier,Number(el.value));changed();}catch(e){error(e.message);changed();}return true;}if(el.hasAttribute('data-shield-power-tier')){try{chooseShieldPowerTier(current(),pack,el.dataset.shieldPowerTier,Number(el.value));changed();}catch(e){error(e.message);changed();}return true;}if(el.hasAttribute('data-turn-phase')){try{setActionPhase(current(),el.value,pack);changed();}catch(e){error(e.message);changed();}return true;}if(el.hasAttribute('data-rage-power-tier')){try{chooseRagePowerTier(current(),el.dataset.ragePowerTier,Number(el.value));changed();}catch(e){error(e.message);changed();}return true;}if(el.hasAttribute('data-movement-power-tier')){try{chooseMovementPowerTier(current(),el.dataset.movementPowerTier,Number(el.value));changed();}catch(e){error(e.message);changed();}return true;}if(el.hasAttribute('data-self-power-dice')){try{chooseSelfPowerDice(current(),el.dataset.selfPowerDice,Number(el.value));changed();}catch(e){error(e.message);changed();}return true;}if(el.hasAttribute('data-timed-talent')){try{setTimedTalentRounds(current(),pack,el.dataset.timedTalent,Number(el.value));changed();}catch(e){error(e.message);changed();}return true;}if(!current().actionState?.active)return false;const c=current();let id,o;
   if(el.dataset.inventory&&['aimed','braced'].includes(el.dataset.inventory)&&el.checked){id=el.dataset.inventory==='aimed'?'aim':'brace';o={uid:c.inventory[Number(el.dataset.index)].uid};}
   else if(el.hasAttribute('data-mighty-swing')&&el.checked){id='mighty-swing';o={};}
   if(!id)return false;try{const r=takeAction(c,pack,id,o);log('resource',r.text);changed();}catch(e){error(e.message);changed();}return true;
  },
  click(el,event){
   panel.anchor(el,event);
   if(el.dataset.actionMenu){menu(el.dataset.actionMenu);return true;}
   const c=current(),s=c.actionState;
   try{
    if(el.hasAttribute('data-negate-damage')){const p=derived().forcePowers.find(p=>negatingPowerRule(pack,p.id)&&!p.spent);if(!p)throw new Error('Negate Energy unavailable');draft={id:'power',o:{...options('power'),powerId:p.copyId,action:p.action,incoming:readDamageForm(el.closest('form')),enhance:true}};category='reaction';owner=c.id;form();return true;}
    else if(el.dataset.resistancePowerRemove)removeResistancePower(c,el.dataset.resistancePowerRemove);
    else if(el.dataset.resistanceCheck){const r=rollResistanceMaintenance(c,pack,el.dataset.resistanceCheck);log('roll',r.text,r.html);}
    else if(el.dataset.resistanceKeep||el.dataset.resistanceFp){const r=finishResistanceMaintenance(c,pack,el.dataset.resistanceKeep||el.dataset.resistanceFp,!!el.dataset.resistanceFp);log('roll',r.text,r.html);}
    else if(el.dataset.shieldPowerRemove)removeShieldPower(c,el.dataset.shieldPowerRemove);
    else if(el.dataset.defenseShiftRemove!==undefined)removeDefenseShift(c,Number(el.dataset.defenseShiftRemove));
    else if(el.dataset.ragePowerRemove)removeRagePower(c,el.dataset.ragePowerRemove);
    else if(el.dataset.movementPowerRemove)removeMovementPower(c,el.dataset.movementPowerRemove);
    else if(el.dataset.selfPowerRemove)removeSelfPowerEffect(c,el.dataset.selfPowerRemove);
    else if(el.hasAttribute('data-turn-next')){nextTurn();return true;}
    else if(el.hasAttribute('data-turn-end')){if(s?.plan.some(p=>p.status==='waiting'))throw new Error(pendingChoiceMessage(c));endCurrentTurn(c,pack);}
    else if(el.hasAttribute('data-combat-end'))endTrackedCombat(c);
    else if(el.hasAttribute('data-turn-run')){runPlan();return true;}
    else if(el.dataset.deflectionReroll||el.dataset.turnSkip&&s?.plan.find(p=>p.id===el.dataset.turnSkip)?.result.rerollAllowed){const r=finishDeflectionChoice(c,pack,el.dataset.deflectionStep||el.dataset.turnSkip,el.dataset.deflectionReroll||null);log('roll',r.text,r.html);}
    else if(el.dataset.turnFp||el.dataset.turnSkip||el.dataset.turnEnhance){const r=finishForceChoice(c,pack,el.dataset.turnFp||el.dataset.turnSkip||el.dataset.turnEnhance,el.dataset.turnEnhance?'enhance':!!el.dataset.turnFp);log('roll',r.text,r.html);}
    else if(el.hasAttribute('data-turn-clear'))archivePlan(c);
    else if(el.dataset.turnEdit){const step=s.plan.find(p=>p.id===el.dataset.turnEdit);if(step?.status!=='queued')return true;draft={id:step.action,o:structuredClone(step.options)};editId=step.id;owner=c.id;form();return true;}
    else if(el.dataset.turnDelete){s.plan=s.plan.filter(p=>p.id!==el.dataset.turnDelete||p.status!=='queued');}
    else if(el.dataset.turnUp||el.dataset.turnDown){const id=el.dataset.turnUp||el.dataset.turnDown,i=s.plan.findIndex(p=>p.id===id),j=i+(el.dataset.turnUp?-1:1);if(s.plan[i]?.status==='queued'&&s.plan[j]?.status==='queued')[s.plan[i],s.plan[j]]=[s.plan[j],s.plan[i]];}
    else return false;
    changed();
   }catch(e){error(e.message);}return true;
  },
  refresh(){if(owner&&owner!==current().id)panel.close();}
 };
}
