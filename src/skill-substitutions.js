const scopes={
 perceptionApplications:{label:'Avoid Surprise, Notice Targets, Sense Deception, Sense Influence',applications:['avoid-surprise','notice-targets','sense-deception','sense-influence']},
 senseDeceptionInfluence:{label:'Sense Deception, Sense Influence',applications:['sense-deception','sense-influence']},
 computerNetwork:{label:'computer network'},
};
export const substitutionScope=when=>scopes[when]?.label||'';

// Saved choices identify the replacement skill, not the talent providing it.
// Multiple permissions for that skill must share one option without losing scope.
export function skillSubstitutionSources(skill,nativeById,effects){
 const groups=new Map();
 for(const e of effects.filter(e=>e.target==='skillSubstitution'&&e.skill===skill.id&&nativeById.get(e.replacement)?.available)){
  if(!groups.has(e.replacement))groups.set(e.replacement,[]);
  groups.get(e.replacement).push(e);
 }
 return [{id:skill.id,name:skill.name,total:skill.total,ability:skill.ability,available:skill.available},...[...groups].map(([id,permissions])=>{
  const r=nativeById.get(id),carry=permissions.filter(e=>e.carryRerolls===true);
  const when=permissions.some(e=>!e.when)?undefined:permissions.some(e=>e.when==='perceptionApplications')?'perceptionApplications':permissions[0].when;
  const rerollApplications=carry.length&&carry.every(e=>scopes[e.when]?.applications)?[...new Set(carry.flatMap(e=>scopes[e.when].applications))]:null;
  return {id,name:r.name,total:r.total,ability:r.ability,available:r.available,carryRerolls:carry.length>0,rerollApplications,...(when?{when}:{})};
 })];
}
