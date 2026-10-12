export const chargePath=c=>({squares:2,difficultSquares:0,turns:false,lowObjects:false,crossTerrain:false,acrobatics:null,...c.chargePath});

export function planCharge(c,d,pack,uid){
 const rule=pack.rules.charge,path=chargePath(c),attack=d.attacks.find(a=>a.uid===uid);
 const has=id=>d.ctx.feats.some(f=>f.id===id),powerful=has(rule.powerful.featId),improved=has(rule.improved.featId);
 if(d.incapacitated||d.helpless)throw new Error('Charge unavailable');
 if(!attack||attack.mode!=='melee'||attack.areaType)throw new Error('Charge requires a melee attack');
 if(!attack.available||attack.damage===null)throw new Error(attack.issue||'Attack unavailable');
 if(!Number.isInteger(path.squares)||path.squares<rule.minimumSquares||path.squares>d.speed)throw new Error(`Charge requires ${rule.minimumSquares}–${d.speed} squares`);
 if(!Number.isInteger(path.difficultSquares)||path.difficultSquares<0||path.difficultSquares>path.squares)throw new Error('Difficult squares exceed the Charge distance');
 if(path.turns&&!improved)throw new Error('Turning requires Improved Charge');
 if(path.crossTerrain&&!path.difficultSquares)throw new Error('Choose difficult squares');
 const check=path.lowObjects||path.crossTerrain,skill=d.skills.find(s=>s.id===rule.acrobatics);
 if(check&&(!d.ctx.trained.has(rule.acrobatics)||!skill.available))throw new Error('Requires trained Acrobatics');
 const normalCost=path.squares+path.difficultSquares*(rule.difficultTerrainCost-1);
 if(!path.crossTerrain&&normalCost>d.speed)throw new Error('Charge exceeds Speed through difficult terrain');
 const dc=path.lowObjects?(path.crossTerrain?rule.combinedDC:rule.lowObjectsDC):path.crossTerrain?rule.crossTerrainDC:null;
 const attackBonus=rule.attackBonus+(powerful?rule.powerful.attackBonus:0),damageBonus=powerful?Math.floor(d.level*rule.powerful.damagePerLevel):0;
 return {path,attack:{...attack,attack:attack.attack+attackBonus,damageBonus:attack.damageBonus+damageBonus,damageDisplay:attack.damageDisplay+(damageBonus?'+'+damageBonus:'')},attackBonus,damageBonus,normalCost,dc,skill,improved,powerful,reflexPenalty:rule.reflexPenalty};
}

export function validateCharge(c,bad){
 if(c.chargeReflexPenalty!==undefined&&![0,-2].includes(c.chargeReflexPenalty))bad('Charge Reflex penalty');
 if(c.chargePath===undefined)return;
 const p=c.chargePath,keys=['squares','difficultSquares','turns','lowObjects','crossTerrain','acrobatics'];
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!keys.includes(k)))bad('Charge path');
 for(const key of ['squares','difficultSquares'])if(p[key]!==undefined&&(!Number.isInteger(p[key])||p[key]<(key==='squares'?2:0)||p[key]>100000))bad('Charge '+key);
 for(const key of ['turns','lowObjects','crossTerrain'])if(p[key]!==undefined&&typeof p[key]!=='boolean')bad('Charge '+key);
 if(p.acrobatics!==undefined&&p.acrobatics!==null&&(!Number.isInteger(p.acrobatics)||p.acrobatics< -1000||p.acrobatics>10000))bad('Charge Acrobatics');
}
