import {setSkillAbility,skillAbilityControl} from './skill-abilities.js';
import {attackAbilityControl,setAttackAbility} from './attack-abilities.js';
import {campaignRuleEnabled,forcePoolAfterAdvancement} from './campaign-rules.js';
import {jumpControls} from './jump-ui.js';
import {advanceTimedTalents} from './timed-talents.js';
import {createVehiclesUI} from './vehicles-ui.js';
import {createStarshipManeuvers} from './starship-maneuvers-ui.js';
import {speciesQualities,changeSpeciesQuality} from './species-profiles.js';
import {speciesQualityControls} from './species-profiles-ui.js';
import {activeAbilities,abilityRecord,activeBudget,setAbilityBudget,setBaseAbility} from './ability-profiles.js';
import {customizationState,setSpeciesCustomization} from './species-customization.js';
import {customizationControls,customizationFeatures} from './species-customization-ui.js';
import {setNaturalModifier} from './natural-weapons.js';
import {createActionsUI} from './actions-ui.js';
import {spendDestinyPoint} from './heroic-traits.js';
import {MODULES,moduleDefinition,moduleRelevant} from './sheet-modules.js';
import {featureEntries} from './feature-views.js';
import {automationBadge} from './feature-status.js';
import {resolveSpecies,speciesChoiceDetails,chooseSpeciesOption} from './species-choices.js';
import {resizeLevelPlan,choosePlannedClass} from './level-plan.js';
import {levelPlanTable} from './level-plan-ui.js';
import {setTeamAllies,teamSkillControls} from './team-skills.js';
import {classEntry,hasClassTalent,recordPrivateerFall} from './class-advancement.js';
import {classOptions,classDeclarations,classChoiceControls,classKindLabel} from './class-advancement-ui.js';
import {energyShieldDetails,activateEnergyShield,rechargeEnergyShield} from './energy-shields.js';
import {energyShieldControls} from './energy-shields-ui.js';
import {armorExclusive,ARMOR_CHECKS} from './armor.js';
import {createCreationOptions} from './creation-options.js';
import {declareBracing,clearBracing,declarePowerAttack,startNextTurn,changeWeaponSetting} from './attack-techniques.js';
import {conditionalDefenseLabel,declareDefenseStance,declareFlurry,declareMeleeDefense,designateDodgeOpponent} from './defensive-combat.js';
import {defensiveCombatControls} from './defensive-combat-ui.js';
import {chargeControls} from './charge-ui.js';
import {runningAttackView} from './combat-movement-actions.js';
import {opportunityView} from './opportunity-actions.js';
import {runningAttackControls,withdrawControls} from './combat-movement-ui.js';
import {acrobaticsMoveControls,proneActionControls} from './acrobatics-movement-ui.js';
import {balanceControls} from './balance-ui.js';
import {escapeBondsControls} from './escape-bonds-ui.js';
import {fallingControls} from './falling-ui.js';
import {followUpControls} from './attack-follow-up-ui.js';
import {opportunityControls,opportunityButton} from './opportunity-ui.js';
import {attackTargetControls} from './attack-targets-ui.js';
import {attackTarget,validateAttackTarget,canAimAtTarget} from './attack-targets.js';
import {chargePath,validateCharge} from './charge.js';
import {createForcePowers} from './force-powers-ui.js';
import {createHouseRules} from './house-rules.js';
import {droidSystemUsesSize} from './droid-systems.js';
import {prepareDroidSystems,addStartingDroidSystem,droidStartingSpent,startingSystemEligible} from './droid-installation.js';
import {createDroidSystemsUI} from './droid-systems-ui.js';
import {equipmentFamilies,resolveEquipment,purchaseQuote,startingEquipmentGrants,claimStartingEquipment,canRollStartingCredits,claimStartingCredits} from './equipment.js';
import {createFeatureTrees} from './feature-trees.js';
import {createSpeciesBrowser,speciesChoiceControls} from './species-browser.js';
import {createRulesCatalog} from './rules-catalog.js';
import {createReferenceLibrary} from './reference-library.js';
import {renderArticle,displayText} from './wiki-content.js';
import {ABILITIES, GROUPS, signed, indexPack, derive, progression, eligible, classSkills,talentTrees,levelSlots} from './rules.js';
import {createStore, downloadJSON} from './persistence.js';
import {commitMath} from './math-fields.js';
import {evalExpr, totalHtml} from './dice.js';
import {animateNewestRoll} from './roll-anim.js';
import {renderStatBlock} from './stat-block.js';
import {installStatBlock} from './stat-block-ui.js';
import {healthBars,xpBar,statBar,createCombatControls} from './combat-ui.js';
import {createRecoveryControls} from './recovery-ui.js';
import {CREATOR_TABS,CREATOR_STEPS} from './creation-steps.js';
import {referenceEntries} from './rules-reference.js';
import {TRAIT_FIELDS, TRAIT_TEXT, emptyStory, backgroundLanguage} from './heroic-traits.js';
import {generationState, setGenerationMethod, assignScore, setPoolScore, setRolledPool} from './ability-generation.js';
import {featureChoices,choiceName,UNARMED_ID,talentTreeIds,resolveFeatureSelection} from './feature-choices.js';
import {createSpeciesChecks} from './species-rules.js';
import {canAim} from './weapon-rules.js';
import {ammunitionProfile} from './ammunition.js';
import {recordKnockout} from './recovery.js';

const $ = id => document.getElementById(id);
const escape = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone = value => structuredClone(value);
const title = value => value.replaceAll('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
const SECTIONS = ['overview','creation','skills','features','equipment','advancement','rules'];
let section = SECTIONS.includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
let pack, ix, store, derived, speciesBrowser, featureTrees, combatControls, rulesCatalog,speciesChecks,recoveryControls;
let actionsUI,droidSystemsUI,vehiclesUI;
let treeTarget=null, houseRules, creationOptions,forcePowersUI,powerManageLevel=0,starshipManeuversUI,maneuverManageLevel=0;
const referenceLibrary=createReferenceLibrary();
let referenceRequest=0;
function repaintRulesCatalog(){
 const root=$('rules-catalog-body');if(!root)return;
 const active=document.activeElement?.id;
 root.innerHTML=rulesCatalog.render();
 if(active&&$(active))$(active).focus();
}
async function loadReferences(){
 rulesCatalog.referenceState('loading');repaintRulesCatalog();
 try{rulesCatalog.setReferences(await referenceLibrary.load());}
 catch{rulesCatalog.referenceState('error');}
 repaintRulesCatalog();
}
async function openReference(id){
 const request=++referenceRequest,modal=$('rule-detail-modal');
 $('rule-detail-title').textContent=referenceLibrary.record(id)?.name||'Rules';
 $('rule-detail-body').textContent='Loading…';
 if(!modal.open)modal.showModal();
 try{
  const page=await referenceLibrary.article(id);
  if(request!==referenceRequest||!modal.open)return;
  $('rule-detail-title').textContent=page.name;
  $('rule-detail-body').innerHTML=renderArticle(page.article)+`<p><a href="${escape(page.source.url)}" target="_blank" rel="noopener">Revision ${page.source.revision}</a>, <a href="${escape(page.source.history)}" target="_blank" rel="noopener">Contributors ↗</a></p>`;
 }catch{
  if(request===referenceRequest&&modal.open)$('rule-detail-body').innerHTML=`<p role="alert">Reference unavailable. Connect and retry.</p><button data-rule-reference="${escape(id)}">Retry</button>`;
 }
}
const equipmentDrafts=new Map();
const weightText=(weight)=>weight===null?'? kg':`${Number(weight.toFixed(2))} kg`;
const totalWeight=()=>`${derived.weight.toFixed(1)}${derived.weightUnknown?' + ?':''} kg`;
const knowledgeDrafts = new Map();
const backgroundKnowledgeDrafts = new Set();
let creatorStep = 0, editorMode = null, returnFocus = null;
let saveState = ['Saved', false];
let toastTimer;
const rollMarkup=new WeakMap();
const rollEntryHTML=e=>rollMarkup.get(e)||escape(displayText(e.text));
const dieHTML=(value,sides,attrs='',dropped=false)=>`<span class="die${dropped?' die-dropped':''}" data-sides="${sides}" data-final="${value}" data-term="0" ${attrs}>${value}</span>`;
let recoveryExported = false;
const status = (message, error) => { saveState = [message,error]; $('save-status').textContent = message; $('save-status').classList.toggle('error',error); };
const notify = message => { $('message').textContent = message; $('message').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('message').hidden = true, 7000); };
const current = () => store.current();
const option = (value, name, selected, disabled=false) => `<option value="${escape(value)}" ${String(value) === String(selected) ? 'selected' : ''} ${disabled ? 'disabled' : ''}>${escape(name)}</option>`;
const choices = (records, selected) => [...records].sort((a,b) => a.name.localeCompare(b.name)).map(r => option(r.id, r.name, selected, r.id.startsWith('class:')&&(ix?.species.get(current().species).forbiddenClasses||[]).includes(r.id))).join('');
const field = (label, key, value, type='text', attrs='') => `<label>${escape(label)}<input type="${type}" data-field="${key}" value="${escape(value)}" ${attrs}></label>`;
function ruleReference(r, label=r.name, selection=null, scope='ref') {
  return `<details class="rules-ref-detail" id="${escape(scope+'-'+r.id+(selection?.choice?'-'+selection.choice:''))}"><summary aria-label="${escape(r.name)} mechanics">${escape(label)}${automationBadge(r)}</summary><div class="rules-ref-body">${r.article?renderArticle(r.article):`<dl>${referenceEntries(r,pack,selection).map(e=>`<dt>${escape(e.heading)}</dt><dd>${escape(e.text)}</dd>`).join('')}</dl>`}</div></details>`;
}
const panel = (heading, body, className='') => `<section class="panel ${className}">${heading ? `<div class="panel-heading"><h2>${heading}</h2></div>` : ''}${body}</section>`;
const metric = (label, value, detail='') => `<div class="metric"><span>${label}</span><strong>${value}</strong>${detail ? `<small>${detail}</small>` : ''}</div>`;
const entryLabel = s => { const r = ix.feats.get(s.id) || ix.talents.get(s.id)||ix.classChoices.get(s.id); return r.name + (s.choice ? ` (${choiceName(s.choice,pack)})` : ''); };
function selectionValue(s) { return s ? `${s.id}|${s.choice || ''}` : ''; }
function parseSelection(value) { if (!value) return null; const [id,choice] = value.split('|'); return choice ? {id,choice} : {id}; }
function variants(r) {
  const values = featureChoices(r,pack);
  return values.map(choice => ({id:r.id,...(choice ? {choice} : {})}));
}

// A selector is evaluated before its own grant and before later selections.
function selectorContext(levelIndex, kind, slotIndex=0) {
  const draft = clone(current());
  draft.levels = draft.levels.slice(0,levelIndex+1);
  const l = draft.levels[levelIndex];
  if (kind === 'startingFeat') { l.startingFeat = null; l.feats = []; l.talent = null; }
  if (kind === 'feat') { l.feats = l.feats.slice(0,slotIndex); l.talent = null; }
  if (kind === 'talent') l.talent = null;
  if(kind==='classChoice')l.classChoices=(l.classChoices||[]).slice(0,slotIndex);
  return progression(draft,pack).ctx;
}
function selectChoice(levelIndex, kind, slotIndex, slot, selected, hidePrimary=false,compact=false) {
  if(kind==='talent'&&selected)selected=resolveFeatureSelection(ix.talents.get(selected.id),selected,pack);
  const type = kind==='classChoice'?'classChoices':kind === 'talent' ? 'talents' : 'feats';
  const l = current().levels[levelIndex], cls = ix.classes.get(l.classId);
  const ctx = selectorContext(levelIndex,kind,slotIndex);
  let records = pack[type];
  if(kind==='classChoice')records=records.filter(r=>r.kind===slot.kind);
  if (kind === 'talent') records = records.filter(r => talentTreeIds(r).some(id=>talentTrees(cls,ctx,pack).includes(id)));
  if (kind === 'startingFeat') records = records.filter(r => cls.startingFeats.includes(r.id));
  if (slot?.kind === 'bonus') records = records.filter(r => cls.bonusFeats.includes(r.id) || cls.startingFeats.includes(r.id));
  const available = r => variants(r).filter(s=>eligible(r,s,ctx,ix,type,{ignoreManual:true}) && (slot?.kind !== 'bonus' || !cls.bonusRestrictions[r.id] || cls.bonusRestrictions[r.id].includes(s.choice)));
  // Some weapon/armor feats have separate rules IDs. Present their shared name once.
  const family = r => type==='feats' && /^(Weapon Proficiency|Armor Proficiency) \(/.test(r.name) ? r.name.replace(/ \(.*\)$/, '') : null;
  const groups = new Map();
  for (const r of records) {
    if (!available(r).length && r.id!==selected?.id) continue;
    const name=family(r), key=name?`family:${name}`:selectionValue({id:r.id});
    if (!groups.has(key)) groups.set(key,{value:key,name:name||r.name,records:[]});
    groups.get(key).records.push(r);
  }
  const record=selected && ix[type].get(selected.id);
  const primary=record ? (family(record)?`family:${family(record)}`:selectionValue({id:record.id})) : '';
  if (record && !groups.has(primary)) groups.set(primary,{value:primary,name:family(record)||record.name,records:[record]});
  const group=groups.get(primary), secondary=group && (group.value.startsWith('family:') || record.choiceType);
  const label = kind === 'talent' ? 'Talent' : kind === 'startingFeat' ? 'Starting feat' : slot.label;
  const attrs=`data-choice="${kind}" data-level="${levelIndex}" data-slot="${slotIndex}"`;
  let secondaryHTML='';
  if (secondary) {
    const options=group.records.flatMap(r=>(r.choiceType==='talent'?variants(r):available(r)).map(s=>({value:selectionValue(s),name:group.value.startsWith('family:')?r.name.match(/\((.*)\)$/)[1]:choiceName(s.choice,pack),disabled:r.choiceType==='talent'&&!eligible(r,s,ctx,ix,type,{ignoreManual:true})})));
    const value=!selected?.pending && (selected?.choice || group.value.startsWith('family:')) ? selectionValue(selected) : '';
    if(value && !options.some(o=>o.value===value)) options.unshift({value,name:`${entryLabel(selected)} (ineligible)`});
    const secondaryLabel=group.value.startsWith('family:')?'Type':record.choiceType==='skill'?'Skill':record.choiceType==='weapon'?'Weapon':record.choiceType==='power'?'Power':'Weapon group';
    secondaryHTML=record.choiceType==='manual'?`<label>${escape(record.choiceLabel||'Choice')}<input type="text" maxlength="300" ${attrs} data-manual-choice value="${escape(selected.choice?.startsWith('manual:')?selected.choice.slice(7):'')}"></label>`:`<label>${escape(record.choiceLabel||(record.choiceType==='enum'?'Choice':secondaryLabel))}<select ${attrs} data-secondary>${option('','Choose…',value)}${options.sort((a,b)=>a.name.localeCompare(b.name)).map(o=>option(o.value,o.name,value,o.disabled)).join('')}</select></label>`;
  }
  if(record?.choiceType==='talent'){
    const child=ix.talents.get(selected?.choice),page=child?pack.rulePages.find(p=>p.sourceId===child.sourceId)||pack.catalog.records.find(r=>r.kind==='talent'&&r.mechanicsIds.includes(child.id)):pack.rulePages.find(p=>p.id==='rule:'+record.choiceTree.slice(5)+'-talent-tree');
    const rid=page?.ruleId||page?.id;
    if(rid)secondaryHTML+=`<a href="https://swse.miraheze.org/wiki/Lightsaber_Forms_Talent_Tree" data-rule-page="${escape(rid)}" aria-label="${escape(child?.name||'Forms')} mechanics">ⓘ</a>`;
  }
  if(record?.manualPrerequisites?.length)secondaryHTML+=`<details class="manual-prerequisites"><summary>Prerequisites</summary><ul>${record.manualPrerequisites.map(t=>`<li>${escape(displayText(t))}</li>`).join('')}</ul></details><label class="checkbox"><input type="checkbox" ${attrs} data-manual-requirements ${selected.manualRequirements?'checked':''}>Requirements met</label>`;
  return `<div class="choice-field">${hidePrimary?'':`<label>${compact?'':escape(label)}<button type="button" aria-label="${escape(label)} at level ${levelIndex+1}, choice ${slotIndex+1}" ${attrs} data-primary data-open-tree="${kind}:${levelIndex}:${slotIndex}">${escape(record?(family(record)||entryLabel(selected)):'Choose…')}</button></label>`}${record&&!hidePrimary?automationBadge(record):''}${secondaryHTML}</div>`;

}
function treeOptions(level,kind,slotIndex=0) {
  const c=current(),l=c.levels[level],cls=ix.classes.get(l.classId),row=derived.rows[level];
  if(kind==='class')return {key:c.id+':class:'+level,type:'classes',kind,level,slotIndex:0,ctx:progression(c,pack,level).ctx,draft:{acquisitionDSS:c.darkSideScore},classDrafts:l.pendingClass?{}:{[l.classId]:{entryDeclarations:l.entryDeclarations,acquisitionDSS:l.acquisitionDSS??c.darkSideScore}},selected:l.pendingClass?null:{id:l.classId},allowedIds:pack.classes.map(r=>r.id)};
  const slot=kind==='classChoice'?row.choiceSlots[slotIndex]:kind==='feat'?row.slots[slotIndex]:null;
  const type=kind==='classChoice'?'classChoices':kind==='talent'?'talents':'feats';
  const ctx=selectorContext(level,kind,slotIndex);
  const allowedTrees=kind==='talent'?talentTrees(cls,ctx,pack):null;
  const allowedIds=pack[type].filter(r=>kind==='classChoice'?r.kind===slot.kind:kind==='talent'?talentTreeIds(r).some(id=>allowedTrees.includes(id)):kind==='startingFeat'?cls.startingFeats.includes(r.id):slot.kind!=='bonus'||cls.bonusFeats.includes(r.id)||cls.startingFeats.includes(r.id)).map(r=>r.id);
  return {key:c.id+':'+level+':'+kind+':'+slotIndex,type,kind,level,slotIndex,
    selected:kind==='classChoice'?l.classChoices?.[slotIndex]:kind==='feat'?l.feats[slotIndex]:l[kind],ctx,
    allowedIds,...(allowedTrees?{allowedTrees}:{}),restrictions:slot?.kind==='bonus'?cls.bonusRestrictions:null};
}
function renderTreeDialog() {
  if(!treeTarget || !$('feature-tree-modal').open)return;
  const {level,kind,slotIndex}=treeTarget;
  if(kind==='vehicles'){$('feature-tree-title').textContent='Vehicles';$('feature-tree-body').innerHTML=vehiclesUI.manager();return;}
  if(kind==='maneuvers'){$('feature-tree-title').textContent='Starship Maneuvers (Level '+(level+1)+')';$('feature-tree-body').innerHTML=starshipManeuversUI.library(level);return;}
  if(kind==='powers'||kind==='training'){$('feature-tree-title').textContent=(kind==='powers'?'Force Powers':'Skills')+' (Level '+(level+1)+')';$('feature-tree-body').innerHTML=kind==='powers'?forcePowersUI.library(level):trainingAfterIncrease(level);numericFields($('feature-tree-body'));return;}
  const options=treeOptions(level,kind,slotIndex);
  if(kind==='class'){$('feature-tree-title').textContent='Choose Your Class (Level '+(level+1)+')';$('feature-tree-body').innerHTML=featureTrees.render(options);return;}
  $('feature-tree-title').textContent=kind==='classChoice'?'Select a '+classKindLabel[derived.rows[level].choiceSlots[slotIndex].kind]:kind==='talent'?'Select a Talent':'Select Feats';
  const slot=kind==='classChoice'?{...derived.rows[level].choiceSlots[slotIndex],label:classKindLabel[derived.rows[level].choiceSlots[slotIndex].kind]}:kind==='feat'?derived.rows[level].slots[slotIndex]:null;
  const record=options.selected&&ix[options.type].get(options.selected.id),powers=record?.effects?.some(e=>e.target==='forcePowerSlots')?forcePowersUI.library(level):'';
  if(treeTarget.secondary&&powers){$('feature-tree-title').textContent=record.name;$('feature-tree-body').innerHTML='<button type="button" data-feature-primary>Back</button>'+powers;return;}
  $('feature-tree-body').innerHTML=selectChoice(level,kind,slotIndex,slot,options.selected,true)+featureTrees.render(options);
}
function levelEditor(i) {
  const l = current().levels[i], row = derived.rows[i], cls = row.cls;
  return `<div class="level-editor">${i ? `<div class="form-grid">${field(`HP ${campaignRuleEnabled(current(),'averageHP')?'average':'roll'} (d${cls.hitDie})`,'hpRoll',derived.hpGains[i],'number',`min="1" max="${cls.hitDie}" data-level="${i}" ${campaignRuleEnabled(current(),'averageHP')?'readonly':''}`)}</div>` : ''}
    ${pack.rules.abilityLevels.includes(i+1) ? `<div class="form-grid">${[0,1].map(j => `<label>Ability increase ${j+1}<select data-increase="${j}" data-level="${i}">${option('','Choose…',l.abilityIncreases[j] || '')}${activeAbilities(current(),pack).map(a => option(a,a.toUpperCase(),l.abilityIncreases[j])).join('')}</select></label>`).join('')}</div>` : ''}
    ${i && row.classLevel === 1 &&cls.startingFeats.length? selectChoice(i,'startingFeat',0,null,l.startingFeat) : ''}
    <div class="form-grid">${row.slots.map((slot,j) => selectChoice(i,'feat',j,slot,l.feats[j])).join('')}${row.valid!==false&&hasClassTalent(cls,row.classLevel) ? selectChoice(i,'talent',0,null,l.talent) : ''}</div>
    ${cls.classType==='prestige'&&row.classLevel<=1?classDeclarations(cls,l,i):''}${cls.continuousDarkSide&&row.classLevel<=1?`<label>Acquisition DSS <input type="number" min="0" max="1000" data-class-dss="${i}" value="${l.acquisitionDSS??current().darkSideScore}"></label>`:''}${cls.advanceRestrictions?.length&&row.classLevel===1?`<label><input type="checkbox" data-class-ban="${cls.id}" ${current().classBans?.some(b=>b.classId===cls.id)?'checked':''}>Known pirate</label>`:''}${classChoiceControls(pack,row,l,i,selectChoice)}
    ${trainingAfterIncrease(i)}
    ${forcePowersUI.library(i)}${starshipManeuversUI.library(i)}
  </div>`;
}
function trainingList(scope) {return scope==='initial'?current().trainedSkills:current().levels[Number(scope)].trainedSkills;}
function replaceTraining(scope, skills) {if(scope==='initial')current().trainedSkills=skills;else current().levels[Number(scope)].trainedSkills=skills;}
function knowledgeKey(scope) {return current().id+':'+scope;}
function skillPicks(records, chosen, scope='initial', allowed=new Set(records.map(r=>r.id)), counter='') {
  const automatic=scope==='initial'?derived.rows[0]?.ctx.speciesTraining||new Set():new Set();
  const origin=ix.species.get(current().species).name;
  const trainingBadge=id=>automatic.has(id)?`<small class="badge" title="Species training">${escape(origin)}</small>`:'';
  const knowledge=records.filter(r=>r.id.startsWith('skill:knowledge-'));
  const selected=chosen.filter(id=>id.startsWith('skill:knowledge-'));
  const speciesKnowledge=knowledge.filter(r=>automatic.has(r.id)).map(r=>r.id);
  const pending=knowledgeDrafts.get(knowledgeKey(scope))||0;
  let knowledgeShown=false;
  const rows=records.map(r=>{
    if(r.id.startsWith('skill:knowledge-')) {
      if(knowledgeShown)return null;knowledgeShown=true;
      const slots=[...speciesKnowledge.filter(id=>!selected.includes(id)),...selected,...Array(pending).fill('')];
      const canTrain=knowledge.some(r=>allowed.has(r.id)&&!automatic.has(r.id));
      const fields=slots.map((id,i)=>{
        const fixed=automatic.has(id)&&!selected.includes(id);
        return `<div class="knowledge-field"><select aria-label="Knowledge field ${i+1}" data-knowledge-field="${scope}" data-previous-knowledge="${escape(id)}" ${fixed?'disabled':''}>${option('','Choose Knowledge Field',id)}${knowledge.map(r=>option(r.id,r.name.replace(/^Knowledge \((.*)\)$/, '$1'),id,!allowed.has(r.id)||((selected.includes(r.id)||automatic.has(r.id))&&r.id!==id))).join('')}</select><button type="button" data-remove-knowledge="${scope}" data-knowledge-id="${escape(id)}" aria-label="Remove Knowledge field ${i+1}" title="Remove Knowledge field ${i+1}" ${fixed?'disabled':''}>×</button>${trainingBadge(id)}</div>`;
      }).join('');
      const locked=!selected.length&&!pending&&(speciesKnowledge.length>0||!canTrain);
      const control=`<div class="knowledge-pick"><label class="${canTrain||speciesKnowledge.length?'':'skill-unavailable'}"><input type="checkbox" data-knowledge-group="${scope}" ${slots.length?'checked':''} ${locked?'disabled':''}>Knowledge</label>${slots.length?`<div class="knowledge-fields">${fields}${canTrain&&slots.length<knowledge.length?`<button type="button" data-add-knowledge="${scope}" aria-label="Add Knowledge field">+</button>`:''}</div>`:''}</div>`;
      return {id:'skill:knowledge',name:'Knowledge',ability:'int',control,selected:slots.length>0,unavailable:!canTrain&&!speciesKnowledge.length};
    }
    const attrs=scope==='initial'?`data-trained="${r.id}"`:`data-extra-skill="${r.id}" data-level="${scope}"`;
    const trained=chosen.includes(r.id),fixed=automatic.has(r.id),available=allowed.has(r.id)||fixed;
    const control=`<label class="${available?'':'skill-unavailable'}" ${available?'':`title="${r.id==='skill:use-the-force'?'Requires Force Sensitivity':'Not a class skill'}"`}><input type="checkbox" ${attrs} ${trained||fixed?'checked':''} ${fixed&&!trained||!available&&!trained?'disabled':''}>${escape(r.name)}</label>${trainingBadge(r.id)}`;
    return {id:r.id,name:r.name,ability:r.ability,control,selected:trained||fixed,unavailable:!available};
  });
  return creationOptions.skills(knowledgeKey(scope),rows.filter(Boolean),counter);
}
function trainingAfterIncrease(i) {
  const before = i ? progression(current(),pack,i).ctx.scores.int : derived.rows[0].scores.int;
  const amount = Math.max(0,Math.floor((derived.rows[i].scores.int-10)/2)-Math.floor((before-10)/2));
  if (!amount) return '';
  const ctx = derived.rows[i].ctx;
  return `<fieldset><legend>Train ${amount} skill${amount===1?'':'s'}</legend>${skillPicks(pack.skills,current().levels[i].trainedSkills,String(i),classSkills(ctx,ix))}</fieldset>`;
}
function abilityPool(state, used=false) {
  const assigned=new Set(Object.values(state.assign).filter(i=>i!==null));
  return `<div class="ability-pool">${state.pool.map((n,i)=>`<span class="cr-pool${used && assigned.has(i)?' used':''}">${n}</span>`).join(' ')}</div>`;
}
function generateAbilities() {
  const c=current(),record=abilityRecord(c,pack), state=generationState(c,pack),planned=campaignRuleEnabled(c,'plannedGeneration'),points=activeBudget(c,pack);
  if(state.fixed)return '';
  const methods=[['standard','Standard array'],['point-buy','Point buy'],['rolled','Roll 4d6 drop lowest'],['manual','Enter manually']];
  const controls=`<div class="actions">${methods.map(([method,label])=>`<button type="button" class="cr-method${method===record.abilityMethod?' active':''}" data-crmethod="${method}" ${planned&&method!=='point-buy'?'disabled':''} aria-pressed="${method===record.abilityMethod}">${label}</button>`).join('')}</div>`;
  if(record.abilityMethod==='standard')return controls;
  if(record.abilityMethod==='rolled')return controls+'<button type="button" data-action="roll-abilities">Roll</button>';
  const budget=record.abilityMethod==='point-buy'?`<div class="actions">${planned?'':field('Budget','pointBudget',record.pointBudget,'number','min="0" max="100"')}<span class="budget ${derived.pointCost>points?'error':''}">${Number.isFinite(derived.pointCost)?derived.pointCost:'Invalid'} / ${points} points</span></div>`:'';
  return controls+budget+`<table class="cr-generated"><tbody>${state.pool.map((n,i)=>`<tr><td>${i+1}</td><td>${record.abilityMethod==='point-buy'?`<select class="cr-points" aria-label="Score ${i+1}" data-generation-pool="${i}">${Object.entries(pack.rules.pointBuyCosts).map(([value,cost])=>option(value,`${value} (${cost} pt)`,n)).join('')}</select>`:`<input type="number" class="tiny cr-manual" aria-label="Score ${i+1}" data-generation-manual="${i}" min="3" max="30" required value="${n}">`}</td></tr>`).join('')}</tbody></table>`;
}
function baseAbilityControl(c,species,a) {
  return species.noConstitution&&a==='con'?'<span data-absent-ability="con">-</span>':species.fixedAbilities?`<span data-fixed-ability="${a}">${species.fixedAbilities[a]}</span>`:`<input type="number" min="3" max="30" aria-label="Base ${a.toUpperCase()}" data-ability="${a}" value="${abilityRecord(c,pack).abilities[a]}">`;
}
function abilityCards() {
  const c=current(), state=generationState(c,pack),species=resolveSpecies(c,pack);
  const rows=ABILITIES.map(a=>{
    if(species.noConstitution&&a==='con')return '<tr><td>CON</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>';
    const taken=new Set(Object.entries(state.assign).filter(([key,i])=>key!==a && i!==null).map(([,i])=>i));
    const control=state.fixed?baseAbilityControl(c,species,a):`<select class="cr-assign" aria-label="Base ${a.toUpperCase()}" data-generation-assign="${a}">${option('','-',state.assign[a]??'')}${state.pool.map((n,i)=>option(i,n,state.assign[a],taken.has(i))).join('')}</select>`;
    return `<tr><td>${a.toUpperCase()}</td><td>${control}</td><td>${signed(species.abilityAdjustments[a]||0)}</td><td id="cr-final-${a}">${derived.scores[a]}</td><td id="cr-mod-${a}">${signed(derived.mods[a])}</td></tr>`;
  }).join('');
  return (state.fixed?speciesChoiceControls(species,speciesChoiceDetails(c,pack,derived.ctx,derived.rows[0]?.ctx||derived.ctx).filter(g=>g.kind==='ability'),{legend:false}):abilityPool(state,true))+`<table class="cr-scores"><thead><tr><th>Ability</th><th>Base</th><th>Species</th><th>Score</th><th>Mod</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function calculations(id, entries) {
  return `<details id="${id}" class="calculation-details"><summary>Calculations</summary><dl>${entries.map(([name,value])=>`<dt>${escape(name)}</dt><dd>${escape(value)}</dd>`).join('')}</dl></details>`;
}
function skillTable() {
  const species=resolveSpecies(current(),pack),technophobic=species.technophobic;
  const ability=s=>s.checkSources.length>1?(s.abilityDetails.options.length>1||s.abilityDetails.override!=='auto'?skillAbilityControl(s)+' ':'')+`<select data-skill-source="${s.id}" aria-label="${escape(s.name)} check modifier" ${s.checkSources.some(r=>r.when==='perceptionApplications')?'title="Use the Force: Avoid Surprise, Notice Targets, Sense Deception, Sense Influence"':''}>${s.checkSources.map(r=>option(r.id,`${r.id===s.id?r.ability.toUpperCase():r.name}${r.when==='computerNetwork'?' (network)':r.when==='perceptionApplications'?' (specific uses)':''} ${signed(r.total)}`,s.checkSource)).join('')}</select>`:skillAbilityControl(s);
  return `<div class="table-scroll"><table><thead><tr><th>Skill</th><th>Ability</th><th>Trained</th>${technophobic?'<th>Mechanical tools</th>':''}<th>Check</th></tr></thead><tbody>${derived.skills.map(s=>`<tr><td>${ruleReference(ix.skills.get(s.id))}</td><td>${ability(s)}</td><td>${s.trained ? '✓' : '-'}</td>${technophobic?`<td><input type="checkbox" data-mechanical-skill="${s.id}" ${(current().mechanicalSkills||[]).includes(s.id)?'checked':''} aria-label="${escape(s.name)} uses mechanical tools"></td>`:''}<td><button class="roll" data-roll="${s.total}" data-skill-roll="${s.id}" data-roll-label="${escape(s.name)}" ${!s.available || derived.incapacitated ? 'disabled' : ''}>${s.available ? signed(s.total) : '-'}</button>${speciesChecks.controls(s,species,derived.incapacitated)}</td></tr>`).join('')}</tbody></table></div>${calculations('skill-calculations',derived.skills.map(s=>[s.name,s.breakdown]))}${teamSkillControls(derived.teamSkills)}<details id="skill-modifiers"><summary>Modifiers</summary><div class="form-grid">${pack.skills.map(s=>`<label>${escape(s.name)}<input type="number" min="-1000" max="1000" data-skill-modifier="${s.id}" value="${current().skillModifiers?.[s.id]||0}"></label>`).join('')}</div></details>`;
}
function attackTable(scope='') {
  const rangeNames=['Point-Blank','Short','Medium','Long'];
  const opportunity=opportunityView(current(),pack),running=derived.ctx.feats.some(f=>f.id===pack.rules.combatMovement.running.featId)?runningAttackView(current(),pack):null;
  const power=derived.powerAttack;
  const controls=power.owned||power.selected||derived.fullAttack.penalty||derived.defensiveCombat.stance!=='none'||derived.defensiveCombat.selected||current().chargeReflexPenalty||current().flurry||current().mightySwing||current().inventory.some(e=>e.braced)?`<div class="actions">${power.owned||power.selected?`<label title="Until the start of your next turn">Power Attack<input type="number" min="0" max="${power.maximum}" data-power-attack value="${power.selected}" ${derived.incapacitated?'disabled':''}></label>${ruleReference(ix.feats.get('feat:power-attack'),'ⓘ',null,scope+'power-attack')}`:''}<button data-next-turn>Next turn</button></div>`:'';
  return controls+opportunityControls(current(),derived,pack,scope)+followUpControls(current(),derived,pack,scope)+attackTargetControls(current(),(id,key)=>{const r=pack.rulePages.find(r=>r.id===id);return `<a id="${key}" href="${escape(pack.sources.find(s=>s.id===r.sourceId).url)}" data-rule-page="${id}" aria-label="${escape(r.name)} mechanics" title="${escape(r.name)}">ⓘ</a>`;},scope,derived.blind)+`<div class="table-scroll"><table><thead><tr><th>Weapon</th><th>Attack</th><th>Damage</th></tr></thead><tbody>${derived.attacks.map((a,i)=>{
    const index=current().inventory.findIndex(e=>e.uid===(a.inventoryUid||a.uid)),e=current().inventory[index];
    const range=a.range.limits?`<details id="${scope}attack-range-${i}"><summary>Range${a.range.band===null?'':a.range.available?', '+rangeNames[a.range.band]:', Out of range'}</summary><label>Squares<input type="number" min="0" max="100000" data-inventory="distance" data-index="${index}" value="${e.distance??''}" aria-label="${escape(a.name)} distance in squares" placeholder="-"></label><dl>${a.range.limits.map((limit,j)=>j&&limit===a.range.limits[j-1]?'':`<dt>${rangeNames[j]}</dt><dd>${j?a.range.limits[j-1]+1:0}–${limit}</dd>`).join('')}</dl>${canAim(a,e)?`<label class="checkbox"><input type="checkbox" data-inventory="aimed" data-index="${index}" ${a.aimed?'checked':''} ${!a.canAimTarget?'disabled':''}>Aim</label>${ruleReference(pack.rulePages.find(r=>r.id==='rule:aim'),'ⓘ',null,scope+'aim-'+i)}`:''}</details>`:'';
    const modifiers=a.id===UNARMED_ID?`<details id="${scope}unarmed-modifiers${a.natural?'-'+a.naturalWeaponId:a.droidAppendage?'-'+a.uid:''}"><summary>Modifiers</summary>${['attackMod','damageMod'].map(k=>`<label>${k==='attackMod'?'Attack':'Damage'}<input type="number" min="-100" max="100" ${a.natural?`data-natural-id="${a.naturalWeaponId}" data-natural-modifier="${k}"`:`data-${a.droidAppendage&&!a.primaryAppendage?`inventory="${k}" data-index="${index}"`:`unarmed-modifier="${k}"`}`} value="${(a.natural?current().naturalModifiers?.[a.naturalWeaponId]:a.droidAppendage&&!a.primaryAppendage?e:current().unarmedModifiers)?.[k]||0}"></label>`).join('')}</details>`:'';
    return `<tr><td>${ruleReference(ix.equipment.get(a.id)||a,a.name,null,`${scope}attack-${i}`)}<small>${escape(a.damageType)}${a.proficient?'':' | Not proficient'}${a.areaType?' | Area':a.criticalMultiplier>2?' | ×'+a.criticalMultiplier+' critical':''}</small>${range}${attackOptions(a,i,index,scope,opportunity,running)}${modifiers}</td><td><button data-combat="attack" data-attack-id="${a.uid}" aria-label="Attack with ${escape(a.name)}" title="${escape(a.issue||'Attack and damage')}" ${derived.incapacitated||!a.available||a.damage===null?'disabled':''}>▶</button> <button class="roll" data-roll="${a.attack}" data-roll-label="${escape(a.name)} attack" ${derived.incapacitated||!a.available?'disabled':''}>${signed(a.attack)}</button></td><td>${a.damage?`<button class="roll" data-damage="${escape(a.damageDisplay)}" data-roll-label="${escape(a.name)} damage" ${derived.incapacitated||!a.available?'disabled':''}>${escape(a.damageDisplay)}</button>`:escape(a.damageDisplay)}</td></tr>`;
  }).join('')}${derived.manualAttacks.map(a=>`<tr><td>${ruleReference(ix.equipment.get(a.id)||a,a.name,null,scope+'manual-'+a.uid)}</td><td colspan="2"></td></tr>`).join('')}</tbody></table></div>${calculations(scope+'attack-calculations',derived.attacks.map(a=>[a.name,a.breakdown]))}`;
}
function attackOptions(a,i,index,scope,opportunity,runningView){
 const ability=attackAbilityControl(a);
 const targetAvailable=a.mode==='melee'&&derived.powerAttack.owned;
 const running=runningAttackControls(current(),derived,pack,a,scope,runningView);
 const charge=a.mode==='melee'?chargeControls(current(),derived,pack,a.uid,scope):'';
 if(a.mode!=='melee'&&!a.technique.choices.length&&!a.mightySwingAvailable&&!a.autofireOnly&&!targetAvailable&&!a.opportunityWeapon&&!running&&!ability)return '';
 const attrs=a.natural?`data-natural-id="${a.naturalWeaponId}" data-natural-technique`:a.id===UNARMED_ID&&(!a.droidAppendage||a.primaryAppendage)?'data-unarmed-technique':`data-inventory="attackTechnique" data-index="${index}"`;
 const choices=a.technique.choices.length?`<label>Technique <select ${attrs} aria-label="${escape(a.name)} technique">${option('normal','Normal',a.technique.selected)}${a.technique.choices.map(t=>option(t.id,t.name,a.technique.selected,!t.available)).join('')}</select></label>`:'';
 const selected=a.technique.choices.find(t=>t.id===a.technique.selected);
 const target=targetAvailable?`<label>Target<select ${a.natural?`data-natural-id="${a.naturalWeaponId}" data-natural-target`:a.id===UNARMED_ID&&(!a.droidAppendage||a.primaryAppendage)?'data-unarmed-target':`data-inventory="targetKind" data-index="${index}"`} aria-label="${escape(a.name)} target">${[['creature','Creature'],['object','Object'],['vehicle','Vehicle']].map(([id,name])=>option(id,name,a.powerAttack.target)).join('')}</select></label>`:'';
 return `<details id="${scope}attack-options-${i}"><summary>Options</summary>${ability}${opportunityButton(current(),pack,a,opportunity)}${running}${charge}${target}${choices}${selected?ruleReference(pack.feats.find(f=>f.id===selected.featId),'ⓘ',null,scope+'technique-'+i):''}${a.autofireOnly?`<label class="checkbox" title="${escape(a.bracing.reason||'2 Swift Actions immediately before firing')}"><input type="checkbox" data-inventory="braced" data-index="${index}" ${a.braced?'checked':''} ${derived.incapacitated||!a.bracing.available?'disabled':''}>Brace</label>${ruleReference(pack.rulePages.find(r=>r.id==='rule:bracing'),'ⓘ',null,scope+'brace-'+i)}`:''}${a.mightySwingAvailable?`<label class="checkbox" title="${pack.rules.mightySwing.swiftActions} Swift Actions; same round"><input type="checkbox" data-mighty-swing ${current().mightySwing?'checked':''} ${derived.incapacitated?'disabled':''}>Mighty Swing</label>${ruleReference(ix.feats.get('feat:mighty-swing'),'ⓘ',null,scope+'mighty-swing-'+i)}`:''}</details>`;
}
function ammunitionControls(r,e,i,scope){
 const p=ammunitionProfile(e,pack);if(!p)return '';
 const action={'move-action':'Move Action','free-action':'Free Action','full-round-action':'Full-Round Action'}[p.reloadAction];
 return `<details id="${scope}ammunition-${i}"><summary>Ammunition${e.shotsRemaining===undefined?'':', '+e.shotsRemaining+'/'+p.capacity}</summary><div class="actions">${r.ammunitionProfiles.length>1?`<label>Supply<select data-inventory="ammoProfile" data-index="${i}">${r.ammunitionProfiles.map(p=>option(p.id,p.name,e.ammoProfile||r.ammunitionProfiles[0].id)).join('')}</select></label>`:''}<label>Shots <input type="number" min="0" max="${p.capacity}" data-inventory="shotsRemaining" data-index="${i}" value="${e.shotsRemaining??''}" placeholder="-" aria-label="${escape(r.name)} loaded shots"> / ${p.capacity}</label>${p.reloadAction==='free-action'?`<label class="checkbox" title="Supplied arrows; Free Actions"><input type="checkbox" data-inventory="freeReloads" data-index="${i}" ${e.freeReloads?'checked':''} ${derived.flatFooted?'disabled':''}>Free reloads</label>${ruleReference(pack.rulePages.find(r=>r.id==='rule:free-actions'),'ⓘ',null,scope+'free-reload-'+i)}`:''}<button data-combat="reload" data-attack-id="${e.uid}" title="${action}" ${derived.incapacitated||e.shotsRemaining===p.capacity||p.reloadAction==='free-action'&&derived.flatFooted?'disabled':''}>Reload</button>${ruleReference(p.reloadAction==='move-action'?pack.rulePages.find(r=>r.id==='rule:manipulate-an-item'):ix.equipment.get(e.id),'ⓘ',null,scope+'reload-'+i)}</div></details>`;
}
function weaponOptions(r,e,i,scope=''){
 const select=(key,label,records,value,empty=false)=>`<label>${label}<select data-inventory="${key}" data-index="${i}">${empty?option('',typeof empty==='string'?empty:'Choose…',value):''}${records.map(o=>option(o.id,o.name,value,o.disabled)).join('')}</select></label>`;
 return (r.group==='lightsabers'?`<label class="checkbox"><input type="checkbox" data-inventory="activated" data-index="${i}" ${(e.activated??e.equipped)?'checked':''}>Active</label>`:'')+
  (ix.equipment.get(e.id).thrown||ix.equipment.get(e.id).modes?.some(m=>m.thrown)?select('attackStyle','Attack',[{id:'melee',name:'Melee'},{id:'thrown',name:'Thrown',disabled:!r.thrown}],e.attackStyle||'melee'):'')+
  (r.stunDamage?select('damageSetting','Setting',[{id:'normal',name:'Normal'},{id:'stun',name:'Stun'}],e.damageSetting||'normal'):'')+
  (r.modes?select('weaponMode','Form',r.modes,e.weaponMode||r.modes[0].id):'')+
  (r.launchers?select('launcher','Launch',r.launchers,e.launcher||r.launchers[0].id):'')+
  (r.ammunition==='grenade'?select('ammunitionId','Grenade',pack.equipment.filter(w=>['equipment:frag-grenade','equipment:ion-grenade','equipment:stun-grenade'].includes(w.id)),e.ammunitionId||'',true):'')+
  (r.autofire&&!r.autofireOnly?select('fireMode','Fire',[{id:'single',name:'Single-shot'},{id:'autofire',name:'Autofire'}],e.fireMode||'single'):'')+
  (r.autofire&&r.stunDamage?ruleReference(pack.rulePages.find(r=>r.id==='rule:weapon-settings'),'ⓘ',null,scope+'weapon-settings-'+i):'')+
  (r.retractableStock?select('stockPosition','Stock',[{id:'extended',name:'Extended'},{id:'folded',name:'Folded'},{id:'none',name:'None'}],e.stockPosition||'extended')+ruleReference(pack.rulePages.find(r=>r.id==='rule:retractable-stock'),'ⓘ',null,scope+'stock-'+i):'')+
  (r.group==='rifles'?`<label class="checkbox"><input type="checkbox" data-inventory="oneHanded" data-index="${i}" ${e.oneHanded?'checked':''}>One-handed</label>`:'')+
  (['pistols','rifles'].includes(ix.equipment.get(e.id).group)&&current().inventory.some(item=>ix.equipment.get(item.id).scope)?select('scopeUid','Scope',current().inventory.flatMap(item=>{
   const scope=ix.equipment.get(item.id);if(!scope.scope)return [];
   const used=current().inventory.filter(other=>other!==e&&other.scopeUid===item.uid).length;
   return [{id:item.uid,name:scope.name,disabled:item.carried===false||used>=item.quantity}];
  }),e.scopeUid||'','None'):'')+ammunitionControls(r,e,i,scope);
}
function conditionTrack() {
  const step=current().condition, species=ix.species.get(current().species);
  const states = [
    'Normal State (No Penalties)',
    '-1 Penalty to Defenses, Attacks, Ability Checks, and Skill Checks',
    '-2 Penalty to Defenses, Attacks, Ability Checks, and Skill Checks',
    '-5 Penalty to Defenses, Attacks, Ability Checks, and Skill Checks',
    'Move at Half Speed; -10 Penalty to Defenses, Attacks, Ability Checks, and Skill Checks',
    `Helpless (${species.isDroid ? 'Disabled' : 'Unconscious'})`,
  ];
  return `<input id="condition-level" type="hidden" data-field="condition" value="${step}"><table id="condition-effect"><tbody>${states.map((state,level)=>`<tr data-condition-step="${level}" class="${(level>0 && level<=step) || level===step?'condition-on':''} ${level===step?'condition-current':''}"><td><button type="button" data-condition-step="${level}" aria-pressed="${level===step}">${state}</button></td></tr>`).join('')}</tbody></table>`;
}
function storyEditor(scope='creator') {
  const c=current(), story=c.story||emptyStory('none');
  const mode=`<div class="actions" role="group" aria-label="Destiny or Background">${[['destiny','Destiny'],['background','Background'],['none','Neither']].map(([kind,label])=>`<label><input type="radio" name="${scope}-story-kind" data-story="kind" value="${kind}" ${story.kind===kind?'checked':''}>${label}</label>`).join('')}</div>`;
  if(story.kind==='none')return mode;
  const records=pack[story.kind==='destiny'?'destinies':'backgrounds'], record=records.find(r=>r.id===story.id);
  const groups=story.kind==='destiny'?`<select data-story="id" aria-label="Destiny">${option('','Choose Destiny',story.id||'')}${choices(records,story.id)}</select>`:`<select data-story="id" aria-label="Background">${option('','Choose Background',story.id||'')}${[['event','Events'],['occupation','Occupations'],['planet','Planets of Origin']].map(([category,label])=>`<optgroup label="${label}">${records.filter(r=>r.category===category).map(r=>option(r.id,r.name,story.id,r.excludedSpecies.includes(c.species))).join('')}</optgroup>`).join('')}</select>`;
  let secondary='';
  if(story.kind==='destiny')secondary=`${scope==='creator'?field('Destiny Points','story.points',story.points,'number',`min="0" max="${c.levels.length}"`):''}<label>Details<textarea data-story="details" rows="2" maxlength="100000">${escape(story.details)}</textarea></label>`;
  else if(record) {
    const selected=story.skills.filter(Boolean), skills=record.relevantSkills.map(id=>ix.skills.get(id)), knowledge=skills.filter(r=>r.id.startsWith('skill:knowledge-'));
    secondary=`<fieldset><legend>Class Skills</legend>${Array.from({length:record.skillChoices},(_,i)=>{
      const id=story.skills[i], isKnowledge=id?.startsWith('skill:knowledge-')||backgroundKnowledgeDrafts.has(c.id+':'+i);
      return `<div class="actions"><select data-background-skill="${i}" aria-label="Background class skill ${i+1}">${option('','Choose…',id||'')}${skills.filter(r=>!r.id.startsWith('skill:knowledge-')).map(r=>option(r.id,r.name,id,selected.includes(r.id)&&r.id!==id)).join('')}${knowledge.length?option('knowledge','Knowledge',isKnowledge?'knowledge':id):''}</select>${isKnowledge?`<select data-background-knowledge="${i}" aria-label="Background Knowledge field ${i+1}">${option('','Choose Knowledge Field',id||'')}${knowledge.map(r=>option(r.id,r.name.replace(/^Knowledge \((.*)\)$/, '$1'),id,selected.includes(r.id)&&r.id!==id)).join('')}</select>`:''}</div>`;
    }).join('')}</fieldset>`;
    if(record.bonusLanguages.length>1)secondary+=`<label>Language<select data-story="language">${option('','Choose…',story.language)}${record.bonusLanguages.map(language=>option(language,language,story.language)).join('')}</select></label>`;
  }
  return mode+`<div class="story-choice">${groups}${record?ruleReference(record,'ⓘ',null,scope+'-story'):''}${secondary}</div>`;
}
function finishing() {
  const c=current(), traits=c.heroicTraits||{};
  const traitField=([key,label])=>{
    if(TRAIT_TEXT.includes(key))return `<label>${label}<textarea data-trait="${key}" rows="2" maxlength="100000">${escape(traits[key])}</textarea></label>`;
    if(['era','heroType'].includes(key))return `<label>${label}<select data-trait="${key}">${option('','-',traits[key]||'')}${pack.heroicTraits[key==='era'?'eras':'heroTypes'].map(value=>option(value,value,traits[key])).join('')}</select></label>`;
    return `<label>${label}<input data-trait="${key}" value="${escape(traits[key])}" maxlength="200"></label>`;
  };
  return `<div class="form-grid">${field('Name','name',c.name,'text','maxlength="200"')}${field('Player','player',c.player,'text','maxlength="200"')}${TRAIT_FIELDS.filter(([key])=>!TRAIT_TEXT.includes(key)).map(traitField).join('')}</div>${storyEditor()}${traditionEditor()}<div class="trait-texts">${TRAIT_FIELDS.filter(([key])=>TRAIT_TEXT.includes(key)).map(traitField).join('')}</div>`;
}
function traditionEditor(scope='creation'){
 const c=current();
 return `<details id="${scope}-traditions"><summary>${scope==='creation'?'Force Traditions':'Manage'}</summary>${(pack.rules.traditionTalentAccess||[]).map(r=>{
  const selected=c.forceTraditions?.find(s=>s.id===r.id);
  return `<div class="actions"><label><input type="checkbox" data-force-tradition="${r.id}" ${selected?'checked':''}>${escape(r.name)}</label><button type="button" data-rule-page="${r.ruleId}" aria-label="Read ${escape(r.name)} membership">ⓘ</button>${selected?`<label>Level<input type="number" data-tradition-level="${r.id}" min="1" max="20" value="${selected.level}"></label>${r.prerequisite.requirements.some(p=>p.kind==='darkSideScore')?`<label>Joining DSS<input type="number" data-tradition-dss="${r.id}" min="0" max="1000" value="${selected.darkSideScore}"></label>`:''}`:''}</div>`;
 }).join('')}</details>`;
}
function carryingDisplay(){
 const load=derived.load;
 return `${load.heavy?`<span class="badge">${load.tooHeavy?'Too heavy':load.overloaded?'Overloaded':'Heavy Load'}</span>`:''}<details id="carrying-limits"><summary>Load</summary><dl><dt>Heavy Load</dt><dd>≥ ${Number(load.heavyAt.toFixed(2))} kg</dd><dt>Lift</dt><dd>${Number(load.lift.toFixed(2))} kg</dd><dt>Strain</dt><dd>${Number(load.strain.toFixed(2))} kg</dd></dl>${ruleReference(pack.rulePages.find(r=>r.name==='Encumbrance'),'Mechanics',null,'load')}</details>`;
}
function traitsSummary() {
 const c=current(),values=TRAIT_FIELDS.filter(([key])=>c.heroicTraits?.[key]);
 if(!values.length)return '';
 return `<details id="character-traits"><summary>Heroic Traits</summary><dl class="traits-display">${values.map(([key,label])=>`<dt>${label}</dt><dd>${escape(c.heroicTraits[key])}</dd>`).join('')}</dl></details>`;
}
function creation() {
 const c=current(),species=resolveSpecies(c,pack),cls=ix.classes.get(c.levels[0].classId),row=derived.rows[0];
 switch(CREATOR_TABS[creatorStep].id){
  case 'levels':return levelPlanTable(c,derived,pack,{choice:selectChoice,reference:(r,label,s,key)=>ruleReference(r,label||r.name+(s?.choice?' ('+choiceName(s.choice,pack)+')':''),s,key)});
  case 'abilities':return generateAbilities()+abilityCards();
  case 'species':return customizationControls(c,resolveSpecies(c,pack),pack)+speciesBrowser.render(c.species,speciesChoiceDetails(c,pack,derived.ctx,derived.rows[0]?.ctx||derived.ctx),speciesQualityControls(c,pack));
  case 'skills':{const allowed=row.valid===false?new Set():row.initialClassSkills||classSkills(row.ctx,ix),budget=row.valid===false?0:Math.max(1,cls.trainedSkills+Math.floor((row.scores.int-10)/2))+species.bonusSkills;return skillPicks(pack.skills,c.trainedSkills,'initial',allowed,`${c.trainedSkills.length} / ${budget}`);}
  case 'equipment':{const gear=panelParts(equipment('cr')).filter(p=>p.querySelector('.purchase-form,.inventory-list,.table-scroll'));gear[0].querySelector('.panel-heading')?.remove();return `<div class="actions">${field('Credits','credits',c.credits,'number','min="0" max="1000000000" step="0.01"')}<button type="button" data-open-tree="vehicles:0:0">Vehicles</button><button data-action="starting-credits" ${canRollStartingCredits(c)?'':'disabled'}>${campaignRuleEnabled(c,'averageCredits')?'Average credits':'Roll credits'}</button>${startingEquipmentGrants(c,pack).map(g=>`<button data-starting-equipment="${g.id}" ${g.claimed?'disabled':''}>${g.id==='class:jedi'?'Add lightsaber':'Add starting equipment'}</button>`).join('')}</div>${derived.droidSystems.enabled?droidSystemsUI.render(true):''}${gear.map(p=>p.outerHTML).join('')}`;}
  case 'character':return finishing();
 }
}
const classPickDrafts=new Map();let classRequirementTarget=null;
function classPickDraft(level,id){
 const key=current().id+':'+level+':'+id;
 if(!classPickDrafts.has(key)){const l=current().levels[level];classPickDrafts.set(key,{entryDeclarations:{...(l.classId===id&&!l.pendingClass?l.entryDeclarations:{})},acquisitionDSS:l.classId===id&&l.acquisitionDSS!==undefined?l.acquisitionDSS:current().darkSideScore});}
 const draft=classPickDrafts.get(key),l=current().levels[level];draft.acquisitionDSS=l.classId===id&&l.acquisitionDSS!==undefined?l.acquisitionDSS:current().darkSideScore;return draft;
}
function selectPlanClass(level,id){
 const cls=ix.classes.get(id),draft=classPickDraft(level,id),ctx=progression(current(),pack,level).ctx,entry=classEntry(cls,ctx,ix,draft);
 if(!entry.available){
  classRequirementTarget={level,id};$('rule-detail-title').textContent=cls.name;
  $('rule-detail-body').innerHTML=`<div class="actions">${cls.entrySpecials.map(s=>`<label class="checkbox"><input type="checkbox" data-plan-declaration="${s.id}" ${draft.entryDeclarations[s.id]?'checked':''}>${escape(s.label)}</label>`).join('')}<button type="button" data-plan-select-class disabled title="${escape(entry.reason)}">Select</button></div>${renderArticle(cls.article)}`;
  if(!$('rule-detail-modal').open)$('rule-detail-modal').showModal();return;
 }
 choosePlannedClass(current(),pack,level,id,draft);changed();
 if($('rule-detail-modal').open&&classRequirementTarget){classRequirementTarget=null;$('rule-detail-modal').close();}
 if($('feature-tree-modal').open)$('feature-tree-modal').close();
}

function languageCount() {
  const linguists = derived.ctx.feats.filter(s=>s.id==='feat:linguist').length;
  return Math.max(0,derived.mods.int)+linguists*Math.max(1,1+derived.mods.int);
}
function featureRows(entries,scope,prefixes=false){
 return entries.map(({s,r,prefix,label,inactive},i)=>`<article class="${inactive?'feature-inactive':''}"><div>${inactive?'<span class="badge">Inactive</span> ':''}${ruleReference(r,`${prefixes&&prefix?prefix+' ':''}${label}`,s,`${scope}-${i}`)}${s.automatic?'':`<span class="badge">Level ${s.level}</span>`}</div></article>`).join('');
}
function featureList() {
 const species=resolveSpecies(current(),pack);
 return panel('Features',`<div class="feature-list"><article>${ruleReference(species,species.name,null,'features-species')}</article>${customizationFeatures(current(),species)}${featureRows(featureEntries(current(),derived,pack),'feature',true)}</div>`);
}
function featureModule(id,entries){
 return `<div class="feature-list">${featureRows(entries.filter(e=>e.module===id),id)}</div><a href="#advancement" class="screen-only">Edit</a>`;
}
function shopDraft(scope){
 const key=current().id+':'+scope,bodySize=resolveSpecies(current(),pack).size;
 if(!equipmentDrafts.has(key))equipmentDrafts.set(key,{id:pack.equipment.find(r=>r.kind==='armor').id,options:[],armorSize:bodySize,bodySize,systemSize:bodySize,systemOrdinal:1,systemUnits:1,license:true,market:'normal',quantity:1});
 const draft=equipmentDrafts.get(key);if(draft.bodySize!==bodySize){draft.bodySize=bodySize;draft.systemSize=bodySize;draft.armorSize=ix.equipment.get(draft.id).wearerSize||bodySize;}
 return draft;
}
const shopQuote=(draft,quantity,c)=>purchaseQuote(draft,quantity,pack,c,{...draft,benefits:derived.purchaseBenefits});
function shopForm(scope){
 const c=current(),prefix=scope?'cr-':'',draft=shopDraft(scope),r=ix.equipment.get(draft.id);
 const quote=shopQuote(draft,draft.quantity,c),family=equipmentFamilies(pack,r.kind).find(f=>f.records.some(r=>r.id===draft.id));
 const equipmentRule=pack.rulePages.find(r=>r.name==='Equipment');
 return `<form id="${prefix}purchase" data-equipment-scope="${scope||'sheet'}" class="purchase-form"><label>Item<select id="${prefix}purchase-item" data-catalog-item>${['armor','gear','weapon'].map(kind=>`<optgroup label="${title(kind)}">${equipmentFamilies(pack,kind).map(f=>option(f.id,f.name,family.id)).join('')}</optgroup>`).join('')}</select></label>${family.records.length>1?`<label>Variant<select data-catalog-variant>${family.records.map(r=>option(r.id,r.variant,draft.id)).join('')}</select></label>`:''}${r.retractableStock?`<label class="checkbox"><input type="checkbox" data-shop-field="stockPosition" ${draft.stockPosition!=='none'?'checked':''}>Retractable stock</label>`:''}${r.droidSystem?`${droidSystemUsesSize(r)?`<label>Size<select data-shop-field="systemSize">${Object.keys(pack.rules.droidSystems.costFactors).map(size=>option(size,title(size),draft.systemSize)).join('')}</select></label>`:''}${r.droidSystem.category==='locomotion'?`<label>${draft.quantity>1?'First system':'Locomotion system'}<select data-shop-field="systemOrdinal">${[1,2,3,4,5,6].map(n=>option(n,n===6?'6+':String(n),draft.systemOrdinal)).join('')}</select></label>`:''}${r.droidSystem.costModel==='capacity'?`<label>Capacity (kg)<input data-shop-field="systemUnits" type="number" min="1" max="${r.droidSystem.capacityBySize[draft.systemSize]||5000}" value="${draft.systemUnits}" required></label>`:''}`:r.kind==='armor'&&!r.energyShield?`<label>Size<select data-shop-field="armorSize">${(r.wearerSize?[r.wearerSize]:pack.rules.weaponSizeOrder).map(size=>option(size,title(size),r.wearerSize||draft.armorSize)).join('')}</select></label>`:''}${(r.upgrades||[]).map(u=>`<label class="checkbox"><input type="checkbox" data-shop-upgrade="${u.id}" ${draft.options.includes(u.id)?'checked':''}>${escape(u.name)}</label>`).join('')}<label>Quantity<input id="${prefix}purchase-quantity" data-catalog-quantity type="number" min="1" max="999" value="${draft.quantity}" required></label>${quote.rating||r.availability?.includes('rare')?`<label>Market<select data-shop-field="market">${option('normal','Normal',draft.market)}${quote.rating?option('black-market','Black market',draft.market):''}${r.availability?.includes('rare')?option('offworld','Offworld (×2)',draft.market):''}</select></label>`:''}${quote.rating&&!quote.connections&&draft.market!=='black-market'&&quote.item.cost!==null?`<label class="checkbox"><input type="checkbox" data-shop-field="license" ${draft.license?'checked':''}>License fee (+${(r.droidSystem?.category==='locomotion'&&draft.quantity>1?quote.fee*draft.quantity:quote.item.cost*quote.rating.percent/100).toLocaleString()} cr${r.droidSystem?.category==='locomotion'&&draft.quantity>1?'':' each'})</label>`:''}${scope&&pack.species.find(s=>s.id===c.species).droidStartingPackage&&startingSystemEligible(r)?`<label class="checkbox"><input type="checkbox" data-shop-field="startingAllowance" ${draft.startingAllowance?'checked':''}>Starting allowance (${Math.max(0,pack.species.find(s=>s.id===c.species).droidStartingPackage.credits-droidStartingSpent(c)).toLocaleString()} cr)</label>`:''}<span data-shop-quote>${quote.total===null?(quote.item.purchasePending?'Manual price':'No market price'):quote.total.toLocaleString()+' cr'}, ${weightText(quote.item.weight===null?null:quote.item.weight*draft.quantity)}${quote.connections?', Connections':''}</span><button class="primary" type="submit" ${quote.total===null?'disabled':''}>Buy</button><button type="button" data-action="add-gear">Add owned</button></form>${quote.rating&&equipmentRule?ruleReference(equipmentRule,'Licensing',null,prefix+'licensing'):''}`;
}
function refreshShop(form){
 const scope=form.dataset.equipmentScope==='cr'?'cr':'',prefix=scope?'cr-':'';
 const container=document.createElement('div');container.innerHTML=shopForm(scope);
 const existing=form.parentElement.querySelector(`details[id="${prefix}licensing-rule:equipment"]`);existing?.remove();
 const replacement=container.querySelector('form');form.replaceWith(replacement);numericFields(replacement);
 const licenseRef=container.querySelector('details');if(licenseRef)replacement.after(licenseRef);
 $(prefix+'equipment-reference').innerHTML=ruleReference(ix.equipment.get(shopDraft(scope).id),'ⓘ',null,prefix+'catalog');
}
function equipment(scope='') {
 const c=current(),prefix=scope?'cr-':'',species=resolveSpecies(c,pack);
 return `${panel('Equipment catalog',`${shopForm(scope)}<div id="${prefix}equipment-reference">${ruleReference(ix.equipment.get(shopDraft(scope).id),'ⓘ',null,prefix+'catalog')}</div><div class="actions">${scope?'':field('Credits','credits',c.credits,'number','min="0" max="1000000000" step="0.01"')}<div class="weight"><strong>${totalWeight()}</strong></div></div>`)}
 ${panel('Inventory',c.inventory.length?`<div class="inventory-list">${c.inventory.map((e,i)=>{
  const r=resolveEquipment(e,pack,c),rating=(r.availability||[]).some(id=>pack.rules.licensing.ratings[id]);
  return `<article><div class="inventory-title"><div>${ruleReference(ix.equipment.get(e.id),r.name,null,`${prefix}inventory-${i}`)} <span class="badge">×${e.quantity}</span> <small>${weightText(r.weight===null?null:r.weight*e.quantity)}${r.cost===null?'':` | ${r.cost.toLocaleString()} cr each`}</small></div></div><div class="inventory-controls"><label class="checkbox"><input type="checkbox" data-inventory="carried" data-index="${i}" ${e.carried!==false?'checked':''}>Carried</label>${r.kind!=='gear'?`<label class="checkbox"><input type="checkbox" data-inventory="equipped" data-index="${i}" ${e.equipped?'checked':''} ${r.wearerSize&&r.wearerSize!==species.size&&!e.equipped?'disabled title="Medium creatures only"':''}>Equipped</label>`:''}${r.kind==='weapon'&&!r.manualAttack?`${weaponOptions(r,e,i,prefix)}${r.mode==='melee'?`<label class="checkbox"><input type="checkbox" data-inventory="twoHanded" data-index="${i}" ${e.twoHanded?'checked':''} ${r.mode!=='melee'||pack.rules.weaponSizeOrder.indexOf(r.size)<pack.rules.weaponSizeOrder.indexOf(derived.size||species.size)?'disabled':''}>Two hands</label>`:''}<label>Attack misc<input type="number" min="-100" max="100" value="${e.attackMod}" data-inventory="attackMod" data-index="${i}"></label><label>Damage misc<input type="number" min="-100" max="100" value="${e.damageMod}" data-inventory="damageMod" data-index="${i}"></label>${species.technophobic?`<label class="checkbox"><input type="checkbox" data-inventory="mechanical" data-index="${i}" ${e.mechanical??r.mechanical?'checked':''}>Mechanical</label>`:''}`:''}${r.manualAttack&&r.group==='lightsabers'?weaponOptions(r,e,i,prefix):''}${rating?`<label>License<select data-inventory="licenseStatus" data-index="${i}">${[['none','None'],['pending','Application pending'],['approved','Approved'],['denied','Denied']].map(([id,name])=>option(id,name,e.licenseStatus||'none')).join('')}</select></label>`:''}${ix.equipment.get(e.id).weight===null||r.manualSize||e.options?.includes('miniaturized')?`<label>Weight (kg)<input type="number" min="0" max="1000000" step="0.01" data-inventory="weightOverride" data-index="${i}" value="${e.weightOverride??''}" aria-label="${escape(r.name)} weight"></label>`:''}<button data-remove-item="${i}">Remove</button></div>${r.energyShield?energyShieldControls(c,derived,pack,e,prefix):r.kind==='armor'?armorChecksUI(r,e,i,prefix):''}${r.kind==='armor'&&!r.energyShield?`<p class="rule-summary">Reflex +${r.armorBonus} | Fortitude +${r.fortitudeBonus} with proficiency | Max DEX ${r.maxDex===null?'-':'+'+r.maxDex}</p>`:''}</article>`;
 }).join('')}</div>`:'')}${panel('Attacks',attackTable(prefix))}`;
}
function armorChecksUI(r,e,i,prefix){
 if(!e.equipped)return '';
 const used=new Set((r.skillEffects||[]).map(effect=>effect.when).filter(key=>key!=='always'));
 if(r.strengthCheckBonus)used.add('lifting');if(r.intimidateCircumstance)used.add('intimidating');if(r.noncombatPenaltyDivisor)used.add('noncombat');if(r.magneticSolesPenalty)used.add('magneticSoles');
 const labels={hiding:'Hiding',darkness:'Darkness concealment',concealArmor:'Conceal armor',noncombat:'Noncombat',magneticSoles:'Magnetic soles',lifting:'Lift / drag / pull',intimidating:'Intimidate'};
 return used.size?`<details id="${prefix}armor-checks-${i}"><summary>Checks</summary>${[...used].map(key=>`<label class="checkbox"><input type="checkbox" data-armor-check="${key}" ${current().armorChecks?.[key]?'checked':''}>${labels[key]}</label>`).join('')}</details>`:'';
}
const advancementDrafts=new Map();
function nextClassDraft(){const c=current();if(!advancementDrafts.has(c.id))advancementDrafts.set(c.id,{classId:c.levels.at(-1).classId,entryDeclarations:{},acquisitionDSS:c.darkSideScore});return advancementDrafts.get(c.id);}
function advancement() {
  const c=current(),draft=nextClassDraft(),cls=ix.classes.get(draft.classId),entry=classEntry(cls,derived.ctx,ix,{...draft,acquisitionDSS:c.darkSideScore});
  return `${panel('',`<div class="actions"><label>Class<select id="next-class">${classOptions(pack,derived.ctx,ix,draft.classId)}</select></label><button class="primary" data-action="add-level" ${c.levels.length>=20||!entry.available?'disabled':''} title="${escape(entry.reason)}">Add level ${c.levels.length+1}</button><button data-action="undo-level" ${c.levels.length===1?'disabled':''}>Remove last level</button>${ruleReference(cls,'ⓘ',null,'next-class-rules')}</div>${classDeclarations(cls,draft,'next')}`)}
    ${c.levels.map((l,i)=>`<section class="panel"><div class="panel-heading"><h2>Level ${i+1}</h2><span class="badge">${escape(derived.rows[i].cls.name)} ${derived.rows[i].classLevel}</span></div>${i?`<label>Class<select data-class="${i}">${classOptions(pack,progression(c,pack,i).ctx,ix,l.classId,l)}</select></label>`:''}${levelEditor(i)}</section>`).join('')}`;
}
function rules() {
  return `${panel('Rules catalog',`<div id="rules-catalog-body">${rulesCatalog.render()}</div><p><a href="./docs/import-review.md">Rules review</a> | <a href="./docs/rules-data.md">Data format</a> | <a href="./data/core.json">Rules pack</a></p>`)}
    ${panel('Mechanics', ['species','classes','skills','feats','talents','equipment','destinies','backgrounds'].map(key=>`<details><summary>${escape(title(key))}</summary>${pack[key].map(r=>ruleReference(r,r.name,null,'rules')).join('')}</details>`).join(''))}
    ${panel('Data attribution',`<p>${escape(pack.license.attribution)}</p><p>${escape(pack.license.changes)}</p><a href="${escape(pack.license.url)}" target="_blank" rel="noopener">${escape(pack.license.name)} ↗</a>`)}
    ${panel('Source revisions',`<div class="table-scroll"><table><thead><tr><th>Source</th><th>Revision</th><th>Updated</th><th>History</th></tr></thead><tbody>${pack.sources.map(s=>`<tr><td><a href="${escape(s.url)}" target="_blank" rel="noopener">${escape(s.title)}${s.section?` / ${escape(s.section)}`:''}</a></td><td>${s.revision}</td><td>${escape(s.timestamp.slice(0,10))}</td><td><a href="${escape(s.history)}" target="_blank" rel="noopener">Contributors ↗</a></td></tr>`).join('')}</tbody></table></div>`)}`;
}
function moduleHTML(key,body) {
 const def=moduleDefinition(key);if(!def)throw new Error('Unknown module '+key);
 return `<section class="module ${def.classes}" data-module="${key}" data-relevant="${moduleRelevant(key,current(),derived)}" id="module-${key}"><h2>${def.title}</h2>${body}</section>`;
}
function panelParts(html) {
  const template = document.createElement('template'); template.innerHTML = html;
  return [...template.content.children].filter(el => el.matches('.panel'));
}
function panelBody(panel) { panel.querySelector('.panel-heading')?.remove(); return panel.innerHTML; }
function sheet() {
  const c = current(), species = resolveSpecies(c,pack);
  const inventoryPanels = panelParts(equipment());
  const character = `<div class="character-fields">${field('Name','name',c.name,'text','maxlength="200"')}${field('Player','player',c.player,'text','maxlength="200"')}${ruleReference(species,species.name,null,'header-species')}<span>Level ${derived.level}</span><a href="#creation">Edit</a></div>${traitsSummary()}`;
  const automaticLanguages=[...new Set([...species.languages,...(backgroundLanguage(c,pack)?[backgroundLanguage(c,pack)]:[])])];
  const languages=`<div>${escape(automaticLanguages.join(', '))}${species.understoodLanguages?.length?'; understands '+escape(species.understoodLanguages.join(', ')):''}</div><label><span class="sr-only">Additional languages (${languageCount()})</span><input type="text" data-field="languages" value="${escape(c.languages)}" maxlength="100000"></label>`;

  const classes = `<table id="class-table"><thead><tr><th>Class</th><th>Level</th><th>Hit die</th><th>Base attack</th></tr></thead><tbody>${[...derived.ctx.classLevels].map(([id,n])=>{const cls=ix.classes.get(id);return `<tr><td>${ruleReference(cls)}</td><td class="derived">${n}</td><td>d${cls.hitDie}</td><td>${signed(cls.bab[n-1])}</td></tr>`;}).join('')}</tbody></table><div class="class-summary"><a href="#advancement" class="button">Level Up</a></div>`;
  const abilities = `<table><thead><tr><th>Ability</th><th>Mod</th><th>Score</th><th>Base</th><th>Species</th></tr></thead><tbody>${ABILITIES.map(a=>species.noConstitution&&a==='con'?'<tr><td>CON</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>':`<tr><td>${a.toUpperCase()}</td><td><button class="roll" data-roll="${derived.mods[a]+pack.rules.conditionPenalties[c.condition]+(derived.abilityCheckBonuses?.[a]||0)}" data-roll-label="${a.toUpperCase()}" aria-label="${a.toUpperCase()} check ${signed(derived.mods[a]+pack.rules.conditionPenalties[c.condition]+(derived.abilityCheckBonuses?.[a]||0))}" ${derived.incapacitated?'disabled':''}>${signed(derived.mods[a])}</button></td><td class="derived" title="${derived.ctx.scores[a]}${derived.equipmentAbilities[a]?` + ${derived.equipmentAbilities[a]} ${escape(derived.armor.name)}`:''}">${derived.scores[a]}</td><td>${baseAbilityControl(c,species,a)}</td><td>${signed(species.abilityAdjustments[a]||0)}</td></tr>`).join('')}</tbody></table>${Object.keys(derived.equipmentAbilities).length?`<details><summary class="hint">Calculations</summary>${Object.entries(derived.equipmentAbilities).map(([a,n])=>`<div class="hint">${a.toUpperCase()}: ${derived.ctx.scores[a]} + ${n} ${escape(derived.armor.name)}</div>`).join('')}</details>`:''}`;
  const defenses = `<div class="actions"><label class="checkbox"><input type="checkbox" data-flat-footed ${derived.flatFooted?'checked':''} ${derived.balancingFlatFooted?'disabled title="Balancing"':''}>Flat-footed</label><label class="checkbox"><input type="checkbox" data-prone ${c.prone?'checked':''}>Prone</label><label class="checkbox"><input type="checkbox" data-helpless ${derived.helpless?'checked':''} ${c.condition===5||c.currentHP===0||derived.recovery.dead?'disabled':''}>Helpless</label>${ruleReference(pack.rulePages.find(r=>r.id==='rule:helpless'),'ⓘ',null,'defenses-helpless')}</div><table><thead><tr><th>Defense</th><th>Total</th></tr></thead><tbody>${['reflex','fortitude','will'].map(k=>`<tr title="${escape(derived.breakdowns[k])}"><td>${title(k)}</td><td class="derived defense-total" data-defense="${k}">${derived.defenses[k]}</td></tr>`).join('')}${derived.conditionalDefenses.map(e=>`<tr><td>${title(e.defense)} ${escape(conditionalDefenseLabel(e))}</td><td class="derived defense-total" data-defense="${e.defense}-${e.against}">${e.total}</td></tr>`).join('')}</tbody></table>${proneActionControls(c,derived,pack)}${defensiveCombatControls(c,derived)}<details><summary class="hint">Calculations</summary>${['reflex','fortitude','will'].map(k=>`<div class="hint">${title(k)}: ${escape(derived.breakdowns[k])}</div>`).join('')}</details>`;
  const hp = healthBars(c,derived,pack)+recoveryControls.health();

  const entries=featureEntries(c,derived,pack);
  const bodies={
   header:character,languages,classes:classes+xpBar(c,derived,pack.rules.resources),abilities,defenses,hp,
   threshold:`<div class="stat-big">${derived.threshold}</div>${derived.conditionalThresholds.map(r=>`<div>${r.total} ${escape(conditionalDefenseLabel(r))}</div>`).join('')}`,
   bab:`<div class="stat-big">${signed(derived.bab)}</div>`,
   speed:`<div class="stat-big">${derived.speedUnknown?'?':derived.speed}</div>${Object.entries(derived.speeds).map(([type,n])=>`<div>${title(type)} ${n}</div>`).join('')}${!derived.speedUnknown&&derived.runMultiplier!==4?`<div>Run ${derived.runSpeed}</div>`:''}<span class="hint">squares</span>${derived.armorItems.some(r=>r.category!=='light')?`<details><summary class="hint">Calculations</summary><div class="hint">${escape(derived.speedBreakdown)}</div></details>`:''}${acrobaticsMoveControls(c,derived,pack)}${balanceControls(c,derived,pack)}${escapeBondsControls(c,derived,pack)}${jumpControls(c,derived,pack)}${fallingControls(c,derived,pack)}${withdrawControls(c,derived,pack)}`,
   force:statBar('force','',derived.forceCurrent,derived.forceMaximum,'forcePoints','',campaignRuleEnabled(c,'dailyForcePoints')?derived.forceMaximum:undefined).replace('data-field="forcePoints"',`data-field="forcePoints" ${derived.forcePointsForbidden?'disabled':''}`)+`<button data-action="force-point-roll" title="Spend 1 Force Point" aria-label="Spend 1 Force Point and roll bonus" ${derived.forceCurrent<=0||derived.incapacitated?'disabled':''}>Roll</button>`,
   'dark-side':statBar('dark-side','',c.darkSideScore,derived.scores.wis,'darkSideScore'),condition:conditionTrack()+recoveryControls.condition(),skills:skillTable(),actions:actionsUI.render(),attacks:attackTable(),
   'force-powers':forcePowersUI.sheet(),'starship-maneuvers':starshipManeuversUI.sheet(),routines:combatControls.renderRoutines(),
   'droid-systems':droidSystemsUI.render(),vehicles:vehiclesUI.sheet(),
   inventory:`${field('Credits','credits',c.credits,'number','min="0" max="1000000000" step="0.01"')} <span class="hint">${totalWeight()}</span>${carryingDisplay()}<details class="shop" id="equipment-catalog"><summary>Catalog</summary>${panelBody(inventoryPanels[0]).replace(/<div class="actions">[\s\S]*?<\/div>$/, '')}</details>${panelBody(inventoryPanels[1])}`,
   'species-features':`${recoveryControls.species()}<div class="feature-list"><article>${ruleReference(species,species.name,null,'sheet-species')}</article>${customizationFeatures(c,species)}${speciesQualityControls(c,pack,'sheet')}</div>`,
   ...Object.fromEntries(['feats','talents','class-features','force-techniques','force-secrets','medical-secrets'].map(id=>[id,featureModule(id,entries)])),
   destiny:storyEditor('sheet'),
   'destiny-points':c.story?.kind==='destiny'?statBar('destiny','',c.story.points,c.levels.length,'story.points')+`<button type="button" data-spend-destiny ${c.story.points>0&&derived.level>0?'':'disabled'}>Spend</button>`:'',
   traditions:`${(c.forceTraditions||[]).map(s=>{const r=pack.rules.traditionTalentAccess.find(r=>r.id===s.id);return `<div class="actions"><button type="button" class="link-button" data-rule-page="${r.ruleId}">${escape(r.name)}</button><span class="badge">Level ${s.level}</span>${s.level<=c.levels.length&&!derived.ctx.forceTraditions.has(s.id)?'<span class="badge">Inactive</span>':''}</div>`;}).join('')}${traditionEditor('sheet')}`,
   modifiers:`<div class="form-grid">${Object.entries(c.modifiers).map(([key,val])=>field(title(key),`modifiers.${key}`,val,'number','min="-1000" max="1000"')).join('')}</div>`,
   notes:`<label><span class="sr-only">Character notes</span><textarea data-field="notes" rows="5">${escape(c.notes)}</textarea></label>`,
   'house-rules':houseRules.render(c),dice:`<div id="dicelog" role="log"></div><input id="cmd-input" placeholder="1d20+5" aria-label="Dice expression"><button data-action="clear-log">Clear</button>`
  };
  return MODULES.map(def=>{if(!Object.hasOwn(bodies,def.id))throw new Error('Missing module '+def.id);return moduleHTML(def.id,bodies[def.id]);}).join('');
}
function fitBarInput(el) {
  el.style.width=`calc(${Math.max(1,el.value.length)}ch + 3px)`;
}
function numericFields(root) {
  root.querySelectorAll('input[type=number]:not([data-generation-manual])').forEach(el=>{
    el.dataset.number='true'; el.dataset.math=''; el.dataset.prev=el.value;
    if(el.dataset.jump==='check'||['check','jumpCheck','natural','damage'].includes(el.dataset.falling)||['dexterityCheck','grappleCheck','dc','check'].includes(el.dataset.escapeBonds)||['check','catchCheck'].includes(el.dataset.balance)||el.dataset.chargePath==='acrobatics'||['check','terrainCheck'].includes(el.dataset.acrobaticsMovement)||['distance','weightOverride','shotsRemaining'].includes(el.dataset.inventory))el.dataset.allowEmpty='';
    if(el.step&&Number(el.step)<1)el.dataset.decimal='';
    if(el.hasAttribute('min')) el.dataset.min=el.min;
    if(el.hasAttribute('max')) el.dataset.max=el.max;
    el.type='text';el.inputMode='numeric';
  });
  root.querySelectorAll('.hp-bar input, .resource-label input').forEach(fitBarInput);
}
function renderCreatorIssues() {
  const blocker=$('cr-blocker'), open=Boolean(blocker.querySelector('details[open]'));
  blocker.innerHTML=derived.issues.length?`<details${open?' open':''}><summary>${derived.issues.length} unresolved choice${derived.issues.length===1?'':'s'}</summary><ul>${derived.issues.map(issue=>`<li>${escape(issue)}</li>`).join('')}</ul></details>`:'';
}
function renderEditor() {
  if (!editorMode) return;
  featureTrees.remember();creationOptions.remember();
  $('cr-title').textContent = {creation:'Character Creation',advancement:'Level up',rules:'Rules',powers:'Force Powers',maneuvers:'Starship Maneuvers',vehicles:'Vehicles'}[editorMode];
  const isCreation = editorMode === 'creation';
  $('cr-stepper').hidden = !isCreation;
  $('cr-prev').hidden = $('cr-next').hidden = true;
  $('cr-step-status').textContent = '';
  renderCreatorIssues();
  $('cr-prev').disabled = creatorStep === 0;
  $('cr-next').disabled = creatorStep === CREATOR_STEPS.length-1;
  $('cr-stepper').innerHTML = CREATOR_STEPS.map((label,i)=>`<button class="cr-tab ${i===creatorStep?'active':''}" role="tab" id="cr-tab-${i}" aria-selected="${i===creatorStep}" aria-controls="cr-body" data-step="${i}" data-creation-tab="${CREATOR_TABS[i].id}">${escape(label)}</button>`).join('');
  $('cr-body').setAttribute('role', isCreation ? 'tabpanel' : 'region');
  if (isCreation) $('cr-body').setAttribute('aria-labelledby',`cr-tab-${creatorStep}`); else $('cr-body').removeAttribute('aria-labelledby');
  const oldScroll = $('cr-body').scrollTop;
  const openDetails=[...$('cr-body').querySelectorAll('details[open][id]')].map(el=>el.id);
  $('cr-body').innerHTML = isCreation ? creation() : editorMode==='powers'?forcePowersUI.manager(powerManageLevel):editorMode==='maneuvers'?starshipManeuversUI.manager(maneuverManageLevel):editorMode==='vehicles'?vehiclesUI.manager():({advancement,rules}[editorMode])();
  openDetails.forEach(id=>{const detail=$('cr-body').querySelector(`[id="${CSS.escape(id)}"]`);if(detail)detail.open=true;});
  numericFields($('cr-body')); $('cr-body').scrollTop=oldScroll;
  renderTreeDialog();if($('creator-modal').open)featureTrees.layout();requestAnimationFrame(()=>featureTrees.layout());
}
function logEntries() { return store.roster.logs?.[current().id] || []; }
function paintLogs() {
  $('dicelog').innerHTML=logEntries().map(e=>`<div class="ev ev-${escape(e.kind)}">${rollEntryHTML(e)}</div>`).join('');
  window.repaintRollMirror();
}
function logEvent(kind,text,html,preserveSkillCheck=false) {
  if(!preserveSkillCheck&&speciesChecks?.invalidate())render();
  store.roster.logs ||= {}; const entries = store.roster.logs[current().id] ||= [];
  const entry={kind,text:String(text).slice(0,2000)};
  if(html)rollMarkup.set(entry,html);
  entries.unshift(entry); entries.length=Math.min(entries.length,200);
  store.schedule();paintLogs();window.mirrorLogEntry(kind,escape(text));
  // paintLogs already includes the new entry; the mirror call only reopens a hidden roll panel.
  window.repaintRollMirror();
  if(html)requestAnimationFrame(()=>{if(logEntries()[0]===entry)animateNewestRoll();});
}
function runCommand(raw) {
  try { const rolled=evalExpr(raw);logEvent('roll',`${raw}: ${rolled.terms.map(t=>t.dice.map(d=>`${d.v}${d.dropped?' (dropped)':''}`).join(', ')).join(' | ')} = ${rolled.value}`,`${escape(raw)}: ${rolled.display} = ${totalHtml(rolled)}`); }
  catch(error) { notify(error.message); }
}
function openEditor(mode) {
  if (!$('creator-modal').open){returnFocus = document.activeElement;creationOptions.foldAll();featureTrees.foldAll();}
  editorMode = mode; renderEditor();
  if (!$('creator-modal').open) $('creator-modal').showModal();
}
function refreshPointBudget() {
  derived=derive(current(),pack);
  const budget=$('cr-body').querySelector('.budget');
  if(budget){budget.textContent=`${Number.isFinite(derived.pointCost)?derived.pointCost:'Invalid'} / ${activeBudget(current(),pack)} points`;budget.classList.toggle('error',derived.pointCost>activeBudget(current(),pack));}
  renderCreatorIssues();
}
function refreshCredits(el) {
  document.querySelectorAll('[data-field="credits"]').forEach(input=>{if(input!==el)input.value=current().credits;});
  const roll=$('cr-body').querySelector('[data-action="starting-credits"]');
  if(roll)roll.disabled=!canRollStartingCredits(current());
}
function validCreatorInput() {const invalid=$('cr-body').querySelector('[data-generation-manual]:invalid');if(invalid){invalid.reportValidity();return false;}return true;}
function closeEditor() { if(validCreatorInput()){$('creator-modal').close();editorMode=null;location.hash='overview';render();} }
function focusModule(key) {
  const module = $(`module-${key}`); if (!module) return;
  window.__layout.showModule(key);
  if (window.__layout.state.collapsed[key]) window.__layout.toggleCollapse(module);
  const stack = window.__layout.stackIdOf(key); if (stack) window.__layout.switchTab(key);
  module.scrollIntoView({block:'start',behavior:'smooth'});
}
function route() {
  const key = location.hash.slice(1);
  section = SECTIONS.includes(key) ? key : 'overview';
  if(section==='advancement'&&current().levels[0].pendingClass){section='creation';creatorStep=0;}
  if (['creation','advancement','rules'].includes(section)) {
    openEditor(section);
    if(section==='rules')loadReferences();
  }
  else {
    if ($('creator-modal').open) closeEditor();
    if (section !== 'overview') focusModule({equipment:'inventory',features:'feats',skills:'skills'}[section]);
  }
}
function render() {
  try{if(prepareDroidSystems(current(),pack))store.schedule();}catch(e){notify(e.message);}
  actionsUI?.refresh();
  derived = derive(current(),pack);
  const scroll = window.scrollY;
  const openDetails = [...document.querySelectorAll('.modules details[open][id]')].map(el=>el.id);
  $('roster').innerHTML = store.roster.characters.map(c=>`<div class="char-tab ${c.id===store.roster.activeId?'active':''}"><button data-character="${escape(c.id)}" aria-pressed="${c.id===store.roster.activeId}">${escape(c.name||'unnamed')}</button>${store.roster.characters.length>1?`<button type="button" class="char-tab-x" data-delid="${escape(c.id)}" aria-label="Delete ${escape(c.name||'unnamed')}">×</button>`:''}</div>`).join('');
  $('recovery').hidden=!store.recovery;
  $('replace-storage').hidden = !store.recovery || !recoveryExported;
  const c=current();
  $('build-status').innerHTML = derived.issues.length ? `<details class="validation"><summary>${derived.issues.length} unresolved choice${derived.issues.length===1?'':'s'}</summary><ul>${derived.issues.map(t=>`<li>${escape(t)}</li>`).join('')}</ul></details>` : '';
  document.querySelector('.modules').innerHTML=sheet();
  $('print-stat-block').innerHTML=renderStatBlock(c,derived,pack);
  openDetails.forEach(id=>{if($(id)) $(id).open=true;});
  numericFields($('main'));window.__layout.refresh();paintLogs();renderEditor();
  window.scrollTo({top:scroll});
}
function changed() { speciesChecks?.invalidate();const next=derive(current(),pack);recordPrivateerFall(current(),next);if(derived&&next.forceMaximum!==derived.forceMaximum){const bonus=campaignRuleEnabled(current(),'dailyForcePoints')?0:3*(Number(next.ctx.feats.some(f=>f.id==='feat:force-boon'))-Number(derived.ctx.feats.some(f=>f.id==='feat:force-boon')));if(bonus>0)current().forcePoints+=bonus;else current().forcePoints=Math.min(current().forcePoints,next.forceMaximum);}store.schedule(); queueMicrotask(render); }
function d(sides) { const a=new Uint32Array(1); const ceiling=Math.floor(2**32/sides)*sides; do { crypto.getRandomValues(a); } while(a[0]>=ceiling); return a[0]%sides+1; }
function addInventory(id,quantity=1,options={}) {
  const c=current(),r=resolveEquipment({id,...options},pack,c),species=resolveSpecies(c,pack);
  const equipped=r.kind!=='gear'&&(!r.wearerSize||r.wearerSize===species.size)&&(!r.droidSystem?.builtIn||species.isDroid||species.usesDroidSystems);
  if(equipped)c.inventory.filter(e=>armorExclusive(r,ix.equipment.get(e.id))).forEach(e=>e.equipped=false);
  for(let n=0;n<(r.energyShield||r.droidSystem?quantity:1);n++)c.inventory.push({...options,...(r.droidSystem?.category==='locomotion'?{systemOrdinal:Math.min(6,(options.systemOrdinal||6)+n)}:{}),id,uid:crypto.randomUUID(),quantity:r.energyShield||r.droidSystem?1:quantity,equipped:equipped&&(!r.droidSystem||n===0),twoHanded:false,attackMod:0,damageMod:0});
}
function purchase(debit, form=$('purchase')) {
 if(!form.reportValidity())return;
 const scope=form.dataset.equipmentScope==='cr'?'cr':'',draft=shopDraft(scope),quantity=Number(form.querySelector('[data-catalog-quantity]').value);
 if(!Number.isInteger(quantity)||quantity<1||quantity>999)return notify('Choose a quantity from 1 to 999.');
 const quote=shopQuote(draft,quantity,current());
 if(debit&&quote.total===null)return notify('No market price.');
 const allowance=debit&&scope&&draft.startingAllowance&&startingSystemEligible(ix.equipment.get(draft.id));
 if(allowance){try{addStartingDroidSystem(current(),pack,{id:draft.id,quantity,systemSize:draft.systemSize,...(ix.equipment.get(draft.id).droidSystem.category==='locomotion'?{systemOrdinal:draft.systemOrdinal}:{}),...(ix.equipment.get(draft.id).droidSystem.costModel==='capacity'?{systemUnits:draft.systemUnits}:{}),licenseStatus:quote.licenseStatus},quote.total);changed();}catch(e){notify(e.message);}return;}
 if(debit&&current().credits<quote.total)return notify(`Insufficient credits. ${quote.total.toLocaleString()} required.`);
 if(current().inventory.length+(ix.equipment.get(draft.id).energyShield||ix.equipment.get(draft.id).droidSystem?quantity:1)>1000)return notify('Inventory limit reached.');
 if(debit)current().credits=Math.round((current().credits-quote.total)*100)/100;
 const r=ix.equipment.get(draft.id);
 addInventory(draft.id,quantity,{options:[...draft.options],...(r.retractableStock?{stockPosition:draft.stockPosition||'extended'}:{}),...(r.droidSystem?{systemSize:draft.systemSize,...(r.droidSystem.category==='locomotion'?{systemOrdinal:draft.systemOrdinal}:{}),...(r.droidSystem.costModel==='capacity'?{systemUnits:draft.systemUnits}:{})}:r.kind==='armor'&&!r.energyShield?{armorSize:draft.armorSize}:{}),licenseStatus:debit?quote.licenseStatus:'none'});changed();
}
function confirmDelete(titleText, text, callback) {
  $('confirm-title').textContent=titleText; $('confirm-text').textContent=text;
  const dialog=$('confirm-dialog'); dialog.returnValue='';
  dialog.addEventListener('close',()=>{if(dialog.returnValue==='confirm') callback();},{once:true}); dialog.showModal();
}
function events() {
  window.addEventListener('resize',()=>{featureTrees.remember();featureTrees.layout();});
  $('feature-tree-close').addEventListener('click',()=>$('feature-tree-modal').close());
  $('feature-tree-modal').addEventListener('close',()=>{featureTrees.remember();const t=treeTarget;treeTarget=null;$('feature-tree-body').replaceChildren();if(t)$('cr-body').querySelector(`[data-open-tree="${t.kind}:${t.level}:${t.slotIndex}"]`)?.focus({preventScroll:true});});
  $('rule-detail-close').addEventListener('click',()=> $('rule-detail-modal').close());
  $('rule-detail-modal').addEventListener('close',()=>{referenceRequest++;classRequirementTarget=null;});
  document.addEventListener('input',event=>{
    const el=event.target;
    if(el.hasAttribute('data-species-quality')){try{changeSpeciesQuality(current(),pack,Number(el.dataset.speciesQuality),el.dataset.qualityField,el.value);document.querySelectorAll(`[data-species-quality="${el.dataset.speciesQuality}"][data-quality-field="${el.dataset.qualityField}"]`).forEach(other=>{if(other!==el)other.value=el.value;});derived=derive(current(),pack);renderCreatorIssues();$('build-status').innerHTML=derived.issues.length?`<details class="validation"><summary>${derived.issues.length} unresolved choice${derived.issues.length===1?'':'s'}</summary><ul>${derived.issues.map(t=>`<li>${escape(t)}</li>`).join('')}</ul></details>`:'';$('print-stat-block').innerHTML=renderStatBlock(current(),derived,pack);store.schedule();}catch(e){notify(e.message);}return;}
    if(el.hasAttribute('data-optional-search')){houseRules.searchOptional(el.value);$('module-house-rules').querySelector('.optional-topics').outerHTML=houseRules.optionalTopics(current());return;}
    if(el.hasAttribute('data-counseling-search')){houseRules.search(el.value);const root=$('module-house-rules');root.querySelector('.counseling-topics').outerHTML=new DOMParser().parseFromString(houseRules.render(current()),'text/html').querySelector('.counseling-topics').outerHTML;return;}
    if(creationOptions.input(event))return;
    if(el.id==='rules-search'){rulesCatalog.search(el.value);$('rules-results').innerHTML=rulesCatalog.results();return;}
    if(el.matches('.hp-bar input, .resource-label input'))fitBarInput(el);
    if(combatControls.input(event))return;
    if(vehiclesUI.input(el)||starshipManeuversUI.input(el)||forcePowersUI.input(el))return;
    if(featureTrees.input(event))return;
    if(el.id==='species-search'){speciesBrowser.search(el.value);$('species-results').innerHTML=speciesBrowser.results(current().species);return;}
    if(el.dataset.trait){current().heroicTraits||={};current().heroicTraits[el.dataset.trait]=el.value;store.schedule();return;}
    if(el.dataset.story==='details'){current().story.details=el.value;document.querySelectorAll('[data-story="details"]').forEach(other=>{if(other!==el)other.value=el.value;});store.schedule();return;}
    if (el.hasAttribute('data-generation-manual')) {
      const value=Number(el.value), valid=el.value!=='' && Number.isInteger(value) && value>=3 && value<=30;
      el.setCustomValidity(valid?'':'Enter a whole number from 3 to 30.');
      if(!valid)return;
      setPoolScore(current(),Number(el.dataset.generationManual),value,pack);store.schedule();
      derived=derive(current(),pack);
      const state=generationState(current(),pack);
      $('cr-body').querySelectorAll('.cr-pool').forEach((score,i)=>{score.textContent=state.pool[i];});
      for(const a of ABILITIES){
        $('cr-body').querySelectorAll(`[data-generation-assign="${a}"] option`).forEach(option=>{if(option.value!=='')option.textContent=state.pool[Number(option.value)];});
        $(`cr-final-${a}`).textContent=derived.scores[a];
        $(`cr-mod-${a}`).textContent=signed(derived.mods[a]);
      }
      renderCreatorIssues();
      return;
    }
    if(el.dataset.field==='credits' && el.closest('#cr-body')){const value=Number(el.value);if(el.value!=='' && Number.isFinite(value) && value>=0 && value<=1000000000){current().credits=value;store.schedule();refreshCredits(el);}return;}
    if(el.dataset.field==='pointBudget' && el.closest('#cr-body')){const value=Number(el.value);if(el.value!=='' && Number.isInteger(value) && value>=0 && value<=100){setAbilityBudget(current(),pack,value);store.schedule();refreshPointBudget();}return;}
    if (el.dataset.field && ['name','player','notes','languages'].includes(el.dataset.field)) {
      current()[el.dataset.field]=el.value; store.schedule();
      if(el.dataset.field==='name') { document.querySelectorAll('[data-field="name"]').forEach(input=>{if(input!==el)input.value=el.value;}); document.querySelector(`[data-character="${current().id}"]`).textContent=el.value||'unnamed'; }
    }
  });
  document.addEventListener('change',event=>{
    if(event.composedPath().some(node=>node.id==='lay-bar'))return;
    const el=event.target, c=current();
    if(el.id==='rules-book'){rulesCatalog.source(el.value);$('rules-results').innerHTML=rulesCatalog.results();return;}
    if(el.id==='rules-kind'||el.id==='rules-builder-only'){rulesCatalog.filter($('rules-kind').value,$('rules-builder-only').checked);$('rules-results').innerHTML=rulesCatalog.results();return;}
    if(featureTrees.change(event)||el.disabled)return;
    if(el.hasAttribute('data-manual-requirements')||el.hasAttribute('data-manual-choice')){const l=c.levels[Number(el.dataset.level)],kind=el.dataset.choice,s=kind==='feat'?l.feats[Number(el.dataset.slot)]:l[kind];if(!s)return;if(el.hasAttribute('data-manual-requirements'))s.manualRequirements=el.checked;else{if(/[\r\n|]/.test(el.value)){notify('Use a single choice without |');renderEditor();return;}if(el.value.trim()){s.choice='manual:'+el.value.trim();delete s.pending;}else{delete s.choice;s.pending=true;}}changed();return;}
    if(el.hasAttribute('data-plan-declaration')&&classRequirementTarget){const {level,id}=classRequirementTarget,draft=classPickDraft(level,id);draft.entryDeclarations[el.dataset.planDeclaration]=el.checked;const entry=classEntry(ix.classes.get(id),progression(c,pack,level).ctx,ix,draft),button=$('rule-detail-body').querySelector('[data-plan-select-class]');button.disabled=!entry.available;button.title=entry.reason;return;}
    if(el.id==='creation-level'){const count=Number(el.value);try{resizeLevelPlan(c,pack,count);changed();}catch(error){notify(error.message);renderEditor();}return;}
    if(el.id==='next-class'){advancementDrafts.set(c.id,{classId:el.value,entryDeclarations:{}});renderEditor();return;}
    if(el.hasAttribute('data-class-ban')){if(el.checked){c.classBans??=[];if(!c.classBans.some(b=>b.classId===el.dataset.classBan))c.classBans.push({classId:el.dataset.classBan,throughLevel:derived.ctx.classLevels.get(el.dataset.classBan)||1});}else c.classBans=(c.classBans||[]).filter(b=>b.classId!==el.dataset.classBan);changed();return;}
    if(el.hasAttribute('data-class-dss')){const n=Number(el.value);if(Number.isInteger(n)&&n>=0&&n<=1000)c.levels[Number(el.dataset.classDss)].acquisitionDSS=n;changed();return;}
    if(el.hasAttribute('data-class-entry')){const target=el.dataset.classEntry==='next'?nextClassDraft():c.levels[Number(el.dataset.classEntry)];target.entryDeclarations??={};target.entryDeclarations[el.dataset.entryId]=el.checked;if(el.dataset.classEntry==='next')renderEditor();else changed();return;}
    if(el.hasAttribute('data-class-choice')||el.hasAttribute('data-class-choice-power')){const l=c.levels[Number(el.dataset.classChoice??el.dataset.classChoicePower)],slot=Number(el.dataset.classSlot);l.classChoices??=[];if(el.hasAttribute('data-class-choice'))l.classChoices[slot]=el.value?{id:el.value}:null;else if(l.classChoices[slot]){if(el.value)l.classChoices[slot].choice=el.value;else delete l.classChoices[slot].choice;}changed();return;}
    if(el.hasAttribute('data-species-quality'))return;
    if(droidSystemsUI.change(el))return;
    if(actionsUI.change(el))return;
    if(vehiclesUI.change(el)||starshipManeuversUI.change(el)||forcePowersUI.change(el))return;
    if(el.hasAttribute('data-maneuver-manage-level')){maneuverManageLevel=Number(el.value);renderEditor();return;}
    if(el.hasAttribute('data-power-manage-level')){powerManageLevel=Number(el.value);renderEditor();return;}
    if(el.hasAttribute('data-generation-manual')) return;
    if(el.dataset.trait || el.dataset.story==='details')return;
    if(el.dataset.story) {
      const key=el.dataset.story;
      if(key==='kind'){c.story=emptyStory(el.value);backgroundKnowledgeDrafts.clear();}
      else if(key==='id') {
        c.story.id=el.value||null;backgroundKnowledgeDrafts.clear();
        if(c.story.kind==='background'){const record=ix.backgrounds.get(el.value);c.story.skills=Array(record?.skillChoices||0).fill(null);c.story.language=record?.bonusLanguages.length===1?record.bonusLanguages[0]:'';}
      } else c.story[key]=el.value;
      changed();return;
    }
    if(el.hasAttribute('data-force-tradition')){
      const id=el.dataset.forceTradition;
      if(!pack.rules.traditionTalentAccess.some(r=>r.id===id))return;
      c.forceTraditions=(c.forceTraditions||[]).filter(s=>s.id!==id);
      if(el.checked)c.forceTraditions.push({id,level:c.levels.length,darkSideScore:c.darkSideScore});
      changed();return;
    }
    if(el.hasAttribute('data-tradition-level')||el.hasAttribute('data-tradition-dss')){
      const id=el.dataset.traditionLevel||el.dataset.traditionDss,selection=c.forceTraditions?.find(s=>s.id===id),value=Number(el.value),key=el.hasAttribute('data-tradition-level')?'level':'darkSideScore';
      if(selection&&el.value!==''&&Number.isInteger(value)&&value>=(key==='level'?1:0)&&value<=(key==='level'?20:1000))selection[key]=value;
      changed();return;
    }
    if(el.hasAttribute('data-background-skill') || el.hasAttribute('data-background-knowledge')) {
      const i=Number(el.dataset.backgroundSkill??el.dataset.backgroundKnowledge), key=c.id+':'+i;
      if(el.value==='knowledge')backgroundKnowledgeDrafts.add(key);else backgroundKnowledgeDrafts.delete(key);
      c.story.skills[i]=el.value && el.value!=='knowledge'?el.value:null;
      changed();return;
    }

    if(el.hasAttribute('data-customization')){try{const kind=el.dataset.customization;if(kind==='variant'){const prior=customizationState(c,resolveSpecies(c,pack)).variants;setSpeciesCustomization(c,pack,'variants',el.checked?[...prior,el.value]:prior.filter(v=>v!==el.value));}else setSpeciesCustomization(c,pack,kind,el.value,{traitId:el.dataset.customTrait,choiceId:el.dataset.customChoice});if(kind==='trait')$('custom-trait-picker').open=false;changed();}catch(e){notify(e.message);render();}return;}
    if(el.hasAttribute('data-species-choice')){try{chooseSpeciesOption(c,pack,el.dataset.speciesChoice,el.value||null);changed();}catch(e){notify(e.message);render();}return;}
    if(el.dataset.naturalId){const key=el.dataset.naturalModifier|| (el.hasAttribute('data-natural-technique')?'attackTechnique':el.hasAttribute('data-natural-target')?'targetKind':null);if(!key)return;try{setNaturalModifier(c,pack,el.dataset.naturalId,key,el.dataset.naturalModifier?Number(el.value):el.value);changed();}catch(e){notify(e.message);render();}return;}
    if(el.hasAttribute('data-unarmed-technique')){if(!['normal','rapid-strike'].includes(el.value))return;c.unarmedModifiers??={attackMod:0,damageMod:0};c.unarmedModifiers.attackTechnique=el.value;changed();return;}
    if(el.hasAttribute('data-charge-path')){if(el.hasAttribute('data-math'))commitMath(el);const path=chargePath(c),key=el.dataset.chargePath;path[key]=el.type==='checkbox'?el.checked:key==='mode'?el.value:el.value===''&&key==='acrobatics'?null:Number(el.value);if(['lowObjectSquares','diagonalLowObjectSquares'].includes(key))path.lowObjects=false;try{validateCharge({...c,chargePath:path},reason=>{throw new Error('Invalid '+reason);});c.chargePath=path;}catch(err){notify(err.message);}changed();return;}
    if(el.hasAttribute('data-energy-charges')||el.hasAttribute('data-energy-sr')){
      const uid=el.dataset.energyCharges||el.dataset.energySr;try{const x=energyShieldDetails(c,derived,pack,uid),key=el.hasAttribute('data-energy-charges')?'charges':'sr',n=Number(el.value),max=key==='charges'?x.record.energyShield.charges:x.record.energyShield.rating;if(el.value.trim()===''||!Number.isInteger(n)||n<0||n>max)throw new Error('Enter a valid shield value');x.entry.shield={...x.state,[key]:n};}catch(error){notify(error.message);}changed();return;
    }
    if(el.hasAttribute('data-armor-check')){if(ARMOR_CHECKS.includes(el.dataset.armorCheck)){c.armorChecks||={};c.armorChecks[el.dataset.armorCheck]=el.checked;changed();}return;}
    if(el.hasAttribute('data-attack-target')){const target=attackTarget(c);target[el.dataset.attackTarget]=el.type==='checkbox'?el.checked:el.value;try{validateAttackTarget({...c,attackTarget:target},reason=>{throw new Error('Invalid '+reason);});c.attackTarget=target;if(!canAimAtTarget(c,{...ix.species.get(c.species),vision:derived.vision,blind:derived.blind}))for(const e of c.inventory)if(e.aimed!==undefined)e.aimed=false;}catch(err){notify(err.message);}changed();return;}
    if(el.hasAttribute('data-prone')){c.prone=el.checked;changed();return;}
    if(el.hasAttribute('data-power-attack')){try{declarePowerAttack(c,derived,Number(el.value));}catch(err){notify(err.message);}changed();return;}
    if(el.hasAttribute('data-melee-defense')){try{declareMeleeDefense(c,derived,Number(el.value));}catch(err){notify(err.message);}changed();return;}
    if(el.hasAttribute('data-dodge-opponent')){try{designateDodgeOpponent(c,derived,el.value);}catch(err){notify(err.message);}changed();return;}
    if(el.hasAttribute('data-helpless')){c.helpless=el.checked;changed();return;}
    if(el.hasAttribute('data-unarmed-target')){if(!['creature','object','vehicle'].includes(el.value))return;c.unarmedModifiers??={attackMod:0,damageMod:0};c.unarmedModifiers.targetKind=el.value;changed();return;}
    if(el.hasAttribute('data-mighty-swing')){c.mightySwing=el.checked;if(el.checked){clearBracing(c);for(const e of c.inventory)if(e.aimed!==undefined)e.aimed=false;}changed();return;}
    if(el.dataset.unarmedModifier){const n=Number(el.value);if(!Number.isInteger(n)||n<-100||n>100){notify('Enter a valid modifier.');render();return;}c.unarmedModifiers??={attackMod:0,damageMod:0};c.unarmedModifiers[el.dataset.unarmedModifier]=n;changed();return;}
    if(el.dataset.skillModifier){const n=Number(el.value);if(!Number.isInteger(n)||n<-1000||n>1000){notify('Enter a valid modifier.');render();return;}c.skillModifiers??={};c.skillModifiers[el.dataset.skillModifier]=n;changed();return;}
    if(el.hasAttribute('data-flat-footed')){c.flatFooted=el.checked;changed();return;}
    if(el.dataset.teamAllies){try{setTeamAllies(c,pack,el.dataset.teamAllies,Number(el.value));changed();}catch(e){notify(e.message);render();}return;}
    if(el.dataset.defenseAbility){const key=el.dataset.defenseAbility;if(!Object.hasOwn(derived.defenseAbilities,key)||!['auto',...derived.defenseAbilities[key].options.map(o=>o.ability)].includes(el.value))return;c.defenseAbilities??={};c.defenseAbilities[key]=el.value;changed();return;}
    if(el.hasAttribute('data-threshold-defense')){if(!['auto',...derived.thresholdContext.allowed].includes(el.value))return;c.thresholdDefense=el.value;changed();return;}
    if(houseRules.change(el,c)){changed();return;}
    if(el.hasAttribute('data-catalog-item')||el.hasAttribute('data-catalog-variant')||el.hasAttribute('data-shop-field')||el.hasAttribute('data-shop-upgrade')||el.hasAttribute('data-catalog-quantity')){
      if(el.hasAttribute('data-math'))commitMath(el);
      const form=el.closest('form'),scope=form.dataset.equipmentScope==='cr'?'cr':'',draft=shopDraft(scope);
      draft.quantity=Number(form.querySelector('[data-catalog-quantity]').value);
      if(el.hasAttribute('data-catalog-item')||el.hasAttribute('data-catalog-variant')){draft.id=el.value;const selectedItem=ix.equipment.get(draft.id);if(selectedItem.wearerSize)draft.armorSize=selectedItem.wearerSize;draft.options=[];draft.market='normal';draft.license=true;draft.stockPosition='extended';}
      if(el.dataset.shopField)draft[el.dataset.shopField]=el.dataset.shopField==='stockPosition'?(el.checked?'extended':'none'):el.type==='checkbox'?el.checked:['systemUnits','systemOrdinal'].includes(el.dataset.shopField)?Number(el.value):el.value;
      if(el.dataset.shopUpgrade)draft.options=el.checked?[...draft.options,el.dataset.shopUpgrade]:draft.options.filter(id=>id!==el.dataset.shopUpgrade);
      if(el.hasAttribute('data-catalog-quantity')){
        if(derived.purchaseBenefits.licenseAllowance||ix.equipment.get(draft.id).droidSystem?.category==='locomotion'){refreshShop(form);return;}
        const quote=shopQuote(draft,draft.quantity,c);
        form.querySelector('[data-shop-quote]').textContent=`${quote.total===null?(quote.item.purchasePending?'Manual price':'No market price'):quote.total.toLocaleString()+' cr'}, ${weightText(quote.item.weight===null?null:quote.item.weight*draft.quantity)}`;
        return;
      }
      refreshShop(form);return;
    }
    if(el.dataset.mechanicalSkill){c.mechanicalSkills=el.checked?[...(c.mechanicalSkills||[]),el.dataset.mechanicalSkill]:(c.mechanicalSkills||[]).filter(id=>id!==el.dataset.mechanicalSkill);changed();return;}
    if(el.dataset.skillAbility){try{setSkillAbility(c,derived.skills,el.dataset.skillAbility,el.value);changed();}catch(e){notify(e.message);render();}return;}
    if(el.dataset.skillSource){c.skillCheckSources??={};c.skillCheckSources[el.dataset.skillSource]=el.value;changed();return;}
    if(el.hasAttribute('data-math')) commitMath(el);
    if(el.dataset.attackAbility){try{setAttackAbility(c,derived.attacks,el.dataset.attackAbility,el.value);changed();}catch(e){notify(e.message);render();}return;}
    if(combatControls.change(el))return;
    if(recoveryControls.change(el))return;
    if (el.dataset.field) {
      if(el.dataset.field==='protection.drBypass')return;
      if (['name','player','notes','languages'].includes(el.dataset.field)) return;
      const keys=el.dataset.field.split('.');
      const obj=keys.length>1?c[keys[0]]:c, key=keys.at(-1);
      const numeric=el.dataset.number==='true'||['condition','hpRoll'].includes(key);
      const value=numeric?Number(el.value):el.value;
      if (numeric&&(!(key==='credits'?Number.isFinite(value):Number.isInteger(value))||value<Number(el.min||-1000)||value>Number(el.max||1000000000))) { notify('Enter a whole number within the field limits.'); render(); return; }
      if(key==='credits' && el.closest('#cr-body')){obj[key]=value;store.schedule();refreshCredits(el);return;}
      if(key==='pointBudget' && el.closest('#cr-body')){setAbilityBudget(c,pack,Number(value));store.schedule();refreshPointBudget();return;}
      const previousValue=obj[key];
      if(key==='hpRoll'&&campaignRuleEnabled(c,'averageHP')){render();return;}
      if(key==='hpRoll') c.levels[Number(el.dataset.level)].hpRoll=value; else obj[key]=value;
      if(el.dataset.field==='condition'&&value!==previousValue){if(value===5)recordKnockout(c);else if(c.currentHP!==0&&c.recovery)c.recovery.stunUnconscious=false;}
      if(el.dataset.field==='currentHP'&&value===0&&previousValue!==0)recordKnockout(c);
      if(el.dataset.field==='protection.srMax'){
        c.protection.sr=previousValue===0?value:Math.min(c.protection.sr,value);
      }
    } else if (el.dataset.generationAssign) {
      assignScore(c,el.dataset.generationAssign,el.value===''?null:Number(el.value),pack);
    } else if (el.hasAttribute('data-generation-pool')) {
      setPoolScore(c,Number(el.dataset.generationPool),Number(el.value),pack);
    } else if (el.dataset.ability) {
      if(resolveSpecies(c,pack).fixedAbilities){render();return;}
      const value=Number(el.value); if(!Number.isInteger(value)||value<3||value>30) {notify('Base abilities must be whole numbers from 3 to 30.');render();return;}
      setBaseAbility(c,pack,el.dataset.ability,value);
    } else if(el.dataset.class) {
      const index=Number(el.dataset.class),l=c.levels[index];l.classId=el.value;delete l.pendingClass;const cls=ix.classes.get(el.value),cl=(progression(c,pack,index).ctx.classLevels.get(cls.id)||0)+1;l.feats=l.feats.slice(0,levelSlots(index+1,cl,ix.species.get(c.species),cls,pack).length);if(!hasClassTalent(cls,cl))l.talent=null;if(!cls.startingFeats.includes(l.startingFeat?.id))l.startingFeat=null;delete l.entryDeclarations;delete l.classChoices;if(ix.classes.get(el.value).classType==='prestige')l.acquisitionDSS=c.darkSideScore;else delete l.acquisitionDSS;
      if(Number(el.dataset.class)>0) l.hpRoll=Math.floor(ix.classes.get(el.value).hitDie/2)+1;
    } else if(el.dataset.knowledgeGroup) {
      const scope=el.dataset.knowledgeGroup, list=trainingList(scope);
      if(el.checked) knowledgeDrafts.set(knowledgeKey(scope),list.some(id=>id.startsWith('skill:knowledge-'))?0:1);
      else {replaceTraining(scope,list.filter(id=>!id.startsWith('skill:knowledge-')));knowledgeDrafts.delete(knowledgeKey(scope));}
    } else if(el.dataset.knowledgeField) {
      const scope=el.dataset.knowledgeField, old=el.dataset.previousKnowledge, list=[...trainingList(scope)];
      const i=list.indexOf(old), pending=knowledgeDrafts.get(knowledgeKey(scope))||0;
      if(i>=0){if(el.value)list[i]=el.value;else {list.splice(i,1);knowledgeDrafts.set(knowledgeKey(scope),pending+1);}}
      else if(el.value){if(!list.includes(el.value))list.push(el.value);knowledgeDrafts.set(knowledgeKey(scope),Math.max(0,pending-1));}
      replaceTraining(scope,list);
    } else if(el.dataset.trained) {
      const id=el.dataset.trained; c.trainedSkills=el.checked?[...c.trainedSkills,id]:c.trainedSkills.filter(v=>v!==id);
    } else if(el.dataset.extraSkill) {
      const l=c.levels[Number(el.dataset.level)], id=el.dataset.extraSkill;
      l.trainedSkills=el.checked?[...l.trainedSkills,id]:l.trainedSkills.filter(v=>v!==id);
    } else if(el.dataset.choice) {
      const l=c.levels[Number(el.dataset.level)];
      const familyName=el.value.startsWith('family:')?el.value.slice(7):null;
      const representative=familyName && pack.feats.find(r=>r.name.startsWith(familyName+' ('));
      let s=familyName?{id:representative.id,pending:true}:parseSelection(el.value);
      if(el.hasAttribute('data-secondary') && !s){const old=el.dataset.choice==='classChoice'?l.classChoices?.[Number(el.dataset.slot)]:el.dataset.choice==='feat'?l.feats[Number(el.dataset.slot)]:l[el.dataset.choice];s=old?{id:old.id,...(/^(Weapon Proficiency|Armor Proficiency) \(/.test(ix.feats.get(old.id)?.name||'')?{pending:true}:{})}:null;}
      const oldSelection=el.dataset.choice==='classChoice'?l.classChoices?.[Number(el.dataset.slot)]:el.dataset.choice==='feat'?l.feats[Number(el.dataset.slot)]:l[el.dataset.choice];if(s&&oldSelection?.id===s.id&&oldSelection.manualRequirements!==undefined)s.manualRequirements=oldSelection.manualRequirements;
      if(el.dataset.choice==='talent'&&s&&(ix.talents.get(s.id).requiresDarkSide||ix.talents.get(s.id).requiresLightSide))s.darkSideScore=c.darkSideScore;
      if(el.dataset.choice==='classChoice'){l.classChoices??=[];l.classChoices[Number(el.dataset.slot)]=s;}else if(el.dataset.choice==='feat') l.feats[Number(el.dataset.slot)]=s; else l[el.dataset.choice]=s;
    } else if(el.dataset.increase) {
      const l=c.levels[Number(el.dataset.level)]; l.abilityIncreases[Number(el.dataset.increase)]=el.value;
      l.abilityIncreases=l.abilityIncreases.map(v=>v||'');
    } else if(el.dataset.inventory) {
      const e=c.inventory[Number(el.dataset.index)];
      if(el.dataset.inventory==='braced'){try{declareBracing(c,pack,e.uid,el.checked);}catch(err){notify(err.message);}changed();return;}
      if(['attackMod','damageMod'].includes(el.dataset.inventory)&&el.dataset.number==='true'&&(!Number.isInteger(Number(el.value))||Number(el.value)<-100||Number(el.value)>100)) {notify('Attack and damage modifiers must be whole numbers from −100 to 100.');render();return;}
      if(['attackMod','damageMod'].includes(el.dataset.inventory)&&(!Number.isInteger(Number(el.value))||Number(el.value)<-100||Number(el.value)>100)){notify('Enter a valid modifier.');render();return;}
      if(el.dataset.inventory==='equipped'&&el.checked)e.carried=true;
      if(el.dataset.inventory==='carried'&&!el.checked)e.equipped=false;
      if(el.dataset.inventory==='equipped'&&el.checked&&ix.equipment.get(e.id).kind==='armor') c.inventory.filter(other=>armorExclusive(ix.equipment.get(e.id),ix.equipment.get(other.id))).forEach(other=>other.equipped=false);
      const val=el.type==='checkbox'?el.checked:['licenseStatus','weaponMode','launcher','ammunitionId','fireMode','attackStyle','scopeUid','stockPosition','ammoProfile','damageSetting','attackTechnique','targetKind'].includes(el.dataset.inventory)?el.value:Number(el.value);
      if(el.dataset.inventory==='distance'&&el.value===''){delete e.distance;changed();return;}
      if(el.dataset.inventory==='weightOverride'&&el.value===''){delete e.weightOverride;changed();return;}
      if(el.dataset.inventory==='shotsRemaining'&&el.value===''){delete e.shotsRemaining;changed();return;}
      if(el.dataset.inventory==='shotsRemaining'&&(!Number.isInteger(val)||val<0||val>ammunitionProfile(e,pack).capacity)){notify('Enter a valid shot count.');render();return;}
      if(el.dataset.inventory==='ammoProfile'){delete e.shotsRemaining;e.aimed=false;}
      if(el.dataset.inventory==='damageSetting')c.inventory.filter(item=>ix.equipment.get(item.id).kind==='weapon').forEach(item=>item.aimed=false);
      if(el.dataset.inventory==='scopeUid'&&!el.value){delete e.scopeUid;e.aimed=false;changed();return;}
      if(el.dataset.inventory==='ammunitionId'&&!el.value){delete e.ammunitionId;changed();return;}
      if(el.dataset.inventory==='distance'&&(!Number.isInteger(val)||val<0||val>100000)){notify('Enter a valid distance.');render();return;}
      if(el.dataset.inventory==='weightOverride'&&(!Number.isFinite(val)||val<0||val>1000000)){notify('Enter a valid weight.');render();return;}
      if(['damageSetting','fireMode'].includes(el.dataset.inventory))changeWeaponSetting(e,pack,el.dataset.inventory,val);
      else e[el.dataset.inventory]=val;
      if(el.dataset.inventory==='attackTechnique'&&ix.equipment.get(e.id).autofire&&!ix.equipment.get(e.id).autofireOnly){if(val==='burst-fire')e.fireMode='autofire';else if(val==='rapid-shot')e.fireMode='single';}
      if(el.dataset.inventory==='fireMode')delete e.attackTechnique;
      if(['scopeUid','stockPosition','fireMode'].includes(el.dataset.inventory))e.aimed=false;
      if(['stockPosition','fireMode','damageSetting','ammunitionId','weaponMode','equipped','activated','carried','scopeUid'].includes(el.dataset.inventory)||el.dataset.inventory==='aimed'&&val)clearBracing(c);
      if(el.dataset.inventory==='aimed'&&val)c.inventory.filter(other=>other!==e&&ix.equipment.get(other.id).kind==='weapon').forEach(other=>other.aimed=false);
      if(el.dataset.inventory==='weaponMode'&&!ix.equipment.get(e.id).modes.find(m=>m.id===val).thrown)delete e.attackStyle;
    } else return;
    changed();
  });
  document.addEventListener('submit',event=>{if(['recovery-healing','recovery-limb'].includes(event.target.id)){event.preventDefault();recoveryControls.submit(event.target);return;}if(event.target.id==='bellow-controls'){event.preventDefault();if(!actionsUI.bellow(event.target))recoveryControls.bellow(event.target);return;}if(event.target.id==='apply-damage'){event.preventDefault();const el=event.target.querySelector('[data-incoming-damage]');commitMath(el);combatControls.damage(event.target);return;}if(event.target.matches('form[data-equipment-scope]')){event.preventDefault();purchase(true,event.target);}});
  document.addEventListener('click',event=>{
    if(event.composedPath().some(node=>node.id==='lay-bar')||event.target.closest('.lay-collapse-btn,.lay-tab,.lay-handle'))return;
    if(vehiclesUI.click(event))return;
    const qualityButton=event.target.closest('[data-add-species-quality],[data-remove-species-quality]');if(qualityButton){const c=current(),s=pack.species.find(s=>s.id===c.species);if(!s.gmQualities)return;const rows=structuredClone(speciesQualities(c,s));if(qualityButton.hasAttribute('data-add-species-quality')){if(rows.length>=s.gmQualities.maximum)return;rows.push({name:'',text:''});}else rows.splice(Number(qualityButton.dataset.removeSpeciesQuality),1);c.speciesQualities??={};c.speciesQualities[s.id]=rows;changed();return;}
    if(event.target.closest('[data-reference-retry]')){loadReferences();return;}
    const rulesPage=event.target.closest('[data-rules-page]');if(rulesPage){rulesCatalog.page(rulesPage.dataset.rulesPage);$('rules-results').innerHTML=rulesCatalog.results();return;}
    const referenceLink=event.target.closest('[data-rule-reference]');
    if(referenceLink&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();openReference(referenceLink.dataset.ruleReference);return;}
    if(event.target.closest('[data-spend-destiny]')){const c=current();if(c.story?.kind==='destiny'&&c.story.points>0&&derived.level>0){spendDestinyPoint(c,derived);logEvent('resource','Destiny Point: '+c.story.points+' remaining');changed();}return;}
    const actionButton=event.target.closest('button');if(actionButton&&(actionsUI.click(actionButton,event)||actionsUI.legacy(actionButton,event)))return;
    if(event.target.closest('[data-next-turn]')){current().deflectionAttempts=0;advanceTimedTalents(current());startNextTurn(current());changed();return;}
    if(event.target.closest('[data-flurry]')){try{declareFlurry(current(),derived);}catch(err){notify(err.message);}changed();return;}
    const stance=event.target.closest('[data-defense-stance]');if(stance){try{declareDefenseStance(current(),derived,stance.dataset.defenseStance);}catch(err){notify(err.message);}changed();return;}
    const houseTab=event.target.closest('[data-house-tab]');if(houseTab){houseRules.setTab(houseTab.dataset.houseTab);render();return;}
    if(creationOptions.click(event))return;
    const classPick=event.target.closest('[data-select-class]');
    if(classPick){const id=classPick.dataset.selectClass;if(!classPick.disabled&&ix.classes.has(id)&&!(ix.species.get(current().species).forbiddenClasses||[]).includes(id)){choosePlannedClass(current(),pack,0,id);changed();}return;}
    const planRules=event.target.closest('[data-plan-rules]');
    if(planRules){$('rule-detail-title').textContent=planRules.dataset.planRulesTitle;$('rule-detail-body').innerHTML=planRules.dataset.planRules.split(',').map(id=>ix.feats.get(id)).filter(Boolean).map(r=>`<h3>${escape(r.name)}</h3>${renderArticle(r.article)}`).join('');$('rule-detail-modal').showModal();return;}
    if(event.target.closest('[data-feature-primary]')){treeTarget.secondary=false;renderTreeDialog();featureTrees.layout();return;}
    const treeClick=featureTrees.click(event);
    if(treeClick){if('selection' in treeClick){const o=treeClick.options;if(o.kind==='class'){if(treeClick.selection)selectPlanClass(o.level,treeClick.selection.id);return;}const l=current().levels[o.level],s=treeClick.selection;if(o.kind==='talent'&&s&&(ix.talents.get(s.id).requiresDarkSide||ix.talents.get(s.id).requiresLightSide))s.darkSideScore=current().darkSideScore;if(o.kind==='classChoice'){l.classChoices??=[];l.classChoices[o.slotIndex]=s;}else if(o.kind==='feat')l.feats[o.slotIndex]=s;else l[o.kind]=s;if(treeTarget&&s&&!s.pending&&ix[o.type].get(s.id)?.effects?.some(e=>e.target==='forcePowerSlots'))treeTarget.secondary=true;changed();}return;}
    const ruleLink=event.target.closest('[data-rule-page]');
    if(ruleLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      const rule=pack.rulePages.find(r=>r.id===ruleLink.dataset.rulePage);
      if(rule){referenceRequest++;event.preventDefault();$('rule-detail-title').textContent=rule.name;$('rule-detail-body').innerHTML=renderArticle(rule.article);if(!$('rule-detail-modal').open)$('rule-detail-modal').showModal();return;}
    }
    const speciesLink=event.target.closest('[data-species-detail]');
    if(speciesLink){event.preventDefault();speciesBrowser.toggle(speciesLink.dataset.speciesDetail);$('species-results').innerHTML=speciesBrowser.results(current().species);document.querySelector(`[data-species-detail="${speciesLink.dataset.speciesDetail}"]`).focus();return;}
    if(event.target.closest('#species-results')) {
      const key=event.target.closest('[data-sort]')?.dataset.sort;
      if(speciesBrowser.sort(event,()=>{$('species-results').innerHTML=speciesBrowser.results(current().species);document.querySelector(`#species-results [data-sort="${key}"]`).focus();}))return;
      const select=event.target.closest('[data-select-species]');
      if(select){current().species=select.dataset.selectSpecies;changed();return;}
    }
    const conditionRow=event.target.closest('[data-condition-step]');
    if(conditionRow){
      if(window.__layout.state.free && !window.matchMedia('(max-width: 700px)').matches) return;
      const step=Number(conditionRow.dataset.conditionStep);
      const input=$('condition-level');input.value=String(current().condition===step ? Math.max(0,step-1) : step);
      input.dispatchEvent(new Event('change',{bubbles:true}));
      if(event.target.closest('button')) queueMicrotask(()=>document.querySelector(`#condition-effect button[data-condition-step="${step}"]`)?.focus({preventScroll:true}));
      return;
    }
    const el=event.target.closest('button'); if(!el) return;
    if(combatControls.click(el))return;
    if(recoveryControls.click(el))return;
    if(el.hasAttribute('data-energy-activate')||el.hasAttribute('data-energy-recharge')){try{if(el.dataset.energyActivate){activateEnergyShield(current(),derived,pack,el.dataset.energyActivate);logEvent('resource','Energy Shield: Activate (Swift Action)');}else{const r=rechargeEnergyShield(current(),derived,pack,el.dataset.energyRecharge);logEvent('roll',`Shield recharge: Mechanics ${r.roll.value}; SR ${r.before} → ${r.after}`,`${r.roll.display} = ${totalHtml(r.roll)}; SR ${r.before} → ${r.after}`);}changed();}catch(error){notify(error.message);}return;}
    if(starshipManeuversUI.click(el)||forcePowersUI.click(el))return;
    const c=current();
    if(el.hasAttribute('data-plan-add')){resizeLevelPlan(c,pack,Math.min(20,c.levels.length+1));changed();return;}
    if(el.hasAttribute('data-plan-select-class')&&classRequirementTarget){selectPlanClass(classRequirementTarget.level,classRequirementTarget.id);return;}
    if(el.dataset.startingEquipment){try{claimStartingEquipment(c,pack,el.dataset.startingEquipment);changed();}catch(error){notify(error.message);}return;}
    if(el.dataset.openTree){
      const [kind,rawLevel,rawSlot]=el.dataset.openTree.split(':'),level=Number(rawLevel),slotIndex=Number(rawSlot);
      featureTrees.foldAll();treeTarget={level,kind,slotIndex};$('feature-tree-modal').showModal();renderTreeDialog();if($('creator-modal').open)featureTrees.layout();requestAnimationFrame(()=>featureTrees.layout());return;
    }
    if(el.dataset.removeKnowledge){
      const scope=el.dataset.removeKnowledge, id=el.dataset.knowledgeId, key=knowledgeKey(scope);
      if(id)replaceTraining(scope,trainingList(scope).filter(skill=>skill!==id));
      else knowledgeDrafts.set(key,Math.max(0,(knowledgeDrafts.get(key)||0)-1));
      changed();return;
    }
    if(el.dataset.addKnowledge){const key=knowledgeKey(el.dataset.addKnowledge);knowledgeDrafts.set(key,(knowledgeDrafts.get(key)||0)+1);changed();return;}
    if(el.dataset.crmethod){setGenerationMethod(c,el.dataset.crmethod,pack);changed();return;}
    if(speciesChecks.click(el,resolveSpecies(c,pack)))return;
    if(el.dataset.damage){const rolled=evalExpr(el.dataset.damage);logEvent('roll',`${el.dataset.rollLabel}: ${el.dataset.damage} = ${rolled.value}`,`${escape(el.dataset.rollLabel)}: ${rolled.display} = ${totalHtml(rolled)}`);return;}
    if(el.hasAttribute('data-roll') && !el.classList.contains('die')){const die=d(20),bonus=Number(el.dataset.roll),total=die+bonus;logEvent('roll',`${el.dataset.rollLabel}: ${die} ${signed(bonus)} = ${total}`,`${escape(el.dataset.rollLabel)}: ${dieHTML(die,20)} ${signed(bonus)} = ${totalHtml({value:total,coeffs:[1]})}`);return;}
    if(el.hasAttribute('data-remove-item')){const [removed]=c.inventory.splice(Number(el.dataset.removeItem),1);for(const item of c.inventory)if(item.scopeUid===removed.uid){delete item.scopeUid;item.aimed=false;}changed();return;}
    switch(el.dataset.action){
      case 'manage-vehicles':openEditor('vehicles');return;
      case 'manage-maneuvers':openEditor('maneuvers');return;
      case 'manage-powers':openEditor('powers');return;
      case 'clear-log': if(store.roster.logs) delete store.roster.logs[c.id];store.schedule();paintLogs();return;
      case 'roll-abilities': {if(resolveSpecies(c,pack).fixedAbilities)break;const count=activeAbilities(c,pack).length,sets=Array.from({length:count},()=>{const dice=[d(6),d(6),d(6),d(6)].sort((a,b)=>b-a);return {dice,value:dice.slice(0,3).reduce((a,b)=>a+b)};});setRolledPool(c,sets.map(s=>s.value),pack);logEvent('roll',`Ability scores: 4d6 drop lowest ×${count}: ${sets.map(s=>`${s.value} (${s.dice.join(',')})`).join(' | ')}`,`Ability scores: 4d6 drop lowest ×${count}: ${sets.map((s,i)=>`${totalHtml({value:s.value,coeffs:[1],rollId:i+1})} (${s.dice.map((value,j)=>dieHTML(value,6,`data-roll="${i+1}" data-ops="kh3"`,j===3)).join(', ')})`).join(' | ')}`);break;}
      case 'starting-credits': {if(!canRollStartingCredits(c))return;const r=claimStartingCredits(c,pack,d);if(r.average)logEvent('resource',`${r.amount} credits`);else logEvent('roll',`${r.rolls.join(' + ')} × ${r.multiplier} = ${r.amount} credits`,`${r.rolls.map(value=>dieHTML(value,r.sides)).join(' + ')} × ${r.multiplier} = ${totalHtml({value:r.amount,coeffs:[r.multiplier]})} credits`);break;}
      case 'add-gear': purchase(false,el.closest('form'));return;
      case 'force-point-roll': {if(derived.forceCurrent<=0||derived.incapacitated)return;const expr=`${derived.forcePointDice}d${derived.forcePointDie}kh1`,r=evalExpr(expr);c.forcePoints--;logEvent('roll',`Force Point: ${expr} = ${r.value}`,`Force Point: ${r.display} = ${totalHtml(r)}`);break;}
      case 'add-level': {const draft=nextClassDraft(),cls=ix.classes.get(draft.classId);if(!classEntry(cls,derived.ctx,ix,{...draft,acquisitionDSS:c.darkSideScore}).available){notify('Class prerequisites are not met');return;} c.levels.push({classId:cls.id,...(cls.classType==='prestige'?{entryDeclarations:{...draft.entryDeclarations},acquisitionDSS:c.darkSideScore}:{}),hpRoll:Math.floor(cls.hitDie/2)+1,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});advancementDrafts.delete(c.id);c.forcePoints=forcePoolAfterAdvancement(c,derive(c,pack),{gained:true});if(c.story?.kind==='destiny')c.story.points=Math.min(c.levels.length,c.story.points+1);break;}
      case 'undo-level': confirmDelete('Remove last level?',`Remove level ${c.levels.length} and its choices.`,()=>{c.levels.pop();if(c.story?.kind==='destiny')c.story.points=Math.min(c.story.points,c.levels.length);changed();});return;
      default:return;
    }
    changed();
  });
  $('roster').addEventListener('click',event=>{
    const del=event.target.closest('[data-delid]');
    if(del){const id=del.dataset.delid,c=store.roster.characters.find(c=>c.id===id);if(c&&store.roster.characters.length>1)confirmDelete('Delete character?',c.name||'unnamed',()=>{store.remove(id);render();});return;}
    const el=event.target.closest('[data-character]');if(el){speciesChecks?.invalidate();store.switch(el.dataset.character);render();}
  });
  $('new-character').onclick=()=>{store.add();creatorStep=0;render();location.hash='creation';openEditor('creation');};
  $('duplicate').onclick=()=>{store.duplicate();render();};
  $('export-character').onclick=()=>downloadJSON(current(),`${current().name.replace(/[^a-z0-9-]+/gi,'-')||'hero'}.json`);
  $('import-character').onchange=async event=>{const file=event.target.files[0];try{if(file){if(file.size>2000000)throw new Error('Character files must be smaller than 2 MB');store.import(await file.text());render();notify('Character imported.');}}catch(error){notify(error.message);}finally{event.target.value='';}};
  $('recovery').onclick=()=>{downloadJSON(store.recovery,'wkolon-recovery.json');recoveryExported=true;render();};
  $('replace-storage').onclick=()=>confirmDelete('Replace damaged storage?', 'Replace the damaged browser data with the current roster. Keep your exported recovery file.',()=>{store.unlockAfterRecovery();render();});
  installStatBlock({current,derived:()=>derive(current(),pack),pack,closeEditor,notify});
  window.addEventListener('hashchange',route);
  document.addEventListener('click',event=>{
    const houseTab=event.target.closest('[data-house-tab]');if(houseTab){houseRules.setTab(houseTab.dataset.houseTab);render();return;}const link=event.target.closest('a[href^="#"]');if(link&&SECTIONS.includes(link.hash.slice(1))&&link.hash===location.hash&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();route();}});
  $('cr-stepper').onclick=event=>{const tab=event.target.closest('[data-step]');if(tab && validCreatorInput()){creatorStep=Number(tab.dataset.step);$('cr-body').scrollTop=0;renderEditor();}};
  $('cr-prev').onclick=()=>{if(!validCreatorInput())return;creatorStep--; $('cr-body').scrollTop=0;renderEditor();};
  $('cr-next').onclick=()=>{if(!validCreatorInput())return;creatorStep++; $('cr-body').scrollTop=0;renderEditor();};
  $('cr-close').onclick=$('cr-done').onclick=closeEditor;
  $('creator-modal').addEventListener('close',()=>{const needsRender=editorMode!==null;editorMode=null;location.hash='overview';store.flush();if(needsRender)render();returnFocus?.focus();});
  document.addEventListener('keydown',event=>{if(event.key==='Enter' && event.target.id==='cmd-input'){event.preventDefault();runCommand(event.target.value);event.target.value='';}});
  window.getRollEntries=logEntries;window.escapeRollText=escape;window.renderRollEntry=rollEntryHTML;window.runCommand=runCommand;
}
async function boot(){
  try{
    const response=await fetch(new URL('../data/core.json',import.meta.url));if(!response.ok)throw new Error(`Rules could not load (${response.status})`);
    pack=await response.json();ix=indexPack(pack);creationOptions=createCreationOptions(pack);houseRules=createHouseRules(pack);rulesCatalog=createRulesCatalog(pack);speciesBrowser=createSpeciesBrowser(pack);featureTrees=createFeatureTrees(pack);store=createStore(pack,status);speciesChecks=createSpeciesChecks({current,derived:()=>derived,log:(kind,text,html)=>{render();logEvent(kind,text,html,true);}});combatControls=createCombatControls(pack,{current,derived:()=>derived,changed,save:()=>store.schedule(),log:logEvent,error:notify});recoveryControls=createRecoveryControls(pack,{current,derived:()=>derived,changed,log:logEvent,error:notify});forcePowersUI=createForcePowers(pack,{current,derived:()=>derived,changed,log:logEvent,error:notify,roll:bonus=>{const expr='1d20'+signed(bonus),r=evalExpr(expr);return {natural:r.d20[0],text:expr+' = '+r.value,html:r.display+' = '+totalHtml(r)};}});vehiclesUI=createVehiclesUI(pack,{current,changed,save:()=>store.schedule(),error:notify,library:referenceLibrary,refresh:html=>document.querySelectorAll('[data-vehicle-results]').forEach(el=>el.innerHTML=html)});starshipManeuversUI=createStarshipManeuvers(pack,{current,derived:()=>derived,changed,error:notify});actionsUI=createActionsUI(pack,{current,derived:()=>derived,changed,log:logEvent,error:notify});droidSystemsUI=createDroidSystemsUI(pack,{current,derived:()=>derived,changed,error:notify,reference:ruleReference});events();render();route();
    if(!saveState[1])status('Saved',false);
  }catch(error){$('main').innerHTML=`<h1>Unable to open the sheet</h1><p>${escape(error.message)}</p><p><a href="./">Reload</a></p>`;status('Sheet unavailable',true);}
}
boot();
