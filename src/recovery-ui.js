import {escapeHTML as escape} from './wiki-content.js';
import {catchSecondWind,startRage,advanceRage,recoverCondition,removePersistent,newEncounter,newDay,persistentName,setPersistent,setDead,receiveHealing,restEightHours,checkConsciousness,loseLimb,removeLimb,setLimbPersistent,recoveryState} from './recovery.js';
import {bellowDetails,rollBellow} from './species-actions.js';
import {totalHtml} from './dice.js';
import {ambiguityValue} from './house-rules.js';

const reference=(id,name,page=name)=>`<a href="https://swse.miraheze.org/wiki/${page.replaceAll(' ','_')}" data-rule-page="${id}" aria-label="${name} rules" title="${name}">ⓘ</a>`;
export function createRecoveryControls(pack,{current,derived,changed,log,error}){
 const bellowDice=new Map(),strongBellow=new Map();
 const bellowOptions=c=>({strong:!!strongBellow.get(c.id)&&!c.recovery?.strongBellowUsed});
 return {
  health(){
   const c=current(),d=derived(),r=d.recovery,wind=r.secondWind,isDroid=pack.species.find(s=>s.id===c.species).isDroid;
   const restHP=r.unconscious.available&&ambiguityValue(c,pack,'ambiguity:unconscious-healing')==='replace'?`HP becomes ${r.naturalHealing.amount}`:`+${r.naturalHealing.amount} HP`;
   return `<div class="actions"><button data-recovery="second-wind" ${wind.available?'':'disabled'} title="${escape(wind.reason||`${wind.action}; +${wind.healing} HP${wind.conditionRecovery?`; +${wind.conditionRecovery} condition step`:""}${wind.forceDice?` + ${wind.forceDice}d6 Force Recovery`:''}${wind.exhaustion?'; −1 persistent step':''}`)}">Second Wind${wind.exhaustion?' (Exhaustion)':''}</button><span>${wind.remaining} / ${wind.daily}</span>${reference('rule:catch-a-second-wind','Catch a Second Wind')}</div><details id="recovery-controls"><summary>Recovery</summary><div class="actions"><button data-recovery="encounter">New encounter</button><button data-recovery="day" title="Advance 24 hours of game time">New day</button></div><div class="actions"><button data-recovery="rest" ${r.naturalHealing.available?'':'disabled'} title="Eight consecutive, uninterrupted hours; ${r.naturalHealing.used?'natural healing already used today':`${restHP} if no persistent conditions remain`}">Rest (8h)</button>${reference('rule:hit-points-natural-healing','Natural Healing')}</div><form id="recovery-healing" class="actions"><label>${isDroid?'Repair':'Healing'} <input type="number" min="1" max="100000" value="1" data-received-healing aria-label="Received ${isDroid?'repair':'healing'} HP" required></label><button type="submit" ${r.dead?'disabled':''}>Apply</button>${reference('rule:hit-points-falling-unconscious','Unconscious')}</form>${r.unconscious.available?`<label><input type="checkbox" data-stun-unconscious ${c.recovery?.stunUnconscious?'checked':''}>Stunned</label><div class="actions"><button data-recovery="consciousness" title="After ${r.unconscious.retry?pack.rules.unconsciousRecovery.retryHours+' hour':pack.rules.unconsciousRecovery.firstMinutes+' minute'}; DC ${pack.rules.unconsciousRecovery.dc}">CON check (${r.unconscious.retry?'1h':'1 min'})</button></div>`:''}<label><input type="checkbox" data-recovery-dead ${r.dead?'checked':''}>${isDroid?'Destroyed':'Dead'}</label> ${reference('rule:hit-points','Hit Points')}</details>`;
  },
  condition(){
   const d=derived(),r=d.recovery;
   return `${r.dead?'<p><b>'+ (pack.species.find(s=>s.id===current().species).isDroid?'Destroyed':'Dead')+'</b></p>':''}<div class="actions"><button data-recovery="recover" ${r.recoverable?'':'disabled'} title="${pack.rules.recovery.swiftActions} Swift Actions">Recover</button>${reference('rule:recover','Recover')}</div><details id="persistent-conditions"><summary>Persistent${r.persistent.length?': '+r.persistent.map(persistentName).join(', '):''}</summary><label><input type="checkbox" data-recovery-persistent ${r.persistent.includes('other')?'checked':''}>Other</label> ${reference('rule:conditions','Conditions')}<div class="actions">${r.persistent.includes('rage')?`<button data-recovery="recuperate" title="No strenuous activity">Recuperate (10 min)</button>`:''}${r.persistent.includes('second-wind')?`<button data-recovery="exhaustion-rest" title="After Surgery or eight consecutive, uninterrupted hours of rest">Remove exhaustion</button>`:''}${r.persistent.includes('injury')?'<button data-recovery="surgery" title="After successful Surgery">Surgery</button>':''}</div></details>`;
  },
  species(){
   const c=current(),d=derived(),r=d.recovery.rage,b=bellowDetails(c,d,pack,bellowDice.get(c.id)||0,bellowOptions(c));
   const regeneration=pack.species.find(s=>s.id===c.species).limbRegeneration;
   if(regeneration)return `<details id="limb-regeneration"><summary>Limb Regeneration</summary><form id="recovery-limb" class="actions"><input data-lost-limb maxlength="100" placeholder="Limb" aria-label="Lost limb" required><label><input type="checkbox" data-new-limb-persistent checked>Persistent</label><button type="submit" ${d.recovery.dead||d.recovery.limbs.length>=20?'disabled':''}>Lost limb</button>${reference('rule:trandoshan-limb-regeneration','Limb Regeneration','Trandoshan#Trandoshan_Species_Traits')}</form>${d.recovery.limbs.map(l=>`<div class="actions"><span>${escape(l.name)}: ${l.days} day${l.days===1?'':'s'}</span><label><input type="checkbox" data-limb-persistent="${l.id}" ${l.persistent?'checked':''} aria-label="Persistent ${escape(l.name)} injury">Persistent</label><button data-recovery="remove-limb" data-limb-id="${l.id}" aria-label="Remove ${escape(l.name)} injury" title="Remove injury">×</button></div>`).join('')}</details>`;
   if(b)return `<form id="bellow-controls"><div class="actions"><button type="submit" ${b.available?'':'disabled'} title="Standard Action; −${b.cost} condition steps">Bellow</button><label>Extra d6 <input type="number" min="0" ${b.maxExtra===null?'':`max="${b.maxExtra}"`} data-bellow-dice value="${bellowDice.get(c.id)||0}" aria-label="Bellow extra damage dice"></label><span>${b.damage}; ${b.coneSquares}-square cone</span>${d.bellowBonuses.conditionReduction?`<label><input type="checkbox" data-bellow-strong ${b.strong?'checked':''} ${b.strongAvailable?'':'disabled'} title="Once per encounter; one less Condition Track step">Strong Bellow</label>`:''}</div>${b.manual?`<label>Damage <input type="number" min="${b.dice}" max="${Math.min(Number.MAX_SAFE_INTEGER,b.dice*6)}" data-bellow-damage required aria-label="Entered Bellow damage"></label>`:''}${reference('rule:bellow','Bellow')}</form>`;
   if(!r)return '';
   return `<div class="actions">${r.active?`<span>Rage: ${r.rounds} rounds</span><button data-recovery="round">${r.rounds===1?'End Rage':'Next round'}</button>`:`<button data-recovery="rage" ${r.remaining&&!d.incapacitated?'':'disabled'} title="Swift Action; ${r.duration} rounds">Rage</button><span>${r.remaining} / ${r.daily}</span>`}</div>`;
  },
  change(el){
   if(el.hasAttribute('data-bellow-strong')){strongBellow.set(current().id,el.checked);changed();return true;}
   if(el.hasAttribute('data-limb-persistent')){setLimbPersistent(current(),el.dataset.limbPersistent,el.checked);changed();return true;}
   if(el.hasAttribute('data-recovery-persistent')){setPersistent(current(),'other',el.checked);changed();return true;}
   if(el.hasAttribute('data-stun-unconscious')){current().recovery=recoveryState(current());current().recovery.stunUnconscious=el.checked;changed();return true;}
   if(el.hasAttribute('data-recovery-dead')){setDead(current(),el.checked);changed();return true;}
   if(!el.hasAttribute('data-bellow-dice'))return false;
   const n=Number(el.value),b=bellowDetails(current(),derived(),pack,n,bellowOptions(current()));
   if(!b)return true;
   if(el.value.trim()===''||!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(n+3)||b.maxExtra!==null&&n>b.maxExtra){error('Enter valid extra dice');changed();return true;}
   bellowDice.set(current().id,n);changed();return true;
  },
  submit(form){
   if(!['recovery-healing','recovery-limb'].includes(form.id))return false;
   try{
    if(form.id==='recovery-healing'){
     const amount=Number(form.querySelector('[data-received-healing]').value),result=receiveHealing(current(),derived(),pack,amount);
     log('hp',`Healing: HP ${result.before} → ${result.after}${result.revived?'; +1 condition step; Prone':''}`);
    }else{
     const result=loseLimb(current(),pack,form.querySelector('[data-lost-limb]').value,undefined,form.querySelector('[data-new-limb-persistent]').checked);
     log('condition',`${result.name}: regeneration in ${result.rolled.value} days`,`${escape(result.name)}: ${result.rolled.display} = ${totalHtml(result.rolled)} days`);
    }
    changed();
   }catch(e){error(e.message);}
   return true;
  },
  bellow(form){
   try{
    const c=current(),n=Number(form.querySelector('[data-bellow-dice]').value),el=form.querySelector('[data-bellow-damage]');
    const result=rollBellow(c,derived(),pack,n,el?Number(el.value):null,undefined,bellowOptions(c));
    log('roll',`${result.text}; −${result.cost} condition steps`,`${result.html}<div>−${result.cost} condition steps</div>`);changed();
   }catch(e){error(e.message);}
  },
  click(el){
   const action=el.dataset.recovery;if(!action)return false;
   const c=current(),d=derived();
   try{
    if(action==='second-wind'){const result=catchSecondWind(c,d,pack),text=`Second Wind: +${result.healed} HP${result.conditionRecovery?`; +${result.conditionRecovery} condition step`:""}${result.forceRecovery?` (Force Recovery +${result.forceRecovery})`:''}${result.exhaustion?'; −1 persistent step':''}`;log('hp',text,result.forceRoll?`${escape(text)}<details><summary>Force Recovery</summary>${result.forceRoll.display} = ${totalHtml(result.forceRoll)}</details>`:undefined);}
    else if(action==='rage'){startRage(c,d);log('condition',`Rage: ${d.recovery.rage.duration} rounds`);}
    else if(action==='round'){advanceRage(c);if(!c.recovery.rageRounds)log('condition','Rage ended: −1 persistent step');}
    else if(action==='recover'){recoverCondition(c,d);log('condition',`Recover: ${pack.rules.recovery.swiftActions} Swift Actions; +1 step`);}
    else if(action==='recuperate'){removePersistent(c,'rage');log('condition','Rage: persistent condition removed after 10 minutes recuperation');}
    else if(action==='exhaustion-rest'){removePersistent(c,'second-wind');log('condition','Second Wind: persistent condition removed after 8 hours rest or Surgery');}
    else if(action==='surgery'){removePersistent(c,'injury');log('condition','Injury: persistent condition removed after Surgery');}
    else if(action==='rest'){const result=restEightHours(c,d,pack);log('hp',`Rest (8h): HP ${result.before} → ${result.after}${result.blocked?'; persistent condition remains':''}`);}
    else if(action==='consciousness'){const result=checkConsciousness(c,d,pack),outcome=result.dead?'Death':result.success?'Conscious; +1 step; Prone':'Unconscious; retry after 1 hour';log('roll',`CON: ${result.rolled.value}; ${outcome}`,`${result.rolled.display} = ${totalHtml(result.rolled)}; ${escape(outcome)}`);}
    else if(action==='remove-limb')removeLimb(c,el.dataset.limbId);
    else if(action==='encounter')newEncounter(c);
    else if(action==='day'){const regrown=newDay(c,pack);if(regrown.length)log('condition',`Regrown: ${regrown.join(', ')}`);}
    else return false;
    changed();
   }catch(e){error(e.message);}
   return true;
  }
 };
}
