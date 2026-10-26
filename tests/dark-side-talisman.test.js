import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {conditionalDefenseLabel} from '../src/defensive-combat.js';
import fixtures from '../tools/class-defense-fixtures.cjs';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const {adept}=fixtures(pack,{newCharacter,derive,validateCharacter});
const item=(id,rest={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:false,twoHanded:false,attackMod:0,damageMod:0,...rest});
function build(first,third){
 const c=adept(first,3);c.levels[9].talent={id:'talent:'+third};c.inventory=[item('knife'),item('blaster-pistol')];
 validateCharacter(c,pack);assert.deepEqual(derive(c,pack).issues,[]);return c;
}
const rows=c=>derive(c,pack).conditionalDefenses.filter(r=>r.against==='light-side-powers').map(r=>[r.defense,r.total]);

test('Dark Side Talisman records are pinned and Partial',()=>{
 validatePack(pack);
 for(const [id,mode]of [['dark-side-talisman','one'],['greater-dark-side-talisman','all']]){
  const r=pack.talents.find(t=>t.id==='talent:'+id);assert.equal(r.automation,'partial');
  assert.deepEqual(r.effects,[{target:'darkSideTalismanDefense',talisman:mode,against:'light-side-powers',amount:2,type:'force'}]);
  assert.equal(pack.sources.find(s=>s.id===r.sourceId).revision,18082);
  const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:'+id).effects[0].against='dark-side-powers';assert.throws(()=>validatePack(p));
 }
 assert.equal(conditionalDefenseLabel({against:'light-side-powers'}),'vs. Light Side powers');
});

test('a carried Dark Side Talisman adds +2 Force to one Defense vs. Light Side powers only',()=>{
 const c=build('dark-side-talisman','force-treatment'),d=derive(c,pack);assert.deepEqual(rows(c),[]);
 c.inventory[0].darkSideTalisman='fortitude';validateCharacter(c,pack);
 assert.deepEqual(rows(c),[['fortitude',d.defenses.fortitude+2]]);assert.deepEqual(derive(c,pack).defenses,d.defenses,'unconditional Defenses unchanged');
 c.inventory[0].carried=false;assert.deepEqual(rows(c),[]);
 c.inventory[0].carried=true;c.inventory[0].darkSideTalisman='all';assert.deepEqual(rows(c),[],'all requires the Greater talent');
 const plain=adept(null,3);plain.inventory=[item('knife',{darkSideTalisman:'will'})];validateCharacter(plain,pack);assert.deepEqual(rows(plain),[],'requires the talent');
});

test('Greater Dark Side Talisman covers all Defenses; only one Dark Side Talisman',()=>{
 const c=build('dark-side-talisman','greater-dark-side-talisman'),d=derive(c,pack).defenses;
 c.inventory[1].darkSideTalisman='all';validateCharacter(c,pack);
 assert.deepEqual(rows(c),[['reflex',d.reflex+2],['fortitude',d.fortitude+2],['will',d.will+2]]);
 c.inventory[0].darkSideTalisman='will';assert.throws(()=>validateCharacter(c,pack),/Dark Side Talisman/);
 delete c.inventory[1].darkSideTalisman;validateCharacter(c,pack);assert.deepEqual(rows(c),[['will',d.will+2]]);
 c.inventory[0].darkSideTalisman='light';assert.throws(()=>validateCharacter(c,pack),/Dark Side Talisman/);
 c.inventory[0].darkSideTalisman='will';const back=JSON.parse(JSON.stringify(c));validateCharacter(back,pack);assert.deepEqual(rows(back),rows(c),'reload');
});

test('coexists with a Force Talisman; Force bonuses do not stack',()=>{
 const c=build('force-talisman','dark-side-talisman'),base=derive(c,pack).defenses.will;
 c.inventory[0].talisman='will';c.inventory[0].darkSideTalisman='will';validateCharacter(c,pack);
 assert.equal(derive(c,pack).defenses.will,base+1,'Force Talisman applies to every Will use');
 assert.deepEqual(rows(c),[['will',base+2]],'+2 Force supersedes +1 Force rather than adding to it');
 c.inventory[0].darkSideTalisman='reflex';const r=derive(c,pack).defenses.reflex;assert.deepEqual(rows(c),[['reflex',r+2]]);
});
