import {validateRagePowers,ragePowerModifiers,rageBlockedSkills} from './rage-powers.js';
import {validateJump} from './jump.js';
import {validateMovementPowerEffects,movementPowerBonuses} from './movement-powers.js';
import {validateSelfPowerEffects,battleStrike,withBattleStrike} from './self-power-effects.js';
import {validateTimedTalents,activeTimedTalents} from './timed-talents.js';
import {validateTurnFeatEffects,turnFeatAttackEffects} from './turn-feat-effects.js';
import {validateBonusHP,toughAsDurasteelLevel} from './bonus-hit-points.js';
import {validateTurnTalents,turnTalentEffects} from './turn-talents.js';
import {modifierTotal,resolveModifiers} from './modifiers.js';
import {validateTalentActivations,encounterTalentEffects} from './talent-activations.js';
import {validateOwnedVehicles} from './vehicles.js';
import {validateStarshipManeuvers} from './starship-maneuvers.js';
import {ABILITIES,activeAbilities,abilityRecord,standardArray,validateDroidAbilities} from './ability-profiles.js';
import {validateSpeciesCustomizations,customizationIssues} from './species-customization.js';
import {naturalWeapons,increaseNaturalDie,validateNaturalModifiers} from './natural-weapons.js';
import {validateActionState} from './action-economy.js';
import {activeLightsabers,powerActions} from './power-activation.js';
import {defenseAbilityDetails,thresholdDetails,validateDefenseAbilities} from './defense-abilities.js';
import {teamSkillDetails,validateTeamAllies} from './team-skills.js';
import {isPrestige,classMaximum,hasClassTalent,hasClassBonusFeat,classEntry,validateClassAcquisition,advancementForceBase,validateClassBans} from './class-advancement.js';
import {activeShields,shieldRestrictions,validateEnergyShield} from './energy-shields.js';
import {wornArmor,armorProficient,armorSkillBonus,armorPenalty as armorCheckPenalty,armorVision,armorConditionalDefenses,armorStrengthCheck,armorCircumstance,combineArmorDefenses,validateArmorChecks,armorProtection} from './armor.js';
import {emptyTraits, emptyStory, activeBackground, validateFinishing} from './heroic-traits.js';
import {emptyProtection,validateCombatState} from './combat.js';
import {counselingEnabled,ambiguityValue,validateHouseRules} from './house-rules.js';
import {resolveEquipment,validateInventoryOptions,validateStartingEquipment,validateAttachments,attachedScope} from './equipment.js';
import {featureChoices,WEAPON_GROUPS,UNARMED_ID,talentTreeIds,resolveFeatureSelection} from './feature-choices.js';
import {unarmedWeapon,weaponRange,canAim} from './weapon-rules.js';
import {ammunitionState,validateAmmunition} from './ammunition.js';
import {carryingLimits} from './species-rules.js';
import {recoveryState,recoveryDetails,validateRecovery} from './recovery.js';
import {attackTechnique,extraDamageDice,validateAttackTechnique,bracingState,validateBracing,powerAttackState,powerAttackBonuses} from './attack-techniques.js';
import {fullAttackState,fullAttackGrip} from './full-attacks.js';
import {defensiveCombatState,defensiveConditionalTotals,flurryState} from './defensive-combat.js';
import {weaponCanOpportunity} from './opportunity.js';
import {balanceFlatFooted} from './balance.js';
import {applyAttackTarget,canAimAtTarget} from './attack-targets.js';
import {resolveSpecies,speciesChoiceDetails,validateSpeciesChoices} from './species-choices.js';
import {validateSpeciesProfileCharacter,speciesPowerIssue,eligibleSpeciesPowers,speciesQualities} from './species-profiles.js';
import {droidSystemsState,droidCarryingWeight,droidAppendageWeapons,validateDroidInstallation} from './droid-installation.js';
export {ABILITIES};
export const GROUPS = WEAPON_GROUPS;
export const modifier = score => score===null?0:Math.floor((score - 10) / 2);
export const signed = n => n >= 0 ? `+${n}` : String(n);
export const selectionKey = s => `${s.id}:${s.choice || ''}`;
const F = name => `feat:${name}`;

export function indexPack(pack) {
  return Object.fromEntries(['species', 'classes', 'skills', 'feats', 'talents', 'equipment', 'destinies', 'backgrounds','forcePowers','starshipManeuvers','vehicles','classChoices'].map(key => [key, new Map((pack[key]||[]).map(r => [r.id, r]))]));
}

export function newCharacter(pack, {classId=null}={}) {
  const cls=classId===null?null:pack.classes.find(r=>r.id===classId&&r.classType!=='prestige');
  if(classId!==null&&!cls)throw new Error('Choose a base class');
  const placeholder=pack.classes.find(r=>r.classType!=='prestige');
  return {
    schemaVersion: 1, ruleset: {id: pack.id, version: pack.version},
    id: crypto.randomUUID(), name: 'unnamed', player: '', species: 'species:human',
    abilityMethod: 'standard', abilities: Object.fromEntries(ABILITIES.map((a, i) => [a, pack.rules.standardArray[i]])),
    pointBudget: 25, trainedSkills: [],
    levels: [{classId: cls?.id||placeholder.id, ...(!cls?{pendingClass:true}:{}), hpRoll: null, feats: [], talent: null, startingFeat: null, abilityIncreases: [], trainedSkills: []}],
    inventory: [], credits: 0, currentHP: null, forcePoints: cls?(advancementForceBase(cls,pack)??0):0, condition: 0,
    protection:emptyProtection(),routines:[],xp:0,darkSideScore:0,
    languages: '', notes: '', heroicTraits: emptyTraits(), story: emptyStory('none'), modifiers: {reflex: 0, fortitude: 0, will: 0, hp: 0, threshold: 0, attack: 0, damage: 0},
  };
}

export function validateCharacter(c, pack) {
  const bad = message => { throw new Error(`Invalid character: ${message}`); };
  const obj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const num = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
  if (!obj(c) || c.schemaVersion !== 1 || !obj(c.ruleset) || c.ruleset.id !== pack.id || c.ruleset.version !== pack.version) bad('unsupported file or rules pack version');
  const ix = indexPack(pack);
  if(c.forceTraditions!==undefined){
    const records=pack.rules.traditionTalentAccess||[];
    if(!Array.isArray(c.forceTraditions)||c.forceTraditions.length>records.length||new Set(c.forceTraditions.map(s=>s?.id)).size!==c.forceTraditions.length||c.forceTraditions.some(s=>!obj(s)||Object.keys(s).some(k=>!['id','level','darkSideScore'].includes(k))||!records.some(r=>r.id===s.id)||!num(s.level,1,20)||!num(s.darkSideScore,0,1000)))bad('Force Tradition memberships');
  }
  for (const key of ['id', 'name', 'player', 'languages', 'notes']) if (typeof c[key] !== 'string' || c[key].length > 100000) bad(key);
  if (!/^[a-f0-9-]{36}$/.test(c.id)) bad('character ID');
  if (!ix.species.has(c.species)) bad('unknown species');
  validateOwnedVehicles(c,pack,bad);
  validateTalentActivations(c,pack,bad);
  validateSpeciesChoices(c,pack,bad);
  validateSpeciesCustomizations(c,pack,bad);
  if (!['standard', 'point-buy', 'manual', 'rolled'].includes(c.abilityMethod)) bad('ability method');
  if (!obj(c.abilities) || !ABILITIES.every(a => num(c.abilities[a], 3, 30))) bad('ability scores');
  if (c.abilityGeneration !== undefined) {
    const g=c.abilityGeneration;
    if (!obj(g) || !Array.isArray(g.pool) || ![0,6].includes(g.pool.length) || !g.pool.every(n=>num(n,3,c.abilityMethod==='rolled'?18:30)) || !obj(g.assign)) bad('ability generation');
    if (c.abilityMethod==='standard' && g.pool.join()!==pack.rules.standardArray.join()) bad('standard score pool');
    if(c.abilityMethod!=='rolled' && g.pool.length!==6) bad('ability score pool');
    const used=[];
    for(const a of ABILITIES) {
      const i=g.assign[a];
      if (!(i===null || num(i,0,g.pool.length-1)) || c.abilities[a] !== (i===null?10:g.pool[i])) bad('ability assignment');
      if(i!==null) used.push(i);
    }
    if(new Set(used).size!==used.length) bad('duplicate ability assignment');
  }
  validateDroidAbilities(c,pack,bad);
  if (!num(c.pointBudget, 0, 100)) bad('point budget');
  const skillList = v => Array.isArray(v) && v.length <= pack.skills.length && new Set(v).size === v.length && v.every(id => ix.skills.has(id));
  if (!skillList(c.trainedSkills)) bad('trained skills');
  const choice = (s, type) => s === null || (obj(s) && ix[type].has(s.id) && (!('choice' in s) || typeof s.choice === 'string') && (!('pending' in s) || typeof s.pending === 'boolean') && (!('manualRequirements' in s) || typeof s.manualRequirements === 'boolean') && (!('choice' in s) || s.choice.length<=307));
  validateClassBans(c,ix,bad);
  if (!Array.isArray(c.levels) || c.levels.length < 1 || c.levels.length > 20) bad('levels');
  for (const [i, l] of c.levels.entries()) {
    if (!obj(l) || !ix.classes.has(l.classId) || (i && !num(l.hpRoll, 1, ix.classes.get(l.classId).hitDie))) bad('class or HP roll');
    if(l.pendingClass!==undefined&&typeof l.pendingClass!=='boolean')bad('pending class');
    validateClassAcquisition(l,ix.classes.get(l.classId),bad,ix);
    if(!i&&isPrestige(ix.classes.get(l.classId)))bad('prestige starting class');
    if (!Array.isArray(l.feats) || l.feats.length > 4 || !l.feats.every(s => choice(s, 'feats')) || !choice(l.talent, 'talents') || !choice(l.startingFeat, 'feats')) bad('level choices');
    if (!Array.isArray(l.abilityIncreases) || l.abilityIncreases.length > 2 || !l.abilityIncreases.every(a => a === '' || ABILITIES.includes(a)) || !skillList(l.trainedSkills)) bad('level ability/skill choices');
    if(l.talent?.darkSideScore!==undefined&&!num(l.talent.darkSideScore,0,1000))bad('talent acquisition DSS');
    if(l.talent&&!l.talent.pending&&ix.talents.get(l.talent.id).requiresDarkSide&&!num(l.talent.darkSideScore,1,1000))bad('talent acquisition DSS');
    if(l.talent&&!l.talent.pending&&ix.talents.get(l.talent.id).requiresLightSide&&l.talent.darkSideScore!==0)bad('talent acquisition DSS');
  }
  validateStarshipManeuvers(c,pack,bad);
  const powerIds=new Set();
  for(const l of c.levels)if(l.forcePowers!==undefined){
    if(!Array.isArray(l.forcePowers)||l.forcePowers.length>200)bad('Force powers');
    for(const p of l.forcePowers){if(!obj(p)||Object.keys(p).some(k=>!['id','powerId','spent','action'].includes(k))||typeof p.id!=='string'||!/^[a-f0-9-]{36}$/.test(p.id)||powerIds.has(p.id)||!ix.forcePowers.has(p.powerId)||typeof p.spent!=='boolean')bad('Force power copy');if(p.action!==undefined&&!powerActions(ix.forcePowers.get(p.powerId)).includes(p.action))bad('Force power action');powerIds.add(p.id);}
  }
  if(c.forcePowerRecoveryPending!==undefined&&typeof c.forcePowerRecoveryPending!=='boolean')bad('Force power recovery');
  validateArmorChecks(c,bad);
  if(c.flatFooted!==undefined&&typeof c.flatFooted!=='boolean')bad('flat-footed state');
  if(c.cybernetic!==undefined&&typeof c.cybernetic!=='boolean')bad('cybernetic state');
  if(c.mightySwing!==undefined&&typeof c.mightySwing!=='boolean')bad('Mighty Swing');
  if(c.powerAttack!==undefined&&!num(c.powerAttack,0,20))bad('Power Attack');
  if(c.skillModifiers!==undefined&&(!obj(c.skillModifiers)||Object.entries(c.skillModifiers).some(([id,n])=>!ix.skills.has(id)||!num(n,-1000,1000))))bad('skill modifiers');
  validateTurnTalents(c,pack,bad);
  validateBonusHP(c,bad);
  validateTurnFeatEffects(c,pack,bad);
  validateTimedTalents(c,pack,bad);
  validateSelfPowerEffects(c,pack,bad);
  validateMovementPowerEffects(c,pack,bad);
  validateRagePowers(c,pack,bad);
  validateJump(c,bad);
  validateNaturalModifiers(c,pack,bad);
  if(c.unarmedModifiers!==undefined){
    if(!obj(c.unarmedModifiers)||Object.keys(c.unarmedModifiers).some(k=>!['attackMod','damageMod','attackTechnique','targetKind'].includes(k))||!['attackMod','damageMod'].every(k=>num(c.unarmedModifiers[k],-100,100))||c.unarmedModifiers.targetKind!==undefined&&!['creature','object','vehicle'].includes(c.unarmedModifiers.targetKind))bad('unarmed modifiers');
    validateAttackTechnique(c.unarmedModifiers,pack,bad,true);
  }
  if (!Array.isArray(c.inventory) || c.inventory.length > 1000 || !c.inventory.every(e => obj(e) && ix.equipment.has(e.id) && num(e.quantity, 1, 999) && typeof e.equipped === 'boolean' && typeof e.twoHanded === 'boolean' && num(e.attackMod, -100, 100) && num(e.damageMod, -100, 100))) bad('inventory');
  c.inventory.forEach(e=>validateInventoryOptions(e,pack,bad));
  validateDroidInstallation(c,pack,bad);
  validateSpeciesProfileCharacter(c,pack,bad);
  c.inventory.forEach(e=>validateAmmunition(e,pack,bad));
  c.inventory.forEach(e=>validateEnergyShield(e,ix.equipment.get(e.id),bad));
  c.inventory.forEach(e=>validateAttackTechnique(e,pack,bad));
  validateBracing(c,pack,bad);
  validateStartingEquipment(c,pack,bad);
  validateAttachments(c,pack,bad);
  if(c.mechanicalSkills!==undefined&&!skillList(c.mechanicalSkills))bad('mechanical tool checks');
  if(c.skillCheckSources!==undefined&&(!obj(c.skillCheckSources)||Object.entries(c.skillCheckSources).some(([id,source])=>!ix.skills.has(id)||!ix.skills.has(source))))bad('skill check sources');
  validateHouseRules(c,pack,bad);
  validateDefenseAbilities(c,bad);validateTeamAllies(c,pack,bad);
  validateRecovery(c,bad);
  if (!Number.isFinite(c.credits)||c.credits<0||c.credits>1000000000 || !num(c.forcePoints, 0, 1000) || !num(c.condition, 0, 5) || !(c.currentHP === null || num(c.currentHP, 0, 100000))) bad('play state');
  if (!obj(c.modifiers) || !['reflex', 'fortitude', 'will', 'hp', 'threshold', 'attack', 'damage'].every(k => num(c.modifiers[k], -1000, 1000))) bad('modifiers');
  validateFinishing(c,pack,bad);
  validateCombatState(c,bad);
  validateActionState(c,bad);
  return c;
}

export function classSkills(ctx, ix) {
  const skills = new Set([...ctx.classLevels.keys()].flatMap(id => ix.classes.get(id).skills));
  (ctx.backgroundSkills||[]).forEach(id=>skills.add(id));
  (ctx.speciesClassSkills||[]).forEach(id=>skills.add(id));
  for(const selection of ctx.talents||[])if(!ctx.inactiveTalents?.has(selection.id)&&(!ix.classes.get(selection.classId)?.continuousDarkSide||ctx.darkSideScore>=ctx.scores.wis))for(const effect of ix.talents.get(selection.id)?.effects||[])if(effect.target==='classSkill')skills.add(effect.skill);
  if (!ctx.forceImmune && !ctx.forceRestrictions?.forbidChecks && ctx.feats.some(f => f.id === F('force-sensitivity'))) skills.add('skill:use-the-force');
  if(ctx.forceImmune||ctx.forceRestrictions?.forbidChecks)skills.delete('skill:use-the-force');
  return skills;
}

export function prerequisite(p, ctx, ix, choice) {
  const value = p.value === '$choice' ? choice : p.value;
  switch (p.kind) {
    case 'all': return p.requirements.every(r => prerequisite(r, ctx, ix, choice));
    case 'any': return p.requirements.some(r => prerequisite(r, ctx, ix, choice));
    case 'ability': return Number.isInteger(ctx.scores[value]) && ctx.scores[value] >= p.min;
    case 'feat': return ctx.feats.some(f => f.id === value);
    case 'featChoice': return ctx.feats.some(f=>f.id===value&&f.choice===(p.choice??choice));
    case 'trait': return ctx.traits?.includes(value)||false;
    case 'size': return !!ctx.sizeOrder&&ctx.sizeOrder.indexOf(ctx.size)>=ctx.sizeOrder.indexOf(value);
    case 'species': return ctx.speciesName?.replace(/ \([^)]*\)$/,'')===value;
    case 'talent': return !ctx.inactiveTalents?.has(value)&&ctx.talents.some(t => t.id === value);
    case 'talentChoice': return ctx.talents.some(t=>!ctx.inactiveTalents?.has(t.id)&&(t.id===value||ix.talents.get(t.id)?.repeatGroup===value)&&(ix.talents.get(t.id)?.weaponGroup||t.choice)===(p.choice==='$choice'?choice:p.choice));
    case 'power': return ctx.forcePowers?.some(p=>p.powerId===value)||false;
    case 'darkSideScore': return (ctx.darkSideScore||0)>=p.min&&(p.max===undefined||(ctx.darkSideScore||0)<=p.max);
    case 'trained': return ctx.trained.has(value);
    case 'untrained': return !ctx.trained.has(value);
    case 'classSkill': return classSkills(ctx, ix).has(value);
    case 'bab': return ctx.bab >= p.min;
    case 'level': return ctx.characterLevel >= p.min;
    case 'classChoices': return (ctx.classChoices||[]).filter(s=>s.kind===p.value&&!ctx.inactiveClasses?.has(s.classId)).length>=p.min;
    case 'tradition': return ctx.forceTraditions?.has(value)||false;
    case 'nonDroid': return !ctx.isDroid;
    case 'droid': return !!ctx.isDroid;
    case 'weaponFocusMode': return ctx.feats.some(f=>f.id===F('weapon-focus')&&[{id:UNARMED_ID,kind:'weapon',mode:'melee',group:'simple-weapons',unarmed:true},...ix.equipment.values()].some(w=>w.kind==='weapon'&&w.mode===value&&weaponEffectGroup(w,ctx)===f.choice));
    case 'weaponProficiencyMode': return [...ix.equipment.values()].some(w=>w.kind==='weapon'&&w.mode===value&&!p.excludedGroups.includes(w.group)&&weaponProficient(w,ctx,ix));
    case 'proficientChoice': return value===UNARMED_ID?weaponProficient({id:value,group:'simple-weapons',unarmed:true},ctx,ix):ix.equipment.has(value)?weaponProficient(ix.equipment.get(value),ctx,ix):ctx.feats.some(f=>ix.feats.get(f.id)?.weaponGroup===value)||counselingEnabled(ctx,'jc:112-weapon-focus-proficiency')&&[...ix.equipment.values()].some(w=>w.kind==='weapon'&&weaponEffectGroup(w,ctx)===value&&weaponProficient(w,ctx,ix));
    case 'focusChoice': return ctx.feats.some(f => f.id === F('weapon-focus') && f.choice === value);
    default: throw new Error(`Unsupported prerequisite: ${p.kind}`);
  }
}

export function eligible(record, selection, ctx, ix, type, {ignoreManual=false}={}) {
  if (!record || selection.pending) return false;
  selection=resolveFeatureSelection(record,selection,{talents:[...ix.talents.values()]});
  if(record.manualPrerequisites?.length&&!selection.manualRequirements&&!ignoreManual)return false;
  if(record.requiresLightSide&&ctx.darkSideScore!==0)return false;
  if((ctx.forceImmune||ctx.forceRestrictions?.forbidSensitivity)&&record.id===F('force-sensitivity'))return false;
  if(record.forceActivation&&counselingEnabled(ctx,'jc:106-jedi-multiclassing')&&!ctx.feats.some(f=>f.id===F('force-sensitivity')))return false;
  if (record.choiceType === 'skill' && !ix.skills.has(selection.choice)) return false;
  if(record.choiceType==='manual'&&!(typeof selection.choice==='string'&&selection.choice.startsWith('manual:')&&selection.choice.slice(7).trim()&&selection.choice.length<=307&&!/[\r\n|]/.test(selection.choice)))return false;
  if (record.choiceType && record.choiceType!=='manual' && !featureChoices(record,{skills:[...ix.skills.values()],equipment:[...ix.equipment.values()],forcePowers:[...ix.forcePowers.values()],talents:[...ix.talents.values()]}).includes(selection.choice)) return false;
  if(record.choiceType==='weaponGroup'&&ix.equipment.has(selection.choice)&&weaponEffectGroup(ix.equipment.get(selection.choice),ctx)!==selection.choice)return false;
  if(record.choiceType==='talent'){const chosen=ix.talents.get(selection.choice);if(!chosen||chosen.choiceType||chosen.repeat!=='never'||chosen.effects.some(e=>e.target==='chosenTalent')||!prerequisite(chosen.prerequisite,ctx,ix)||chosen.manualPrerequisites?.length&&!selection.manualRequirements)return false;}
  const existing = ctx[type];
  if(record.exclusiveGroup&&existing.some(s=>ix[type].get(s.id)?.exclusiveGroup===record.exclusiveGroup))return false;
  if(record.maxSelections&&existing.filter(s=>s.id===record.id).length>=record.maxSelections)return false;
  if (record.repeat === 'never' && existing.some(s => s.id === record.id)) return false;
  if (record.repeat === 'choice' && existing.some(s => {
    const prior=ix[type].get(s.id);
    return (prior.repeatGroup||prior.id)===(record.repeatGroup||record.id)&&(prior.weaponGroup||s.choice||'').toLocaleLowerCase()===(record.weaponGroup||selection.choice||'').toLocaleLowerCase();
  })) return false;
  return prerequisite(record.prerequisite, ctx, ix, selection.choice);
}

export function weaponProficient(w,ctx,ix){
 if(w.group?.startsWith('exotic-')&&ctx.talents.some(t=>t.id==='talent:exotic-weapon-mastery'&&!ctx.inactiveTalents?.has(t.id)))return true;
 if(w.unarmed&&counselingEnabled(ctx,'jc:112-unarmed-weapon-group'))return true;
 if(ctx.feats.some(f=>f.id===F('exotic-weapon-proficiency')&&f.choice===w.id))return true;
 const group=ctx.weaponFamiliarity?.[w.id]||w.group;
 return !!group&&ctx.feats.some(f=>ix.feats.get(f.id)?.weaponGroup===group);
}

export function talentTrees(cls,ctx,pack){
 return [...cls.talentTrees,...(ctx.isDroid?ctx.droidTalentTrees||[]:[]),...(!ctx.forceImmune&&ctx.feats.some(f=>f.id===F('force-sensitivity'))?[...(pack.rules.forceTalentAccess?.trees||[]),...(pack.rules.traditionTalentAccess||[]).filter(r=>ctx.forceTraditions?.has(r.id)).map(r=>r.tree)]:[])];
}

const weaponEffectGroup=(w,ctx)=>counselingEnabled(ctx,'jc:112-weapon-familiarity-with-feats-and-talents')?ctx.weaponFamiliarity?.[w.id]||(w.group?.startsWith('exotic-')?w.id:w.group):w.group?.startsWith('exotic-')?w.id:w.group;

export function levelSlots(levelNumber, classLevel, species, cls, pack) {
  const slots = [];
  if (pack.rules.generalFeatLevels.includes(levelNumber)) slots.push({kind: 'general', label: 'Heroic feat'});
  if (levelNumber === 1) for (let i = 0; i < species.bonusFeats; i++) slots.push({kind: 'general', label: 'Species feat'});
  if (hasClassBonusFeat(cls,classLevel)) slots.push({kind: 'bonus', label: `${cls.name} bonus feat`, classId: cls.id});
  return slots;
}

// Replay choices in order. Invalid or unearned selections never contribute effects.
export function progression(c, pack, through = c.levels.length) {
  const ix = indexPack(pack), species = resolveSpecies(c,pack);
  const background=activeBackground(c,pack);
  const ctx = {isDroid:!!species.isDroid, backgroundSkills:new Set(background?(c.story.skills||[]).filter(id=>background.relevantSkills.includes(id)):[]), scores: Object.fromEntries(ABILITIES.map(a => [a, species.noConstitution&&a==='con'?null:Math.max(species.noConstitution?pack.rules.droidAbilities.minimumScore:-Infinity,(species.fixedAbilities?.[a]??abilityRecord(c,pack).abilities[a])+(species.abilityAdjustments[a]||0))])), classLevels: new Map(), feats: [], talents: [], features: [], trained: new Set(), bab: 0};
  Object.assign(ctx,{characterLevel:0,classBans:c.classBans||[],classChoices:[],classFeatures:[],speciesName:species.name,speciesClassSkills:species.bonusClassSkills||[],forbiddenClasses:species.forbiddenClasses||[],forceTalentTrees:pack.rules.forceTalentAccess.trees,droidTalentTrees:species.droidTalentTrees||[],forceImmune:!!species.forceImmune,weaponFamiliarity:species.weaponFamiliarity||{},houseRules:c.houseRules,traits:species.traits||[],size:species.size,sizeOrder:pack.rules.weaponSizeOrder});
  Object.assign(ctx,{darkSideScore:c.darkSideScore||0,inactiveTalents:new Set(),forcePowers:[],powerSlots:0,starshipManeuvers:[],maneuverSlots:0,speciesTraining:new Set()});
  ctx.forceRestrictions=species.forceRestrictions||{};
  ctx.unproficientArmorPenalties=species.unproficientArmorPenalties;
  const issues = [], rows = [], ordinaryTraining=new Set(),talentTraining=new Map();
  for(const [a,score]of Object.entries(ctx.scores))if(score<0)issues.push(a.toUpperCase()+' score is below 0');
  ctx.forceTraditions=new Set();
  ctx.forceTalentTrees=[...ctx.forceTalentTrees,...(pack.rules.traditionTalentAccess||[]).map(r=>r.tree)];
  let initialClassSkills;
  function recordFeature(selection,type,level) {
    const s={...selection,level,classId:c.levels[level-1]?.classId};
    ctx[type].push(s);ctx.features.push({type,selection:s});
  }
  function conditionalSpeciesGrants() {
    if(!ctx.characterLevel)return;
    for(const id of [species.conditionalFocus,...(species.conditionalFocuses||[]),background?.conditionalFocus])if (id && ctx.trained.has(id) && !ctx.feats.some(f => f.id === F('skill-focus') && f.choice === id)) recordFeature({id: F('skill-focus'), choice: id, automatic: true},'feats',[...ctx.classLevels.values()].reduce((sum,n)=>sum+n,0));
    for(const o of species.conditionalWeaponFocuses||[])if((!o.requiresFeat||ctx.feats.some(f=>f.id===o.requiresFeat))&&eligible(ix.feats.get(F('weapon-focus')),{id:F('weapon-focus'),choice:o.choice},ctx,ix,'feats'))recordFeature({id:F('weapon-focus'),choice:o.choice,automatic:true,grantedBy:species.id},'feats',ctx.characterLevel);
    const ids=[...(species.conditionalFeats||[]),...(ctx.characterLevel===1?species.conditionalStartingFeats||[]:[])];
    let added=true;
    while(added){added=false;for(const id of ids)if(!ctx.feats.some(f=>f.id===id)&&eligible(ix.feats.get(id),{id},ctx,ix,'feats')){recordFeature({id,automatic:true},'feats',ctx.characterLevel);added=true;}}
    if(species.conditionalForceTraining&&!ctx.feats.some(f=>f.id===F('force-training')&&f.grantedBy===species.id)&&eligible(ix.feats.get(F('force-training')),{id:F('force-training')},ctx,ix,'feats')){
      recordFeature({id:F('force-training'),automatic:true,grantedBy:species.id},'feats',ctx.characterLevel);
      for(const e of ix.feats.get(F('force-training')).effects)if(e.target==='forcePowerSlots')ctx.powerSlots+=Math.max(e.minimum,e.amount+modifier(ctx.scores[e.ability]));
    }
  }
  const issue = (i, text) => issues.push(`Level ${i + 1}: ${text}`);
  function grant(s, type, i, label, allow = () => true) {
    if (!s) { issue(i, `choose ${label}`); return; }
    const r = ix[type].get(s.id);
    s=resolveFeatureSelection(r,s,pack);
    const snapshot=!!(r?.requiresDarkSide&&s.darkSideScore||r?.requiresLightSide&&s.darkSideScore===0);
    const acquired=snapshot?{...ctx,darkSideScore:s.darkSideScore,inactiveTalents:new Set()}:ctx;
    if(r?.manualPrerequisites?.length&&!s.manualRequirements){issue(i,'confirm prerequisites for '+r.name);return;}
    if (!allow(r, s) || !eligible(r, s, acquired, ix, type)) { issue(i, `${r?.name || 'Unknown choice'} is not eligible for ${label}`); return; }
    recordFeature(s,type,i+1);
    const sourceClass=ix.classes.get(c.levels[i].classId);
    if(r.requiresDarkSide&&ctx.darkSideScore===0||r.requiresLightSide&&ctx.darkSideScore!==0||type==='talents'&&sourceClass.continuousDarkSide&&ctx.darkSideScore<ctx.scores.wis)ctx.inactiveTalents.add(r.id);
    for(const e of r.effects){
      if(e.target==='skillTraining'){ctx.trained.add(s.choice);ordinaryTraining.add(s.choice);}
      if(!ctx.inactiveTalents.has(r.id)&&(e.target==='trainedSkill'||e.target==='skillSubstitution'&&e.grantsTraining)){ctx.trained.add(e.skill);if(type==='talents'){if(!talentTraining.has(e.skill))talentTraining.set(e.skill,new Set());talentTraining.get(e.skill).add(r.id);}else ordinaryTraining.add(e.skill);}
      if(e.target==='forcePowerSlots')ctx.powerSlots+=Math.max(e.minimum,e.amount+modifier(ctx.scores[e.ability]));
      if(e.target==='starshipManeuverSlots')ctx.maneuverSlots+=Math.max(e.minimum,e.amount+modifier(ctx.scores[e.ability]));
    }
    for(const effect of r.effects)if(effect.target==='chosenTalent'&&!ctx.talents.some(t=>t.id===s.choice))grant({id:s.choice,automatic:true,grantedBy:r.id},'talents',i,'a granted talent');
    conditionalSpeciesGrants();
  }
  for (const [i, l] of c.levels.slice(0, through).entries()) {
    if(l.pendingClass){issue(i,'choose a class');rows.push({number:i+1,classLevel:0,cls:ix.classes.get(l.classId),slots:[],choiceSlots:[],powerChoices:0,valid:false,pendingClass:true,scores:{...ctx.scores},ctx:{...ctx}});continue;}
    if((species.forbiddenClasses||[]).includes(l.classId)){issue(i,`${species.name} cannot be ${ix.classes.get(l.classId).name}`);rows.push({number:i+1,classLevel:0,cls:ix.classes.get(l.classId),slots:[],valid:false,scores:{...ctx.scores},ctx:{...ctx}});continue;}
    const cls = ix.classes.get(l.classId), n = i + 1;
    const entry=classEntry(cls,ctx,ix,l);
    if(!entry.available||rows.some(r=>r.valid===false)){issue(i,entry.reason||'Resolve earlier class entry');rows.push({number:n,classLevel:ctx.classLevels.get(cls.id)||0,cls,slots:[],valid:false,scores:{...ctx.scores},ctx:{...ctx}});continue;}
    const cl = (ctx.classLevels.get(cls.id) || 0) + 1;
    ctx.classLevels.set(cls.id, cl);ctx.characterLevel++;
    ctx.bab = [...ctx.classLevels].reduce((sum, [id, level]) => sum + ix.classes.get(id).bab[level - 1], 0);
    const priorInt = modifier(ctx.scores.int),priorWis=modifier(ctx.scores.wis);
    if (pack.rules.abilityLevels.includes(n)) {
      if(species.noConstitution&&l.abilityIncreases.includes('con'))issue(i,'Droids have no Constitution score');
      else if (l.abilityIncreases.length !== 2 || new Set(l.abilityIncreases).size !== 2 || !l.abilityIncreases.every(a => activeAbilities(c,pack).includes(a))) issue(i, 'increase two different abilities');
      else l.abilityIncreases.forEach(a => ctx.scores[a]++);
    } else if (l.abilityIncreases.length) issue(i, 'ability increases are not available');
    // A higher Wisdom score can suspend already earned Sith talents before
    // this level's feats, class choices or other talent prerequisites are tested.
    for(const t of ctx.talents)if(ix.classes.get(t.classId)?.continuousDarkSide&&ctx.darkSideScore<ctx.scores.wis)ctx.inactiveTalents.add(t.id);
    for(const [skill,grants]of talentTraining)if(!ordinaryTraining.has(skill)&&[...grants].every(id=>ctx.inactiveTalents.has(id)))ctx.trained.delete(skill);
    // Permanent Wisdom increases add powers to each previously earned training,
    // including increases between negative modifiers. Temporary bonuses do not.
    const wisdomGain=Math.max(0,modifier(ctx.scores.wis)-priorWis);
    ctx.powerSlots+=wisdomGain*ctx.feats.filter(s=>ix.feats.get(s.id).effects.some(e=>e.target==='forcePowerSlots')).length;
    ctx.maneuverSlots+=wisdomGain*ctx.feats.filter(s=>ix.feats.get(s.id).effects.some(e=>e.target==='starshipManeuverSlots')).length;
    if (i === 0) {
      for(const id of species.startingTrainedSkills||[]){ctx.trained.add(id);ctx.speciesTraining.add(id);ordinaryTraining.add(id);}
      for(const id of species.startingTrainingFeats||[]){ctx.trained.add(id);ctx.speciesTraining.add(id);ordinaryTraining.add(id);recordFeature({id:F('skill-training'),choice:id,automatic:true,grantedBy:species.id},'feats',1);}
      for (const id of species.startingFeats||[]) recordFeature({id,automatic:true},'feats',1);
      if(species.bonusForceTraining){recordFeature({id:F('force-training'),automatic:true,grantedBy:species.id},'feats',1);ctx.powerSlots+=Math.max(1,1+modifier(ctx.scores.wis));}
      for (const id of cls.startingFeats) if (!(species.excludedStartingFeats||[]).includes(id) && !ctx.feats.some(f=>f.id===id) && !['feat:linguist', 'feat:shake-it-off'].includes(id) && eligible(ix.feats.get(id),{id},ctx,ix,'feats')) recordFeature({id,automatic:true},'feats',1);
      conditionalSpeciesGrants();
      // Initial Force Sensitivity can enable training during the same creation step.
      const initialForce = l.feats.slice(0,levelSlots(1,cl,species,cls,pack).length).some(s => s?.id === F('force-sensitivity') && eligible(ix.feats.get(s.id),s,ctx,ix,'feats'));
      const allowed = classSkills(ctx, ix);
      if (initialForce) allowed.add('skill:use-the-force');
      initialClassSkills=new Set(allowed);
      const limit = Math.max(1, cls.trainedSkills + modifier(ctx.scores.int)) + species.bonusSkills;
      for (const id of c.trainedSkills.slice(0, limit)) {
        if(ctx.speciesTraining.has(id))issue(i,`${ix.skills.get(id).name} is already trained by ${species.name}`);
        else if (allowed.has(id)){ctx.trained.add(id);ordinaryTraining.add(id);} else issue(i, `${ix.skills.get(id).name} is not a starting class skill`);
      }
      conditionalSpeciesGrants();
      if (c.trainedSkills.length !== limit) issue(i, `choose ${limit} starting trained skills (${c.trainedSkills.length} selected)`);
      for (const id of cls.startingFeats.filter(id => !(species.excludedStartingFeats||[]).includes(id) && ['feat:linguist', 'feat:shake-it-off'].includes(id))) {
        if (eligible(ix.feats.get(id), {id}, ctx, ix, 'feats')) recordFeature({id,automatic:true},'feats',1);
      }
    } else if (cl === 1) {
      if (l.startingFeat || cls.startingFeats.some(id => eligible(ix.feats.get(id), {id}, ctx, ix, 'feats'))) grant(l.startingFeat, 'feats', i, 'one multiclass starting feat', r => cls.startingFeats.includes(r?.id));
    } else if (l.startingFeat) issue(i, 'no multiclass starting feat is available');
    const newTraining = Math.max(0, modifier(ctx.scores.int) - priorInt);
    if (l.trainedSkills.length !== newTraining) issue(i, `choose ${newTraining} trained skills from Intelligence increases`);
    for (const id of l.trainedSkills.slice(0, newTraining)) {
      if (classSkills(ctx, ix).has(id) && !ctx.trained.has(id)){ctx.trained.add(id);ordinaryTraining.add(id);}
      else issue(i, 'additional trained skill is not eligible');
    }
    conditionalSpeciesGrants();
    const slots = levelSlots(n, cl, species, cls, pack);
    for (const [j, slot] of slots.entries()) grant(l.feats[j], 'feats', i, slot.label, (r, s) => slot.kind === 'general' || (cls.bonusFeats.includes(r?.id) || cls.startingFeats.includes(r?.id)) && (!cls.bonusRestrictions[r?.id] || cls.bonusRestrictions[r.id].includes(s.choice)));
    if (l.feats.slice(slots.length).some(Boolean)) issue(i, 'extra feat selections are not available');
    const priorPowerCount=ctx.forcePowers.length,initialPowerChoices=Math.max(0,ctx.powerSlots-priorPowerCount),chosenPowers=l.forcePowers||[];
    for(const p of chosenPowers.slice(0,initialPowerChoices))if(ix.forcePowers.has(p.powerId))ctx.forcePowers.push({...p,level:n});
    ctx.forcePowers=eligibleSpeciesPowers(species,ctx,pack);
    for(const membership of (c.forceTraditions||[]).filter(s=>s.level===n)){
      const record=(pack.rules.traditionTalentAccess||[]).find(r=>r.id===membership.id);
      if(record&&prerequisite(record.prerequisite,{...ctx,darkSideScore:membership.darkSideScore},ix))ctx.forceTraditions.add(record.id);
      else issue(i,(record?.name||'Force Tradition')+' membership requirements not met');
    }
    if (hasClassTalent(cls,cl)) grant(l.talent, 'talents', i, 'a talent', r => r&&talentTreeIds(r).some(id=>talentTrees(cls,ctx,pack).includes(id)));
    else if (l.talent) issue(i, 'a talent is not available at this class level');
    for(const feature of cls.classFeatures||[])if(feature.level===cl)ctx.classFeatures.push({...feature,classId:cls.id,level:n});
    const choiceSlots=(cls.classFeatureChoices||[]).filter(s=>s.level===cl);
    for(const [j,slot]of choiceSlots.entries()){const selection=l.classChoices?.[j],r=selection&&ix.classChoices.get(selection.id);const duplicate=r&&ctx.classChoices.some(s=>s.id===r.id&&(r.repeat==='never'||s.choice===selection.choice));if(!r||selection.pending||r.kind!==slot.kind||duplicate||r.choiceType==='power'&&!ix.forcePowers.has(selection.choice)){issue(i,'choose '+slot.kind.replace(/([A-Z])/g,' $1'));continue;}ctx.classChoices.push({...selection,kind:r.kind,classId:cls.id,level:n});}
    if((l.classChoices||[]).slice(choiceSlots.length).some(Boolean))issue(i,'extra class feature choices are not available');
    // Talent-granted training can trigger a species bonus during this level.
    // Keep earlier powers available to talent prerequisites, then collect any
    // newly earned slots without postponing them to the following level.
    const powerChoices=Math.max(0,ctx.powerSlots-priorPowerCount);
    for(const p of chosenPowers.slice(initialPowerChoices,powerChoices))if(ix.forcePowers.has(p.powerId))ctx.forcePowers.push({...p,level:n});
    if(chosenPowers.length!==powerChoices)issue(i,`choose ${powerChoices} Force powers (${chosenPowers.length} selected)`);
    ctx.forcePowers=eligibleSpeciesPowers(species,ctx,pack);
    const restrictedPowers=speciesPowerIssue(species,ctx,pack);if(restrictedPowers)issue(i,restrictedPowers);
    const maneuverChoices=Math.max(0,ctx.maneuverSlots-ctx.starshipManeuvers.length),maneuvers=l.starshipManeuvers||[];
    ctx.starshipManeuvers.push(...maneuvers.slice(0,maneuverChoices).filter(p=>ix.starshipManeuvers.has(p.maneuverId)).map(p=>({...p,level:n})));
    if(maneuvers.length!==maneuverChoices)issue(i,`choose ${maneuverChoices} Starship Maneuvers (${maneuvers.length} selected)`);
    rows.push({number: n, classLevel: cl, cls, ...(i===0?{initialClassSkills}:{}),slots,powerChoices,maneuverChoices,valid:true,choiceSlots, scores: {...ctx.scores}, ctx: {...ctx,forceTraditions:new Set(ctx.forceTraditions),classChoices:[...ctx.classChoices],classFeatures:[...ctx.classFeatures], classLevels: new Map(ctx.classLevels), feats: [...ctx.feats], talents: [...ctx.talents], features: [...ctx.features], trained: new Set(ctx.trained),inactiveTalents:new Set(ctx.inactiveTalents),forcePowers:[...ctx.forcePowers],starshipManeuvers:[...ctx.starshipManeuvers]}});
  }
  ctx.inactiveClasses=new Set([...ctx.classLevels.keys()].filter(id=>ix.classes.get(id).continuousDarkSide&&ctx.darkSideScore<ctx.scores.wis));
  for(const t of ctx.talents)if(ctx.inactiveClasses.has(t.classId))ctx.inactiveTalents.add(t.id);
  for(const [skill,grants]of talentTraining)if(!ordinaryTraining.has(skill)&&[...grants].every(id=>ctx.inactiveTalents.has(id)))ctx.trained.delete(skill);
  // Replay species grants after training and at their permitted acquisition level.
  conditionalSpeciesGrants();
  if (ctx.trained.has('skill:use-the-force') && (ctx.forceRestrictions.forbidChecks||!ctx.feats.some(f => f.id === F('force-sensitivity')))) {
    ctx.trained.delete('skill:use-the-force');
    issues.push(ctx.forceRestrictions.forbidChecks?species.name+' cannot make Use the Force checks':'Use the Force training requires Force Sensitivity');
  }
  return {ctx, rows, issues};
}

export function derive(c, pack) {
  const ix = indexPack(pack), species = resolveSpecies(c,pack);
  const {ctx, rows, issues} = progression(c, pack);
  const droidSystems=droidSystemsState(c,pack);issues.push(...droidSystems.issues);
  if(droidSystems.speedUnknown)issues.push('Set shell speed');
  if(species.gmQualities&&speciesQualities(c,species).filter(r=>r.name.trim()).length<species.gmQualities.minimum)issues.push('Choose 1-3 GM Special Qualities');
  const level = ctx.characterLevel, half = Math.floor(level / 2), background=activeBackground(c,pack);
  issues.push(...speciesChoiceDetails(c,pack,ctx,rows[0]?.ctx||ctx).map(g=>g.issue).filter(Boolean),...customizationIssues(c,species));
  const story=c.story;
  if(story?.kind==='destiny' && !story.id)issues.push('Choose a Destiny');
  if(story?.kind==='background') {
    if(!story.id)issues.push('Choose a Background');
    else if(!background)issues.push('Choose a Background outside your species’ homeworld');
    else {
      if(story.skills.filter(Boolean).length!==background.skillChoices)issues.push(`Choose ${background.skillChoices} Background class skill${background.skillChoices===1?'':'s'}`);
      if(background.bonusLanguages.length>1 && !background.bonusLanguages.includes(story.language))issues.push('Choose a Background language');
    }
  }
  const classPassives=[...ctx.classLevels].filter(([id])=>!ctx.inactiveClasses.has(id)).flatMap(([id,n])=>(ix.classes.get(id).passives||[]).map(e=>({...e,amount:Math.floor(n/e.step)*e.amount})));
  const classChoiceEffects=ctx.classChoices.filter(s=>!ctx.inactiveClasses.has(s.classId)).flatMap(s=>ix.classChoices.get(s.id).effects.map(e=>({...e,choice:s.choice})));
  const speciesDR=species.damageReduction||0;
  const timedDR=Math.max(0,...activeTimedTalents(c,pack,ctx).map(s=>s.rule.damageReduction));
  const classDR=Math.max(0,...classPassives.filter(e=>e.target==='dr').map(e=>e.amount));
  const effects = [...ctx.feats.map(s => [ix.feats.get(s.id), s]), ...ctx.talents.filter(s=>!ctx.inactiveTalents.has(s.id)).map(s => [ix.talents.get(s.id), s])].flatMap(([r, s]) => r.effects.map(e => ({...e, selection: s})));
  effects.push(...encounterTalentEffects(c,pack,ctx));
  const energyShields=activeShields(c,pack),shieldLimits=shieldRestrictions(energyShields,ctx,pack);
  const allDeclaredArmor=wornArmor(c,pack);
  for(const r of allDeclaredArmor)if(r.wearerSize&&r.wearerSize!==species.size)issues.push(r.name+' fits '+r.wearerSize+' creatures');
  for(const r of allDeclaredArmor)if(r.droidSystem?.builtIn&&!species.isDroid&&!species.usesDroidSystems)issues.push(r.name+' requires a Droid body');
  const humanoidArmorRequired=(species.isDroid||species.usesDroidSystems)&&!!(species.droidStartingPackage||c.droidSystems?.[species.id]);
  if(humanoidArmorRequired&&!droidSystems.humanoidArmor&&allDeclaredArmor.some(r=>!r.droidSystem?.builtIn))issues.push('Humanoid armor requires a bipedal body and two Hands');
  const declaredArmor=allDeclaredArmor.filter(r=>(!r.wearerSize||r.wearerSize===species.size)&&(!r.droidSystem?.builtIn||species.isDroid||species.usesDroidSystems)&&(r.droidSystem?.builtIn||!humanoidArmorRequired||droidSystems.humanoidArmor)),bodyArmor=declaredArmor.filter(r=>(r.armorSlot||'body')==='body');
  const externalArmor=bodyArmor.filter(r=>!r.droidSystem?.builtIn),builtInArmor=bodyArmor.filter(r=>r.droidSystem?.builtIn);
  if(externalArmor.length>1)issues.push('Only one suit of armor can be equipped');
  if(builtInArmor.length>1)issues.push('Only one built-in armor can be installed');
  const armorItems=[...externalArmor.slice(0,1),...builtInArmor.slice(0,1),...declaredArmor.filter(r=>r.armorSlot==='tandem')];
  const has = id => ctx.talents.some(t => !ctx.inactiveTalents.has(t.id)&& t.id === `talent:${id}`);
  const armorEffect=(r,target)=>effects.filter(e=>e.target===target&&(!e.when||e.when==='proficientArmor'&&armorProficient(r,ctx))).reduce((n,e)=>n+e.amount*(e.perLevel?level:1),0);
  const armorValue=r=>{const bonus=r.armorBonus+armorEffect(r,'armorBonus');return armorProficient(r,ctx)&&has('improved-armored-defense')?Math.max(bonus,level+Math.floor(bonus/2)):armorProficient(r,ctx)&&has('armored-defense')?Math.max(level,bonus):bonus;};
  const armor=armorItems.slice().sort((a,b)=>armorValue(b)-armorValue(a))[0]||null;
  const effectiveSize=armorItems.find(r=>r.sizeOverride)?.sizeOverride||species.size;ctx.size=effectiveSize;
  const vision=armorVision({...species,...(effects.some(e=>e.target==='vision'&&e.value==='darkvision')?{vision:'darkvision'}:{})},armorItems,ctx),blind=armorItems.some(r=>r.blinds),visionSpecies={...species,vision,blind};
  const proficientArmor=armorItems.some(r=>armorProficient(r,ctx));
  const applies = (e,attack) => !e.when || e.when==='proficientArmor'&&proficientArmor || e.when==='lightOrNoArmor'&&armorItems.every(r=>r.category==='light') || e.when==='meleeAttack'&&attack?.mode==='melee';
  const total = (target,attack) => effects.filter(e => e.target === target && applies(e,attack)).reduce((n, e) => n + e.amount * (e.perLevel ? level : 1), 0);
  const equipmentAbilities=Object.fromEntries(ABILITIES.filter(a=>ctx.scores[a]!==null).map(a=>[a,Math.max(0,...armorItems.filter(r=>armorProficient(r,ctx)).map(r=>r.abilityBonuses?.[a]||0))]).filter(([,n])=>n!==0));
  const scores = Object.fromEntries(ABILITIES.map(a => [a, ctx.scores[a]===null?null:Math.max(species.noConstitution?pack.rules.droidAbilities.minimumScore:-Infinity,ctx.scores[a]+(equipmentAbilities[a]||0))]));
  const mods = Object.fromEntries(ABILITIES.map(a => [a, modifier(scores[a])]));
  const raging=!!species.rage&&recoveryState(c).rageRounds>0;
  const rageBonus=raging?species.rage.bonus+total('rageBonus'):0;
  const powerRage=ragePowerModifiers(c,pack),blockedRageSkills=rageBlockedSkills(c,pack);
  const carried=c.inventory.filter(e=>e.carried!==false);
  const weight=carried.reduce((n,e)=>n+(droidCarryingWeight(c,pack,e,resolveEquipment(e,pack,c).weight)||0)*e.quantity,0)+droidSystems.virtual.reduce((n,e)=>n+(droidCarryingWeight(c,pack,e,ix.equipment.get(e.id).weight)||0)*e.quantity,0);
  const load=carryingLimits(scores.str,effectiveSize,weight,pack.rules.encumbrance);
  const armorPenalty=armorCheckPenalty(armorItems,ctx,pack,c.armorChecks,false,shieldLimits.checkPenalty),armorSkillPenalty=armorCheckPenalty(armorItems,ctx,pack,c.armorChecks,true,shieldLimits.checkPenalty);
  const dexImprovement=effects.filter(e=>e.target==='armorMaxDex').reduce((n,e)=>n+e.amount,0);
  const caps=[...energyShields.map(r=>r.maxDex+(armorProficient(r,ctx)?dexImprovement:0)),...armorItems.filter(r=>r.maxDex!==null).map(r=>r.maxDex+(armorProficient(r,ctx)?dexImprovement:0))];
  const armorMaxDex=caps.length?Math.min(...caps):null;
  const reflexBase=armor?armorValue(armor):level;
  const helpless=droidSystems.inoperative||!!c.helpless||c.condition===5||c.currentHP===0||recoveryState(c).dead;
  const balancingFlatFooted=balanceFlatFooted(c,ctx),flatFooted=!!c.flatFooted||balancingFlatFooted;
  const dexDenied=!!shieldLimits.unproficient||helpless||flatFooted&&!has('uncanny-dodge-i')||load.overloaded;
  const dex = helpless?pack.rules.defensiveCombat.helplessDexterityModifier:dexDenied?Math.min(0,mods.dex):armorMaxDex!==null ? Math.min(mods.dex, armorMaxDex) : mods.dex;
  const defensiveCombat=defensiveCombatState(c,pack,ctx,dexDenied);
  const flurry=flurryState(c,pack,ctx,effectiveSize,helpless);
  const defenseAbilities=defenseAbilityDetails(c,pack,effects,mods,{dex,armorMaxDex,dexDenied,helpless,fortitudeAbility:species.noConstitution?pack.rules.droidAbilities.fortitudeAbility:'con'});
  const wieldingLightsaber=activeLightsabers(c,pack).length>0;
  const condition = pack.rules.conditionPenalties[c.condition];
  const defenses = {}, breakdowns = {},equipmentDefenseBonuses={},defenseModifiers={};
  for (const key of ['reflex', 'fortitude', 'will']) {
    const clsBonus = Math.max(0, ...[...ctx.classLevels.keys()].filter(id=>!ctx.inactiveClasses.has(id)).map(id => ix.classes.get(id).defenses[key] || 0));
    const base = key === 'reflex' ? reflexBase : level;
    const ability=defenseAbilities[key].modifier;
    const sp = species.defenses[key] || 0;
    const armorFortitude=Math.max(0,...armorItems.filter(r=>armorProficient(r,ctx)).map(r=>r.fortitudeBonus+armorEffect(r,'armorFortitude')));
    const equipment=key==='fortitude'?armorFortitude:key==='will'&&total('armorFortitudeToWill')?armorFortitude:0;
    const defenseEffects=effects.filter(e=>(e.target==='defenses'||e.target==='defenseBonus'&&e.defense===key)&&(e.when==='fightDefensively'?defensiveCombat.stance!=='none':applies(e))).map(e=>({...e,amount:e.amount*(e.perLevel?level:1)}));
    defenseModifiers[key]=[{type:'equipment',amount:equipment},...defenseEffects];
    const featDefense=modifierTotal(defenseModifiers[key])-equipment;
    equipmentDefenseBonuses[key]=equipment;
    const size = key === 'reflex' ? pack.rules.sizeReflex[effectiveSize] : 0;
    const naturalArmor = key === 'reflex' ? species.naturalArmor || 0 : 0;
    const dodge=key==='reflex'&&!dexDenied?total('reflexDodge')+defensiveCombat.dodgeBonus:0;
    const lightsaberBonus=wieldingLightsaber?key==='reflex'?total('lightsaberReflex'):key==='will'?total('lightsaberWill'):0:0;
    const charge=key==='reflex'?c.chargeReflexPenalty||0:0;
    const shieldPenalty=key==='reflex'?shieldLimits.unproficient*pack.rules.energyShields.unproficientReflexPenalty:0;
    defenses[key] = 10 + base + ability + clsBonus + sp + equipment + size + naturalArmor + featDefense + lightsaberBonus + dodge + condition + c.modifiers[key] + charge + shieldPenalty + (key==='reflex'?flurry.reflexPenalty:0);
    breakdowns[key] = `10 + ${base} ${key === 'reflex' && armor ? 'armor/level' : 'level'} + ${ability} ability (${defenseAbilities[key].ability.toUpperCase()}) + ${clsBonus} class + ${sp} species + ${equipment} equipment + ${size} size + ${naturalArmor} natural armor + ${featDefense} feats + ${lightsaberBonus} Lightsaber + ${dodge} dodge + ${condition} condition + ${c.modifiers[key]} misc${charge?' + '+charge+' Charge':''}${shieldPenalty?' + '+shieldPenalty+' energy shield':''}${key==='reflex'&&flurry.reflexPenalty?' + '+flurry.reflexPenalty+' Flurry':''}`;
  }
  // RAW defines threshold from Fortitude. Counseling confirms that rule.
  const conditionalEffects=[...turnTalentEffects(c,pack,ctx,{flatFooted,helpless}),...(species.conditionalDefenses||[]),...effects.filter(e=>e.target==='conditionalDefense'),...armorConditionalDefenses(armorItems,ctx,defenses)];
  const conditionalDefenses=[...combineArmorDefenses(conditionalEffects,[],defenses,equipmentDefenseBonuses,defenseModifiers).filter(r=>r.against!=='aware'||r.amount>0),...defensiveConditionalTotals(defensiveCombat,defenses.reflex)];
  const thresholdState=thresholdDetails(c,effects,defenses,conditionalEffects,equipmentDefenseBonuses,pack.rules.sizeThreshold[effectiveSize]+(species.damageThresholdBonus||0)+total('threshold')+c.modifiers.threshold,defenseModifiers);
  const threshold=thresholdState.total,thresholdContext=thresholdState.context;
  const teamSkills=teamSkillDetails(c,effects,ix,pack);
  const hp = (rows[0].valid===false?0:ix.classes.get(c.levels[0].classId).startingHP + mods.con) + c.levels.slice(1).reduce((n, l,i) => n + (rows[i+1].valid===false?0:Math.max(1, l.hpRoll + (ix.classes.get(l.classId).hpConstitution===false?0:mods.con))), 0) + total('hp') + c.modifiers.hp;
  const movementPowers=movementPowerBonuses(c,pack);
  const nativeSkills = pack.skills.map(s => {
    const trained = ctx.trained.has(s.id);
    const focus = Math.max(0, ...effects.filter(e => e.target === 'skillFocus' && e.selection.choice === s.id && trained).map(e => e.amount));
    const teamBonus=trained?Math.max(0,...teamSkills.filter(e=>e.skill===s.id).map(e=>e.bonus)):0;
    const backgroundBonus=!trained && background?.relevantSkills.includes(s.id)?background.untrainedBonus:0;
    const equipment=Math.max(armorSkillBonus(armorItems,ctx,c.armorChecks,s.id),s.id==='skill:perception'?droidSystems.perceptionBonus:0);
    const bonuses=resolveModifiers([{type:'competence',amount:focus},{type:'competence',amount:backgroundBonus},{type:'competence',amount:teamBonus},{type:'equipment',amount:equipment},...effects.filter(e=>e.target==='skills'),...(s.id==='skill:jump'?movementPowers.jumpModifiers:[])]);
    const penalty = s.armorCheck ? armorSkillPenalty : 0;
    const size = s.id === 'skill:stealth' ? pack.rules.sizeStealth[effectiveSize] : 0;
    const tools=species.technophobic&&c.mechanicalSkills?.includes(s.id)?-5:0;
    const misc=c.skillModifiers?.[s.id]||0;
    const encumbrance=load.heavy&&pack.rules.encumbrance.skills.includes(s.id)?pack.rules.encumbrance.skillPenalty:0;
    return {...s, trained, focus, available: !blockedRageSkills.includes(s.id) && !(raging&&species.rage.blockedSkills.includes(s.id)) && (!species.isDroid||species.heuristicProcessor||trained||pack.rules.droidAbilities.untrainedSkills.includes(s.id)) && !(s.trainedOnly && !trained) && (s.id !== 'skill:use-the-force' || !ctx.forceRestrictions.forbidChecks && ctx.feats.some(f => f.id === F('force-sensitivity'))),
      total: half + mods[s.ability] + (trained ? pack.rules.trainingBonus : 0) + bonuses.total + penalty + size + condition + tools + misc + encumbrance,
      breakdown: `${half} half level + ${mods[s.ability]} ability + ${trained ? 5 : 0} training + ${bonuses.bonuses.competence||0} competence + ${equipment} equipment + ${bonuses.bonuses.force||0} Force + ${penalty} armor + ${size} size + ${condition} condition + ${tools} mechanical tools + ${misc} misc + ${encumbrance} load`};
  });
  const nativeById=new Map(nativeSkills.map(s=>[s.id,s]));
  const skills=nativeSkills.map(s=>{
    const replacements=effects.filter(e=>e.target==='skillSubstitution'&&e.skill===s.id&&nativeById.get(e.replacement)?.available);
    const circumstance=armorCircumstance(armorItems,c.armorChecks,s.id);
    const sources=[{id:s.id,name:s.name,total:s.total,ability:s.ability},...replacements.map(e=>{const r=nativeById.get(e.replacement);return {id:r.id,name:r.name,total:r.total,ability:r.ability,...(e.when?{when:e.when}:{})};})];
    for(const source of sources)source.total+=circumstance;
    const saved=c.skillCheckSources?.[s.id];
    const automatic=sources.filter(r=>!r.when).reduce((best,r)=>r.total>best.total?r:best,sources[0]);
    const source=saved?(sources.find(r=>r.id===saved)||sources[0]):automatic;
    const native=nativeById.get(source.id);
    const scope=source.when==='computerNetwork'?'computer network':source.when==='perceptionApplications'?'Avoid Surprise, Notice Targets, Sense Deception, Sense Influence':'';
    const climb=s.id==='skill:climb'?droidSystems.movement?.climbPenalty||0:0;
    return {...s,available:s.available&&native.available&&!(s.id==='skill:climb'&&droidSystems.movement?.climbAllowed===false),total:source.total+climb,checkSource:source.id,checkSources:sources.map(r=>({...r,total:r.total+climb})),breakdown:(source.id===s.id?s.breakdown+(circumstance?'; +'+circumstance+' Intimidate':''):`${native.name}${scope?' ('+scope+')':''}: ${native.breakdown}${circumstance?'; +'+circumstance+' Intimidate':''}`)+(climb?'; '+climb+' Tracked':'')};
  });
  const unarmed=species.isDroid||species.usesDroidSystems?null:unarmedWeapon(pack,effectiveSize,total('unarmedDieSteps'));
  const gloves=carried.filter(e=>e.equipped&&ix.equipment.get(e.id).unarmed);
  const manualAttacks=carried.filter(e=>e.equipped&&ix.equipment.get(e.id).manualAttack).map(e=>({...resolveEquipment(e,pack,c),uid:e.uid}));
  if(!unarmed&&!species.isDroid&&!species.usesDroidSystems)manualAttacks.push({id:UNARMED_ID,name:'Unarmed Attack',mode:'melee',sourceId:pack.rules.unarmed.sourceIds[0],article:pack.rulePages.find(r=>r.name==='Unarmed Attacks')?.article,automation:'manual',uid:c.id});
  for(const e of droidSystems.installed.filter(e=>e.uid&&ix.equipment.get(e.id).droidSystem.appendageDamage&&Object.keys(ix.equipment.get(e.id).droidSystem.appendageDamage).length===0)){const r=ix.equipment.get(e.id);manualAttacks.push({...r,mode:'melee',uid:e.droidGrant?.slot==='arm-1'?c.id:e.uid});}
  const weaponEntries=carried.filter(e=>e.equipped&&ix.equipment.get(e.id).kind==='weapon'&&!ix.equipment.get(e.id).unarmed&&!ix.equipment.get(e.id).manualAttack);
  if(unarmed)weaponEntries.push({id:UNARMED_ID,uid:c.id,twoHanded:false,targetKind:c.unarmedModifiers?.targetKind,attackTechnique:c.unarmedModifiers?.attackTechnique,attackMod:c.unarmedModifiers?.attackMod||0,damageMod:(c.unarmedModifiers?.damageMod||0)+Math.max(0,...gloves.map(e=>ix.equipment.get(e.id).damageBonus||0))});
  for(const w of droidAppendageWeapons(c,pack,total('unarmedDieSteps'))){const arm=c.inventory.find(e=>e.uid===w.inventoryUid),settings=w.primaryAppendage?c.unarmedModifiers:arm;weaponEntries.push({id:UNARMED_ID,uid:w.uid,virtualWeapon:w,twoHanded:false,targetKind:settings?.targetKind,attackTechnique:settings?.attackTechnique,attackMod:settings?.attackMod||0,damageMod:(settings?.damageMod||0)+Math.max(0,...gloves.map(e=>ix.equipment.get(e.id).damageBonus||0))});}
  for(const w of naturalWeapons(c,species,pack,total('unarmedDieSteps'))){const settings=c.naturalModifiers?.[w.naturalWeaponId];weaponEntries.push({id:UNARMED_ID,uid:w.uid,virtualWeapon:w,twoHanded:false,targetKind:settings?.targetKind,attackTechnique:settings?.attackTechnique,attackMod:settings?.attackMod||0,damageMod:(settings?.damageMod||0)+Math.max(0,...gloves.map(e=>ix.equipment.get(e.id).damageBonus||0))});}
  const featHas=id=>ctx.feats.some(f=>f.id===F(id));
  const powerAttack=powerAttackState(c,pack,{bab:ctx.bab,owned:featHas('power-attack')});
  const fullAttack=fullAttackState(c,pack,ctx);
  const attacks = weaponEntries.map(e => {
    const w = e.virtualWeapon||(e.id===UNARMED_ID?unarmed:resolveEquipment(e,pack,c));
    const proficient = weaponProficient(w,ctx,ix);
    const proficiencyPenalty=proficient?0:species.unproficientWeaponPenalty??-5;
    const group=weaponEffectGroup(w,ctx);
    const allowFocus=!counselingEnabled(c,'jc:112-weapon-focus-proficiency')||proficient;
    const mechanical=species.technophobic&&(e.mechanical??w.mechanical)&&!w.biotech?-5:0;
    const attackModifiers = [...(allowFocus?effects.filter(f => f.target === 'weaponFocus' && (f.weaponGroup||f.selection.choice) === group && applies(f,w)):[]),...effects.filter(f=>f.target==='attacks'&&applies(f,w)),...turnFeatAttackEffects(c,pack,ctx,w),...(w.mode==='melee'?[{type:'rage',amount:rageBonus},...powerRage]:[])];
    const strike=battleStrike(c,pack,attackModifiers),focus=modifierTotal(attackModifiers)+(strike?.attackBonus||0);
    const specialization = effects.filter(f => f.target === 'weaponSpecialization' && (f.weaponGroup||f.selection.choice) === group && applies(f,w)).reduce((n, f) => n + f.amount, 0);
    const light = pack.rules.weaponSizeOrder.indexOf(w.size) < pack.rules.weaponSizeOrder.indexOf(effectiveSize)||w.unarmed&&counselingEnabled(c,'jc:112-unarmed-attacks-and-weapon-finesse');
    const finesse=total('weaponFinesse')>0&&w.mode==='melee'&&(light||w.group==='lightsabers'||w.unarmed&&counselingEnabled(c,'jc:112-unarmed-attacks-and-weapon-finesse'));
    const ability=w.mode==='melee'?(finesse?Math.max(mods.str,mods.dex):mods.str):mods.dex;
    const power=powerAttackBonuses(w,e,pack,effectiveSize,powerAttack);
    let strength = w.mode === 'melee' ? (power.twoHanded && !light && !w.unarmed && mods.str > 0 ? 2 * mods.str : mods.str) : w.addsStrength||w.rangeType==='thrown'?mods.str:0;
    if(w.group==='lightsabers'&&total('lightsaberDexDamage'))strength=Math.max(strength,mods.dex*((power.twoHanded||e.twoHanded)&&mods.dex>0?2:1));
    const aimed=!!e.aimed&&canAim(w,e)&&canAimAtTarget(c,visionSpecies),accessories=pack.rules.weaponAccessories;
    const range=weaponRange(w,{...e,aimed},pack,featHas,c),pointBlank=w.mode==='ranged'&&range.band===0&&featHas('point-blank-shot')?1:0;
    const technique=attackTechnique(w,e,pack,featHas,{proficient,scores,light}),autofire=technique.autofire;
    const ammunition=ammunitionState(e,pack,autofire,technique.shots,{flatFooted});
    const aimBonus=aimed&&featHas('careful-shot')?accessories.carefulShotBonus:0;
    const grip=w.group==='rifles'&&e.oneHanded?accessories.rifleOneHandedPenalty:0;
    const unBracedPenalty=technique.selected==='normal'?(autofire?-5:0):technique.penalty;
    const bracing=bracingState(w,e,pack,c,technique);
    const techniquePenalty=penalty=>total('controlledBurst')&&autofire?(bracing.active?0:total('controlledBurst')):technique.selected==='rapid-shot'&&effects.some(e=>e.target==='rapidShotPenalty')?0:penalty;
    const firePenalty=techniquePenalty(bracing.penalty??unBracedPenalty),unBracedTechniquePenalty=total('controlledBurst')&&autofire?total('controlledBurst'):techniquePenalty(unBracedPenalty);
    const multiattackReduction=(species.multiattackReduction||0)+effects.filter(f=>f.target==='multiattackReduction'&&f.weaponGroup===group).reduce((n,f)=>n+f.amount,0),fullAttackPenalty=Math.min(0,fullAttack.penalty+multiattackReduction);
    const criticalThreat=Math.min(20,...effects.filter(f=>f.target==='criticalThreat'&&f.weaponGroup===w.group).map(f=>f.amount));
    const criticalMultiplier=Math.max(pack.rules.combat.criticalMultiplier,...effects.filter(f=>f.target==='criticalMultiplier'&&f.selection.choice===w.id).map(f=>f.amount));
    const meleeBonus = modifierTotal([...effects.filter(e=>e.target==='meleeDamage'&&applies(e,w)).map(e=>({...e,amount:e.amount*(e.perLevel?level:1)})),...(w.mode==='melee'?[{type:'rage',amount:rageBonus},...powerRage]:[])]);
    const flurryBonus=w.mode==='melee'?flurry.attackBonus:0;
    const damageBonus = half + (w.group==='pistols'?classPassives.filter(e=>e.target==='pistolDamage').reduce((n,e)=>n+e.amount,0):0) + strength + specialization + meleeBonus + pointBlank + c.modifiers.damage + e.damageMod + power.damage;
    const mightySwingAvailable=w.mode==='melee'&&featHas('mighty-swing'),mightySwing=mightySwingAvailable&&!!c.mightySwing;
    const diceBonus=Math.max(technique.extraDice,aimed&&featHas('deadeye')?accessories.deadeyeDice:0,mightySwing?pack.rules.mightySwing.extraDice:0);
    const damage=extraDamageDice(w.damage,diceBonus);
    const criticalDice=dice=>w.unarmed&&total('unarmedCriticalDieStep')?increaseNaturalDie(dice,total('unarmedCriticalDieStep'),pack):dice;
    const attack=ctx.bab + ability + focus + proficiencyPenalty + armorPenalty + condition + mechanical + range.penalty + pointBlank + firePenalty + grip + aimBonus + c.modifiers.attack + e.attackMod + power.penalty + fullAttackPenalty + defensiveCombat.attackPenalty + flurryBonus;
    const inactiveLightsaber=w.group==='lightsabers'&&e.activated===false;
    const powerIssue=droidSystems.inoperative?'Install a Processor':species.isDroid&&!species.heuristicProcessor&&!proficient?'Basic Processor requires weapon proficiency':w.mode==='melee'&&powerAttack.selected&&!powerAttack.available?powerAttack.reason:'';
    const display=dice=>dice?(w.natural||w.droidAppendage?dice.replace(/(\d+)d1(?!\d)/g,'$1'):dice)+(damageBonus?signed(damageBonus):''):w.damageAction||'Choose ammunition';
    const criticalDisplay=dice=>criticalDice(dice)!==dice?{criticalDamageDisplay:display(criticalDice(dice))}:{};
    const bonusHPOnDamage=w.unarmed?toughAsDurasteelLevel(c,pack,ctx,armorItems):0;
    const unAimedRange=weaponRange(w,{...e,aimed:false},pack,featHas,c);
    return withBattleStrike({...w,...(bonusHPOnDamage?{bonusHPOnDamage}:{}),name:w.name+(technique.selected==='normal'?'':` (${technique.choices.find(t=>t.id===technique.selected)?.name||technique.selected})`),damage,uid:e.uid,proficient,range,criticalMultiplier,criticalThreat,multiattackReduction,fullAttackPenalty,effectGroup:group,ammunition,technique,powerAttack:power,mightySwing,mightySwingAvailable,mode:w.mode,areaType:technique.areaType,flatFooted,issue:(defensiveCombat.attacksBlocked?defensiveCombat.reason||'Total Defense forbids attacks':'')||(inactiveLightsaber?'Activate Lightsaber':'')||powerIssue||technique.issue||(ammunition&&ammunition.cost>ammunition.capacity&&!ammunition.freeReloads?'Free reloads required':''),available:!inactiveLightsaber&&!defensiveCombat.attacksBlocked&&!powerIssue&&technique.available&&range.available&&(!ammunition||ammunition.available),
      attack,aimed,bracing,braced:bracing.active,opportunityWeapon:weaponCanOpportunity(w,e,pack,ctx),fullAttackGrip:fullAttackGrip(w,e,pack,effectiveSize),ignoresCover:aimed,ignoresDarkness:aimed&&!!attachedScope(e,c,pack)?.scope.ignoresDarkness,
      ...(bracing.active?{unBraced:{braced:false,attack:attack-firePenalty+unBracedTechniquePenalty}}:{}),
      ...(aimed?{unAimed:{aimed:false,attack:attack-aimBonus-range.penalty+unAimedRange.penalty,damage:extraDamageDice(w.damage,technique.extraDice),damageDisplay:display(extraDamageDice(w.damage,technique.extraDice)),...criticalDisplay(extraDamageDice(w.damage,technique.extraDice)),ignoresCover:false,ignoresDarkness:false}}:{}),
      ...(mightySwing?{unSwing:{mightySwing:false,damage:extraDamageDice(w.damage,technique.extraDice),damageDisplay:display(extraDamageDice(w.damage,technique.extraDice)),...criticalDisplay(extraDamageDice(w.damage,technique.extraDice))}}:{}),
      damageBonus, damageDisplay:display(damage),...criticalDisplay(damage),
      breakdown: `${ctx.bab} BAB + ${ability} ability${finesse?' (Finesse)':''} + ${focus} attack bonuses + ${proficiencyPenalty} proficiency + ${armorPenalty} armor + ${condition} condition + ${mechanical} mechanical weapon + ${range.penalty} range + ${pointBlank} Point-Blank Shot + ${firePenalty} ${bracing.active?'Bracing':technique.selected==='normal'?'autofire':technique.choices.find(t=>t.id===technique.selected)?.name||technique.selected}${grip?' + '+grip+' one-handed':''}${aimBonus?' + '+aimBonus+' Careful Shot':''} + ${c.modifiers.attack + e.attackMod} misc; ${technique.areaType?'Area: no critical multiplier':'Critical ×'+criticalMultiplier}${diceBonus?'; +'+diceBonus+' damage '+(diceBonus===1?'die':'dice'):''}${aimed?'; Aim: ignores cover':''}${w.mode==='melee'&&powerAttack.selected?'; Power Attack: '+power.penalty+' attack, +'+power.damage+' damage ('+power.target+')':''}${fullAttackPenalty?'; Full Attack: '+fullAttackPenalty+' attack':''}${flurryBonus?'; Flurry: +'+flurryBonus+' attack':''}${defensiveCombat.attackPenalty?'; Defense: '+defensiveCombat.attackPenalty+' attack':''}${strike?'; Battle Strike: +'+strike.attackBonus+' Force, +'+strike.dice+'d'+strike.die+' on hit':''}`},strike);
  }).map(a=>applyAttackTarget(a,c,pack,ctx,visionSpecies));
  const generation=abilityRecord(c,pack),abilityNames=activeAbilities(c,pack),standard=standardArray(c,pack);
  const missingAssignments=!species.fixedAbilities&&generation.abilityGeneration&&Object.values(generation.abilityGeneration.assign).some(i=>i===null);
  if(missingAssignments)issues.push('Assign all '+(abilityNames.length===5?'five':'six')+' ability scores');
  if(!species.fixedAbilities&&generation.abilityMethod==='standard'&&!missingAssignments&&Object.values(generation.abilities).sort((a,b)=>a-b).join()!==[...standard].sort((a,b)=>a-b).join())issues.push('Standard package must use '+standard.join(', ')+' once each');
  const pointCost=species.fixedAbilities?0:(generation.abilityMethod==='point-buy'&&generation.abilityGeneration?generation.abilityGeneration.pool:Object.values(generation.abilities)).reduce((n,v)=>n+(pack.rules.pointBuyCosts[v]??Infinity),0);
  if(generation.abilityMethod==='point-buy'&&pointCost>generation.pointBudget)issues.push('Point-buy budget exceeded or a base score is outside 8–18');
  const movement = pack.rules.armorMovement;
  const movementFree=r=>effects.some(e=>e.target==='armorMovement'&&(e.when==='proficientArmor'?armorProficient(r,ctx):applies(e)));
  const movementArmor=armorItems.filter(r=>!r.droidSystem?.builtIn&&!movementFree(r)).sort((a,b)=>movement.speedMultipliers[a.category]-movement.speedMultipliers[b.category])[0];
  const armorSpeedMultiplier = n => movementArmor && !(ctx.isDroid&&movementArmor.category==='heavy'&&!movement.droidHeavySlowedSpeeds.includes(n)) ? movement.speedMultipliers[movementArmor.category] : 1;
  const speedMultiplier = armorSpeedMultiplier(species.speed);
  const stride = total('speed')+movementPowers.speed;
  const loadMultiplier=load.heavy?pack.rules.encumbrance.speedMultiplier:1;
  const flatArmorPenalty=armorItems.filter(r=>!movementFree(r)).reduce((n,r)=>n+(r.speedPenalty||0),0);
  const magneticPenalty=!c.armorChecks?.magneticSoles?0:armorItems.filter(r=>!movementFree(r)).reduce((n,r)=>n+(r.magneticSolesPenalty||0),0);
  const move=(n,normal=false)=>n===0||load.tooHeavy?0:load.overloaded?1:Math.floor(Math.max(0,Math.floor((n + stride) * Math.min(armorSpeedMultiplier(n),loadMultiplier))-flatArmorPenalty-(normal?magneticPenalty:0)) / (c.condition >= 4 ? 2 : 1));
  const speed = move(species.speed,true);
  const restrictedRunningArmor=[...armorItems,...energyShields].filter(r=>!movementFree(r));
  const armorRunMultiplier=Math.min(movement.runMultipliers.light,...restrictedRunningArmor.map(r=>movement.runMultipliers[r.category]));
  const sprintAllowed = !restrictedRunningArmor.some(r=>r.category==='heavy') || ambiguityValue(c,pack,'ambiguity:sprint-heavy-armor')==='sprint-limit';
  const talentRunMultiplier = Math.max(0,...effects.filter(e=>e.target==='runMultiplier'&&applies(e)).map(e=>e.amount));
  const runWithArmor = sprintAllowed ? Math.max(armorRunMultiplier,talentRunMultiplier) : armorRunMultiplier;
  const loadRun=load.heavy&&ambiguityValue(c,pack,'ambiguity:sprint-heavy-load')!=='sprint-limit'?pack.rules.encumbrance.runMultiplier:runWithArmor;
  const runMultiplier=load.overloaded?0:Math.min(runWithArmor,loadRun);
  const speedBreakdown = droidSystems.speedUnknown?'Shell speed unspecified':load.overloaded?(load.tooHeavy?'Exceeds maximum lifting capacity':'Straining: 1 square / full-round action'):`(${species.speed} base + ${stride} bonuses) × ${Math.min(speedMultiplier,loadMultiplier)} armor/load (round down)${flatArmorPenalty?' − '+flatArmorPenalty+' armor':''}${magneticPenalty?' − '+magneticPenalty+' magnetic soles':''}${c.condition >= 4 ? ' ÷ 2 condition (round down)' : ''}`;
  return {level, half, scores,starshipManeuvers:ctx.starshipManeuvers.map(p=>({...ix.starshipManeuvers.get(p.maneuverId),copyId:p.id,spent:p.spent,level:p.level})),maneuverSlots:ctx.maneuverSlots, speedUnknown:droidSystems.speedUnknown,droidSystems, equipmentAbilities,abilityCheckBonuses:{str:armorStrengthCheck(armorItems,ctx,c.armorChecks)}, armor,armorItems,energyShields,tumbleSokan:total('tumbleSokan')>0,size:effectiveSize,vision,blind,classDR,speciesDR,timedDR,normalProtection:armorProtection(c,{armorItems,classDR,speciesDR,timedDR}), mods, bab: ctx.bab, defenses, defenseAbilities,breakdowns, threshold,thresholdContext,teamSkills,rangedOpportunityBonus:total('rangedOpportunity'), hp, skills, attacks, manualAttacks, powerAttack, fullAttack, defensiveCombat, flurry, helpless, flatFooted,balancingFlatFooted, ctx, rows, issues,
    bellowBonuses:{dice:total('bellowDice'),conditionReduction:total('bellowConditionReduction')},skillRerolls:effects.filter(e=>e.target==='skillReroll').map(e=>({...e,id:e.selection.id,name:ix.talents.get(e.selection.id).name,...(e.dailyUsesPerSelection?{daily:ctx.talents.filter(t=>t.id===e.selection.id&&!ctx.inactiveTalents.has(t.id)).length*e.dailyUsesPerSelection,spent:recoveryState(c).knacksSpent}:{})})),skillRerollBest:effects.filter(e=>e.target==='skillRerollBest').map(e=>e.skill),
    movementPowers,
    battleStrike:battleStrike(c,pack,effects.filter(e=>e.target==='attacks')),
    specialAttackPenalty:armorPenalty+condition+c.modifiers.attack+fullAttack.penalty+defensiveCombat.attackPenalty+modifierTotal(effects.filter(e=>e.target==='attacks'))+(battleStrike(c,pack,effects.filter(e=>e.target==='attacks'))?.attackBonus||0),
    recovery:recoveryDetails(c,pack,{species,hp,scores,mods,level,classFortitude:Math.max(0,...[...ctx.classLevels.keys()].filter(id=>!ctx.inactiveClasses.has(id)).map(id=>ix.classes.get(id).defenses.fortitude||0)),extraSecondWinds:total('secondWinds'),windBonuses:{freeAction:total('secondWindFreeAction')>0,multipleUses:total('secondWindMultipleUses')>0,aboveHalf:total('secondWindAboveHalf')>0,condition:total('secondWindCondition'),constitution:total('secondWindConstitution')},extraRages:total('rageUses'),rageBonus:total('rageBonus'),forceRecovery:has('force-recovery')}),
    forcePowers:ctx.forcePowers.map(p=>{const record=ix.forcePowers.get(p.powerId),removedDescriptors=record.descriptors.filter(descriptor=>effects.some(e=>e.target==='powerDescriptorRemoval'&&e.selection.choice===p.powerId&&e.descriptors.includes(descriptor)));return {...record,descriptors:record.descriptors.filter(d=>!removedDescriptors.includes(d)),removedDescriptors,copyId:p.id,action:p.action||record.action,spent:p.spent,level:p.level,take10:classChoiceEffects.some(e=>e.target==='powerTake10'&&e.choice===p.powerId),adept:ctx.talents.some(t=>t.id==='talent:force-power-adept'&&t.choice===p.powerId&&!ctx.inactiveTalents.has(t.id))};}),powerSlots:ctx.powerSlots,
    purchaseBenefits:{licenseAllowance:total('licenseAllowance'),blackMarketReduction:total('blackMarketReduction')},
    conditionalDefenses,conditionalThresholds:thresholdState.conditional,
    speed, speedBreakdown, runMultiplier, runSpeed: speed * runMultiplier,
    speeds: Object.fromEntries(Object.entries(species.speeds||{}).map(([type,n])=>[type,type==='fly'&&species.flightHeavyLoadForbidden&&load.heavy?0:move(n+(type==='swim'?total('swimSpeed'):0))])),
    incapacitated: droidSystems.inoperative || c.condition === 5 || c.currentHP===0 || recoveryState(c).dead, forcePointsForbidden:!!(species.forceImmune||ctx.forceRestrictions.forbidPoints), forceMaximum: !level||species.forceImmune||ctx.forceRestrictions.forbidPoints||advancementForceBase(rows.filter(r=>r.valid!==false).at(-1)?.cls||ix.classes.get(c.levels[0].classId),pack)===null?0:advancementForceBase(rows.filter(r=>r.valid!==false).at(-1)?.cls||ix.classes.get(c.levels[0].classId),pack) + half + total('forcePoints'), forceCurrent:!level||species.forceImmune||ctx.forceRestrictions.forbidPoints?0:c.forcePoints,forcePointDie:Math.max(6,total('forcePointDie')),forcePointDice:level<8?1:level<15?2:3,pointCost,
    weightUnknown:carried.some(e=>droidCarryingWeight(c,pack,e,resolveEquipment(e,pack,c).weight)===null),weight,load,
    nextXP: level < 20 ? level * (level + 1) / 2 * pack.rules.resources.xpStep : null};
}
