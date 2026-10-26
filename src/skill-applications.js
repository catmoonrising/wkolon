import {modifierIncrease} from './modifiers.js';
import {escapeHTML as escape} from './wiki-content.js';

const applications={
 'perception-concealed-target':{skill:'skill:perception',label:'Against target (you have Concealment)',scope:null},
 'astrogate-starship':{skill:'skill:use-computer',label:'Astrogate (Starship)',scope:'astrogate'},
 'deceptive-appearance':{skill:'skill:deception',label:'Deceptive Appearance',scope:'deceptive-appearance'},
 'deceptive-appearance-rushed':{skill:'skill:deception',label:'Deceptive Appearance (rushed)',scope:'deceptive-appearance',base:'deceptive-appearance',rushed:true},
 'handle-explosives':{skill:'skill:mechanics',label:'Handle Explosives',scope:'handle-explosives'}
};
export function validateSkillApplications(c,bad){
 if(c.skillApplications===undefined)return;
 const rows=c.skillApplications;
 if(!rows||typeof rows!=='object'||Array.isArray(rows)||Object.keys(rows).length>25||Object.entries(rows).some(([skill,id])=>typeof id!=='string'||applications[id]?.skill!==skill))bad('skill applications');
}
export function skillApplicationState(c,skill,source,effects,baseRows){
 const rows=effects.filter(e=>e.target==='skillApplicationBonus'&&e.skill===skill),choices=Object.entries(applications).filter(([id,r])=>r.skill===skill&&rows.some(e=>e.application===(r.base||id))).map(([id,r])=>({id,label:r.label}));
 const selected=choices.some(r=>r.id===c.skillApplications?.[skill])?c.skillApplications[skill]:'general',rule=applications[selected];
 const extra=rule&&source===skill?rows.filter(e=>e.application===(rule.base||selected)).flatMap(e=>[{amount:e.amount,type:e.type,...(e.circumstance?{circumstance:e.circumstance}:{})},...(rule.rushed?[{amount:e.rushPenalty,type:'untyped'}]:[])]):[];
 return {application:selected,applicationScope:rule?.scope||null,applicationLabel:rule?.label||'',applicationOptions:choices,applicationBonus:modifierIncrease(baseRows,extra)};
}
export function skillApplicationControl(s){
 if(!s.applicationOptions.length)return '';
 return `<select data-skill-application="${escape(s.id)}" aria-label="${escape(s.name)} use"><option value="general" ${s.application==='general'?'selected':''}>General</option>${s.applicationOptions.map(r=>`<option value="${r.id}" ${r.id===s.application?'selected':''}>${escape(r.label)}</option>`).join('')}</select> `;
}
