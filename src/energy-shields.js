import {activeShieldPowers} from './shield-powers.js';
import {clearFollowUps} from './attack-follow-ups.js';
import {clearAiming,clearBracing} from './attack-techniques.js';
import {evalExpr} from './dice.js';

export const shieldState=(entry,record)=>entry.shield||{charges:record.energyShield.charges,sr:0,active:false,used:false};
export function validateEnergyShield(entry,record,bad){
 if(record.energyShield&&entry.quantity!==1)bad('separate shield generators');
 if(entry.shield===undefined)return;
 const s=entry.shield,r=record.energyShield;
 if(!r||!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).sort().join()!=='active,charges,sr,used'||!Number.isInteger(s.charges)||s.charges<0||s.charges>r.charges||!Number.isInteger(s.sr)||s.sr<0||s.sr>r.rating||typeof s.active!=='boolean'||typeof s.used!=='boolean'||s.active&&!s.used||entry.quantity!==1)bad('energy shield state');
}
export function activeShields(c,pack){
 return c.inventory.flatMap(e=>{const r=pack.equipment.find(r=>r.id===e.id);return r?.energyShield&&e.carried!==false&&e.equipped&&shieldState(e,r).active?[{...r,uid:e.uid,sr:shieldState(e,r).sr}]:[];});
}
export function shieldRestrictions(items,ctx,pack){
 return {checkPenalty:items.reduce((n,r)=>n+pack.rules.armorPenalties[r.category],0),unproficient:items.filter(r=>!ctx.feats.some(f=>f.id==='feat:armor-proficiency-'+r.category)).length,caps:items.map(r=>r.maxDex)};
}
export function energyShieldDetails(c,d,pack,uid){
 const entry=c.inventory.find(e=>e.uid===uid),record=pack.equipment.find(r=>r.id===entry?.id);
 if(!record?.energyShield)throw new Error('Unknown energy shield');
 const state=shieldState(entry,record),able=!d.incapacitated;
 const reason=!able?'Cannot take a Swift Action':entry.carried===false||!entry.equipped?'Equip the generator':state.used?'Used this encounter':!state.charges?'No charges':'';
 return {entry,record,state,reason,available:!reason,rechargeAvailable:able&&entry.carried!==false&&state.active&&state.sr<record.energyShield.rating&&!!d.skills.find(s=>s.id==='skill:mechanics')?.available};
}
export function activateEnergyShield(c,d,pack,uid){
 const detail=energyShieldDetails(c,d,pack,uid);if(!detail.available)throw new Error(detail.reason);
 const {entry,record,state}=detail;entry.shield={...state,charges:state.charges-1,sr:record.energyShield.rating,active:true,used:true};clearFollowUps(c);clearAiming(c);clearBracing(c);return entry.shield;
}
export function endShieldEncounter(c){for(const entry of c.inventory)if(entry.shield){entry.shield.active=false;entry.shield.used=false;}}
export function rechargeEnergyShield(c,d,pack,uid,roller=evalExpr){
 const detail=energyShieldDetails(c,d,pack,uid);if(!detail.rechargeAvailable)throw new Error('Shield recharge unavailable');
 const skill=d.skills.find(s=>s.id==='skill:mechanics'),roll=roller('1d20'+(skill.total>=0?'+':'')+skill.total);
 if(!Number.isInteger(roll.value))throw new Error('Invalid recharge check');
 const rule=pack.rules.combat,success=roll.value>=rule.rechargeDC,before=detail.state.sr;
 detail.entry.shield={...detail.state,sr:Math.min(detail.record.energyShield.rating,before+(success?rule.shieldRecharge:0))};clearFollowUps(c);clearAiming(c);clearBracing(c);
 return {roll,success,before,after:detail.entry.shield.sr,actions:rule.rechargeActions};
}
export function shieldProtection(c,d,pack,{energy=false,otherDamage=false,fire=false,lightsaber=false}={}){
 if(typeof otherDamage!=='boolean')throw new Error('Invalid mixed damage declaration');
 const sources=[{kind:'manual',source:null,sr:c.protection.sr,srMax:c.protection.srMax}];
 if(energy&&!otherDamage&&!fire&&!lightsaber)sources.push(...activeShields(c,pack).map(s=>({kind:'equipment',source:s.uid,sr:s.sr,srMax:s.energyShield.rating})));
 sources.push(...activeShieldPowers(c,pack).map(s=>({kind:'power',source:s.id,sr:s.sr,srMax:s.srMax})));
 return sources.reduce((best,s)=>s.sr>best.sr?s:best,sources[0]);
}
