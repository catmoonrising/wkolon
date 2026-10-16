import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,eligible,validateCharacter} from '../src/rules.js';
import {featureChoices,choiceName,UNARMED_ID} from '../src/feature-choices.js';
import {resolveEquipment} from '../src/equipment.js';
import {featureGraph} from '../src/feature-trees.js';
import {rollRoutine} from '../src/combat.js';
import {createStore,STORAGE_KEY} from '../src/persistence.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const hero=(cls='soldier',size='human')=>{const c=newCharacter(pack,{classId:'class:scoundrel'});c.species='species:'+size;c.abilityMethod='manual';c.abilities={str:14,dex:18,con:10,int:13,wis:12,cha:10};c.levels[0].classId='class:'+cls;return c;};
const can=(id,ctx,choice)=>eligible(ix.feats.get('feat:'+id),{id:'feat:'+id,...(choice?{choice}:{})},ctx,ix,'feats');
const routine=uid=>({name:'Test',steps:[{attackId:uid,count:1,attackMod:0,damageMod:0}]});
const roller=(die,total,damage)=>expr=>({value:expr.startsWith('1d20')?total:damage,d20:expr.startsWith('1d20')?[die]:[],display:expr,coeffs:[],rollId:1});

test('every Core feat and weapon page is reviewed, enabled and has its original article',()=>{
 validatePack(pack);
 for(const r of pack.catalog.records.filter(r=>['feat','weapon'].includes(r.kind))){assert.equal(r.status,'available',r.name);assert(r.mechanicsIds.length);for(const id of r.mechanicsIds)assert((ix.feats.get(id)||ix.equipment.get(id)).article.blocks.length);}
 assert(pack.catalog.records.filter(r=>r.kind==='weapon'&&r.books.includes('Core Rulebook')).length>=48);
 assert.equal(ix.equipment.get('equipment:net').damage,null);
 assert.equal(ix.equipment.get('equipment:amphistaff').cost,null);
 assert.equal(ix.equipment.get('equipment:double-bladed-lightsaber').double,true);
});

test('feat choices separate specific weapons from groups and exclude nonexotic equipment',()=>{
 const exotic=featureChoices(ix.feats.get('feat:exotic-weapon-proficiency'),pack);
 assert(exotic.includes('equipment:bowcaster'));assert(!exotic.includes('equipment:blaster-pistol'));assert(!exotic.includes(UNARMED_ID));
 const crit=featureChoices(ix.feats.get('feat:triple-crit'),pack);assert(crit.includes('equipment:blaster-pistol'));assert(crit.includes(UNARMED_ID));assert(!crit.includes('pistols'));
 assert.equal(choiceName('equipment:bowcaster',pack),'Bowcaster');
 const ctx=derive(hero(),pack).ctx;
 assert(can('exotic-weapon-proficiency',ctx,'equipment:bowcaster'));assert(!can('exotic-weapon-proficiency',ctx,'equipment:blaster-pistol'));
 ctx.bab=8;assert(can('triple-crit',ctx,'equipment:blaster-pistol'));assert(!can('triple-crit',ctx,'equipment:bowcaster'));
 ctx.feats.push({id:'feat:exotic-weapon-proficiency',choice:'equipment:bowcaster'});assert(can('triple-crit',ctx,'equipment:bowcaster'));assert(can('double-attack',ctx,'equipment:bowcaster'));
});

test('Triple Attack requires Double Attack for the same weapon; Rage and size are species prerequisites',()=>{
 const ctx=derive(hero(),pack).ctx;ctx.bab=11;ctx.feats.push({id:'feat:double-attack',choice:'rifles'});
 assert(can('triple-attack',ctx,'rifles'));assert(!can('triple-attack',ctx,'pistols'));
 assert(!can('dreadful-rage',ctx));assert(!can('extra-rage',ctx));assert(can('powerful-charge',ctx));
 const w=derive(hero('soldier','wookiee'),pack).ctx;assert(can('dreadful-rage',w));assert(can('extra-rage',w));
 assert(!can('powerful-charge',derive(hero('soldier','ewok'),pack).ctx));
 const graph=featureGraph(pack,{type:'feats',ctx,allowedIds:pack.feats.map(r=>r.id)});assert(graph.nodes.get('feat:triple-attack|').parents.some(p=>p.key==='feat:double-attack|'));
 w.bab=8;assert(can('double-attack',w,'rifles'));assert(!can('double-attack',w,'equipment:bowcaster'));assert(can('triple-crit',w,'equipment:bowcaster'));
 w.houseRules={jediCounseling:{'jc:112-weapon-familiarity-with-feats-and-talents':false}};assert(can('double-attack',w,'equipment:bowcaster'));
});

test('Martial Arts changes unarmed dice and stacking dodge; Finesse changes attack only; gloves add once',()=>{
 const c=hero();c.levels[0].feats=[{id:'feat:martial-arts-i'},{id:'feat:weapon-finesse'}];
 const d=derive(c,pack),a=d.attacks.at(-1);assert.equal(a.id,UNARMED_ID);assert.equal(a.damage,'1d6');assert.equal(a.attack,5);assert.equal(a.damageBonus,2);
 const baseline=hero();assert.equal(d.defenses.reflex,derive(baseline,pack).defenses.reflex+1);
 c.flatFooted=true;assert.equal(derive(c,pack).defenses.reflex,d.defenses.reflex-5);
 c.flatFooted=false;c.inventory=[item('combat-gloves'),item('combat-gloves-small')];assert.equal(derive(c,pack).attacks.length,1);assert.equal(derive(c,pack).attacks[0].damageBonus,3);
 const small=hero('soldier','ewok');assert.equal(derive(small,pack).attacks.at(-1).damage,'1d3');
 const large=hero('soldier','hutt');assert.equal(derive(large,pack).attacks.at(-1).damage,'1d6');
 c.houseRules={jediCounseling:{'jc:112-unarmed-attacks-and-weapon-finesse':false}};assert.equal(derive(c,pack).attacks[0].attack,3);
});

test('bowcasters use rifle ranges; precise distance gates Point-Blank Shot, Far Shot and inaccurate limits',()=>{
 const c=hero();c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:far-shot'}];c.inventory=[item('bowcaster',{distance:61})];
 let a=derive(c,pack).attacks[0];assert.deepEqual(a.range.limits,[30,60,150,300]);assert.equal(a.range.band,2);assert.equal(a.range.penalty,0);
 c.houseRules={jediCounseling:{'jc:107-far-shot-accurate-weapon-and-targeting-scope':false}};assert.equal(derive(c,pack).attacks[0].range.penalty,-2);
 c.inventory=[item('blaster-pistol')];const ordinary=derive(c,pack).attacks[0];assert.equal(ordinary.range.band,null);
 c.inventory[0].distance=20;a=derive(c,pack).attacks[0];assert.equal(a.attack,ordinary.attack+1);assert.equal(a.damageBonus,ordinary.damageBonus+1);
 c.inventory[0].distance=81;assert.equal(derive(c,pack).attacks[0].available,false);
 c.inventory=[item('blaster-carbine',{distance:151})];assert.equal(derive(c,pack).attacks[0].available,false);
});

test('thrown weapons and bows add Strength; launchers, Amphistaff forms and autofire resolve without changing item identity',()=>{
 const c=hero();c.inventory=[item('knife',{attackStyle:'thrown',distance:8}),item('bow'),item('energy-ball',{launcher:'cesta'}),item('amphistaff',{weaponMode:'whip'}),item('grenade-launcher')];
 let d=derive(c,pack);assert.equal(d.attacks[0].mode,'ranged');assert.equal(d.attacks[0].damageBonus,2);assert.equal(d.attacks[1].damageBonus,2);assert(d.attacks[2].accurate);assert.deepEqual(d.attacks[2].range.limits,[20,40,60,80]);
 assert.equal(d.attacks[3].damage,'1d4');assert.equal(d.attacks[3].reach,2);assert.equal(d.attacks[3].uid,c.inventory[3].uid);
 c.inventory[3].attackStyle='thrown';assert.throws(()=>validateCharacter(c,pack),/attack style/);delete c.inventory[3].attackStyle;
 assert.equal(d.attacks[4].damage,null);assert.throws(()=>rollRoutine(routine(c.inventory[4].uid),d.attacks,pack.rules.combat),/ammunition/);
 c.inventory[4].ammunitionId='equipment:frag-grenade';assert.equal(derive(c,pack).attacks[4].damage,'4d6');
 c.inventory[4].ammunitionId='equipment:thermal-detonator';assert.throws(()=>validateCharacter(c,pack),/grenade ammunition/);
 c.inventory=[item('blaster-rifle')];const single=derive(c,pack).attacks[0];c.inventory[0].fireMode='autofire';const auto=derive(c,pack).attacks[0];assert.equal(auto.attack,single.attack-5);assert.equal(auto.areaType,'burst');
});

test('Triple Crit multiplies the whole damage expression for the selected weapon only',()=>{
 const c=hero();c.levels=Array.from({length:8},(_,i)=>({classId:'class:soldier',hpRoll:i?5:null,feats:[],talent:null,startingFeat:null,abilityIncreases:i===3||i===7?['str','dex']:[],trainedSkills:[]}));
 c.levels[7].feats=[{id:'feat:triple-crit',choice:'equipment:blaster-pistol'}];c.inventory=[item('blaster-pistol'),item('knife')];
 const d=derive(c,pack);assert.equal(d.attacks[0].criticalMultiplier,3);assert.equal(d.attacks[1].criticalMultiplier,2);
 const exprs=[];const result=rollRoutine(routine(c.inventory[0].uid),d.attacks,pack.rules.combat,expr=>{exprs.push(expr);return roller(20,30,33)(expr);});assert.equal(result.results[0].damage,33);assert.equal(exprs[1],`(${d.attacks[0].damageDisplay})*3`);
});

test('area attacks do not crit; misses halve damage, Evasion and cover negate miss damage, splash halves hits',()=>{
 const a={uid:crypto.randomUUID(),name:'Cannon',attack:0,damage:'3d12',damageDisplay:'3d12',areaType:'splash',criticalMultiplier:3};
 let r=rollRoutine(routine(a.uid),[a],pack.rules.combat,roller(20,20,15));assert.equal(r.results[0].critical,false);assert.deepEqual(r.rows,[{lo:null,hi:null,damage:15,evasion:7,cover:15,splash:7}]);
 r=rollRoutine(routine(a.uid),[a],pack.rules.combat,roller(12,12,15));assert.deepEqual(r.rows,[{lo:13,hi:null,damage:7,evasion:0,cover:0,splash:0},{lo:null,hi:12,damage:15,evasion:7,cover:15,splash:7}]);
 r=rollRoutine(routine(a.uid),[a],pack.rules.combat,roller(9,9,15));assert.equal(r.results[0].damage,0);assert.equal(r.rows[0].damage,0);assert(r.html.includes('Miss'));
});

test('Net and unavailable ranges preflight routines without rolling',()=>{
 const c=hero();c.inventory=[item('net')];let calls=0;assert.throws(()=>rollRoutine(routine(c.inventory[0].uid),derive(c,pack).attacks,pack.rules.combat,()=>calls++),/Grab/);assert.equal(calls,0);
 c.inventory=[item('blaster-pistol',{distance:90})];assert.throws(()=>rollRoutine(routine(c.inventory[0].uid),derive(c,pack).attacks,pack.rules.combat,()=>calls++),/unavailable/);assert.equal(calls,0);
});

test('Force Boon adds three points, Strong in the Force uses d8s, and dice count scales by heroic level',()=>{
 const c=hero('jedi');c.levels[0].feats=[{id:'feat:force-boon'},{id:'feat:strong-in-the-force'}];let d=derive(c,pack);assert.equal(d.forceMaximum,8);assert.equal(d.forcePointDie,8);assert.equal(d.forcePointDice,1);
 while(c.levels.length<8)c.levels.push({classId:'class:jedi',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});d=derive(c,pack);assert.equal(d.forceMaximum,12);assert.equal(d.forcePointDice,2);
});

test('per-skill modifiers and optional attack state survive validation; imports and duplicates retain unarmed routines',()=>{
 const c=hero();c.skillModifiers={'skill:stealth':4};c.unarmedModifiers={attackMod:2,damageMod:-1};c.flatFooted=true;c.routines=[{id:crypto.randomUUID(),name:'Punch',steps:[{id:crypto.randomUUID(),attackId:c.id,count:1,attackMod:0,damageMod:0}]}];
 validateCharacter(c,pack);assert.equal(derive(c,pack).skills.find(s=>s.id==='skill:stealth').total,derive(hero(),pack).skills.find(s=>s.id==='skill:stealth').total+4);
 globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};const data=new Map([[STORAGE_KEY,JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]})]]);const store=createStore(pack,()=>{},{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
 const imported=store.import(JSON.stringify(c));assert.equal(imported.routines[0].steps[0].attackId,imported.id);store.duplicate();assert.equal(store.current().routines[0].steps[0].attackId,store.current().id);
 c.inventory=[item('knife',{uid:c.id})];assert.throws(()=>validateCharacter(c,pack),/inventory IDs/);c.inventory=[];
 c.skillModifiers={'skill:imaginary':3};assert.throws(()=>validateCharacter(c,pack),/skill modifiers/);
});
