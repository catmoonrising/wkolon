import {ambiguityValue} from './house-rules.js';
import {escapeHTML as escape} from './wiki-content.js';

export function teamSkillDetails(c,effects,ix,pack={rules:{}}){
 return effects.filter(e=>e.target==='teamSkill').map(e=>{const featId=e.selection.id,allies=c.teamFeatAllies?.[featId]||0;return {...e,featId,name:ix.feats.get(featId).name,allies,bonus:Math.min(e.maximum,e.amount+(allies+(ambiguityValue(c,pack,'ambiguity:team-feat-allies')==='include-self'?1:0))*e.perAlly)};});
}
export function setTeamAllies(c,pack,id,allies){
 if(!pack.feats.some(r=>r.id===id&&r.effects.some(e=>e.target==='teamSkill'))||!Number.isInteger(allies)||allies<0||allies>1000)throw new Error('Allies must be a whole number from 0 to 1000');
 c.teamFeatAllies??={};c.teamFeatAllies[id]=allies;
}
export function validateTeamAllies(c,pack,bad){
 if(c.teamFeatAllies===undefined)return;
 if(!c.teamFeatAllies||typeof c.teamFeatAllies!=='object'||Array.isArray(c.teamFeatAllies))bad('team allies');
 for(const [id,n] of Object.entries(c.teamFeatAllies))if(!pack.feats.some(r=>r.id===id&&r.effects.some(e=>e.target==='teamSkill'))||!Number.isInteger(n)||n<0||n>1000)bad('team allies');
}
export function teamSkillControls(rows){return rows.length?`<details id="team-skill-allies"><summary>Allies (12 sq)</summary><div class="form-grid">${rows.map(r=>`<label>${escape(r.name)}<input type="number" min="0" max="1000" data-team-allies="${r.featId}" value="${r.allies}" aria-label="Other allies with ${escape(r.name)} within ${r.radius} squares" title="Other allies within ${r.radius} squares with this feat"></label>`).join('')}</div></details>`:'';}
