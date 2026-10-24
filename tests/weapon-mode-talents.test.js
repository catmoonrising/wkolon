import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Tree access is covered by selectable-talent tests; the talents sit in a Soldier tree here.
const pack=structuredClone(core);for(const id of ['ion-mastery','twin-shot']){const t=pack.talents.find(t=>t.id==='talent:'+id);t.tree='tree:weapon-specialist';}
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
const row=(t,feats=[])=>({classId:'class:soldier',hpRoll:5,feats:feats.map(id=>({id})),talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function hero(talent,inventory,feats=[]){const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:10};c.levels[0].feats=feats.slice(0,1).map(id=>({id}));c.levels[0].talent=null;c.levels.push(row(null,feats.slice(1)),row(talent));c.inventory=inventory;validateCharacter(c,pack);return c;}
const at=(c,id)=>derive(c,pack).attacks.find(a=>a.uid===c.inventory.find(e=>e.id==='equipment:'+id).uid);
test('weapon mode talent records are pinned and Partial',()=>{
 validatePack(core);for(const [id,change] of [['ion-mastery',r=>r.effects[1].dice=2],['twin-shot',r=>r.effects[0].amount=3]]){const p=structuredClone(core);change(p.talents.find(t=>t.id==='talent:'+id));assert.throws(()=>validatePack(p),id);}
 for(const id of ['ion-mastery','twin-shot'])assert.equal(core.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});
test('Ion Mastery adds +1 attack and one weapon die to Ion weapons only',()=>{
 const inv=()=>[item('ion-pistol'),item('blaster-pistol')];const c=hero('ion-mastery',inv()),b=hero(null,inv());
 assert.equal(at(c,'ion-pistol').attack,at(b,'ion-pistol').attack+1);assert.equal(at(c,'ion-pistol').damage,'4d6');assert.equal(at(b,'ion-pistol').damage,'3d6');
 assert.equal(at(c,'blaster-pistol').attack,at(b,'blaster-pistol').attack);assert.equal(at(c,'blaster-pistol').damage,at(b,'blaster-pistol').damage);
});
test('Twin Shot adds +2 damage to Rapid Shot Pistol attacks only while wielding two Pistols',()=>{
 const feats=['feat:dual-weapon-mastery-i','feat:rapid-shot'];
 const two=hero('twin-shot',[item('blaster-pistol',{attackTechnique:'rapid-shot'}),item('blaster-pistol')],feats),base=hero(null,[item('blaster-pistol',{attackTechnique:'rapid-shot'}),item('blaster-pistol')],feats);
 const a=derive(two,pack).attacks[0],b=derive(base,pack).attacks[0];assert.equal(a.technique.selected,'rapid-shot');assert.equal(a.damageBonus,b.damageBonus+2);
 const normal=structuredClone(two);delete normal.inventory[0].attackTechnique;assert.equal(derive(normal,pack).attacks[0].damageBonus,derive(base,pack).attacks[1].damageBonus,'no Rapid Shot');
 const one=structuredClone(two);one.inventory[1].equipped=false;assert.equal(derive(one,pack).attacks[0].damageBonus,b.damageBonus,'one wielded Pistol');
 const stack=structuredClone(two);stack.inventory=[{...two.inventory[0],quantity:2}];assert.equal(derive(stack,pack).attacks[0].damageBonus,b.damageBonus,'quantity is not a second wielded Pistol');
});

test('Nonlethal Tactics: +1 attack for Stun-set ranged weapons and listed items, +1 die only on ranged Stun damage',()=>{
 const p=structuredClone(pack);const t=p.talents.find(t=>t.id==='talent:nonlethal-tactics');t.tree='tree:weapon-specialist';
 const make=talent=>{const c=newCharacter(p,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:10};c.levels[0].talent=talent?{id:'talent:'+talent}:null;
  c.inventory=[item('blaster-pistol',{damageSetting:'stun'}),item('blaster-rifle'),item('stun-grenade'),item('net'),item('stun-baton')];validateCharacter(c,p);return c;};
 const c=make('nonlethal-tactics'),b=make(null),find=(x,id)=>derive(x,p).attacks.find(a=>a.uid===x.inventory.find(e=>e.id==='equipment:'+id).uid);
 const stunPistol=find(c,'blaster-pistol'),base=find(b,'blaster-pistol');assert.equal(base.damageEffect,'stun');assert.equal(stunPistol.attack,base.attack+1);assert.equal(stunPistol.damage,'4d6');
 assert.equal(find(c,'blaster-rifle').attack,find(b,'blaster-rifle').attack,'normal setting');assert.equal(find(c,'blaster-rifle').damage,find(b,'blaster-rifle').damage);
 assert.equal(find(c,'stun-grenade').attack,find(b,'stun-grenade').attack+1);assert.equal(find(c,'stun-grenade').damage,'5d6');
 assert.equal(find(c,'net').attack,find(b,'net').attack+1);assert.equal(find(c,'stun-baton').attack,find(b,'stun-baton').attack+1);assert.equal(find(c,'stun-baton').damage,find(b,'stun-baton').damage,'baton die stays manual');
 assert.equal(core.talents.find(t=>t.id==='talent:nonlethal-tactics').automation,'partial');
});

test('real prestige classes grant the three talents and weapon settings preserve independent bonuses',async()=>{
 const {default:fixtures}=await import('../tools/weapon-mode-fixtures.cjs');const {ion,twin,stun}=fixtures(core,newCharacter);
 for(const [c,id,cls] of [[ion,'ion-mastery','master-privateer'],[twin,'twin-shot','gunslinger'],[stun,'nonlethal-tactics','enforcer']]){validateCharacter(c,core);const d=derive(c,core);assert(d.ctx.talents.some(t=>t.id==='talent:'+id&&!d.ctx.inactiveTalents.has(t.id)),id);assert(!d.ctx.inactiveClasses.has('class:'+cls),cls);}
 const find=(c,i=0)=>derive(c,core).attacks.find(a=>a.uid===c.inventory[i].uid);
 assert.equal(find(ion).damage,'4d6');ion.inventory[0].attackTechnique='rapid-shot';assert.equal(find(ion).damage,'5d6');assert.equal(find(ion).technique.issue,'');
 const boosted=find(twin).damageBonus;twin.inventory[1].equipped=false;twin.inventory[2].equipped=true;assert.equal(find(twin).damageBonus,boosted-2,'folded Rifle is not a second Pistol');
 twin.inventory[1].equipped=true;twin.inventory[0].carried=false;assert.equal(find(twin,1).damageBonus,find({...twin,inventory:twin.inventory.map(e=>({...e,attackTechnique:'normal'}))},1).damageBonus);
 const s=find(stun);assert.equal(s.damageEffect,'stun');assert.equal(s.damage,'4d6');stun.inventory[0].damageSetting='normal';assert.equal(find(stun).damage,'3d6');assert.equal(find(stun).attack,s.attack-1);assert.equal(find(stun,4).damage,'1d6','Baton separate Stun die stays manual');
});
