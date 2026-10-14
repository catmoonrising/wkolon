import {ambiguityValue} from './house-rules.js';

export const FULL_ATTACK_SOURCES=['base','twoWeapons','doubleAttack','tripleAttack'];
export const FULL_ATTACK_NAMES={base:'Attack',twoWeapons:'Two weapons',doubleAttack:'Double Attack',tripleAttack:'Triple Attack'};

export function fullAttackState(c,pack,ctx){
 const penalties={twoWeapons:0,doubleAttack:0,tripleAttack:0,...c.fullAttackPenalties};
 const mastery=pack.rules.fullAttacks.mastery.filter(m=>ctx.feats.some(f=>f.id===m.featId)).at(-1);
 return {penalties,penalty:Object.values(penalties).reduce((a,b)=>a+b,0),masteryPenalty:mastery?.penalty??pack.rules.fullAttacks.twoWeaponPenalty,
  doubleChoices:ctx.feats.filter(f=>f.id===pack.rules.fullAttacks.doubleFeat).map(f=>f.choice),
  tripleChoices:ctx.feats.filter(f=>f.id===pack.rules.fullAttacks.tripleFeat).map(f=>f.choice),
  proficiency:ambiguityValue(c,pack,'ambiguity:dual-weapon-proficiency')};
}

export function fullAttackGrip(w,entry,pack,speciesSize){
 const size=pack.rules.weaponSizeOrder.indexOf(w.size)-pack.rules.weaponSizeOrder.indexOf(speciesSize);
 return {oneHanded:!!w.unarmed||size<=0&&!entry.twoHanded&&(w.group!=='rifles'||!!entry.oneHanded),
  double:!!w.double&&size<=1&&w.mode==='melee'};
}

const matching=(choices,a)=>choices.includes(a.effectGroup||a.group)||choices.includes(a.id);
const withPenalty=(a,delta)=>({...a,attack:a.attack+delta,...Object.fromEntries(['unAimed','unBraced'].filter(k=>a[k]).map(k=>[k,{...a[k],attack:a[k].attack+delta}]))});

// A source grants one extra attack, even if the feat was chosen for several
// weapon groups. Sources and weapons stay distinct so order is freely editable.
export function planFullAttack(routine,d,pack){
 if(routine.kind!=='fullAttack')return {routine,attacks:d.attacks};
 const seen=new Set(),steps=new Map();
 for(const s of routine.steps){
  if(s.count!==1||!FULL_ATTACK_SOURCES.includes(s.source)||seen.has(s.source))throw new Error('Choose each Full Attack source once');
  const a=d.attacks.find(a=>a.uid===s.attackId);
  if(!a)throw new Error('Attack unavailable');
  seen.add(s.source);steps.set(s.source,a);
 }
 const base=steps.get('base');
 if(!base)throw new Error('Choose a base attack');
 if(steps.size<2)throw new Error('Choose an extra attack');
 const penalties={twoWeapons:0,doubleAttack:0,tripleAttack:0},state=d.fullAttack,dual=steps.get('twoWeapons');
 if(dual){
  const same=base.uid===dual.uid;
  if(same?!base.fullAttackGrip.double:!base.fullAttackGrip.oneHanded||!dual.fullAttackGrip.oneHanded)throw new Error('Two weapons requires two one-handed weapons or a double weapon');
  const proficient=state.proficiency==='either-weapon'?base.proficient||dual.proficient:base.proficient&&dual.proficient;
  penalties.twoWeapons=proficient?state.masteryPenalty:pack.rules.fullAttacks.twoWeaponPenalty;
 }
 const double=steps.get('doubleAttack'),triple=steps.get('tripleAttack');
 if(double){
  if(!matching(state.doubleChoices,double))throw new Error('Double Attack requires its chosen weapon group or exotic weapon');
  penalties.doubleAttack=pack.rules.fullAttacks.extraAttackPenalty;
 }
 if(triple){
  if(!double)throw new Error('Triple Attack requires Double Attack');
  if(!matching(state.tripleChoices,triple))throw new Error('Triple Attack requires its chosen weapon group or exotic weapon');
  penalties.tripleAttack=pack.rules.fullAttacks.extraAttackPenalty;
 }
 if(dual)for(const a of [double,triple].filter(Boolean))if(!a.fullAttackGrip.oneHanded&&!(base.uid===dual.uid&&a.uid===base.uid&&a.fullAttackGrip.double))throw new Error('Extra attack requires a wielded one-handed weapon or the same double weapon');
 for(const key of Object.keys(penalties))penalties[key]=Math.min(penalties[key],state.penalties[key]);
 const penalty=Object.values(penalties).reduce((a,b)=>a+b,0);
 return {routine,attacks:d.attacks.map(a=>{const reduction=a.multiattackReduction||0,actual=Math.min(0,penalty+reduction),prior=Math.min(0,state.penalty+reduction);return {...withPenalty(a,actual-prior),fullAttackPenalty:actual};}),penalties,penalty};
}
