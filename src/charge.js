import {ambiguityValue} from './house-rules.js';
import {terrainMovementCost,movementSpeed,validateSegment} from './combat-movement.js';

export const chargePath=c=>({mode:'normal',squares:2,diagonalSquares:0,difficultSquares:0,diagonalDifficultSquares:0,lowObjectSquares:0,diagonalLowObjectSquares:0,turns:false,lowObjects:false,crossTerrain:false,acrobatics:null,...c.chargePath});
export const chargeSegment=p=>({squares:p.squares,diagonal:p.diagonalSquares,difficult:p.difficultSquares,diagonalDifficult:p.diagonalDifficultSquares,lowObjects:p.lowObjectSquares,diagonalLowObjects:p.diagonalLowObjectSquares});
export const chargeMovementCost=(c,pack,crossTerrain=chargePath(c).crossTerrain)=>terrainMovementCost(chargeSegment(chargePath(c)),pack.rules[pack.rules.charge.movementCostRule],crossTerrain);

export const chargeNimbleRequired=(c,pack,p=chargePath(c))=>p.lowObjects||p.lowObjectSquares>0||p.diagonalLowObjectSquares>0||(p.difficultSquares+p.diagonalDifficultSquares)>0&&ambiguityValue(c,pack,pack.rules.charge.difficultTerrainAmbiguityId)==='nimble-check';
export function chargeAcrobaticsDC(c,pack,p=chargePath(c)){const r=pack.rules.charge;return chargeNimbleRequired(c,pack,p)?(p.crossTerrain?r.combinedDC:r.lowObjectsDC):p.crossTerrain?r.crossTerrainDC:null;}

export function planCharge(c,d,pack,uid){
 validateCharge(c,message=>{throw new Error('Invalid '+message);});
 const rule=pack.rules.charge,path=chargePath(c),attack=d.attacks.find(a=>a.uid===uid);
 const has=id=>d.ctx.feats.some(f=>f.id===id),powerful=has(rule.powerful.featId),improved=has(rule.improved.featId);
 if(d.incapacitated||d.helpless)throw new Error('Charge unavailable');
 if(d.load?.overloaded)throw new Error('Straining requires full-round movement');
 const maximum=movementSpeed(d,path.mode),segment=chargeSegment(path),{lowObjects,diagonalLowObjects,...base}=segment;
 validateSegment(base,message=>{throw new Error('Invalid '+message);});
 if(lowObjects>base.difficult||diagonalLowObjects>base.diagonalDifficult)throw new Error('Low object squares exceed terrain');
 if(path.lowObjects&&!lowObjects&&!diagonalLowObjects)throw new Error('Choose low object squares');
 if(!attack||attack.mode!=='melee'||attack.areaType)throw new Error('Charge requires a melee attack');
 if(!attack.available||attack.damage===null)throw new Error(attack.issue||'Attack unavailable');
 if(path.squares<rule.minimumSquares||path.squares>maximum)throw new Error(`Charge requires ${rule.minimumSquares}–${maximum} squares`);
 if(!Number.isInteger(path.difficultSquares)||path.difficultSquares<0||path.difficultSquares>path.squares)throw new Error('Difficult squares exceed the Charge distance');
 if(path.turns&&!improved)throw new Error('Turning requires Improved Charge');
 if(path.crossTerrain&&base.difficult-lowObjects+base.diagonalDifficult-diagonalLowObjects===0)throw new Error('Choose difficult squares');
 const nimbleRequired=chargeNimbleRequired(c,pack,path),check=nimbleRequired||path.crossTerrain,skill=d.skills.find(s=>s.id===rule.acrobatics);
 if(check&&(!d.ctx.trained.has(rule.acrobatics)||!skill.available))throw new Error('Requires trained Acrobatics');
 const normalCost=chargeMovementCost(c,pack,false),successfulCost=chargeMovementCost(c,pack);
 if(successfulCost>maximum)throw new Error('Charge exceeds Speed');
 const dc=chargeAcrobaticsDC(c,pack,path);
 const attackBonus=rule.attackBonus+(powerful?rule.powerful.attackBonus:0),damageBonus=powerful?Math.floor(d.level*rule.powerful.damagePerLevel):0;
 return {path,nimbleRequired,attack:{...attack,attack:attack.attack+attackBonus,damageBonus:attack.damageBonus+damageBonus,damageDisplay:attack.damageDisplay+(damageBonus?'+'+damageBonus:''),...(attack.criticalDamageDisplay?{criticalDamageDisplay:attack.criticalDamageDisplay+(damageBonus?'+'+damageBonus:'')}:{})},attackBonus,damageBonus,normalCost,successfulCost,maximum,dc,skill,improved,powerful,reflexPenalty:rule.reflexPenalty};
}

export function validateCharge(c,bad){
 if(c.chargeReflexPenalty!==undefined&&![0,-2].includes(c.chargeReflexPenalty))bad('Charge Reflex penalty');
 if(c.chargePath===undefined)return;
 const p=c.chargePath,counts=['squares','diagonalSquares','difficultSquares','diagonalDifficultSquares','lowObjectSquares','diagonalLowObjectSquares'],keys=[...counts,'mode','turns','lowObjects','crossTerrain','acrobatics'];
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!keys.includes(k)))bad('Charge path');
 for(const key of counts)if(p[key]!==undefined&&(!Number.isInteger(p[key])||p[key]<(key==='squares'?2:0)||p[key]>100000))bad('Charge '+key);
 if(p.mode!==undefined&&(typeof p.mode!=='string'||!/^[a-z][a-z-]{0,29}$/.test(p.mode)))bad('Charge movement mode');
 for(const key of ['turns','lowObjects','crossTerrain'])if(p[key]!==undefined&&typeof p[key]!=='boolean')bad('Charge '+key);
 if(p.acrobatics!==undefined&&p.acrobatics!==null&&(!Number.isInteger(p.acrobatics)||p.acrobatics< -100000||p.acrobatics>100000))bad('Charge Acrobatics');
}
