import {escapeHTML as escape} from './wiki-content.js';
import {opportunityContext,opportunityState} from './opportunity.js';
import {opportunityIssue} from './opportunity-actions.js';

export function opportunityControls(c,d,pack,scope=''){
 const p=opportunityContext(c),s=opportunityState(c,pack,d.ctx,d.mods);
 return `<details id="${scope}attack-opportunity"><summary>Attacks of Opportunity · ${s.used}/${s.maximum}</summary><div class="actions"><label>Opponent <input data-opportunity="opponent" maxlength="200" value="${escape(p.opponent)}"></label><label>Action <input data-opportunity="action" maxlength="200" value="${escape(p.action)}" placeholder="Guard A, move 1" title="Identify this particular provoking action"></label><label>Squares <input type="number" min="1" max="100000" data-opportunity="distance" value="${p.distance}"></label><label class="checkbox" title="Provoking action within your threatened area"><input type="checkbox" data-opportunity="provoked" ${p.provoked?'checked':''}>Provoked</label><button data-combat="next-round" title="Reset attacks of opportunity for the round">Next round</button><a href="https://swse.miraheze.org/wiki/Attacks_of_Opportunity" data-rule-page="rule:attacks-of-opportunity" aria-label="Attacks of Opportunity mechanics">ⓘ</a></div>${p.used.length?`<ul>${p.used.map(u=>`<li>${escape(u.opponent)} · ${escape(u.action)}</li>`).join('')}</ul>`:''}</details>`;
}
export function opportunityButton(c,pack,a,view){
 if(!a.opportunityWeapon)return '';
 const issue=opportunityIssue(c,pack,a.uid,view);
 return `<button data-combat="opportunity" data-attack-id="${a.uid}" title="${escape(issue||'Single free attack')}" ${issue?'disabled':''}>Attack of Opportunity</button>`;
}
