import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fixture from '../tools/weapon-family-fixtures.cjs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollRoutine} from '../src/combat.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,distance:1,...extra});
// Real Soldier 7 to Gunslinger fixture; Old Faithful is the first Gunslinger talent.
function gunslinger(levels,talent='old-faithful'){const c=fixture(pack,newCharacter,{talents:talent?[talent]:[]});c.levels=c.levels.slice(0,7+levels);c.inventory=[item('blaster-rifle'),item('blaster-pistol'),item('blaster-carbine')];validateCharacter(c,pack);return c;}
const bonus=(c,i)=>derive(c,pack).attacks.find(a=>a.uid===c.inventory[i].uid).damageBonus;
const plain=c=>{const q=structuredClone(c);q.levels[7].talent=null;validateCharacter(q,pack);return q;};

test('Old Faithful metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:old-faithful').effects[0].weaponGroup='pistols';assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:old-faithful').automation,'partial');
});
test('Rifles and carbines gain floor(Gunslinger level / 2) at Gunslinger levels 1, 2 and 5; Pistols are not double-counted',()=>{
 for(const [levels,expected] of [[1,0],[2,1],[5,2]]){
  const c=gunslinger(levels),p=plain(c);assert.equal(derive(c,pack).ctx.classLevels.get('class:gunslinger'),levels);assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:old-faithful'));
  assert.equal(bonus(c,0),bonus(p,0)+expected,'Rifle at level '+levels);assert.equal(bonus(c,2),bonus(p,2)+expected,'carbine at level '+levels);
  assert.equal(bonus(c,1),bonus(p,1),'Pistol bonus unchanged (no double count)');assert.equal(bonus(p,1)-bonus(p,0),expected,'Pistol already had Trusty Sidearm');
 }
});
test('folded and extended Rifles both qualify; the folded-stock range alternative does not remove it',()=>{
 const c=gunslinger(5),p=plain(c),ext=bonus(c,0);c.inventory[0].stockPosition='folded';p.inventory[0].stockPosition='folded';assert.equal(bonus(c,0),ext);assert.equal(bonus(c,0),bonus(p,0)+2);
 c.houseRules={ambiguities:{'ambiguity:folded-stock-rifle-range':'pistol-ranges'}};validateCharacter(c,pack);assert.equal(bonus(c,0),ext);
});
test('a Wookiee Bowcaster qualifies only while the Jedi Counseling familiarity switch is on',()=>{
 const c=gunslinger(5);c.species='species:wookiee';c.trainedSkills=['skill:initiative','skill:perception'];c.levels[0].feats=[{id:'feat:point-blank-shot'}];c.levels[1].feats=[{id:'feat:precise-shot'}];c.levels[2].feats=[{id:'feat:quick-draw'}];c.inventory=[item('bowcaster')];validateCharacter(c,pack);
 const p=plain(c),on=bonus(c,0);assert.equal(on,bonus(p,0)+2);
 c.houseRules={jediCounseling:{'jc:112-weapon-familiarity-with-feats-and-talents':false}};p.houseRules=structuredClone(c.houseRules);assert.equal(bonus(c,0),bonus(p,0),'RAW familiarity is proficiency only');
});
test('the bonus is part of critical and routine damage',()=>{
 const c=gunslinger(5),d=derive(c,pack),a=d.attacks.find(x=>x.uid===c.inventory[0].uid);assert.match(a.damageDisplay,new RegExp('\\+'+a.damageBonus+'$'));
 const calls=[];rollRoutine({name:'Rifle',steps:[{attackId:a.uid,count:2,attackMod:0,damageMod:0}]},d.attacks,pack.rules.combat,expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?20+Number(m[1]):5,d20:m?[20]:[],display:expr,coeffs:[1]};});
 assert.equal(calls.filter(e=>e.includes('*2')).length,2,'both routine attacks crit');assert(calls.filter(e=>e.includes('*2')).every(e=>e.includes('+'+a.damageBonus)),calls.join(' | '));
});

test('Old Faithful does not invent Rifle proficiency or require it for Trusty Sidearm damage',()=>{
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:16,con:12,int:12,wis:12,cha:12};c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:precise-shot'}];
 const row=(cls,talent=null,feats=[])=>({classId:'class:'+cls,hpRoll:5,feats,talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});for(let n=2;n<=7;n++)c.levels.push(row('scoundrel',null,n===3?[{id:'feat:quick-draw'}]:[]));for(let n=1;n<=5;n++)c.levels.push(row('gunslinger',n===1?'old-faithful':null));c.inventory=[item('blaster-rifle'),item('blaster-pistol')];validateCharacter(c,pack);const d=derive(c,pack);assert(!d.ctx.inactiveClasses.has('class:gunslinger'));assert(d.ctx.talents.some(t=>t.id==='talent:old-faithful'));assert.equal(d.attacks[0].proficient,false);
 const p=plain(c),a=derive(p,pack).attacks.find(a=>a.uid===c.inventory[0].uid);assert.equal(d.attacks[0].damageBonus,a.damageBonus+2);assert.equal(d.attacks[0].attack,a.attack,'the existing -5 proficiency penalty is retained');
});
