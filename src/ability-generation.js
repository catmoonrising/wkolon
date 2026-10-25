// pmcrwf's generation pools, with a separate five-score nonliving profile.
import {activeAbilities,standardArray,abilityRecord} from './ability-profiles.js';
import {campaignRuleEnabled} from './campaign-rules.js';
const fixedAbilities=(c,pack)=>pack?.species.find(r=>r.id===c.species)?.fixedAbilities;
export function generationState(c,pack){
 const abilities=activeAbilities(c,pack),fixed=fixedAbilities(c,pack);
 if(fixed)return {fixed:true,pool:abilities.map(a=>fixed[a]),assign:Object.fromEntries(abilities.map((a,i)=>[a,i]))};
 const record=abilityRecord(c,pack);if(record.abilityGeneration)return record.abilityGeneration;
 const pool=record.abilityMethod==='standard'?[...standardArray(c,pack)]:abilities.map(a=>record.abilities[a]),assign={},used=new Set();
 for(const a of abilities){const i=pool.findIndex((n,i)=>n===record.abilities[a]&&!used.has(i));assign[a]=i<0?null:i;if(i>=0)used.add(i);}
 return {pool,assign};
}
export function setGenerationMethod(c,method,pack){
 if(fixedAbilities(c,pack)||!['standard','point-buy','manual','rolled'].includes(method)||campaignRuleEnabled(c,'plannedGeneration')&&method!=='point-buy')return false;
 const abilities=activeAbilities(c,pack),record=abilityRecord(c,pack,true);record.abilityMethod=method;
 const pool=method==='standard'?[...standardArray(c,pack)]:method==='rolled'?[]:Array(abilities.length).fill(method==='point-buy'?8:10);
 record.abilities=Object.fromEntries(abilities.map(a=>[a,10]));record.abilityGeneration={pool,assign:Object.fromEntries(abilities.map(a=>[a,null]))};
 if(method==='point-buy')preparePointBuy(c,pack);
}
// Keep the existing save format, with one purchased score owned by each ability.
// Legacy partial pools retain assigned scores; unused scores fill the other abilities in order.
export function preparePointBuy(c,pack){
 if(fixedAbilities(c,pack)||abilityRecord(c,pack).abilityMethod!=='point-buy')return false;
 const abilities=activeAbilities(c,pack),state=generationState(c,pack),used=new Set(Object.values(state.assign).filter(i=>i!==null)),unused=state.pool.map((_,i)=>i).filter(i=>!used.has(i));
 const values=abilities.map(a=>state.pool[state.assign[a]??unused.shift()]),assign=Object.fromEntries(abilities.map((a,i)=>[a,i])),scores=Object.fromEntries(abilities.map((a,i)=>[a,values[i]])),record=abilityRecord(c,pack,true);
 if(abilities.every((a,i)=>state.assign[a]===i&&record.abilities[a]===values[i])&&state.pool.every((n,i)=>n===values[i]))return false;
 record.abilities=scores;record.abilityGeneration={pool:values,assign};return true;
}
export function setPointBuyScore(c,ability,value,pack){
 if(fixedAbilities(c,pack)||abilityRecord(c,pack).abilityMethod!=='point-buy'||!activeAbilities(c,pack).includes(ability)||!Number.isInteger(value)||pack.rules.pointBuyCosts[value]===undefined)return false;
 preparePointBuy(c,pack);const record=abilityRecord(c,pack,true),i=activeAbilities(c,pack).indexOf(ability);
 // A legacy character without a pool is already assigned, so create its canonical save on edit.
 record.abilityGeneration??=generationState(c,pack);
 record.abilities[ability]=value;record.abilityGeneration.pool[i]=value;return true;
}
export function assignScore(c,ability,index,pack){
 if(fixedAbilities(c,pack)||!activeAbilities(c,pack).includes(ability))return false;
 const state=generationState(c,pack);
 if(index!==null&&(!Number.isInteger(index)||!Number.isInteger(state.pool[index])||Object.entries(state.assign).some(([a,i])=>a!==ability&&i===index)))return false;
 state.assign[ability]=index;const record=abilityRecord(c,pack,true);record.abilityGeneration=state;record.abilities[ability]=index===null?10:state.pool[index];return true;
}
export function setPoolScore(c,index,value,pack){
 if(fixedAbilities(c,pack))return false;
 const record=abilityRecord(c,pack),abilities=activeAbilities(c,pack);
 if(!['point-buy','manual'].includes(record.abilityMethod)||!Number.isInteger(index)||index<0||index>=abilities.length||!Number.isInteger(value)||value<3||value>30||record.abilityMethod==='point-buy'&&pack.rules.pointBuyCosts[value]===undefined)return false;
 const state=generationState(c,pack);state.pool[index]=value;const saved=abilityRecord(c,pack,true);saved.abilityGeneration=state;for(const a of abilities)if(state.assign[a]===index)saved.abilities[a]=value;return true;
}
export function setRolledPool(c,pool,pack){
 if(fixedAbilities(c,pack))return false;
 const abilities=activeAbilities(c,pack),record=abilityRecord(c,pack,true);record.abilityGeneration={pool:[...pool],assign:Object.fromEntries(abilities.map(a=>[a,null]))};record.abilities=Object.fromEntries(abilities.map(a=>[a,10]));
}
