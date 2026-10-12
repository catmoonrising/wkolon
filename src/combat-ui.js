import {acrobaticsPath,validateAcrobaticsMovement} from './acrobatics-movement.js';
import {acrobaticsMove,proneAction} from './acrobatics-movement-actions.js';
import {acrobaticsMoveIssue,acrobaticsMoveCostLabel} from './acrobatics-movement-ui.js';
import {followUpState,validateFollowUps,clearFollowUps,nextCombatantTurn} from './attack-follow-ups.js';
import {rollCleave,cleaveIssue,followThrough} from './attack-follow-up-actions.js';
import {followThroughIssue,followUpCostLabel} from './attack-follow-up-ui.js';
import {rollRoutineStep,routineStepPlan} from './routine-steps.js';
import {runningPath,withdrawPath,validateCombatMovement} from './combat-movement.js';
import {rollRunningAttack,runningAttackIssue,runningAttackView,withdraw} from './combat-movement-actions.js';
import {runningCostLabel,withdrawCostLabel,withdrawIssue} from './combat-movement-ui.js';
import {rollOpportunity,opportunityIssue,opportunityView} from './opportunity-actions.js';
import {opportunityContext,validateOpportunity,startNextRound} from './opportunity.js';
import {escapeHTML as escape} from './wiki-content.js';
import {rollCombatRoutine,rollCharge,routineIssue} from './combat.js';
import {reloadWeapon,spendAttackResources} from './ammunition.js';
import {applyIncomingDamage} from './incoming-damage.js';
import {planFullAttack,FULL_ATTACK_NAMES} from './full-attacks.js';

const input=(key,value,label,max=100000)=>`<input type="number" min="0" max="${max}" data-field="${key}" value="${value}" aria-label="${label}">`;
const percent=(current,max)=>max>0?Math.max(0,Math.min(100,current/max*100)):0;
export function statBar(kind,label,current,max,key,attrs=''){
 const name=label||{'force':'Force points','dark-side':'Dark side score'}[kind]||kind;
 return `<div class="resource-bar ${kind}-bar" ${attrs}><div class="resource-fill" style="width:${percent(current,max)}%"></div><span class="resource-label">${label?`${label} `:''}${input(key,current,name,kind==='xp'?1000000000:kind==='force'?1000:kind==='dark-side'?max:100000)}<span>/</span><span>${max.toLocaleString()}</span></span></div>`;
}
export function healthBars(c,d){
 const p=c.protection;
 return `<div class="hp-bars"><div class="resource-bar sr-bar"><div class="resource-fill" style="width:${percent(p.sr,p.srMax)}%"></div><span class="resource-label"><abbr title="Shield Rating">SR</abbr> ${input('protection.sr',p.sr,'Current SR',p.srMax)}<span>/</span>${input('protection.srMax',p.srMax,'Maximum SR')}</span></div><div class="resource-bar dr-bar"><div class="resource-fill" style="width:${percent(p.dr,d.hp)}%"></div><span class="resource-label"><abbr title="Damage Reduction">DR</abbr> ${input('protection.dr',p.dr,'Damage reduction')}</span></div><div class="hp-bar"><div class="hp-fill" style="width:${percent(c.currentHP??d.hp,d.hp)}%"></div><span class="hp-bar-text"><input id="hp-cur" aria-label="Current HP" type="number" min="0" max="100000" data-field="currentHP" value="${c.currentHP??d.hp}"><span class="hp-slash">/</span><span class="derived">${d.hp}</span></span></div></div><details id="hp-damage-controls"><summary>Damage</summary><form id="apply-damage" class="actions"><input type="number" min="0" max="1000000000" value="0" aria-label="Incoming damage" data-incoming-damage><select data-damage-type aria-label="Incoming damage type"><option value="normal">Normal</option><option value="stun">Stun</option><option value="ion">Ion</option></select><label><input type="checkbox" data-ignore-dr>Ignore DR</label>${d.forceCurrent>0?'<label><input type="checkbox" data-survive-fp>1 FP to survive</label>':''}<button type="submit" ${d.recovery.dead?'disabled':''}>Apply</button></form><label><input type="checkbox" data-combat-cybernetic ${c.cybernetic?'checked':''}>Cybernetic</label><label>DR exceptions <input data-field="protection.drBypass" value="${escape(p.drBypass)}" maxlength="2000"></label><div class="hint"><a href="https://swse.miraheze.org/wiki/Stun_Damage" data-rule-page="rule:stun-damage">Stun</a> · <a href="https://swse.miraheze.org/wiki/Ion_Damage" data-rule-page="rule:ion-damage">Ion</a> · <a href="https://swse.miraheze.org/wiki/Damage_Reduction" target="_blank" rel="noopener">DR</a> · <a href="https://swse.miraheze.org/wiki/Shield_Rating" target="_blank" rel="noopener">SR</a></div></details>`;
}
export function xpBar(c,d,rules){
 const floor=d.level*(d.level-1)/2*rules.xpStep,next=d.nextXP;
 const fill=next===null?100:percent(c.xp-floor,next-floor);
 return `<div class="xp-bar xp-group"><div class="xp-meter" role="progressbar" aria-label="XP progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(fill)}"><div class="resource-fill" style="width:${fill}%"></div></div><label>XP ${input('xp',c.xp,'Experience points',1000000000)}${next===null?'':`<span>/</span><span>${next.toLocaleString()}</span>`}</label></div>`;
}
export function createCombatControls(pack,{current,derived,changed,save,log,error}){
 function editAcrobaticsMovement(el,report=false){
  const c=current(),p=acrobaticsPath(c),[key,sub]=el.dataset.acrobaticsMovement.split('.');
  if(sub)p[key][sub]=Number(el.value);else p[key]=el.type==='checkbox'?el.checked:['check','terrainCheck','occupied'].includes(key)?(el.value===''&&['check','terrainCheck'].includes(key)?null:Number(el.value)):el.value;
  try{validateAcrobaticsMovement({...c,acrobaticsMovement:p},message=>{throw new Error('Invalid '+message);});c.acrobaticsMovement=p;save();
   const d=derived(),issue=acrobaticsMoveIssue(c,d,pack);
   for(const button of document.querySelectorAll('[data-combat="acrobatics-move"]')){button.disabled=!!issue;button.title=issue||'Move Action'+(p.tumble||p.crossTerrain?'; DC 15 trained Acrobatics':'');}
   for(const label of document.querySelectorAll('[data-acrobatics-cost]'))label.textContent=acrobaticsMoveCostLabel(c,d,pack);
   return true;
  }catch(e){if(report){error(e.message);changed();}return false;}
 }
 function editFollowUp(el,report=false){
  const c=current(),p=structuredClone(followUpState(c)),[key,sub]=el.dataset.followUp.split('.');
  const value=el.type==='checkbox'?el.checked:sub?Number(el.value):el.value;
  if(sub)p[key][sub]=value;else p[key]=value;
  if(key==='selected'){p.dropped=false;p.immediate=false;p.inReach=false;}
  try{validateFollowUps({...c,followUp:p},message=>{throw new Error('Invalid '+message);});c.followUp=p;save();
   for(const input of document.querySelectorAll('[data-follow-up]'))if(input!==el&&input.dataset.followUp===el.dataset.followUp){if(el.type==='checkbox')input.checked=el.checked;else input.value=el.value;}
   const d=derived(),issues={cleave:cleaveIssue(c,pack),'follow-through':followThroughIssue(c,d,pack)};
   for(const [action,issue] of Object.entries(issues))for(const button of document.querySelectorAll(`[data-combat="${action}"]`)){button.disabled=!!issue;button.title=issue||'';}
   for(const label of document.querySelectorAll('[data-follow-up-cost]'))label.textContent=followUpCostLabel(c,d,pack);
   return true;
  }catch(e){if(report){error(e.message);changed();}return false;}
 }
 function interruptRoutine(c,r){if(c.routineProgress?.id===r.id){delete c.routineProgress;clearFollowUps(c);}}
 function editMovement(el,report=false){
  const c=current(),[root,segment,key]=el.dataset.movement.split('.'),p=root==='runningAttack'?runningPath(c):withdrawPath(c);
  if(key)p[segment][key]=Number(el.value);else p[segment]=el.type==='checkbox'?el.checked:el.value;
  try{validateCombatMovement({...c,[root]:p},message=>{throw new Error('Invalid '+message);});c[root]=p;save();
   for(const input of document.querySelectorAll('[data-movement]'))if(input!==el&&input.dataset.movement===el.dataset.movement){if(el.type==='checkbox')input.checked=el.checked;else input.value=el.value;}
   const view=runningAttackView(c,pack);
   for(const button of document.querySelectorAll('[data-combat="running-attack"]')){const issue=runningAttackIssue(c,pack,button.dataset.attackId,view);button.disabled=!!issue;button.title=issue||'One weapon attack; move before and after';}
   for(const button of document.querySelectorAll('[data-combat="withdraw"]')){const issue=withdrawIssue(c,derived(),pack);button.disabled=!!issue;button.title=issue||'Move Action; only the first square avoids attacks of opportunity';}
   for(const label of document.querySelectorAll('[data-running-cost]'))label.textContent=runningCostLabel(c,derived(),pack);
   for(const label of document.querySelectorAll('[data-withdraw-cost]'))label.textContent=withdrawCostLabel(c,derived(),pack);
   return true;
  }catch(e){if(report){error(e.message);changed();}return false;}
 }
 function editOpportunity(el,report=false){
  const c=current(),p=opportunityContext(c),key=el.dataset.opportunity;
  p[key]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value;
  try{validateOpportunity({...c,opportunity:p},message=>{throw new Error('Invalid '+message);});c.opportunity=p;save();
   const view=opportunityView(c,pack);
   for(const button of document.querySelectorAll('[data-combat="opportunity"]')){const issue=opportunityIssue(c,pack,button.dataset.attackId,view);button.disabled=!!issue;button.title=issue||'Single free attack';}
   return true;
  }catch(e){if(report){error(e.message);changed();}return false;}
 }
 function run(routine){
  if(derived().incapacitated)return;
  try{
   const result=rollCombatRoutine(routine,derived(),pack);
   spendAttackResources(current(),result);
   log('roll',result.text,result.html);changed();
  }catch(e){error(e.message);}
 }
 const choices=(selected)=>{
  const attacks=derived().attacks;
  return `${attacks.some(a=>a.uid===selected)?'':`<option value="${selected||''}" selected>${selected?'Attack unavailable':'Choose attack'}</option>`}${attacks.map(a=>`<option value="${a.uid}" ${a.uid===selected?'selected':''}>${escape(a.name)}</option>`).join('')}`;
 };
 function renderRoutines(){
  const c=current(),d=derived();
  const fieldsets=c.routines.map(r=>{
   const full=r.kind==='fullAttack';let plan,issue,stepIssue;
   try{routineStepPlan(c,d,pack,r.id);stepIssue='';}catch(e){stepIssue=e.message;}
   try{plan=planFullAttack(r,d,pack);issue=routineIssue(r,plan.attacks);}catch(e){issue=e.message;}
   const used=r.steps.map(s=>s.source),sources=[['twoWeapons',true],['doubleAttack',d.fullAttack.doubleChoices.length],['tripleAttack',d.fullAttack.tripleChoices.length&&used.includes('doubleAttack')]].filter(([s,on])=>on&&!used.includes(s));
   return `<fieldset data-routine="${r.id}"><legend><input data-routine-field="name" data-routine="${r.id}" value="${escape(r.name)}" maxlength="200" aria-label="Routine name"><button data-combat="run" data-routine="${r.id}" ${d.incapacitated||issue?'disabled':''} title="${escape(issue||'')}">▶ Run</button><button data-combat="step" data-routine="${r.id}" ${stepIssue?'disabled':''} title="${escape(stepIssue||'Resolve one attack, then its follow-ups')}">Step${c.routineProgress?.id===r.id?' '+(c.routineProgress.index+1):''}</button>${c.routineProgress?.id===r.id?'<button data-combat="restart">Restart</button>':''}<button data-combat="delete-routine" data-routine="${r.id}" aria-label="Delete routine">×</button></legend>${full?`<div class="actions"><a href="https://swse.miraheze.org/wiki/Full_Attacks" data-rule-page="rule:full-attacks">Full Attack</a>${plan?`<span title="Attack penalty until the start of your next turn">${plan.penalty<0?'−'+Math.abs(plan.penalty):'±0'}</span>`:''}${issue?`<span class="hint">${escape(issue)}</span>`:''}</div>`:''}${r.steps.map((s,i)=>`<div class="routine-step" data-routine="${r.id}" data-step-id="${s.id}"><div class="actions">${full?`<span>${FULL_ATTACK_NAMES[s.source]}</span>`:`<input type="number" min="1" max="20" value="${s.count}" data-routine-field="count" aria-label="Attack count">×`} <select data-routine-field="attackId" aria-label="${full?FULL_ATTACK_NAMES[s.source]+' weapon':'Routine attack'}">${choices(s.attackId)}</select><button data-combat="move-up" aria-label="Move attack up" ${i===0?'disabled':''}>↑</button><button data-combat="move-down" aria-label="Move attack down" ${i===r.steps.length-1?'disabled':''}>↓</button><button data-combat="delete-step" aria-label="Remove attack" ${full&&s.source==='base'?'disabled':''}>×</button></div><details id="routine-modifiers-${s.id}"><summary>Modifiers</summary><div class="actions"><label>Attack <input type="number" min="-1000" max="1000" value="${s.attackMod}" data-routine-field="attackMod" aria-label="Routine attack modifier"></label><label>Damage <input type="number" min="-1000" max="1000" value="${s.damageMod}" data-routine-field="damageMod" aria-label="Routine damage modifier"></label></div></details></div>`).join('')}${full?`<select data-full-source aria-label="Add extra attack" ${sources.length?'':'disabled'}><option value="">+ Attack</option>${sources.map(([s])=>`<option value="${s}">${FULL_ATTACK_NAMES[s]}</option>`).join('')}</select>`:`<button data-combat="add-step" data-routine="${r.id}" ${!d.attacks.length||r.steps.length>=50||r.steps.reduce((n,s)=>n+s.count,0)>=100?'disabled':''}>+ Attack</button>`}</fieldset>`;
  }).join('');
  return `<div id="routines-list">${fieldsets}</div><div class="actions"><button data-combat="add-routine" ${c.routines.length>=20?'disabled':''}>+ Routine</button><button data-combat="add-full-attack" ${c.routines.length>=20||!d.attacks.length?'disabled':''}>+ Full Attack</button>${d.fullAttack.penalty?'<button data-next-turn>Next turn</button>':''}</div>`;
 }
 function edit(el){
  if(!el.dataset.routineField)return false;
  const r=current().routines.find(r=>r.id===el.closest('[data-routine]').dataset.routine);
  if(!r)return true;
  const key=el.dataset.routineField;
  if(key==='name'){r.name=el.value;save();return true;}
  const step=r.steps.find(s=>s.id===el.closest('[data-step-id]')?.dataset.stepId);if(!step)return true;
  const value=key==='attackId'?el.value:Number(el.value);
  if(key!=='attackId'&&(!Number.isInteger(value)||value<Number(el.min)||value>Number(el.max))){error('Enter a valid modifier or count');changed();return true;}
  if(key==='count'&&r.steps.reduce((n,s)=>n+(s===step?value:s.count),0)>100){error('Maximum 100 attacks per routine');changed();return true;}
  interruptRoutine(current(),r);step[key]=value;changed();return true;
 }
 return {renderRoutines,
  input(event){if(event.target.hasAttribute('data-acrobatics-movement')&&event.target.type!=='checkbox'){editAcrobaticsMovement(event.target);return true;}if(event.target.hasAttribute('data-follow-up')&&event.target.type!=='checkbox'){editFollowUp(event.target);return true;}if(event.target.hasAttribute('data-movement')&&event.target.type==='number'){editMovement(event.target);return true;}if(event.target.hasAttribute('data-opportunity')&&event.target.type!=='checkbox'){editOpportunity(event.target);return true;}if(event.target.dataset.routineField==='name')return edit(event.target);if(event.target.dataset.field==='protection.drBypass'){current().protection.drBypass=event.target.value;save();return true;}return false;},
  change(el){
   if(el.hasAttribute('data-acrobatics-movement')){if(editAcrobaticsMovement(el,true)&&(el.type==='checkbox'||el.tagName==='SELECT'))changed();return true;}
   if(el.hasAttribute('data-follow-up')){if(editFollowUp(el,true)&&(el.type==='checkbox'||el.tagName==='SELECT'))changed();return true;}
   if(el.hasAttribute('data-movement')){editMovement(el,true);return true;}
   if(el.hasAttribute('data-opportunity')){if(editOpportunity(el,true)&&el.type==='checkbox')changed();return true;}
   if(el.hasAttribute('data-combat-cybernetic')){current().cybernetic=el.checked;changed();return true;}
   if(el.hasAttribute('data-full-source')){
    const r=current().routines.find(r=>r.id===el.closest('[data-routine]').dataset.routine),d=derived(),source=el.value;
    if(r?.kind!=='fullAttack'||!['twoWeapons','doubleAttack','tripleAttack'].includes(source)||r.steps.some(s=>s.source===source))return true;
    const base=d.attacks.find(a=>a.uid===r.steps.find(s=>s.source==='base')?.attackId),groups=source==='doubleAttack'?d.fullAttack.doubleChoices:d.fullAttack.tripleChoices;
    const attack=source==='twoWeapons'?(base?.fullAttackGrip.double?base:d.attacks.find(a=>a.uid!==base?.uid&&a.fullAttackGrip.oneHanded)):
      d.attacks.find(a=>groups.includes(a.group)||groups.includes(a.id));
    interruptRoutine(current(),r);r.steps.push({id:crypto.randomUUID(),source,attackId:(attack||d.attacks[0]).uid,count:1,attackMod:0,damageMod:0});changed();return true;
   }
   return edit(el);
  },
  click(el){
   const action=el?.dataset.combat;if(!action)return false;
   if(action==='acrobatics-move'){try{const result=acrobaticsMove(current(),derived(),pack);log(result.rolled?'roll':'resource',result.text,result.html);changed();}catch(e){error(e.message);}return true;}
   if(action==='prone-action'||action==='acrobatics-prone'){try{const result=proneAction(current(),derived(),pack,action==='acrobatics-prone');log(result.rolled?'roll':'resource',result.text,result.html);changed();}catch(e){error(e.message);}return true;}
   if(action==='cleave'){try{const result=rollCleave(current(),pack);spendAttackResources(current(),result);log('roll',result.text,result.html);changed();}catch(e){error(e.message);}return true;}
   if(action==='follow-through'){try{const result=followThrough(current(),derived(),pack);log('resource',result.text);changed();}catch(e){error(e.message);}return true;}
   if(action==='other-turn'){nextCombatantTurn(current());changed();return true;}
   if(action==='running-attack'){try{const result=rollRunningAttack(current(),pack,el.dataset.attackId);spendAttackResources(current(),result);log('roll',result.text,result.html);changed();}catch(e){error(e.message);}return true;}
   if(action==='withdraw'){try{const result=withdraw(current(),derived(),pack);log('resource',result.text);changed();}catch(e){error(e.message);}return true;}
   if(action==='next-round'){startNextRound(current());changed();return true;}
   if(action==='opportunity'){try{const result=rollOpportunity(current(),pack,el.dataset.attackId);spendAttackResources(current(),result);log('roll',result.text,result.html);changed();}catch(e){error(e.message);}return true;}
   if(action==='charge'){
    try{const result=rollCharge(current(),derived(),pack,el.dataset.attackId);spendAttackResources(current(),result);log('roll',result.text,result.html);changed();}catch(e){error(e.message);}return true;
   }
   if(action==='attack'){const a=derived().attacks.find(a=>a.uid===el.dataset.attackId);if(a)run({name:a.name,steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]});return true;}
   if(action==='reload'){
    if(derived().incapacitated)return true;
    try{const c=current(),p=reloadWeapon(c,pack,el.dataset.attackId),entry=c.inventory.find(e=>e.uid===el.dataset.attackId);log('resource',`${pack.equipment.find(w=>w.id===entry.id).name}: Reload ${p.capacity} ${p.capacity===1?'shot':'shots'} (${p.reloadAction.replaceAll('-',' ')})`);changed();}catch(e){error(e.message);}return true;
   }
   const c=current(),r=c.routines.find(r=>r.id===el.closest('[data-routine]')?.dataset.routine);
   const stepIndex=r?.steps.findIndex(s=>s.id===el.closest('[data-step-id]')?.dataset.stepId);
   if(action==='add-routine'){if(c.routines.length>=20)return true;c.routines.push({id:crypto.randomUUID(),name:'',steps:[]});}
   else if(action==='add-full-attack'){if(c.routines.length>=20||!derived().attacks.length)return true;c.routines.push({id:crypto.randomUUID(),name:'Full Attack',kind:'fullAttack',steps:[{id:crypto.randomUUID(),source:'base',attackId:derived().attacks[0].uid,count:1,attackMod:0,damageMod:0}]});}
   else if(!r)return true;
   else if(action==='run'){run(r);return true;}
   else if(action==='step'){try{const result=rollRoutineStep(c,derived(),pack,r.id);spendAttackResources(c,result);log('roll',result.text,result.html);changed();}catch(e){error(e.message);}return true;}
   else if(action==='restart'){interruptRoutine(c,r);changed();return true;}
   else if(action==='delete-routine'){interruptRoutine(c,r);c.routines.splice(c.routines.indexOf(r),1);}
   else if(action==='add-step'){if(r.kind==='fullAttack'||!derived().attacks.length||r.steps.length>=50||r.steps.reduce((n,s)=>n+s.count,0)>=100)return true;r.steps.push({id:crypto.randomUUID(),attackId:derived().attacks[0].uid,count:1,attackMod:0,damageMod:0});}
   else if(action==='delete-step'){if(r.kind==='fullAttack'&&r.steps[stepIndex]?.source==='base')return true;r.steps.splice(stepIndex,1);}
   else if(action==='move-up'||action==='move-down'){const next=stepIndex+(action==='move-up'?-1:1);if(stepIndex<0||next<0||next>=r.steps.length)return true;[r.steps[stepIndex],r.steps[next]]=[r.steps[next],r.steps[stepIndex]];}
   if(r)interruptRoutine(c,r);
   changed();return true;
  },
  damage(form){
   const el=form.querySelector('[data-incoming-damage]'),amount=Number(el.value);
   try{
    const c=current(),d=derived(),before=c.protection.sr;
    const result=applyIncomingDamage(c,d,pack,amount,{type:form.querySelector('[data-damage-type]').value,ignoreDR:form.querySelector('[data-ignore-dr]').checked,spendForcePoint:form.querySelector('[data-survive-fp]')?.checked});
    log('hp',`${result.type==='normal'?'Damage':result.type==='stun'?'Stun':'Ion'} ${amount}: ${result.immune?'Immune':`SR −${result.srBlocked}, DR −${result.drBlocked}; HP ${result.beforeHP} → ${result.afterHP}${result.conditionSteps?`; −${result.conditionSteps} condition steps`:''}${result.dead?'; '+(pack.species.find(s=>s.id===c.species).isDroid?'Destroyed':'Dead'):''}${result.forcePointSpent?'; −1 Force Point':''}${before!==result.srAfter?`; SR ${before} → ${result.srAfter}`:''}`}`);changed();
   }catch(e){error(e.message);}
  }
 };
}
