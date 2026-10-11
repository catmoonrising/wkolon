import {escapeHTML as escape, renderArticle} from './wiki-content.js';

export const counselingEnabled=(c,id)=>c.houseRules?.jediCounseling?.[id]!==false;
export function validateHouseRules(c,pack,bad){
 if(c.houseRules===undefined)return;
 const h=c.houseRules,obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
 if(!obj(h)||Object.keys(h).some(k=>!['jediCounseling','comlinkUpgradeFees'].includes(k)))bad('house rules');
 if(h.comlinkUpgradeFees!==undefined&&typeof h.comlinkUpgradeFees!=='boolean')bad('Comlink pricing');
 if(h.jediCounseling!==undefined&&(!obj(h.jediCounseling)||Object.entries(h.jediCounseling).some(([id,on])=>typeof on!=='boolean'||!pack.jediCounseling.some(r=>r.id===id))))bad('Jedi Counseling');
}

export function createHouseRules(pack){
 let tab='settings',search='';
 const pages=new Map(pack.rulePages.map(r=>[r.id,r]));
 const mode=id=>pack.rules.counselingApplications[id]==='raw-equivalent'?'RAW unchanged':pack.rules.counselingApplications[id]?'Automatic':'Manual';
 return {
  render(c){
   const topics=pack.jediCounseling.filter(r=>(r.name+' '+r.issue).toLowerCase().includes(search.toLowerCase()));
   return `<div class="hr-tabs">${[['settings','Settings'],['counseling','Jedi Counseling']].map(([id,label])=>`<button type="button" class="hr-tab ${tab===id?'active':''}" data-house-tab="${id}" aria-pressed="${tab===id}">${label}</button>`).join('')}</div>`+
    (tab==='settings'?`<label class="checkbox"><input type="checkbox" data-house-setting="comlinkUpgradeFees" ${c.houseRules?.comlinkUpgradeFees!==false?'checked':''}>Comlink: base price + functionality fees</label>`:
     `<input type="search" data-counseling-search placeholder="Search" aria-label="Search Jedi Counseling" value="${escape(search)}"><div class="counseling-topics">${topics.map(r=>`<div class="counseling-topic"><label class="checkbox"><input type="checkbox" data-counseling="${r.id}" ${counselingEnabled(c,r.id)?'checked':''}>${escape(r.name)}</label><small>${r.issue} · ${mode(r.id)}</small><details id="${r.id}"><summary>Text</summary>${renderArticle(pages.get(r.ruleId).article)}</details></div>`).join('')}</div>`);
  },
  setTab(id){if(['settings','counseling'].includes(id))tab=id;},
  search(value){search=value;},
  change(el,c){
   if(!el.hasAttribute('data-house-setting')&&!el.hasAttribute('data-counseling'))return false;
   c.houseRules??={};
   if(el.dataset.counseling){c.houseRules.jediCounseling??={};c.houseRules.jediCounseling[el.dataset.counseling]=el.checked;}
   else c.houseRules[el.dataset.houseSetting]=el.checked;
   return true;
  }
 };
}
