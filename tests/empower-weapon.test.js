import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import fixtures from '../tools/class-defense-fixtures.cjs';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const {adept}=fixtures(pack,{newCharacter,derive,validateCharacter});
const item=(id,rest={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...rest});
function empowerer(talent='empower-weapon'){
 const c=adept(talent);c.inventory=[item('lightsaber'),item('knife'),item('blaster-pistol')];validateCharacter(c,pack);assert.deepEqual(derive(c,pack).issues,[]);return c;
}
const row=(c,i)=>derive(c,pack).attacks.find(a=>a.uid===c.inventory[i].uid);

test('Empower Weapon record is pinned and Partial',()=>{
 validatePack(pack);const r=pack.talents.find(t=>t.id==='talent:empower-weapon');
 assert.equal(r.automation,'partial');assert.deepEqual(r.effects,[{target:'empoweredDice',dice:1}]);assert.equal(pack.sources.find(s=>s.id===r.sourceId).revision,18215);
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:empower-weapon').effects[0].dice=2;assert.throws(()=>validatePack(p));
});

test('the empowered melee weapon deals one additional die of its own size',()=>{
 const c=empowerer(),saber=row(c,0),knife=row(c,1);assert.equal(saber.damage.split('+')[0],'2d8');
 c.inventory[0].empowered=true;validateCharacter(c,pack);
 assert.equal(row(c,0).damage,saber.damage.replace('2d8','3d8'),'source example: 2d8 becomes 3d8');assert.equal(row(c,0).attack,saber.attack);
 assert.equal(row(c,1).damage,knife.damage,'only the empowered weapon');
 c.inventory[0].empowered=false;c.inventory[1].empowered=true;assert.equal(row(c,1).damage,knife.damage.replace(/^1d(\d+)/,'2d$1'));assert.equal(row(c,0).damage,saber.damage);
});

test('only melee weapons can be empowered, and only the talent owner gains the die',()=>{
 const c=empowerer();c.inventory[2].empowered=true;assert.throws(()=>validateCharacter(c,pack),/empowered weapon/);
 const other=empowerer('force-perception'),before=row(other,0).damage;other.inventory[0].empowered=true;validateCharacter(other,pack);
 assert.equal(row(other,0).damage,before,'others who wield the weapon do not gain the die');
 const back=JSON.parse(JSON.stringify({...empowerer(),inventory:[item('lightsaber',{empowered:true})]}));validateCharacter(back,pack);assert.match(row(back,0).damage,/^3d8/,'reload');
});
