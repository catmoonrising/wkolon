import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction} from '../src/action-engine.js';
import fixtures from '../tools/force-item-fixtures.cjs';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const level=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,startingFeat:null,feats:[],talent:talent?{id:'talent:'+talent}:null,trainedSkills:[],abilityIncreases:[]});
// Legal Jedi 7 with Battle Meditation entering Jedi Knight and taking Jedi Battle Commander.
const {commander:knight}=fixtures(pack,{newCharacter,derive,validateCharacter});
const attack=c=>derive(c,pack).attacks.find(a=>a.mode==='melee').attack;
const meditate=c=>takeAction(c,pack,'encounter-talent',{talentId:'talent:battle-meditation',choice:'attacks'},()=>{throw Error('no roll');});

test('Jedi Battle Commander metadata is pinned and Partial',()=>{
 validatePack(pack);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:jedi-battle-commander').effects[0].amount=3;assert.throws(()=>validatePack(p));
 assert.equal(pack.talents.find(t=>t.id==='talent:jedi-battle-commander').automation,'partial');
});
test('Battle Meditation grants +2 insight instead of +1 with the commander talent',()=>{
 for(const [commander,n] of [[true,2],[false,1]]){const c=knight(commander),d=derive(c,pack);assert(!d.ctx.inactiveClasses.has('class:jedi-knight'));const before=attack(c);meditate(c);validateCharacter(c,pack);assert.equal(attack(c),before+n,String(commander));}
 const c=knight();meditate(c);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:battle-meditation').effects=[{target:'attacks',amount:3,type:'insight'}];
 assert.equal(derive(c,p).attacks.find(a=>a.mode==='melee').attack-attack(knight()),3,'insight remains highest-of-type');
});
