// Application sets let a broader species permission combine with a narrower talent.
export const REROLL_SCOPES={
 always:{label:'',applications:null},
 keenSmell:{label:'Keen Smell',applications:['perception-scent'],detail:'Target within 6 squares, same room or open area'},
 intimidate:{label:'Intimidate',applications:['intimidate']},
 searchYourFeelingsOrSenseForce:{label:'Search Your Feelings / Sense Force',applications:['search-your-feelings','sense-force','sense-force-dark-side']},
 sensors:{label:'Sensors',applications:['sensors']},
 haggle:{label:'Haggle',applications:['haggle']},
 'jury-rig':{label:'Jury-Rig',applications:['jury-rig']},
 'oppose-sense-force':{label:'Oppose Sense Force',applications:['oppose-sense-force']},
 'sense-dark-side':{label:'Sense Dark Side users',applications:['sense-force-dark-side']},
 'improve-access':{label:'Improve Access',applications:['improve-access']},
 'intimidate-undisguised':{label:'Intimidate, undisguised',applications:['intimidate'],detail:'Only when not Disguised'},
 'locate-individual':{label:'Locate Individual',applications:['locate-individual']},
};
export function skillRerollSources(s,species,d){
 if(s.id!==s.checkSource)return [];
 const speciesRows=(species.skillRerolls||[]).filter(r=>r.skill===s.id).map(r=>({...r,kind:'species',name:species.name,id:species.id+'|'+r.skill+'|'+(r.when||'always'),keep:r.keep==='best'||d.skillRerollBest?.includes(s.id)?'best':'new',when:r.when||'always'}));
 const talents=(d.skillRerolls||[]).filter(r=>r.skill===s.id).map(r=>({...r,kind:'talent',talentId:r.id,id:r.id+'|'+r.skill+'|'+r.when}));
 return [...new Map([...speciesRows,...talents].filter(r=>Object.hasOwn(REROLL_SCOPES,r.when)).map(r=>[r.id,{...r,...REROLL_SCOPES[r.when]}])).values()];
}
export function compatibleReroll(ticket,source){return !ticket.applications||!source.applications||ticket.applications.some(a=>source.applications.includes(a));}
export function useSkillReroll(ticket,source,roll){
 if(!ticket.allowed.has(source.id)||ticket.used.has(source.id)||!compatibleReroll(ticket,source))throw new Error('Reroll unavailable');
 const before=ticket.roll.value,kept=source.keep==='best'?Math.max(before,roll.value):roll.value;
 ticket.used.add(source.id);if(kept===roll.value)ticket.roll=roll;
 if(source.applications)ticket.applications=ticket.applications?ticket.applications.filter(a=>source.applications.includes(a)):source.applications.slice();
 return {before,kept};
}
