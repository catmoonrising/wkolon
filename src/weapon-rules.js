import {counselingEnabled} from './house-rules.js';
import {UNARMED_ID} from './feature-choices.js';
import {attachedScope} from './equipment.js';

export const canAim=(w,e={})=>w.mode==='ranged'&&!w.areaType&&!!w.damage&&(e.attackTechnique==='burst-fire'||e.attackTechnique==='rapid-shot'&&!w.autofireOnly||!w.autofireOnly&&e.fireMode!=='autofire');

export function unarmedWeapon(pack,size,steps=0){
 const base=pack.rules.unarmed.damage[size];
 if(!base)return null;
 const dice=pack.rules.unarmed.dieSteps,die=Number(base.split('d')[1]);
 const damage='1d'+dice[Math.min(dice.length-1,dice.indexOf(die)+steps)];
 return {id:UNARMED_ID,name:'Unarmed Attack',kind:'weapon',group:'simple-weapons',mode:'melee',size,unarmed:true,damage,damageType:'Bludgeoning',article:pack.rulePages.find(r=>r.name==='Unarmed Attacks')?.article};
}
export function weaponRange(w,entry,pack,has,c){
 if(w.mode!=='ranged')return {limits:null,band:null,penalty:0,available:true};
 if(w.damageEffect==='stun'&&w.stunRange){const limit=w.stunRange;return {limits:[limit,limit,limit,limit],band:entry.distance===undefined?null:entry.distance<=limit?0:-1,penalty:0,available:entry.distance===undefined||entry.distance<=limit};}
 const limits=w.ranges||pack.rules.weaponRanges.limits[w.rangeType];
 const distance=entry.distance;
 const band=distance===undefined?null:limits.findIndex(n=>distance<=n);
 const far=has('far-shot')?1:0;
 const scope=entry.aimed&&canAim(w,entry)&&attachedScope(entry,c,pack)?pack.rules.weaponAccessories.scopeRangeReduction:0;
 let penalties=pack.rules.weaponRanges.penalties;
 if(w.accurate){
  penalties=far&&counselingEnabled(c,'jc:107-far-shot-accurate-weapon-and-targeting-scope')?[0,0,0,-5]:far?[0,0,-2,-5]:[0,0,-5,-10];
 }else if(far)penalties=[0,0,-2,-5];
 if(scope)penalties=w.accurate&&far&&counselingEnabled(c,'jc:107-far-shot-accurate-weapon-and-targeting-scope')?[0,0,0,0]:penalties.map((_,i)=>penalties[Math.max(0,i-scope)]);
 const available=band!==-1&&!(w.inaccurate&&band===3);
 return {limits,band,penalty:band===null||!available?0:penalties[band],available,scope:!!scope};
}
