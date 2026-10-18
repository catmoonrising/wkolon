export function validateSpeciesProfileData(s,pack,bad){
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),refs=ids=>Array.isArray(ids)&&new Set(ids).size===ids.length&&ids.every(id=>pack.equipment.some(r=>r.id===id));
 for(const key of ['usesDroidSystems','cybernetic','repairOnly','maintenance'])if(s[key]!==undefined&&typeof s[key]!=='boolean')bad('Species '+key);
 if(s.droidDegree!==undefined&&(!s.isDroid||!Number.isInteger(s.droidDegree)||s.droidDegree<1||s.droidDegree>5))bad('Fixed Droid degree');
 if(s.droidTalentTrees!==undefined&&(!s.isDroid||!Array.isArray(s.droidTalentTrees)||!s.droidTalentTrees.every(id=>pack.talents.some(t=>t.tree===id))))bad('Fixed Droid talent trees');
 if(s.droidBody!==undefined){
  const b=s.droidBody;
  if(!obj(b)||!Object.keys(b).every(k=>['processor','speed','bonusSystems','bonusSystemCount','allowedSystems','sourceIds'].includes(k))||!s.isDroid&&!s.usesDroidSystems||!['species','manual'].includes(b.speed))bad('Species Droid body');
  if(b.processor!==undefined&&(b.processor!=='equipment:basic-processor'||!pack.equipment.some(r=>r.id===b.processor)))bad('Species body processor');
  if(b.bonusSystems!==undefined&&(!refs(b.bonusSystems)||b.bonusSystems.length<2||b.bonusSystemCount!==2))bad('Species bonus systems');
  if(b.bonusSystemCount!==undefined&&!b.bonusSystems)bad('Species bonus system count');
  if(b.allowedSystems!==undefined&&(!refs(b.allowedSystems)||!b.allowedSystems.length))bad('Species system restrictions');
  if(b.sourceIds!==undefined&&(!Array.isArray(b.sourceIds)||!b.sourceIds.every(id=>pack.sources.some(r=>r.id===id))))bad('Species body sources');
  if(b.speed==='manual'&&s.speed!==null)bad('Unspecified shell speed');
 }
 if(s.bonusForceTraining!==undefined){
  const b=s.bonusForceTraining;
  if(!obj(b)||Object.keys(b).sort().join(',')!=='forbiddenDescriptors,fraction,requiredDescriptor'||b.requiredDescriptor!=='dark-side'||b.fraction!==.5||!Array.isArray(b.forbiddenDescriptors)||b.forbiddenDescriptors.join(',')!=='light-side')bad('Species Force Training');
 }
 if(s.gmQualities!==undefined&&(!obj(s.gmQualities)||Object.keys(s.gmQualities).sort().join(',')!=='maximum,minimum'||s.gmQualities.minimum!==1||s.gmQualities.maximum!==3))bad('Species GM qualities');
}
export const speciesQualities=(c,s)=>c.speciesQualities?.[s.id]??[{name:'',text:''}];
export function validateSpeciesProfileCharacter(c,pack,bad){
 if(c.speciesQualities===undefined)return;
 if(!c.speciesQualities||typeof c.speciesQualities!=='object'||Array.isArray(c.speciesQualities)||Object.keys(c.speciesQualities).length>pack.species.length)bad('Species qualities');
 for(const [id,rows]of Object.entries(c.speciesQualities)){
  const s=pack.species.find(s=>s.id===id);
  if(!s?.gmQualities||!Array.isArray(rows)||rows.length>s.gmQualities.maximum)bad('Species qualities');
  for(const r of rows)if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).sort().join(',')!=='name,text'||typeof r.name!=='string'||r.name.length>100||/[\r\n\x00]/.test(r.name)||typeof r.text!=='string'||r.text.length>8000||/\x00/.test(r.text))bad('Species quality');
 }
}
export function changeSpeciesQuality(c,pack,index,key,value){
 const s=pack.species.find(s=>s.id===c.species);if(!s.gmQualities||!['name','text'].includes(key)||!Number.isInteger(index)||index<0||index>=s.gmQualities.maximum)throw new Error('Species quality unavailable');
 const rows=structuredClone(speciesQualities(c,s));if(!rows[index])throw new Error('Species quality unavailable');rows[index][key]=value;
 const next={...c,speciesQualities:{...c.speciesQualities,[s.id]:rows}};validateSpeciesProfileCharacter(next,pack,reason=>{throw new Error('Invalid '+reason);});c.speciesQualities=next.speciesQualities;
}
export function speciesPowerIssue(s,ctx,pack,candidate=null){
 const rule=s.bonusForceTraining;if(!rule||!ctx.feats.some(f=>f.id==='feat:force-training'&&f.grantedBy===s.id))return '';
 const slots=Math.max(1,1+Math.floor((ctx.scores.wis-10)/2)),minimum=Math.floor(slots*rule.fraction),powers=[...ctx.forcePowers.map(p=>pack.forcePowers.find(r=>r.id===p.powerId)),...(candidate?[candidate]:[])];
 const permitted=powers.filter(p=>!p.descriptors.some(d=>rule.forbiddenDescriptors.includes(d))).length,required=powers.filter(p=>p.descriptors.includes(rule.requiredDescriptor)).length;
 const remaining=candidate?Math.max(0,ctx.powerSlots-powers.length):0;
 if(permitted+remaining<slots)return `Dark-Infused requires ${slots} non-Light Side powers`;
 if(required+remaining<minimum)return `Dark-Infused requires ${minimum} Dark Side power${minimum===1?'':'s'}`;
 return '';
}
export function eligibleSpeciesPowers(s,ctx,pack){
 const rule=s.bonusForceTraining;if(!rule||!ctx.feats.some(f=>f.id==='feat:force-training'&&f.grantedBy===s.id))return ctx.forcePowers;
 const racial=Math.max(1,1+Math.floor((ctx.scores.wis-10)/2)),ordinary=Math.max(0,ctx.powerSlots-racial),neutralMaximum=ctx.powerSlots-Math.floor(racial*rule.fraction);let forbidden=0,neutral=0;
 return ctx.forcePowers.filter(copy=>{const p=pack.forcePowers.find(p=>p.id===copy.powerId),blocked=p.descriptors.some(d=>rule.forbiddenDescriptors.includes(d)),notRequired=!p.descriptors.includes(rule.requiredDescriptor);
  if(blocked&&forbidden>=ordinary||notRequired&&neutral>=neutralMaximum)return false;
  if(blocked)forbidden++;if(notRequired)neutral++;return true;
 });
}
