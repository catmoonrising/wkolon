import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Jedi 7 with three Force talents, entering Force Adept and taking Psychic Citadel from the Telepath tree.
function adept(talent='psychic-citadel',adeptLevels=1){
 const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:10,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].talent={id:'talent:equilibrium'};
 for(let n=2;n<=7;n++)c.levels.push(row('jedi',n===3?'force-recovery':n===5?'force-focus':null));
 const cls=pack.classes.find(r=>r.id==='class:force-adept');c.levels.push({...row('force-adept',talent),entryDeclarations:Object.fromEntries((cls.entrySpecials||[]).map(s=>[s.id,true]))});
 for(let n=2;n<=adeptLevels;n++)c.levels.push(row('force-adept'));
 validateCharacter(c,pack);return c;
}
const will=(c,p=pack)=>derive(c,p).defenses.will;

test('Psychic Citadel metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:psychic-citadel').effects[0].type='insight';assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:psychic-citadel').automation,'partial');
});
test('Will Defense gains a Force bonus equal to Force Adept level, not character level',()=>{
 const c=adept(),b=adept(null),d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:psychic-citadel')&&!d.ctx.inactiveClasses.has('class:force-adept'));
 assert.equal(will(c),will(b)+1,'Force Adept 1');
 const three=adept('psychic-citadel',3),threeB=adept(null,3);assert.equal(will(three),will(threeB)+3,'Force Adept 3');
 assert.equal(derive(c,pack).defenses.reflex,derive(b,pack).defenses.reflex,'Will only');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:equilibrium').effects.push({target:'defenses',amount:5,type:'force'});
 assert.equal(will(three,p),will(threeB,p),'a larger Force bonus supersedes; Force bonuses do not stack');
});
