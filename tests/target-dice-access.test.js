import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollRoutine} from '../src/combat.js';
import fixtures from '../tools/target-dice-fixtures.cjs';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const at=(c,i=0)=>derive(c,pack).attacks.find(a=>a.uid===c.inventory[i].uid);
const assertActive=(c,cls,ids)=>{validateCharacter(c,pack);const d=derive(c,pack);assert.equal(d.ctx.inactiveClasses.size,0);assert(d.ctx.classLevels.get('class:'+cls)>0);for(const id of ids)assert(d.ctx.talents.some(t=>t.id==='talent:'+id&&!d.ctx.inactiveTalents.has(t.id)),id);};
test('Ambush Commando requires actual Elite Trooper entry and adds each weapon die, excluding area attacks',()=>{
 const {elite:c}=fixtures(pack,newCharacter);assertActive(c,'elite-trooper',['ambush-commando']);const plain=derive(c,pack).attacks;c.attackTarget={notYetActed:true};
 for(const a of derive(c,pack).attacks){const b=plain.find(b=>b.uid===a.uid);assert.equal(a.attack,b.attack);assert.equal(a.damageDisplay,b.damageDisplay+(a.areaType?'':'+2'+/d\d+/.exec(a.damage)[0]));}
 const q=structuredClone(c);q.levels[0].feats=q.levels[0].feats.filter(f=>f.id!=='feat:martial-arts-i');assert(!derive(q,pack).ctx.talents.some(t=>t.id==='talent:ambush-commando'),'invalid prestige entry cannot grant dice');
});
test('Invisible Attacker works through real Vanguard training, entry talents and Maximize Cover',()=>{
 const {vanguard:c}=fixtures(pack,newCharacter);assertActive(c,'vanguard',['maximize-cover','invisible-attacker']);const shot=at(c),knife=at(c,1),grenade=at(c,2);c.attackTarget={unawareOfYou:true};assert.equal(at(c).damageDisplay,shot.damageDisplay+'+1d6');assert.equal(at(c,1).damageDisplay,knife.damageDisplay);assert.equal(at(c,2).damageDisplay,grenade.damageDisplay);
 c.levels[7].talent=null;assert(!derive(c,pack).ctx.talents.some(t=>t.id==='talent:invisible-attacker'));assert.equal(at(c).damageDisplay,shot.damageDisplay,'lost prerequisite suppresses the effect');
});
test('actual Imperial Knight combines Praetoria and Prime Targets with Sentinel dice and criticals',()=>{
 const {knight:c}=fixtures(pack,newCharacter);assertActive(c,'imperial-knight',['praetoria-vonil','prime-targets','sentinel-strike']);const plain=at(c);c.attackTarget={notAttackedSince:true,movedBeforeAttack:true,dexDenied:true};assert.equal(at(c).damageDisplay,plain.damageDisplay+'+1d6+2d8');
 const d=derive(c,pack),a=at(c),calls=[];rollRoutine({name:'Saber',steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]},d.attacks,pack.rules.combat,expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?20+Number(m[1]):5,d20:m?[20]:[],display:expr,coeffs:[1]};});assert(calls.some(e=>/^\(.*\+1d6\+2d8\)\*2$/.test(e)));
 c.inventory[0].twoHanded=false;assert.equal(at(c).damageDisplay,at({...structuredClone(c),attackTarget:{}}).damageDisplay+'+1d6+1d8','one-handed loses only Praetoria');
 c.inventory[0].twoHanded=true;c.inventory.push({...c.inventory[0],uid:crypto.randomUUID(),twoHanded:false});assert.equal(at(c).damageDisplay,plain.damageDisplay+'+1d6+1d8','second active blade suppresses Praetoria');c.inventory[1].activated=false;assert.equal(at(c).damageDisplay,plain.damageDisplay+'+1d6+2d8');
});
test('actual Assassin scales its own class levels beyond each weapon range band, including a folded Rifle',()=>{
 const {assassin:base}=fixtures(pack,newCharacter),limit=pack.rules.weaponRanges.limits;
 for(const n of [1,2,3,4]){
  const c=structuredClone(base);c.levels.length=7+n;assertActive(c,'assassin',['sniping-assassin']);const expected=Math.floor(n/2);
  const absent=structuredClone(c);absent.levels[7].talent=null;
  for(const [i,group] of [[0,'rifles'],[1,'pistols']])for(const distance of [limit[group][0],limit[group][0]+1,limit[group][2]+1]){c.inventory[i].distance=distance;absent.inventory[i].distance=distance;assert.equal(at(c,i).damageBonus-at(absent,i).damageBonus,distance>limit[group][0]?expected:0);}
  delete c.inventory[0].distance;delete absent.inventory[0].distance;assert.equal(at(c).damageBonus,at(absent).damageBonus,'no inferred target distance');
  c.inventory[0].stockPosition='folded';absent.inventory[0].stockPosition='folded';c.inventory[0].distance=limit.pistols[0]+1;absent.inventory[0].distance=limit.pistols[0]+1;assert.equal(at(c).damageBonus-at(absent).damageBonus,expected,'folded Rifle uses its Pistol band');
 }
 const invalid=structuredClone(base);invalid.levels[5].feats=[];assert(!derive(invalid,pack).ctx.talents.some(t=>t.id==='talent:sniping-assassin'),'missing Sniper prevents prestige entry');
});
