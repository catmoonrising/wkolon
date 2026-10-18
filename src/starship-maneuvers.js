export function validateStarshipManeuvers(c,pack,bad){
 const ids=new Set(),known=new Set((pack.starshipManeuvers||[]).map(r=>r.id));
 for(const l of c.levels)if(l.starshipManeuvers!==undefined){
  if(!Array.isArray(l.starshipManeuvers)||l.starshipManeuvers.length>200)bad('Starship Maneuvers');
  for(const p of l.starshipManeuvers){if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).sort().join(',')!=='id,maneuverId,spent'||typeof p.id!=='string'||!/^[a-f0-9-]{36}$/.test(p.id)||ids.has(p.id)||!known.has(p.maneuverId)||typeof p.spent!=='boolean')bad('Starship Maneuver copy');ids.add(p.id);}
 }
}
export function learnStarshipManeuver(c,d,pack,level,id){
 const row=d.rows[level];if(!Number.isInteger(level)||!row||row.valid===false||!pack.starshipManeuvers?.some(r=>r.id===id))throw new Error('Starship Maneuver unavailable');
 const chosen=c.levels[level].starshipManeuvers||[];if(chosen.length>=(row.maneuverChoices||0)||chosen.length>=200)throw new Error('No maneuver choices remaining');
 const copy={id:crypto.randomUUID(),maneuverId:id,spent:false};c.levels[level].starshipManeuvers=[...chosen,copy];return copy;
}
export function removeStarshipManeuver(c,id){
 for(const l of c.levels)if(l.starshipManeuvers)l.starshipManeuvers=l.starshipManeuvers.filter(p=>p.id!==id);
}
export function setStarshipManeuverSpent(c,d,id,spent){
 if(typeof spent!=='boolean'||!d.starshipManeuvers.some(p=>p.copyId===id))throw new Error('Starship Maneuver unavailable');
 const copy=c.levels.flatMap(l=>l.starshipManeuvers||[]).find(p=>p.id===id);if(!copy)throw new Error('Starship Maneuver unavailable');copy.spent=spent;
}
