import {skillRerollSources,compatibleReroll,useSkillReroll,rerollUsesAvailable,spendRerollUse} from './skill-rerolls.js';
import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

export function carryingLimits(str,size,weight,rules){
 const factor=rules.sizeMultipliers[size]??1,base=str*str*factor;
 const heavyAt=base*rules.heavyFraction,lift=base*rules.liftFraction,strain=base*rules.strainFraction;
 return {weight,heavyAt,lift,strain,heavy:weight>=heavyAt,overloaded:weight>lift,tooHeavy:weight>strain};
}
export function createSpeciesChecks({current,derived,log,used=()=>{}},roller=evalExpr){
 const checks=new Map(),key=id=>current().id+':'+id;
 const valid=(s,p)=>p&&p.source===s.checkSource&&p.bonus===(s.checkTotal??s.total)&&p.application===(s.application||'general');
 const invalidate=()=>{let cleared=false;for(const k of checks.keys())if(k.startsWith(current().id+':')){checks.delete(k);cleared=true;}return cleared;};
 return {
  invalidate,
  controls(s,species,incapacitated){
   const native=s.id===s.checkSource,disabled=incapacitated||!s.available,p=checks.get(key(s.id)),sources=skillRerollSources(s,species,derived());
   return sources.map(r=>{const suffix=r.label?(sources.filter(s=>s.label===r.label).length>1?r.name+', '+r.label:r.label):r.kind==='talent'&&sources.length>1?r.name:'',off=disabled||!rerollUsesAvailable(r)||!valid(s,p)||!p.allowed.has(r.id)||p.used.has(r.id)||!compatibleReroll(p,r),label=r.daily?r.name+' '+Math.max(0,r.daily-r.spent)+'/'+r.daily:'Reroll'+(suffix?' ('+suffix+')':'');return `<button type="button" ${r.kind==='species'?`data-species-reroll="${s.id}"`:`data-talent-reroll="${r.talentId}" data-reroll-skill="${s.id}"`} data-reroll-source="${escape(r.id)}" title="${escape(r.name+(r.detail?'; '+r.detail:'')+'; keep '+(r.keep==='best'?'the better result':'the new result'))}" ${off?'disabled':''} aria-label="Reroll ${escape(s.name+' using '+r.name+(r.label?' ('+r.label+')':''))}">${escape(label)}</button>`;}).join('')+`${species.take10Skills?.includes(s.id)&&native?`<button type="button" data-species-take10="${s.id}" ${disabled?'disabled':''} aria-label="Take 10 on ${escape(s.name)}">Take 10</button>`:''}`;
  },
  click(el,species){
   const id=el.dataset.skillRoll||el.dataset.speciesReroll||el.dataset.speciesTake10||el.dataset.rerollSkill;
   if(!id)return false;
   const s=derived().skills.find(s=>s.id===id);
   if(!s?.available||derived().incapacitated)return true;
   const label=s.applicationLabel?s.name+' ('+s.applicationLabel+')':s.name;
   const bonus=s.checkTotal??s.total,expression='1d20'+(bonus>=0?'+':'')+bonus,sources=skillRerollSources(s,species,derived());
   if(el.dataset.skillRoll){const roll=roller(expression);used(s);invalidate();checks.set(key(id),{source:s.checkSource,bonus,application:s.application||'general',roll,allowed:new Set(sources.map(r=>r.id)),used:new Set(),applications:s.applicationScope?[s.applicationScope]:null});log('roll',`${label}: ${expression} = ${roll.value}`,`${escape(label)}: ${roll.display} = ${totalHtml(roll)}`);return true;}
   const p=checks.get(key(id)),source=sources.find(r=>el.dataset.rerollSource?r.id===el.dataset.rerollSource:el.dataset.talentReroll?r.talentId===el.dataset.talentReroll:r.kind==='species');
   if((el.dataset.speciesReroll||el.dataset.talentReroll)&&source&&rerollUsesAvailable(source)&&valid(s,p)&&p.allowed.has(source.id)&&!p.used.has(source.id)&&compatibleReroll(p,source)){
    const roll=roller(expression),{before,kept}=useSkillReroll(p,source,roll),name=source.name+(source.label?' ('+source.label+')':'');
    spendRerollUse(current(),source);
    log('roll',`${label}: ${before} → ${roll.value}; kept ${kept}; ${name}`,`${escape(label)}: ${before} → ${roll.display} = ${totalHtml(roll)}; kept <b>${kept}</b>; ${escape(name)}`);return true;
   }
   if(el.dataset.speciesTake10&&s.checkSource===id&&species.take10Skills?.includes(id)){used(s);invalidate();log('roll',`${label}: 10 ${bonus>=0?'+':'−'} ${Math.abs(bonus)} = ${10+bonus}`);return true;}
   return true;
  }
 };
}
