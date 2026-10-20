import {evalExpr,totalHtml} from './dice.js';
import {escapeHTML as escape} from './wiki-content.js';
import {restorePowerCopy} from './force-powers.js';

export function skillActionPlan(c,d,pack,id,o){
 const rule=pack.rules.skillActions?.find(r=>r.id===id);
 if(!rule||!d.ctx.talents.some(t=>t.id===rule.talentId)||d.ctx.inactiveTalents.has(rule.talentId))throw new Error('Talent unavailable');
 const skill=d.skills.find(s=>s.id===rule.skillId),mode=o.rollMode||'roll';
 if(!skill?.available)throw new Error('Skill unavailable');
 if(!['roll','take10'].includes(mode))throw new Error('Invalid skill check');
 if(o.fp!==undefined&&!['ask','none'].includes(o.fp))throw new Error('Invalid Force Point choice');
 if(mode==='take10'&&(!skill.trained||o.safe!==true))throw new Error('Take 10 requires training and no threats or distractions');
 if(rule.effect==='recover-power'&&!d.forcePowers.some(p=>p.copyId===o.powerId&&p.spent))throw new Error('Choose a spent power');
 return {rule,skill,mode};
}
export function rollSkillAction(plan,roller=evalExpr){
 const bonus=plan.skill.total,roll=plan.mode==='take10'?null:roller('1d20'+(bonus>=0?'+':'')+bonus),natural=roll?.d20?.[0]??10,total=roll?.value??10+bonus;
 if(plan.mode==='roll'&&(!roll||!Array.isArray(roll.d20)||roll.d20.length!==1))throw new Error('Invalid skill roll');
 if(!Number.isInteger(natural)||natural<1||natural>20||total!==natural+bonus)throw new Error('Invalid skill roll');
 const check={natural,bonus,total};
 return {check,text:plan.skill.name+' '+total+(plan.mode==='take10'?' (Take 10)':'')+'; DC '+plan.rule.dc,html:escape(plan.skill.name)+': '+(roll?roll.display+' = '+totalHtml(roll):'Take 10 '+(bonus>=0?'+':'-')+' '+Math.abs(bonus)+' = '+total)};
}
export function finishSkillAction(c,d,pack,id,o,check){
 const rule=pack.rules.skillActions.find(r=>r.id===id);
 if(!d.ctx.talents.some(t=>t.id===rule.talentId)||d.ctx.inactiveTalents.has(rule.talentId))return 'Talent unavailable';
 if(check.total<rule.dc)return 'Failed';
 if(rule.effect==='recover-power'){
  const power=d.forcePowers.find(p=>p.copyId===o.powerId&&p.spent);
  if(!power)return 'Power unavailable';
  restorePowerCopy(c,d,o.powerId);return power.name+' recovered';
 }
 throw new Error('Unsupported skill action');
}
