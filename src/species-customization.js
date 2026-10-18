import {WIKI_TAGS,wikiURL} from './wiki-content.js';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const abilities=['str','dex','con','int','wis','cha'];
export const customizationState=(c,species)=>({replacement:null,trait:null,variants:[],options:{},...c.speciesCustomizations?.[species.id]});
export function applySpeciesCustomization(base,c){
 if(!base.customization)return base;
 const state=customizationState(c,base),replacement=base.customization.replacements.find(r=>r.id===state.replacement),trait=base.customization.traits.find(r=>r.id===state.trait),species={...base,abilityAdjustments:{...base.abilityAdjustments}};
 if(replacement)Object.assign(species,{bonusFeats:replacement.bonusFeats,bonusSkills:replacement.bonusSkills});
 if(trait){
  for(const [key,value]of Object.entries(trait.effects))species[key]=structuredClone(value);
  for(const choice of trait.choices||[]){
   const value=state.options[trait.id]?.[choice.id];if(!choice.options.some(o=>o.id===value))continue;
   if(choice.effect==='abilityAdjustment')species.abilityAdjustments[value]=(species.abilityAdjustments[value]||0)+choice.amount;
   if(choice.effect==='weaponFamiliarity')species.weaponFamiliarity={...species.weaponFamiliarity,[value]:'simple-weapons'};
  }
 }
 return species;
}
export function customizationIssues(c,species){
 if(!species.customization)return [];
 const s=customizationState(c,species),data=species.customization,trait=data.traits.find(r=>r.id===s.trait),issues=[];
 if(!data.replacements.some(r=>r.id===s.replacement))issues.push('Choose which '+species.name+' bonus to replace');
 if(!trait)issues.push('Choose '+species.name+' trait');
 if(!s.variants.length)issues.push('Choose '+species.name+' variants (1-3)');
 for(const choice of trait?.choices||[])if(!choice.options.some(o=>o.id===s.options[trait.id]?.[choice.id]))issues.push('Choose '+trait.name+' '+choice.name);
 const adjustmentChoices=trait?.choices?.filter(r=>r.effect==='abilityAdjustment')||[],selected=adjustmentChoices.map(r=>s.options[trait.id]?.[r.id]).filter(Boolean);
 if(new Set(selected).size<selected.length)issues.push('Choose different abilities to increase and decrease');
 return issues;
}
export function customizationEntries(c,species){
 if(!species.customization)return [];
 const state=customizationState(c,species),trait=species.customization.traits.find(t=>t.id===state.trait),variants=species.customization.variants.filter(v=>state.variants.includes(v.id));
 const selected=(trait?.choices||[]).map(g=>g.options.find(o=>o.id===state.options[trait.id]?.[g.id])?.name).filter(Boolean);
 return [...(trait?[{...trait,name:trait.name+(selected.length?' ('+selected.join(', ')+')':'')}]:[]),...variants];
}
export function validateSpeciesCustomizations(c,pack,bad){
 if(c.speciesCustomizations===undefined)return;
 if(!object(c.speciesCustomizations))bad('species customizations');
 for(const [id,state]of Object.entries(c.speciesCustomizations)){
  const species=pack.species.find(s=>s.id===id),data=species?.customization;
  if(!data||!object(state)||Object.keys(state).some(k=>!['replacement','trait','variants','options'].includes(k)))bad('species customization');
  for(const [key,records]of [['replacement',data.replacements],['trait',data.traits]])if(state[key]!==undefined&&state[key]!==null&&!records.some(r=>r.id===state[key]))bad('species customization '+key);
  if(state.variants!==undefined&&(!Array.isArray(state.variants)||state.variants.length>3||new Set(state.variants).size!==state.variants.length||state.variants.some(id=>!data.variants.some(v=>v.id===id))))bad('species variants');
  if(state.options!==undefined){
   if(!object(state.options))bad('species trait options');
   for(const [traitId,values]of Object.entries(state.options)){
    const trait=data.traits.find(t=>t.id===traitId);if(!trait?.choices||!object(values))bad('species trait options');
    for(const [choiceId,value]of Object.entries(values)){const group=trait.choices.find(g=>g.id===choiceId);if(!group||value!==null&&!group.options.some(o=>o.id===value))bad('species trait option');}
   }
  }
 }
}
export function setSpeciesCustomization(c,pack,field,value,{traitId,choiceId}={}){
 const species=pack.species.find(s=>s.id===c.species);if(!species.customization)throw new Error('Species has no customization');
 const states=structuredClone(c.speciesCustomizations||{}),state={...customizationState(c,species),...states[species.id]};states[species.id]=state;
 if(['replacement','trait'].includes(field))state[field]=value||null;
 else if(field==='variants')state.variants=value;
 else if(field==='choice')state.options={...state.options,[traitId]:{...state.options[traitId],[choiceId]:value||null}};
 else throw new Error('Unknown species customization');
 validateSpeciesCustomizations({speciesCustomizations:states},pack,message=>{throw new Error('Invalid '+message);});c.speciesCustomizations=states;
}

export function validateCustomizationData(species,pack,bad){
 const data=species.customization;if(data===undefined)return;
 const ensure=(v,msg)=>{if(!v)bad('Invalid species customization '+msg);},keys=(v,allowed)=>object(v)&&Object.keys(v).every(k=>allowed.includes(k)),slug=v=>typeof v==='string'&&/^[a-z][a-z0-9-]{0,49}$/.test(v),named=v=>object(v)&&typeof v.id==='string'&&typeof v.name==='string'&&v.name.trim()&&v.name.length<=200;
 ensure(keys(data,['replacements','traits','variants']),'fields');
 const distinct=rows=>Array.isArray(rows)&&rows.length>0&&new Set(rows.map(r=>r?.id)).size===rows.length&&rows.every(named);
 ensure(distinct(data.replacements)&&data.replacements.length===2&&data.replacements.every(r=>keys(r,['id','name','bonusFeats','bonusSkills'])&&slug(r.id)&&[0,1].includes(r.bonusFeats)&&[0,1].includes(r.bonusSkills)&&r.bonusFeats+r.bonusSkills===1)&&new Set(data.replacements.map(r=>r.bonusFeats)).size===2,'replacements');
 ensure(distinct(data.traits)&&data.traits.length<=100&&distinct(data.variants)&&data.variants.length>=3&&data.variants.length<=100,'options');
 for(const r of [...data.traits,...data.variants]){
  ensure(keys(r,['id','name','article',...(data.traits.includes(r)?['automation','effects','choices']:[])])&&slug(r.id),'option fields');
  ensure(keys(r.article,['sourceId','blocks'])&&r.article.sourceId===species.sourceId&&Array.isArray(r.article.blocks),'article');let count=0;
  const node=(n,depth=0)=>{ensure(++count<=5000&&depth<=40,'article size');if(typeof n==='string')return;ensure(keys(n,['tag','children',...(n?.tag==='a'?['href','ruleId']:[])])&&WIKI_TAGS.has(n.tag)&&Array.isArray(n.children),'article node');if(n.tag==='a')ensure(wikiURL(n.href)&&(!n.ruleId||pack.rulePages.some(r=>r.id===n.ruleId)),'article link');for(const child of n.children)node(child,depth+1);};r.article.blocks.forEach(n=>node(n));
  if(!data.traits.includes(r))continue;
  ensure(['manual','partial'].includes(r.automation),'automation');
  ensure(keys(r.effects,['speed','multiattackReduction','vision','breatheUnderwater','skillRerolls','take10Skills','naturalArmor','naturalWeapons','startingTrainedSkills','scentRange']),'effects');
  for(const [key,value]of Object.entries(r.effects)){
   if(['speed','multiattackReduction','naturalArmor','scentRange'].includes(key))ensure(Number.isInteger(value)&&value>=(['multiattackReduction','scentRange'].includes(key)?1:0)&&value<=(key==='multiattackReduction'?10:1000),key);
   else if(key==='vision')ensure(['darkvision','low-light'].includes(value),key);
   else if(key==='breatheUnderwater')ensure(typeof value==='boolean',key);
   else if(['startingTrainedSkills','take10Skills'].includes(key))ensure(Array.isArray(value)&&new Set(value).size===value.length&&value.every(id=>pack.skills.some(s=>s.id===id)),key);
   else if(key==='skillRerolls')ensure(Array.isArray(value)&&value.every(v=>keys(v,['skill','keep'])&&pack.skills.some(s=>s.id===v.skill)&&['replace','best'].includes(v.keep)),key);
   else if(key==='naturalWeapons')ensure(Array.isArray(value)&&value.length>0&&new Set(value.map(w=>w?.id)).size===value.length&&value.every(w=>keys(w,['id','name','damage','damageType'])&&named(w)&&slug(w.id)&&w.id.length<=40&&/^(1|[1-9][0-9]?d(2|3|4|6|8|10|12))$/.test(w.damage)&&['Slashing','Piercing','Bludgeoning','Energy'].includes(w.damageType)),key);
  }
  if(r.choices!==undefined){
   ensure(distinct(r.choices),'choices');for(const g of r.choices){
    ensure(keys(g,['id','name','options','effect','amount'])&&slug(g.id)&&distinct(g.options)&&g.options.every(o=>keys(o,['id','name'])),'choice fields');
    if(g.effect!==undefined)ensure(['abilityAdjustment','weaponFamiliarity'].includes(g.effect),'choice effect');
    if(g.effect==='abilityAdjustment')ensure([2,-2].includes(g.amount)&&g.options.length===6&&g.options.every(o=>abilities.includes(o.id)),'ability choice');else ensure(g.amount===undefined,'choice amount');
    if(g.effect==='weaponFamiliarity')ensure(g.options.every(o=>pack.equipment.some(e=>e.id===o.id&&(e.group||'').startsWith('exotic-'))),'weapon choice');
    if(g.options.some(o=>o.id.startsWith('equipment:')))ensure(g.options.every(o=>pack.equipment.some(e=>e.id===o.id)),'equipment choice');
   }
  }
 }
}
