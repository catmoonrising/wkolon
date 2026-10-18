import {speciesQualities} from './species-profiles.js';
import {escapeHTML as escape} from './wiki-content.js';
export function speciesQualityControls(c,pack){
 const s=pack.species.find(s=>s.id===c.species);if(!s.gmQualities)return '';
 const rows=speciesQualities(c,s);
 return `<fieldset class="species-qualities"><legend>Special Qualities <span class="automation-badge">Manual</span></legend>${rows.map((r,i)=>`<div class="actions"><input data-species-quality="${i}" data-quality-field="name" maxlength="100" placeholder="Quality" aria-label="Quality ${i+1}" value="${escape(r.name)}"><button type="button" data-remove-species-quality="${i}" aria-label="Remove quality ${i+1}">×</button></div><textarea data-species-quality="${i}" data-quality-field="text" maxlength="8000" rows="3" placeholder="Rules" aria-label="Quality ${i+1} rules">${escape(r.text)}</textarea>`).join('')}<button type="button" data-add-species-quality ${rows.length>=s.gmQualities.maximum?'disabled':''} aria-label="Add Special Quality">+</button></fieldset>`;
}
