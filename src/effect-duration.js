// Combat Sequence revision26725: six seconds per round.
export const ROUNDS_PER_MINUTE=10;
export function advanceRoundEffects(rows,rounds){
 if(!Number.isInteger(rounds)||rounds<0||rounds>1000000000)throw new Error('Invalid elapsed rounds');
 return rows.flatMap(s=>s.rounds>rounds?[{...s,rounds:s.rounds-rounds}]:[]);
}
export function endTurnEffects(rows){
 return rows.flatMap(s=>s.ended?[s]:s.endsRemaining>1?[{...s,endsRemaining:s.endsRemaining-1,ended:true}]:[]);
}
export function startTurnEffects(rows){return endTurnEffects(rows).map(s=>({...s,ended:false}));}
