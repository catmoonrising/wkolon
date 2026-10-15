import {choiceName} from './feature-choices.js';
export function featureEntries(c,d,pack){
 const byId=new Map(['feats','talents','classes','classChoices'].flatMap(key=>pack[key].map(r=>[r.id,r])));
 const named=s=>{const r=byId.get(s.id);return r.name+(s.choice?' ('+choiceName(s.choice,pack)+')':'');};
 const entries=d.ctx.features.map(({type,selection:s})=>({s,r:byId.get(s.id),module:type,prefix:type==='feats'?'(F)':'(T)',label:named(s),inactive:d.ctx.inactiveTalents.has(s.id)}));
 for(const f of d.ctx.classFeatures)entries.push({s:{level:f.level,automatic:true},r:byId.get(f.classId),module:'class-features',prefix:'',label:f.name,inactive:d.ctx.inactiveClasses.has(f.classId)});
 for(const s of d.ctx.classChoices){const r=byId.get(s.id),module={forceTechnique:'force-techniques',forceSecret:'force-secrets',medicalSecret:'medical-secrets'}[s.kind];entries.push({s,r,module,prefix:'',label:named(s),inactive:d.ctx.inactiveClasses.has(s.classId)});}
 return entries.sort((a,b)=>a.s.level-b.s.level);
}
