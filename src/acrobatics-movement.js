import {movementSegment,movementCost,movementSpeed,validateSegment} from './combat-movement.js';

export const acrobaticsPath=c=>({mode:'normal',tumble:false,occupied:0,check:null,...c.acrobaticsMovement,path:movementSegment({squares:1,...c.acrobaticsMovement?.path}),tumbled:movementSegment({squares:1,...c.acrobaticsMovement?.tumbled})});
const regular=p=>p.squares-p.diagonal-p.difficult-p.diagonalDifficult;
export function validateAcrobaticsMovement(c,bad){
 if(c.acrobaticsMovement===undefined)return;
 const p=c.acrobaticsMovement;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['mode','tumble','occupied','check','path','tumbled'].includes(k)))bad('Acrobatics movement');
 if(p.mode!==undefined&&(typeof p.mode!=='string'||!/^[a-z][a-z-]{0,29}$/.test(p.mode)))bad('Acrobatics movement mode');
 if(p.tumble!==undefined&&typeof p.tumble!=='boolean')bad('Tumble declaration');
 if(p.occupied!==undefined&&(!Number.isInteger(p.occupied)||p.occupied<0||p.occupied>100000))bad('occupied Tumble squares');
 if(p.check!==undefined&&p.check!==null&&(!Number.isInteger(p.check)||p.check< -100000||p.check>100000))bad('Acrobatics check');
 for(const key of ['path','tumbled'])if(p[key]!==undefined)validateSegment(p[key],bad);
}
export function acrobaticsMoveCost(c,pack){
 const p=acrobaticsPath(c),base=movementCost(p.path,pack.rules.combatMovement);
 return base+(p.tumble?movementCost(p.tumbled,pack.rules.combatMovement)*(pack.rules.acrobaticsMovement.tumble.movementMultiplier-1):0);
}
export function acrobaticsMovementSkill(d,pack){
 const rule=pack.rules.acrobaticsMovement,skill=d.skills.find(s=>s.id===rule.skillId);
 if(!d.ctx.trained.has(rule.skillId)||!skill?.available)throw new Error('Requires trained Acrobatics');
 return skill;
}
export function planAcrobaticsMove(c,d,pack){
 validateAcrobaticsMovement(c,message=>{throw new Error('Invalid '+message);});
 const path=acrobaticsPath(c),cost=acrobaticsMoveCost(c,pack),maximum=movementSpeed(d,path.mode)*pack.rules.acrobaticsMovement.tumble.speedMultiplier;
 if(d.incapacitated||d.helpless)throw new Error('Movement unavailable');
 if(d.load?.overloaded)throw new Error('Straining requires full-round movement');
 if(!path.path.squares)throw new Error('Choose movement squares');
 if(path.tumble&&!path.tumbled.squares)throw new Error('Choose Tumble squares');
 if(path.tumble&&(regular(path.tumbled)>regular(path.path)||['squares','diagonal','difficult','diagonalDifficult'].some(k=>path.tumbled[k]>path.path[k])||path.occupied>path.tumbled.squares))throw new Error('Tumble squares exceed movement');
 const skill=path.tumble?acrobaticsMovementSkill(d,pack):null;
 if(cost>maximum)throw new Error('Movement exceeds Speed');
 return {path,cost,maximum,skill,dc:skill?pack.rules.acrobaticsMovement.dc:null};
}
export function planProneAction(c,d,pack,acrobatics=false){
 const species=pack.species.find(s=>s.id===c.species),standing=!!c.prone,rule=pack.rules.acrobaticsMovement;
 if(d.incapacitated||d.helpless)throw new Error('Prone action unavailable');
 if(species.proneImmune&&!standing)throw new Error('Species cannot be Prone');
 const skill=acrobatics?acrobaticsMovementSkill(d,pack):null;
 return {standing,skill,dc:skill?rule.dc:null,action:standing?(acrobatics?rule.prone.trainedStand:rule.prone.stand):(acrobatics?rule.prone.trainedDrop:rule.prone.drop)};
}
