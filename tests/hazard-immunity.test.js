import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,endTrackedCombat} from '../src/action-engine.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function adept(talent='fortified-body'){
 const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:10,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:equilibrium'};
 for(let n=2;n<=7;n++)c.levels.push(row('jedi',n===3?'force-recovery':n===5?'force-focus':null));
 const cls=pack.classes.find(r=>r.id==='class:force-adept');c.levels.push({...row('force-adept',talent),entryDeclarations:Object.fromEntries((cls.entrySpecials||[]).map(s=>[s.id,true]))});
 validateCharacter(c,pack);return c;
}
test('Fortified Body grants permanent Poison, Radiation and Disease immunity as a Partial passive record',()=>{
 validatePack(pack);const r=pack.talents.find(t=>t.id==='talent:fortified-body');assert.equal(r.automation,'partial');assert.deepEqual(r.effects,[{target:'hazardImmunity',hazards:['poison','radiation','disease']}]);
 for(const change of [e=>e.hazards.pop(),e=>e.hazards.reverse()]){const p=structuredClone(pack);change(p.talents.find(t=>t.id==='talent:fortified-body').effects[0]);assert.throws(()=>validatePack(p));}
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:equilibrium').effects.push({target:'hazardImmunity',hazards:['poison','radiation','disease']});assert.throws(()=>validatePack(p));
 const c=adept(),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:fortified-body')&&!d.ctx.inactiveTalents.has('talent:fortified-body'));
 assert.deepEqual(d.hazardImmunities,['poison','radiation','disease']);assert.match(renderStatBlock(c,d,pack),/<b>Immune:<\/b> Poison, Radiation, Disease/);
 endTrackedCombat(c);assert.equal(derive(c,pack).hazardImmunities.length,3);
 c.levels[0].talent=null;assert.deepEqual(derive(c,pack).hazardImmunities,[],'prerequisite loss suppresses the talent');
 const other=adept(null);assert.deepEqual(derive(other,pack).hazardImmunities,[]);assert.doesNotMatch(renderStatBlock(other,derive(other,pack),pack),/Immune:/);
});
