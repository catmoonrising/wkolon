import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,beginNextTurn,endCurrentTurn,endTrackedCombat} from '../src/action-engine.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=t=>({classId:'class:jedi',hpRoll:5,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
// Legal Disciple of Twilight: Cloak of Shadows first, then up to four Shadow Armor selections.
function hero(ranks=1){
 const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:12,wis:14,cha:12};c.trainedSkills=['skill:use-the-force'];c.forceTraditions=[{id:'tradition:disciple-of-twilight',level:1,darkSideScore:0}];
 c.levels[0].talent={id:'talent:cloak-of-shadows'};for(let n=2;n<=2*ranks+1;n++)c.levels.push(row(n%2?'shadow-armor':null));c.inventory=[];validateCharacter(c,pack);return c;
}
const use=c=>takeAction(c,pack,'shadow-armor',{},()=>{throw Error('no roll');});
test('Shadow Armor metadata is pinned and the talent is Partial',()=>{
 validatePack(pack);for(const change of [r=>r.maximum=5,r=>r.effect.type='deflection',r=>r.weaponId='equipment:lightsaber']){const p=structuredClone(pack);change(p.rules.turnTalentActions.find(r=>r.id==='shadow-armor'));assert.throws(()=>validatePack(p));}
 assert.equal(pack.talents.find(t=>t.id==='talent:shadow-armor').automation,'partial');
});
test('one Swift Action grants a +1 Force Reflex bonus per selection, up to +4, without a weapon or Force Point',()=>{
 for(const ranks of [1,2,4]){const c=hero(ranks),base=derive(c,pack).defenses.reflex,fp=c.forcePoints;const r=use(c);assert.equal(r.text,'Shadow Armor: Reflex +'+ranks+' Force');assert.equal(derive(c,pack).defenses.reflex,base+ranks);assert.deepEqual(c.actionState.spent,['swift']);assert.equal(c.forcePoints,fp);}
 const c=hero(2);c.flatFooted=true;const ff=derive(c,pack).defenses.reflex;use(c);assert.equal(derive(c,pack).defenses.reflex,ff+2,'not an awareness bonus');
});
test('Force bonuses do not stack, the bonus lasts until the next turn and ownership loss caps it',()=>{
 const c=hero(2),base=derive(c,pack).defenses.reflex;use(c);const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:shadow-armor').effects=[{target:'defenseBonus',defense:'reflex',amount:1,type:'force'}];assert.equal(derive(c,p).defenses.reflex,derive(hero(2),p).defenses.reflex+1);
 assert.match(renderStatBlock(c,derive(c,pack),pack),/Reflex \+2 Force/);assert.throws(()=>use(c),/Already active/);
 c.levels[2].talent=null;assert.equal(derive(c,pack).defenses.reflex,base+1);c.levels[2].talent={id:'talent:shadow-armor'};
 endCurrentTurn(c,pack);assert.equal(derive(c,pack).defenses.reflex,base+2);beginNextTurn(c,pack);assert.equal(derive(c,pack).defenses.reflex,base);
 use(c);endTrackedCombat(c);assert.equal(c.turnTalents,undefined);
});
