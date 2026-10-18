import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack} from '../src/rules.js';
import {chooseSpeciesOption,speciesChoiceDetails} from '../src/species-choices.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {naturalAttackId,validAttackReference} from '../src/attack-refs.js';
import {increaseNaturalDie,setNaturalModifier} from '../src/natural-weapons.js';
import {rollCombatRoutine} from '../src/combat.js';
import {planFullAttack} from '../src/full-attacks.js';
import {planOpportunity} from '../src/opportunity.js';
import {recordAttackFollowUps,planCleave} from '../src/attack-follow-ups.js';
import {queueAction} from '../src/action-economy.js';
import {takeAction} from '../src/action-engine.js';
import {createStore,STORAGE_KEY} from '../src/persistence.js';
import {purchaseQuote,resolveEquipment} from '../src/equipment.js';
import {renderStatBlock} from '../src/stat-block.js';
import {evalExpr} from '../src/dice.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const hero=id=>{const c=newCharacter(pack,{classId:'class:soldier'});Object.assign(c,{species:'species:'+id,abilityMethod:'manual',abilities:{str:12,dex:18,con:12,int:12,wis:12,cha:12},trainedSkills:[]});delete c.abilityGeneration;c.levels[0].feats=[];c.levels[0].talent=null;return c;};
const step=(uid,source)=>({id:crypto.randomUUID(),attackId:uid,count:1,attackMod:0,damageMod:0,...(source?{source}:{})});
const routine=(...steps)=>({id:crypto.randomUUID(),name:'Natural attacks',steps});
const roll=expr=>expr.startsWith('1d20')?{value:12,d20:[12],display:expr,coeffs:[1]}:evalExpr(expr);
const natural=(c,id='claws')=>derive(c,pack).attacks.find(a=>a.naturalWeaponId===id);

test('printed natural weapons are separate armed attacks with their own damage and stable references',()=>{
 const expected={'cathar':[['claws','1d6','Slashing']],'nosaurian':[['horns','1d6','Piercing']],'shistavanen':[['claws','1d6','Slashing']],'barabel':[['claws','1d6','Slashing'],['bite','1d6','Piercing'],['tail','1d6','Bludgeoning']],'ishi-tib':[['beak','1d6','Piercing']],'mantellian-savrip':[['claws','1d6','Slashing']],'talz':[['claws','1d6','Slashing']],'trianii':[['claws','1d6','Slashing']],'whiphid':[['claws','1d6','Slashing']],'yevetha':[['claws','1d6','Slashing']],'yuzzem':[['bite','1d8','Piercing'],['claws','1d8','Slashing']]};
 for(const [id,rows]of Object.entries(expected)){
  const c=hero(id),d=derive(c,pack),attacks=d.attacks.filter(a=>a.natural);assert.equal(attacks.length,rows.length,id);
  for(const [id,damage,type]of rows){const a=attacks.find(a=>a.naturalWeaponId===id);assert(a);assert.equal(a.damage,damage);assert.equal(a.damageType,type);assert(a.opportunityWeapon);assert(a.proficient);assert(a.unarmed);assert.equal(a.uid,naturalAttackId(c.id,id));assert(validAttackReference(a.uid));assert(a.article.blocks.length);}
  assert.equal(new Set(d.attacks.map(a=>a.uid)).size,d.attacks.length);validateCharacter(c,pack);
 }
 assert(!ix.species.get('species:lugubraa').naturalWeapons,'unspecified damage type and printed ld6 remain manual');
});

test('Martial Arts improves the natural die from its own base and preserves multiple dice',()=>{
 const c=hero('cathar');assert.equal(natural(c).damage,'1d6');c.levels[0].feats=[{id:'feat:martial-arts-i'}];assert.equal(natural(c).damage,'1d8');resizeLevelPlan(c,pack,6);for(let i=1;i<6;i++)choosePlannedClass(c,pack,i,'class:soldier');c.levels[2].feats=[{id:'feat:martial-arts-ii'}];c.levels[5].feats=[{id:'feat:martial-arts-iii'}];const d=derive(c,pack);assert.equal(natural(c).damage,'1d12');assert.equal(d.attacks.find(a=>!a.natural&&a.unarmed).damage,'1d10');assert.equal(increaseNaturalDie('2d6',1,pack),'2d8');assert.equal(increaseNaturalDie('4d6',3,pack),'4d12');
});

test('Killik default and all nine optional size profiles follow the printed table',()=>{
 const c=hero('killik');c.abilities.dex=12;const initial=derive(c,pack);assert.equal(initial.size,'medium');assert(!speciesChoiceDetails(c,pack,initial.ctx,initial.rows[0].ctx)[0].issue);assert.equal(natural(c).damage,'1d6');
 const rows=[['fine',4,4,20,14,10,20,0,'1d1'],['diminutive',4,6,18,14,5,15,0,'1d2'],['tiny',4,8,16,14,2,10,0,'1d3'],['small',4,10,14,14,1,5,0,'1d4'],['medium',6,12,12,14,0,0,0,'1d6'],['large',6,20,10,22,-1,-5,5,'1d8'],['huge',4,28,8,30,-2,-10,10,'2d6'],['gargantuan',4,36,8,38,-5,-15,20,'3d6'],['colossal',4,44,8,46,-10,-20,50,'4d6']];
 const uid=natural(c).uid;
 for(const [size,speed,str,dex,con,reflex,stealth,threshold,damage]of rows){
  chooseSpeciesOption(c,pack,'size',size);const d=derive(c,pack);assert.equal(d.size,size);assert.equal(d.speed,speed);assert.equal(d.scores.str,str);assert.equal(d.scores.dex,dex);assert.equal(d.scores.con,con);assert.equal(d.scores.int,10);assert.equal(d.defenses.reflex,10+1+Math.floor((dex-10)/2)+1+1+reflex);assert.equal(d.skills.find(s=>s.id==='skill:stealth').total,Math.floor((dex-10)/2)+stealth);assert.equal(d.threshold-d.defenses.fortitude,threshold);assert.equal(natural(c).damage,damage);assert.equal(natural(c).uid,uid);if(!['small','medium','large'].includes(size))assert(d.manualAttacks.some(a=>a.name==='Unarmed Attack'));validateCharacter(c,pack);
 }
 c.species='species:human';assert(!derive(c,pack).attacks.some(a=>a.natural));c.species='species:killik';assert.equal(derive(c,pack).size,'colossal');chooseSpeciesOption(c,pack,'size',null);assert.equal(derive(c,pack).size,'medium');assert.deepEqual(ix.species.get(c.species).abilityAdjustments,{con:2,int:-2});
});

test('constant Fine damage, Martial Arts, extra dice and ordinary minimum damage remain real calculations',()=>{
 const c=hero('killik');chooseSpeciesOption(c,pack,'size','fine');let a=natural(c);assert.equal(a.damage,'1d1');assert(!a.damageDisplay.includes('d1'));const r=routine(step(a.uid)),result=rollCombatRoutine(r,derive(c,pack),pack,roll);assert.equal(result.results[0].damage,1);
 c.abilities.str=30;c.levels[0].feats=[{id:'feat:mighty-swing'}];c.mightySwing=true;a=natural(c);assert.equal(a.damage,'2d1');assert.equal(a.damageDisplay,'2+6');assert.equal(rollCombatRoutine(r,derive(c,pack),pack,roll).results[0].damage,8);
});

test('natural settings are independent and persist while inactive; routines can mix damage types',()=>{
 const c=hero('barabel');setNaturalModifier(c,pack,'claws','damageMod',3);setNaturalModifier(c,pack,'bite','attackMod',2);const d=derive(c,pack),claws=natural(c),bite=natural(c,'bite'),tail=natural(c,'tail');assert.equal(claws.damageBonus,bite.damageBonus+3);assert.equal(bite.attack,claws.attack+2);assert.equal(tail.damageBonus,bite.damageBonus);assert.equal(d.attacks.find(a=>a.unarmed&&!a.natural).damageBonus,bite.damageBonus);
 const r=routine(step(claws.uid),step(bite.uid),step(tail.uid));c.routines=[r];const results=rollCombatRoutine(r,d,pack,roll).results;assert.equal(results.length,3);assert.deepEqual(results.map(a=>a.name),['Claws','Bite','Tail']);validateCharacter(c,pack);assert(renderStatBlock(c,d,pack).includes('Claws'));c.species='species:human';assert.throws(()=>rollCombatRoutine(r,derive(c,pack),pack,roll),/unavailable/);validateCharacter(c,pack);c.species='species:barabel';assert.equal(natural(c).damageBonus,claws.damageBonus);assert.equal(natural(JSON.parse(JSON.stringify(c))).uid,claws.uid);
});

test('Full Attack, opportunity attacks, Cleave and action planning use natural references',()=>{
 const c=hero('killik');c.abilities.str=14;resizeLevelPlan(c,pack,3);for(let i=1;i<3;i++)choosePlannedClass(c,pack,i,'class:soldier');c.levels[0].feats=[{id:'feat:power-attack'}];c.levels[2].feats=[{id:'feat:cleave'}];chooseSpeciesOption(c,pack,'size','medium');const d=derive(c,pack),claw=natural(c),base=d.attacks.find(a=>a.unarmed&&!a.natural),r={...routine(step(claw.uid,'base'),step(base.uid,'twoWeapons')),kind:'fullAttack'};c.routines=[r];const plan=planFullAttack(r,d,pack);assert.equal(plan.penalty,-10);assert.equal(plan.attacks.find(a=>a.uid===claw.uid).fullAttackPenalty,-8);assert.equal(plan.attacks.find(a=>a.uid===claw.uid).attack,claw.attack-8);
 c.opportunity={opponent:'Guard',action:'Guard moves',provoked:true,used:[]};assert.equal(planOpportunity(c,derive(c,pack),pack,claw.uid).attack.uid,claw.uid);assert.throws(()=>planOpportunity(c,derive(c,pack),pack,base.uid),/Weapon cannot/);
 const result=rollCombatRoutine(routine(step(claw.uid)),derive(c,pack),pack,roll);recordAttackFollowUps(c,result);Object.assign(c.followUp,{opponent:'Guard',nextOpponent:'Other guard',dropped:true,immediate:true,inReach:true});assert.equal(planCleave(c,derive(c,pack),pack).attack.uid,claw.uid);validateCharacter(c,pack);
 const queued=queueAction(c,'attack',{uid:claw.uid});assert.equal(queued.options.uid,claw.uid);const fresh=hero('killik');const uid=natural(fresh).uid;takeAction(fresh,pack,'attack',{uid},roll);assert.equal(fresh.actionState.plan[0].status,'done');validateCharacter(fresh,pack);
});

test('duplication and import rebind natural routine/action references without changing inventory references',t=>{
 const previousWindow=globalThis.window,previousDocument=globalThis.document;t.after(()=>{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});
 globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};const c=hero('barabel'),uid=natural(c).uid;c.routines=[routine(step(uid))];queueAction(c,'attack',{uid});const map=new Map([[STORAGE_KEY,JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]})]]),store=createStore(pack,()=>{},{getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)});store.duplicate();let copy=store.current();assert.notEqual(copy.id,c.id);assert.equal(copy.routines[0].steps[0].attackId,naturalAttackId(copy.id,'claws'));assert.equal(copy.actionState.plan[0].options.uid,naturalAttackId(copy.id,'claws'));validateCharacter(copy,pack);copy=store.import(JSON.stringify(c));assert.equal(copy.routines[0].steps[0].attackId,naturalAttackId(copy.id,'claws'));validateCharacter(copy,pack);
});

test('unusual-sized armor has manual prices/weights and explicit fit instead of Medium-sized defaults',()=>{
 const c=hero('killik');chooseSpeciesOption(c,pack,'size','fine');const e={id:'equipment:blast-helmet-and-vest',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,armorSize:'fine',weightOverride:0};c.inventory=[e];let q=purchaseQuote(e,1,pack,c);assert.equal(q.total,null);assert(q.item.purchasePending);assert(q.item.manualSize);assert.equal(q.item.weight,0);assert(derive(c,pack).armor);validateCharacter(c,pack);delete e.weightOverride;assert.equal(resolveEquipment(e,pack,c).weight,null);e.armorSize='medium';e.weightOverride=0;assert(!derive(c,pack).armor);assert(derive(c,pack).issues.some(s=>s.includes('fits medium')));e.armorSize='small';assert.equal(purchaseQuote(e,1,pack,c).item.cost,250);
});

test('natural and size data, references and modifiers reject malformed values',()=>{
 for(const change of [r=>r.naturalWeapons[0].damage='ld6',r=>r.naturalWeapons[0].damageType='Unknown',r=>r.naturalWeapons[0].extra=true,r=>r.naturalWeapons.push({...r.naturalWeapons[0]}),r=>r.creationChoices[0].defaultOption='missing',r=>r.creationChoices[0].options[0].size='other',r=>r.creationChoices[0].options[0].adjustments.str=0]){const p=structuredClone(pack);change(p.species.find(r=>r.id==='species:killik'));assert.throws(()=>validatePack(p));}
 const c=hero('killik');for(const modifiers of [null,[],{unknown:{attackMod:0,damageMod:0}},{claws:{attackMod:101,damageMod:0}},{claws:{attackMod:0,damageMod:0,attackTechnique:'autofire'}}])assert.throws(()=>validateCharacter({...c,naturalModifiers:modifiers},pack));assert(!validAttackReference('natural:not-a-uuid:claws'));assert(!validAttackReference(naturalAttackId(c.id,'<script>')));const before=JSON.stringify(c);assert.throws(()=>setNaturalModifier(c,pack,'claws','damageMod',1000));assert.equal(JSON.stringify(c),before);
});
