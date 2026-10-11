import {counselingEnabled} from './house-rules.js';
import {UNARMED_ID} from './feature-choices.js';

export function unarmedWeapon(pack,size,steps=0){
 const base=pack.rules.unarmed.damage[size];
 if(!base)return null;
 const dice=pack.rules.unarmed.dieSteps,die=Number(base.split('d')[1]);
 const damage='1d'+dice[Math.min(dice.length-1,dice.indexOf(die)+steps)];
 return {id:UNARMED_ID,name:'Unarmed Attack',kind:'weapon',group:'simple-weapons',mode:'melee',size,unarmed:true,damage,damageType:'Bludgeoning',article:pack.rulePages.find(r=>r.name==='Unarmed Attacks')?.article};
}
export function weaponRange(w,entry,pack,has,c){
 if(w.mode!=='ranged')return {limits:null,band:null,penalty:0,available:true};
 const limits=w.ranges||pack.rules.weaponRanges.limits[w.rangeType];
 const distance=entry.distance;
 const band=distance===undefined?null:limits.findIndex(n=>distance<=n);
 const far=has('far-shot')?1:0;
 let penalties=pack.rules.weaponRanges.penalties;
 if(w.accurate){
  penalties=far&&counselingEnabled(c,'jc:107-far-shot-accurate-weapon-and-targeting-scope')?[0,0,0,-5]:far?[0,0,-2,-5]:[0,0,-5,-10];
 }else if(far)penalties=[0,0,-2,-5];
 const available=band!==-1&&!(w.inaccurate&&band===3);
 return {limits,band,penalty:band===null||!available?0:penalties[band],available};
}
