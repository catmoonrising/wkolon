import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import fixtures from '../tools/class-defense-fixtures.cjs';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const {adept}=fixtures(pack,{newCharacter,derive,validateCharacter});
const item=(id,rest={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:false,twoHanded:false,attackMod:0,damageMod:0,...rest});
const defenses=c=>derive(c,pack).defenses;
function talisman(greater=false){
 const c=adept('force-talisman',3);if(greater)c.levels[9].talent={id:'talent:greater-force-talisman'};
 c.inventory=[item('knife'),item('blaster-pistol')];validateCharacter(c,pack);assert.deepEqual(derive(c,pack).issues,[]);return c;
}

test('Force Talisman records are pinned and Partial',()=>{
 validatePack(pack);
 for(const [id,mode]of [['force-talisman','one'],['greater-force-talisman','all']]){
  const r=pack.talents.find(t=>t.id==='talent:'+id);assert.equal(r.automation,'partial');assert.deepEqual(r.effects,[{target:'talismanDefense',talisman:mode,amount:1,type:'force'}]);
  assert.equal(pack.sources.find(s=>s.id===r.sourceId).revision,18215);
  const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:'+id).effects[0].amount=2;assert.throws(()=>validatePack(p));
 }
});

test('a carried Force Talisman adds +1 Force to its chosen Defense only',()=>{
 const c=talisman(),base=defenses(c);
 c.inventory[0].talisman='will';validateCharacter(c,pack);
 assert.deepEqual(defenses(c),{...base,will:base.will+1});
 c.inventory[0].talisman='reflex';assert.deepEqual(defenses(c),{...base,reflex:base.reflex+1});
 c.inventory[0].carried=false;assert.deepEqual(defenses(c),base,'not on your person');
 c.inventory[0].carried=true;c.inventory[0].talisman='all';assert.deepEqual(defenses(c),base,'all requires Greater Force Talisman');
 const plain=adept(null,3);plain.inventory=[item('knife',{talisman:'will'})];validateCharacter(plain,pack);
 assert.equal(derive(plain,pack).defenses.will,derive(adept(null,3),pack).defenses.will,'requires the talent');
});

test('Greater Force Talisman adds +1 Force to all Defenses and does not stack with a Force Talisman',()=>{
 const c=talisman(true),base=defenses(c);
 c.inventory[1].talisman='all';validateCharacter(c,pack);
 assert.deepEqual(defenses(c),{reflex:base.reflex+1,fortitude:base.fortitude+1,will:base.will+1});
 c.inventory[0].talisman='will';validateCharacter(c,pack);
 assert.equal(defenses(c).will,base.will+1,'Force bonuses do not stack');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:equilibrium').effects.push({target:'defenses',amount:2,type:'force'});
 assert.equal(derive(c,p).defenses.will,derive({...c,inventory:[]},p).defenses.will,'a larger Force bonus supersedes');
});

test('one Talisman of each kind, with a valid Defense',()=>{
 const c=talisman(true);
 c.inventory[0].talisman='will';c.inventory[1].talisman='reflex';assert.throws(()=>validateCharacter(c,pack),/Talisman/);
 c.inventory[0].talisman='all';c.inventory[1].talisman='all';assert.throws(()=>validateCharacter(c,pack),/Talisman/);
 c.inventory[1].talisman='speed';assert.throws(()=>validateCharacter(c,pack),/Talisman/);
 c.inventory[1].talisman='fortitude';validateCharacter(c,pack);
 const back=JSON.parse(JSON.stringify(c));validateCharacter(back,pack);assert.deepEqual(derive(back,pack).defenses,derive(c,pack).defenses,'reload');
});
