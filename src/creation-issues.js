// UI destinations are derived from the same level rows that render the builder.
// Issue strings stay unchanged for saved builds, validation and rule reporting.
export function creationIssueTarget(c,d,pack,index){
 const issue=d.issues[index];if(typeof issue!=='string')return null;
 const match=/^Level (\d+): (.*)$/.exec(issue);
 if(match){
  const level=Number(match[1])-1,row=d.rows[level],l=c.levels[level],text=match[2];
  if(!row||!l)return null;
  const tree=(kind,slot=0)=>({tab:'levels',tree:`${kind}:${level}:${slot}`});
  if(row.valid===false||/choose a class|class entry/i.test(text))return tree('class');
  if(/starting trained skills|starting class skill|already trained by/.test(text))return {tab:'skills'};
  if(/Intelligence increases|additional trained skill/.test(text))return tree('training');
  if(/^(increase two different abilities|ability increases are not available|Droids have no Constitution score)$/.test(text))return {tab:'levels',selector:`[data-increase][data-level="${level}"]`,level};
  if(/Force powers/.test(text))return tree('powers');
  if(/Starship Maneuvers/.test(text))return tree('maneuvers');
  if(/multiclass starting feat/.test(text))return tree('startingFeat');
  const candidates=(row.slots||[]).map((slot,j)=>({label:slot.label,slot:j})).filter(slot=>text===`choose ${slot.label}`||text.endsWith(` is not eligible for ${slot.label}`));
  if(candidates.length){
   const occurrence=d.issues.slice(0,index).filter(s=>s===issue).length;
   return tree('feat',candidates[Math.min(occurrence,candidates.length-1)].slot);
  }
  for(const [j,slot]of (row.choiceSlots||[]).entries())if(text==='choose '+slot.kind.replace(/([A-Z])/g,' $1'))return tree('classChoice',j);
  for(const [kind,selection,slot]of [
   ...l.feats.map((s,j)=>['feat',s,j]),['talent',l.talent,0],['startingFeat',l.startingFeat,0],
   ...(l.classChoices||[]).map((s,j)=>['classChoice',s,j]),
  ]){
   const list=kind==='talent'?pack.talents:kind==='classChoice'?pack.classChoices:pack.feats;
   const r=selection&&list.find(r=>r.id===selection.id);
   if(r&&(text===`confirm prerequisites for ${r.name}`||text.startsWith(r.name+' is not eligible')))return tree(kind,slot);
  }
  if(/talent|Tradition/.test(text))return tree('talent');
  if(/HP|hit point/i.test(text))return {tab:'levels',selector:`[data-field="hpRoll"][data-level="${level}"]`,level};
  return {tab:'levels',selector:`[data-plan-level="${level}"]`,level};
 }
 if(/abilit|score is below|package|Generation|Point-buy/i.test(issue))return {tab:'abilities'};
 if(/^Choose (a Destiny|a Background|\d+ Background class skills?)/.test(issue))return {tab:'character'};
 if(d.droidSystems?.issues?.includes(issue))return {tab:'equipment'};
 if(/armor|installed|shell speed|locomotion|appendage|system|equipment| fits .* creatures$| requires a Droid body$/i.test(issue))return {tab:'equipment'};
 if(/Use the Force training/.test(issue))return {tab:'skills'};
 return {tab:'species'};
}
