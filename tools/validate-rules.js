import {CAMPAIGN_RULES} from '../src/campaign-rules.js';
import {validateVehicleData} from '../src/vehicles.js';
import {validateSpeciesProfileData} from '../src/species-profiles.js';
import {validateCustomizationData} from '../src/species-customization.js';
import {validateDroidSystemData} from '../src/droid-systems.js';
import {WIKI_TAGS, wikiURL} from '../src/wiki-content.js';
import fs from 'node:fs';
import {ABILITIES, GROUPS, indexPack} from '../src/rules.js';
import {featureChoices} from '../src/feature-choices.js';
import assert from 'node:assert/strict';

const carryingSubstitutions=Object.fromEntries([
 ['force-intuition','initiative','use-the-force'],['force-persuasion','persuasion','use-the-force'],
 ['force-perception','perception','use-the-force'],['force-pilot','pilot','use-the-force'],
 ['force-deception','deception','use-the-force'],['force-treatment','treat-injury','use-the-force'],
 ['watchful-step','initiative','perception'],['deception-awareness','perception','use-the-force']
].map(([id,skill,replacement])=>['talent:'+id,{target:'skillSubstitution',skill:'skill:'+skill,replacement:'skill:'+replacement,grantsTraining:id!=='deception-awareness',carryRerolls:true,...(id==='force-perception'?{when:'perceptionApplications'}:id==='deception-awareness'?{when:'senseDeceptionInfluence'}:{})}]));

export function validatePack(p) {
  assert.equal(p.schemaVersion, 1);
  const numericRules={combat:['shieldLoss','shieldRecharge','rechargeDC','rechargeActions','naturalHit','naturalMiss','criticalMultiplier','minimumDamage','areaMinimumRoll'],resources:['forcePointBase','xpStep']};
  for(const [group,keys] of Object.entries(numericRules)){
    const rules=p.rules?.[group];assert(rules,group);
    assert(Array.isArray(rules.sourceIds)&&rules.sourceIds.length>0&&rules.sourceIds.every(id=>p.sources?.some(s=>s.id===id)),group+' sources');
    assert(Object.keys(rules).every(key=>key==='sourceIds'||group==='combat'&&key==='areaSourceIds'||keys.includes(key)),group+' fields');
    for(const key of keys)assert(Number.isInteger(rules[key])&&rules[key]>=(key==='forcePointBase'?0:1),`${group}.${key}`);
  }
  if(p.rules.droidAbilities!==undefined){
    const d=p.rules.droidAbilities;assert(d&&Object.keys(d).every(k=>['sourceIds','abilities','standardArray','pointBudget','minimumScore','fortitudeAbility','untrainedSkills'].includes(k)),'Invalid droid abilities');
    assert(Array.isArray(d.sourceIds)&&d.sourceIds.length&&d.sourceIds.every(id=>p.sources.some(s=>s.id===id)),'Missing droid ability sources');
    assert.deepEqual(d.abilities,['str','dex','int','wis','cha']);assert.deepEqual(d.standardArray,[15,14,13,12,10]);assert.equal(d.pointBudget,21);assert.equal(d.minimumScore,1);assert.equal(d.fortitudeAbility,'str');assert.deepEqual(d.untrainedSkills,['skill:acrobatics','skill:climb','skill:jump','skill:perception']);
  }
  if(p.rules.droidSystems!==undefined){
    const d=p.rules.droidSystems;assert(d&&Object.keys(d).sort().join(',')==='additionalLocomotionCosts,costFactors,sourceIds','Invalid Droid System rules');
    assert(Array.isArray(d.sourceIds)&&d.sourceIds.length&&d.sourceIds.every(id=>p.sources.some(s=>s.id===id)),'Missing Droid System sources');
    assert.deepEqual(d.costFactors,{fine:20,diminutive:10,tiny:5,small:2,medium:1,large:2,huge:5,gargantuan:10,colossal:20});
    assert.deepEqual(d.additionalLocomotionCosts,[0,500,1000,2000,5000]);
  }
  for (const k of ['id','version','name']) assert.equal(typeof p[k], 'string', k);
  for (const k of ['species','classes','skills','feats','talents','equipment','sources']) assert(Array.isArray(p[k]), k);
  assert(p.license && p.rules && p.sources.length);
  const ix = indexPack(p), ids = new Set(), sources = new Set(p.sources.map(s => s.id));
  for(const [id,effect] of Object.entries(carryingSubstitutions)){const record=ix.talents.get(id);assert(record,'Missing reviewed substitution '+id);assert.deepEqual(record.effects.filter(e=>e.target==='skillSubstitution'),[effect],'Changed reviewed substitution '+id);}
  assert(p.rules.sizeStealth && Object.entries(p.rules.sizeReflex).every(([size])=>Number.isInteger(p.rules.sizeStealth[size])), 'Missing size modifiers for Stealth');
  for (const s of p.sources) {
    assert(Number.isInteger(s.revision) && s.revision > 0);
    assert(!Number.isNaN(Date.parse(s.timestamp)));
    for (const k of ['url','history']) assert.equal(new URL(s[k]).hostname, 'swse.miraheze.org');
    if(s.sha256)assert(/^[a-f0-9]{64}$/.test(s.sha256),'Invalid source checksum');
  }
  function requireRef(collection, id) { assert(ix[collection].has(id), `Unknown ${collection} reference: ${id}`); }
  function speciesStartingFeat(id){requireRef('feats',id);const feat=ix.feats.get(id);assert(feat.repeat==='never'&&!feat.choiceType&&!feat.manualPrerequisites?.length&&!feat.effects.some(e=>['skillTraining','trainedSkill','classSkill','chosenTalent','skillSubstitution','forcePowerSlots'].includes(e.target)),'Unsupported conditional starting feat');}
  function prerequisite(r) {
    if (['all','any'].includes(r.kind)) { assert(Array.isArray(r.requirements)); r.requirements.forEach(prerequisite); return; }
    assert(['ability','feat','featChoice','talent','talentChoice','power','darkSideScore','trained','untrained','classSkill','proficientChoice','focusChoice','bab','level','nonDroid','trait','size','species','droid','weaponFocusMode','weaponProficiencyMode','classChoices','tradition'].includes(r.kind), `Unsupported prerequisite ${r.kind}`);
    if(r.kind==='tradition')assert(p.rules.traditionTalentAccess?.some(t=>t.id===r.value),'Unknown Force Tradition');
    if(r.kind==='classChoices')assert(['forceTechnique','forceSecret','medicalSecret'].includes(r.value)&&Number.isInteger(r.min)&&r.min>=1&&r.min<=20,'Invalid class feature count');
    if(r.kind==='featChoice'){requireRef('feats',r.value);if(r.choice!==undefined)requireRef('skills',r.choice);}
    if(r.kind==='trait')assert.equal(r.value,'rage');
    if(r.kind==='size')assert(p.rules.weaponSizeOrder.includes(r.value));
    if(r.kind==='weaponFocusMode')assert.equal(r.value,'melee');
    if(r.kind==='weaponProficiencyMode')assert(r.value==='ranged'&&r.excludedGroups?.length===1&&r.excludedGroups[0]==='heavy-weapons');
    if(r.kind==='species')assert(typeof r.value==='string'&&r.value.length>0&&r.value.length<=100,'Invalid prerequisite species');
    if(r.kind==='power'&&r.value!=='$choice')requireRef('forcePowers',r.value);
    if(r.kind==='talentChoice'){requireRef('talents',r.value);assert(r.choice==='$choice'||GROUPS.includes(r.choice),'Unsupported talent choice prerequisite');}
    if(r.kind==='darkSideScore'){assert(Number.isInteger(r.min)&&r.min>=0&&r.min<=1000);if(r.max!==undefined)assert(Number.isInteger(r.max)&&r.max>=r.min&&r.max<=1000,'Invalid Dark Side Score range');}
    if (r.kind === 'ability') { assert(ABILITIES.includes(r.value)); assert(Number.isInteger(r.min)); }
    if (r.kind === 'bab'||r.kind==='level') assert(Number.isInteger(r.min)&&r.min>=0&&r.min<=20);
    if (r.kind === 'feat') requireRef('feats',r.value);
    if (r.kind === 'talent') requireRef('talents',r.value);
    if (['trained','untrained','classSkill'].includes(r.kind) && r.value !== '$choice') requireRef('skills',r.value);
    if(['proficientChoice','focusChoice'].includes(r.kind))assert(r.value==='$choice'||GROUPS.includes(r.value),'Unknown prerequisite weapon group');
  }
  assert.deepEqual(p.rules.attackAbilities,{"base":{"melee":"str","ranged":"dex"},"choices":["str","dex","cha"],"unarmedLightCounselingId":"jc:112-unarmed-attacks-and-weapon-finesse","replacements":[{"id":"feat:weapon-finesse","kind":"feat","ability":"dex","mode":"melee","eligible":"light-or-lightsaber","proficient":false,"focusedOneHanded":true,"sourceIds":["source:wiki-weapon-finesse","source:wiki-category-weapons-weapon-sizes","source:wiki-category-web-enhancements-unarmed-attacks-and-weapon-finesse"]},{"id":"talent:noble-fencing-style","kind":"talent","ability":"cha","mode":"melee","eligible":"light-or-lightsaber","proficient":true,"focusedOneHanded":false,"sourceIds":["source:wiki-fencing-talent-tree-noble-fencing-style","source:wiki-category-weapons-weapon-sizes","source:wiki-category-web-enhancements-unarmed-attacks-and-weapon-finesse"]}]});
  for(const r of p.rules.attackAbilities.replacements){assert(r.sourceIds.every(id=>sources.has(id)));assert(p[r.kind==='feat'?'feats':'talents'].some(t=>t.id===r.id&&t.automation==='partial'&&r.sourceIds.includes(t.sourceId)));}
  assert.deepEqual(p.rules.terrainMovementAbilities,[{"talentId":"talent:surefooted","ignoreDifficultTerrain":true,"sourceIds":["source:wiki-survivor-talent-tree-surefooted","source:wiki-move"]}]);
  for(const r of p.rules.terrainMovementAbilities){assert(r.sourceIds.every(id=>sources.has(id)));assert(p.talents.some(t=>t.id===r.talentId&&t.automation==='partial'&&r.sourceIds.includes(t.sourceId)));}
  assert.deepEqual(p.rules.deflectionModifiers,[{"talentId":"talent:shii-cho","penaltyPerPriorAttempt":2,"sourceIds":["source:wiki-lightsaber-forms-talent-tree-shii-cho"]}]);
  assert.deepEqual(p.rules.lightsaberDefenseStyle,{"talentId":"talent:makashi","turnTalentId":"lightsaber-defense","amount":2,"maximum":5,"weaponCount":1,"hands":1,"sourceIds":["source:wiki-lightsaber-forms-talent-tree-makashi"]});
  assert([...p.rules.deflectionModifiers.flatMap(r=>r.sourceIds),...p.rules.lightsaberDefenseStyle.sourceIds].every(id=>sources.has(id)),"Missing style sources");
  for(const r of [...p.rules.deflectionModifiers,p.rules.lightsaberDefenseStyle])assert(p.talents.some(t=>t.id===r.talentId&&t.automation==='partial'&&r.sourceIds.includes(t.sourceId)),'Missing reviewed style talent');
  assert.deepEqual(p.rules.deflection,{"skillId":"skill:use-the-force","action":"reaction","comparison":"at-least","penaltyPerPriorAttempt":5,"reset":"own-turn-start","weapon":"wielded-activated-lightsaber","aware":true,"notFlatFooted":true,"adjacentForcePoints":1,"rerollTalentId":"talent:soresu","evasionTalentId":"talent:evasion","forceLightningConditionSteps":1,"forceLightningEnhancedConditionSteps":2,"sourceIds":["source:block","source:deflect","source:wiki-lightsaber-forms-talent-tree-soresu","source:evasion","source:wiki-sonic-damage","source:wiki-force-lightning","source:wiki-attacks","source:wiki-bonuses-and-penalties"]},'Changed deflection rules');
  assert.deepEqual(p.rules.deflectionActions,[{"id":"block","talentId":"talent:block","mode":"melee","kinds":["single","area"],"halfOnSuccess":["area"]},{"id":"deflect","talentId":"talent:deflect","mode":"ranged","kinds":["single","area","autofire","force-lightning"],"halfOnSuccess":["autofire","force-lightning"],"sonicException":true,"capitalRequiresPointDefense":true}],'Changed deflection action rules');
  assert(p.rules.deflection.sourceIds.every(id=>sources.has(id)),'Missing deflection sources');
  assert.deepEqual(p.rules.negatingPowers,[{"powerId":"power:negate-energy","action":"reaction","damageTypes":["energy"],"aware":true,"notFlatFooted":true,"dc":"raw-attack-damage","comparison":"at-least","success":"negate-attack","failure":"normal-incoming-damage","healing":{"forcePoints":1,"action":"reaction","amount":"raw-attack-damage","maximum":"normal-max-hp"},"sourceIds":["source:wiki-negate-energy","source:wiki-attacks","source:wiki-force-powers","source:wiki-hit-points"]}],'Changed negating power rules');
  assert(p.rules.negatingPowers.every(r=>r.sourceIds.every(id=>sources.has(id))),'Missing negating power sources');
  assert.deepEqual(p.rules.resistancePowers,[{"powerId":"power:energy-resistance","thresholds":[{"dc":20,"dr":5},{"dc":25,"dr":10},{"dc":30,"dr":15},{"dc":35,"dr":20}],"damageTypes":["energy"],"duration":"start-next-turn","maintenance":"swift","quickening":{"action":"swift","forcePoints":1,"timing":"before-check"},"damageCheck":{"skillId":"skill:use-the-force","baseDC":15,"damage":"post-protection-before-hp-halving"},"sourceIds":["source:wiki-energy-resistance","source:wiki-attacks","source:wiki-force-powers"]},{"powerId":"power:resist-force","kind":"defense","thresholds":[{"dc":15,"bonus":1},{"dc":20,"bonus":2},{"dc":25,"bonus":3}],"type":"untyped","against":"force-powers","enhancementDefenses":2,"maintenance":"swift","duration":"start-next-turn","damageCheck":{"baseDC":15},"sourceIds":["source:wiki-resist-force","source:wiki-force-powers","source:wiki-bonuses-and-penalties"]},{"powerId":"power:cloak","kind":"cloak","thresholds":[{"dc":15,"bonus":0},{"dc":20,"bonus":2},{"dc":25,"bonus":3},{"dc":30,"bonus":5}],"type":"force","skill":"skill:stealth","totalConcealment":true,"enhancementBonus":5,"maintenance":"standard","maintenanceCheck":true,"duration":"start-next-turn","damageCheck":{"baseDC":15},"upkeepAdeptAmbiguityId":"ambiguity:adept-cloak-upkeep","sourceIds":["source:wiki-cloak","source:wiki-force-powers","source:wiki-bonuses-and-penalties"]}],'Changed resistance power rules');
  assert(p.rules.resistancePowers.every(r=>r.sourceIds.every(id=>sources.has(id))),'Missing resistance power sources');
  assert.deepEqual(p.rules.shieldPowers,[{"powerId":"power:force-shield","thresholds":[{"dc":15,"sr":5},{"dc":20,"sr":10},{"dc":25,"sr":15},{"dc":30,"sr":20}],"enhancementSR":5,"duration":"start-next-turn","maintenance":"standard","recharge":false,"endsAtZero":true,"sourceIds":["source:wiki-force-shield","source:wiki-attacks","source:wiki-force-powers"]}],'Changed shield power rules');
  assert(p.rules.shieldPowers.every(r=>r.sourceIds.every(id=>sources.has(id))),'Missing shield power sources');
  assert.deepEqual(p.rules.ragePowers,[{"powerId":"power:dark-rage","thresholds":[{"dc":15,"bonus":2},{"dc":20,"bonus":4},{"dc":25,"bonus":6}],"type":"rage","mode":"melee","duration":"end-turn","enhancement":"encounter","focusSkills":["skill:mechanics","skill:stealth","skill:use-the-force"],"techniqueId":"classchoice:improved-dark-rage","sourceIds":["source:wiki-dark-rage","source:wiki-improved-dark-rage","source:wiki-wookiee","source:wiki-bonuses-and-penalties"]}],'Changed ragePowers rules');
  assert.deepEqual(p.rules.surpriseRound,{"types":["standard","move","swift"],"maximumActions":1,"flatFootedUntil":"first-regular-turn","exception":{"powerId":"power:dark-rage","techniqueId":"classchoice:improved-dark-rage"},"sourceIds":["source:wiki-combat-sequence","source:wiki-improved-dark-rage"]},'Changed surpriseRound rules');
  assert([...p.rules.ragePowers.flatMap(r=>r.sourceIds),...p.rules.surpriseRound.sourceIds].every(id=>sources.has(id)),'Missing Rage/surprise sources');
  assert(p.rules.ragePowers.every(r=>p.classChoices.some(t=>t.id===r.techniqueId&&t.automation==='partial')),'Missing reviewed Rage technique');
  assert.deepEqual(p.rules.jumpMovement,{"skillId":"skill:jump","metersPerSquare":1.5,"runningStartSquares":4,"dcPerMeter":{"long":3,"high":12},"standingMultiplier":2,"poleMultiplier":0.5,"maximumMoveActions":2,"take20TimeMultiplier":20,"sourceIds":["source:wiki-jump","source:wiki-skills","source:wiki-move"]},'Changed Jump movement rules');
  assert(p.rules.jumpMovement.sourceIds.every(id=>sources.has(id)),'Missing Jump movement sources');
  assert.deepEqual(p.rules.movementPowers,[{"powerId":"power:surge","action":"free-action","thresholds":[{"dc":10,"jumpBonus":10,"speedBonus":2},{"dc":15,"jumpBonus":20,"speedBonus":4},{"dc":20,"jumpBonus":30,"speedBonus":6}],"jumpType":"force","speedType":"untyped","runningStart":true,"includesSpeedAdjustment":true,"enhancement":{"forcePoints":1,"jumpBonus":10,"speedBonus":2},"destiny":{"points":1,"speedBonus":4,"jumpWithoutCheck":true},"duration":"start-next-turn","sourceIds":["source:wiki-surge","source:wiki-force-powers","source:wiki-bonuses-and-penalties","source:wiki-jump","source:wiki-combat-sequence"]}],'Changed movement power rules');
  assert(p.rules.movementPowers.every(r=>r.sourceIds.every(id=>sources.has(id))),'Missing movement power sources');
  assert.deepEqual(p.rules.mentalPowerEffects,[{"powerId":"power:mind-trick","kind":"mental-effect","defense":"will","inclusive":true,"minimumIntelligence":3,"range":12,"modes":["hallucination","feint","suggestion","fear"],"fear":{"duration":"1-minute","maximumTargetLevel":"below-character-level","endsWhenWounded":true},"enhancement":{"forcePoints":1,"mode":"suggestion","baseAttitudeSteps":1,"marginPerStep":5},"sourceIds":["source:wiki-mind-trick","source:wiki-force-powers"]}],'Changed mental powers');
  assert(p.rules.mentalPowerEffects.every(r=>r.sourceIds.every(id=>sources.has(id))&&p.forcePowers.some(p=>p.id===r.powerId&&p.automation==='partial')),'Missing mental power sources');
  assert.deepEqual(p.rules.conditionPowerEffects,[{"powerId":"power:slow","kind":"speed-reduction","defense":"fortitude","inclusive":true,"thresholds":[{"dc":15,"speedReduction":1},{"dc":20,"speedReduction":2},{"dc":25,"speedReduction":3},{"dc":30,"speedReduction":4}],"sizeModifiers":{"large":5,"huge":10,"gargantuan":20,"colossal":50},"heavyLoad":{"skillPenalty":-10,"skills":["skill:acrobatics","skill:climb","skill:endurance","skill:initiative","skill:jump","skill:stealth","skill:swim"]},"duration":"start-next-turn","enhancement":{"forcePoints":1,"defensePenalty":5},"sourceIds":["source:wiki-slow","source:wiki-force-powers","source:wiki-attacks"]},{"powerId":"power:fear","kind":"action-limit","defense":"will","inclusive":true,"thresholds":[{"dc":15,"action":"standard"},{"dc":20,"action":"move"},{"dc":25,"action":"swift"},{"dc":30,"action":null}],"fearEffect":true,"duration":"target-next-turn","enhancement":{"forcePoints":1,"defensePenaltyOnHit":2,"duration":"caster-start-next-turn"},"sourceIds":["source:wiki-fear","source:wiki-force-powers"]},{"powerId":"power:obscure","kind":"attack-penalty","defense":"will","inclusive":true,"effect":{"attackPenalty":5},"duration":"triggering-attack","missReroll":{"target":"another-creature-adjacent-to-attacker","attackPenalty":5},"enhancement":{"forcePoints":1,"duration":"target-start-next-turn"},"sourceIds":["source:wiki-obscure","source:wiki-force-powers"]},{"powerId":"power:force-blind","kind":"vision-denial","defense":"reflex","inclusive":true,"effect":{"flatFooted":true,"concealmentFromOtherCreatures":true},"duration":"caster-start-next-turn","immunity":"does-not-rely-on-eyesight","quickening":{"action":"free","forcePoints":1,"timing":"before-check"},"sourceIds":["source:wiki-force-blind","source:wiki-force-powers"]},{"powerId":"power:inertia","kind":"wall-movement","thresholds":[{"dc":15,"speedMultiplier":0.5,"extraSquares":0},{"dc":20,"speedMultiplier":1,"extraSquares":0},{"dc":25,"speedMultiplier":1,"extraSquares":2},{"dc":30,"speedMultiplier":1,"extraSquares":4}],"enhancement":{"forcePoints":1,"extraSquares":2},"duration":"this-movement","fallsWithoutGround":true,"sourceIds":["source:wiki-inertia","source:wiki-force-powers"]}],'Changed condition powers');
  assert(p.rules.conditionPowerEffects.every(r=>r.sourceIds.every(id=>sources.has(id))&&p.forcePowers.some(p=>p.id===r.powerId&&p.automation==='partial')&&(r.heavyLoad?.skills||[]).every(id=>p.skills.some(s=>s.id===id))),'Missing condition power sources');
  assert.deepEqual(p.rules.opportunityPowers,[{"powerId":"power:high-ground-defense","kind":"opportunity","action":"swift-action","thresholds":[{"dc":15,"attack":0},{"dc":20,"attack":1},{"dc":25,"attack":2},{"dc":30,"attack":5}],"type":"force","duration":"start-next-turn","provocation":{"terrain":["low-object","difficult"],"event":"moves-adjacent"},"formTalentId":"talent:sokan","formDamageDice":1,"enhancement":{"forcePoints":1,"movementSquares":1,"provokes":false},"sourceIds":["source:wiki-high-ground-defense","source:wiki-lightsaber-forms-talent-tree-sokan","source:wiki-force-powers","source:wiki-bonuses-and-penalties","source:wiki-attacks-of-opportunity"]}],'Changed opportunity power rules');
  assert(p.rules.opportunityPowers.every(r=>r.sourceIds.every(id=>sources.has(id))&&p.forcePowers.some(p=>p.id===r.powerId&&p.automation==='partial')&&p.talents.some(t=>t.id===r.formTalentId)),'Missing opportunity power references');
  assert.deepEqual(p.rules.displacementPowers,[{"powerId":"power:force-thrust","kind":"forced-movement","action":"standard-action","range":12,"comparison":"greater-than","baseSquares":1,"marginPerSquare":5,"sizeModifiers":{"fine":-20,"diminutive":-15,"tiny":-10,"small":-5,"medium":0,"large":5,"huge":10,"gargantuan":15,"colossal":20},"stabilityBonus":5,"collision":{"dice":1,"die":6},"enhancement":{"forcePoints":1,"opponentPenalty":5,"collisionDice":2},"rangeTechnique":{"id":"classchoice:extended-force-thrust","range":18},"door":{"counselingId":"jc:111-moving-a-door","comparison":"at-least"},"sourceIds":["source:wiki-force-thrust","source:wiki-force-powers","source:wiki-extended-force-thrust","source:wiki-category-web-enhancements-moving-a-door"]}],'Changed displacement power rules');
  assert(p.rules.displacementPowers.every(r=>r.sourceIds.every(id=>sources.has(id))&&p.forcePowers.some(p=>p.id===r.powerId&&p.automation==='partial')&&p.classChoices.some(c=>c.id===r.rangeTechnique.id)&&p.jediCounseling.some(c=>c.id===r.door.counselingId)),'Missing displacement power references');
  assert.deepEqual(p.rules.thresholdPowers,[{"powerId":"power:crucitorn","kind":"damage-threshold","action":"reaction","thresholds":[{"dc":15,"bonus":5},{"dc":20,"bonus":10},{"dc":25,"bonus":15},{"dc":30,"bonus":20}],"type":"force","enhancement":{"forcePoints":1,"bonus":5},"duration":"triggering-damage","sourceIds":["source:wiki-crucitorn","source:wiki-force-powers","source:wiki-attacks","source:wiki-bonuses-and-penalties","source:wiki-hit-points"]}],'Changed threshold reaction powers');
  assert(p.rules.thresholdPowers.every(r=>r.sourceIds.every(id=>sources.has(id))&&p.forcePowers.some(p=>p.id===r.powerId&&p.automation==='partial')),'Missing threshold power sources');
  assert.deepEqual(p.rules.offensivePowerEffects,[{"powerId":"power:force-slam","kind":"outgoing-damage","defense":"fortitude","inclusive":true,"dice":4,"die":6,"area":true,"proneOnHit":true,"sizeModifiers":{"large":5,"huge":10,"gargantuan":20,"colossal":50},"enhancement":{"forcePoints":1,"dice":2},"sourceIds":["source:wiki-force-slam","source:wiki-force-powers","source:wiki-attacks"]},{"powerId":"power:force-blast","kind":"outgoing-damage","defense":"reflex","inclusive":false,"thresholds":[{"dc":15,"dice":2},{"dc":20,"dice":3},{"dc":25,"dice":4},{"dc":30,"dice":5}],"die":6,"area":false,"enhancement":{"forcePoints":1,"halfHeroicLevel":true},"sourceIds":["source:wiki-force-blast","source:wiki-force-powers","source:wiki-attacks"]},{"powerId":"power:force-lightning","kind":"outgoing-damage","defense":"reflex","inclusive":true,"dice":8,"die":6,"area":false,"halfOnMiss":true,"conditionOnHit":1,"enhancement":{"forcePoints":1,"conditionSteps":1},"sourceIds":["source:wiki-force-lightning","source:wiki-force-powers","source:wiki-attacks"]},{"powerId":"power:ionize","kind":"outgoing-damage","damageType":"ion","defense":"reflex","inclusive":true,"thresholds":[{"dc":20,"dice":4},{"dc":25,"dice":5},{"dc":30,"dice":6}],"die":6,"area":false,"enhancement":{"forcePoints":1,"dice":2},"sourceIds":["source:wiki-ionize","source:wiki-force-powers","source:wiki-attacks","source:wiki-ion-damage"]},{"powerId":"power:wound","kind":"outgoing-damage","damageType":"force","defense":"fortitude","inclusive":true,"dice":4,"die":6,"area":false,"sizeModifiers":{"large":5,"huge":10,"gargantuan":20,"colossal":50},"persistentDamageCondition":{"skillId":"skill:treat-injury","application":"surgery","dc":20},"enhancement":{"forcePoints":1,"dice":2},"sourceIds":["source:wiki-wound","source:wiki-force-powers","source:wiki-attacks"]},{"powerId":"power:combustion","kind":"outgoing-damage","damageType":"fire","defense":"fortitude","inclusive":true,"dice":4,"die":6,"area":true,"areaShape":"square-2x2","ignited":{"attackBonus":"use-the-force-result"},"enhancement":{"forcePoints":1,"conditionSteps":1,"conditionTargets":1},"sourceIds":["source:wiki-combustion","source:wiki-force-powers","source:wiki-attacks"]},{"powerId":"power:stagger","kind":"outgoing-damage","defense":"fortitude","inclusive":true,"dice":2,"die":6,"pushOnHit":{"squares":1,"direction":"away-from-caster","provokes":false},"targetScope":"one-adjacent-target","enhancement":{"forcePoints":1,"targetScope":"all-adjacent-enemies"},"sourceIds":["source:wiki-stagger","source:wiki-force-powers"]},{"powerId":"power:mind-shard","kind":"outgoing-damage","defense":"will","inclusive":true,"thresholds":[{"dc":15,"dice":2},{"dc":20,"dice":3},{"dc":25,"dice":4},{"dc":30,"dice":5}],"die":8,"conditionOnHit":1,"conditionRecoveryRestriction":{"duration":"caster-end-next-turn","blocksSelfRecovery":true,"allowsOtherCreatureRecovery":true},"enhancement":{"forcePoints":1,"dice":2},"sourceIds":["source:wiki-mind-shard","source:wiki-force-powers"]},{"powerId":"power:rend","kind":"outgoing-damage","damageType":"unspecified","defense":"reflex","inclusive":true,"dice":3,"die":6,"natural20Multiplier":2,"onZeroHP":{"severed":true,"livingKilled":true},"enhancement":{"forcePoints":1,"dice":2,"requiresHit":true},"sourceIds":["source:wiki-rend","source:wiki-force-powers"]}],'Changed offensive power effects');
  assert(p.rules.offensivePowerEffects.every(r=>r.sourceIds.every(id=>sources.has(id))&&p.forcePowers.some(p=>p.id===r.powerId&&p.automation==='partial')),'Missing offensive power sources');
  assert.deepEqual(p.rules.selfPowerEffects,[{"powerId":"power:battle-strike","kind":"next-attack","thresholds":[{"dc":15,"dice":1},{"dc":20,"dice":2},{"dc":25,"dice":3}],"attackBonus":1,"type":"force","die":6,"enhancementDice":2,"hitOnly":true,"duration":"end-next-turn","sourceIds":["source:wiki-battle-strike","source:wiki-force-powers","source:wiki-bonuses-and-penalties","source:wiki-attacks"]}],'Changed self power effects');
  assert(p.rules.selfPowerEffects.every(r=>r.sourceIds.every(id=>sources.has(id))),'Missing self power sources');
  assert.deepEqual(p.rules.timedTalentActions,[{"id":"damage-reduction-10","talentId":"talent:damage-reduction-10","forcePoints":1,"durationRounds":10,"damageReduction":10,"sourceIds":["source:wiki-control-talent-tree-damage-reduction-10","source:wiki-combat-sequence","source:wiki-attacks"]}],'Changed timed talent rules');
  assert(p.rules.timedTalentActions.every(r=>r.sourceIds.every(id=>sources.has(id))),'Missing timed talent sources');
  assert.deepEqual(p.rules.turnFeatEffects,[{"id":"anointed-hunter","featId":"feat:anointed-hunter","displacement":2,"effect":{"target":"attacks","amount":1,"type":"competence"},"ambiguityId":"ambiguity:anointed-hunter-duration","sourceIds":["source:wiki-anointed-hunter","source:wiki-nelvaanian"]}],'Changed turn feat effects');
  assert(p.rules.turnFeatEffects.every(r=>r.sourceIds.every(id=>sources.has(id))),'Missing turn feat sources');
  assert.deepEqual(p.rules.bonusHPGrants,JSON.parse('[{"id":"thrive-on-chaos","talentId":"talent:thrive-on-chaos","trigger":"creature-reduced-to-zero","base":5,"level":"character","levelDivisor":2,"sourceIds":["source:wiki-opportunist-talent-tree-thrive-on-chaos"]},{"id":"shoulder-to-shoulder","talentId":"talent:shoulder-to-shoulder","trigger":"turn-start-adjacent-ally","base":0,"level":"heroic","levelDivisor":1,"sourceIds":["source:wiki-republic-commando-talent-tree-shoulder-to-shoulder"]},{"id":"bando-gora-surge","talentId":"talent:bando-gora-surge","trigger":"moved-up-condition-track","base":5,"level":"heroic","levelDivisor":1,"sourceIds":["source:wiki-bando-gora-captain-talent-tree-bando-gora-surge"]},{"id":"luck-favors-the-bold","talentId":"talent:luck-favors-the-bold","trigger":"turn-start-exposed-to-aware-enemy","base":5,"level":"heroic","levelDivisor":2,"conscious":true,"sourceIds":["source:wiki-gambling-leader-talent-tree-luck-favors-the-bold"]}]'),'Changed bonus HP grants');
  for(const r of p.rules.bonusHPGrants){assert(r.sourceIds.every(id=>sources.has(id)),'Missing bonus HP grant source');assert(p.talents.some(t=>t.id===r.talentId&&t.automation==='partial'&&t.sourceId===r.sourceIds[0]),'Missing bonus HP grant talent');}
  assert.deepEqual(p.rules.bonusHitPoints,{"sourceIds":["source:wiki-hit-points"],"toughAsDurasteel":{"classId":"class:martial-arts-master","minimumLevel":2,"armorCategory":"light","ambiguityId":"ambiguity:tough-as-durasteel-amount","sourceIds":["source:wiki-martial-arts-master"]}},'Changed bonus HP rules');
  assert(p.rules.bonusHitPoints.sourceIds.every(id=>sources.has(id))&&p.rules.bonusHitPoints.toughAsDurasteel.sourceIds.every(id=>sources.has(id)),'Missing bonus HP sources');
  assert.deepEqual(p.rules.triggeredDefenseBonuses,[{"id":"bothan-will","recordId":"feat:bothan-will","trigger":"failed-vs-will","effect":{"target":"defenseBonus","defense":"will","amount":2,"type":"circumstance","circumstance":"bothan-will"},"duration":"start-next-turn","sourceIds":["source:wiki-bothan-will"]},{"id":"increased-resistance","recordId":"feat:increased-resistance","trigger":"failed-vs-fortitude","effect":{"target":"defenseBonus","defense":"fortitude","amount":2,"type":"circumstance","circumstance":"increased-resistance"},"duration":"start-next-turn","sourceIds":["source:wiki-increased-resistance"]},{"id":"moving-target","recordId":"feat:moving-target","trigger":"ended-turn-3-squares-away","effect":{"target":"defenseBonus","defense":"reflex","amount":1,"type":"dodge"},"lostWhenDexDenied":true,"duration":"start-next-turn","sourceIds":["source:wiki-moving-target"]},{"id":"rebel-military-training","recordId":"feat:rebel-military-training","trigger":"running-attack-before-and-after","effect":{"target":"defenseBonus","defense":"reflex","amount":2,"type":"dodge"},"lostWhenDexDenied":true,"duration":"start-next-turn","sourceIds":["source:wiki-rebel-military-training"]},{"id":"revenge","recordId":"talent:revenge","trigger":"ally-reduced-to-zero","effects":[{"target":"attacks","amount":2,"type":"force"},{"target":"damage","amount":2,"type":"force"}],"duration":"encounter","sourceIds":["source:wiki-dark-side-talent-tree-revenge"]},{"id":"focused-warrior","recordId":"talent:focused-warrior","trigger":"dealt-damage","effect":{"target":"defenseBonus","defense":"will","amount":5,"type":"morale"},"lostWhenFlatFooted":true,"duration":"start-next-turn","sourceIds":["source:wiki-mercenary-talent-tree-focused-warrior"]},{"id":"knight-s-morale","recordId":"talent:knight-s-morale","trigger":"ally-lightsaber-hit","effect":{"target":"defenses","amount":1,"type":"morale"},"duration":"end-next-turn","sourceIds":["source:wiki-knight-s-resolve-talent-tree-knight-s-morale"]},{"id":"for-the-cause","recordId":"talent:for-the-cause","trigger":"threshold-exceeded-nearby","effects":[{"target":"attacks","amount":2,"type":"untyped"},{"target":"damage","amount":2,"type":"untyped"}],"duration":"end-next-turn","sourceIds":["source:wiki-revolutionary-talent-tree-for-the-cause"]},{"id":"defensive-acuity","recordId":"talent:defensive-acuity","trigger":"fight-defensively","duration":"end-next-turn","sourceIds":["source:wiki-jedi-guardian-talent-tree-defensive-acuity","source:wiki-fight-defensively"],"effects":[{"target":"groupDice","weaponGroup":"lightsabers","mode":"melee","dice":1},{"target":"deflectionCheckBonus","amount":2,"type":"circumstance","circumstance":"defensive-acuity"}]},{"id":"improved-soft-cover","recordId":"talent:improved-soft-cover","trigger":"swift-adjacent-creature","effect":{"target":"defenseBonus","defense":"reflex","amount":2,"type":"cover"},"duration":"start-next-turn","sourceIds":["source:wiki-trickery-talent-tree-improved-soft-cover"],"action":"swift"},{"id":"gradual-resistance","recordId":"talent:gradual-resistance","trigger":"damaged-by-force-power","effects":[{"target":"conditionalDefense","defense":"reflex","against":"damaging-force-power","amount":2,"type":"force"},{"target":"conditionalDefense","defense":"fortitude","against":"damaging-force-power","amount":2,"type":"force"},{"target":"conditionalDefense","defense":"will","against":"damaging-force-power","amount":2,"type":"force"}],"duration":"encounter","sourceIds":["source:wiki-jedi-sentinel-talent-tree-gradual-resistance"]}],'Changed triggered bonuses');
  for(const r of p.rules.triggeredDefenseBonuses){assert(r.sourceIds.every(id=>sources.has(id)),'Missing triggered source');assert([...p.feats,...p.talents].some(t=>t.id===r.recordId&&t.automation==='partial'&&t.sourceId===r.sourceIds[0]),'Missing triggered record');}
  assert.deepEqual(p.rules.moveTalentEffects,[['skirmisher','attacks'],['improved-skirmisher','defenses']].map(([id,target])=>({id,talentId:'talent:'+id,minimumSquares:2,minimumDisplacement:1,effect:{target,amount:1,type:'untyped'},duration:'start-next-turn',sourceIds:['source:wiki-misfortune-talent-tree-'+id,'source:wiki-move']})),'Changed move talent effects');
  for(const r of p.rules.moveTalentEffects){assert(r.sourceIds.every(id=>sources.has(id)),'Missing move talent source');assert(p.talents.some(t=>t.id===r.talentId&&t.automation==='partial'&&t.sourceId===r.sourceIds[0]),'Missing move talent');}
  assert.deepEqual(p.rules.defenseShiftActions,[...[[1,-2,'i'],[2,-5,'ii']].map(([bonus,penalty,n])=>({id:'shift-defense-'+n,talentId:'talent:shift-defense-'+n,bonus,penalty,type:'competence',duration:'start-next-turn',sourceIds:['source:wiki-military-tactics-talent-tree-shift-defense-'+n,'source:wiki-bonuses-and-penalties']})),{id:'shift-defense-iii',talentId:'talent:shift-defense-iii',bonus:5,penalty:-5,penaltyScope:'others',type:'competence',duration:'start-next-turn',ambiguityId:'ambiguity:shift-defense-iii-duration',sourceIds:['source:wiki-military-tactics-talent-tree-shift-defense-iii','source:wiki-bonuses-and-penalties']}],'Changed defense shift rules');
  assert.deepEqual(p.rules.ambiguities.find(a=>a.id==='ambiguity:shift-defense-iii-duration')?.options.map(o=>o.value),['start-next-turn','permanent'],'Changed Shift Defense III ruling options');
  for(const r of p.rules.defenseShiftActions){assert(r.sourceIds.every(id=>sources.has(id)),'Missing defense shift source');assert(p.talents.some(t=>t.id===r.talentId&&t.automation==='partial'&&t.sourceId===r.sourceIds[0]),'Missing defense shift talent');assert(p.rules.actionEconomy.actions.some(a=>a.id===r.id&&a.type==='swift'&&a.count===1),'Changed defense shift action');}
  assert.deepEqual(p.rules.reactionTalentActions,[{id:'soft-to-solid',talentId:'talent:soft-to-solid',trigger:'damaged-by-attack',forcePoints:1,damageReduction:10,duration:'end-next-turn',sourceIds:['source:wiki-matukai-adept-talent-tree-soft-to-solid','source:wiki-attacks','source:wiki-combat-sequence']}],'Changed reaction talent rules');
  for(const r of p.rules.reactionTalentActions){assert(r.sourceIds.every(id=>sources.has(id)),'Missing reaction talent source');assert(p.talents.some(t=>t.id===r.talentId&&t.automation==='partial'&&t.sourceId===r.sourceIds[0]),'Missing reaction talent');assert(p.rules.actionEconomy.actions.some(a=>a.id===r.id&&a.type==='reaction'&&a.count===1),'Changed reaction talent action');}
  if(p.rules.turnTalentActions!==undefined){
    assert.deepEqual(p.rules.turnTalentActions,[{id:'lightsaber-defense',talentId:'talent:lightsaber-defense',amountPerSelection:1,maximum:3,weaponGroup:'lightsabers',doubleTalentId:'talent:jar-kai',doubleWeaponCount:2,effect:{target:'conditionalDefense',defense:'reflex',against:'aware',type:'deflection'},sourceIds:['source:wiki-lightsaber-combat-talent-tree-lightsaber-defense','source:wiki-lightsaber-forms-talent-tree-jar-kai']},{id:'wan-shen-defense',talentId:'talent:wan-shen-defense',amountPerSelection:1,maximum:3,weaponId:'equipment:wan-shen',ambiguityId:'ambiguity:wan-shen-defense-weapon-change',effect:{target:'conditionalDefense',defense:'reflex',against:'melee-aware',type:'deflection'},sourceIds:['source:wiki-matukai-adept-talent-tree-wan-shen-defense','source:wiki-wan-shen','source:wiki-melee-attacks']},{id:'shadow-armor',talentId:'talent:shadow-armor',amountPerSelection:1,maximum:4,effect:{target:'defenseBonus',defense:'reflex',type:'force'},sourceIds:['source:wiki-disciple-of-twilight-talent-tree-shadow-armor','source:wiki-bonuses-and-penalties']}],'Changed turn talent rules');
    for(const r of p.rules.turnTalentActions){
      assert(r.sourceIds.every(id=>sources.has(id)),'Missing turn talent source');
      for(const id of [r.talentId,r.doubleTalentId].filter(Boolean))assert(p.talents.some(t=>t.id===id&&t.automation==='partial'),'Missing turn talent');
      if(r.weaponId)assert(p.equipment.some(e=>e.id===r.weaponId&&e.kind==='weapon'&&e.mode==='melee'),'Missing turn talent weapon');
      assert(p.rules.actionEconomy.actions.some(a=>a.id===r.id&&a.type==='swift'&&a.count===1),'Changed turn talent action');
    }
  }
  if(p.rules.conditionRecoveryActions!==undefined){
    const rows=p.rules.conditionRecoveryActions;
    assert.deepEqual(rows,[{"id":"equilibrium","talentId":"talent:equilibrium","steps":5,"forcePoints":1,"removePersistent":true,"dailyUsesPerSelection":0,"sourceIds":["source:wiki-control-talent-tree-equilibrium","source:wiki-conditions","source:wiki-category-web-enhancements-equilibrium-and-persistent-conditions"]},{"id":"indomitable","talentId":"talent:indomitable","steps":5,"forcePoints":0,"removePersistent":false,"dailyUsesPerSelection":1,"sourceIds":["source:wiki-commando-talent-tree-indomitable","source:wiki-conditions"]},{"id":"resilience","talentId":"talent:resilience","steps":2,"forcePoints":0,"removePersistent":false,"dailyUsesPerSelection":0,"sourceIds":["source:wiki-jedi-guardian-talent-tree-resilience","source:wiki-conditions"]}],'Changed condition recovery rules');
    for(const r of rows){assert(r.sourceIds.every(id=>sources.has(id)),'Missing condition recovery source');assert(p.talents.some(t=>t.id===r.talentId&&t.automation==='partial'),'Missing condition recovery talent');assert(p.rules.actionEconomy.actions.some(a=>a.id===r.id&&a.type===(r.id==='resilience'?'full':'swift')&&a.count===1),'Changed condition recovery action');}
    assert.equal(p.rules.counselingApplications['jc:114-equilibrium-and-persistent-conditions'],'raw-equivalent');
  }
  assert(p.rules.actionEconomy.actions.some(r=>r.id==='craft-frag-grenade'&&r.type==='full'&&r.count===1),'Changed Bomb Thrower crafting action');
  if(p.rules.skillActions!==undefined){
    const t=p.talents.find(t=>t.id==='talent:force-focus'),skill=p.skills.find(s=>s.id==='skill:use-the-force');
    assert(t?.automation==='partial'&&skill,'Missing skill action records');
    assert.deepEqual(p.rules.skillActions,[{id:'force-focus',talentId:t.id,skillId:skill.id,dc:15,effect:'recover-power',sourceIds:[t.sourceId,skill.sourceId,'source:wiki-skills']}],'Changed Force Focus rule');
    assert(p.rules.skillActions.every(r=>r.sourceIds.every(id=>sources.has(id))),'Missing skill action sources');
    assert(p.rules.actionEconomy.actions.some(r=>r.id==='force-focus'&&r.type==='full'&&r.count===1),'Changed Force Focus action');
  }
  for (const key of ['species','classes','skills','feats','talents','equipment','destinies','backgrounds','forcePowers','starshipManeuvers','vehicles','classChoices','rulePages']) for (const r of p[key]||[]) {
    assert(!ids.has(r.id), `Duplicate ID ${r.id}`); ids.add(r.id);
    assert(/^[a-z]+:[a-z0-9-]+$/.test(r.id)); assert.equal(typeof r.name,'string'); assert(sources.has(r.sourceId), `Missing source ${r.id}`);
    if(r.article !== undefined) {
      assert(sources.has(r.article.sourceId),`Missing article source ${r.id}`);
      assert(Object.keys(r.article).every(k=>['sourceId','blocks'].includes(k)));
      assert(Array.isArray(r.article.blocks));let count=0;
      function node(n,depth=0) {
        assert(++count<=50000 && depth<=40,'Article too large');
        if(typeof n==='string')return;
        assert(n && WIKI_TAGS.has(n.tag) && Array.isArray(n.children),'Invalid article node');
        const allowed=['tag','children',...(n.tag==='a'?['href','ruleId']:[]),...(['td','th'].includes(n.tag)?['colspan','rowspan']:[])];
        assert(Object.keys(n).every(k=>allowed.includes(k)),'Invalid article attribute');
        if(n.tag==='a'){assert(wikiURL(n.href),'Invalid article URL');if(n.ruleId)assert((p.rulePages||[]).some(r=>r.id===n.ruleId),'Unknown article rule');}
        for(const k of ['colspan','rowspan'])if(k in n)assert(Number.isInteger(n[k]) && n[k]>=1 && n[k]<=30);
        n.children.forEach(child=>node(child,depth+1));
      }
      r.article.blocks.forEach(n=>node(n));
    }
    if (r.reference !== undefined) {
      assert(Array.isArray(r.reference));
      for(const entry of r.reference) {
        assert.equal(typeof entry.heading,'string');assert.equal(typeof entry.text,'string');
        assert(sources.has(entry.sourceId),`Missing reference source ${r.id}`);
        assert(Object.keys(entry).every(k=>['heading','text','sourceId'].includes(k)));
      }
    }
    if (key === 'species') {
      validateCustomizationData(r,p,message=>{throw new Error(message);});
      validateSpeciesProfileData(r,p,message=>{throw new Error(message);});
      if(r.droidStartingPackage!==undefined){
        const d=r.droidStartingPackage;assert(r.isDroid&&d&&Object.keys(d).sort().join(',')==='appendages,credits,locomotionBySize,processor','Invalid Droid starting package');
        assert.equal(d.processor,'equipment:heuristic-processor');assert.equal(d.appendages,2);assert.equal(d.credits,1000);assert.deepEqual(d.locomotionBySize,{small:'equipment:tracked',medium:'equipment:walking'});
        for(const id of [d.processor,...Object.values(d.locomotionBySize)])requireRef('equipment',id);
      }
      if(r.creationChoices!==undefined){
        assert(Array.isArray(r.creationChoices)&&r.creationChoices.length>0,'Invalid species choice groups');
        const groupIds=new Set();
        for(const g of r.creationChoices){
          assert(g&&Object.keys(g).every(k=>['id','name','kind','options','defaultOption'].includes(k))&&typeof g.id==='string'&&/^[a-z][a-z0-9-]*$/.test(g.id)&&!groupIds.has(g.id)&&typeof g.name==='string'&&g.name.trim()&&['ability','language','skillFocus','weaponFocus','size','droidDegree','understoodLanguage','spokenLanguage','trainedSkill','startingFeat','skillTraining'].includes(g.kind),'Invalid species choice group');groupIds.add(g.id);
          assert(Array.isArray(g.options)&&g.options.length>=2,'Invalid species options');const optionIds=new Set();
          for(const o of g.options){
            const field={ability:'adjustments',size:'adjustments',droidDegree:'adjustments',understoodLanguage:'language',spokenLanguage:'language',language:'language',skillFocus:'skillId',weaponFocus:'choice',trainedSkill:'skillId',skillTraining:'skillId',startingFeat:'featId'}[g.kind];
            assert(o&&Object.keys(o).every(k=>['id','name',field,...(g.kind==='weaponFocus'?['requiresFeat']:g.kind==='size'?['size','speed']:g.kind==='droidDegree'?['degree','talentTrees']:[])].includes(k))&&typeof o.id==='string'&&/^[a-z][a-z0-9-]*$/.test(o.id)&&!optionIds.has(o.id)&&typeof o.name==='string'&&o.name.trim(),'Invalid species option');optionIds.add(o.id);
            if(g.kind==='droidDegree')assert(r.noConstitution&&r.isDroid&&Number.isInteger(o.degree)&&o.degree>=1&&o.degree<=5&&Array.isArray(o.talentTrees)&&o.talentTrees.length&&o.talentTrees.every(t=>typeof t==='string'&&t.length>0),'Invalid droid degree');
            if(g.kind==='size'){assert(p.rules.sizeReflex[o.size]!==undefined&&Number.isInteger(o.speed)&&o.speed>=0,'Invalid species size profile');}
            if(['ability','size','droidDegree'].includes(g.kind))assert(o.adjustments&&typeof o.adjustments==='object'&&!Array.isArray(o.adjustments)&&(g.kind==='size'||Object.keys(o.adjustments).length>0)&&Object.entries(o.adjustments).every(([a,n])=>ABILITIES.includes(a)&&Number.isInteger(n)&&n!==0&&n>=(g.kind==='size'?-32:-10)&&n<=(g.kind==='size'?32:10)),'Invalid species ability option');
            if(['language','understoodLanguage','spokenLanguage'].includes(g.kind))assert(typeof o.language==='string'&&o.language.trim()&&o.language.length<=100,'Invalid species language option');
            if(['skillFocus','trainedSkill','skillTraining'].includes(g.kind))requireRef('skills',o.skillId);
            if(g.kind==='startingFeat')speciesStartingFeat(o.featId);
            if(g.kind==='weaponFocus'){requireRef('feats','feat:weapon-focus');assert(featureChoices(ix.feats.get('feat:weapon-focus'),p).includes(o.choice),'Invalid species Weapon Focus');if(o.requiresFeat!==undefined)requireRef('feats',o.requiresFeat);}
          }
          if(g.defaultOption!==undefined)assert(g.kind==='size'&&g.options.some(o=>o.id===g.defaultOption),'Invalid default size profile');
        }
      }
      if(r.limbRegeneration){assert.deepEqual(Object.keys(r.limbRegeneration).sort(),['die','sourceId']);assert.equal(r.limbRegeneration.die,10);assert(sources.has(r.limbRegeneration.sourceId),'Missing limb regeneration source');}
      if(r.bellow)assert.deepEqual(r.bellow,{damageDice:3,die:6,coneSquares:6,conditionCost:1,extraDieCost:1,defense:'fortitude'});
      if(r.rage){assert.deepEqual(Object.keys(r.rage).sort(),['blockedSkills','bonus','dailyUses','durationBase','restMinutes']);assert(r.rage.dailyUses===1&&r.rage.bonus===2&&r.rage.durationBase===5&&r.rage.restMinutes===10);assert.deepEqual(r.rage.blockedSkills,['skill:mechanics','skill:stealth','skill:use-the-force']);r.rage.blockedSkills.forEach(id=>requireRef('skills',id));}
      if(r.skillRerolls){assert(Array.isArray(r.skillRerolls));for(const e of r.skillRerolls){requireRef('skills',e.skill);assert(Object.keys(e).every(k=>['skill','keep','when'].includes(k))&&['replace','best'].includes(e.keep)&&(!e.when||['intimidate','searchYourFeelingsOrSenseForce','keenSmell'].includes(e.when)),'Unsupported species reroll');}}
      if(r.take10Skills){assert(Array.isArray(r.take10Skills)&&new Set(r.take10Skills).size===r.take10Skills.length);r.take10Skills.forEach(id=>requireRef('skills',id));}
      if(r.vision)assert(['low-light','darkvision'].includes(r.vision));
      for(const k of ['breatheUnderwater','knockdownImmune','flightHeavyLoadForbidden'])if(r[k]!==undefined)assert.equal(typeof r[k],'boolean');
      for(const k of ['scentRange','holdBreathMultiplier','naturalHealingMultiplier'])if(r[k]!==undefined)assert(Number.isInteger(r[k])&&r[k]>0);
      if(r.traits!==undefined)assert(Array.isArray(r.traits)&&new Set(r.traits).size===r.traits.length&&r.traits.every(t=>t==='rage'),'Unsupported species trait');
      if (r.isDroid !== undefined) assert.equal(typeof r.isDroid,'boolean',`Invalid droid classification: ${r.id}`);
      for(const k of ['noConstitution','heuristicProcessor'])if(r[k]!==undefined)assert.equal(typeof r[k],'boolean','Invalid '+k);
      if(r.noConstitution)assert(r.isDroid&&p.rules.droidAbilities&&r.abilityAdjustments.con===undefined,'Missing droid ability contract');
      assert(p.rules.sizeReflex[r.size] !== undefined && (Number.isInteger(r.speed)||r.speed===null&&r.droidBody?.speed==='manual'));
      for(const [k,v] of Object.entries(r.abilityAdjustments)) assert(ABILITIES.includes(k) && Number.isInteger(v));
      if(r.fixedAbilities!==undefined){assert(r.fixedAbilities&&typeof r.fixedAbilities==='object'&&!Array.isArray(r.fixedAbilities),'Invalid fixed ability scores');assert.deepEqual(Object.keys(r.fixedAbilities).sort(),[...(r.noConstitution?p.rules.droidAbilities.abilities:ABILITIES)].sort());assert(Object.values(r.fixedAbilities).every(n=>Number.isInteger(n)&&n>=3&&n<=30),'Invalid fixed ability scores');}
      assert(Array.isArray(r.languages) && Array.isArray(r.reminders));
      for(const key of ['damageReduction','damageThresholdBonus'])if(r[key]!==undefined)assert(Number.isInteger(r[key])&&r[key]>=0,'Invalid species '+key);
      if(r.multiattackReduction!==undefined)assert(Number.isInteger(r.multiattackReduction)&&r.multiattackReduction>0&&r.multiattackReduction<=10,'Invalid innate multiple-attack reduction');
      if(r.naturalWeapons!==undefined){
        assert(Array.isArray(r.naturalWeapons)&&r.naturalWeapons.length>0&&r.naturalWeapons.length<=20,'Invalid natural weapons');const ids=new Set();
        const damage=v=>typeof v==='string'&&/^(1|[1-9][0-9]?d(2|3|4|6|8|10|12))$/.test(v);
        for(const w of r.naturalWeapons){assert(w&&Object.keys(w).every(k=>['id','name','damage','damageType','damageBySize'].includes(k))&&typeof w.id==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(w.id)&&!ids.has(w.id)&&typeof w.name==='string'&&w.name.trim()&&damage(w.damage)&&['Slashing','Piercing','Bludgeoning','Energy'].includes(w.damageType),'Invalid natural weapon');ids.add(w.id);if(w.damageBySize!==undefined){assert(w.damageBySize&&typeof w.damageBySize==='object'&&!Array.isArray(w.damageBySize));for(const [size,value]of Object.entries(w.damageBySize))assert(p.rules.weaponSizeOrder.includes(size)&&damage(value),'Invalid natural weapon size damage');}}
      }
      if(r.naturalArmor!==undefined)assert(Number.isInteger(r.naturalArmor)&&r.naturalArmor>=0,'Invalid natural armor');
      if(r.conditionalDefenses!==undefined){
        assert(Array.isArray(r.conditionalDefenses));
        for(const e of r.conditionalDefenses){
          assert(Object.keys(e).every(k=>['defense','against','amount','type'].includes(k)));
          assert(e.defense==='will'&&['use-the-force','persuasion'].includes(e.against)&&e.type==='untyped'&&Number.isInteger(e.amount),'Unsupported conditional defense');
        }
        assert(new Set(r.conditionalDefenses.map(e=>e.defense+':'+e.against)).size===r.conditionalDefenses.length,'Duplicate conditional defense');
      }
      if(r.bonusClassSkills){assert(Array.isArray(r.bonusClassSkills)&&new Set(r.bonusClassSkills).size===r.bonusClassSkills.length,'Invalid species class skills');r.bonusClassSkills.forEach(id=>requireRef('skills',id));}
      if(r.startingTrainedSkills!==undefined){assert(Array.isArray(r.startingTrainedSkills)&&new Set(r.startingTrainedSkills).size===r.startingTrainedSkills.length,'Invalid species training');r.startingTrainedSkills.forEach(id=>requireRef('skills',id));}
      if(r.startingTrainingFeats!==undefined){assert(Array.isArray(r.startingTrainingFeats)&&new Set(r.startingTrainingFeats).size===r.startingTrainingFeats.length,'Invalid species training feats');r.startingTrainingFeats.forEach(id=>{requireRef('skills',id);assert(!(r.startingTrainedSkills||[]).includes(id),'Duplicate species training');});requireRef('feats','feat:skill-training');}
      if(r.conditionalForceTraining!==undefined){assert.equal(typeof r.conditionalForceTraining,'boolean');requireRef('feats','feat:force-training');}
      if(r.conditionalFocus) requireRef('skills',r.conditionalFocus);
      if(r.conditionalFocuses){assert(Array.isArray(r.conditionalFocuses)&&new Set(r.conditionalFocuses).size===r.conditionalFocuses.length);r.conditionalFocuses.forEach(id=>requireRef('skills',id));}
      for(const key of ['forceImmune','technophobic','biotechProficiency'])if(r[key]!==undefined)assert.equal(typeof r[key],'boolean');
      if(r.forceRestrictions!==undefined){assert(r.forceRestrictions&&typeof r.forceRestrictions==='object'&&!Array.isArray(r.forceRestrictions)&&Object.keys(r.forceRestrictions).length>0&&Object.entries(r.forceRestrictions).every(([k,v])=>['forbidSensitivity','forbidChecks','forbidPoints'].includes(k)&&typeof v==='boolean'),'Invalid species Force restrictions');}
      if(r.unproficientWeaponPenalty!==undefined)assert(Number.isInteger(r.unproficientWeaponPenalty)&&r.unproficientWeaponPenalty>=-5&&r.unproficientWeaponPenalty<=0,'Invalid species weapon penalty');
      if(r.unproficientArmorPenalties!==undefined){assert.deepEqual(Object.keys(r.unproficientArmorPenalties).sort(),['heavy','light','medium']);assert(Object.values(r.unproficientArmorPenalties).every(n=>Number.isInteger(n)&&n>=-10&&n<=0),'Invalid species armor penalties');}
      if(r.bookVariant!==undefined)assert.equal(typeof r.bookVariant,'string');
      if(r.forbiddenClasses){assert(Array.isArray(r.forbiddenClasses));r.forbiddenClasses.forEach(id=>requireRef('classes',id));}
      if(r.weaponFamiliarity)for(const [id,group] of Object.entries(r.weaponFamiliarity)){requireRef('equipment',id);assert(GROUPS.includes(group));}
      for(const key of ['startingFeats','excludedStartingFeats'])if(r[key]){assert(Array.isArray(r[key]));r[key].forEach(id=>requireRef('feats',id));}
      for(const key of ['conditionalStartingFeats','conditionalFeats'])if(r[key]!==undefined){assert(Array.isArray(r[key])&&new Set(r[key]).size===r[key].length,'Invalid conditional species feats');r[key].forEach(speciesStartingFeat);}
      if(r.speeds){assert(Object.keys(r.speeds).every(key=>/^[a-z-]+$/.test(key)));assert(Object.values(r.speeds).every(n=>Number.isInteger(n)&&n>=0));}
    }
    if(r.automation!==undefined)assert(['manual','partial'].includes(r.automation),'Invalid automation status');
    if(r.manualPrerequisites!==undefined)assert(Array.isArray(r.manualPrerequisites)&&r.manualPrerequisites.length>0&&r.manualPrerequisites.every(t=>typeof t==='string'&&t.trim()&&t.length<=1000),'Invalid manual prerequisites');
    if(r.startingEquipment!==undefined){
      assert(['species','classes'].includes(key),'Unsupported equipment grant');
      const g=r.startingEquipment;assert(g&&typeof g==='object'&&!Array.isArray(g),'Invalid starting equipment grant');assert.deepEqual(Object.keys(g).sort(),['items','sourceId']);assert(sources.has(g.sourceId),'Missing starting equipment source');
      assert(Array.isArray(g.items)&&g.items.length>0&&new Set(g.items.map(e=>e.equipmentId)).size===g.items.length,'Invalid starting equipment items');
      for(const e of g.items){assert.deepEqual(Object.keys(e).sort(),['equipmentId','quantity']);requireRef('equipment',e.equipmentId);assert(Number.isInteger(e.quantity)&&e.quantity>=1&&e.quantity<=999,'Invalid starting equipment quantity');}
    }
    if (key === 'classes') {
      assert.equal(r.bab.length,r.maxLevel??20); assert(r.bab.every(Number.isInteger)); assert([6,8,10,12].includes(r.hitDie));
      assert.equal(r.startingHP,r.classType==='prestige'?null:r.hitDie*3);
      if(r.advanceRestrictions!==undefined)assert(r.id==='class:master-privateer'&&r.advanceRestrictions.length===1&&r.advanceRestrictions[0]==='lostToDarkSide');
      if(r.classType==='prestige'){assert([5,10].includes(r.maxLevel)&&r.skills.length===0&&r.startingFeats.length===0&&r.bonusFeats.length===0&&r.bonusFeatLevels.length===0);assert([null,6,7].includes(r.forcePointBase));assert(Array.isArray(r.entryRequirements)&&Array.isArray(r.entrySpecials)&&Array.isArray(r.classFeatures)&&Array.isArray(r.classFeatureChoices));for(const e of r.entryRequirements){const check=p=>{assert(['any','level','bab','trained','feat','talent','talentTrees','forceTalents','power','techniques','droid','species','fullDarkSide','declaration','meleeFocus'].includes(p.kind));if(p.kind==='any')p.requirements.forEach(check);if(p.kind==='trained')requireRef('skills',p.value);if(p.kind==='declaration')assert(r.entrySpecials.some(s=>s.id===p.value));};check(e);}for(const n of r.talentLevels)assert(Number.isInteger(n)&&n>=1&&n<=r.maxLevel);assert.equal(typeof r.hpConstitution,'boolean');for(const e of r.passives||[]){assert.deepEqual(Object.keys(e).sort(),['amount','step','target']);assert(['pistolDamage','dr'].includes(e.target)&&Number.isInteger(e.amount)&&e.amount>0&&Number.isInteger(e.step)&&e.step>0&&e.step<=r.maxLevel);}}
       assert(Number.isInteger(r.trainedSkills));
      r.skills.forEach(id=>requireRef('skills',id));
      [...r.startingFeats,...r.bonusFeats].forEach(id=>requireRef('feats',id));
      assert(r.talentTrees.length > 0);
      if(r.talentAccessSourceId!==undefined)assert(sources.has(r.talentAccessSourceId),'Missing talent access source');
      if(r.bonusFeatSourceIds!==undefined)assert(Array.isArray(r.bonusFeatSourceIds)&&r.bonusFeatSourceIds.length&&r.bonusFeatSourceIds.every(id=>sources.has(id)),'Missing bonus feat source');
    }
    if(key==='classChoices'){prerequisite(r.prerequisite);assert(Array.isArray(r.effects));for(const e of r.effects)assert(Object.keys(e).length===1&&e.target==='powerTake10'&&r.choiceType==='power'&&r.id==='classchoice:force-power-mastery');assert(['forceTechnique','forceSecret','medicalSecret'].includes(r.kind)&&['never','choice'].includes(r.repeat));if(r.choiceType!==undefined)assert(r.choiceType==='power'&&r.repeat==='choice');}
    if (key === 'skills') assert(ABILITIES.includes(r.ability) && typeof r.trainedOnly==='boolean' && typeof r.armorCheck==='boolean');
    if(key==='vehicles')validateVehicleData(r,p,message=>{throw new Error(message);});
    if(key==='starshipManeuvers'){assert(['standard-action','swift-action','move-action','full-round-action','reaction'].includes(r.action));assert(Array.isArray(r.descriptors)&&new Set(r.descriptors).size===r.descriptors.length&&r.descriptors.every(d=>['attack-pattern','dogfight','force','gunner'].includes(d)));assert(typeof r.actionText==='string'&&r.actionText.length>0);assert(r.automation==='manual');}
    if(key==='forcePowers'){const actions=['standard-action','swift-action','move-action','full-round-action','free-action','reaction'];assert(actions.includes(r.action));assert(Array.isArray(r.descriptors)&&new Set(r.descriptors).size===r.descriptors.length&&r.descriptors.every(d=>['dark-side','light-side','mind-affecting','telekinetic','lightsaber-form'].includes(d)));if(r.actionText!==undefined)assert(typeof r.actionText==='string'&&r.actionText.length>0);if(r.actions!==undefined)assert(Array.isArray(r.actions)&&r.actions.length>1&&new Set(r.actions).size===r.actions.length&&r.actions.every(a=>actions.includes(a))&&r.actions[0]===r.action,'Invalid alternative power actions');}
    if (['feats','talents'].includes(key)) {
      if(r.activation!==undefined){
        assert(key==='talents'&&['talent:fool-s-luck','talent:body-control','talent:battle-meditation','talent:dark-presence'].includes(r.id)&&r.automation==='partial','Unsupported talent activation');
        if(r.id==='talent:battle-meditation')assert.deepEqual(r.activation,{action:'full',forcePoints:1,duration:'encounter',unconsciousAmbiguityId:'ambiguity:battle-meditation-unconscious',choices:[{id:'attacks',name:'Attack rolls',effects:[{target:'attacks',amount:1,type:'insight'}]}]},'Changed Battle Meditation activation');
        else if(r.id==='talent:dark-presence')assert.deepEqual(r.activation,{action:'standard',forcePoints:0,duration:'encounter',endsWhenUnconscious:true,choices:[{id:'defenses',name:'Defenses',effects:[{target:'defenses',amount:1,type:'force'}]}]},'Changed Dark Presence activation');
        else if(r.id==='talent:body-control')assert.deepEqual(r.activation,{action:'swift',forcePoints:1,duration:'encounter',choices:[{id:'immunity',name:'Poison, Radiation, Disease immunity',effects:[{target:'hazardImmunity',hazards:['poison','radiation','disease']}]}]},'Changed Body Control activation');
        else assert.deepEqual(r.activation,{action:'standard',forcePoints:1,duration:'encounter',choices:[['attacks','Attack rolls',1],['skills','Skill Checks',5],['defenses','Defenses',1]].map(([id,name,amount])=>({id,name,effects:[{target:id,amount,type:'competence'}]}))},'Changed Fool\'s Luck activation');
      }
      if(r.additionalTrees!==undefined)assert(key==='talents'&&Array.isArray(r.additionalTrees)&&r.additionalTrees.length>0&&new Set(r.additionalTrees).size===r.additionalTrees.length&&r.additionalTrees.every(id=>id!==r.tree&&/^tree:[a-z0-9-]+$/.test(id)),'Invalid additional talent trees');
      if(r.choicePowerDescriptors!==undefined)assert(key==='talents'&&r.choiceType==='power'&&Array.isArray(r.choicePowerDescriptors)&&r.choicePowerDescriptors.length>0&&new Set(r.choicePowerDescriptors).size===r.choicePowerDescriptors.length&&r.choicePowerDescriptors.every(d=>['dark-side','light-side'].includes(d)),'Invalid power descriptor choice');
      if(r.forceActivation!==undefined)assert(['check','forcePoint'].includes(r.forceActivation));
      if(r.requiresDarkSide!==undefined)assert.equal(r.requiresDarkSide,true);
      if(r.requiresLightSide!==undefined)assert(r.requiresLightSide===true&&!r.requiresDarkSide,'Invalid Light Side restriction');
      prerequisite(r.prerequisite); assert(['never','choice','stack'].includes(r.repeat));
      if(r.maxSelections!==undefined)assert(r.repeat==='stack'&&Number.isInteger(r.maxSelections)&&r.maxSelections>=1&&r.maxSelections<=20,'Invalid repeat limit');
      if(r.exclusiveGroup!==undefined)assert(r.repeat==='never'&&typeof r.exclusiveGroup==='string'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.exclusiveGroup),'Invalid exclusive feature group');
      if(r.repeatGroup!==undefined){requireRef(key,r.repeatGroup);assert.equal(r.repeat,'choice');}
      if(r.weaponGroup!==undefined)assert(GROUPS.includes(r.weaponGroup),'Unknown weapon group');
      if(r.choiceType) assert(['skill','weaponGroup','weapon','power','enum','manual','talent'].includes(r.choiceType));
      if(r.choiceType==='talent'){assert(key==='talents'&&typeof r.choiceTree==='string'&&r.repeat==='choice'&&r.effects.some(e=>e.target==='chosenTalent'),'Invalid chosen talent grant');const children=p.talents.filter(t=>t.tree===r.choiceTree||t.additionalTrees?.includes(r.choiceTree));assert(children.length>0&&children.every(t=>!t.choiceType&&t.repeat==='never'&&!t.effects.some(e=>e.target==='chosenTalent')&&!t.requiresDarkSide&&!t.requiresLightSide&&!t.manualPrerequisites?.length),'Unsupported granted talent choice');}else assert(r.choiceTree===undefined,'Unexpected talent choice tree');
      if(r.choiceExcluded!==undefined)assert(r.choiceType==='skill'&&Array.isArray(r.choiceExcluded)&&r.choiceExcluded.length>0&&r.choiceExcluded.every(id=>ix.skills.has(id)),'Invalid excluded skill choices');
      if(r.choiceLabel!==undefined)assert(typeof r.choiceLabel==='string'&&r.choiceLabel.trim()&&r.choiceLabel.length<=100);
      if(r.choiceType==='enum')assert(Array.isArray(r.choiceOptions)&&r.choiceOptions.length>0&&new Set(r.choiceOptions.map(o=>o.id)).size===r.choiceOptions.length&&r.choiceOptions.every(o=>Object.keys(o).sort().join() === 'id,name'&&/^[a-z0-9-]+$/.test(o.id)&&typeof o.name==='string'&&o.name.trim()),'Invalid enum choices');
      else assert(r.choiceOptions===undefined,'Unexpected enum choices');
      if(r.choiceGroups)assert(r.choiceType==='weaponGroup'&&Array.isArray(r.choiceGroups)&&r.choiceGroups.length&&new Set(r.choiceGroups).size===r.choiceGroups.length&&r.choiceGroups.every(g=>GROUPS.includes(g)),'Unsupported weapon choices');
      if(r.choiceExoticMode)assert(r.choiceType==='weaponGroup'&&['melee','ranged'].includes(r.choiceExoticMode),'Unsupported exotic weapon mode');
      if(r.choiceScope)assert(r.choiceType==='weapon'&&r.choiceScope==='exotic');
      assert(Array.isArray(r.effects) && typeof r.reminder==='string');
      const passiveConditions={armorMaxDex:'proficientArmor',armorBonus:'proficientArmor',armorFortitude:'proficientArmor',armorFortitudeToWill:'proficientArmor',armorMovement:'proficientArmor',speed:'lightOrNoArmor',meleeDamage:'meleeAttack'};
      const reviewedDefenses={"talent:hidden-eyes":[{"target":"skillApplicationBonus","skill":"skill:perception","application":"perception-concealed-target","amount":5,"type":"circumstance","circumstance":"hidden-eyes"}],"talent:droid-smash":[{"target":"oneHandedStrengthDamage","multiplier":2}],"feat:veteran-spacer":[{"target":"skillApplicationBonus","skill":"skill:use-computer","application":"astrogate-starship","amount":5,"type":"species"}],"feat:master-of-disguise":[{"target":"skillApplicationBonus","skill":"skill:deception","application":"deceptive-appearance","amount":5,"type":"insight","rushPenalty":-2}],"talent:bomb-thrower":[{"target":"skillApplicationBonus","skill":"skill:mechanics","application":"handle-explosives","amount":5,"type":"untyped"},{"target":"craftItem","equipmentId":"equipment:frag-grenade","action":"full","requiresSupplies":true}],"talent:sith-reverence":[{"target":"attacks","amount":1,"type":"morale","when":"nearDarkAlly"}],"talent:quickseeing":[{"target":"targetAttack","against":"quickseenTarget","amount":2,"type":"insight"}],"talent:murderous-arts-ii":[{"target":"targetDice","against":"markedTarget","dice":1,"die":6}],"feat:momentum-strike":[{"target":"targetDice","against":"mountMovedSpeed","dice":1,"mode":"melee"}],"talent:knowledge-is-strength":[{"target":"targetAttack","against":"loreTarget","amount":2,"type":"morale"}],"talent:spotter":[{"target":"targetAttack","against":"spottedTarget","amount":1,"type":"insight"}],"talent:target-acquisition":[{"target":"targetAttack","against":"acquiredTarget","amount":1,"type":"circumstance","circumstance":"acquired-target"},{"target":"targetDamage","against":"acquiredTarget","amount":1,"type":"circumstance","circumstance":"acquired-target"}],"talent:mercenary-s-teamwork":[{"target":"targetDamage","against":"alliesDamagedTarget","amountPerCount":2,"maximum":10}],"feat:swarm-attack":[{"target":"targetAttack","against":"alliesAdjacentToTarget","amountPerCount":1,"type":"circumstance","circumstance":"swarm-attack","mode":"melee"}],"talent:dark-side-talisman":[{"target":"darkSideTalismanDefense","talisman":"one","against":"light-side-powers","amount":2,"type":"force"}],"talent:greater-dark-side-talisman":[{"target":"darkSideTalismanDefense","talisman":"all","against":"light-side-powers","amount":2,"type":"force"}],"talent:defensive-acuity":[],"talent:improved-soft-cover":[],"talent:gradual-resistance":[],"talent:reckless":[{"target":"chargeDamage","ability":"wis","minimum":1}],"feat:fleet-footed":[{"target":"runningAttackSpeed","amount":2}],"feat:increased-agility":[{"target":"swimSpeed","amount":2},{"target":"climbSpeed","amount":2}],"feat:keen-scent":[{"target":"scentRange","range":20}],"talent:force-talisman":[{"target":"talismanDefense","talisman":"one","amount":1,"type":"force"}],"talent:greater-force-talisman":[{"target":"talismanDefense","talisman":"all","amount":1,"type":"force"}],"talent:empower-weapon":[{"target":"empoweredDice","dice":1}],"talent:attune-weapon":[{"target":"attunedAttack","amount":1,"type":"force"}],"talent:jedi-battle-commander":[{"target":"activationAmount","talent":"talent:battle-meditation","choice":"attacks","amount":2}],"feat:primitive-warrior":[{"target":"groupDice","weaponGroup":"simple-weapons","mode":"melee","dice":1}],"talent:ter-s-k-si-basics":[{"target":"unarmedDice","dice":1}],"feat:justice-seeker":[{"target":"targetDamage","against":"damagedYourAlly","amount":2}],"talent:combined-mercenary-fire":[{"target":"targetDamage","against":"damagedByAlly","amount":2}],"talent:ruthless-mercenary":[{"target":"targetDamage","against":"exceededThreshold","amount":2}],"talent:deception-awareness":[{"target":"conditionalDefense","defense":"will","against":"deception","type":"untyped","amount":5},{"target":"skillSubstitution","skill":"skill:perception","replacement":"skill:use-the-force","grantsTraining":false,"carryRerolls":true,"when":"senseDeceptionInfluence"}],"talent:resist-the-dark-side":[{"target":"conditionalDefense","defense":"reflex","against":"dark-side-powers","type":"force","amount":5},{"target":"conditionalDefense","defense":"fortitude","against":"dark-side-powers","type":"force","amount":5},{"target":"conditionalDefense","defense":"will","against":"dark-side-powers","type":"force","amount":5}],"feat:droid-hunter":[{"target":"targetDamage","against":"droidEnemy","amount":2,"ionAmount":4,"proficient":true}],"talent:defensive-electronics":[{"target":"conditionalDefense","defense":"will","against":"reprogram","type":"untyped","classLevel":"class:independent-droid"}],"talent:psychic-citadel":[{"target":"defenseBonus","defense":"will","type":"force","classLevel":"class:force-adept"}],"feat:trench-warrior":[{"target":"targetAttack","against":"trenchCover","amount":1,"type":"circumstance","circumstance":"trench-cover"}],"feat:cornered":[{"target":"targetAttack","against":"corneredBy","amount":2,"type":"untyped"}],"talent:sword-of-vahl":[{"target":"groupAttack","weaponGroup":"simple-weapons","amount":1,"type":"force"}],"feat:cunning-attack":[{"target":"targetAttack","against":"deniedDexterity","amount":2,"type":"untyped"}],"talent:shoto-focus":[{"target":"shotoAttack","amount":2,"type":"competence","weapons":["equipment:short-lightsaber","equipment:guard-shoto"],"partnerAmbiguityId":"ambiguity:shoto-focus-partner"}],"feat:regenerative-healing":[{"target":"regenerativeHealing","amount":5,"dailyUses":1}],"talent:sniping-assassin":[{"target":"rangedBeyondPointBlankDamage","classLevel":"class:assassin","divisor":2}],"talent:prime-targets":[{"target":"targetDice","against":"notAttackedSince","dice":1,"weaponGroup":"lightsabers"}],"talent:ambush-commando":[{"target":"targetDice","against":"notYetActed","dice":2}],"talent:invisible-attacker":[{"target":"targetDice","against":"unawareOfYou","dice":1,"mode":"ranged"}],"talent:ambush-specialist":[{"target":"targetAttack","against":"primeTarget","amount":2,"type":"morale"}],"talent:destructive-ambusher":[{"target":"targetDice","against":"primeTarget","dice":1}],"talent:praetoria-vonil":[{"target":"targetDice","against":"movedBeforeAttack","dice":1,"weaponGroup":"lightsabers","singleTwoHanded":true}],"talent:sentinel-strike":[{"target":"sentinelStrike","die":6,"maximum":5,"weaponGroup":"lightsabers","scopeAmbiguityId":"ambiguity:sentinel-strike-scope"}],"talent:squad-superiority":[{"target":"deniedDexterityWhen","against":"squadAdjacent"}],"talent:no-escape":[{"target":"deniedDexterityWhen","against":"withdrewFromYou"}],"talent:starship-raider":[{"target":"attacks","amount":1,"type":"untyped","when":"aboardStarship"}],"talent:old-faithful":[{"target":"trustySidearmGroups","weaponGroup":"rifles"}],"talent:retribution":[{"target":"targetAttack","against":"harmedAlly","amount":2,"type":"insight"}],"talent:ion-mastery":[{"target":"ionAttack","amount":1,"type":"untyped"},{"target":"ionDice","dice":1}],"talent:twin-shot":[{"target":"twinShotDamage","amount":2}],"talent:nonlethal-tactics":[{"target":"stunAttack","amount":1,"type":"untyped","weapons":["equipment:stun-grenade","equipment:net","equipment:electronet","equipment:stun-baton"]},{"target":"stunDice","dice":1}],"talent:master-of-the-great-hunt":[{"target":"targetAttack","against":"beastDarkSide","amount":1,"type":"force","weaponGroup":"lightsabers","scopeAmbiguityId":"ambiguity:great-hunt-scope"},{"target":"targetDice","against":"beastDarkSide","dice":1,"weaponGroup":"lightsabers"}],"talent:cantina-brawler":[{"target":"targetAttack","against":"flankedSelf","amount":2,"type":"untyped","unarmed":true},{"target":"targetDamage","against":"flankedSelf","amount":2,"unarmed":true}],'talent:strong-willed':[{target:'conditionalDefense',defense:'will',against:'use-the-force',type:'untyped',classLevel:'class:bounty-hunter'}],'feat:channel-rage':[{target:'channelRage',defense:'will',amount:5,type:'untyped'}],'feat:powerful-rage':[{target:'ragingStrength',amount:4,type:'untyped'}],"talent:close-contact":[{"target":"pointBlankRange","weaponGroup":"rifles","amount":5,"maximum":10}],"talent:opportunity-fire":[{"target":"opportunityAttack","amount":2,"type":"untyped","weaponGroup":"rifles"}],"talent:rifle-master":[{"target":"accurateWeapons","weaponGroup":"rifles"}],"talent:shoot-from-the-hip":[{"target":"opportunityWeapon","weaponGroup":"rifles"}],"talent:advantageous-strike":[{"target":"opportunityAttack","amount":5,"type":"untyped","mode":"melee","proficient":true}],"feat:disabler":[{"target":"weaponTrait","weapon":"equipment:ion-pistol","damageDie":8},{"target":"weaponTrait","weapon":"equipment:ion-rifle","accurate":true}],"feat:pistoleer":[{"target":"weaponTrait","weapon":"equipment:blaster-pistol","accurate":true},{"target":"weaponTrait","weapon":"equipment:heavy-blaster-pistol","inaccurate":false}],"feat:riflemaster":[{"target":"weaponTrait","weapon":"equipment:blaster-rifle","accurate":true},{"target":"weaponTrait","weapon":"equipment:heavy-blaster-rifle","damageDie":12},{"target":"weaponTrait","weapon":"equipment:light-repeating-blaster","size":"medium"}],"feat:sport-hunter":[{"target":"weaponTrait","weapon":"equipment:slugthrower-rifle","damageDie":12},{"target":"weaponTrait","weapon":"equipment:sporting-blaster-rifle","aimAttack":1},{"target":"weaponTrait","weapon":"equipment:slugthrower-pistol","pointBlankDice":1}],"talent:pick-a-fight":[{"target":"attacks","amount":1,"type":"morale","when":"surpriseRound"}],...{"talent:advantageous-positioning":[{"target":"flankingDeniesDexterity"}]},...{"talent:face-the-foe":[{"target":"targetAttack","against":"noCover","amount":1,"type":"morale"}],"talent:sentinel-s-observation":[{"target":"targetAttack","against":"concealed","amount":2,"type":"circumstance","circumstance":"concealed-from-target"}],"talent:close-quarters-fighter":[{"target":"targetAttack","against":"adjacent","amount":1,"type":"circumstance","circumstance":"adjacent-target","mode":"melee"}]},...{"talent:unreadable":[{"target":"conditionalDefense","defense":"will","against":"read-emotions-or-attitude","amount":5,"type":"untyped"}],"talent:cramped-quarters-fighting":[{"target":"conditionalDefense","defense":"reflex","against":"adjacent-obstacle","amount":2,"type":"cover"}],"feat:grab-back":[{"target":"conditionalDefense","defense":"reflex","against":"grab-grapple","amount":2,"type":"untyped"}],"feat:grapple-resistance":[{"target":"conditionalDefense","defense":"reflex","against":"grab-grapple","amount":5,"type":"untyped"}]},'talent:inquisition':[{target:'targetAttack',against:'forceSensitive',amount:1,type:'untyped'},{target:'targetDice',against:'forceSensitive',dice:1}],'talent:dark-side-scourge':[{target:'targetDamage',against:'darkSide',ability:'cha',minimum:1,mode:'melee'}],'talent:dark-scourge':[{target:'targetAttack',against:'jedi',amount:1,type:'dark-side'}],'talent:sneak-attack':[{target:'sneakAttack',die:6,maximum:10,rangedSquares:6}],'feat:thick-skin':[{target:'defenseBonus',defense:'fortitude',amount:2,type:'species'}],'talent:force-of-will':[{target:'defenseBonus',defense:'will',amount:2,type:'insight'}],'talent:jedi-hunter':[{target:'defenseBonus',defense:'fortitude',amount:1,type:'insight'},{target:'defenseBonus',defense:'will',amount:1,type:'insight'},{target:'targetDice',against:'forceSensitive',dice:1}],'feat:poison-resistance':[{target:'conditionalDefense',defense:'fortitude',against:'poison',amount:5,type:'untyped'}],'feat:scion-of-dorin':[{target:'conditionalDefense',defense:'fortitude',against:'natural-hazards',amount:5,type:'species'}],'talent:environmentally-shielded':[{target:'conditionalDefense',defense:'fortitude',against:'environmental-hazards',amount:5,type:'equipment'}],'feat:warrior-heritage':[{target:'defenseBonus',defense:'will',amount:2,type:'morale',when:'wieldingWeapon',weapons:['equipment:atlatl','equipment:cesta']}],'feat:resolute-stance':[{target:'defenseBonus',defense:'will',amount:2,type:'morale',when:'fightDefensively'}]};
      if(Object.hasOwn(reviewedDefenses,r.id)){assert.deepEqual(r.effects,reviewedDefenses[r.id],'Changed reviewed defense record '+r.id);assert.equal(r.automation,'partial');}
      else for(const e of r.effects)if(['surpriseRound','aboardStarship'].includes(e.when)||['opportunityAttack','opportunityWeapon','pointBlankRange','accurateWeapons','weaponTrait','sneakAttack','targetAttack','targetDamage','targetDice','flankingDeniesDexterity','channelRage','ragingStrength','ionAttack','ionDice','twinShotDamage','stunAttack','stunDice','trustySidearmGroups','regenerativeHealing','rangedBeyondPointBlankDamage','sentinelStrike','deniedDexterityWhen'].includes(e.target)||e.when==='wieldingWeapon'||['poison','natural-hazards','environmental-hazards','adjacent-obstacle','read-emotions-or-attitude','grab-grapple'].includes(e.against))assert.fail('Unreviewed passive defense context in '+r.id);
      for(const e of Object.hasOwn(reviewedDefenses,r.id)?[]:r.effects) {
        if(['trainedSkill','classSkill'].includes(e.target)){assert.equal(key,'talents','Unsupported fixed skill grant');assert.deepEqual(Object.keys(e).sort(),['skill','target']);requireRef('skills',e.skill);continue;}
        if(e.target==='chosenTalent'){assert.deepEqual(e,{target:'chosenTalent'});assert(r.choiceType==='talent'&&key==='talents','Invalid chosen talent effect');continue;}
        if(e.target==='powerDescriptorRemoval'){assert.deepEqual(Object.keys(e).sort(),['descriptors','target']);assert(key==='talents'&&r.choiceType==='power'&&Array.isArray(e.descriptors)&&e.descriptors.length>0&&new Set(e.descriptors).size===e.descriptors.length&&e.descriptors.every(d=>['dark-side','light-side'].includes(d)),'Invalid descriptor removal');assert.deepEqual(e.descriptors,r.choicePowerDescriptors);assert(p.forcePowers.every(power=>power.descriptors.filter(d=>e.descriptors.includes(d)).length<=1),'Ambiguous aligned power descriptor choice');continue;}
        if(e.target==='vision'){assert.deepEqual(e,{target:'vision',value:'darkvision'});continue;}
        if(e.target==='skillReroll'){
          assert(key==='talents'&&r.automation==='partial','Unsupported skill reroll record');if(r.id==='talent:knack'){assert.deepEqual(e,{target:'skillReroll',skill:'any',keep:'best',when:'always',dailyUsesPerSelection:1});}else{assert.deepEqual(Object.keys(e).sort(),['keep','skill','target','when']);requireRef('skills',e.skill);}assert(['new','best'].includes(e.keep),'Invalid reroll policy');
          const skills={failedBlockOrDeflect:'skill:use-the-force',sensors:'skill:use-computer',haggle:'skill:persuasion','jury-rig':'skill:mechanics','oppose-sense-force':'skill:use-the-force','sense-dark-side':'skill:use-the-force','improve-access':'skill:use-computer','intimidate-undisguised':'skill:persuasion','locate-individual':'skill:gather-information'};
          assert(e.when==='always'||Object.hasOwn(skills,e.when)&&skills[e.when]===e.skill,'Invalid reroll scope');continue;
        }
        if(e.target==='skillRerollBest'){assert.deepEqual(Object.keys(e).sort(),['skill','target']);requireRef('skills',e.skill);continue;}
        if(e.target==='defenseAbility'){assert.deepEqual(Object.keys(e).sort(),['ability','defense','target']);assert(({reflex:['int'],fortitude:['str','cha'],will:['cha']})[e.defense]?.includes(e.ability),'Unsupported defense ability');continue;}
        if(e.target==='hazardImmunity'){assert.equal(r.id,'talent:fortified-body');assert.deepEqual(e,{target:'hazardImmunity',hazards:['poison','radiation','disease']});assert.equal(r.automation,'partial');continue;}
        if(e.target==='thresholdDefense'){assert.deepEqual(e,{target:'thresholdDefense',defense:'will'});continue;}
        if(e.target==='teamSkill'){assert.deepEqual(Object.keys(e).sort(),['amount','maximum','perAlly','radius','skill','target','type']);requireRef('skills',e.skill);assert(e.amount===3&&e.perAlly===1&&e.maximum===7&&e.radius===12&&e.type==='competence','Unsupported team skill bonus');continue;}
        if(e.target==='conditionalDefense'){assert.deepEqual(Object.keys(e).sort(),['against','amount','defense','target','type']);assert(['fortitude','will'].includes(e.defense)&&['use-the-force','deception-or-persuasion'].includes(e.against)&&e.type==='insight'&&e.amount===5&&(e.against!=='deception-or-persuasion'||e.defense==='will'),'Unsupported conditional defense effect');continue;}
        if(e.target==='defenseBonus'){assert.deepEqual(Object.keys(e).sort(),['amount','defense','target','type','when']);assert(['fortitude','will'].includes(e.defense)&&e.when==='fightDefensively'&&e.amount===2&&e.type==='competence','Unsupported defensive stance effect');continue;}
        if(e.target==='skillAbility'){assert.equal(r.id,'feat:mind-of-reason');assert.deepEqual(e,{target:'skillAbility',from:'int',ability:'wis'});assert.equal(r.automation,'partial');continue;}
        if(e.target==='skillSubstitution'){
          assert(Object.keys(e).every(k=>['target','skill','replacement','grantsTraining','when','carryRerolls'].includes(k)),'Unsupported substitution field');
          requireRef('skills',e.skill);requireRef('skills',e.replacement);assert.notEqual(e.skill,e.replacement);assert.equal(typeof e.grantsTraining,'boolean');
          assert(e.when===undefined||['computerNetwork','perceptionApplications','senseDeceptionInfluence'].includes(e.when),'Unsupported substitution condition');
          const carry=Object.hasOwn(carryingSubstitutions,r.id);assert(carry?e.carryRerolls===true:e.carryRerolls===undefined,'Unsupported substitution reroll carryover');
          assert(!(e.when==='computerNetwork'&&e.grantsTraining),'Conditional substitutions cannot grant permanent training');
          if(e.when==='senseDeceptionInfluence')assert(r.id==='talent:deception-awareness'&&e.skill==='skill:perception'&&e.replacement==='skill:use-the-force'&&!e.grantsTraining&&e.carryRerolls,'Unsupported Deception Awareness substitution');
          if(e.when==='perceptionApplications')assert(e.skill==='skill:perception'&&e.replacement==='skill:use-the-force'&&e.grantsTraining,'Unsupported Perception applications');
          continue;
        }
        assert(Object.keys(e).every(k=>['target','amount','type','perLevel','when','weaponGroup','ability','minimum'].includes(k)),'Unsupported effect field');
        assert(['defenses','hp','threshold','skillFocus','skillTraining','weaponFocus','weaponSpecialization','runMultiplier','licenseAllowance','blackMarketReduction','forcePowerSlots','starshipManeuverSlots','forcePoints','rageUses','secondWinds','weaponFinesse','criticalMultiplier','forcePointDie','rageBonus','reflexDodge','unarmedDieSteps','unarmedCriticalDieStep','rangedOpportunity','secondWindFreeAction','secondWindMultipleUses','secondWindAboveHalf','secondWindCondition','secondWindConstitution','bellowDice','bellowConditionReduction','swimSpeed','lightsaberDexDamage','exoticProficiency','multiattackReduction','controlledBurst','rapidShotPenalty','lightsaberReflex','lightsaberWill','criticalThreat','tumbleSokan',...Object.keys(passiveConditions)].includes(e.target),'Unsupported effect target');
        if(['forcePowerSlots','starshipManeuverSlots'].includes(e.target))assert(e.amount===1&&e.ability==='wis'&&e.minimum===1&&e.type==='untyped'&&!e.perLevel,'Unsupported Force power capacity');
        else assert(e.ability===undefined&&e.minimum===undefined,'Unsupported effect ability');
        assert(Number.isFinite(e.amount));assert(['untyped','competence','dodge'].includes(e.type));
        if(e.target==='armorFortitudeToWill')assert(e.amount===1&&e.type==='untyped'&&!e.perLevel,'Unsupported armor defense copy');
        const fixedEffects={forcePoints:3,rageUses:1,secondWinds:1,weaponFinesse:1,criticalMultiplier:3,forcePointDie:8,rageBonus:3,reflexDodge:1,unarmedDieSteps:1,unarmedCriticalDieStep:1,rangedOpportunity:2,secondWindFreeAction:1,secondWindMultipleUses:1,secondWindAboveHalf:1,secondWindCondition:1,secondWindConstitution:2,bellowDice:1,bellowConditionReduction:1,swimSpeed:2};
        if(e.target in fixedEffects)assert(e.amount===fixedEffects[e.target]&&e.type===(e.target==='reflexDodge'?'dodge':'untyped')&&!e.perLevel,'Unsupported Core feat effect');
        if(e.type==='dodge')assert(e.target==='reflexDodge'&&e.amount===1&&!e.perLevel);
        if(e.perLevel!==undefined)assert.equal(typeof e.perLevel,'boolean');
        if(e.target in passiveConditions){assert.equal(e.when,passiveConditions[e.target],'Missing passive condition');assert(e.type==='untyped'&&Number.isInteger(e.amount)&&e.amount>0&&!e.perLevel,'Unsupported passive effect');if(e.target==='armorMovement')assert.equal(e.amount,1);}
        else if(['weaponSpecialization','weaponFocus'].includes(e.target)&&e.weaponGroup)assert.equal(e.when,'meleeAttack');
        else assert(e.when===undefined,'Unsupported effect condition');
        if(e.weaponGroup!==undefined)assert(['weaponSpecialization','weaponFocus','multiattackReduction','criticalThreat'].includes(e.target)&&GROUPS.includes(e.weaponGroup),'Unsupported fixed weapon effect');
        const prestigeEffects={lightsaberDexDamage:1,exoticProficiency:1,multiattackReduction:2,controlledBurst:-2,rapidShotPenalty:0,lightsaberReflex:1,lightsaberWill:1,criticalThreat:19,tumbleSokan:1};
        if(e.target in prestigeEffects)assert(e.amount===prestigeEffects[e.target]&&e.type==='untyped'&&!e.perLevel,'Invalid prestige passive');
        if(e.target==='multiattackReduction')assert(['heavy-weapons','lightsabers','pistols','rifles'].includes(e.weaponGroup),'Invalid multiattack group');
        if(e.target==='criticalThreat')assert(e.weaponGroup==='lightsabers','Invalid critical threat group');
        if(e.target==='runMultiplier')assert(Number.isInteger(e.amount)&&e.amount>=4&&e.amount<=10&&e.type==='untyped'&&!e.perLevel,'Invalid running multiplier');
        if(['licenseAllowance','blackMarketReduction'].includes(e.target))assert(e.type==='untyped'&&Number.isInteger(e.amount)&&e.amount>0&&!!e.perLevel===(e.target==='licenseAllowance'),'Unsupported purchase effect');
      }
    }
    if(key==='backgrounds') {
      assert(['event','occupation','planet'].includes(r.category));
      assert.equal(r.skillChoices,r.category==='planet'?2:1);
      assert.equal(r.untrainedBonus,r.category==='occupation'?2:0);
      assert(Array.isArray(r.relevantSkills) && r.relevantSkills.length>=3 && new Set(r.relevantSkills).size===r.relevantSkills.length);
      r.relevantSkills.forEach(id=>requireRef('skills',id));
      assert(Array.isArray(r.bonusLanguages) && r.bonusLanguages.every(language=>typeof language==='string'));
      assert(r.category==='planet'?r.bonusLanguages.length>0:r.bonusLanguages.length===0);
      assert(Array.isArray(r.excludedSpecies));r.excludedSpecies.forEach(id=>requireRef('species',id));
      if(r.conditionalFocus)requireRef('skills',r.conditionalFocus);
    }
    if (key === 'equipment') {
      assert(['weapon','armor','gear'].includes(r.kind)); assert((r.cost===null || Number.isFinite(r.cost) && r.cost>=0) && (r.weight===null || Number.isFinite(r.weight) && r.weight>=0));
      validateDroidSystemData(r,p,message=>{throw new Error(r.id+': '+message);});
      if(r.retractableStock){assert(r.kind==='weapon'&&r.group==='rifles');assert.deepEqual(Object.keys(r.retractableStock),['withoutCost']);assert(Number.isFinite(r.retractableStock.withoutCost)&&r.retractableStock.withoutCost>=0&&r.retractableStock.withoutCost<r.cost,'Invalid stockless cost');}
      if(r.scope){assert(r.kind==='gear');assert.deepEqual(Object.keys(r.scope).sort(),['ignoresDarkness','rangeReduction']);assert(r.scope.rangeReduction===1&&typeof r.scope.ignoresDarkness==='boolean','Invalid targeting scope');}
      if(r.ammunitionProfiles!==undefined){
        assert(r.kind==='weapon'&&r.mode==='ranged'&&Array.isArray(r.ammunitionProfiles)&&r.ammunitionProfiles.length&&new Set(r.ammunitionProfiles.map(a=>a.id)).size===r.ammunitionProfiles.length,'Invalid ammunition profiles');
        for(const a of r.ammunitionProfiles){
          assert.deepEqual(Object.keys(a).sort(),['capacity','id','name','reloadAction','sourceId','supplyIds']);assert(/^[a-z-]+$/.test(a.id)&&typeof a.name==='string'&&Number.isInteger(a.capacity)&&a.capacity>0&&a.capacity<=10000,'Invalid ammunition capacity');
          assert(['move-action','free-action','full-round-action'].includes(a.reloadAction)&&sources.has(a.sourceId),'Invalid reload rule');assert(Array.isArray(a.supplyIds)&&a.supplyIds.length&&new Set(a.supplyIds).size===a.supplyIds.length,'Invalid ammunition supplies');a.supplyIds.forEach(id=>requireRef('equipment',id));
        }
      }
      if(r.manualAttack!==undefined){
        assert(r.manualAttack===true&&r.kind==='weapon'&&r.automation==='manual','Invalid manual weapon');
        assert(r.size===null||p.rules.weaponSizeOrder.includes(r.size),'Invalid manual weapon size');
        assert(r.group===null||[...GROUPS,'exotic-melee','exotic-ranged'].includes(r.group),'Invalid manual weapon group');
        assert(r.mode===null||['melee','ranged'].includes(r.mode),'Invalid manual weapon mode');
        assert(r.damage===null||/^\d+d\d+$/.test(r.damage),'Invalid manual weapon damage');
        assert(!r.ammunitionProfiles&&!r.modes&&!r.effects,'Manual weapon claims automated mechanics');
      }
      if(r.purchasePending!==undefined)assert(r.purchasePending===true&&r.cost===null&&r.automation==='manual','Invalid manual purchase');
      if(r.kind==='weapon'&&!r.manualAttack) {
        assert(p.rules.weaponSizeOrder.includes(r.size) && [...GROUPS,'exotic-melee','exotic-ranged'].includes(r.group) && ['melee','ranged'].includes(r.mode));
        assert(/^\d+d\d+$/.test(r.damage)||r.damage===null&&(r.damageAction==='Grab / Grapple'||r.ammunition==='grenade'||r.unarmed),'Unsupported weapon damage');
        for(const k of ['accurate','inaccurate','autofire','autofireOnly','areaAttack','thrown','double','addsStrength','unarmed'])if(r[k]!==undefined)assert.equal(typeof r[k],'boolean');
        if(r.rangeType)assert(r.rangeType in p.rules.weaponRanges.limits);
        if(r.ranges)assert(r.ranges.length===4&&r.ranges.every((n,i)=>Number.isInteger(n)&&n>=0&&(!i||n>=r.ranges[i-1])));
        if(r.mode==='ranged')assert(r.rangeType||r.ranges,'Missing ranged weapon ranges');
        if(r.areaType)assert(['burst','splash'].includes(r.areaType));
        if(r.stunDamage)assert(/^\d+d\d+$/.test(r.stunDamage));
        if(r.stunRange!==undefined)assert(r.stunDamage&&r.mode==='ranged'&&r.stunRange===6,'Invalid stun range');
        if(r.stunOnly!==undefined)assert(r.stunOnly===true&&!r.stunDamage,'Invalid stun-only weapon');
        if(r.stunDamageType!==undefined)assert(r.stunDamage&&typeof r.stunDamageType==='string','Invalid stun damage type');
        if(r.modes){assert(new Set(r.modes.map(m=>m.id)).size===r.modes.length);for(const m of r.modes)assert(typeof m.id==='string'&&typeof m.name==='string'&&/^\d+d\d+$/.test(m.damage)&&typeof m.double==='boolean'&&typeof m.thrown==='boolean'&&Number.isInteger(m.reach)&&m.reach>=1);}
        if(r.launchers)for(const l of r.launchers)assert(typeof l.id==='string'&&typeof l.name==='string'&&l.rangeType in p.rules.weaponRanges.limits&&typeof l.accurate==='boolean');
      }
      assert(Array.isArray(r.availability||[])&&(r.availability||[]).every(id=>['licensed','restricted','military','illegal','rare'].includes(id)));
      for(const key of ['biotech','mechanical'])if(r[key]!==undefined)assert.equal(typeof r[key],'boolean');
      if(r.family!==undefined)assert(typeof r.family==='string'&&typeof r.variant==='string');
      if(r.upgrades!==undefined){assert(Array.isArray(r.upgrades)&&new Set(r.upgrades.map(u=>u.id)).size===r.upgrades.length);for(const u of r.upgrades){assert(Object.keys(u).every(k=>['id','name','costMultiplier','changesWeight'].includes(k)));assert(/^[a-z-]+$/.test(u.id)&&typeof u.name==='string'&&Number.isFinite(u.costMultiplier)&&u.costMultiplier>=1);if(u.changesWeight!==undefined)assert.equal(typeof u.changesWeight,'boolean');}}
      if(r.kind==='armor') {
        assert(p.rules.armorPenalties[r.category]!==undefined);for(const k of ['armorBonus','fortitudeBonus'])assert(Number.isInteger(r[k]));assert(r.maxDex===null||Number.isInteger(r.maxDex)&&r.maxDex>=0);for(const id of Object.keys(r.skillBonuses))requireRef('skills',id);
        if(r.armorSlot!==undefined)assert(['body','tandem'].includes(r.armorSlot));
        for(const key of ['speedPenalty','magneticSolesPenalty','strengthCheckBonus','intimidateCircumstance'])if(r[key]!==undefined)assert(Number.isInteger(r[key])&&r[key]>=0&&r[key]<=10);
        for(const key of ['skillPenaltyExempt','allowsLightsaberDR','blinds'])if(r[key]!==undefined)assert.equal(typeof r[key],'boolean');
        if(r.noncombatPenaltyDivisor!==undefined)assert.equal(r.noncombatPenaltyDivisor,2);
        if(r.wearerSize!==undefined)assert(r.wearerSize==='medium'&&r.sizeOverride==='large','Unsupported stock armor size');
        if(r.sizeOverride!==undefined)assert(r.wearerSize==='medium'&&r.sizeOverride==='large','Missing stock armor size');
        if(r.vision!==undefined)assert.equal(r.vision,'low-light');
        if(r.visionProficiency!==undefined)assert(r.vision&&['light','medium','heavy'].includes(r.visionProficiency));
        for(const e of r.skillEffects||[]){assert(Object.keys(e).every(k=>['skillId','amount','when','proficiency'].includes(k)));requireRef('skills',e.skillId);assert(Number.isInteger(e.amount)&&e.amount>0&&['always','hiding','darkness','concealArmor','noncombat'].includes(e.when));if(e.proficiency)assert(['light','medium','heavy'].includes(e.proficiency));}
        for(const e of r.conditionalDefenses||[]){assert.deepEqual(Object.keys(e).sort(),['against','amount','defense','type']);assert(['will','fortitude'].includes(e.defense)&&['use-the-force','extreme-temperatures'].includes(e.against)&&['untyped','equipment'].includes(e.type)&&Number.isInteger(e.amount)&&e.amount>0);}
        if(r.energyShield){const e=r.energyShield;assert.deepEqual(Object.keys(e).sort(),['charges','rating']);assert.equal(e.charges,5);assert([5,10,15,20,25,30].includes(e.rating)&&r.armorSlot==='tandem'&&r.armorBonus===0&&r.fortitudeBonus===0,'Invalid energy shield');}
        if(r.armorDR){const e=r.armorDR;assert.deepEqual(Object.keys(e).sort(),['amount','damageTypes','lightsaber']);assert(Number.isInteger(e.amount)&&e.amount>0&&Array.isArray(e.damageTypes)&&e.damageTypes.length&&new Set(e.damageTypes).size===e.damageTypes.length&&e.damageTypes.every(t=>['all','energy','fire'].includes(t))&&typeof e.lightsaber==='boolean');}
      }
      if(r.kind!=='armor')assert(['armorSlot','skillEffects','conditionalDefenses','speedPenalty','magneticSolesPenalty','skillPenaltyExempt','noncombatPenaltyDivisor','armorDR','allowsLightsaberDR','vision','visionProficiency','blinds','wearerSize','sizeOverride','strengthCheckBonus','intimidateCircumstance'].every(key=>r[key]===undefined),'Armor trait on other equipment');
      if(r.energyShield)assert.equal(r.kind,'armor');
      if(r.abilityBonuses!==undefined){assert(r.kind==='armor'&&r.abilityBonuses&&Object.keys(r.abilityBonuses).every(k=>k==='str'),'Unsupported equipment ability bonus');assert(Object.values(r.abilityBonuses).every(n=>Number.isInteger(n)&&n>0),'Invalid equipment ability bonus');}
    }
  }
  const forms=p.rules.lightsaberFormPowers;assert(forms&&forms.descriptor==='lightsaber-form'&&forms.requiresActivatedLightsaber===true&&forms.sourceIds.length===1&&sources.has(forms.sourceIds[0]),'Invalid form-power rule');assert.deepEqual(forms.rebukeExceptions,['power:draw-closer','power:pushing-slash']);forms.rebukeExceptions.forEach(id=>requireRef('forcePowers',id));
  const access=p.rules.forceTalentAccess,recovery=p.rules.forcePowerRecovery;
  const techniques=p.rules.attackTechniques;
  assert(Array.isArray(techniques)&&techniques.length===4&&new Set(techniques.map(t=>t.id)).size===4,'Invalid attack techniques');
  const techniqueValues={'burst-fire':['ranged',true,'str',13,-5,-10,2,5,false],'rapid-shot':['ranged',false,'str',13,-2,-5,1,2,false],'rapid-strike':['melee',false,'dex',13,-2,-5,1,0,true],'improved-rapid-strike':['melee',false,'dex',13,-5,-10,2,0,false]};
  for(const t of techniques){
    assert(Object.keys(t).every(k=>['id','featId','sourceId','mode','requiresAutofire','ability','minimum','penalty','lowAbilityPenalty','extraDice','shots','lightException','requiresLightOrLightsaber'].includes(k)),'Unsupported attack technique');
    assert(t.featId==='feat:'+t.id&&sources.has(t.sourceId)&&ix.feats.get(t.featId)?.sourceId===t.sourceId,'Missing technique source');
    assert.deepEqual([t.mode,t.requiresAutofire,t.ability,t.minimum,t.penalty,t.lowAbilityPenalty,t.extraDice,t.shots,!!t.lightException],techniqueValues[t.id],'Unsupported attack technique');
    assert.equal(!!t.requiresLightOrLightsaber,t.id==='improved-rapid-strike','Invalid Light Weapon restriction');
  }
  const swing=p.rules.mightySwing;assert(swing&&Object.keys(swing).every(k=>['sourceId','featId','extraDice','swiftActions'].includes(k))&&swing.featId==='feat:mighty-swing'&&swing.sourceId===ix.feats.get(swing.featId)?.sourceId&&swing.extraDice===1&&swing.swiftActions===2,'Invalid Mighty Swing');
  const brace=p.rules.bracing;assert(brace&&Object.keys(brace).every(k=>['sourceId','penalty','swiftActions','groups','pistolRequiresExtendedStock','autofireOnly'].includes(k))&&sources.has(brace.sourceId)&&brace.penalty===-2&&brace.swiftActions===2&&brace.pistolRequiresExtendedStock===true&&brace.autofireOnly===true,'Invalid bracing');
  assert.deepEqual(brace.groups,['heavy-weapons','rifles','pistols'],'Invalid bracing groups');
  assert(p.rulePages.some(r=>r.id==='rule:bracing'&&r.sourceId===brace.sourceId),'Missing bracing passage');
  const power=p.rules.powerAttack;
  assert(power&&Object.keys(power).every(k=>['sourceIds','featId','maximum','twoHandedMultiplier','excludedDamageTargets','duration'].includes(k))&&power.featId==='feat:power-attack'&&power.maximum==='base-attack'&&power.twoHandedMultiplier===2&&power.duration==='until-next-turn','Invalid Power Attack');
  assert.deepEqual(power.sourceIds,[ix.feats.get(power.featId)?.sourceId,'source:wiki-category-weapons-weapon-sizes'],'Invalid Power Attack sources');
  assert(power.sourceIds.every(id=>sources.has(id))&&p.rulePages.some(r=>r.id==='rule:weapon-sizes'&&r.sourceId===power.sourceIds[1]),'Missing weapon sizes passage');
  assert.deepEqual(power.excludedDamageTargets,['object','vehicle'],'Invalid Power Attack targets');
  const full=p.rules.fullAttacks;
  assert(full&&Object.keys(full).every(k=>['sourceIds','action','baseAttacks','twoWeaponPenalty','extraAttackPenalty','doubleFeat','tripleFeat','mastery','duration'].includes(k)),'Invalid Full Attack mapping');
  assert(full.action==='full-round-action'&&full.baseAttacks===1&&full.twoWeaponPenalty===-10&&full.extraAttackPenalty===-5&&full.duration==='until-next-turn','Unsupported Full Attack rule');
  assert(full.doubleFeat==='feat:double-attack'&&full.tripleFeat==='feat:triple-attack','Invalid extra attack feats');
  assert.deepEqual(full.mastery,[{featId:'feat:dual-weapon-mastery-i',penalty:-5},{featId:'feat:dual-weapon-mastery-ii',penalty:-2},{featId:'feat:dual-weapon-mastery-iii',penalty:0}],'Invalid Dual Weapon Mastery');
  assert.deepEqual(full.sourceIds,['source:wiki-full-attacks',ix.feats.get(full.doubleFeat)?.sourceId,ix.feats.get(full.tripleFeat)?.sourceId,...full.mastery.map(m=>ix.feats.get(m.featId)?.sourceId),'source:wiki-category-weapons-weapon-sizes'],'Invalid Full Attack sources');
  assert(full.sourceIds.every(id=>sources.has(id))&&p.rulePages.some(r=>r.id==='rule:full-attacks'&&r.sourceId===full.sourceIds[0]),'Missing Full Attacks passage');
  const flurry=p.rules.flurry;assert(flurry&&Object.keys(flurry).sort().join() === 'attackBonus,featId,reflexPenalty,sourceIds'&&flurry.featId==='feat:flurry'&&flurry.attackBonus===2&&flurry.reflexPenalty===-5&&flurry.sourceIds.length===1&&sources.has(flurry.sourceIds[0]),'Invalid Flurry mapping');
  const defense=p.rules.defensiveCombat;
  assert(defense&&Object.keys(defense).every(k=>['sourceIds','action','duration','acrobatics','fightPenalty','fightDefense','trainedFightDefense','totalDefense','trainedTotalDefense','meleeDefense','dodge','mobility','dodgeLostWithDexterity','helplessDexterityModifier'].includes(k)),'Invalid defensive combat mapping');
  assert(defense.action==='standard-action'&&defense.duration==='until-next-turn'&&defense.acrobatics==='skill:acrobatics'&&defense.dodgeLostWithDexterity===true&&defense.helplessDexterityModifier===-5,'Unsupported defensive combat rule');
  assert.deepEqual([defense.fightPenalty,defense.fightDefense,defense.trainedFightDefense,defense.totalDefense,defense.trainedTotalDefense],[-5,2,5,5,10],'Invalid defensive stance');
  assert.deepEqual(defense.meleeDefense,{featId:'feat:melee-defense',maximum:5,maximumFrom:'base-attack',trigger:'standard-melee-attack',attackScope:'all-attacks'},'Invalid Melee Defense');
  assert.deepEqual(defense.dodge,{featId:'feat:dodge',bonus:1,scope:'designated-opponent'},'Invalid Dodge');
  assert.deepEqual(defense.mobility,{featId:'feat:mobility',bonus:5,scope:'movement-opportunity'},'Invalid Mobility');
  assert.deepEqual(defense.sourceIds,['source:wiki-fight-defensively','source:wiki-fight-defensively-total-defense',ix.feats.get(defense.meleeDefense.featId)?.sourceId,ix.feats.get(defense.dodge.featId)?.sourceId,ix.feats.get(defense.mobility.featId)?.sourceId,'source:wiki-defenses-helpless'],'Invalid defensive combat sources');
  assert(defense.sourceIds.every(id=>sources.has(id))&&['fight-defensively','total-defense','helpless'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&defense.sourceIds.includes(r.sourceId))),'Missing defensive combat passage');
  const charge=p.rules.charge;
  assert(charge&&Object.keys(charge).every(k=>['sourceIds','action','minimumSquares','attackBonus','attackBonusType','reflexPenalty','duration','endsTurn','difficultTerrainCost','lowObjectsDC','crossTerrainDC','combinedDC','acrobatics','powerful','improved','difficultTerrainAmbiguityId','movementCostRule'].includes(k)),'Invalid Charge mapping');
  assert(charge.action==='standard-action'&&charge.duration==='until-next-turn'&&charge.endsTurn===true&&charge.attackBonusType==='competence'&&charge.acrobatics==='skill:acrobatics','Unsupported Charge rule');
  assert.deepEqual([charge.minimumSquares,charge.attackBonus,charge.reflexPenalty,charge.difficultTerrainCost,charge.lowObjectsDC,charge.crossTerrainDC,charge.combinedDC],[2,2,-2,2,25,15,35],'Invalid Charge constants');
  assert.equal(charge.difficultTerrainAmbiguityId,'ambiguity:charge-difficult-terrain','Invalid Charge terrain ambiguity');
  assert.equal(charge.movementCostRule,'combatMovement','Invalid Charge movement mapping');
  assert.equal(charge.difficultTerrainCost,p.rules[charge.movementCostRule]?.difficultCost,'Inconsistent Charge terrain cost');
  const chargeTerrain=p.rules.ambiguities.find(a=>a.id===charge.difficultTerrainAmbiguityId);
  assert(chargeTerrain&&chargeTerrain.default==='normal-cost','Invalid Charge terrain default');
  assert.deepEqual(chargeTerrain.options.map(o=>o.value),['normal-cost','nimble-check'],'Invalid Charge terrain options');
  assert.deepEqual(chargeTerrain.sourceIds,['source:wiki-charge','source:wiki-acrobatics'],'Invalid Charge terrain sources');
  assert.deepEqual(chargeTerrain.passages,[{ruleId:'rule:charge',fullText:true},{ruleId:'rule:acrobatics',fullText:true}],'Missing Charge terrain passages');
  assert.deepEqual(charge.powerful,{featId:'feat:powerful-charge',attackBonus:2,damagePerLevel:0.5},'Invalid Powerful Charge');
  assert.deepEqual(charge.improved,{featId:'feat:improved-charge',allowsTurning:true},'Invalid Improved Charge');
  assert.deepEqual(charge.sourceIds,['source:wiki-charge',ix.feats.get(charge.powerful.featId)?.sourceId,ix.feats.get(charge.improved.featId)?.sourceId,'source:wiki-acrobatics','source:wiki-move'],'Invalid Charge sources');
  assert(charge.sourceIds.every(id=>sources.has(id))&&['charge','acrobatics','move'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&charge.sourceIds.includes(r.sourceId))),'Missing Charge passage');
  const target=p.rules.attackTargets;
  assert(target&&Object.keys(target).every(k=>['sourceIds','coverBonus','improvedCoverBonus','concealmentPenalty','totalConcealmentPenalty','prone','helplessMeleeBonus','intoMeleePenalty','preciseShot','coverDefense','areaMissWithCover','aimAreaBenefit','scopeIgnoresTotalDarkness'].includes(k)),'Invalid attack target mapping');
  assert.deepEqual([target.coverBonus,target.improvedCoverBonus,target.concealmentPenalty,target.totalConcealmentPenalty,target.helplessMeleeBonus,target.intoMeleePenalty],[5,10,-2,-5,5,-5],'Invalid target modifiers');
  assert.deepEqual(target.prone,{ownMeleePenalty:-5,targetMeleeBonus:5,targetRangedPenalty:-5},'Invalid Prone rule');
  assert(target.preciseShot==='feat:precise-shot'&&target.coverDefense==='reflex'&&target.areaMissWithCover==='no-damage'&&target.aimAreaBenefit===false&&target.scopeIgnoresTotalDarkness===false,'Unsupported attack target rule');
  assert.deepEqual(target.sourceIds,['source:wiki-prone','source:wiki-defenses-helpless','source:wiki-bonuses-and-penalties','source:wiki-line-of-sight','source:wiki-ranged-attacks','source:wiki-precise-shot','source:wiki-aim','source:wiki-targeting-scope'],'Invalid target sources');
  assert(target.sourceIds.every(id=>sources.has(id))&&['prone','helpless','bonuses-and-penalties','line-of-sight','ranged-attacks','precise-shot','aim','targeting-scope'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&target.sourceIds.includes(r.sourceId))),'Missing target passage');
  const cleave=p.rules.cleave;
  assert.deepEqual(cleave,{sourceIds:['source:wiki-cleave','source:wiki-great-cleave','source:wiki-follow-through','source:wiki-fighting-space','source:wiki-melee-attacks'],featId:'feat:cleave',greatFeatId:'feat:great-cleave',perRound:1,trigger:'opponent-to-zero-hp',attackMode:'melee',sameWeapon:true,attackBonus:'same-as-trigger',anotherOpponent:true,withinReach:true,followThrough:{featId:'feat:follow-through',perTurn:1,trigger:'melee-opponent-to-zero-hp',speedMultiplier:1,beforeCleave:true}},'Invalid Cleave mapping');
  for(const id of [cleave.featId,cleave.greatFeatId,cleave.followThrough.featId])requireRef('feats',id);
  assert(cleave.sourceIds.every(id=>sources.has(id))&&['cleave','great-cleave','follow-through','fighting-space','melee-attacks'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&cleave.sourceIds.includes(r.sourceId))),'Missing Cleave passage');
  const followThrough=p.feats.find(f=>f.id===cleave.followThrough.featId);
  assert.deepEqual(followThrough.prerequisite,{kind:'all',requirements:[]},'Follow Through has no listed prerequisite');
  assert(!p.classes.some(c=>c.bonusFeats?.includes(followThrough.id)),'Follow Through is not a class bonus feat');
  const acrobaticsMovement=p.rules.acrobaticsMovement;
  assert.deepEqual(acrobaticsMovement,{sourceIds:['source:wiki-acrobatics','source:wiki-move','source:wiki-attacks-of-opportunity','source:wiki-prone','source:wiki-encumbrance'],skillId:'skill:acrobatics',trainedOnly:true,dc:15,take10:false,take20:false,tumble:{action:'move-action',speedMultiplier:1,movementMultiplier:2,defaultCost:'multiply',protection:'tumbled-squares-only',occupiedSuccess:true,noAutomaticPassageOnFailure:true},prone:{drop:'swift-action',trainedDrop:'free-action',stand:'move-action',trainedStand:'swift-action'},crossTerrain:{dc:15,trainedOnly:true,action:'move-action',ignores:'difficult-terrain-only',preserves:['diagonal','low-objects','tumble'],combinedTumbleChecks:'separate',failure:'normal-terrain-cost',noAutomaticShortening:true}},'Invalid Acrobatics movement mapping');
  requireRef('skills',acrobaticsMovement.skillId);
  assert(acrobaticsMovement.sourceIds.every(id=>sources.has(id))&&['acrobatics','move','attacks-of-opportunity','prone','encumbrance'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&acrobaticsMovement.sourceIds.includes(r.sourceId))),'Missing Acrobatics movement passage');
  const combatMovement=p.rules.combatMovement;
  const falling=p.rules.falling;
  assert.deepEqual(falling,{"sourceIds":["source:wiki-falling-damage","source:wiki-acrobatics","source:wiki-jump","source:wiki-attacks","source:wiki-skills"],"attackBonus":20,"defense":"fortitude","metersPerDie":3,"damageDie":6,"maximumDice":20,"maximumReductionDistance":60,"missDivisor":2,"criticalMultiplier":2,"naturalMiss":1,"naturalHit":20,"reductionMeters":3,"extraReductionMargin":10,"reductionDC":15,"landing":"prone-unless-successful-reduction-and-no-damage","damageRule":"incomingDamage","reduction":{"acrobatics":{"skillId":"skill:acrobatics","trainedOnly":true,"take10":false,"take20":false},"jump":{"skillId":"skill:jump","trainingAmbiguityId":"ambiguity:jump-down-training","intentionalOnly":true,"take10RequiresTraining":true,"take10RequiresCalm":true,"speciesTake10":true,"take20RequiresSafeRetries":true,"take20TimeMultiplier":20}},"combinationAmbiguityId":"ambiguity:fall-reductions"},'Invalid Falling mapping');
  for(const record of Object.values(falling.reduction))requireRef('skills',record.skillId);
  assert(falling.sourceIds.every(id=>sources.has(id))&&['falling-damage','acrobatics','jump','attacks','skills'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&falling.sourceIds.includes(r.sourceId))),'Missing Falling passage');
  const fallReductions=p.rules.ambiguities.find(r=>r.id===falling.combinationAmbiguityId);
  assert(fallReductions?.default==='both','Invalid fall reduction default');
  assert.deepEqual(fallReductions.options,[{value:'both',name:'Combine reductions'},{value:'single',name:'One reduction'}],'Invalid fall reduction alternatives');
  const jumpTraining=p.rules.ambiguities.find(r=>r.id===falling.reduction.jump.trainingAmbiguityId);
  assert(jumpTraining?.default==='untrained','Invalid Jump Down default');
  assert.deepEqual(jumpTraining.options,[{value:'untrained',name:'Untrained allowed'},{value:'trained',name:'Trained only'}],'Invalid Jump Down alternatives');
  const escapeBonds=p.rules.escapeBonds;
  assert.deepEqual(escapeBonds,{"sourceIds":["source:wiki-acrobatics"],"skillId":"skill:acrobatics","trainedOnly":false,"take10":false,"take20":false,"fast":{"trainedOnly":true,"dcIncrease":10},"restraints":{"ropes":{"dc":{"kind":"opponent-check","check":"dexterity","increase":10},"duration":"1-minute","fastDuration":"5-rounds"},"net":{"dc":{"kind":"fixed","value":15},"duration":"full-round-action","fastDuration":"standard-action"},"binder-cuffs":{"dc":{"kind":"fixed","value":25},"duration":"1-minute","fastDuration":"5-rounds"},"grapple":{"dc":{"kind":"opponent-check","check":"grapple","increase":0},"duration":"standard-action","fastDuration":"move-action"},"tight-space":{"dc":{"kind":"fixed","value":20},"duration":"full-round-action","fastDuration":"standard-action","movementSquares":1},"manacles":{"dc":{"kind":"declared"},"duration":"1-minute","fastDuration":"5-rounds"}}},'Invalid Escape Bonds mapping');
  requireRef('skills',escapeBonds.skillId);
  assert(escapeBonds.sourceIds.every(id=>sources.has(id))&&p.rulePages.some(r=>r.id==='rule:acrobatics'&&escapeBonds.sourceIds.includes(r.sourceId)),'Missing Escape Bonds passage');
  const balance=p.rules.balance;
  assert.deepEqual(balance,{sourceIds:['source:wiki-acrobatics','source:wiki-move'],skillId:'skill:acrobatics',trainedOnly:false,widthDCs:{'8-15':10,'4-7':15,'under-4':20},unstableDCIncrease:5,speedMultiplier:.5,take10:false,take20:false,flatFootedUnlessTrained:true,damageRecheck:'same-dc',failure:'prone-then-catch',catchDC:15,movementCostRule:'combatMovement'},'Invalid Balance mapping');
  requireRef('skills',balance.skillId);
  assert(balance.sourceIds.every(id=>sources.has(id))&&['acrobatics','move'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&balance.sourceIds.includes(r.sourceId))),'Missing Balance passage');
  assert.deepEqual(combatMovement,{sourceIds:['source:wiki-withdraw','source:wiki-move','source:wiki-running-attack','source:wiki-dodge','source:wiki-mobility','source:wiki-encumbrance'],diagonalCost:2,difficultCost:2,diagonalDifficultCost:4,withdraw:{action:'move-action',speedMultiplier:.5,protectedSquares:1,shortestRoute:true},running:{featId:'feat:running-attack',speedMultiplier:1,attackCount:1,dodgeFeat:'feat:dodge',dodgeBonus:1,dodgeScope:'opportunity-during-running-attack'},strainMovementAction:'full-round-action'},'Invalid combat movement mapping');
  for(const id of [combatMovement.running.featId,combatMovement.running.dodgeFeat])requireRef('feats',id);
  assert(combatMovement.sourceIds.every(id=>sources.has(id))&&['withdraw','move','running-attack','dodge','mobility','encumbrance'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&combatMovement.sourceIds.includes(r.sourceId))),'Missing combat movement passage');
  const opportunity=p.rules.opportunity;
  assert.deepEqual(opportunity,{sourceIds:['source:wiki-attacks-of-opportunity','source:wiki-combat-reflexes','source:wiki-martial-arts-i','source:wiki-line-of-sight'],basePerRound:1,reflexes:'feat:combat-reflexes',reflexesAdditional:'dexterity-modifier',flatFootedRequires:'feat:combat-reflexes',unarmedRequires:'feat:martial-arts-i',groups:['pistols'],foldedStock:true,defaultLimit:'both',coverPrevents:true,totalConcealmentPrevents:true},'Invalid opportunity mapping');
  for(const id of [opportunity.reflexes,opportunity.unarmedRequires])requireRef('feats',id);
  assert(opportunity.sourceIds.every(id=>sources.has(id))&&['attacks-of-opportunity','combat-reflexes','martial-arts-i','line-of-sight'].every(id=>p.rulePages.some(r=>r.id==='rule:'+id&&opportunity.sourceIds.includes(r.sourceId))),'Missing opportunity passage');
  const opportunityLimit=p.rules.ambiguities.find(r=>r.id==='ambiguity:opportunity-limit');
  assert(opportunityLimit?.default==='both','Invalid opportunity default');
  assert.deepEqual(opportunityLimit.options,[{value:'both',name:'Opponent + provoking action'},{value:'opponent',name:'Opponent only'},{value:'action',name:'Provoking action only'}],'Invalid opportunity alternatives');
  const settings=p.rules.weaponSettings;
  assert(settings&&Object.keys(settings).every(k=>['sourceId','mutuallyExclusive','autofireOnlyStun'].includes(k))&&sources.has(settings.sourceId)&&settings.autofireOnlyStun===true,'Invalid weapon settings');
  assert.deepEqual(settings.mutuallyExclusive,['autofire','stun'],'Invalid alternate settings');
  assert(p.rulePages.some(r=>r.id==='rule:weapon-settings'&&r.sourceId===settings.sourceId),'Missing weapon settings passage');
  const ammo=p.rules.ammunition;assert(ammo&&Object.keys(ammo).every(k=>['sourceIds','autofireShots'].includes(k))&&ammo.sourceIds.length&&ammo.sourceIds.every(id=>sources.has(id))&&ammo.autofireShots===10,'Invalid ammunition rules');
  const accessories=p.rules.weaponAccessories;assert(accessories&&accessories.sourceIds.length&&accessories.sourceIds.every(id=>sources.has(id)),'Missing accessory sources');assert.deepEqual(Object.keys(accessories).sort(),['carefulShotBonus','deadeyeDice','rifleOneHandedPenalty','scopeRangeReduction','sourceIds']);assert(accessories.scopeRangeReduction===1&&accessories.rifleOneHandedPenalty===-5&&accessories.carefulShotBonus===1&&accessories.deadeyeDice===1,'Unsupported weapon accessory rule');
  for(const key of ['weaponRanges','unarmed','secondWind','encumbrance'])assert(p.rules[key]?.sourceIds?.length&&p.rules[key].sourceIds.every(id=>sources.has(id)),`Missing ${key} sources`);
  const load=p.rules.encumbrance;assert(load.heavyFraction===.25&&load.liftFraction===.5&&load.strainFraction===1&&load.speedMultiplier===.75&&load.runMultiplier===3&&load.skillPenalty===-10,'Unsupported encumbrance rule');
  assert.deepEqual(load.skills,['acrobatics','climb','endurance','initiative','jump','stealth','swim'].map(id=>'skill:'+id));assert.deepEqual(load.sizeMultipliers,{fine:.01,diminutive:.25,tiny:.5,small:.75,medium:1,large:2,huge:5,gargantuan:10,colossal:20});
  assert(p.rules.combat.areaSourceIds?.length&&p.rules.combat.areaSourceIds.every(id=>sources.has(id)),'Missing area attack source');
  assert.deepEqual(p.rules.weaponRanges.penalties,[0,-2,-5,-10],'Unsupported range penalties');
  assert.deepEqual(Object.keys(p.rules.weaponRanges.limits).sort(),['heavy-weapons','pistols','rifles','simple-weapons','thrown']);
  for(const limits of Object.values(p.rules.weaponRanges.limits))assert(limits.length===4&&limits.every((n,i)=>Number.isInteger(n)&&n>=0&&(!i||n>limits[i-1])),'Invalid weapon ranges');
  assert.deepEqual(p.rules.unarmed.damage,{small:'1d3',medium:'1d4',large:'1d6'});assert.deepEqual(p.rules.unarmed.dieSteps,[3,4,6,8,10,12]);assert.deepEqual(p.rules.unarmed.naturalDieSteps,[1,2,3,4,6,8,10,12]);
  assert(p.rules.secondWind.hitPointFraction===.25&&p.rules.secondWind.maximumHitPointFraction===.5&&p.rules.secondWind.dailyUses===1,'Unsupported Second Wind rule');
  const wind=p.rules.secondWind;assert.deepEqual(Object.keys(wind).sort(),['dailyUses','exhaustionRestHours','exhaustionTopic','forceRecovery','hitPointFraction','maximumHitPointFraction','multipleUsesTopic','sourceIds','usesPerEncounter']);assert(wind.usesPerEncounter===1&&wind.exhaustionRestHours===8);assert.deepEqual(wind.forceRecovery,{talentId:'talent:force-recovery',die:6,maxDice:10});requireRef('talents',wind.forceRecovery.talentId);
  assert(wind.multipleUsesTopic==='jc:114-variant-rule-multiple-second-winds'&&wind.exhaustionTopic==='jc:114-optional-rule-the-edge-of-exhaustion');
  assert(Object.keys(p.rules.recovery).every(k=>['sourceIds','swiftActions','shakeItOff'].includes(k))&&p.rules.recovery.swiftActions===3&&p.rules.recovery.sourceIds.length&&p.rules.recovery.sourceIds.every(id=>sources.has(id)),'Unsupported Recover rule');assert.equal(p.rules.combat.areaMinimumRoll,10);
  for(const group of ['naturalHealing','unconsciousRecovery'])assert(p.rules[group]?.sourceIds?.length&&p.rules[group].sourceIds.every(id=>sources.has(id)),`Missing ${group} sources`);
  const natural=p.rules.naturalHealing,awake=p.rules.unconsciousRecovery;
  assert.deepEqual(Object.keys(natural).sort(),['removablePersistent','restHours','sourceIds','usesPerDay']);assert(natural.restHours===8&&natural.usesPerDay===1);assert.deepEqual(natural.removablePersistent,['rage','second-wind','injury']);
  assert.deepEqual(Object.keys(awake).sort(),['dc','deathFailureMargin','fatalNatural','firstMinutes','retryHours','sourceIds','stunNoFatalCheck']);assert(awake.dc===10&&awake.firstMinutes===1&&awake.retryHours===1&&awake.deathFailureMargin===5&&awake.fatalNatural===1&&awake.stunNoFatalCheck===true);
  assert.deepEqual(p.rules.recovery.shakeItOff,{featId:'feat:shake-it-off',swiftActions:2,sourceIds:['source:wiki-shake-it-off']});
  const incoming=p.rules.incomingDamage;assert(incoming&&incoming.sourceIds.length&&incoming.sourceIds.every(id=>sources.has(id)),'Missing damage sources');assert.deepEqual(Object.keys(incoming).sort(),['forcePointCost','helplessStep','ion','normalThresholdSteps','sourceIds','stun']);assert(incoming.normalThresholdSteps===1&&incoming.helplessStep===5&&incoming.forcePointCost===1);assert.deepEqual(incoming.stun,{hpDivisor:2,thresholdSteps:2,blasterRange:6});assert.deepEqual(incoming.ion,{hpDivisor:2,thresholdSteps:2});
  if(access){assert(Object.keys(access).every(k=>['trees','sourceIds'].includes(k)));assert(Array.isArray(access.trees)&&access.trees.length>=4&&access.trees.length<=6&&new Set(access.trees).size===access.trees.length&&['tree:alter','tree:control','tree:dark-side','tree:sense'].every(id=>access.trees.includes(id))&&access.trees.every(t=>['tree:alter','tree:control','tree:dark-side','tree:sense','tree:light-side','tree:guardian-spirit'].includes(t)&&p.talents.some(r=>r.tree===t)));assert(access.sourceIds.length&&access.sourceIds.every(id=>sources.has(id)));}
  if(p.rules.traditionTalentAccess!==undefined){
    const traditions=p.rules.traditionTalentAccess;
    assert(Array.isArray(traditions)&&traditions.length>0&&new Set(traditions.map(r=>r.id)).size===traditions.length&&new Set(traditions.map(r=>r.tree)).size===traditions.length,'Invalid Force Tradition access');
    for(const r of traditions){
      assert(Object.keys(r).sort().join()===['id','name','prerequisite','ruleId','sourceId','tree'].sort().join()&&/^tradition:[a-z0-9-]+$/.test(r.id)&&typeof r.name==='string'&&r.name.length>0&&sources.has(r.sourceId),'Invalid Force Tradition');
      assert(p.rulePages.some(p=>p.id===r.ruleId&&p.sourceId===r.sourceId)&&p.talents.some(t=>t.tree===r.tree),'Missing tradition source/tree');
      const check=q=>{assert(['all','species','trained','darkSideScore','feat'].includes(q.kind),'Unsupported membership requirement');if(q.kind==='all')q.requirements.forEach(check);else{if(q.kind==='feat')assert.equal(q.value,'feat:force-sensitivity');prerequisite(q);}};check(r.prerequisite);
      for(const t of p.talents.filter(t=>t.tree===r.tree)){assert(t.prerequisite.kind==='all'&&t.prerequisite.requirements.some(q=>q.kind==='tradition'&&q.value===r.id)&&t.prerequisite.requirements.some(q=>q.kind==='feat'&&q.value==='feat:force-sensitivity'),'Missing tradition talent access guard');}
    }
  }
  if(recovery){assert(Object.keys(recovery).every(k=>['sourceIds','restMinutes','forcePointCost','naturalRoll'].includes(k)));assert(recovery.sourceIds.length&&recovery.sourceIds.every(id=>sources.has(id)));assert(recovery.restMinutes===1&&recovery.forcePointCost===1&&recovery.naturalRoll===20);}
  if(p.heroicTraits) {
    assert(Array.isArray(p.heroicTraits.sourceIds));p.heroicTraits.sourceIds.forEach(id=>assert(sources.has(id)));
    for(const key of ['eras','heroTypes'])assert(Array.isArray(p.heroicTraits[key]) && p.heroicTraits[key].every(value=>typeof value==='string'));
  }
  if(p.jediCounseling){
    assert(Array.isArray(p.jediCounseling));const topics=new Set();
    for(const r of p.jediCounseling){assert(Object.keys(r).every(k=>['id','name','issue','ruleId','sourceId'].includes(k)));assert(/^jc:\d+-[a-z0-9-]+$/.test(r.id)&&!topics.has(r.id));topics.add(r.id);assert(typeof r.name==='string'&&Number.isInteger(r.issue)&&r.issue>=105&&r.issue<=115);assert(sources.has(r.sourceId)&&p.rulePages.some(page=>page.id===r.ruleId&&page.sourceId===r.sourceId));}
    for(const [id,mode] of Object.entries(p.rules.counselingApplications||{}))assert(topics.has(id)&&['talent-activation','weapon-familiarity','partial-proficiency','raw-equivalent','range-penalties','unarmed-proficiency','unarmed-finesse','second-winds','second-wind-exhaustion','force-thrust-door'].includes(mode));
  }
  if(p.optionalRules){
    const catalog=p.optionalRules,index=JSON.parse(fs.readFileSync(new URL('../data/reference-index.json',import.meta.url))),ids=new Set();
    assert.equal(catalog.schemaVersion,1);assert.equal(catalog.libraryArticles,index.records.length);assert.equal(catalog.libraryCapturedAt,index.capturedAt);assert.deepEqual(catalog.license,index.license);
    for(const r of catalog.entries){
      assert(/^optional:[a-z0-9-]+$/.test(r.id)&&!ids.has(r.id),'Optional rule identity');ids.add(r.id);
      assert(Object.keys(r).every(k=>['id','name','books','status','note','counselingId','campaignRuleId','referenceId','source','article'].includes(k)),'Optional rule fields');
      assert(typeof r.name==='string'&&r.name&&Array.isArray(r.books)&&r.books.length&&['automatic','partial','manual'].includes(r.status),'Optional rule metadata');
      const record=index.records.find(page=>page.id===r.referenceId);assert(record&&!index.excluded.includes(record.name),'Optional rule reference');assert.deepEqual(r.source,record.source);
      assert.equal(r.article.sourceId,r.source.id);assert(Array.isArray(r.article.blocks)&&r.article.blocks.length,'Optional rule passage');
      if(r.counselingId)assert(p.jediCounseling.some(t=>t.id===r.counselingId),'Optional rule Counseling setting');
      if(r.campaignRuleId)assert(CAMPAIGN_RULES.some(rule=>rule.id===r.campaignRuleId&&rule.optionalId===r.id),'Optional campaign rule');
      if(r.status==='automatic')assert(p.rules.counselingApplications[r.counselingId]||CAMPAIGN_RULES.some(rule=>rule.id===r.campaignRuleId&&rule.support==='Automatic'),'Optional rule automation');
    }
  }
  if(p.rules.licensing){
    const l=p.rules.licensing;assert(Object.keys(l).every(k=>['sourceIds','ratings'].includes(k))&&l.sourceIds.length&&l.sourceIds.every(id=>sources.has(id)));
    assert.deepEqual(Object.keys(l.ratings).sort(),['illegal','licensed','military','restricted']);
    for(const r of Object.values(l.ratings)){assert.deepEqual(Object.keys(r).sort(),['blackMarket','days','dc','percent']);assert(Object.values(r).every(n=>Number.isInteger(n)&&n>0));}
  }
  assert(p.rules.armorEquipment&&Object.keys(p.rules.armorEquipment).length===1&&p.rules.armorEquipment.sourceIds.every(id=>sources.has(id)),'Missing supplemental armor sources');
  assert.deepEqual(Object.keys(p.rules.energyShields).sort(),['activationAction','oncePerEncounter','sourceIds','unproficientReflexPenalty']);assert(p.rules.energyShields.sourceIds.every(id=>sources.has(id)));assert.equal(p.rules.energyShields.activationAction,'swift-action');assert.equal(p.rules.energyShields.oncePerEncounter,true);assert.equal(p.rules.energyShields.unproficientReflexPenalty,-5);
  const movement=p.rules.armorMovement;
  if(p.rules.ambiguities!==undefined){
    assert(Array.isArray(p.rules.ambiguities),'Invalid ambiguities');const ambiguityIds=new Set();
    for(const r of p.rules.ambiguities){
      assert(Object.keys(r).every(k=>['id','name','sourceIds','passages','default','options'].includes(k)),'Unsupported ambiguity field');
      assert(/^ambiguity:[a-z0-9-]+$/.test(r.id)&&!ambiguityIds.has(r.id),'Invalid ambiguity ID');ambiguityIds.add(r.id);assert(typeof r.name==='string');
      assert(Array.isArray(r.sourceIds)&&r.sourceIds.length&&r.sourceIds.every(id=>sources.has(id)),'Missing ambiguity source');
      assert(Array.isArray(r.options)&&r.options.length>=2&&new Set(r.options.map(o=>o.value)).size===r.options.length,'Invalid ambiguity options');
      for(const o of r.options)assert(Object.keys(o).every(k=>['value','name'].includes(k))&&/^[a-z0-9-]+$/.test(o.value)&&typeof o.name==='string','Invalid ambiguity option');
      assert(r.options.some(o=>o.value===r.default),'Invalid ambiguity default');
      assert(Array.isArray(r.passages)&&r.passages.length>=1,'Missing ambiguity passages');
      for(const passage of r.passages){
        const page=p.rulePages.find(p=>p.id===passage.ruleId);
        assert(Object.keys(passage).every(k=>['ruleId','paragraphCount','fullText'].includes(k))&&page&&r.sourceIds.includes(page.sourceId),'Invalid ambiguity passage');
        assert(passage.fullText===true?passage.paragraphCount===undefined:passage.fullText===undefined&&Number.isInteger(passage.paragraphCount)&&passage.paragraphCount>0&&passage.paragraphCount<=page.article.blocks.filter(n=>n?.tag==='p').length,'Invalid ambiguity excerpt');
      }
    }
  }
  assert(movement&&Object.keys(movement).every(k=>['sourceIds','speedMultipliers','runMultipliers','droidHeavySlowedSpeeds'].includes(k)),'Missing armor movement rules');
  assert(Array.isArray(movement.droidHeavySlowedSpeeds)&&new Set(movement.droidHeavySlowedSpeeds).size===movement.droidHeavySlowedSpeeds.length&&movement.droidHeavySlowedSpeeds.every(n=>Number.isInteger(n)&&n>0),'Invalid droid armor speeds');
  assert(movement.sourceIds.length&&movement.sourceIds.every(id=>sources.has(id)),'Missing armor movement source');
  assert.deepEqual(Object.keys(movement.speedMultipliers).sort(),['heavy','light','medium']);
  assert.deepEqual(Object.keys(movement.runMultipliers).sort(),['heavy','light','medium']);
  assert(Object.values(movement.speedMultipliers).every(n=>Number.isFinite(n)&&n>0&&n<=1),'Invalid armor speed multiplier');
  assert(Object.values(movement.runMultipliers).every(n=>Number.isInteger(n)&&n>0),'Invalid armor run multiplier');
  if(p.catalog) {
    assert.equal(p.catalog.schemaVersion,1);
    assert.equal(p.catalog.book,'Core Rulebook');
    assert(Array.isArray(p.catalog.records));
    const kinds=['species','class','prestigeClass','classFeature','skill','feat','talent','talentTree','weapon','armor','gear','forcePower','starshipManeuver','vehicle'];
    const catalogIds=new Set(), pages=new Map(p.rulePages.map(r=>[r.id,r]));
    for(const r of p.catalog.records) {
      assert(/^catalog:[a-z0-9-]+$/.test(r.id)&&!catalogIds.has(r.id),'Invalid catalog ID');catalogIds.add(r.id);
      assert.equal(typeof r.name,'string');assert(kinds.includes(r.kind),'Unknown catalog kind');
      assert(['available','reference'].includes(r.status),'Invalid catalog status');
      assert(sources.has(r.sourceId),'Missing catalog reference');
      if(r.referenceId!==undefined){const v=ix.vehicles.get(r.mechanicsIds?.[0]);assert(r.kind==='vehicle'&&r.ruleId===undefined&&r.mechanicsIds.length===1&&v&&v.referenceId===r.referenceId&&v.sourceId===r.sourceId&&v.name===r.name,'Vehicle catalog reference mismatch');}
      else{assert(pages.has(r.ruleId),'Missing catalog reference');assert.equal(pages.get(r.ruleId).sourceId,r.sourceId,'Catalog source mismatch');}
      assert(Array.isArray(r.books)&&r.books.every(b=>typeof b==='string'));
      assert(Array.isArray(r.mechanicsIds)&&new Set(r.mechanicsIds).size===r.mechanicsIds.length,'Invalid catalog mechanics');
      const collection={species:'species',class:'classes',prestigeClass:'classes',classFeature:'classChoices',skill:'skills',feat:'feats',talent:'talents',weapon:'equipment',armor:'equipment',gear:'equipment',forcePower:'forcePowers',starshipManeuver:'starshipManeuvers',vehicle:'vehicles'}[r.kind];
      r.mechanicsIds.forEach(id=>{assert(collection,'Unsupported catalog mechanics');requireRef(collection,id);});
      assert.equal(r.status,r.mechanicsIds.length?'available':'reference','Unreviewed catalog entry enabled');
      if(r.classIds){assert(Array.isArray(r.classIds));r.classIds.forEach(id=>requireRef('classes',id));}
      assert(Object.keys(r).every(k=>['id','name','kind','ruleId','referenceId','sourceId','books','tree','classIds','mechanicsIds','status'].includes(k)),'Invalid catalog attribute');
    }
  }
  return p;
}

if (process.argv[1]?.endsWith('validate-rules.js')) {
  const p=validatePack(JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url),'utf8')));
  console.log(`Validated ${p.id} ${p.version}: ${p.species.length} species, ${p.classes.length} classes, ${p.skills.length} skills, ${p.feats.length} feats, ${p.talents.length} talents, ${p.equipment.length} equipment, ${(p.forcePowers||[]).length} Force powers`);
}
