import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {resolveEquipment,purchaseQuote} from '../src/equipment.js';
import {rollRoutine} from '../src/combat.js';
import {createStore,STORAGE_KEY} from '../src/persistence.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:!id.startsWith('targeting-scope'),twoHanded:false,attackMod:0,damageMod:0,...extra});
const hero=(cls='soldier')=>{const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};c.levels[0].classId='class:'+cls;return c;};
const routine=(...steps)=>({name:'Shots',steps:steps.map(([attackId,count=1])=>({attackId,count,attackMod:0,damageMod:0}))});
const roller=expressions=>expr=>{expressions.push(expr);return {value:12,d20:expr.startsWith('1d20')?[12]:[],display:expr,coeffs:[1]};};
function feats(c){c.levels=Array.from({length:6},(_,i)=>({classId:'class:soldier',hpRoll:i?5:null,feats:i===0?[{id:'feat:point-blank-shot'},{id:'feat:precise-shot'}]:i===2?[{id:'feat:careful-shot'}]:i===5?[{id:'feat:deadeye'}]:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));}

test('reviewed scope variants, stock prices and sources validate without enabling homebrew',()=>{
 validatePack(pack);assert.deepEqual(pack.equipment.filter(e=>e.scope).map(e=>[e.variant,e.cost,e.weight,e.scope.ignoresDarkness]),[['Standard',100,.2,false],['Enhanced Low-Light',1000,1.2,true]]);
 const c=hero();const rifle=item('blaster-rifle',{stockPosition:'none'}),carbine=item('blaster-carbine',{stockPosition:'none'});
 assert.equal(resolveEquipment(rifle,pack,c).cost,900);assert.equal(resolveEquipment(carbine,pack,c).cost,850);assert.equal(purchaseQuote(rifle,1,pack,c).total,990);
 assert.equal(resolveEquipment({...rifle,stockPosition:'extended'},pack,c).cost,1000);
 const p=structuredClone(pack);p.equipment.find(e=>e.scope).scope.rangeReduction=2;assert.throws(()=>validatePack(p),/scope/);
});

test('folded stocks use pistol proficiency/ranges; extended rifles penalize one-handed use',()=>{
 const c=hero('noble');c.inventory=[item('blaster-rifle',{distance:35})];let a=derive(c,pack).attacks[0];assert(!a.proficient);assert.equal(a.range.penalty,-2);
 c.inventory[0].stockPosition='folded';a=derive(c,pack).attacks[0];assert(a.proficient);assert.equal(a.group,'pistols');assert.deepEqual(a.range.limits,[20,40,60,80]);assert.equal(a.attack,derive(Object.assign(hero('noble'),{inventory:[item('blaster-pistol',{distance:35})]}),pack).attacks[0].attack);
 c.inventory[0].stockPosition='extended';const before=derive(c,pack).attacks[0].attack;c.inventory[0].oneHanded=true;assert.equal(derive(c,pack).attacks[0].attack,before-5);
 c.inventory[0].stockPosition='folded';assert.equal(derive(c,pack).attacks[0].attack,a.attack);
 c.inventory=[item('sporting-blaster-rifle')];const ordinary=derive(c,pack).attacks[0].attack;c.inventory[0].oneHanded=true;assert.equal(derive(c,pack).attacks[0].attack,ordinary-5);
});

test('scope/Accurate/Far Shot Counseling matches every published range combination',()=>{
 for(const accurate of [false,true])for(const far of [false,true])for(const aimed of [false,true]){
  const c=hero();if(far)c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:far-shot'}];const scope=item('targeting-scope');c.inventory=[item(accurate?'sporting-blaster-rifle':'blaster-rifle',{scopeUid:scope.uid,aimed}),scope];
  const expected=accurate?(far&&aimed?[0,0,0,0]:far||aimed?[0,0,0,-5]:[0,0,-5,-10]):far&&aimed?[0,0,0,-2]:far||aimed?[0,0,-2,-5]:[0,-2,-5,-10];
  for(const [i,d] of [20,40,70,200].entries()){c.inventory[0].distance=d;assert.equal(derive(c,pack).attacks[0].range.penalty,expected[i],JSON.stringify({accurate,far,aimed,d}));}
 }
});

test('scope bonuses require Aim and a carried scope, respect inaccurate limits and leave Point-Blank Shot at actual distance',()=>{
 const c=hero();c.levels[0].feats=[{id:'feat:point-blank-shot'}];const scope=item('targeting-scope');c.inventory=[item('blaster-rifle',{scopeUid:scope.uid,distance:40}),scope];
 let a=derive(c,pack).attacks[0];assert.equal(a.range.penalty,-2);c.inventory[0].aimed=true;a=derive(c,pack).attacks[0];assert.equal(a.range.penalty,0);assert.equal(a.damageBonus,0);assert(a.ignoresCover);assert(!a.ignoresDarkness);
 scope.carried=false;assert.equal(derive(c,pack).attacks[0].range.penalty,-2);scope.carried=true;
 c.inventory[0]=item('blaster-carbine',{aimed:true,scopeUid:scope.uid,distance:151});assert(!derive(c,pack).attacks[0].available);
 c.inventory[0].distance=40;c.inventory[0].fireMode='autofire';a=derive(c,pack).attacks[0];assert(!a.aimed);assert.equal(a.range.penalty,-2);
});

test('disabling Counseling restores explicit Far Shot penalties with scope category reduction',()=>{
 const c=hero(),scope=item('targeting-scope');c.inventory=[item('sporting-blaster-rifle',{scopeUid:scope.uid,aimed:true,distance:200}),scope];c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:far-shot'}];
 assert.equal(derive(c,pack).attacks[0].range.penalty,0);c.houseRules={jediCounseling:{'jc:107-far-shot-accurate-weapon-and-targeting-scope':false}};assert.equal(derive(c,pack).attacks[0].range.penalty,-2);
 c.inventory[0].aimed=false;assert.equal(derive(c,pack).attacks[0].range.penalty,-5);
});

test('Careful Shot/Deadeye and enhanced low-light affect only the first aimed routine attack',()=>{
 const c=hero();feats(c);const scope=item('targeting-scope-low-light');c.inventory=[item('blaster-rifle',{scopeUid:scope.uid,aimed:true,distance:70}),scope];const a=derive(c,pack).attacks[0];assert(a.ignoresDarkness);assert.equal(a.damage,'4d8');assert.equal(a.attack-a.unAimed.attack,4);
 const expressions=[],result=rollRoutine(routine([a.uid,2]),derive(c,pack).attacks,pack.rules.combat,roller(expressions));
 assert.deepEqual(result.results.map(r=>r.aimed),[true,false]);assert.deepEqual(result.results.map(r=>r.ignoresDarkness),[true,false]);assert(expressions[1].startsWith('4d8'));assert(expressions[3].startsWith('3d8'));assert.deepEqual(result.aimConsumed,[a.uid]);assert(result.html.includes('Ignores Concealment from darkness'));assert(c.inventory[0].aimed);
 const miss=rollRoutine(routine([a.uid,2]),derive(c,pack).attacks,pack.rules.combat,expr=>expr.startsWith('1d20')?{value:1,d20:[1],display:expr,coeffs:[1]}:roller([])(expr));assert.deepEqual(miss.results.map(r=>r.aimed),[true,false]);
});

test('another attack before the aimed weapon loses Aim; unavailable routines leave it intact',()=>{
 const c=hero();feats(c);c.inventory=[item('blaster-rifle',{aimed:true}),item('blaster-pistol')];const attacks=derive(c,pack).attacks;
 const result=rollRoutine(routine([c.inventory[1].uid],[c.inventory[0].uid]),attacks,pack.rules.combat,roller([]));assert(result.results.every(r=>!r.aimed));assert.deepEqual(result.aimConsumed,[c.inventory[0].uid]);
 c.inventory[1].distance=100;assert.throws(()=>rollRoutine(routine([c.inventory[1].uid],[c.inventory[0].uid]),derive(c,pack).attacks,pack.rules.combat,()=>assert.fail('Must preflight')),/unavailable/);assert(c.inventory[0].aimed);
});

test('scope references and capacity validate; attachment identity survives import and duplication',()=>{
 const c=hero(),scope=item('targeting-scope');c.inventory=[item('blaster-rifle',{scopeUid:scope.uid}),scope];validateCharacter(c,pack);
 for(const mutate of [c=>c.inventory[0].scopeUid=crypto.randomUUID(),c=>c.inventory[0].scopeUid=c.inventory[0].uid,c=>c.inventory.push(item('blaster-pistol',{scopeUid:scope.uid})),c=>c.inventory[0].aimed='yes',c=>c.inventory[0].stockPosition='broken']){const bad=structuredClone(c);mutate(bad);assert.throws(()=>validateCharacter(bad,pack),/scope|aim|stock/);}
 c.inventory.push(item('blaster-pistol',{scopeUid:scope.uid}));scope.quantity=2;validateCharacter(c,pack);c.inventory.pop();
 globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};const data=new Map([[STORAGE_KEY,JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]})]]);const store=createStore(pack,()=>{},{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
 const imported=store.import(JSON.stringify(c));assert.equal(imported.inventory[0].scopeUid,imported.inventory[1].uid);store.duplicate();assert.equal(store.current().inventory[0].scopeUid,store.current().inventory[1].uid);validateCharacter(store.current(),pack);
});
