const object=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);

export function resolveSpecies(c,pack){
 const base=pack.species.find(r=>r.id===c.species);
 if(!base.creationChoices?.length)return base;
 const species={...base,abilityAdjustments:{...base.abilityAdjustments},languages:[...base.languages],conditionalFocuses:[...(base.conditionalFocuses||[])]};
 for(const group of base.creationChoices){
  const selected=group.options.find(o=>o.id===c.speciesChoices?.[base.id]?.[group.id]);
  if(!selected)continue;
  if(group.kind==='ability')for(const [ability,amount]of Object.entries(selected.adjustments))species.abilityAdjustments[ability]=(species.abilityAdjustments[ability]||0)+amount;
  if(group.kind==='language'&&!species.languages.includes(selected.language))species.languages.push(selected.language);
  if(group.kind==='skillFocus'&&!species.conditionalFocuses.includes(selected.skillId))species.conditionalFocuses.push(selected.skillId);
 }
 return species;
}

export function speciesChoiceDetails(c,pack,ctx){
 const species=pack.species.find(r=>r.id===c.species);
 return (species.creationChoices||[]).map(group=>{
  const selected=c.speciesChoices?.[species.id]?.[group.id]??null;
  const options=group.options.map(option=>({...option,available:group.kind!=='skillFocus'||ctx.trained.has(option.skillId)}));
  const active=group.kind!=='skillFocus'||options.some(option=>option.available);
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
