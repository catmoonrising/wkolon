import {movementSegment,movementCost,movementSpeed,validateSegment} from './combat-movement.js';

export const acrobaticsSegment=p=>movementSegment({lowObjects:0,diagonalLowObjects:0,...p});
export const acrobaticsPath=c=>({mode:'normal',tumble:false,crossTerrain:false,occupied:0,check:null,terrainCheck:null,...c.acrobaticsMovement,path:acrobaticsSegment({squares:1,...c.acrobaticsMovement?.path}),tumbled:acrobaticsSegment({squares:1,...c.acrobaticsMovement?.tumbled})});
const regular=p=>p.squares-p.diagonal-p.difficult-p.diagonalDifficult;
export function validateAcrobaticsMovement(c,bad){
 if(c.acrobaticsMovement===undefined)return;
 const p=c.acrobaticsMovement;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['mode','tumble','crossTerrain','occupied','check','terrainCheck','path','tumbled'].includes(k)))bad('Acrobatics movement');
 if(p.mode!==undefined&&(typeof p.mode!=='string'||!/^[a-z][a-z-]{0,29}$/.test(p.mode)))bad('Acrobatics movement mode');
 for(const key of ['tumble','crossTerrain'])if(p[key]!==undefined&&typeof p[key]!=='boolean')bad(key+' declaration');
 if(p.occupied!==undefined&&(!Number.isInteger(p.occupied)||p.occupied<0||p.occupied>100000))bad('occupied Tumble squares');
 for(const key of ['check','terrainCheck'])if(p[key]!==undefined&&p[key]!==null&&(!Number.isInteger(p[key])||p[key]< -100000||p[key]>100000))bad('Acrobatics check');
 for(const key of ['path','tumbled'])if(p[key]!==undefined){
  const segment=p[key];if(!segment||typeof segment!=='object'||Array.isArray(segment))bad('movement segment');
  const {lowObjects,diagonalLowObjects,...base}=segment;validateSegment(base,bad);
  for(const n of [lowObjects,diagonalLowObjects])if(n!==undefined&&(!Number.isInteger(n)||n<0||n>100000))bad('low object squares');
 }
}
export function acrobaticsTerrainCost(segment,pack,crossTerrain=false){
 const p=acrobaticsSegment(segment),rule=pack.rules.combatMovement;
 return movementCost(p,rule)-(crossTerrain?(p.difficult-p.lowObjects)*(rule.difficultCost-1)+(p.diagonalDifficult-p.diagonalLowObjects)*(rule.diagonalDifficultCost-rule.diagonalCost):0);
}
export function acrobaticsMoveCost(c,pack,crossTerrain=acrobaticsPath(c).crossTerrain){
 const p=acrobaticsPath(c),base=acrobaticsTerrainCost(p.path,pack,crossTerrain);
 return base+(p.tumble?acrobaticsTerrainCost(p.tumbled,pack,crossTerrain)*(pack.rules.acrobaticsMovement.tumble.movementMultiplier-1):0);
}
const categories=p=>[regular(p),p.diagonal,p.difficult-p.lowObjects,p.diagonalDifficult-p.diagonalLowObjects,p.lowObjects,p.diagonalLowObjects];
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
 for(const p of path.tumble?[path.path,path.tumbled]:[path.path])if(p.lowObjects>p.difficult||p.diagonalLowObjects>p.diagonalDifficult)throw new Error('Low object squares exceed terrain');
 if(path.tumble&&(categories(path.tumbled).some((n,i)=>n>categories(path.path)[i])||path.occupied>path.tumbled.squares))throw new Error('Tumble squares exceed movement');
 if(path.crossTerrain&&path.path.difficult-path.path.lowObjects+path.path.diagonalDifficult-path.path.diagonalLowObjects===0)throw new Error('Choose difficult terrain squares');
 const skill=path.tumble||path.crossTerrain?acrobaticsMovementSkill(d,pack):null;
 if(cost>maximum)throw new Error('Movement exceeds Speed');
 return {path,cost,maximum,skill,dc:skill?pack.rules.acrobaticsMovement.dc:null};
}
export function planProneAction(c,d,pack,acrobatics=false){
 const standing=!!c.prone,rule=pack.rules.acrobaticsMovement;
 if(d.incapacitated||d.helpless)throw new Error('Prone action unavailable');
 const skill=acrobatics?acrobaticsMovementSkill(d,pack):null;
 return {standing,skill,dc:skill?rule.dc:null,action:standing?(acrobatics?rule.prone.trainedStand:rule.prone.stand):(acrobatics?rule.prone.trainedDrop:rule.prone.drop)};
}
