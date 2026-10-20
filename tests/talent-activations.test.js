import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,describeAction,beginNextTurn,endTrackedCombat,previewPlan,executeAction} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {newEncounter,newDay} from '../src/recovery.js';
import {combineArmorDefenses} from '../src/armor.js';
import {bellowDetails} from '../src/species-actions.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const id='talent:fool-s-luck',o=choice=>({talentId:id,choice}),activate=(c,choice)=>takeAction(c,pack,'encounter-talent',o(choice));
function hero(){const c=newCharacter(pack,{classId:'class:scoundrel'});c.levels[0].talent={id};c.trainedSkills=['skill:stealth'];c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:stealth'}];c.inventory=[{uid:crypto.randomUUID(),id:'equipment:blaster-pistol',quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,shotsRemaining:5}];return c;}
const skill=(d,id)=>d.skills.find(s=>s.id==='skill:'+id).total;
test('Fool\'s Luck is a reviewed personal activation with exact retained source text and manual vehicle benefit',()=>{
 validatePack(pack);const t=pack.talents.find(t=>t.id===id);assert.equal(t.automation,'partial');assert.equal(t.activation.forcePoints,1);assert.equal(t.activation.duration,'encounter');assert.deepEqual(t.effects,[]);
 for(const mutate of [t=>t.activation.forcePoints=0,t=>t.activation.choices[1].effects[0].type='untyped',t=>t.activation.choices.push(t.activation.choices[0]),t=>t.activation.duration='turn']){const p=structuredClone(pack);mutate(p.talents.find(t=>t.id===id));assert.throws(()=>validatePack(p));}
});
test('skill activation costs one Standard and FP, competes with Focus and improves untrained checks',()=>{
 const c=hero(),d=derive(c,pack),fp=c.forcePoints,shots=c.inventory[0].shotsRemaining;c.inventory[0].aimed=true;const r=activate(c,'skills'),after=derive(c,pack);
 assert(r.text.includes('Skill Checks'));assert.equal(c.forcePoints,fp-1);assert.deepEqual(c.actionState.spent,['standard']);assert(c.actionState.forceSpent);assert.equal(c.inventory[0].shotsRemaining,shots);assert(!c.inventory[0].aimed);
 assert.equal(skill(after,'stealth'),skill(d,'stealth'));assert.equal(skill(after,'perception'),skill(d,'perception')+5);assert(after.skills.find(s=>s.id==='skill:perception').breakdown.includes('5 competence'));assert.equal(after.attacks[0].attack,d.attacks[0].attack);
 validateCharacter(c,pack);
});
test('different benefits coexist when paid on separate turns, affect real attacks and expire at encounter end',()=>{
 const c=hero(),before=derive(c,pack);activate(c,'attacks');let d=derive(c,pack);assert.equal(d.attacks[0].attack,before.attacks[0].attack+1);assert.equal(d.attacks[0].damageBonus,before.attacks[0].damageBonus);
 beginNextTurn(c,pack);assert.equal(derive(c,pack).attacks[0].attack,before.attacks[0].attack+1);activate(c,'defenses');d=derive(c,pack);for(const k of ['reflex','fortitude','will'])assert.equal(d.defenses[k],before.defenses[k]+1);assert.equal(d.threshold,before.threshold+1);assert.equal(c.talentActivations.length,2);assert(renderStatBlock(c,d,pack).includes('Reflex Defense:</b> '+d.defenses.reflex));
 const loaded=JSON.parse(JSON.stringify(c));validateCharacter(loaded,pack);assert.equal(derive(loaded,pack).attacks[0].attack,d.attacks[0].attack);endTrackedCombat(loaded);assert.equal(loaded.talentActivations,undefined);assert.equal(derive(loaded,pack).attacks[0].attack,before.attacks[0].attack);
});
test('Bellow receives all-attack competence bonuses without increasing damage',()=>{
 const c=hero();c.species='species:ithorian';const d=derive(c,pack),before=bellowDetails(c,d,pack);activate(c,'attacks');const after=bellowDetails(c,derive(c,pack),pack);assert.equal(after.attack,before.attack+1);assert.equal(after.dice,before.dice);
});
test('invalid activation, absent resources, helplessness and repeated benefits preserve state',()=>{
 for(const modify of [c=>c.levels[0].talent=null,c=>c.forcePoints=0,c=>c.condition=5,c=>{activate(c,'skills');beginNextTurn(c,pack);},c=>{takeAction(c,pack,'force-bonus');},c=>{takeAction(c,pack,'manual-standard',{note:'Other'});}]){
  const c=hero();modify(c);const before=structuredClone(c);assert.throws(()=>activate(c,'skills'));assert.deepEqual(c,before);
 }
 const c=hero(),before=structuredClone(c);assert.throws(()=>activate(c,'invented'));assert.deepEqual(c,before);assert.throws(()=>describeAction(c,pack,'encounter-talent',{talentId:'talent:inspire-confidence',choice:'skills'}));
});
test('planning spends no real resources and blocks a second FP activation in the same round',()=>{
 const c=hero(),step=queueAction(c,'encounter-talent',o('attacks'));queueAction(c,'encounter-talent',o('skills'));const before=structuredClone(c),rows=previewPlan(c,pack);assert(!rows[0].issue);assert(rows[1].issue.includes('Force Point already spent'));assert.deepEqual(c,before);
 executeAction(c,pack,step.id);assert.equal(c.talentActivations[0].choice,'attacks');assert.equal(c.actionState.plan[1].status,'queued');
});
test('class edits deactivate saved benefits, and encounter/day resets clear them without refunds',()=>{
 const c=hero();activate(c,'skills');const fp=c.forcePoints,withBonus=skill(derive(c,pack),'perception');c.levels[0].talent=null;assert.equal(skill(derive(c,pack),'perception'),withBonus-5);assert.equal(c.talentActivations.length,1);c.levels[0].talent={id};assert.equal(skill(derive(c,pack),'perception'),withBonus);
 const copy=structuredClone(c);newEncounter(c);assert.equal(c.talentActivations,undefined);assert.equal(c.forcePoints,fp);newDay(copy,pack);assert.equal(copy.talentActivations,undefined);assert.equal(copy.forcePoints,fp);
});
test('saved activation state is closed, bounded, unique and restricted to reviewed choices',()=>{
 for(const v of [null,{},[null],[{id,choice:'invented'}],[{id,choice:'skills',amount:50}],[{id,choice:'skills'},{id,choice:'skills'}],[{id:'talent:inspire-confidence',choice:'skills'}]]){const c=hero();c.talentActivations=v;assert.throws(()=>validateCharacter(c,pack),/talent activations/);}
});
test('conditional defenses retain stacked penalties and compare against existing bonus types',()=>{
 const rows=[{defense:'will',against:'use-the-force',amount:3,type:'insight'},{defense:'will',against:'use-the-force',amount:-2,type:'equipment'},{defense:'will',against:'use-the-force',amount:-1,type:'equipment'}];
 const out=combineArmorDefenses(rows,[],{will:25},{},{will:[{type:'insight',amount:5}]});assert.equal(out[0].total,22);assert.equal(out[0].amount,-3);
});
test('Fool\'s Luck does not stack with Wary Defender but survives loss of dodge bonuses',()=>{
 const c=hero();c.levels[0].feats=[{id:'feat:wary-defender'}];c.defenseStance='fight';const before=derive(c,pack);activate(c,'defenses');let d=derive(c,pack);assert.equal(d.defenses.reflex,before.defenses.reflex+1);assert.equal(d.defenses.fortitude,before.defenses.fortitude);assert.equal(d.defenses.will,before.defenses.will);c.flatFooted=true;d=derive(c,pack);const without=structuredClone(c);delete without.talentActivations;assert.equal(d.defenses.reflex,derive(without,pack).defenses.reflex+1);
 assert(renderStatBlock(c,d,pack).includes("Fool&#39;s Luck:</b> Defenses"));
});
test('a talent activation interrupts a braced autofire-only weapon and preserves ammunition',()=>{
 const c=hero();c.inventory=[{...c.inventory[0],id:'equipment:heavy-repeating-blaster',braced:true,shotsRemaining:20}];validateCharacter(c,pack);activate(c,'skills');assert.equal(c.inventory[0].braced,false);assert.equal(c.inventory[0].shotsRemaining,20);
});
