import {campaignRuleEnabled} from './campaign-rules.js';
import {activeAbilities} from './ability-profiles.js';
import {classDeclarations} from './class-advancement-ui.js';
import {choiceName} from './feature-choices.js';
import {hasClassTalent} from './class-advancement.js';
import {indexPack,levelSlots} from './rules.js';
import {escapeHTML as escape} from './wiki-content.js';
import {optionArticle} from './creation-options.js';

export function levelPlanTable(c,d,pack,{choice,reference}){
 const ix=indexPack(pack),pick=(i,kind,j,slot,s)=>choice(i,kind,j,slot,s,false,true);
 const rows=c.levels.map((l,i)=>{
  const row=d.rows[i],cls=row.cls,blocked=row.valid===false,pending=!!l.pendingClass;
  const plannedClassLevel=c.levels.slice(0,i+1).filter(l=>!l.pendingClass&&l.classId===cls.id).length;
  const readOnly=(selection,type,key)=>{if(!selection)return '';const r=ix[type].get(selection.id);return `<span class="inactive-choice">${reference(r,r.name+(selection.choice?' ('+choiceName(selection.choice,pack)+')':''),selection,key)}</span>`;};
  const slots=blocked&&!pending?levelSlots(i+1,plannedClassLevel,ix.species.get(c.species),cls,pack):row.slots||[];
  const featCells=kind=>slots.map((slot,j)=>slot.kind===kind?(blocked?readOnly(l.feats[j],'feats','plan-inactive-feat-'+i+'-'+j):pick(i,'feat',j,slot,l.feats[j])):'').join('');
  const automatic=(row.ctx.features||[]).filter(f=>f.type==='feats'&&f.selection.automatic&&f.selection.level===i+1);
  const granted=automatic.filter(f=>i===0&&cls.startingFeats.includes(f.selection.id));
  const speciesFeats=automatic.filter(f=>!granted.includes(f));
  const startingGroups=new Map();
  for(const f of granted){const r=ix.feats.get(f.selection.id),family=r.name.match(/^(Armor Proficiency|Weapon Proficiency) \((.*)\)$/),key=family?.[1]||r.id;if(!startingGroups.has(key))startingGroups.set(key,[]);startingGroups.get(key).push({r,f,variant:family?.[2]});}
  const startingReferences=[...startingGroups].map(([name,entries])=>entries.length>1?`<button type="button" data-plan-rules="${entries.map(e=>e.r.id).join(',')}" data-plan-rules-title="${escape(name)}">${escape(name+' ('+entries.map(e=>e.variant).join(', ')+')')}</button>`:reference(entries[0].r,null,entries[0].f.selection,'plan-starting-'+entries[0].r.id)).join('');
  const increases=pack.rules.abilityLevels.includes(i+1)?[0,1].map(j=>`<select data-increase="${j}" data-level="${i}" aria-label="Level ${i+1} ability increase ${j+1}"><option value="">Choose…</option>${activeAbilities(c,pack).map(a=>`<option value="${a}" ${l.abilityIncreases[j]===a?'selected':''}>+1 ${a.toUpperCase()}</option>`).join('')}</select>`).join(''):'';
  const className=pending?'Choose…':cls.name+' ('+(blocked?plannedClassLevel||1:row.classLevel)+')';
  const starting=!blocked&&i>0&&row.classLevel===1&&cls.startingFeats.length?pick(i,'startingFeat',0,{label:'Starting feat'},l.startingFeat):'';
  const talents=blocked?readOnly(l.talent,'talents','plan-inactive-talent-'+i):hasClassTalent(cls,row.classLevel)?pick(i,'talent',0,{label:'Talent'},l.talent):'';
  const misc=[...(row.ctx.classFeatures||[]).filter(f=>f.level===i+1).map(f=>reference(cls,f.name,null,'plan-feature-'+i+'-'+f.name)),...(blocked?(l.classChoices||[]).map((s,j)=>readOnly(s,'classChoices','plan-inactive-misc-'+i+'-'+j)):(row.choiceSlots||[]).map((slot,j)=>pick(i,'classChoice',j,{...slot,label:slot.kind.replace(/([A-Z])/g,' $1')},l.classChoices?.[j])))];
  if(i===0&&!blocked)for(const id of row.ctx.speciesTraining||[]){const skill=ix.skills.get(id);misc.push(reference(optionArticle(pack,skill.name),skill.name,null,'plan-species-training-'+id));}
  if(!pending&&plannedClassLevel===1&&(cls.entrySpecials?.length||cls.continuousDarkSide||cls.advanceRestrictions?.length))misc.push(`<details class="level-entry"><summary>Entry</summary>${classDeclarations(cls,l,i)}${cls.continuousDarkSide?`<label>Acquisition DSS <input type="number" min="0" max="1000" data-class-dss="${i}" value="${l.acquisitionDSS??c.darkSideScore}"></label>`:''}${cls.advanceRestrictions?.length?`<label><input type="checkbox" data-class-ban="${cls.id}" ${c.classBans?.some(b=>b.classId===cls.id)?'checked':''}>Known pirate</label>`:''}</details>`);
  if(!blocked&&i)misc.push(`<details class="level-hp"><summary>HP</summary><label>d${cls.hitDie} <input type="number" data-field="hpRoll" data-level="${i}" min="1" max="${cls.hitDie}" value="${d.hpGains[i]}" ${campaignRuleEnabled(c,'averageHP')?'readonly':''} aria-label="Level ${i+1} HP ${campaignRuleEnabled(c,'averageHP')?'average':'roll'}"></label></details>`);
  if(!blocked&&row.maneuverChoices)misc.push(`<button type="button" data-open-tree="maneuvers:${i}:0">Starship Maneuvers (${(l.starshipManeuvers||[]).length}/${row.maneuverChoices})</button>`);
  if(!blocked&&(row.powerChoices||(l.forcePowers||[]).length))misc.push(`<button type="button" data-open-tree="powers:${i}:0">Force powers (${(l.forcePowers||[]).length}/${row.powerChoices})</button>`);
  if(!blocked&&(l.trainedSkills.length||i&&Math.floor((row.scores.int-10)/2)>Math.floor((d.rows[i-1].scores.int-10)/2)))misc.push(`<button type="button" data-open-tree="training:${i}:0">Skills</button>`);
  return `<tr data-plan-level="${i}" class="${blocked?'level-unresolved':''}"><th scope="row">${i+1}</th><td><button type="button" data-open-tree="class:${i}:0" aria-label="Choose class for level ${i+1}">${escape(className)}</button></td><td class="derived">${blocked?'-':row.ctx.bab}</td><td>${featCells('general')}${speciesFeats.map(f=>reference(ix.feats.get(f.selection.id),null,f.selection,'plan-species-'+i+'-'+f.selection.id)).join('')}</td><td>${startingReferences}${starting}${featCells('bonus')}</td><td>${talents}</td><td>${increases}</td><td>${misc.join('')}</td></tr>`;
 });
 return `<div class="actions level-plan-toolbar"><label>Level <input id="creation-level" type="number" min="1" max="20" value="${c.levels.length}" aria-label="Character level"></label><button type="button" data-plan-add ${c.levels.length===20?'disabled':''}>+ Level</button></div><div class="table-scroll level-plan-scroll"><table class="level-plan"><thead><tr>${['Level','Class','Base Attack Bonus','Heroic Feats','Class Feats','Class Talents','Ability Score Improvements','Misc'].map(label=>`<th scope="col">${label}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}
