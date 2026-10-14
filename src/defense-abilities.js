import {combineArmorDefenses} from './armor.js';
import {ambiguityValue} from './house-rules.js';

const base={reflex:'dex',fortitude:'con',will:'wis'};
export function defenseAbilityDetails(c,pack,effects,mods,{dex,armorMaxDex,dexDenied,helpless}){
 return Object.fromEntries(Object.entries(base).map(([key,ability])=>{
  const abilities=[ability,...new Set(effects.filter(e=>e.target==='defenseAbility'&&e.defense===key).map(e=>e.ability))];
  const options=abilities.map(ability=>{
   let modifier=key==='reflex'&&ability==='dex'?dex:mods[ability];
   if(key==='reflex'&&ability==='int'&&ambiguityValue(c,pack,'ambiguity:predictive-defense-dexterity-limits')==='dexterity-limits')modifier=helpless?-5:dexDenied?Math.min(0,modifier):armorMaxDex===null?modifier:Math.min(modifier,armorMaxDex);
   return {ability,modifier};
  });
  const override=c.defenseAbilities?.[key]||'auto',selected=options.find(o=>o.ability===override)||options.reduce((best,o)=>o.modifier>best.modifier?o:best);
  return [key,{...selected,override,options}];
 }));
}

export function thresholdForContext(context,against=[]){
 const active=context.bonuses.filter(r=>against.includes(r.against)).map(r=>({...r,against:'damage'}));
 const conditional=combineArmorDefenses(active,[],context.base,context.equipment);
 const options=context.allowed.map(defense=>({defense,total:context.base[defense]+context.bonus+(conditional.find(r=>r.defense===defense)?.amount||0)}));
 return options.find(o=>o.defense===context.override)||options.reduce((best,o)=>o.total>best.total?o:best);
}
export function thresholdDetails(c,effects,defenses,bonuses,equipment,bonus){
 const context={allowed:effects.some(e=>e.target==='thresholdDefense')?['fortitude','will']:['fortitude'],override:c.thresholdDefense||'auto',base:defenses,bonuses:bonuses.filter(r=>r.defense!=='reflex'),equipment,bonus};
 const normal=thresholdForContext(context);
 const conditional=[...new Set(context.bonuses.map(r=>r.against))].map(against=>({...thresholdForContext(context,[against]),against})).filter(r=>r.total>normal.total);
 return {...normal,context,conditional};
}
export function validateDefenseAbilities(c,bad){
 if(c.defenseAbilities!==undefined){const choices={reflex:['auto','dex','int'],fortitude:['auto','con','str'],will:['auto','wis','cha']};if(!c.defenseAbilities||typeof c.defenseAbilities!=='object'||Array.isArray(c.defenseAbilities)||Object.entries(c.defenseAbilities).some(([key,value])=>(!Object.hasOwn(choices,key)||!choices[key].includes(value))))bad('defense abilities');}
 if(c.thresholdDefense!==undefined&&!['auto','fortitude','will'].includes(c.thresholdDefense))bad('threshold defense');
}
export function defenseAbilityControls(d){
 const titles={reflex:'Reflex',fortitude:'Fortitude',will:'Will'},signed=n=>n>=0?'+'+n:String(n);
 return Object.entries(d.defenseAbilities).filter(([,r])=>r.options.length>1).map(([key,r])=>`<label>${titles[key]} <select data-defense-ability="${key}" aria-label="${titles[key]} ability"><option value="auto" ${r.override==='auto'?'selected':''}>Auto</option>${r.options.map(o=>`<option value="${o.ability}" ${r.override===o.ability?'selected':''}>${o.ability.toUpperCase()} ${signed(o.modifier)}</option>`).join('')}</select></label>`).join('')+(d.thresholdContext.allowed.length>1?`<label>Threshold <select data-threshold-defense><option value="auto" ${d.thresholdContext.override==='auto'?'selected':''}>Auto</option>${d.thresholdContext.allowed.map(key=>`<option value="${key}" ${d.thresholdContext.override===key?'selected':''}>${titles[key]}</option>`).join('')}</select></label>`:'');
}
