// Bonuses and Penalties, pinned Core Rulebook revision 16336.
// Pass only contributions to one statistic in one applicable context.
export function resolveModifiers(rows){
 const bonuses=new Map(),circumstances=new Map();let penalty=0;
 for(const row of rows){
  const {amount,type='untyped',circumstance}=row;
  if(!Number.isFinite(amount)||typeof type!=='string'||!type.trim())throw new Error('Invalid modifier');
  if(amount<0){penalty+=amount;continue;}
  if(type==='circumstance'&&circumstance!==undefined){
   if(typeof circumstance!=='string'||!circumstance.trim())throw new Error('Invalid circumstance');
   circumstances.set(circumstance,Math.max(circumstances.get(circumstance)||0,amount));continue;
  }
  bonuses.set(type,['untyped','dodge','circumstance'].includes(type)?(bonuses.get(type)||0)+amount:Math.max(bonuses.get(type)||0,amount));
 }
 if(circumstances.size)bonuses.set('circumstance',(bonuses.get('circumstance')||0)+[...circumstances.values()].reduce((n,a)=>n+a,0));
 return {total:penalty+[...bonuses.values()].reduce((n,a)=>n+a,0),bonuses:Object.fromEntries(bonuses),penalty};
}
export const modifierTotal=rows=>resolveModifiers(rows).total;
export const modifierIncrease=(base,extra)=>modifierTotal([...base,...extra])-modifierTotal(base);
