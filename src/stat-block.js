import {ABILITIES, indexPack, signed, derive} from './rules.js';
import {TRAIT_FIELDS, backgroundLanguage} from './heroic-traits.js';
import {escapeHTML as escape} from './wiki-content.js';
import {resolveEquipment} from './equipment.js';
import {choiceName} from './feature-choices.js';
import {persistentName} from './recovery.js';
import {planFullAttack} from './full-attacks.js';
import {conditionalDefenseLabel} from './defensive-combat.js';

// Formatting reference: Darth Vader, wiki revision 25962. All values come from
// the saved character and Saga derivation, never from the reference NPC.
export function renderStatBlock(c,d,pack){
 if(c.attackTarget)d=derive({...c,attackTarget:undefined},pack);
 const ix=indexPack(pack),species=ix.species.get(c.species);
 const line=(label,value)=>value?`<p><b>${label}:</b> ${value}</p>`:'';
 const textLine=(label,value)=>line(label,escape(value));
 const featureName=(type,s)=>{
  const record=ix[type].get(s.id);
  return escape(record.name+(d.ctx.inactiveTalents?.has(s.id)?' (Inactive)':'')+(s.choice?` (${choiceName(s.choice,pack)})`:''));
 };
 const classes=[...d.ctx.classLevels].map(([id,n])=>`${escape(ix.classes.get(id).name)} ${n}`).join('/');
 const skill=id=>d.skills.find(s=>s.id==='skill:'+id);
 const languages=[...species.languages,backgroundLanguage(c,pack),c.languages].filter(Boolean).map(escape).join(', ');
 const classFeatureNames=[...d.ctx.classFeatures.map(f=>f.name+(d.ctx.inactiveClasses.has(f.classId)?' (Inactive)':'')),...d.ctx.classChoices.map(s=>ix.classChoices.get(s.id).name+(s.choice?' ('+choiceName(s.choice,pack)+')':'' )+(d.ctx.inactiveClasses.has(s.classId)?' (Inactive)':''))];
 const points=[c.story?.kind==='destiny'?`<b>Destiny Points:</b> ${c.story.points}`:'',`<b>Force Points:</b> ${d.forceCurrent??c.forcePoints}`,`<b>Dark Side Score:</b> ${c.darkSideScore||0}`].filter(Boolean).join('; ');
 const energySR=(d.energyShields||[]).map(s=>`${s.sr} (Energy)`).join(', ');
 const protection=d.normalProtection||c.protection||{dr:0,sr:0,srMax:0,drBypass:''};
 const condition=c.condition===5?`Helpless (${species.isDroid?'Disabled':'Unconscious'})`:c.condition?`${signed(pack.rules.conditionPenalties[c.condition])} Penalty${c.condition===4?'; Move at Half Speed':''}`:'';
 const defenseTotal=key=>d.defenses[key]+(d.conditionalDefenses||[]).filter(e=>e.defense===key).map(e=>` (${e.total} ${escape(conditionalDefenseLabel(e))})`).join('');
 const defensiveOptions=[d.defensiveCombat.stance==='fight'?'Fight Defensively':d.defensiveCombat.stance==='total'?'Total Defense':'',d.defensiveCombat.melee?'Melee Defense '+d.defensiveCombat.melee:'',c.chargeReflexPenalty?'Charge':''].filter(Boolean).join('; ');
 const attackText=(a,attackMod=0,damageMod=0)=>`${escape(a.name)} ${signed(a.attack+attackMod)} (${escape(a.damageDisplay)}${damageMod?signed(damageMod):''}${a.criticalThreat<20&&!a.areaType?'; '+a.criticalThreat+'–20 critical':''}${a.criticalMultiplier>2&&!a.areaType?`; ×${a.criticalMultiplier} critical`:''})`;
 const attacks=d.attacks.map(a=>line(a.mode==='melee'?'Melee':'Ranged',attackText(a))).join('');
 const routines=(c.routines||[]).filter(r=>r.steps.length).map(r=>{
  let plan;try{plan=planFullAttack(r,d,pack);}catch(e){return line(escape(r.name||'Routine'),escape(e.message));}
  return line(escape(r.name||'Routine'),r.steps.map(s=>{
  const a=plan.attacks.find(a=>a.uid===s.attackId);
  return `${s.count>1?s.count+' × ':''}${a?attackText(a,s.attackMod,s.damageMod):'Attack unavailable'}`;
 }).join(' and '));}).join('');
 const story=c.story?.kind!=='none'&&ix[c.story?.kind==='destiny'?'destinies':'backgrounds']?.get(c.story?.id);
 const traits=TRAIT_FIELDS.filter(([key])=>c.heroicTraits?.[key]).map(([key,label])=>textLine(label,c.heroicTraits[key])).join('');
 return `<article class="stat-block"><h1>${escape(c.name||'unnamed')} <span>(CL ${d.level})</span></h1>
 <p>${escape((d.size||species.size).replace(/^./,ch=>ch.toUpperCase()))} ${escape(species.name)} ${classes}</p>
 <p>${points}</p>${line('Initiative',signed(skill('initiative').total)+'; <b>Senses:</b> Perception '+signed(skill('perception').total)+[(d.vision||species.vision)==='darkvision'?'Darkvision':(d.vision||species.vision)==='low-light'?'Low-Light Vision':'',species.scentRange?'Scent '+species.scentRange+' Squares':''].filter(Boolean).map(s=>', '+s).join(''))}${line('Languages',languages)}
 <h2>Defenses</h2><p><b>Reflex Defense:</b> ${defenseTotal('reflex')}, <b>Fortitude Defense:</b> ${defenseTotal('fortitude')}, <b>Will Defense:</b> ${defenseTotal('will')}</p>${textLine('Defensive Abilities',defensiveOptions)}
 <p><b>Hit Points:</b> ${c.currentHP??d.hp}/${d.hp}; <b>Damage Threshold:</b> ${d.threshold}${(d.conditionalThresholds||[]).map(r=>` (${r.total} ${escape(conditionalDefenseLabel(r))})`).join('')}${protection.dr?`; <b>DR:</b> ${protection.dr}${protection.drBypass?' ('+escape(protection.drBypass)+')':''}`:''}${protection.srMax||energySR?`; <b>SR:</b> ${[protection.srMax?protection.sr+'/'+protection.srMax:'',energySR].filter(Boolean).join(', ')}`:''}</p>
 ${d.recovery?.dead?textLine('Status',species.isDroid?'Destroyed':'Dead'):d.helpless&&c.condition!==5?textLine('Status',c.helpless?'Helpless':species.isDroid?'Disabled':'Unconscious'):''}${textLine('Condition Track',condition)}${d.recovery?.persistent.length?textLine('Persistent Conditions',d.recovery.persistent.map(persistentName).join(', ')):''}
 <h2>Offense</h2>${line('Speed',d.speed+' Squares'+Object.entries(d.speeds||{}).map(([type,n])=>`, ${escape(type)} ${n} Squares`).join('')+(d.runMultiplier!==4?` (Run ${d.runSpeed} Squares)`:''))}${attacks}${routines}${species.bellow?line('Special Attacks',`Bellow ${signed(d.level+d.specialAttackPenalty)} (${species.bellow.damageDice+(d.bellowBonuses?.dice||0)}d${species.bellow.die} Sonic; ${species.bellow.coneSquares}-Square Cone; Fortitude)`):''}${line('Base Attack Bonus',signed(d.bab))}
 ${textLine('Special Qualities',classFeatureNames.join(', '))}
 <h2>Base Stats</h2>${line('Abilities',ABILITIES.map(a=>`${a[0].toUpperCase()+a.slice(1)} ${d.scores[a]}`).join(', '))}
 ${line('Force Powers',d.forcePowers?.map(p=>escape(p.name)).join(', '))}
 ${line('Talents',d.ctx.talents.map(s=>featureName('talents',s)).join(', '))}${line('Feats',d.ctx.feats.map(s=>featureName('feats',s)).join(', '))}
 ${line('Skills',d.skills.filter(s=>s.trained&&s.available).map(s=>`${escape(s.name)} ${signed(s.total)}`).join(', '))}
 ${line('Possessions',c.inventory.map(e=>`${escape(resolveEquipment(e,pack,c).name)}${e.quantity>1?' (×'+e.quantity+')':''}`).concat(c.credits?`${c.credits.toLocaleString()} Credits`:[]).join(', '))}
 ${line('XP',(c.xp||0).toLocaleString())}${story?textLine(c.story.kind==='destiny'?'Destiny':'Background',story.name):''}${c.story?.kind==='destiny'?textLine('Destiny Details',c.story.details):''}
 ${traits?`<h2>Heroic Traits</h2>${traits}`:''}${textLine('Notes',c.notes)}
 ${d.issues.length?textLine('Unresolved Choices',d.issues.join('; ')):''}</article>`;
}
