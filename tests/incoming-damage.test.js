import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {resolveEquipment} from '../src/equipment.js';
import {damageOutcome,applyIncomingDamage} from '../src/incoming-damage.js';
import {recordKnockout,recoveryState,checkConsciousness,receiveHealing,restEightHours} from '../src/recovery.js';
import {rollBellow} from '../src/species-actions.js';
import {validatePack} from '../tools/validate-rules.js';
import {createHouseRules} from '../src/house-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const hero=()=>{const c=newCharacter(pack);c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};c.levels[0].classId='class:soldier';return c;};
const stats=c=>({...derive(c,pack),threshold:10});

test('reviewed stun modes retain physical types and dice; grenade payloads inherit stun-only effects',()=>{
 validatePack(pack);const c=hero();const baton=item('stun-baton');assert.equal(resolveEquipment(baton,pack,c).damage,'1d6');assert.equal(resolveEquipment(baton,pack,c).damageType,'Bludgeoning');baton.damageSetting='stun';assert.equal(resolveEquipment(baton,pack,c).damage,'2d6');assert.equal(resolveEquipment(baton,pack,c).damageType,'Energy (Stun)');
 const grenade=resolveEquipment(item('stun-grenade'),pack,c);assert.equal(grenade.damageEffect,'stun');assert.equal(grenade.damageType,'Energy (Stun)');
 const launcher=resolveEquipment(item('grenade-launcher',{ammunitionId:'equipment:stun-grenade'}),pack,c);assert.equal(launcher.damageEffect,'stun');assert.equal(launcher.damage,'4d6');assert.equal(launcher.damageType,'Energy (Stun)');assert(!launcher.stunRange);
 assert.equal(resolveEquipment(item('ion-pistol'),pack,c).damageEffect,'ion');
});

test('blaster stun has an unextended six-square range, even with Accurate, Far Shot, scopes or a folded stock',()=>{
 const c=hero();c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:far-shot'}];const scope=item('targeting-scope');c.inventory=[item('sporting-blaster-pistol',{damageSetting:'stun',aimed:true,scopeUid:scope.uid,distance:6}),scope];let a=derive(c,pack).attacks[0];assert.equal(a.range.penalty,0);assert.equal(a.range.band,0);assert.deepEqual(a.range.limits,[6,6,6,6]);assert(a.available);
 c.inventory[0].distance=7;assert(!derive(c,pack).attacks[0].available);c.inventory[0].damageSetting='normal';assert(derive(c,pack).attacks[0].available);
 c.inventory=[item('blaster-rifle',{damageSetting:'stun',fireMode:'autofire',shotsRemaining:10,distance:6,stockPosition:'folded'})];a=derive(c,pack).attacks[0];assert.equal(a.damageEffect,'stun');assert.equal(a.ammunition.cost,10);assert(a.available);assert.equal(a.areaType,'burst');
 c.inventory=[item('force-pike',{damageSetting:'stun'})];assert.equal(derive(c,pack).attacks[0].range.limits,null);
});

test('normal damage compares protected damage to the current threshold and moves one step; zero HP becomes Helpless',()=>{
 const c=hero();c.protection={dr:3,drBypass:'',sr:5,srMax:5};c.currentHP=30;
 let r=damageOutcome(c,stats(c),pack,17);assert.equal(r.hpDamage,9);assert.equal(r.conditionSteps,0);assert.equal(c.currentHP,30);assert.equal(c.protection.sr,5);
 r=applyIncomingDamage(c,stats(c),pack,18);assert.equal(c.currentHP,20);assert.equal(c.condition,1);assert.equal(c.protection.sr,0);assert(!r.dead);
 c.currentHP=3;c.condition=0;r=applyIncomingDamage(c,stats(c),pack,5,{ignoreDR:true});assert.equal(c.currentHP,0);assert.equal(c.condition,5);assert(!r.dead);validateCharacter(c,pack);
});

test('normal lethal damage records death, while an explicitly spent FP prevents only an eligible zero-HP death',()=>{
 const c=hero();c.currentHP=5;let r=damageOutcome(c,stats(c),pack,10);assert(r.dead&&r.canSurvive);assert.equal(c.forcePoints,5);r=applyIncomingDamage(c,stats(c),pack,10,{spendForcePoint:true});assert(!r.dead);assert.equal(c.forcePoints,4);assert.equal(c.currentHP,0);assert.equal(c.condition,5);assert(!recoveryState(c).dead);validateCharacter(c,pack);
 const doomed=hero();doomed.currentHP=5;r=applyIncomingDamage(doomed,stats(doomed),pack,10);assert(r.dead);assert(recoveryState(doomed).dead);assert.throws(()=>applyIncomingDamage(doomed,stats(doomed),pack,1),/dead/);
 const safe=hero();safe.currentHP=30;applyIncomingDamage(safe,stats(safe),pack,1,{spendForcePoint:true});assert.equal(safe.forcePoints,5,'No gratuitous FP spending');
 const empty=hero();empty.currentHP=5;empty.forcePoints=0;const before=structuredClone(empty);assert.throws(()=>applyIncomingDamage(empty,stats(empty),pack,10,{spendForcePoint:true}),/cannot prevent/);assert.deepEqual(empty,before);
});

test('already-unconscious normal targets die at threshold even with HP remaining; FPs cannot save that positive-HP case',()=>{
 const c=hero();c.currentHP=30;c.condition=5;const before=structuredClone(c);assert.throws(()=>applyIncomingDamage(c,stats(c),pack,10,{spendForcePoint:true}),/cannot prevent/);assert.deepEqual(c,before);
 const r=applyIncomingDamage(c,stats(c),pack,10);assert(r.dead);assert.equal(c.currentHP,0);assert(recoveryState(c).dead);
});

test('stun halves HP damage after protection, compares before halving, and preserves unconsciousness immunity',()=>{
 const c=hero();c.currentHP=30;c.protection={dr:2,drBypass:'',sr:4,srMax:4};let r=applyIncomingDamage(c,stats(c),pack,16,{type:'stun'});assert.equal(r.hpDamage,5);assert.equal(c.currentHP,25);assert.equal(c.condition,2);assert.equal(c.protection.sr,0);
 c.currentHP=20;c.condition=4;r=applyIncomingDamage(c,stats(c),pack,12,{type:'stun'});assert.equal(c.condition,5);assert.equal(c.currentHP,15);assert(c.recovery.stunUnconscious);assert(!r.dead);
 for(const [natural,value] of [[1,30],[5,5]]){const result=checkConsciousness(c,stats(c),pack,()=>({d20:[natural],value}));assert(!result.dead&&!result.success);assert(!c.recovery.dead);assert(c.recovery.unconsciousRetry);assert(c.recovery.persistent.includes('injury'));}
 receiveHealing(c,stats(c),pack,1);assert.equal(c.currentHP,1);assert(!c.recovery.stunUnconscious);validateCharacter(c,pack);
 const low=hero();low.currentHP=1;r=applyIncomingDamage(low,stats(low),pack,20,{type:'stun'});assert(!r.dead);assert.equal(low.currentHP,0);assert.equal(low.condition,5);
});

test('droids are immune to stun without losing shield charge; dedicated ion halves HP for both organic and electronic targets',()=>{
 const droidPack=structuredClone(pack);droidPack.species.find(s=>s.id==='species:human').isDroid=true;const c=hero();c.protection={dr:3,drBypass:'',sr:5,srMax:5};const before=structuredClone(c);
 let r=applyIncomingDamage(c,{...derive(c,droidPack),threshold:10},droidPack,100,{type:'stun'});assert(r.immune);assert.equal(c.protection.sr,5);assert.equal(c.currentHP,derive(before,droidPack).hp);assert.equal(c.condition,0);
 c.protection.sr=0;c.protection.dr=0;c.currentHP=30;r=applyIncomingDamage(c,{...derive(c,droidPack),threshold:10},droidPack,11,{type:'ion'});assert.equal(c.currentHP,25);assert.equal(c.condition,2);assert(!r.dead);
 const organic=hero();organic.currentHP=30;applyIncomingDamage(organic,stats(organic),pack,11,{type:'ion'});assert.equal(organic.currentHP,25);assert.equal(organic.condition,0);
 organic.cybernetic=true;applyIncomingDamage(organic,stats(organic),pack,10,{type:'ion'});assert.equal(organic.currentHP,20);assert.equal(organic.condition,2);validateCharacter(organic,pack);
 organic.currentHP=1;applyIncomingDamage(organic,stats(organic),pack,10,{type:'ion'});assert.equal(organic.condition,5);assert(!recoveryState(organic).stunUnconscious);assert(!recoveryState(organic).dead);
});

test('the saved zero-HP ambiguity enables Stun/Ion death and FP survival without changing immunity or positive-HP knockouts',()=>{
 for(const type of ['stun','ion']){
  const c=hero();c.currentHP=1;assert(!damageOutcome(c,stats(c),pack,10,{type}).dead);
  c.houseRules={ambiguities:{'ambiguity:stun-ion-death':'general-death'}};
  const lethal=damageOutcome(c,stats(c),pack,10,{type});assert(lethal.dead&&lethal.canSurvive);
  const survived=applyIncomingDamage(c,stats(c),pack,10,{type,spendForcePoint:true});assert(!survived.dead);assert.equal(c.forcePoints,4);assert.equal(c.currentHP,0);assert.equal(c.condition,5);validateCharacter(c,pack);
  const doomed=hero();doomed.currentHP=1;doomed.houseRules=structuredClone(c.houseRules);applyIncomingDamage(doomed,stats(doomed),pack,10,{type});assert(recoveryState(doomed).dead);
  const low=hero();low.currentHP=1;low.houseRules=structuredClone(c.houseRules);assert(!damageOutcome(low,stats(low),pack,2,{type}).dead,'Below-threshold zero HP remains nonfatal');
  c.currentHP=20;c.condition=5;assert(!damageOutcome(c,stats(c),pack,10,{type}).dead,'Alternative only applies when HP reaches zero');
 }
 const droidPack=structuredClone(pack);droidPack.species.find(s=>s.id==='species:human').isDroid=true;
 const droid=hero();droid.currentHP=1;droid.houseRules={ambiguities:{'ambiguity:stun-ion-death':'general-death'}};assert(damageOutcome(droid,stats(droid),droidPack,100,{type:'stun'}).immune);assert(damageOutcome(droid,stats(droid),droidPack,10,{type:'ion'}).dead);
 const ui=createHouseRules(pack);ui.setTab('ambiguities');const html=ui.render(hero());assert(html.includes('If the Stun Damage reduces'));assert(html.includes('If the Ion Damage reduces'));assert(html.includes('instead suffers'));assert(html.includes('value="knockout" selected'));
 const bad=structuredClone(pack);bad.rules.ambiguities.at(-1).passages[0].paragraphCount=1;assert.throws(()=>validatePack(bad),/excerpt/);
});

test('natural rest uses the selected unconscious healing rule and retains the once-per-day ledger across revival',()=>{
 const c=hero();c.currentHP=20;c.condition=5;recordKnockout(c,'stun');const r=restEightHours(c,stats(c),pack);assert.equal(r.before,20);assert.equal(r.after,1);assert.equal(c.currentHP,1);assert.equal(c.condition,0);assert(c.recovery.naturalHealingUsed);assert(!c.recovery.stunUnconscious);assert.equal(restEightHours(c,stats(c),pack).after,1,'No second natural healing');
 const add=hero();add.currentHP=20;add.condition=5;add.houseRules={ambiguities:{'ambiguity:unconscious-healing':'add'}};restEightHours(add,stats(add),pack);assert.equal(add.currentHP,21);assert(add.recovery.naturalHealingUsed);
});

test('successful consciousness and Bellow clear stale stun cause, while invalid damage/settings remain atomic',()=>{
 const c=hero();c.currentHP=10;c.condition=5;recordKnockout(c,'stun');checkConsciousness(c,stats(c),pack,()=>({d20:[10],value:10}));assert(!c.recovery.stunUnconscious);
 c.species='species:ithorian';c.recovery.stunUnconscious=true;rollBellow(c,derive(c,pack),pack,5,null,expr=>({d20:expr.startsWith('1d20')?[1]:[],value:1,display:expr,coeffs:[1]}));assert.equal(c.condition,5);assert(!c.recovery.stunUnconscious);
 for(const value of [NaN,-1,1.5]){const before=structuredClone(c);assert.throws(()=>applyIncomingDamage(c,stats(c),pack,value));assert.deepEqual(c,before);}
 for(const extra of [{id:'equipment:knife',damageSetting:'stun'},{id:'equipment:blaster-pistol',damageSetting:'bad'}]){const bad=hero();bad.inventory=[item('blaster-pistol',extra)];assert.throws(()=>validateCharacter(bad,pack),/setting/);}
 assert.throws(()=>validateCharacter({...hero(),cybernetic:'yes'},pack),/cybernetic/);const bad=hero();recordKnockout(bad,'stun');bad.recovery.stunUnconscious='yes';assert.throws(()=>validateCharacter(bad,pack),/recovery/);
});
