import {automationBadge} from './feature-status.js';
import {articleText,escapeHTML as escape,renderArticle} from './wiki-content.js';

// Excerpts reuse the imported document nodes. They never generate rule summaries
// or change mechanical sources. The complete pinned article remains available.
export function optionArticle(pack,name){
 const title=name.startsWith('Knowledge (')?'Knowledge':name;
 const entry=pack.catalog.records.find(r=>r.name===title&&['class','prestigeClass','skill'].includes(r.kind));
 const page=entry&&pack.rulePages.find(r=>r.id===entry.ruleId);
 if(!page?.article)throw new Error('Missing creation article: '+title);
 return page;
}
export function optionPreview(page,kind){
 const blocks=page.article.blocks;
 if(kind==='class'){
  const intro=blocks.find((n,i)=>i>0&&n?.tag==='p');
  const start=blocks.findIndex(n=>n?.tag==='h3'&&articleText({blocks:[n]})==='Class Features');
  if(start<0)throw new Error('Missing Class Features: '+page.name);
  return {preview:{sourceId:page.sourceId,blocks:[...(intro?[intro]:[]),...blocks.slice(start)]}};
 }
 const split=blocks.findIndex(n=>/^h[2-5]$/.test(n?.tag));
 return {preview:{sourceId:page.sourceId,blocks:split<0?blocks:blocks.slice(0,split)},
  applications:split<0?null:{sourceId:page.sourceId,blocks:blocks.slice(split+1)},
  applicationHeading:split<0?'':articleText({blocks:[blocks[split]]})};
}

export function createCreationOptions(pack){
 const states=new Map(),configs=new Map();
 const state=key=>{if(!states.has(key))states.set(key,{query:'',expanded:new Set(),applications:new Set()});return states.get(key);};
 const rootFor=key=>[...document.querySelectorAll('[data-options-key]')].find(el=>el.dataset.optionsKey===key);
 const link=page=>`<span class="option-name">${escape(page.name)}</span>`;
 const fold=(id,key,name)=>`<button type="button" class="option-fold" data-option-toggle="${id}" aria-expanded="${state(key).expanded.has(id)}" aria-label="${state(key).expanded.has(id)?'Fold':'Unfold'} ${escape(name)}">${state(key).expanded.has(id)?'▼':'▶'}</button>`;
 function preview(page,kind,id,key){
  const s=state(key);
  return `<div class="option-preview" data-option-preview="${id}" ${s.expanded.has(id)?'':'hidden'}>${renderArticle(page.article)}</div>`;
 }
 function results(key){
  const config=configs.get(key),s=state(key),query=s.query.trim().toLocaleLowerCase();
  const matches=page=>(page.name+' '+articleText(page.article)).toLocaleLowerCase().includes(query);
  if(config.kind==='classes'){
   const c=config.character,forbidden=new Set(pack.species.find(r=>r.id===c.species).forbiddenClasses||[]);
   return `<div class="class-options">${pack.classes.filter(r=>r.classType!=='prestige').filter(r=>matches(optionArticle(pack,r.name))).map(r=>{
    const page=optionArticle(pack,r.name),selected=!c.levels[0].pendingClass&&c.levels[0].classId===r.id,disabled=forbidden.has(r.id);
    return `<article class="creation-option ${selected?'selected':''} ${disabled?'unavailable':''}" data-class-option="${r.id}"><div class="option-head">${fold(r.id,key,r.name)}<button type="button" data-select-class="${r.id}" aria-label="Select ${escape(r.name)}" aria-pressed="${selected}" ${disabled?`disabled title="${escape(pack.species.find(s=>s.id===c.species).name)} cannot be ${escape(r.name)}"`:''}>Select</button>${link(page)}</div>${preview(page,'class',r.id,key)}</article>`;
   }).join('')}</div>`;
  }
  return `<div class="skill-picks">${config.rows.filter(r=>matches(optionArticle(pack,r.name))).map(r=>{
   const page=optionArticle(pack,r.name);
   const control=r.control;
   return `<article class="creation-option ${r.selected?'selected':''} ${r.unavailable?'unavailable':''}" data-skill-option="${r.id}"><div class="option-head">${fold(r.id,key,r.name)}${control}<small>${escape(r.ability.toUpperCase())}</small>${automationBadge(pack.skills.find(s=>s.id===r.id))}</div>${preview(page,'skill',r.id,key)}</article>`;
  }).join('')}</div>`;
 }
 function render(key,config){
  configs.set(key,config);const s=state(key);
  return `<div class="creation-options" data-options-key="${escape(key)}"><div class="actions option-toolbar">${config.counter?`<span>${escape(config.counter)}</span>`:''}<input type="search" placeholder="Search" aria-label="Search ${config.kind}" data-option-search value="${escape(s.query)}"><button type="button" data-option-fold="fold">Fold all</button><button type="button" data-option-fold="unfold">Unfold all</button></div><div class="creation-option-results">${results(key)}</div></div>`;
 }
 function remember(root){
  for(const el of (root?[root]:document.querySelectorAll('[data-options-key]'))){
   const s=state(el.dataset.optionsKey);
   el.querySelectorAll('[data-option-applications]').forEach(d=>{if(d.open)s.applications.add(d.dataset.optionApplications);else s.applications.delete(d.dataset.optionApplications);});
  }
 }
 function update(root){root.querySelector('.creation-option-results').innerHTML=results(root.dataset.optionsKey);}
 return {
  foldAll(){for(const s of states.values()){s.expanded.clear();s.applications.clear();}},
  classes:c=>render(c.id+':classes',{kind:'classes',character:c}),
  skills:(key,rows,counter)=>render(key,{kind:'skills',rows,counter}),remember,
  input(event){const el=event.target;if(!el.hasAttribute('data-option-search'))return false;const root=el.closest('[data-options-key]');remember(root);state(root.dataset.optionsKey).query=el.value;update(root);return true;},
  click(event){
   const button=event.target.closest('[data-option-toggle],[data-option-fold]');if(!button)return false;
   const root=button.closest('[data-options-key]');remember(root);const key=root.dataset.optionsKey,s=state(key),config=configs.get(key);
   if(button.dataset.optionToggle){const id=button.dataset.optionToggle;if(s.expanded.has(id))s.expanded.delete(id);else s.expanded.add(id);}
   else {const ids=config.kind==='classes'?pack.classes.map(r=>r.id):config.rows.map(r=>r.id);for(const id of ids){if(button.dataset.optionFold==='fold'){s.expanded.delete(id);s.applications.delete(id);}else{s.expanded.add(id);s.applications.add(id);}}}
   update(root);root.querySelector(`[data-option-toggle="${button.dataset.optionToggle||''}"]`)?.focus({preventScroll:true});return true;
  },
 };
}
