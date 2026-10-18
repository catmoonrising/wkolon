export const movementSegment=p=>({squares:0,diagonal:0,difficult:0,diagonalDifficult:0,...p});
export const runningPath=c=>({mode:'normal',...c.runningAttack,before:movementSegment({squares:1,...c.runningAttack?.before}),after:movementSegment(c.runningAttack?.after)});
export const withdrawPath=c=>({mode:'normal',clearThreats:false,...c.withdraw,path:movementSegment({squares:1,...c.withdraw?.path})});
export function movementRule(rule,d=null,mode='normal'){
 const terrain=mode==='normal'||mode==='fly'&&d?.droidSystems?.locomotion?.id==='equipment:flying'?d?.droidSystems?.movement?.terrain:null;
 if(terrain==='ignore')return {...rule,difficultCost:1,diagonalDifficultCost:rule.diagonalCost};
 if(terrain==='double')return {...rule,difficultCost:rule.difficultCost*2,diagonalDifficultCost:rule.diagonalDifficultCost*2};
 return rule;
}
export function movementCost(p,rule,d=null,mode='normal'){
 rule=movementRule(rule,d,mode);
 // Terrain counts are disjoint: Both squares are counted only in Both.
 return p.squares+p.diagonal*(rule.diagonalCost-1)+p.difficult*(rule.difficultCost-1)+p.diagonalDifficult*(rule.diagonalDifficultCost-1);
}
export function terrainMovementCost(p,rule,crossTerrain=false,d=null,mode='normal'){
 rule=movementRule(rule,d,mode);
 return movementCost(p,rule)-(crossTerrain?(p.difficult-(p.lowObjects||0))*(rule.difficultCost-1)+(p.diagonalDifficult-(p.diagonalLowObjects||0))*(rule.diagonalDifficultCost-rule.diagonalCost):0);
}
export function validateSegment(segment,bad){
 const p=movementSegment(segment),keys=['squares','diagonal','difficult','diagonalDifficult'];
 if(!segment||typeof segment!=='object'||Array.isArray(segment)||Object.keys(segment).some(k=>!keys.includes(k))||keys.some(k=>!Number.isInteger(p[k])||p[k]<0||p[k]>100000))bad('movement segment');
 if(p.diagonal+p.difficult+p.diagonalDifficult>p.squares)bad('movement terrain counts');
}
export function validateCombatMovement(c,bad){
 for(const key of ['runningAttack','withdraw']){
  const p=c[key];if(p===undefined)continue;
  const keys=key==='runningAttack'?['mode','before','after']:['mode','path','clearThreats'];
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!keys.includes(k)))bad(key+' path');
  if(p.mode!==undefined&&(typeof p.mode!=='string'||!/^[a-z][a-z-]{0,29}$/.test(p.mode)))bad('movement mode');
  for(const k of key==='runningAttack'?['before','after']:['path'])if(p[k]!==undefined)validateSegment(p[k],bad);
  if(key==='withdraw'&&p.clearThreats!==undefined&&typeof p.clearThreats!=='boolean')bad('Withdraw threatened areas');
 }
}
export function movementSpeed(d,mode='normal'){
 if(mode==='normal'&&d.speedUnknown)throw new Error('Set shell speed');
 const speed=mode==='normal'?d.speed:d.speeds?.[mode];
 if(!Number.isFinite(speed)||speed<0)throw new Error('Movement mode unavailable');
 return speed;
}
export function planRunningAttack(c,d,pack,uid){
 validateCombatMovement(c,message=>{throw new Error('Invalid '+message);});
 const rule=pack.rules.combatMovement,p=runningPath(c),attack=d.attacks.find(a=>a.uid===uid);
 if(d.incapacitated||d.helpless)throw new Error('Running Attack unavailable');
 if(!d.ctx.feats.some(f=>f.id===rule.running.featId))throw new Error('Requires Running Attack');
 if(!attack||!['melee','ranged'].includes(attack.mode))throw new Error('Requires a melee or ranged weapon');
 const before=movementCost(movementSegment(p.before),rule,d,p.mode),after=movementCost(movementSegment(p.after),rule,d,p.mode),cost=before+after,maximum=movementSpeed(d,p.mode)*rule.running.speedMultiplier;
 if(cost&&d.load?.overloaded)throw new Error('Straining requires full-round movement');
 if(cost>maximum)throw new Error('Running Attack movement exceeds Speed');
 if(!attack.available||!attack.damage)throw new Error(attack.issue||'Attack unavailable');
 return {path:p,before,after,cost,maximum,attack};
}
export function planWithdraw(c,d,pack){
 validateCombatMovement(c,message=>{throw new Error('Invalid '+message);});
 const rule=pack.rules.combatMovement,p=withdrawPath(c),cost=movementCost(movementSegment(p.path),rule,d,p.mode),maximum=Math.floor(movementSpeed(d,p.mode)*rule.withdraw.speedMultiplier);
 if(d.incapacitated||d.helpless)throw new Error('Withdraw unavailable');
 if(d.load?.overloaded)throw new Error('Straining requires full-round movement');
 if(!p.clearThreats)throw new Error('First square must clear every threatened area by the shortest route');
 if(!p.path.squares)throw new Error('Withdraw requires movement');
 if(cost>maximum)throw new Error('Withdraw exceeds half Speed');
 return {path:p,cost,maximum,protectedSquares:rule.withdraw.protectedSquares};
}
