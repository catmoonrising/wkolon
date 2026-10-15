import {escapeHTML as escape, renderArticle} from './wiki-content.js';

export const counselingEnabled=(c,id)=>c.houseRules?.jediCounseling?.[id]!==false;
export const ambiguityValue=(c,pack,id)=>c.houseRules?.ambiguities?.[id]??pack.rules.ambiguities?.find(r=>r.id===id)?.default;
export function validateHouseRules(c,pack,bad){
 if(c.houseRules===undefined)return;
 const h=c.houseRules,obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 if(!obj(h)||Object.keys(h).some(k=>!['jediCounseling','comlinkUpgradeFees','ambiguities'].includes(k)))bad('house rules');
 if(h.comlinkUpgradeFees!==undefined&&typeof h.comlinkUpgradeFees!=='boolean')bad('Comlink pricing');
 if(h.jediCounseling!==undefined&&(!obj(h.jediCounseling)||Object.entries(h.jediCounseling).some(([id,on])=>typeof on!=='boolean'||!pack.jediCounseling.some(r=>r.id===id))))bad('Jedi Counseling');
 if(h.ambiguities!==undefined&&(!obj(h.ambiguities)||Object.entries(h.ambiguities).some(([id,value])=>!pack.rules.ambiguities?.some(r=>r.id===id&&r.options.some(o=>o.value===value)))))bad('ambiguities');
}

export function createHouseRules(pack){
 let tab='settings',search='';
 const pages=new Map(pack.rulePages.map(r=>[r.id,r]));
 const mode=id=>pack.rules.counselingApplications[id]==='raw-equivalent'?'RAW unchanged':pack.rules.counselingApplications[id]?'Automatic':'Manual';
 const passage=r=>{const p=pages.get(r.ruleId);return `<h4>${escape(p.name)}</h4>${renderArticle({...p.article,blocks:r.fullText?p.article.blocks:p.article.blocks.filter(n=>n?.tag==='p').slice(0,r.paragraphCount)})}`;};
 return {
  render(c){
   const topics=pack.jediCounseling.filter(r=>(r.name+' '+r.issue).toLowerCase().includes(search.toLowerCase()));
   return `<div class="hr-tabs">${[['settings','Settings'],['counseling','Jedi Counseling'],['ambiguities','Ambiguities']].map(([id,label])=>`<button type="button" class="hr-tab ${tab===id?'active':''}" data-house-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join('')}</div>`+
    (tab==='settings'?`<label class="checkbox"><input type="checkbox" data-house-setting="comlinkUpgradeFees" ${c.houseRules?.comlinkUpgradeFees!==false?'checked':''}>Comlink: base price + functionality fees</label>`:
     tab==='ambiguities'?`<div class="ambiguity-topics">${(pack.rules.ambiguities||[]).map(r=>`<div class="ambiguity-topic"><label>${escape(r.name)} <select data-ambiguity="${r.id}">${r.options.map(o=>`<option value="${escape(o.value)}" ${ambiguityValue(c,pack,r.id)===o.value?'selected':''}>${escape(o.name)}</option>`).join('')}</select></label><details><summary>Text</summary>${r.passages.map(passage).join('')}</details></div>`).join('')}</div>`:
     `<input type="search" data-counseling-search placeholder="Search" aria-label="Search Jedi Counseling" value="${escape(search)}"><div class="counseling-topics">${topics.map(r=>`<div class="counseling-topic"><label class="checkbox"><input type="checkbox" data-counseling="${r.id}" ${counselingEnabled(c,r.id)?'checked':''}>${escape(r.name)}</label><small>${r.issue}, ${mode(r.id)}</small><details id="${r.id}"><summary>Text</summary>${renderArticle(pages.get(r.ruleId).article)}</details></div>`).join('')}</div>`);
  },
  setTab(id){if(['settings','counseling','ambiguities'].includes(id))tab=id;},
  search(value){search=value;},
  change(el,c){
   if(!el.hasAttribute('data-house-setting')&&!el.hasAttribute('data-counseling')&&!el.hasAttribute('data-ambiguity'))return false;
   c.houseRules??={};
   if(el.dataset.ambiguity){const r=pack.rules.ambiguities?.find(r=>r.id===el.dataset.ambiguity);if(!r?.options.some(o=>o.value===el.value))return false;c.houseRules.ambiguities??={};c.houseRules.ambiguities[r.id]=el.value;}
   else if(el.dataset.counseling){c.houseRules.jediCounseling??={};c.houseRules.jediCounseling[el.dataset.counseling]=el.checked;}
   else c.houseRules[el.dataset.houseSetting]=el.checked;
   return true;
  }
 };
}
