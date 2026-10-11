import {escapeHTML as escape} from './wiki-content.js';
import {catchSecondWind,startRage,advanceRage,recoverCondition,removePersistent,newEncounter,newDay} from './recovery.js';
import {bellowDetails,rollBellow} from './species-actions.js';
import {totalHtml} from './dice.js';

const reference=(id,name)=>`<a href="https://swse.miraheze.org/wiki/${name.replaceAll(' ','_')}" data-rule-page="${id}" aria-label="${name} rules" title="${name}">ⓘ</a>`;
export function createRecoveryControls(pack,{current,derived,changed,log,error}){
 const bellowDice=new Map();
 return {
  health(){
   const c=current(),wind=derived().recovery.secondWind;
   return `<div class="actions"><button data-recovery="second-wind" ${wind.available?'':'disabled'} title="${escape(wind.reason||`Swift Action; +${wind.healing} HP${wind.forceDice?` + ${wind.forceDice}d6 Force Recovery`:''}${wind.exhaustion?'; −1 persistent step':''}`)}">Second Wind${wind.exhaustion?' (Exhaustion)':''}</button><span>${wind.remaining} / ${wind.daily}</span></div><details id="recovery-controls"><summary>Recovery</summary><div class="actions"><button data-recovery="encounter">New encounter</button><button data-recovery="day">New day</button></div>${reference('rule:catch-a-second-wind','Catch a Second Wind')}</details>`;
  },
  condition(){
   const d=derived(),r=d.recovery;
   return `<div class="actions"><button data-recovery="recover" ${r.recoverable?'':'disabled'} title="${pack.rules.recovery.swiftActions} Swift Actions">Recover</button>${reference('rule:recover','Recover')}</div>${r.persistent.length?`<details id="persistent-conditions"><summary>Persistent: ${r.persistent.map(p=>p==='rage'?'Rage':'Second Wind').join(', ')}</summary>${reference('rule:conditions','Conditions')}<div class="actions">${r.persistent.includes('rage')?`<button data-recovery="recuperate" title="No strenuous activity">Recuperate (10 min)</button>`:''}${r.persistent.includes('second-wind')?`<button data-recovery="exhaustion-rest" title="After Surgery or eight consecutive, uninterrupted hours of rest">Remove exhaustion</button>`:''}</div></details>`:''}`;
  },
  species(){
   const c=current(),d=derived(),r=d.recovery.rage,b=bellowDetails(c,d,pack,bellowDice.get(c.id)||0);
   if(b)return `<form id="bellow-controls"><div class="actions"><button type="submit" ${b.available?'':'disabled'} title="Standard Action; −${b.cost} condition steps">Bellow</button><label>Extra d6 <input type="number" min="0" ${b.maxExtra===null?'':`max="${b.maxExtra}"`} data-bellow-dice value="${bellowDice.get(c.id)||0}" aria-label="Bellow extra damage dice"></label><span>${b.damage}; ${b.coneSquares}-square cone</span></div>${b.manual?`<label>Damage <input type="number" min="${b.dice}" max="${Math.min(Number.MAX_SAFE_INTEGER,b.dice*6)}" data-bellow-damage required aria-label="Entered Bellow damage"></label>`:''}${reference('rule:bellow','Bellow')}</form>`;
   if(!r)return '';
   return `<div class="actions">${r.active?`<span>Rage: ${r.rounds} rounds</span><button data-recovery="round">${r.rounds===1?'End Rage':'Next round'}</button>`:`<button data-recovery="rage" ${r.remaining&&!d.incapacitated?'':'disabled'} title="Swift Action; ${r.duration} rounds">Rage</button><span>${r.remaining} / ${r.daily}</span>`}</div>`;
  },
  change(el){
   if(!el.hasAttribute('data-bellow-dice'))return false;
   const n=Number(el.value),b=bellowDetails(current(),derived(),pack,n);
   if(!b)return true;
   if(el.value.trim()===''||!Number.isSafeInteger(n)||n<0||!Number.isSafeInteger(n+3)||b.maxExtra!==null&&n>b.maxExtra){error('Enter valid extra dice');changed();return true;}
   bellowDice.set(current().id,n);changed();return true;
  },
  bellow(form){
   try{
    const c=current(),n=Number(form.querySelector('[data-bellow-dice]').value),el=form.querySelector('[data-bellow-damage]');
    const result=rollBellow(c,derived(),pack,n,el?Number(el.value):null);
    log('roll',`${result.text}; −${result.cost} condition steps`,`${result.html}<div>−${result.cost} condition steps</div>`);changed();
   }catch(e){error(e.message);}
  },
  click(el){
   const action=el.dataset.recovery;if(!action)return false;
   const c=current(),d=derived();
   try{
    if(action==='second-wind'){const result=catchSecondWind(c,d,pack),text=`Second Wind: +${result.healed} HP${result.forceRecovery?` (Force Recovery +${result.forceRecovery})`:''}${result.exhaustion?'; −1 persistent step':''}`;log('hp',text,result.forceRoll?`${escape(text)}<details><summary>Force Recovery</summary>${result.forceRoll.display} = ${totalHtml(result.forceRoll)}</details>`:undefined);}
    else if(action==='rage'){startRage(c,d);log('condition',`Rage: ${d.recovery.rage.duration} rounds`);}
    else if(action==='round'){advanceRage(c);if(!c.recovery.rageRounds)log('condition','Rage ended: −1 persistent step');}
    else if(action==='recover'){recoverCondition(c,d);log('condition',`Recover: ${pack.rules.recovery.swiftActions} Swift Actions; +1 step`);}
    else if(action==='recuperate'){removePersistent(c,'rage');log('condition','Rage: persistent condition removed after 10 minutes recuperation');}
    else if(action==='exhaustion-rest'){removePersistent(c,'second-wind');log('condition','Second Wind: persistent condition removed after 8 hours rest or Surgery');}
    else if(action==='encounter')newEncounter(c);
    else if(action==='day')newDay(c);
    else return false;
    changed();
   }catch(e){error(e.message);}
   return true;
  }
 };
}
