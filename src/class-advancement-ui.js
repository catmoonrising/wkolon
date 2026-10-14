import {classEntry} from './class-advancement.js';
import {escapeHTML as escape} from './wiki-content.js';

export const classKindLabel={forceTechnique:'Force Technique',forceSecret:'Force Secret',medicalSecret:'Medical Secret'};
export function classOptions(pack,ctx,ix,selected,l={}){
 return ['heroic','prestige'].map(kind=>`<optgroup label="${kind==='heroic'?'Heroic':'Prestige'}">${pack.classes.filter(r=>(r.classType||'heroic')===kind).map(r=>{const x=classEntry(r,ctx,ix,l,{ignoreDeclarations:true}),disabled=!x.available&&r.id!==selected;return `<option value="${r.id}" ${r.id===selected?'selected':''} ${disabled?`disabled title="${escape(x.reason)}"`:''}>${escape(r.name)}</option>`;}).join('')}</optgroup>`).join('');
}
export function classDeclarations(cls,l,key){
 return cls.entrySpecials?.length?`<div class="class-entry"><div class="actions">${cls.entrySpecials.map(s=>`<label class="checkbox"><input type="checkbox" data-class-entry="${key}" data-entry-id="${s.id}" ${l.entryDeclarations?.[s.id]?'checked':''}>${escape(s.label)}</label>`).join('')}</div></div>`:'';
}
export function classChoiceControls(pack,row,l,level,selectChoice){
 return (row.choiceSlots||[]).map((slot,i)=>selectChoice(level,'classChoice',i,{...slot,label:classKindLabel[slot.kind]},l.classChoices?.[i])).join('');
}
