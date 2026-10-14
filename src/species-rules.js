import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';

export function carryingLimits(str,size,weight,rules){
 const factor=rules.sizeMultipliers[size]??1,base=str*str*factor;
 const heavyAt=base*rules.heavyFraction,lift=base*rules.liftFraction,strain=base*rules.strainFraction;
 return {weight,heavyAt,lift,strain,heavy:weight>=heavyAt,overloaded:weight>lift,tooHeavy:weight>strain};
}
export function createSpeciesChecks({current,derived,log},roller=evalExpr){
 const checks=new Map(),key=id=>current().id+':'+id;
 const valid=(s,p)=>p&&p.source===s.checkSource&&p.bonus===s.total;
 return {
  controls(s,species,incapacitated){
   const native=s.id===s.checkSource,disabled=incapacitated||!s.available;
   const p=checks.get(key(s.id));
   const reroll=species.skillRerolls?.find(r=>r.skill===s.id);
   const scope=r=>r.when==='intimidate'?' (Intimidate)':r.when==='searchYourFeelingsOrSenseForce'?' (Search Your Feelings / Sense Force)':'';
   return `${reroll&&native?`<button type="button" data-species-reroll="${s.id}" ${disabled||!valid(s,p)?'disabled':''} aria-label="Reroll ${escape(s.name+scope(reroll))}">Reroll${scope(reroll)}</button>`:''}${species.take10Skills?.includes(s.id)&&native?`<button type="button" data-species-take10="${s.id}" ${disabled?'disabled':''} aria-label="Take 10 on ${escape(s.name)}">Take 10</button>`:''}`;
  },
  click(el,species){
   const id=el.dataset.skillRoll||el.dataset.speciesReroll||el.dataset.speciesTake10;
   if(!id)return false;
   const s=derived().skills.find(s=>s.id===id);
   if(!s?.available||derived().incapacitated)return true;
   const expression='1d20'+(s.total>=0?'+':'')+s.total;
   if(el.dataset.skillRoll){const roll=roller(expression);checks.set(key(id),{source:s.checkSource,bonus:s.total,roll});log('roll',`${s.name}: ${expression} = ${roll.value}`,`${escape(s.name)}: ${roll.display} = ${totalHtml(roll)}`);return true;}
   const reroll=species.skillRerolls?.find(r=>r.skill===id),p=checks.get(key(id));
   if(el.dataset.speciesReroll&&reroll&&s.checkSource===id&&valid(s,p)){
    const roll=roller(expression),kept=reroll.keep==='best'||derived().skillRerollBest?.includes(id)?Math.max(p.roll.value,roll.value):roll.value;
    checks.delete(key(id));log('roll',`${s.name}: ${p.roll.value} → ${roll.value}; kept ${kept}`,`${escape(s.name)}: ${p.roll.value} → ${roll.display} = ${totalHtml(roll)}; kept <b>${kept}</b>`);return true;
   }
   if(el.dataset.speciesTake10&&s.checkSource===id&&species.take10Skills?.includes(id)){checks.delete(key(id));log('roll',`${s.name}: 10 ${s.total>=0?'+':'−'} ${Math.abs(s.total)} = ${10+s.total}`);return true;}
   return true;
  }
 };
}
