import {applySpeciesCustomization} from './species-customization.js';
import {applyInstalledDroidSystems} from './droid-installation.js';
import {eligible,indexPack} from './rules.js';
const languageValue=v=>typeof v==='string'&&v.trim().length>0&&v.length<=100&&!/[\r\n\x00]/.test(v);
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function duplicateGrant(species,c,group,option){
 if(!['trainedSkill','startingFeat'].includes(group.kind))return false;
 const field=group.kind==='trainedSkill'?'skillId':'featId';
 if((group.kind==='trainedSkill'?[...(species.startingTrainedSkills||[]),...(species.startingTrainingFeats||[])]:[...(species.startingFeats||[]),...(species.conditionalStartingFeats||[])]).includes(option[field]))return true;
 return (species.creationChoices||[]).some(other=>other!==group&&other.kind===group.kind&&other.options.some(o=>o.id===c.speciesChoices?.[species.id]?.[other.id]&&o[field]===option[field]));
}

export function resolveSpecies(c,pack){
 const base=applySpeciesCustomization(pack.species.find(r=>r.id===c.species),c);
 if(!base.creationChoices?.length)return applyInstalledDroidSystems(base,c,pack);
 const species={...base,abilityAdjustments:{...base.abilityAdjustments},languages:[...base.languages],understoodLanguages:[...(base.understoodLanguages||[])],conditionalFocuses:[...(base.conditionalFocuses||[])],startingTrainedSkills:[...(base.startingTrainedSkills||[])],conditionalStartingFeats:[...(base.conditionalStartingFeats||[])]};
 for(const group of base.creationChoices){
  const value=c.speciesChoices?.[base.id]?.[group.id]??group.defaultOption;
  const selected=group.options.find(o=>o.id===value)||(['understoodLanguage','spokenLanguage'].includes(group.kind)&&languageValue(value)?{language:value.trim()}:null);
  if(!selected||duplicateGrant(base,c,group,selected))continue;
  if(group.kind==='droidDegree'){species.droidDegree=selected.degree;species.droidTalentTrees=[...selected.talentTrees];}
  if(group.kind==='size'){species.size=selected.size;species.speed=selected.speed;}
  if(['ability','size','droidDegree'].includes(group.kind))for(const [ability,amount]of Object.entries(selected.adjustments))species.abilityAdjustments[ability]=(species.abilityAdjustments[ability]||0)+amount;
  if(group.kind==='understoodLanguage'&&!species.understoodLanguages.includes(selected.language))species.understoodLanguages.push(selected.language);
  if(['language','spokenLanguage'].includes(group.kind)&&!species.languages.includes(selected.language))species.languages.push(selected.language);
  if(group.kind==='skillFocus'&&!species.conditionalFocuses.includes(selected.skillId))species.conditionalFocuses.push(selected.skillId);
  if(group.kind==='weaponFocus'){species.conditionalWeaponFocuses??=[];species.conditionalWeaponFocuses.push(selected);}
  if(group.kind==='trainedSkill'&&!species.startingTrainedSkills.includes(selected.skillId))species.startingTrainedSkills.push(selected.skillId);
  if(group.kind==='startingFeat'&&!species.conditionalStartingFeats.includes(selected.featId))species.conditionalStartingFeats.push(selected.featId);
 }
 return applyInstalledDroidSystems(species,c,pack);
}

export function speciesChoiceDetails(c,pack,ctx,firstLevel=ctx){
 const species=pack.species.find(r=>r.id===c.species);
 if(!species.creationChoices?.length)return [];
 const ix=indexPack(pack);
 return (species.creationChoices||[]).map(group=>{
  const selected=c.speciesChoices?.[species.id]?.[group.id]??group.defaultOption??null;
  const values=[...group.options];if(['understoodLanguage','spokenLanguage'].includes(group.kind)&&languageValue(selected)&&!values.some(o=>o.id===selected))values.push({id:selected,name:selected,language:selected});
  const options=values.map(option=>{
   const duplicate=duplicateGrant(species,c,group,option);
   const focusContext={...ctx,feats:ctx.feats.filter(f=>f.id!=='feat:weapon-focus'||f.choice!==option.choice)};
   const available=!duplicate&&(group.kind==='weaponFocus'?(!option.requiresFeat||ctx.feats.some(f=>f.id===option.requiresFeat))&&eligible(ix.feats.get('feat:weapon-focus'),{id:'feat:weapon-focus',choice:option.choice},focusContext,ix,'feats'):group.kind==='startingFeat'?firstLevel.characterLevel===1&&eligible(ix.feats.get(option.featId),{id:option.featId},{...firstLevel,feats:firstLevel.feats.filter(f=>f.id!==option.featId)},ix,'feats'):group.kind!=='skillFocus'||ctx.trained.has(option.skillId));
   return {...option,available};
  });
  const active=!['skillFocus','weaponFocus','startingFeat'].includes(group.kind)||options.some(option=>option.available);
  return {...group,options,selected,active,issue:active&&!options.some(o=>o.id===selected&&o.available)?'Choose '+species.name+' '+group.name:null};
 });
}

export function chooseSpeciesOption(c,pack,groupId,optionId){
 const species=pack.species.find(r=>r.id===c.species),group=species.creationChoices?.find(g=>g.id===groupId);
 if(['understoodLanguage','spokenLanguage'].includes(group?.kind)&&typeof optionId==='string')optionId=optionId.trim()||null;
 if(!group||optionId!==null&&!group.options.some(o=>o.id===optionId)&&!(['understoodLanguage','spokenLanguage'].includes(group.kind)&&languageValue(optionId)))throw new Error('Unknown species choice');
 if(['understoodLanguage','spokenLanguage'].includes(group.kind)&&optionId!==null)optionId=group.options.find(o=>o.id===optionId||o.language.toLocaleLowerCase()===optionId.trim().toLocaleLowerCase())?.id||optionId.trim();
 c.speciesChoices||={};c.speciesChoices[species.id]||={};c.speciesChoices[species.id][groupId]=optionId;
}

export function validateSpeciesChoices(c,pack,bad){
 if(c.speciesChoices===undefined)return;
 if(!object(c.speciesChoices))bad('species choices');
 for(const [id,choices]of Object.entries(c.speciesChoices)){
  const species=pack.species.find(r=>r.id===id);
  if(!species||!object(choices))bad('species choices');
  for(const [key,value]of Object.entries(choices)){
   const group=species.creationChoices?.find(g=>g.id===key);
   if(!group||value!==null&&!group.options.some(o=>o.id===value)&&!(['understoodLanguage','spokenLanguage'].includes(group.kind)&&languageValue(value)))bad('species choice');
  }
 }
}
