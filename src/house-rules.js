import {escapeHTML as escape, renderArticle, articleText, displayText} from './wiki-content.js';
import {CAMPAIGN_RULES,campaignRuleEnabled} from './campaign-rules.js';
import {derive} from './rules.js';

export const counselingEnabled=(c,id)=>c.houseRules?.jediCounseling?.[id]!==false;
export const ambiguityValue=(c,pack,id)=>c.houseRules?.ambiguities?.[id]??pack.rules.ambiguities?.find(r=>r.id===id)?.default;
export function validateHouseRules(c,pack,bad){
 if(c.houseRules===undefined)return;
 const h=c.houseRules,obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 if(!obj(h)||Object.keys(h).some(k=>!['jediCounseling','comlinkUpgradeFees','ambiguities','campaign'].includes(k)))bad('house rules');
 if(h.campaign!==undefined&&(!obj(h.campaign)||Object.entries(h.campaign).some(([id,value])=>!CAMPAIGN_RULES.some(r=>r.id===id)||typeof value!=='boolean')))bad('campaign rules');
 if(h.comlinkUpgradeFees!==undefined&&typeof h.comlinkUpgradeFees!=='boolean')bad('Comlink pricing');
 if(h.jediCounseling!==undefined&&(!obj(h.jediCounseling)||Object.entries(h.jediCounseling).some(([id,on])=>typeof on!=='boolean'||!pack.jediCounseling.some(r=>r.id===id))))bad('Jedi Counseling');
 if(h.ambiguities!==undefined&&(!obj(h.ambiguities)||Object.entries(h.ambiguities).some(([id,value])=>!pack.rules.ambiguities?.some(r=>r.id===id&&r.options.some(o=>o.value===value)))))bad('ambiguities');
}

export function createHouseRules(pack){
 let tab='settings',search='',optionalSearch='';
 const pages=new Map(pack.rulePages.map(r=>[r.id,r]));
 const mode=id=>pack.rules.counselingApplications[id]==='raw-equivalent'?'RAW unchanged':pack.rules.counselingApplications[id]?'Automatic':'Manual';
 const passage=r=>{const p=pages.get(r.ruleId);return `<h4>${escape(p.name)}</h4>${renderArticle({...p.article,blocks:r.fullText?p.article.blocks:p.article.blocks.filter(n=>n?.tag==='p').slice(0,r.paragraphCount)})}`;};
 const optionalEntries=pack.optionalRules?.entries||[];
 const campaignCheckbox=(c,r,label=r.name)=>`<label class="checkbox"><input type="checkbox" data-campaign-rule="${r.id}" ${campaignRuleEnabled(c,r.id)?'checked':''}>${escape(label)}</label>`;
 const campaignSettings=c=>CAMPAIGN_RULES.filter(r=>!r.optionalId).map(r=>`<div class="campaign-rule"><details><summary>${campaignCheckbox(c,r)}${r.support==='Manual'?' <small>Manual</small>':''}</summary><p>${escape(r.text)}</p></details></div>`).join('');
 const optionalText=new Map(optionalEntries.map(r=>[r.id,(r.name+' '+r.books.join(' ')+' '+articleText(r.article)).toLocaleLowerCase()]));
 const optionalTopics=c=>`<div class="optional-topics">${optionalEntries.filter(r=>optionalSearch.toLocaleLowerCase().trim().split(/\s+/).every(term=>optionalText.get(r.id).includes(term))).map(r=>`<details class="optional-topic" data-optional-rule="${r.id}"><summary>${escape(displayText(r.name))} <small class="optional-status">${r.status==='automatic'?'Automatic':r.status==='partial'?'Partial':'Manual'}</small></summary><div class="optional-body">${r.campaignRuleId?campaignCheckbox(c,CAMPAIGN_RULES.find(d=>d.id===r.campaignRuleId),'Enabled'):''}${r.counselingId?`<label class="checkbox"><input type="checkbox" data-counseling="${escape(r.counselingId)}" ${counselingEnabled(c,r.counselingId)?'checked':''}>Enabled</label>`:''}${r.note?`<p>${escape(displayText(r.note))}</p>`:''}<p class="optional-source">${escape(displayText(r.books.join(', ')))} <a href="${escape(r.source.url)}" target="_blank" rel="noopener">Source</a></p>${renderArticle(r.article)}</div></details>`).join('')}</div>`;
 return {
  render(c){
   const topics=pack.jediCounseling.filter(r=>(r.name+' '+r.issue).toLowerCase().includes(search.toLowerCase()));
   return `<div class="hr-tabs">${[['settings','Settings'],['optional','Optional Rules'],['counseling','Jedi Counseling'],['ambiguities','Ambiguities']].map(([id,label])=>`<button type="button" class="hr-tab ${tab===id?'active':''}" data-house-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join('')}</div>`+
    (tab==='settings'?campaignSettings(c)+`<label class="checkbox"><input type="checkbox" data-house-setting="comlinkUpgradeFees" ${c.houseRules?.comlinkUpgradeFees!==false?'checked':''}>Comlink: base price + functionality fees</label>`:
     tab==='optional'?`<input type="search" data-optional-search placeholder="Search" aria-label="Search optional rules" value="${escape(optionalSearch)}">${optionalTopics(c)}<details class="optional-attribution"><summary>Sources</summary><p>SWSE wiki contributors, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>. Excerpts and formatting adapted for wkolon.</p></details>`:
     tab==='ambiguities'?`<div class="ambiguity-topics">${(pack.rules.ambiguities||[]).map(r=>`<div class="ambiguity-topic"><label>${escape(r.name)} <select data-ambiguity="${r.id}">${r.options.map(o=>`<option value="${escape(o.value)}" ${ambiguityValue(c,pack,r.id)===o.value?'selected':''}>${escape(o.name)}</option>`).join('')}</select></label><details><summary>Text</summary>${r.passages.map(passage).join('')}</details></div>`).join('')}</div>`:
     `<input type="search" data-counseling-search placeholder="Search" aria-label="Search Jedi Counseling" value="${escape(search)}"><div class="counseling-topics">${topics.map(r=>`<div class="counseling-topic"><label class="checkbox"><input type="checkbox" data-counseling="${r.id}" ${counselingEnabled(c,r.id)?'checked':''}>${escape(r.name)}</label><small>${r.issue}, ${mode(r.id)}</small><details id="${r.id}"><summary>Text</summary>${renderArticle(pages.get(r.ruleId).article)}</details></div>`).join('')}</div>`);
  },
  setTab(id){if(['settings','optional','counseling','ambiguities'].includes(id))tab=id;},
  searchOptional(value){optionalSearch=value;},
  optionalTopics,
  search(value){search=value;},
  change(el,c){
   if(!['data-house-setting','data-counseling','data-ambiguity','data-campaign-rule'].some(k=>el.hasAttribute(k)))return false;
   c.houseRules??={};
   if(el.dataset.campaignRule){if(!CAMPAIGN_RULES.some(r=>r.id===el.dataset.campaignRule))return false;c.houseRules.campaign??={};c.houseRules.campaign[el.dataset.campaignRule]=el.checked;if(el.dataset.campaignRule==='dailyForcePoints'&&el.checked)c.forcePoints=Math.min(c.forcePoints,derive(c,pack).forceMaximum);}
   else if(el.dataset.ambiguity){const r=pack.rules.ambiguities?.find(r=>r.id===el.dataset.ambiguity);if(!r?.options.some(o=>o.value===el.value))return false;c.houseRules.ambiguities??={};c.houseRules.ambiguities[r.id]=el.value;}
   else if(el.dataset.counseling){c.houseRules.jediCounseling??={};c.houseRules.jediCounseling[el.dataset.counseling]=el.checked;}
   else c.houseRules[el.dataset.houseSetting]=el.checked;
   return true;
  }
 };
}
