import {eligible,indexPack} from './rules.js';
const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function duplicateGrant(species,c,group,option){
 if(!['trainedSkill','startingFeat'].includes(group.kind))return false;
 const field=group.kind==='trainedSkill'?'skillId':'featId';
 if((group.kind==='trainedSkill'?[...(species.startingTrainedSkills||[]),...(species.startingTrainingFeats||[])]:[...(species.startingFeats||[]),...(species.conditionalStartingFeats||[])]).includes(option[field]))return true;
 return (species.creationChoices||[]).some(other=>other!==group&&other.kind===group.kind&&other.options.some(o=>o.id===c.speciesChoices?.[species.id]?.[other.id]&&o[field]===option[field]));
}

export function resolveSpecies(c,pack){
 const base=pack.species.find(r=>r.id===c.species);
 if(!base.creationChoices?.length)return base;
 const species={...base,abilityAdjustments:{...base.abilityAdjustments},languages:[...base.languages],conditionalFocuses:[...(base.conditionalFocuses||[])],startingTrainedSkills:[...(base.startingTrainedSkills||[])],conditionalStartingFeats:[...(base.conditionalStartingFeats||[])]};
 for(const group of base.creationChoices){
  const selected=group.options.find(o=>o.id===c.speciesChoices?.[base.id]?.[group.id]);
  if(!selected||duplicateGrant(base,c,group,selected))continue;
  if(group.kind==='ability')for(const [ability,amount]of Object.entries(selected.adjustments))species.abilityAdjustments[ability]=(species.abilityAdjustments[ability]||0)+amount;
  if(group.kind==='language'&&!species.languages.includes(selected.language))species.languages.push(selected.language);
  if(group.kind==='skillFocus'&&!species.conditionalFocuses.includes(selected.skillId))species.conditionalFocuses.push(selected.skillId);
  if(group.kind==='trainedSkill'&&!species.startingTrainedSkills.includes(selected.skillId))species.startingTrainedSkills.push(selected.skillId);
  if(group.kind==='startingFeat'&&!species.conditionalStartingFeats.includes(selected.featId))species.conditionalStartingFeats.push(selected.featId);
 }
 return species;
}

export function speciesChoiceDetails(c,pack,ctx,firstLevel=ctx){
 const species=pack.species.find(r=>r.id===c.species);
 if(!species.creationChoices?.length)return [];
 const ix=indexPack(pack);
 return (species.creationChoices||[]).map(group=>{
  const selected=c.speciesChoices?.[species.id]?.[group.id]??null;
  const options=group.options.map(option=>{
   const duplicate=duplicateGrant(species,c,group,option);
   const available=!duplicate&&(group.kind==='startingFeat'?firstLevel.characterLevel===1&&eligible(ix.feats.get(option.featId),{id:option.featId},{...firstLevel,feats:firstLevel.feats.filter(f=>f.id!==option.featId)},ix,'feats'):group.kind!=='skillFocus'||ctx.trained.has(option.skillId));
   return {...option,available};
  });
  const active=!['skillFocus','startingFeat'].includes(group.kind)||options.some(option=>option.available);
  return {...group,options,selected,active,issue:active&&!options.some(o=>o.id===selected&&o.available)?'Choose '+species.name+' '+group.name:null};
 });
}

export function chooseSpeciesOption(c,pack,groupId,optionId){
 const species=pack.species.find(r=>r.id===c.species),group=species.creationChoices?.find(g=>g.id===groupId);
 if(!group||optionId!==null&&!group.options.some(o=>o.id===optionId))throw new Error('Unknown species choice');
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
   if(!group||value!==null&&!group.options.some(o=>o.id===value))bad('species choice');
  }
 }
}
