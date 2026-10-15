import {energyShieldDetails} from './energy-shields.js';
import {escapeHTML as escape} from './wiki-content.js';

export function energyShieldControls(c,d,pack,entry,prefix=''){
 const x=energyShieldDetails(c,d,pack,entry.uid),name=escape(x.record.name),s=x.state;
 return `<details id="${prefix}energy-shield-${entry.uid}"><summary>Shield${s.active?', Active':''}</summary><div class="actions"><label>Charges <input type="number" min="0" max="${x.record.energyShield.charges}" value="${s.charges}" data-energy-charges="${entry.uid}" aria-label="${name} charges"></label><button data-energy-activate="${entry.uid}" ${x.available?'':'disabled'} title="${escape(x.reason||'Swift Action')}">Activate</button>${s.active?`<button data-energy-recharge="${entry.uid}" ${x.rechargeAvailable?'':'disabled'} title="${pack.rules.combat.rechargeActions} Swift Actions; Mechanics DC ${pack.rules.combat.rechargeDC}">Recharge</button>`:''}</div></details>`;
}
export function energyShieldBars(d){
 return (d.energyShields||[]).map(s=>`<div class="resource-bar sr-bar"><div class="resource-fill" style="width:${s.sr/s.energyShield.rating*100}%"></div><span class="resource-label"><abbr title="${escape(s.name)}; pure Energy damage only">SR (Energy)</abbr> <input type="number" min="0" max="${s.energyShield.rating}" value="${s.sr}" data-energy-sr="${s.uid}" aria-label="${escape(s.name)} current SR"><span>/</span><span class="derived">${s.energyShield.rating}</span></span></div>`).join('');
}
