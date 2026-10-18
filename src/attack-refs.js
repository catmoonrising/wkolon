const uuid=/^[a-f0-9-]{36}$/;
export const naturalAttackId=(characterId,weaponId)=>`natural:${characterId}:${weaponId}`;
export const validAttackReference=value=>typeof value==='string'&&(uuid.test(value)||/^natural:[a-f0-9-]{36}:[a-z][a-z0-9-]{0,39}$/.test(value));
export function rebindAttackReference(value,previous,next){
 if(value===previous)return next;
 const prefix=`natural:${previous}:`;
 return typeof value==='string'&&value.startsWith(prefix)?`natural:${next}:`+value.slice(prefix.length):value;
}
