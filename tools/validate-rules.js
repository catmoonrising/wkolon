import {WIKI_TAGS, wikiURL} from '../src/wiki-content.js';
import fs from 'node:fs';
import {ABILITIES, GROUPS, indexPack} from '../src/rules.js';
import assert from 'node:assert/strict';

export function validatePack(p) {
  assert.equal(p.schemaVersion, 1);
  const numericRules={combat:['shieldLoss','shieldRecharge','rechargeDC','rechargeActions','naturalHit','naturalMiss','criticalMultiplier','minimumDamage','areaMinimumRoll'],resources:['forcePointBase','xpStep']};
  for(const [group,keys] of Object.entries(numericRules)){
    const rules=p.rules?.[group];assert(rules,group);
    assert(Array.isArray(rules.sourceIds)&&rules.sourceIds.length>0&&rules.sourceIds.every(id=>p.sources?.some(s=>s.id===id)),group+' sources');
    assert(Object.keys(rules).every(key=>key==='sourceIds'||group==='combat'&&key==='areaSourceIds'||keys.includes(key)),group+' fields');
    for(const key of keys)assert(Number.isInteger(rules[key])&&rules[key]>=(key==='forcePointBase'?0:1),`${group}.${key}`);
  }
  for (const k of ['id','version','name']) assert.equal(typeof p[k], 'string', k);
  for (const k of ['species','classes','skills','feats','talents','equipment','sources']) assert(Array.isArray(p[k]), k);
  assert(p.license && p.rules && p.sources.length);
  const ix = indexPack(p), ids = new Set(), sources = new Set(p.sources.map(s => s.id));
  assert(p.rules.sizeStealth && Object.entries(p.rules.sizeReflex).every(([size])=>Number.isInteger(p.rules.sizeStealth[size])), 'Missing size modifiers for Stealth');
  for (const s of p.sources) {
    assert(Number.isInteger(s.revision) && s.revision > 0);
    assert(!Number.isNaN(Date.parse(s.timestamp)));
    for (const k of ['url','history']) assert.equal(new URL(s[k]).hostname, 'swse.miraheze.org');
    if(s.sha256)assert(/^[a-f0-9]{64}$/.test(s.sha256),'Invalid source checksum');
  }
  function requireRef(collection, id) { assert(ix[collection].has(id), `Unknown ${collection} reference: ${id}`); }
  function prerequisite(r) {
    if (['all','any'].includes(r.kind)) { assert(Array.isArray(r.requirements)); r.requirements.forEach(prerequisite); return; }
    assert(['ability','feat','featChoice','talent','talentChoice','power','darkSideScore','trained','untrained','classSkill','proficientChoice','focusChoice','bab','nonDroid','trait','size','species'].includes(r.kind), `Unsupported prerequisite ${r.kind}`);
    if(r.kind==='featChoice')requireRef('feats',r.value);
    if(r.kind==='trait')assert.equal(r.value,'rage');
    if(r.kind==='size')assert(p.rules.weaponSizeOrder.includes(r.value));
    if(r.kind==='species')assert(p.species.some(s=>s.name.replace(/ \([^)]*\)$/,'')===r.value),'Unknown prerequisite species');
    if(r.kind==='power'&&r.value!=='$choice')requireRef('forcePowers',r.value);
    if(r.kind==='talentChoice'){requireRef('talents',r.value);assert(r.choice==='$choice'||GROUPS.includes(r.choice),'Unsupported talent choice prerequisite');}
    if(r.kind==='darkSideScore')assert.equal(r.min,1);
    if (r.kind === 'ability') { assert(ABILITIES.includes(r.value)); assert(Number.isInteger(r.min)); }
    if (r.kind === 'bab') assert(Number.isInteger(r.min));
    if (r.kind === 'feat') requireRef('feats',r.value);
    if (r.kind === 'talent') requireRef('talents',r.value);
    if (['trained','untrained','classSkill'].includes(r.kind) && r.value !== '$choice') requireRef('skills',r.value);
    if(['proficientChoice','focusChoice'].includes(r.kind))assert(r.value==='$choice'||GROUPS.includes(r.value),'Unknown prerequisite weapon group');
  }
  for (const key of ['species','classes','skills','feats','talents','equipment','destinies','backgrounds','forcePowers','classChoices','rulePages']) for (const r of p[key]||[]) {
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
      if(r.limbRegeneration){assert.deepEqual(Object.keys(r.limbRegeneration).sort(),['die','sourceId']);assert.equal(r.limbRegeneration.die,10);assert(sources.has(r.limbRegeneration.sourceId),'Missing limb regeneration source');}
      if(r.bellow)assert.deepEqual(r.bellow,{damageDice:3,die:6,coneSquares:6,conditionCost:1,extraDieCost:1,defense:'fortitude'});
      if(r.rage){assert.deepEqual(Object.keys(r.rage).sort(),['blockedSkills','bonus','dailyUses','durationBase','restMinutes']);assert(r.rage.dailyUses===1&&r.rage.bonus===2&&r.rage.durationBase===5&&r.rage.restMinutes===10);assert.deepEqual(r.rage.blockedSkills,['skill:mechanics','skill:stealth','skill:use-the-force']);r.rage.blockedSkills.forEach(id=>requireRef('skills',id));}
      if(r.skillRerolls){assert(Array.isArray(r.skillRerolls));for(const e of r.skillRerolls){requireRef('skills',e.skill);assert(Object.keys(e).every(k=>['skill','keep','when'].includes(k))&&['replace','best'].includes(e.keep)&&(!e.when||['intimidate','searchYourFeelingsOrSenseForce'].includes(e.when)),'Unsupported species reroll');}}
      if(r.take10Skills){assert(Array.isArray(r.take10Skills)&&new Set(r.take10Skills).size===r.take10Skills.length);r.take10Skills.forEach(id=>requireRef('skills',id));}
      if(r.vision)assert(['low-light','darkvision'].includes(r.vision));
      for(const k of ['breatheUnderwater','knockdownImmune'])if(r[k]!==undefined)assert.equal(typeof r[k],'boolean');
      for(const k of ['scentRange','holdBreathMultiplier','naturalHealingMultiplier'])if(r[k]!==undefined)assert(Number.isInteger(r[k])&&r[k]>0);
      if(r.traits!==undefined)assert(Array.isArray(r.traits)&&new Set(r.traits).size===r.traits.length&&r.traits.every(t=>t==='rage'),'Unsupported species trait');
      if (r.isDroid !== undefined) assert.equal(typeof r.isDroid,'boolean',`Invalid droid classification: ${r.id}`);
      assert(p.rules.sizeReflex[r.size] !== undefined && Number.isInteger(r.speed));
      for(const [k,v] of Object.entries(r.abilityAdjustments)) assert(ABILITIES.includes(k) && Number.isInteger(v));
      assert(Array.isArray(r.languages) && Array.isArray(r.reminders));
      if(r.naturalArmor!==undefined)assert(Number.isInteger(r.naturalArmor)&&r.naturalArmor>=0,'Invalid natural armor');
      if(r.conditionalDefenses!==undefined){
        assert(Array.isArray(r.conditionalDefenses));
        for(const e of r.conditionalDefenses){
          assert(Object.keys(e).every(k=>['defense','against','amount','type'].includes(k)));
          assert(e.defense==='will'&&e.against==='use-the-force'&&e.type==='untyped'&&Number.isInteger(e.amount),'Unsupported conditional defense');
        }
        assert(new Set(r.conditionalDefenses.map(e=>e.defense+':'+e.against)).size===r.conditionalDefenses.length,'Duplicate conditional defense');
      }
      if(r.conditionalFocus) requireRef('skills',r.conditionalFocus);
      if(r.conditionalFocuses){assert(Array.isArray(r.conditionalFocuses)&&new Set(r.conditionalFocuses).size===r.conditionalFocuses.length);r.conditionalFocuses.forEach(id=>requireRef('skills',id));}
      for(const key of ['forceImmune','technophobic','biotechProficiency'])if(r[key]!==undefined)assert.equal(typeof r[key],'boolean');
      if(r.bookVariant!==undefined)assert.equal(typeof r.bookVariant,'string');
      if(r.forbiddenClasses){assert(Array.isArray(r.forbiddenClasses));r.forbiddenClasses.forEach(id=>requireRef('classes',id));}
      if(r.weaponFamiliarity)for(const [id,group] of Object.entries(r.weaponFamiliarity)){requireRef('equipment',id);assert(GROUPS.includes(group));}
      for(const key of ['startingFeats','excludedStartingFeats'])if(r[key]){assert(Array.isArray(r[key]));r[key].forEach(id=>requireRef('feats',id));}
      if(r.speeds){assert(Object.keys(r.speeds).every(key=>/^[a-z-]+$/.test(key)));assert(Object.values(r.speeds).every(n=>Number.isInteger(n)&&n>=0));}
    }
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
    if(key==='forcePowers'){assert(['standard-action','swift-action','full-round-action','free-action','reaction'].includes(r.action));assert(Array.isArray(r.descriptors)&&new Set(r.descriptors).size===r.descriptors.length&&r.descriptors.every(d=>['dark-side','light-side','mind-affecting','telekinetic'].includes(d)));}
    if (['feats','talents'].includes(key)) {
      if(r.forceActivation!==undefined)assert(['check','forcePoint'].includes(r.forceActivation));
      if(r.requiresDarkSide!==undefined)assert.equal(r.requiresDarkSide,true);
      prerequisite(r.prerequisite); assert(['never','choice','stack'].includes(r.repeat));
      if(r.maxSelections!==undefined)assert(r.repeat==='stack'&&Number.isInteger(r.maxSelections)&&r.maxSelections>=1&&r.maxSelections<=20,'Invalid repeat limit');
      if(r.repeatGroup!==undefined){requireRef(key,r.repeatGroup);assert.equal(r.repeat,'choice');}
      if(r.weaponGroup!==undefined)assert(GROUPS.includes(r.weaponGroup),'Unknown weapon group');
      if(r.choiceType) assert(['skill','weaponGroup','weapon','power'].includes(r.choiceType));
      if(r.choiceGroups)assert(r.choiceType==='weaponGroup'&&Array.isArray(r.choiceGroups)&&r.choiceGroups.length&&new Set(r.choiceGroups).size===r.choiceGroups.length&&r.choiceGroups.every(g=>GROUPS.includes(g)),'Unsupported weapon choices');
      if(r.choiceScope)assert(r.choiceType==='weapon'&&r.choiceScope==='exotic');
      assert(Array.isArray(r.effects) && typeof r.reminder==='string');
      const passiveConditions={armorMaxDex:'proficientArmor',armorBonus:'proficientArmor',armorFortitude:'proficientArmor',armorMovement:'proficientArmor',speed:'lightOrNoArmor',meleeDamage:'meleeAttack'};
      for(const e of r.effects) {
        if(e.target==='skillSubstitution'){
          assert(Object.keys(e).every(k=>['target','skill','replacement','grantsTraining','when'].includes(k)),'Unsupported substitution field');
          requireRef('skills',e.skill);requireRef('skills',e.replacement);assert.notEqual(e.skill,e.replacement);assert.equal(typeof e.grantsTraining,'boolean');
          assert(e.when===undefined||['computerNetwork','perceptionApplications'].includes(e.when),'Unsupported substitution condition');
          assert(!(e.when==='computerNetwork'&&e.grantsTraining),'Conditional substitutions cannot grant permanent training');
          if(e.when==='perceptionApplications')assert(e.skill==='skill:perception'&&e.replacement==='skill:use-the-force'&&e.grantsTraining,'Unsupported Perception applications');
          continue;
        }
        assert(Object.keys(e).every(k=>['target','amount','type','perLevel','when','weaponGroup','ability','minimum'].includes(k)),'Unsupported effect field');
        assert(['defenses','hp','threshold','skillFocus','skillTraining','weaponFocus','weaponSpecialization','runMultiplier','licenseAllowance','blackMarketReduction','forcePowerSlots','forcePoints','rageUses','secondWinds','weaponFinesse','criticalMultiplier','forcePointDie','rageBonus','reflexDodge','unarmedDieSteps','unarmedCriticalDieStep','lightsaberDexDamage','exoticProficiency','multiattackReduction','controlledBurst','rapidShotPenalty','lightsaberReflex','lightsaberWill','criticalThreat','tumbleSokan',...Object.keys(passiveConditions)].includes(e.target),'Unsupported effect target');
        if(e.target==='forcePowerSlots')assert(e.amount===1&&e.ability==='wis'&&e.minimum===1&&e.type==='untyped'&&!e.perLevel,'Unsupported Force power capacity');
        else assert(e.ability===undefined&&e.minimum===undefined,'Unsupported effect ability');
        assert(Number.isFinite(e.amount));assert(['untyped','competence','dodge'].includes(e.type));
        const fixedEffects={forcePoints:3,rageUses:1,secondWinds:1,weaponFinesse:1,criticalMultiplier:3,forcePointDie:8,rageBonus:3,reflexDodge:1,unarmedDieSteps:1,unarmedCriticalDieStep:1};
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
      if(r.retractableStock){assert(r.kind==='weapon'&&r.group==='rifles');assert.deepEqual(Object.keys(r.retractableStock),['withoutCost']);assert(Number.isFinite(r.retractableStock.withoutCost)&&r.retractableStock.withoutCost>=0&&r.retractableStock.withoutCost<r.cost,'Invalid stockless cost');}
      if(r.scope){assert(r.kind==='gear');assert.deepEqual(Object.keys(r.scope).sort(),['ignoresDarkness','rangeReduction']);assert(r.scope.rangeReduction===1&&typeof r.scope.ignoresDarkness==='boolean','Invalid targeting scope');}
      if(r.ammunitionProfiles!==undefined){
        assert(r.kind==='weapon'&&r.mode==='ranged'&&Array.isArray(r.ammunitionProfiles)&&r.ammunitionProfiles.length&&new Set(r.ammunitionProfiles.map(a=>a.id)).size===r.ammunitionProfiles.length,'Invalid ammunition profiles');
        for(const a of r.ammunitionProfiles){
          assert.deepEqual(Object.keys(a).sort(),['capacity','id','name','reloadAction','sourceId','supplyIds']);assert(/^[a-z-]+$/.test(a.id)&&typeof a.name==='string'&&Number.isInteger(a.capacity)&&a.capacity>0&&a.capacity<=10000,'Invalid ammunition capacity');
          assert(['move-action','free-action','full-round-action'].includes(a.reloadAction)&&sources.has(a.sourceId),'Invalid reload rule');assert(Array.isArray(a.supplyIds)&&a.supplyIds.length&&new Set(a.supplyIds).size===a.supplyIds.length,'Invalid ammunition supplies');a.supplyIds.forEach(id=>requireRef('equipment',id));
        }
      }
      if(r.kind==='weapon') {
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
  const access=p.rules.forceTalentAccess,recovery=p.rules.forcePowerRecovery;
  const techniques=p.rules.attackTechniques;
  assert(Array.isArray(techniques)&&techniques.length===3&&new Set(techniques.map(t=>t.id)).size===3,'Invalid attack techniques');
  const techniqueValues={'burst-fire':['ranged',true,'str',13,-5,-10,2,5,false],'rapid-shot':['ranged',false,'str',13,-2,-5,1,2,false],'rapid-strike':['melee',false,'dex',13,-2,-5,1,0,true]};
  for(const t of techniques){
    assert(Object.keys(t).every(k=>['id','featId','sourceId','mode','requiresAutofire','ability','minimum','penalty','lowAbilityPenalty','extraDice','shots','lightException'].includes(k)),'Unsupported attack technique');
    assert(t.featId==='feat:'+t.id&&sources.has(t.sourceId)&&ix.feats.get(t.featId)?.sourceId===t.sourceId,'Missing technique source');
    assert.deepEqual([t.mode,t.requiresAutofire,t.ability,t.minimum,t.penalty,t.lowAbilityPenalty,t.extraDice,t.shots,!!t.lightException],techniqueValues[t.id],'Unsupported Core attack technique');
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
  assert.deepEqual(p.rules.unarmed.damage,{small:'1d3',medium:'1d4',large:'1d6'});assert.deepEqual(p.rules.unarmed.dieSteps,[3,4,6,8,10,12]);
  assert(p.rules.secondWind.hitPointFraction===.25&&p.rules.secondWind.maximumHitPointFraction===.5&&p.rules.secondWind.dailyUses===1,'Unsupported Second Wind rule');
  const wind=p.rules.secondWind;assert.deepEqual(Object.keys(wind).sort(),['dailyUses','exhaustionRestHours','exhaustionTopic','forceRecovery','hitPointFraction','maximumHitPointFraction','multipleUsesTopic','sourceIds','usesPerEncounter']);assert(wind.usesPerEncounter===1&&wind.exhaustionRestHours===8);assert.deepEqual(wind.forceRecovery,{talentId:'talent:force-recovery',die:6,maxDice:10});requireRef('talents',wind.forceRecovery.talentId);
  assert(wind.multipleUsesTopic==='jc:114-variant-rule-multiple-second-winds'&&wind.exhaustionTopic==='jc:114-optional-rule-the-edge-of-exhaustion');
  assert(Object.keys(p.rules.recovery).every(k=>['sourceIds','swiftActions'].includes(k))&&p.rules.recovery.swiftActions===3&&p.rules.recovery.sourceIds.length&&p.rules.recovery.sourceIds.every(id=>sources.has(id)),'Unsupported Recover rule');assert.equal(p.rules.combat.areaMinimumRoll,10);
  for(const group of ['naturalHealing','unconsciousRecovery'])assert(p.rules[group]?.sourceIds?.length&&p.rules[group].sourceIds.every(id=>sources.has(id)),`Missing ${group} sources`);
  const natural=p.rules.naturalHealing,awake=p.rules.unconsciousRecovery;
  assert.deepEqual(Object.keys(natural).sort(),['removablePersistent','restHours','sourceIds','usesPerDay']);assert(natural.restHours===8&&natural.usesPerDay===1);assert.deepEqual(natural.removablePersistent,['rage','second-wind','injury']);
  assert.deepEqual(Object.keys(awake).sort(),['dc','deathFailureMargin','fatalNatural','firstMinutes','retryHours','sourceIds','stunNoFatalCheck']);assert(awake.dc===10&&awake.firstMinutes===1&&awake.retryHours===1&&awake.deathFailureMargin===5&&awake.fatalNatural===1&&awake.stunNoFatalCheck===true);
  const incoming=p.rules.incomingDamage;assert(incoming&&incoming.sourceIds.length&&incoming.sourceIds.every(id=>sources.has(id)),'Missing damage sources');assert.deepEqual(Object.keys(incoming).sort(),['forcePointCost','helplessStep','ion','normalThresholdSteps','sourceIds','stun']);assert(incoming.normalThresholdSteps===1&&incoming.helplessStep===5&&incoming.forcePointCost===1);assert.deepEqual(incoming.stun,{hpDivisor:2,thresholdSteps:2,blasterRange:6});assert.deepEqual(incoming.ion,{hpDivisor:2,thresholdSteps:2});
  if(access){assert(Object.keys(access).every(k=>['trees','sourceIds'].includes(k)));assert(Array.isArray(access.trees)&&access.trees.length===4&&new Set(access.trees).size===4&&access.trees.every(t=>p.talents.some(r=>r.tree===t)));assert(access.sourceIds.length&&access.sourceIds.every(id=>sources.has(id)));}
  if(recovery){assert(Object.keys(recovery).every(k=>['sourceIds','restMinutes','forcePointCost','naturalRoll'].includes(k)));assert(recovery.sourceIds.length&&recovery.sourceIds.every(id=>sources.has(id)));assert(recovery.restMinutes===1&&recovery.forcePointCost===1&&recovery.naturalRoll===20);}
  if(p.heroicTraits) {
    assert(Array.isArray(p.heroicTraits.sourceIds));p.heroicTraits.sourceIds.forEach(id=>assert(sources.has(id)));
    for(const key of ['eras','heroTypes'])assert(Array.isArray(p.heroicTraits[key]) && p.heroicTraits[key].every(value=>typeof value==='string'));
  }
  if(p.jediCounseling){
    assert(Array.isArray(p.jediCounseling));const topics=new Set();
    for(const r of p.jediCounseling){assert(Object.keys(r).every(k=>['id','name','issue','ruleId','sourceId'].includes(k)));assert(/^jc:\d+-[a-z0-9-]+$/.test(r.id)&&!topics.has(r.id));topics.add(r.id);assert(typeof r.name==='string'&&Number.isInteger(r.issue)&&r.issue>=105&&r.issue<=115);assert(sources.has(r.sourceId)&&p.rulePages.some(page=>page.id===r.ruleId&&page.sourceId===r.sourceId));}
    for(const [id,mode] of Object.entries(p.rules.counselingApplications||{}))assert(topics.has(id)&&['talent-activation','weapon-familiarity','partial-proficiency','raw-equivalent','range-penalties','unarmed-proficiency','unarmed-finesse','second-winds','second-wind-exhaustion'].includes(mode));
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
    const kinds=['species','class','prestigeClass','classFeature','skill','feat','talent','talentTree','weapon','armor','gear','forcePower'];
    const catalogIds=new Set(), pages=new Map(p.rulePages.map(r=>[r.id,r]));
    for(const r of p.catalog.records) {
      assert(/^catalog:[a-z0-9-]+$/.test(r.id)&&!catalogIds.has(r.id),'Invalid catalog ID');catalogIds.add(r.id);
      assert.equal(typeof r.name,'string');assert(kinds.includes(r.kind),'Unknown catalog kind');
      assert(['available','reference'].includes(r.status),'Invalid catalog status');
      assert(sources.has(r.sourceId)&&pages.has(r.ruleId),'Missing catalog reference');
      assert.equal(pages.get(r.ruleId).sourceId,r.sourceId,'Catalog source mismatch');
      assert(Array.isArray(r.books)&&r.books.every(b=>typeof b==='string'));
      assert(Array.isArray(r.mechanicsIds)&&new Set(r.mechanicsIds).size===r.mechanicsIds.length,'Invalid catalog mechanics');
      const collection={species:'species',class:'classes',prestigeClass:'classes',classFeature:'classChoices',skill:'skills',feat:'feats',talent:'talents',weapon:'equipment',armor:'equipment',gear:'equipment',forcePower:'forcePowers'}[r.kind];
      r.mechanicsIds.forEach(id=>{assert(collection,'Unsupported catalog mechanics');requireRef(collection,id);});
      assert.equal(r.status,r.mechanicsIds.length?'available':'reference','Unreviewed catalog entry enabled');
      if(r.classIds){assert(Array.isArray(r.classIds));r.classIds.forEach(id=>requireRef('classes',id));}
      assert(Object.keys(r).every(k=>['id','name','kind','ruleId','sourceId','books','tree','classIds','mechanicsIds','status'].includes(k)),'Invalid catalog attribute');
    }
  }
  return p;
}

if (process.argv[1]?.endsWith('validate-rules.js')) {
  const p=validatePack(JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url),'utf8')));
  console.log(`Validated ${p.id} ${p.version}: ${p.species.length} species, ${p.classes.length} classes, ${p.skills.length} skills, ${p.feats.length} feats, ${p.talents.length} talents, ${p.equipment.length} equipment, ${(p.forcePowers||[]).length} Force powers`);
}
