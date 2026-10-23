// Ability replacements affect the native modifier, before whole-check substitutions.
export function skillAbilityDetails(c,skill,effects,mods){
 const abilities=[...new Set([skill.ability,...effects.filter(e=>e.target==='skillAbility'&&e.from===skill.ability).map(e=>e.ability)])];
 const options=abilities.map(ability=>({ability,modifier:mods[ability]}));
 const override=c.skillAbilities?.[skill.id]||'auto';
 const automatic=options.reduce((best,o)=>o.modifier>best.modifier?o:best);
 const selected=override==='auto'?automatic:options.find(o=>o.ability===override);
 return {...(selected||automatic),override,options,available:!!selected,issue:selected?'':`${override.toUpperCase()} unavailable`};
}
export function validateSkillAbilities(c,ix,bad){
 if(c.skillAbilities===undefined)return;
 const map=c.skillAbilities;
 if(!map||typeof map!=='object'||Array.isArray(map)||Object.entries(map).some(([id,value])=>!ix.skills.has(id)||!['auto','int','wis'].includes(value)))bad('skill abilities');
}
export function setSkillAbility(c,skills,id,value){
 const skill=skills.find(s=>s.id===id);
 if(!skill||value!=='auto'&&!skill.abilityDetails.options.some(o=>o.ability===value))throw new Error('Skill ability unavailable');
 if(value==='auto'){if(c.skillAbilities){delete c.skillAbilities[id];if(!Object.keys(c.skillAbilities).length)delete c.skillAbilities;}}
 else {c.skillAbilities??={};c.skillAbilities[id]=value;}
}
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function skillAbilityControl(s){
 const r=s.abilityDetails;
 if(r.options.length<2&&r.override==='auto')return r.ability.toUpperCase();
 const signed=n=>n>=0?'+'+n:String(n);
 return `<select data-skill-ability="${s.id}" aria-label="${escape(s.name)} ability"${r.available?'':` aria-invalid="true" title="${escape(r.issue)}"`}><option value="auto"${r.override==='auto'?' selected':''}>Auto</option>${r.options.map(o=>`<option value="${o.ability}"${r.override===o.ability?' selected':''}>${o.ability.toUpperCase()} ${signed(o.modifier)}</option>`).join('')}${r.available?'':`<option value="${r.override}" selected>${r.override.toUpperCase()} (unavailable)</option>`}</select>`;
}
