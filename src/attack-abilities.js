import {validAttackReference} from './attack-refs.js';
import {counselingEnabled} from './house-rules.js';
import {escapeHTML as escape} from './wiki-content.js';
const choices=['auto','str','dex','cha'];
export function validateAttackAbilities(c,bad){
 if(c.attackAbilities===undefined)return;
 const m=c.attackAbilities;if(!m||typeof m!=='object'||Array.isArray(m)||Object.keys(m).length>2000||Object.entries(m).some(([uid,a])=>!validAttackReference(uid)||uid.startsWith('natural:')&&!uid.startsWith('natural:'+c.id+':')||!choices.includes(a)))bad('attack abilities');
}
export function attackAbilityDetails(c,pack,ctx,w,entry,mods,{proficient,group,wielded}){
 const rule=pack.rules.attackAbilities,base=rule.base[w.mode],override=c.attackAbilities?.[entry.uid]||'auto';
 const options=[{ability:base,modifier:mods[base],sources:[]}];
 const smaller=pack.rules.weaponSizeOrder.indexOf(w.size)<pack.rules.weaponSizeOrder.indexOf(ctx.size);
 const light=smaller||w.unarmed&&counselingEnabled(c,rule.unarmedLightCounselingId);
 for(const row of rule.replacements){
  const owned=row.kind==='feat'?ctx.feats.some(f=>f.id===row.id):ctx.talents.some(t=>t.id===row.id&&!ctx.inactiveTalents.has(t.id));
  if(!owned||w.mode!==row.mode||row.proficient&&!proficient)continue;
  const focused=row.focusedOneHanded&&wielded.length===1&&wielded[0].uid===entry.uid&&w.size===ctx.size&&ctx.feats.some(f=>f.id==='feat:weapon-focus'&&f.choice===group);
  if(!(light||w.group==='lightsabers'||focused))continue;
  const existing=options.find(o=>o.ability===row.ability);if(existing)existing.sources.push(row.id);else options.push({ability:row.ability,modifier:mods[row.ability],sources:[row.id]});
 }
 const automatic=options.reduce((best,o)=>o.modifier>best.modifier?o:best),selected=override==='auto'?automatic:options.find(o=>o.ability===override);
 return {...(selected||automatic),override,options,available:!!selected,issue:selected?'':override.toUpperCase()+' unavailable'};
}
export function setAttackAbility(c,attacks,uid,ability){
 const attack=attacks.find(a=>a.uid===uid);if(!attack||!choices.includes(ability)||ability!=='auto'&&!attack.abilityDetails.options.some(o=>o.ability===ability))throw new Error('Attack ability unavailable');
 if(ability==='auto'){if(c.attackAbilities){delete c.attackAbilities[uid];if(!Object.keys(c.attackAbilities).length)delete c.attackAbilities;}}else {c.attackAbilities??={};c.attackAbilities[uid]=ability;}
}
export function attackAbilityControl(a){
 const row=a.abilityDetails;if(row.options.length<2&&row.override==='auto')return '';
 const sign=n=>n>=0?'+'+n:String(n);
 return `<label>Ability <select data-attack-ability="${escape(a.uid)}" aria-invalid="${!row.available}" aria-label="${escape(a.name)} attack ability"><option value="auto" ${row.override==='auto'?'selected':''}>Auto</option>${row.options.map(o=>`<option value="${o.ability}" ${row.override===o.ability?'selected':''}>${o.ability.toUpperCase()} ${sign(o.modifier)}</option>`).join('')}${row.available?'':`<option value="${row.override}" selected disabled>${escape(row.override.toUpperCase())} (unavailable)</option>`}</select></label>`;
}
