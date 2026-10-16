import {ACTION_TYPES,ACTION_NAMES,actionState,costLabel,queueAction,archivePlan} from './action-economy.js';
import {describeAction,defaultActionOptions,executeAction,takeAction,finishForceChoice,beginNextTurn,endCurrentTurn,endTrackedCombat,previewPlan} from './action-engine.js';
import {balanceState} from './balance.js';
import {escapeBondsState,ESCAPE_BONDS_NAMES} from './escape-bonds.js';
import {acrobaticsPath} from './acrobatics-movement.js';
import {withdrawPath,runningPath} from './combat-movement.js';
import {chargePath} from './charge.js';
import {opportunityContext} from './opportunity.js';
import {followUpState} from './attack-follow-ups.js';
import {escapeHTML as escape} from './wiki-content.js';

const select=(key,label,rows,value)=>`<label>${label}<select data-action-option="${key}">${rows.map(([id,name])=>`<option value="${escape(id)}" ${id===value?'selected':''}>${escape(name)}</option>`).join('')}</select></label>`;
const input=(key,label,value,min=0,max=100000)=>`<label>${label}<input type="number" data-action-option="${key}" value="${value??''}" min="${min}" max="${max}"></label>`;
const check=(key,label,value)=>`<label><input type="checkbox" data-action-option="${key}" ${value?'checked':''}>${label}</label>`;
const text=(key,label,value='')=>`<label>${label}<input data-action-option="${key}" value="${escape(value)}" maxlength="200"></label>`;
export function createActionsUI(pack,{current,derived,changed,log,error}){
 const modal=document.getElementById('actions-modal'),body=document.getElementById('actions-body'),title=document.getElementById('actions-title');
 let draft=null,editId=null,category=null,owner=null;
 const def=id=>pack.rules.actionEconomy.actions.find(r=>r.id===id);
 function options(id){const c=current(),o=defaultActionOptions(c,derived(),pack,id);if(id==='balance'||id==='balance-recheck')o.path=balanceState(c);if(id==='escape-bonds')o.path=escapeBondsState(c);if(id==='move')o.path=acrobaticsPath(c);if(id==='withdraw')o.path=withdrawPath(c);if(id==='charge')o.path=chargePath(c);if(id==='running-attack')o.path=runningPath(c);if(id==='opportunity')o.path=opportunityContext(c);if(['cleave','follow-through'].includes(id))o.path=followUpState(c);return o;}
 function relevant(id){const d=derived(),c=current();return id==='rage'?!!d.recovery.rage:id==='bellow'?pack.species.find(s=>s.id===c.species)?.bellow:id==='mighty-swing'?d.ctx.feats.some(f=>f.id==='feat:mighty-swing'):id==='brace'?d.attacks.some(a=>a.bracing?.available):id==='running-attack'?d.ctx.feats.some(f=>f.id==='feat:running-attack'):id==='cleave'?d.ctx.feats.some(f=>f.id==='feat:cleave'):id==='follow-through'?d.ctx.feats.some(f=>f.id==='feat:follow-through'):id.startsWith('shield')?c.inventory.some(e=>pack.equipment.find(r=>r.id===e.id)?.energyShield):id==='acrobatics-prone'?d.ctx.trained.has('skill:acrobatics'):true;}
 function describe(id,o,budget=true){try{return describeAction(current(),pack,id,o,budget);}catch(e){return {name:def(id)?.name||id,cost:{type:def(id)?.type||'standard',count:def(id)?.count||1},...e.actionView,issue:e.message};}}
 function menu(type){
  category=type;draft=null;editId=null;owner=current().id;title.textContent=ACTION_NAMES[type];
  const entries=[];
  for(const r of pack.rules.actionEconomy.actions){
   if(!relevant(r.id))continue;
   if(r.id==='power'){
    for(const p of derived().forcePowers)for(const a of p.actions||[p.action])if(({full:'full-round-action',standard:'standard-action',move:'move-action',swift:'swift-action',free:'free-action',reaction:'reaction'})[type]===a)entries.push({id:r.id,o:{...options(r.id),powerId:p.copyId,action:a},name:p.name,manual:true});
    continue;
   }
   const o=options(r.id),v=describe(r.id,o,false);let dynamic=v.cost.type;
   if(r.id==='prone'&&current().prone||r.id==='stand'&&!current().prone)continue;
   if(r.id==='recover-power')dynamic='reaction';
   if(dynamic===type)entries.push({id:r.id,o,name:r.name,manual:r.id.startsWith('manual-')});
  }
  body.innerHTML=`<div class="action-menu">${entries.map((e,i)=>{const v=describe(e.id,e.o);return `<button type="button" data-action-pick="${i}" title="${escape(v.issue||'')}"><span>${escape(e.name)}</span><small>${escape(costLabel(v.cost))}${e.manual?' (Manual)':''}</small></button>`;}).join('')}</div>`;
  body.querySelectorAll('[data-action-pick]').forEach(b=>b.addEventListener('click',()=>{const e=entries[Number(b.dataset.actionPick)];draft={id:e.id,o:e.o};form();}));
  if(!modal.open)modal.showModal();
 }
 function routeFields(o,id){
  if(!o.path)return '';
  let fields='';const p=o.path;
  if(['move','withdraw'].includes(id))fields+=input('path.path.squares','Squares',p.path.squares,1)+input('path.path.diagonal','Diagonal',p.path.diagonal)+input('path.path.difficult','Difficult',p.path.difficult)+input('path.path.diagonalDifficult','Diagonal difficult',p.path.diagonalDifficult);
  if(id==='move')fields+=check('path.tumble','Tumble',p.tumble)+check('path.crossTerrain','Cross Difficult Terrain',p.crossTerrain)+input('path.tumbled.squares','Tumble squares',p.tumbled.squares)+input('path.occupied','Occupied squares',p.occupied)+input('path.tumbled.diagonal','Tumble diagonal',p.tumbled.diagonal)+input('path.tumbled.difficult','Tumble difficult',p.tumbled.difficult)+input('path.tumbled.diagonalDifficult','Tumble diagonal difficult',p.tumbled.diagonalDifficult);
  if(id==='withdraw')fields+=check('path.clearThreats','Shortest route out of threatened area',p.clearThreats);
  if(id==='charge')fields+=input('path.squares','Squares',p.squares,2)+input('path.diagonalSquares','Diagonal',p.diagonalSquares)+input('path.difficultSquares','Difficult',p.difficultSquares)+input('path.diagonalDifficultSquares','Diagonal difficult',p.diagonalDifficultSquares)+input('path.lowObjectSquares','Low objects',p.lowObjectSquares)+input('path.diagonalLowObjectSquares','Diagonal low objects',p.diagonalLowObjectSquares)+check('path.turns','Turns',p.turns)+check('path.crossTerrain','Cross Difficult Terrain',p.crossTerrain);
  if(id==='running-attack')for(const part of ['before','after'])fields+=input('path.'+part+'.squares',part==='before'?'Before attack':'After attack',p[part].squares)+input('path.'+part+'.diagonal','Diagonal '+part,p[part].diagonal)+input('path.'+part+'.difficult','Difficult '+part,p[part].difficult)+input('path.'+part+'.diagonalDifficult','Diagonal difficult '+part,p[part].diagonalDifficult);
  if(id==='balance'||id==='balance-recheck')return select('path.width','Width',[['8-15','8-15 cm'],['4-7','4-7 cm'],['under-4','Under 4 cm']],p.width)+check('path.unstable','Slippery / unstable',p.unstable)+input('path.path.squares','Squares',p.path.squares,1)+input('path.check','Check (blank to roll)',p.check,-100000)+input('path.catchCheck','Catch (blank to roll)',p.catchCheck,-100000);
  if(id==='escape-bonds')return select('path.restraint','Restraint',Object.entries(ESCAPE_BONDS_NAMES),p.restraint)+check('path.fast','Faster attempt',p.fast)+input('path.dexterityCheck','Opponent DEX',p.dexterityCheck,-100000)+input('path.grappleCheck','Opponent grapple',p.grappleCheck,-100000)+input('path.dc','DC',p.dc,-100000)+input('path.check','Check (blank to roll)',p.check,-100000);
  if(id==='opportunity')return text('path.opponent','Opponent',p.opponent)+text('path.action','Provoking action',p.action)+input('path.distance','Distance',p.distance)+check('path.provoked','Provokes within reach',p.provoked);
  if(['cleave','follow-through'].includes(id))return '';
  if(p.mode!==undefined)fields=select('path.mode','Movement',[['normal','Normal'],...Object.keys(derived().speeds).map(k=>[k,k])],p.mode)+fields;
  return `<details open><summary>Route</summary><div class="action-fields">${fields}</div></details>`;
 }
 function form(){
  if(owner!==current().id){modal.close();return;}
  const {id,o}=draft,c=current(),d=derived(),v=describe(id,o),r=def(id);title.textContent=r.name;
  let fields='';
  if(Object.hasOwn(o,'uid')){
   const rows=['shield','shield-recharge'].includes(id)?c.inventory.filter(e=>pack.equipment.find(r=>r.id===e.id)?.energyShield).map(e=>[e.uid,pack.equipment.find(r=>r.id===e.id).name]):d.attacks.filter(a=>id==='charge'?a.mode==='melee':id==='aim'?a.mode==='ranged'&&!a.areaType:id==='brace'?a.bracing?.available:id==='opportunity'?a.opportunityWeapon:true).map(a=>[a.uid,a.name]);
   fields+=select('uid',id.startsWith('shield')?'Shield':'Weapon',[['','Choose'],...rows],o.uid);
  }
  if(['routine','routine-step'].includes(id))fields+=select('routineId','Routine',[['','Choose'],...c.routines.filter(r=>r.kind!=='fullAttack').map(r=>[r.id,r.name||'Routine'])],o.routineId)+select('cost','Action',ACTION_TYPES.map(t=>[t,ACTION_NAMES[t]]),o.cost||'full')+check('confirmed','Routine and action cost confirmed',o.confirmed);
  if(['full-attack','full-attack-step'].includes(id))fields+=select('routineId','Routine',[['','Choose'],...c.routines.filter(r=>r.kind==='fullAttack').map(r=>[r.id,r.name||'Full Attack'])],o.routineId);
  if(['power','recover-power'].includes(id))fields+=select('powerId','Power',[['','Choose'],...d.forcePowers.filter(p=>id==='recover-power'?p.spent:true).map(p=>[p.copyId,p.name+(p.spent?' (Spent)':'')])],o.powerId);
  if(id==='power'){
   const p=d.forcePowers.find(p=>p.copyId===o.powerId);
   if(p){fields+=select('action','Action',(p.actions||[p.action]).map(a=>[a,a.replaceAll('-',' ')]),o.action);
    fields+=select('rollMode','Check',[['roll','Roll'],...(p.take10?[['take10','Take 10']]:[]),...(p.adept?[['adept','Adept (1 FP)']]:[])],o.rollMode||'roll');
    fields+=select('fp','Force Point',[['ask','Ask after roll'],['none','None']],o.fp||'none')+check('enhance','Ask about enhancement (1 FP, Manual)',o.enhance);
    if(pack.rules.actionEconomy.powerRequirements?.[p.id]?.aware)fields+=check('aware','Aware of the attack',o.aware);
    fields+=`<button type="button" data-rule-page="${escape(p.ruleId||pack.rulePages.find(r=>r.sourceId===p.sourceId)?.id||'rule:force-powers')}">Mechanics</button><span class="badge">${p.automation?.status==='partial'?'Partial':'Manual'}</span>`;
   }
  }
  if(id==='attack')fields+=select('fp','Force Point',[['none','None'],['before','Bonus before roll (1 FP)']],o.fp||'none');
  if(v.cost.type==='reaction')fields+=text('trigger','Trigger',o.trigger||'');
  if(id==='reload')fields+=check('confirmed','Reload supplied',o.confirmed);
  if(id==='recover')fields+=select('count','Swift actions',[[1,'1'],[2,'2'],[3,'3']],o.count??1);
  if(id==='bellow')fields+=input('extraDice','Extra d6',o.extraDice)+check('strong','Strong Bellow',o.strong)+input('damage','Entered damage (over 500 dice)',o.damage);
  if(id.startsWith('manual-')&&r.name==='Other')fields+=text('note','Action',o.note||'');
  fields+=routeFields(o,id);
  body.innerHTML=`<form id="action-options"><div class="action-fields">${fields}</div><div class="actions"><span data-action-cost>${escape(costLabel(v.cost))}</span>${id.startsWith('manual-')?'<span class="badge">Manual</span>':''}${r.referenceId?`<button type="button" data-rule-reference="${r.referenceId}">ⓘ</button>`:''}${r.ruleId?`<button type="button" data-rule-page="${r.ruleId}">ⓘ</button>`:''}</div><p class="action-error" role="status" data-action-error>${escape(v.issue||'')}</p><div class="modal-actions"><button type="button" data-action-back>Back</button><button type="button" data-action-queue>${editId?'Save':'Queue'}</button><button type="submit" ${v.issue?'disabled':''}>Run</button></div></form>`;
  body.querySelector('[data-action-back]').addEventListener('click',()=>menu(category||v.cost.type));
  body.querySelector('[data-action-queue]').addEventListener('click',()=>{try{read();if(editId){const step=c.actionState.plan.find(p=>p.id===editId);if(step?.status!=='queued')throw new Error('Action already resolved');step.options=structuredClone(draft.o);}else queueAction(c,id,draft.o);modal.close();changed();}catch(e){error(e.message);}});
  body.querySelector('form').addEventListener('submit',e=>{e.preventDefault();read();try{const result=editId?(c.actionState.plan.find(p=>p.id===editId).options=structuredClone(draft.o),executeAction(c,pack,editId)):takeAction(c,pack,id,draft.o);log('roll',result.text,result.html);modal.close();changed();}catch(e){error(e.message);}});
  body.querySelectorAll('input[data-action-option]').forEach(el=>el.addEventListener('input',()=>{read();const next=describe(id,draft.o);body.querySelector('[data-action-cost]').textContent=costLabel(next.cost);body.querySelector('[data-action-error]').textContent=next.issue||'';body.querySelector('[type="submit"]').disabled=!!next.issue;}));
  body.querySelectorAll('[data-action-option]').forEach(el=>el.addEventListener('change',()=>{read();if(['powerId','rollMode','action'].includes(el.dataset.actionOption)){if(el.dataset.actionOption==='powerId'){const p=d.forcePowers.find(p=>p.copyId===draft.o.powerId);draft.o.action=p?.action;}form();}else{const next=describe(id,draft.o);body.querySelector('[data-action-cost]').textContent=costLabel(next.cost);body.querySelector('[data-action-error]').textContent=next.issue||'';body.querySelector('[type="submit"]').disabled=!!next.issue;}}));
 }
 function read(){for(const el of body.querySelectorAll('[data-action-option]')){const keys=el.dataset.actionOption.split('.');let obj=draft.o;for(const key of keys.slice(0,-1))obj=obj[key];const value=el.type==='checkbox'?el.checked:el.type==='number'||el.dataset.actionOption==='count'?(el.value===''?null:Number(el.value)):el.value;obj[keys.at(-1)]=value;}}
 function runPlan(){const c=current();for(const step of c.actionState?.plan||[]){if(step.status==='waiting')break;if(step.status!=='queued')continue;try{const r=executeAction(c,pack,step.id);log('roll',r.text,r.html);if(step.status==='waiting'||c.actionState.plan.find(p=>p.id===step.id)?.status==='waiting')break;}catch(e){error(e.message);break;}}changed();}
 function render(){
  const c=current(),s=actionState(c),preview=previewPlan(c,pack),pending=s.plan.find(p=>p.status==='waiting');
  return `<div class="action-types">${ACTION_TYPES.map(type=>`<button type="button" data-action-menu="${type}" ${(type==='full'?(s.ended||s.spent.length):['standard','move','swift'].includes(type)&&(s.ended||pack.rules.actionEconomy.substitutions[type].every(slot=>s.spent.includes(slot))))?'class="action-used"':''}>${ACTION_NAMES[type]}</button>`).join('')}</div>${s.ended?'<span class="badge">Turn ended</span>':''}<div class="actions"><button type="button" data-turn-next>${c.actionState?.active?'New Turn':'Start turn'}</button>${c.actionState?.active?'<button type="button" data-turn-end>End turn</button><button type="button" data-combat-end>End combat</button>':''}<button type="button" data-rule-reference="${pack.rules.actionEconomy.referenceId}" aria-label="Action rules">ⓘ</button></div>${s.recover.count?`<span>Recover ${s.recover.count}/3</span>`:''}${s.plan.length?`<ol class="turn-plan">${s.plan.map((step,i)=>{const v=preview.find(p=>p.id===step.id),done=step.status!=='queued';return `<li data-action-step="${step.id}"><div><button type="button" class="link-button" data-turn-edit="${step.id}" ${done?'disabled':''}>${escape(v?.name||def(step.action)?.name||step.action)}</button>${v?.cost?` <small>${escape(costLabel(v.cost))}</small>`:''}${done?` <span class="badge">${step.status==='waiting'?'Force Point?':'Done'}</span>`:''}</div>${step.result?`<details><summary>Result</summary>${escape(step.result.text)}</details>`:''}${v?.issue?`<span class="action-error">${escape(v.issue)}</span>`:''}${!done?`<button type="button" data-turn-up="${step.id}" aria-label="Move action up" ${i===0||s.plan[i-1].status!=='queued'?'disabled':''}>↑</button><button type="button" data-turn-down="${step.id}" aria-label="Move action down" ${i===s.plan.length-1||s.plan[i+1].status!=='queued'?'disabled':''}>↓</button><button type="button" data-turn-delete="${step.id}" aria-label="Remove planned action">×</button>`:''}</li>`;}).join('')}</ol><div class="actions"><button type="button" data-turn-run ${pending?'disabled':''}>Run plan</button><button type="button" data-turn-clear>Clear finished</button></div>`:''}${pending?`<div class="actions"><span>${escape(pending.result.text)}</span>${pending.result.fpAllowed?`<button type="button" data-turn-fp="${pending.id}">+ Force Point</button>`:''}${pending.result.enhanceAllowed?`<button type="button" data-turn-enhance="${pending.id}">Enhance (1 FP, Manual)</button>`:''}<button type="button" data-turn-skip="${pending.id}">Keep</button></div>`:''}${s.history.length?`<details><summary>History</summary>${s.history.slice().reverse().map(p=>`<p>${escape(p.result.text)}</p>`).join('')}</details>`:''}`;
 }
 function legacy(el){
  if(!current().actionState?.active)return false;
  const c=current(),id=el.dataset.combat;
  const map={attack:'attack',charge:'charge','running-attack':'running-attack',withdraw:'withdraw','acrobatics-move':'move',balance:'balance','balance-recheck':'balance-recheck','escape-bonds':'escape-bonds','prone-action':c.prone?'stand':'prone','acrobatics-prone':'acrobatics-prone',opportunity:'opportunity',cleave:'cleave','follow-through':'follow-through',reload:'reload'};
  let action=map[id],o=action?options(action):{};
  if(action){if(el.dataset.attackId)o.uid=el.dataset.attackId;if(action==='reload'||action==='balance-recheck'){draft={id:action,o};category=action==='balance-recheck'?'reaction':'move';owner=c.id;form();modal.showModal();return true;}}
  else if(['run','step'].includes(id)){const r=c.routines.find(r=>r.id===el.closest('[data-routine]')?.dataset.routine);if(r?.kind!=='fullAttack'){action=id==='run'?'routine':'routine-step';o={...options(action),routineId:r?.id};draft={id:action,o};owner=c.id;category='full';form();modal.showModal();return true;}action=id==='run'?'full-attack':'full-attack-step';o={routineId:r.id};}
  else if(['recover','second-wind','rage'].includes(el.dataset.recovery)){action=el.dataset.recovery;o=options(action);if(action==='recover')o.count=3;}
  else if(el.dataset.usePower||el.dataset.powerAdept||el.dataset.powerTake10){action='power';o=options(action);o.powerId=el.dataset.usePower||el.dataset.powerAdept||el.dataset.powerTake10;const p=derived().forcePowers.find(p=>p.copyId===o.powerId);o.action=p.action;o.rollMode=el.dataset.powerAdept?'adept':el.dataset.powerTake10?'take10':'roll';if(p.action==='reaction'||pack.rules.actionEconomy.powerRequirements?.[p.id]?.aware){draft={id:action,o};owner=c.id;category='reaction';form();modal.showModal();return true;}}
  else if(el.dataset.recoverPower){action='recover-power';o={powerId:el.dataset.recoverPower};draft={id:action,o};owner=c.id;category='reaction';form();modal.showModal();return true;}
  else if(el.dataset.energyActivate||el.dataset.energyRecharge){action=el.dataset.energyActivate?'shield':'shield-recharge';o={uid:el.dataset.energyActivate||el.dataset.energyRecharge};}
  else if(el.dataset.defenseStance==='total'){action='total-defense';}
  else if(el.dataset.action==='force-point-roll'){action='force-bonus';}
  if(el.hasAttribute('data-power-end-turn')||id==='other-turn'){try{endCurrentTurn(c,pack);changed();}catch(e){error(e.message);}return true;}
  if(el.hasAttribute('data-power-rest')){try{endTrackedCombat(c);}catch(e){error(e.message);return true;}return false;}
  if(el.hasAttribute('data-next-turn')){try{beginNextTurn(c,pack);changed();}catch(e){error(e.message);}return true;}
  if(!action)return false;
  try{const r=takeAction(c,pack,action,o);log('roll',r.text,r.html);changed();}catch(e){error(e.message);}return true;
 }
 modal.addEventListener('close',()=>{draft=null;editId=null;owner=null;});
 document.getElementById('actions-close').addEventListener('click',()=>modal.close());
 return {render,legacy,
  bellow(form){if(!current().actionState?.active)return false;try{const o={extraDice:Number(form.querySelector('[data-bellow-dice]').value),strong:!!form.querySelector('[data-bellow-strong]')?.checked,damage:form.querySelector('[data-bellow-damage]')?Number(form.querySelector('[data-bellow-damage]').value):null},r=takeAction(current(),pack,'bellow',o);log('roll',r.text,r.html);changed();}catch(e){error(e.message);}return true;},
  change(el){if(!current().actionState?.active)return false;const c=current();let id,o;
   if(el.dataset.inventory&&['aimed','braced'].includes(el.dataset.inventory)&&el.checked){id=el.dataset.inventory==='aimed'?'aim':'brace';o={uid:c.inventory[Number(el.dataset.index)].uid};}
   else if(el.hasAttribute('data-mighty-swing')&&el.checked){id='mighty-swing';o={};}
   if(!id)return false;try{const r=takeAction(c,pack,id,o);log('resource',r.text);changed();}catch(e){error(e.message);changed();}return true;
  },
  click(el){
   if(el.dataset.actionMenu){menu(el.dataset.actionMenu);return true;}
   const c=current(),s=c.actionState;
   try{
    if(el.hasAttribute('data-turn-next')){beginNextTurn(c,pack);}
    else if(el.hasAttribute('data-turn-end')){if(s?.plan.some(p=>p.status==='waiting'))throw new Error('Resolve the pending Force Point choice');endCurrentTurn(c,pack);}
    else if(el.hasAttribute('data-combat-end'))endTrackedCombat(c);
    else if(el.hasAttribute('data-turn-run')){runPlan();return true;}
    else if(el.dataset.turnFp||el.dataset.turnSkip||el.dataset.turnEnhance){const r=finishForceChoice(c,pack,el.dataset.turnFp||el.dataset.turnSkip||el.dataset.turnEnhance,el.dataset.turnEnhance?'enhance':!!el.dataset.turnFp);log('roll',r.text,r.html);}
    else if(el.hasAttribute('data-turn-clear'))archivePlan(c);
    else if(el.dataset.turnEdit){const step=s.plan.find(p=>p.id===el.dataset.turnEdit);if(step?.status!=='queued')return true;draft={id:step.action,o:structuredClone(step.options)};editId=step.id;owner=c.id;form();modal.showModal();return true;}
    else if(el.dataset.turnDelete){s.plan=s.plan.filter(p=>p.id!==el.dataset.turnDelete||p.status!=='queued');}
    else if(el.dataset.turnUp||el.dataset.turnDown){const id=el.dataset.turnUp||el.dataset.turnDown,i=s.plan.findIndex(p=>p.id===id),j=i+(el.dataset.turnUp?-1:1);if(s.plan[i]?.status==='queued'&&s.plan[j]?.status==='queued')[s.plan[i],s.plan[j]]=[s.plan[j],s.plan[i]];}
    else return false;
    changed();
   }catch(e){error(e.message);}return true;
  },
  refresh(){if(owner&&owner!==current().id)modal.close();}
 };
}
