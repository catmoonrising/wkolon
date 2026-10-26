import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import fixtures from '../tools/class-defense-fixtures.cjs';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
const item=(id,extra={})=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...extra});
// Legal Jedi 7 with three Force talents entering Force Adept and taking Attune Weapon from the Force Item tree.
export function attuner(talent='attune-weapon'){
 const c=fixtures(pack,{newCharacter,derive,validateCharacter}).adept(talent);c.name='Attuner';
 c.inventory=[item('vibroblade',{attuned:true}),item('vibroblade'),item('blaster-pistol')];validateCharacter(c,pack);assert.deepEqual(derive(c,pack).issues,[]);return c;
}
const at=(c,i)=>derive(c,pack).attacks.find(a=>a.uid===c.inventory[i].uid).attack;

test('Attune Weapon metadata is pinned and Partial; the attuned flag is limited to melee weapons',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:attune-weapon').effects[0].amount=2;assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:attune-weapon').automation,'partial');
 const c=attuner();for(const bad of [{...c.inventory[2],attuned:true},{...c.inventory[0],attuned:'yes'}])assert.throws(()=>validateCharacter({...c,inventory:[bad]},pack),/attuned weapon/);
});
test('only the attuned entry gains +1 Force, and only with the talent',()=>{
 const c=attuner(),b=attuner(null);assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:attune-weapon'));
 assert.equal(at(c,0),at(c,1)+1,'attuned Vibroblade');assert.equal(at(b,0),at(b,1),'flag without talent grants nothing');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:equilibrium').effects.push({target:'attacks',amount:2,type:'force'});
 assert.equal(derive(c,p).attacks.find(a=>a.uid===c.inventory[0].uid).attack,derive(c,p).attacks.find(a=>a.uid===c.inventory[1].uid).attack,'Force bonuses do not stack');
});
