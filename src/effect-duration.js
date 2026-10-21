export function endTurnEffects(rows){
 return rows.flatMap(s=>s.ended?[s]:s.endsRemaining>1?[{...s,endsRemaining:s.endsRemaining-1,ended:true}]:[]);
}
export function startTurnEffects(rows){return endTurnEffects(rows).map(s=>({...s,ended:false}));}
