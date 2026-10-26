export const craftActionId='craft-frag-grenade';
export function craftingRule(d,pack,id=craftActionId){
 if(id!==craftActionId||!d.ctx.talents.some(t=>t.id==='talent:bomb-thrower'&&!d.ctx.inactiveTalents.has(t.id)))return null;
 return pack.talents.find(t=>t.id==='talent:bomb-thrower').effects.find(e=>e.target==='craftItem');
}
export function craftingPlan(c,d,pack,id,o){
 const rule=craftingRule(d,pack,id);
 if(!rule)throw new Error('Crafting unavailable');
 if(o.supplies!==true)throw new Error('Confirm appropriate supplies');
 if(c.inventory.length>=1000)throw new Error('Inventory is full');
 return {rule,item:pack.equipment.find(e=>e.id===rule.equipmentId)};
}
export function craftItem(c,plan){
 const entry={id:plan.item.id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:false,twoHanded:false,attackMod:0,damageMod:0};
 c.inventory.push(entry);return entry;
}
