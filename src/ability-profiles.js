// Organic and nonliving generation stay independent when a character changes body.
export const ABILITIES=['str','dex','con','int','wis','cha'];
export const noConstitution=(c,pack)=>!!pack?.species.find(s=>s.id===c.species)?.noConstitution;
export const activeAbilities=(c,pack)=>noConstitution(c,pack)?pack.rules.droidAbilities.abilities:ABILITIES;
export const standardArray=(c,pack)=>noConstitution(c,pack)?pack.rules.droidAbilities.standardArray:pack.rules.standardArray;
export function abilityRecord(c,pack,create=false){
 if(!noConstitution(c,pack))return c;
 if(c.droidAbilities)return c.droidAbilities;
 const abilities=activeAbilities(c,pack),record={abilityMethod:'standard',pointBudget:pack.rules.droidAbilities.pointBudget,abilities:Object.fromEntries(abilities.map(a=>[a,10])),abilityGeneration:{pool:[...standardArray(c,pack)],assign:Object.fromEntries(abilities.map(a=>[a,null]))}};
 if(create)c.droidAbilities=record;
 return record;
}
export const activeMethod=(c,pack)=>abilityRecord(c,pack).abilityMethod;
export const activeBudget=(c,pack)=>abilityRecord(c,pack).pointBudget;
export function setAbilityBudget(c,pack,value){if(!Number.isInteger(value)||value<0||value>100)return false;abilityRecord(c,pack,true).pointBudget=value;return true;}
export function setBaseAbility(c,pack,ability,value){
 if(!activeAbilities(c,pack).includes(ability)||pack.species.find(s=>s.id===c.species)?.fixedAbilities||!Number.isInteger(value)||value<3||value>30)return false;
 const record=abilityRecord(c,pack,true);record.abilities[ability]=value;delete record.abilityGeneration;return true;
}
export function validateDroidAbilities(c,pack,bad){
 if(c.droidAbilities===undefined)return;
 const r=c.droidAbilities,obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),int=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max,keys=pack.rules.droidAbilities?.abilities;
 if(!keys||!obj(r)||Object.keys(r).some(k=>!['abilityMethod','pointBudget','abilities','abilityGeneration'].includes(k))||!['standard','point-buy','manual','rolled'].includes(r.abilityMethod)||!int(r.pointBudget,0,100)||!obj(r.abilities)||Object.keys(r.abilities).length!==keys.length||!keys.every(a=>int(r.abilities[a],3,30)))bad('droid ability scores');
 const g=r.abilityGeneration;if(g===undefined)return;
 if(!obj(g)||Object.keys(g).some(k=>!['pool','assign'].includes(k))||!Array.isArray(g.pool)||![0,keys.length].includes(g.pool.length)||!g.pool.every(v=>int(v,3,r.abilityMethod==='rolled'?18:30))||!obj(g.assign)||Object.keys(g.assign).length!==keys.length||r.abilityMethod!=='rolled'&&g.pool.length!==keys.length)bad('droid ability generation');
 if(r.abilityMethod==='standard'&&g.pool.join()!==pack.rules.droidAbilities.standardArray.join())bad('droid standard score pool');
 const used=[];for(const a of keys){const i=g.assign[a];if(!(i===null||int(i,0,g.pool.length-1))||r.abilities[a]!== (i===null?10:g.pool[i]))bad('droid ability assignment');if(i!==null)used.push(i);}
 if(new Set(used).size!==used.length)bad('duplicate droid ability assignment');
}
