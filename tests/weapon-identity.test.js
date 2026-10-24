import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import fixture from '../tools/weapon-family-fixtures.cjs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {weaponIdentityGroup} from '../src/weapon-rules.js';
import {opportunityContext} from '../src/opportunity.js';
import {opportunityPlan} from '../src/opportunity-actions.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,distance:1});
function focus(group){const c=newCharacter(pack,{classId:'class:soldier'});c.levels[0].feats=[{id:'feat:weapon-focus',choice:group}];c.levels[0].talent={id:'talent:weapon-specialization',choice:group};c.inventory=[item('blaster-rifle')];validateCharacter(c,pack);return c;}
test('a folded Rifle keeps Rifle Focus/Specialization while actual proficiency and Pistol range bands remain resolved',()=>{
 const c=focus('rifles'),base=derive(c,pack).attacks[0];c.inventory[0].stockPosition='folded';let a=derive(c,pack).attacks[0];assert.equal(a.attack,base.attack);assert.equal(a.damageBonus,base.damageBonus);assert.equal(a.group,'pistols');assert.equal(a.printedGroup,'rifles');assert(a.proficient);assert.deepEqual(a.range.limits,pack.rules.weaponRanges.limits.pistols);const p=focus('pistols');p.inventory[0].stockPosition='folded';const b=derive(p,pack).attacks[0];assert.equal(a.attack,b.attack+1);assert.equal(a.damageBonus,b.damageBonus+2);c.inventory[0].oneHanded=true;assert.equal(derive(c,pack).attacks[0].attack,a.attack);c.inventory[0].stockPosition='extended';assert.equal(derive(c,pack).attacks[0].attack,base.attack-5);
});
test('Trusty Sidearm matches actual Pistols, without granting its bonus to folded Rifles',()=>{
 const c=fixture(pack,newCharacter);c.inventory=[item('blaster-rifle'),item('blaster-pistol')];validateCharacter(c,pack);const d=derive(c,pack);assert.equal(d.ctx.classLevels.get('class:gunslinger'),5);assert.equal(d.attacks[1].damageBonus,d.attacks[0].damageBonus+2);c.inventory[0].stockPosition='folded';assert.equal(derive(c,pack).attacks[0].damageBonus,d.attacks[0].damageBonus);const restored=JSON.parse(JSON.stringify(c));validateCharacter(restored,pack);assert.equal(derive(restored,pack).attacks[0].damageBonus,d.attacks[0].damageBonus);
});
function wookiee(){const c=fixture(pack,newCharacter,{talents:['opportunity-fire','shoot-from-the-hip','close-contact']});c.species='species:wookiee';c.trainedSkills=['skill:initiative','skill:perception'];c.levels[0].feats=[{id:'feat:point-blank-shot'}];c.levels[1].feats=[{id:'feat:precise-shot'}];c.levels[2].feats=[{id:'feat:quick-draw'}];c.levels[5].feats=[{id:'feat:weapon-focus',choice:'rifles'}];c.levels[6].talent={id:'talent:weapon-specialization',choice:'rifles'};c.inventory=[item('bowcaster')];c.inventory[0].distance=31;c.opportunity={...opportunityContext(c),opponent:'Guard',action:'Move',provoked:true};validateCharacter(c,pack);return c;}
test('a real Wookiee Gunslinger uses Counseling familiarity for Focus/Specialization and new rifle benefits, independently of proficiency',()=>{
 const c=wookiee();let d=derive(c,pack);assert.equal(d.ctx.classLevels.get('class:gunslinger'),5);assert(d.ctx.talents.some(t=>t.id==='talent:close-contact'));const a=d.attacks[0];assert(a.proficient);assert.equal(a.range.penalty,0);c.inventory[0].distance=1;d=derive(c,pack);assert.equal(opportunityPlan(c,pack,c.inventory[0].uid).attack.attack,d.attacks[0].attack+2);c.houseRules={jediCounseling:{'jc:112-weapon-familiarity-with-feats-and-talents':false}};c.inventory[0].distance=31;const raw=derive(c,pack).attacks[0];assert(raw.proficient);assert.equal(a.range.band,0);assert.equal(raw.range.band,1);assert.equal(raw.range.penalty,0,'Bowcaster is inherently Accurate');assert.equal(raw.attack,a.attack-2);assert.equal(raw.damageBonus,a.damageBonus-3);assert.throws(()=>opportunityPlan(c,pack,c.inventory[0].uid),/cannot make attacks/);
 c.houseRules.jediCounseling['jc:112-weapon-familiarity-with-feats-and-talents']=true;c.levels.at(-1).talent={id:'talent:close-contact'};assert.equal(derive(c,pack).attacks[0].range.band,0);c.houseRules.jediCounseling['jc:112-weapon-familiarity-with-feats-and-talents']=false;assert.equal(derive(c,pack).attacks[0].range.band,1);
});
test('identity grouping is a pure view and does not convert actual weapon proficiency fields',()=>{
 const w={id:'equipment:bowcaster',group:'exotic-ranged',printedGroup:'exotic-ranged'},ctx={weaponFamiliarity:{'equipment:bowcaster':'rifles'}};const before=structuredClone([w,ctx]);assert.equal(weaponIdentityGroup(w,ctx),'rifles');assert.deepEqual([w,ctx],before);assert.equal(weaponIdentityGroup(w,{...ctx,houseRules:{jediCounseling:{'jc:112-weapon-familiarity-with-feats-and-talents':false}}}),'exotic-ranged');
});
