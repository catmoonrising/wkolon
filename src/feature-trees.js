import {automationBadge} from './feature-status.js';
import {classEntry,classRequirement,classRequirementLabel} from './class-advancement.js';
import {GROUPS,indexPack,eligible,prerequisite} from './rules.js';
import {counselingEnabled} from './house-rules.js';
import {articleText,renderArticle,escapeHTML as escape} from './wiki-content.js';
import {layoutFeatureGraph,featureEdgePath,featureCrossings} from './feature-layout.js';
import {featureChoices,talentTreeIds,resolveFeatureSelection} from './feature-choices.js';
const title=value=>value.replace(/^tree:/,'').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const treeLabels=new WeakMap();
function treeTitle(id,pack){
 if(!treeLabels.has(pack))treeLabels.set(pack,new Map((pack.catalog?.records||[]).filter(r=>r.kind==='talentTree').map(r=>['tree:'+r.name.replace(/ Talent Tree$/,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''),r.name.replace(/ Talent Tree$/,'')])));
 return treeLabels.get(pack).get(id)||title(id);
}
export const featureFamily=r=>/^(Weapon Proficiency|Armor Proficiency) \(/.test(r.name)?r.name.replace(/ \(.*\)$/,''):null;
export const featureValue=r=>featureFamily(r)?'family:'+featureFamily(r):r.id+'|';
export function featureVariants(r,pack) {return featureChoices(r,pack).map(choice=>({id:r.id,...(choice?{choice}:{})}));}

// Rendered text never drives eligibility or graph dependencies.
export function featureGraph(pack,options) {
 const ix=indexPack(pack),type=options.type,ctx=options.ctx,allowed=new Set(options.allowedIds),nodes=new Map(),byId=new Map();
 const classMode=type==='classes',classDraft=r=>options.classDrafts?.[r.id]||options.draft||{};
 const possible=r=>classMode?(allowed.has(r.id)&&classEntry(r,ctx,ix,classDraft(r),{ignoreDeclarations:true}).available?[{id:r.id}]:[]):allowed.has(r.id)?featureVariants(r,pack).filter(s=>eligible(r,s,ctx,ix,type,{ignoreManual:true})&&(!options.restrictions?.[r.id]||options.restrictions[r.id].includes(s.choice))):[];
 const selected=options.selected&&resolveFeatureSelection(ix[type].get(options.selected.id),options.selected,pack);
 const possessed=classMode?[...ctx.classLevels].map(([id])=>({id})):[...ctx[type]];
 if(selected && !selected.pending && allowed.has(selected.id) && (classMode||eligible(ix[type].get(selected.id),selected,ctx,ix,type)) && possible(ix[type].get(selected.id)).some(s=>s.id===selected.id&&(ix[type].get(s.id).choiceType==='manual'||(s.choice||'')===(selected.choice||''))))possessed.push(selected);
 for(const r of pack[type]) {
  if(!allowed.has(r.id))continue;
  const key=type==='feats'?featureValue(r):r.id+'|';let node=nodes.get(key);
  if(!node){const groups=type==='talents'?talentTreeIds(r).filter(id=>!options.allowedTrees||options.allowedTrees.includes(id)):[];node={key,name:type==='feats'?(featureFamily(r)||r.name):r.name,group:groups[0]||null,groups,records:[],parents:[],main:true,available:false,owned:false,selected:false};nodes.set(key,node);}
  const owns=s=>{const prior=ix[type].get(s.id);return s.id===r.id||r.repeatGroup&&prior?.repeatGroup===r.repeatGroup&&(!r.weaponGroup||(prior.weaponGroup||s.choice)===r.weaponGroup);};
  node.records.push(r);node.available||=possible(r).length>0;node.owned||=possessed.some(owns);node.selected||=selected?.id===r.id;byId.set(r.id,key);
 }
 function condition(p,owner) {
  // Repeat read-only requirements beside each option. Sharing a DEX/BAB label
  // globally joins unrelated branches into one large, tangled component.
  const key='condition:'+JSON.stringify(p)+':for:'+owner;if(nodes.has(key))return key;
  const choice=p.value==='$choice';let name,record,records;
  if(['feat','featChoice','talent','talentChoice'].includes(p.kind)){record=ix[p.kind.startsWith('talent')?'talents':'feats'].get(p.value);name=record.name+(p.kind==='featChoice'&&p.choice?' ('+ix.skills.get(p.choice).name+')':p.kind==='featChoice'||p.kind==='talentChoice'&&p.choice==='$choice'?' (same weapon)':p.kind==='talentChoice'?' ('+title(p.choice)+')':'');}
  else if(p.kind==='trained')name='Trained in '+(choice?'a skill':ix.skills.get(p.value).name);
  else if(p.kind==='power'){record=ix.forcePowers.get(p.value);name=choice?'Known Force Power':record.name;}
  else if(p.kind==='darkSideScore')name='DSS '+p.min+(p.max!==undefined&&p.max!==p.min?' to '+p.max:'');
  else if(p.kind==='untrained')name='Untrained in '+(choice?'chosen skill':ix.skills.get(p.value).name);
  else if(p.kind==='classSkill')name=choice?'Class skill':ix.skills.get(p.value).name+' class skill';
  else if(p.kind==='ability')name=p.value.toUpperCase()+' '+p.min;
  else if(p.kind==='bab')name='Base attack +'+p.min;
  else if(p.kind==='level')name='Level '+p.min;
  else if(p.kind==='classChoices')name=p.min+' '+(p.value==='forceTechnique'?'Force Technique':p.value==='forceSecret'?'Force Secret':'Medical Secret')+(p.min===1?'':'s');
  else if(p.kind==='tradition'){const membership=pack.rules.traditionTalentAccess.find(r=>r.id===p.value);record=pack.rulePages.find(r=>r.id===membership.ruleId);name=membership.name;}
  else if(p.kind==='nonDroid')name='Not a droid';
  else if(p.kind==='droid')name='Droid';
  else if(p.kind==='weaponFocusMode'){record=ix.feats.get('feat:weapon-focus');name='Weapon Focus (Melee)';}
  else if(p.kind==='weaponProficiencyMode')name='Ranged Weapon Proficiency (except Heavy Weapons)';
  else if(p.kind==='trait')name=title(p.value);
  else if(p.kind==='species'){const matches=pack.species.filter(r=>r.name.replace(/ \([^)]*\)$/,'')===p.value),current=matches.find(r=>r.name===ctx.speciesName);records=current?[current]:matches;name=p.value;}
  else if(p.kind==='size')name=title(p.value)+' or larger';
  else if(p.kind==='proficientChoice')name='Weapon Proficiency';
  else if(p.kind==='focusChoice')name='Weapon Focus'+(choice?'':` (${title(p.value)})`);
  const choices=p.kind==='featChoice'&&p.choice?[null]:p.kind==='featChoice'||p.kind==='talentChoice'&&p.choice==='$choice'?featureChoices(record,pack):choice?(p.kind==='power'?pack.forcePowers.map(r=>r.id):p.kind==='proficientChoice'||p.kind==='focusChoice'?[...GROUPS,...pack.equipment.filter(w=>w.kind==='weapon').map(w=>w.id),'attack:unarmed']:pack.skills.map(s=>s.id)):[null];
  const owned=choices.some(value=>prerequisite(p,ctx,ix,value));
  nodes.set(key,{key,name,group:null,records:records||(record?[record]:[]),parents:[],main:false,owned,available:owned,selected:false});return key;
 }
 function parents(p,out,owner,alternative=false) {
  if(p.kind==='all'||p.kind==='any'){p.requirements.forEach(r=>parents(r,out,owner,alternative||p.kind==='any'));return;}
  const key=['feat','featChoice','talent','talentChoice'].includes(p.kind)&&!(p.kind==='featChoice'&&p.choice)&&byId.has(p.value)?byId.get(p.value):condition(p,owner);
  if(!out.some(edge=>edge.key===key))out.push({key,alternative});
 }
 function classParents(p,out,owner,cls,alternative=false){
  if(p.kind==='any'){p.requirements.forEach(r=>classParents(r,out,owner,cls,true));return;}
  const key='condition:class:'+cls.id+':'+JSON.stringify(p),collection=p.kind==='feat'?'feats':p.kind==='talent'?'talents':p.kind==='power'?'forcePowers':null;
  const record=collection?pack[collection].find(r=>r.name.toLocaleLowerCase()===p.name.toLocaleLowerCase()):p.kind==='meleeFocus'?ix.feats.get('feat:weapon-focus'):null;
  const owned=classRequirement(p,ctx,ix,classDraft(cls)),name=classRequirementLabel(p,ix,cls);
  nodes.set(key,{key,name,group:null,records:record?[record]:[],parents:[],main:false,owned,available:owned,selected:false});out.push({key,alternative});
 }
 for(const node of [...nodes.values()])if(node.main) {
  if(classMode){node.records.forEach(r=>(r.entryRequirements||[]).forEach(p=>classParents(p,node.parents,node.key,r)));continue;}
  node.records.forEach(r=>{parents(r.prerequisite,node.parents,node.key);if(r.forceActivation&&counselingEnabled(ctx,'jc:106-jedi-multiclassing'))parents({kind:'feat',value:'feat:force-sensitivity'},node.parents,node.key);});node.parents=node.parents.filter(p=>p.key!==node.key);
 }
 const main=[...nodes.values()].filter(n=>n.main);
 return {nodes,groups:[...new Set(main.flatMap(n=>n.groups||[]))].sort((a,b)=>treeTitle(a,pack).localeCompare(treeTitle(b,pack))),possible};
}

export function createFeatureTrees(pack) {
 const states=new Map(),configs=new Map(),geometryCache=new WeakMap();
 const state=key=>{if(!states.has(key))states.set(key,{query:'',group:null,onlyEligible:false,zoom:1,scrollLeft:0,scrollTop:0,expanded:new Set()});return states.get(key);};
 const rootFor=key=>[...document.querySelectorAll('.feature-tree-browser')].find(el=>el.dataset.treeKey===key);
 function visible(options) {
  const model=featureGraph(pack,options),s=state(options.key);
  const accessStamp=options.allowedIds.join('|'),allowed=new Set(options.allowedIds);
  const permitted=group=>[...model.nodes.values()].some(n=>n.groups?.includes(group)&&n.records.some(r=>allowed.has(r.id)));
  if(options.type==='feats')s.group='all';
  if(s.group===null || (s.accessStamp!==accessStamp && s.group!=='all' && !permitted(s.group)))s.group=model.groups.find(permitted)||model.groups[0]||'all';
  s.accessStamp=accessStamp;
  const query=s.query.trim().toLocaleLowerCase(),found=new Set();
  for(const n of model.nodes.values())if(n.main && (s.group==='all'||n.groups?.includes(s.group)) && (!s.onlyEligible||n.available||n.owned) && (n.name+' '+n.records.map(r=>articleText(r.article)).join(' ')).toLocaleLowerCase().includes(query))found.add(n.key);
  const include=key=>{const n=model.nodes.get(key);if(!n)return;for(const parent of n.parents)if(!found.has(parent.key)){found.add(parent.key);include(parent.key);}};
  [...found].forEach(include);
  const ranks=new Map();function rank(key,seen=new Set()){if(ranks.has(key))return ranks.get(key);if(seen.has(key))return 0;seen.add(key);const n=model.nodes.get(key);const value=n.parents.length?1+Math.max(...n.parents.map(p=>rank(p.key,new Set(seen)))):0;ranks.set(key,value);return value;}
  const nodes=[...found].map(key=>({...model.nodes.get(key),rank:rank(key)}));
  // A read-only condition belongs beside the other immediate prerequisites, so its
  // arrow need not run behind an unrelated intermediate talent.
  for(const n of nodes)if(!n.main)n.rank=Math.max(n.rank,Math.min(...nodes.filter(child=>child.parents.some(p=>p.key===n.key)).map(child=>child.rank-1)));
  const baseNodes=options.type==='classes'?nodes.filter(n=>n.main&&n.records[0].classType!=='prestige').sort((a,b)=>a.name.localeCompare(b.name)):[];
  return {...model,nodes:nodes.filter(n=>!baseNodes.includes(n)),baseNodes};
 }
 function tabs(options) {if(options.type!=='talents')return '';const model=featureGraph(pack,options),s=state(options.key);return ['all',...model.groups].map(group=>`<button type="button" data-tree-group="${escape(group)}" aria-pressed="${s.group===group}">${escape(group==='all'?'All':treeTitle(group,pack))}</button>`).join('');}
 function mechanics(node) {
  const articles=[...new Map(node.records.filter(r=>r.article).map(r=>[JSON.stringify(r.article.blocks),r])).values()];
  return articles.map(r=>(articles.length>1?`<h3>${escape(r.name)}</h3>`:'')+renderArticle(r.article)).join('');
 }
 function results(options) {
  const model=visible(options);
  const nodeHTML=(n,base=false)=>{
   const hasText=n.records.some(r=>r.article),expanded=state(options.key).expanded.has(n.key);
   const blockedVersion=n.records.some(r=>r.exclusiveGroup&&(options.ctx[options.type]||[]).some(f=>pack[options.type].find(p=>p.id===f.id)?.exclusiveGroup===r.exclusiveGroup&&f.id!==r.id));
   return `<article class="feature-tree-node ${n.owned?'owned':!n.available?'unavailable':''} ${n.selected?'selected':''} ${n.main?'':'prerequisite-node'} ${base?'base-class-node':''} ${expanded?'expanded':''}" ${base?'':`data-tree-node="${escape(n.key)}" data-tree-rank="${n.rank}"`}><div class="feature-tree-node-head">${hasText?`<button type="button" class="feature-fold" data-tree-fold="${escape(n.key)}" aria-expanded="${expanded}" aria-label="${expanded?'Fold':'Unfold'} ${escape(n.name)}">${expanded?'▼':'▶'}</button>`:''}${n.main?`<button type="button" class="feature-pick" data-tree-pick="${escape(n.key)}" aria-pressed="${n.selected}" aria-label="${escape(n.name)}${n.owned?' (possessed)':''}" ${n.available||n.selected?'':`disabled title="${n.owned?'Already possessed':blockedVersion?'Another version already possessed':'Prerequisites or class access not met'}"`}>${escape(n.name)}</button>`:`<span>${escape(n.name)}</span>`}${n.main?automationBadge(n.records[0]):''}</div>${expanded&&hasText?`<div class="feature-tree-description">${mechanics(n)}</div>`:''}</article>`;

  };
  return `${model.baseNodes.length?`<div class="base-class-options" role="group" aria-label="Base classes">${model.baseNodes.map(n=>nodeHTML(n,true)).join('')}</div>`:''}<div class="feature-tree-scroll" tabindex="0" aria-label="${options.type==='feats'?'Feat':options.type==='talents'?'Talent':options.type==='classes'?'Class':'Class feature'} prerequisites" data-tree-scroll="${escape(options.key)}"><div class="feature-tree-stage"><div class="feature-tree-canvas"><svg class="feature-tree-arrows" aria-hidden="true"><g></g></svg>${model.nodes.map(n=>nodeHTML(n)).join('')}</div></div>${model.nodes.length||model.baseNodes.length?'':'<p role="status">No matches</p>'}</div>`;
 }
 function remember(key){const root=rootFor(key),scroll=root?.querySelector('.feature-tree-scroll');if(scroll){const s=state(key);s.scrollLeft=scroll.scrollLeft;s.scrollTop=scroll.scrollTop;}}
 function layout(root) {
  const options=configs.get(root.dataset.treeKey);if(!options)return;
  const s=state(options.key),model=visible(options),elements=new Map([...root.querySelectorAll('[data-tree-node]')].map(el=>[el.dataset.treeNode,el]));
  const sizes=new Map([...elements].map(([key,el])=>[key,{width:el.offsetWidth,height:el.offsetHeight}])),signature=JSON.stringify(model.nodes.map(n=>[n.key,n.rank,n.parents,sizes.get(n.key)]));
  let cached=geometryCache.get(root);
  if(cached?.signature!==signature){const geometry=layoutFeatureGraph(model.nodes,sizes),edges=geometry.edges.map(edge=>({...edge,path:featureEdgePath(geometry.positions.get(edge.from),geometry.positions.get(edge.to),edge.via)}));cached={signature,geometry,edges,crossings:featureCrossings(edges)};geometryCache.set(root,cached);}
  const {geometry,edges,crossings}=cached;
  const {positions,width,height}=geometry;
  for(const [key,p] of positions){const el=elements.get(key);el.style.left=p.x+'px';el.style.top=p.y+'px';}
  const canvas=root.querySelector('.feature-tree-canvas'),svg=canvas.querySelector('svg'),stage=root.querySelector('.feature-tree-stage');
  canvas.style.width=width+'px';canvas.style.height=height+'px';canvas.style.transform=`scale(${s.zoom})`;
  stage.style.width=width*s.zoom+'px';stage.style.height=height*s.zoom+'px';svg.setAttribute('width',width);svg.setAttribute('height',height);
  const maskId=i=>'cross-'+options.key.replace(/[^a-z0-9]/gi,'')+'-'+i;
  // Cut only the underpass at real crossings. SVG masks reveal the current theme
  // beneath it, while the overpass keeps its original solid/dotted curve.
  const masks=edges.map((_,i)=>{const gaps=crossings.filter(c=>c.under===i);return gaps.length?`<mask id="${maskId(i)}" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="white"/>${gaps.map(c=>`<circle class="feature-crossing-gap" cx="${c.x}" cy="${c.y}" r="6" fill="black"/>`).join('')}</mask>`:'';}).join('');
  svg.innerHTML=`<defs>${masks}</defs><g>${edges.map((edge,i)=>{
   const n=model.nodes.find(n=>n.key===edge.to),path=edge.path;
   return `<path class="feature-edge ${!n.available&&!n.owned?'unavailable':''}" d="${path.shaft}" ${crossings.some(c=>c.under===i)?`mask="url(#${maskId(i)})"`:''}/><path class="feature-arrowhead" d="${path.head}"/>${edge.alternative?`<text x="${path.x}" y="${path.y}">or</text>`:''}`;
  }).join('')}</g>`;
  const scroll=root.querySelector('.feature-tree-scroll');scroll.scrollLeft=s.scrollLeft;scroll.scrollTop=s.scrollTop;
  const reset=root.querySelector('[data-tree-zoom="reset"]');reset.textContent=Math.round(s.zoom*100)+'%';
  root.querySelector('[data-tree-zoom="out"]').disabled=s.zoom<=.25;root.querySelector('[data-tree-zoom="in"]').disabled=s.zoom>=2;
 }
 function zoom(root,value) {
  const key=root.dataset.treeKey,s=state(key),scroll=root.querySelector('.feature-tree-scroll');
  const next=Math.max(.25,Math.min(2,value)),ratio=next/s.zoom;
  s.scrollLeft=Math.max(0,(scroll.scrollLeft+scroll.clientWidth/2)*ratio-scroll.clientWidth/2);
  s.scrollTop=Math.max(0,(scroll.scrollTop+scroll.clientHeight/2)*ratio-scroll.clientHeight/2);s.zoom=next;layout(root);
 }
 function update(key){remember(key);const root=rootFor(key),options=configs.get(key);if(!root||!options)return;root.querySelector('.feature-tree-results').innerHTML=results(options);root.querySelector('.feature-tree-tabs').innerHTML=tabs(options);layout(root);}
 return {
  render(options){configs.set(options.key,options);const s=state(options.key);visible(options);return `<div class="feature-tree-browser" data-tree-key="${escape(options.key)}"><input type="search" placeholder="Search" aria-label="Search ${options.type}" data-tree-search value="${escape(s.query)}"><div class="feature-tree-tabs">${tabs(options)}</div><div class="feature-tree-tools"><label><input type="checkbox" data-tree-eligible ${s.onlyEligible?'checked':''}>Eligible only</label><button type="button" data-tree-all="fold">Fold all</button><button type="button" data-tree-all="unfold">Unfold all</button><div class="feature-tree-zoom" role="group" aria-label="Tree zoom"><button type="button" data-tree-zoom="out" aria-label="Zoom out">−</button><button type="button" data-tree-zoom="reset" aria-label="Reset zoom">${Math.round(s.zoom*100)}%</button><button type="button" data-tree-zoom="in" aria-label="Zoom in">+</button></div></div><div class="feature-tree-results">${results(options)}</div></div>`;},
  foldAll(){for(const s of states.values())s.expanded.clear();},
  remember(){document.querySelectorAll('.feature-tree-browser').forEach(root=>remember(root.dataset.treeKey));},
  layout(){document.querySelectorAll('.feature-tree-browser').forEach(layout);},
  input(event){const root=event.target.closest('.feature-tree-browser');if(!root)return false;const key=root.dataset.treeKey,s=state(key);if(event.target.hasAttribute('data-tree-search')){s.query=event.target.value;if(s.query)s.group='all';update(key);return true;}return false;},
  change(event){const root=event.target.closest('.feature-tree-browser');if(!root||!event.target.hasAttribute('data-tree-eligible'))return false;state(root.dataset.treeKey).onlyEligible=event.target.checked;update(root.dataset.treeKey);return true;},
  click(event){const root=event.target.closest('.feature-tree-browser'),button=event.target.closest('button');if(!root||!button)return null;const key=root.dataset.treeKey,s=state(key),options=configs.get(key);
   if(button.hasAttribute('data-tree-group')){s.group=button.dataset.treeGroup;s.expanded.clear();s.scrollLeft=s.scrollTop=0;const scroll=root.querySelector('.feature-tree-scroll');scroll.scrollTop=scroll.scrollLeft=0;update(key);root.querySelector(`[data-tree-group="${CSS.escape(s.group)}"]`).focus();return {handled:true};}
   if(button.hasAttribute('data-tree-zoom')){const action=button.dataset.treeZoom;zoom(root,action==='reset'?1:s.zoom+(action==='in'?.25:-.25));return {handled:true};}
   if(button.hasAttribute('data-tree-fold')){const id=button.dataset.treeFold;if(s.expanded.has(id))s.expanded.delete(id);else s.expanded.add(id);update(key);root.querySelector(`[data-tree-fold="${CSS.escape(id)}"]`)?.focus({preventScroll:true});return {handled:true};}
   if(button.hasAttribute('data-tree-all')){if(button.dataset.treeAll==='fold')s.expanded.clear();else{const model=visible(options);for(const n of [...model.baseNodes,...model.nodes])if(n.records.some(r=>r.article))s.expanded.add(n.key);}update(key);return {handled:true};}
   if(button.hasAttribute('data-tree-pick')){const model=featureGraph(pack,options),node=model.nodes.get(button.dataset.treePick);if(!node||(!node.available&&!node.selected))return {handled:true};const r=node.records.find(r=>model.possible(r).length);if(!r)return {handled:true};const selection=node.selected&&options.type!=='classes'?null:{id:r.id,...(r.choiceType||node.records.length>1?{pending:true}:{})};return {handled:true,options,selection};}
   return null;
  },
 };
}
