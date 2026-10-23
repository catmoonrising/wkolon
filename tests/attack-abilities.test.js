import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {setAttackAbility,attackAbilityControl} from '../src/attack-abilities.js';
import {naturalAttackId} from '../src/attack-refs.js';
import {rollCombatRoutine} from '../src/combat.js';
import {takeAction,previewPlan,executeAction} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';
import {createStore,STORAGE_KEY} from '../src/persistence.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,patch={})=>({uid:crypto.randomUUID(),id:'equipment:'+id,quantity:1,equipped:true,carried:true,twoHanded:false,attackMod:0,damageMod:0,...patch});
function hero({finesse=false,fencing=true,focus=false}={}){const c=newCharacter(pack,{classId:'class:noble'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:14,wis:10,cha:18};c.trainedSkills=['skill:deception','skill:persuasion'];c.levels[0].talent=fencing?{id:'talent:noble-fencing-style'}:null;if(focus)c.levels[0].feats=[{id:'feat:weapon-focus',choice:'simple-weapons'}];c.levels.push({classId:'class:noble',hpRoll:4,startingFeat:null,talent:null,feats:finesse?[{id:'feat:weapon-finesse'}]:[],trainedSkills:[],abilityIncreases:[]});c.inventory=[item('knife')];validateCharacter(c,pack);return c;}
const attack=(c,entry=c.inventory[0])=>derive(c,pack).attacks.find(a=>a.uid===entry.uid);
const roller=expr=>({value:expr.startsWith('1d20')?12+Number(expr.slice(4)):5,d20:expr.startsWith('1d20')?[12]:[],display:expr});

test('Noble Fencing selects CHA for proficient light melee weapons, without changing STR damage or base statistics',()=>{
 const c=hero(),a=attack(c),baseline=structuredClone(c);baseline.levels[0].talent=null;const b=attack(baseline);assert.equal(a.abilityDetails.ability,'cha');assert.equal(a.attack-b.attack,3);assert.equal(a.damageBonus,b.damageBonus);assert.equal(derive(c,pack).scores.str,12);assert.match(a.breakdown,/CHA, Noble Fencing Style/);assert.equal(a.abilityDetails.options.length,2);
});
test('substitutions select one modifier, preserve optional lower choices, and do not stack with Weapon Finesse',()=>{
 const c=hero({finesse:true}),auto=attack(c);assert.equal(auto.abilityDetails.ability,'cha');assert.deepEqual(auto.abilityDetails.options.map(o=>o.ability),['str','dex','cha']);setAttackAbility(c,derive(c,pack).attacks,c.inventory[0].uid,'dex');assert.equal(attack(c).attack,auto.attack-1);setAttackAbility(c,derive(c,pack).attacks,c.inventory[0].uid,'str');assert.equal(attack(c).attack,auto.attack-3);assert.equal(attack(c).damageBonus,auto.damageBonus);validateCharacter(c,pack);setAttackAbility(c,derive(c,pack).attacks,c.inventory[0].uid,'auto');assert.equal(c.attackAbilities,undefined);
 c.abilities.str=20;assert.equal(attack(c).abilityDetails.ability,'str');c.abilities.str=6;c.abilities.dex=4;c.abilities.cha=3;assert.equal(attack(c).abilityDetails.ability,'str');
});
test('Noble Fencing requires actual proficiency while Weapon Finesse does not gain that extra restriction',()=>{
 const c=hero({finesse:true});c.inventory=[item('vibroblade')];const a=attack(c);assert(!a.proficient);assert.equal(a.abilityDetails.ability,'dex');assert(!a.abilityDetails.options.some(o=>o.ability==='cha'));c.levels[0].feats=[{id:'feat:weapon-proficiency-advanced-melee-weapons'}];assert.equal(attack(c).abilityDetails.ability,'cha');
 c.inventory=[item('lightsaber')];assert.equal(attack(c).abilityDetails.ability,'dex');c.levels[0].feats=[{id:'feat:weapon-proficiency-lightsabers'}];assert.equal(attack(c).abilityDetails.ability,'cha');
});
test('actual size, ranged/thrown modes and prerequisites gate eligible ability choices',()=>{
 const c=hero();c.inventory=[item('mace')];assert.equal(attack(c).abilityDetails.ability,'str');c.species='species:hutt';assert.equal(attack(c).abilityDetails.ability,'cha');c.species='species:human';
 c.inventory=[item('knife',{attackStyle:'thrown'})];assert.equal(attack(c).mode,'ranged');assert.equal(attack(c).abilityDetails.ability,'dex');
 c.inventory=[item('knife')];c.trainedSkills=['skill:persuasion'];assert.equal(attack(c).abilityDetails.ability,'str');
});
test('the focused one-handed exception is feat-only, requires one wielded physical weapon, and preserves weapon category for damage',()=>{
 const c=hero({finesse:true,focus:true});c.inventory=[item('mace')];assert.equal(attack(c).abilityDetails.ability,'dex');assert(!attack(c).abilityDetails.options.some(o=>o.ability==='cha'));const before=attack(c).damageBonus;c.inventory[0].twoHanded=true;assert.equal(attack(c).abilityDetails.ability,'dex');assert.equal(attack(c).damageBonus,before+1);
 c.inventory.push(item('knife'));assert.equal(attack(c).abilityDetails.ability,'str');c.inventory[1].equipped=false;assert.equal(attack(c).abilityDetails.ability,'dex');c.inventory[0].quantity=2;assert.equal(attack(c).abilityDetails.ability,'dex');c.inventory[1]=item('combat-gloves');assert.equal(attack(c).abilityDetails.ability,'dex');
});
test('enabled unarmed Light classification applies to both relevant sources, while disabling it preserves the size-based baseline',()=>{
 const c=hero({finesse:true});let a=derive(c,pack).attacks.find(a=>a.uid===c.id);assert.equal(a.abilityDetails.ability,'cha');c.houseRules={jediCounseling:{'jc:112-unarmed-attacks-and-weapon-finesse':false}};a=derive(c,pack).attacks.find(a=>a.uid===c.id);assert.equal(a.abilityDetails.ability,'str');
 c.species='species:cathar';c.abilities.cha=20;delete c.houseRules;const natural=derive(c,pack).attacks.find(a=>a.natural);assert(natural);assert.equal(natural.abilityDetails.ability,'cha');
});
test('unavailable saved choices survive JSON and class edits but block actual attacks before action or ammunition spending',()=>{
 const c=hero();setAttackAbility(c,derive(c,pack).attacks,c.inventory[0].uid,'cha');c.levels[0].talent=null;validateCharacter(c,pack);const a=attack(c);assert(!a.available);assert.match(a.issue,/CHA unavailable/);assert(attackAbilityControl(a).includes('CHA (unavailable)'));const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'attack',{uid:a.uid},roller),/unavailable/);assert.deepEqual(c,before);setAttackAbility(c,derive(c,pack).attacks,a.uid,'auto');assert(attack(c).available);
});
test('queued, routine and printed attacks use the same chosen modifier, and invalid stale plans remain atomic',()=>{
 const c=hero({finesse:true}),uid=c.inventory[0].uid;setAttackAbility(c,derive(c,pack).attacks,uid,'dex');const a=attack(c),r=rollCombatRoutine({name:'Cut',steps:[{attackId:uid,count:1,attackMod:0,damageMod:0}]},derive(c,pack),pack,roller);assert.equal(r.results[0].attackBonus,a.attack);const queued=queueAction(c,'attack',{uid});assert(!previewPlan(c,pack)[0].issue);c.levels[1].feats=[];const before=structuredClone(c);assert.throws(()=>executeAction(c,pack,queued.id,roller),/DEX unavailable/);assert.deepEqual(c,before);
});
test('closed saved choices reject malformed references and names, while retaining unused legal references',()=>{
 const c=hero();for(const map of [null,[],{bad:'cha'},{[c.id]:'wis'},{[c.id]:4},{[naturalAttackId(crypto.randomUUID(),'claws')]:'cha'}]){const q={...c,attackAbilities:map};assert.throws(()=>validateCharacter(q,pack),/attack abilities/);}const q={...c,attackAbilities:{[crypto.randomUUID()]:'str'}};validateCharacter(q,pack);
});
test('Idealist reuses the Will replacement selector, never adds CHA and WIS together, and loses access below CHA13',()=>{
 const c=hero();c.levels[0].talent={id:'talent:idealist'};const d=derive(c,pack);assert.equal(d.defenseAbilities.will.ability,'cha');const base=structuredClone(c);base.levels[0].talent=null;assert.equal(d.defenses.will-derive(base,pack).defenses.will,4);c.defenseAbilities={will:'wis'};assert.equal(derive(c,pack).defenses.will,derive(base,pack).defenses.will);delete c.defenseAbilities;c.abilities.cha=12;assert.equal(derive(c,pack).defenseAbilities.will.ability,'wis');
});
test('source metadata rejects changes to replacement scope, proficiency requirements and reviewed records',()=>{
 validatePack(pack);for(const change of [p=>p.rules.attackAbilities.replacements[1].proficient=false,p=>p.rules.attackAbilities.replacements[1].focusedOneHanded=true,p=>p.rules.attackAbilities.replacements[0].sourceIds=[],p=>p.talents=p.talents.filter(t=>t.id!=='talent:noble-fencing-style')]){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
});

test('import and duplication rebind unarmed/natural ability choices while preserving physical item choices',t=>{
 const previousWindow=globalThis.window,previousDocument=globalThis.document;t.after(()=>{if(previousWindow===undefined)delete globalThis.window;else globalThis.window=previousWindow;if(previousDocument===undefined)delete globalThis.document;else globalThis.document=previousDocument;});globalThis.window={addEventListener(){}};globalThis.document={addEventListener(){}};
 const c=hero();c.species='species:cathar';const uid=derive(c,pack).attacks.find(a=>a.natural).uid;c.attackAbilities={[c.id]:'cha',[uid]:'cha',[c.inventory[0].uid]:'str'};validateCharacter(c,pack);const data=new Map([[STORAGE_KEY,JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]})]]),store=createStore(pack,()=>{},{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});
 for(const operation of [()=>store.duplicate(),()=>store.import(JSON.stringify(c))]){operation();const copy=store.current();assert.notEqual(copy.id,c.id);assert.equal(copy.attackAbilities[copy.id],'cha');assert.equal(copy.attackAbilities[naturalAttackId(copy.id,'claws')],'cha');assert.equal(copy.attackAbilities[c.inventory[0].uid],'str');assert.equal(copy.attackAbilities[c.id],undefined);validateCharacter(copy,pack);}
});
