import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack,talentTrees} from '../src/rules.js';
import {chooseSpeciesOption,resolveSpecies} from '../src/species-choices.js';
import {prepareDroidSystems,chooseDroidBonusSystem,installDroidSystem} from '../src/droid-installation.js';
import {setGenerationMethod,setPoolScore,assignScore} from '../src/ability-generation.js';
import {activeAbilities} from '../src/ability-profiles.js';
import {movementSpeed} from '../src/combat-movement.js';
import {damageOutcome} from '../src/incoming-damage.js';
import {speciesPowerIssue,changeSpeciesQuality} from '../src/species-profiles.js';
import {renderStatBlock} from '../src/stat-block.js';
import {createSpeciesBrowser} from '../src/species-browser.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const part=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:false,carried:true,twoHanded:false,attackMod:0,damageMod:0});
function hero(id,cls='soldier'){
 const c=newCharacter(pack,{classId:'class:'+cls});c.species='species:'+id;setGenerationMethod(c,'manual',pack);
 for(const [i,a]of activeAbilities(c,pack).entries()){setPoolScore(c,i,14,pack);assignScore(c,a,i,pack);}prepareDroidSystems(c,pack);return c;
}
test('all three remaining profiles use exact official sources and articles with no guessed Shard speed',()=>{
 for(const [id,book]of [['replica-droid','Threats of the Galaxy'],['shard','Jedi Academy Training Manual'],['sorcerer-of-rhand','Unknown Regions Campaign Guide']]){const r=pack.species.find(r=>r.id==='species:'+id);assert(r.article.blocks.length);assert(pack.catalog.records.some(c=>c.kind==='species'&&c.mechanicsIds.includes(r.id)&&c.books.includes(book)));assert.equal(r.automation,'partial');}
 assert.equal(ix.species.get('species:shard').speed,null);validatePack(pack);
});
test('Replica keeps its printed modifiers at either size, five scores, fourth-degree trees and a Basic processor',()=>{
 const c=hero('replica-droid');chooseSpeciesOption(c,pack,'size','small');chooseSpeciesOption(c,pack,'language','basic');prepareDroidSystems(c,pack);let d=derive(c,pack);
 assert.equal(d.scores.str,16);assert.equal(d.scores.dex,16);assert.equal(d.scores.cha,12);assert.equal(d.scores.con,null);assert.equal(d.speed,4);assert.equal(d.weight,5);assert(!d.skills.find(s=>s.id==='skill:stealth').available);assert(talentTrees(ix.classes.get(c.levels[0].classId),d.ctx,pack).includes('tree:4th-degree-droid'));
 assert.equal(c.inventory.length,1);assert.equal(c.inventory[0].id,'equipment:basic-processor');assert.equal(c.credits,0);assert(!ix.species.get(c.species).droidStartingPackage);
 chooseSpeciesOption(c,pack,'size','medium');prepareDroidSystems(c,pack);d=derive(c,pack);assert.equal(d.scores.str,16);assert.equal(d.scores.dex,16);assert.equal(d.speed,6);validateCharacter(c,pack);
});
test('Replica native language is known rather than comprehension-only, and trained Deception grants conditional Focus',()=>{
 const c=hero('replica-droid','scoundrel');chooseSpeciesOption(c,pack,'language','High Galactic');let s=resolveSpecies(c,pack);assert.deepEqual(s.languages,['Binary','High Galactic']);assert(!s.understoodLanguages?.includes('High Galactic'));assert(!derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:deception'));
 c.trainedSkills=['skill:deception'];assert(derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:deception'));chooseSpeciesOption(c,pack,'language','   ');assert(derive(c,pack).issues.some(t=>t.includes('Native language')));assert.throws(()=>chooseSpeciesOption(c,pack,'language','Basic\nSith'));validateCharacter(c,pack);
});
test('Replica grants exactly two chosen systems and bounded compartment capacity without spending class credits',()=>{
 const c=hero('replica-droid');c.credits=400;chooseDroidBonusSystem(c,pack,1,'equipment:improved-sensor-package');chooseDroidBonusSystem(c,pack,2,'equipment:compartment-space',10);assert.equal(c.inventory.length,3);assert.equal(c.credits,400);assert.equal(derive(c,pack).vision,'low-light');assert.equal(c.inventory.find(e=>e.id==='equipment:compartment-space').systemUnits,10);const uid=c.inventory.find(e=>e.droidGrant.slot==='bonus-1').uid;
 chooseDroidBonusSystem(c,pack,1,'equipment:darkvision-package');assert.equal(c.inventory.find(e=>e.droidGrant.slot==='bonus-1').uid,uid);assert.equal(derive(c,pack).vision,'darkvision');assert.equal(derive(c,pack).weight,6.5);assert(derive(c,pack).weightUnknown);
 assert.throws(()=>chooseDroidBonusSystem(c,pack,3,'equipment:darkvision-package'));assert.throws(()=>chooseDroidBonusSystem(c,pack,1,'equipment:shield-generator-system-5'));assert.throws(()=>chooseDroidBonusSystem(c,pack,2,'equipment:compartment-space',11));validateCharacter(c,pack);
 chooseSpeciesOption(c,pack,'size','small');prepareDroidSystems(c,pack);assert(derive(c,pack).issues.includes('Compartment Space exceeds body capacity'));assert.equal(c.inventory.find(e=>e.id==='equipment:compartment-space').systemUnits,10);assert.throws(()=>chooseDroidBonusSystem(c,pack,2,'equipment:compartment-space',6));chooseDroidBonusSystem(c,pack,2,'equipment:compartment-space',5);assert(!derive(c,pack).issues.includes('Compartment Space exceeds body capacity'));
});
test('Shard retains Constitution and Force access, gets free Use Computer, and requires a declared shell speed',()=>{
 const c=hero('shard','jedi'),d=derive(c,pack);assert.equal(activeAbilities(c,pack).length,6);assert.equal(d.scores.con,14);assert.equal(d.hp,32);assert(!d.ctx.isDroid);assert(d.ctx.feats.some(f=>f.id==='feat:force-sensitivity'));assert(d.ctx.trained.has('skill:use-computer'));assert.equal(d.droidSystems.processor,null);assert(!d.incapacitated);assert(d.speedUnknown);assert.throws(()=>movementSpeed(d),/Set shell speed/);assert(renderStatBlock(c,d,pack).includes('<b>Speed:</b> Manual'));
 c.droidSystems[c.species].shellSpeed=7;assert.equal(derive(c,pack).speed,7);assert(!derive(c,pack).speedUnknown);assert.equal(movementSpeed(derive(c,pack)),7);validateCharacter(c,pack);
 const browser=createSpeciesBrowser(pack);browser.search('Shard');assert(browser.results(c.species).includes('Manual'));
});
test('Shard permits only printed Droid System groups and counts as cybernetic for Ion without gaining Stun immunity',()=>{
 const c=hero('shard'),sensor=part('darkvision-package'),loco=part('walking'),cpu=part('heuristic-processor');c.inventory.push(sensor,loco,cpu);installDroidSystem(c,pack,sensor.uid,true);assert.equal(derive(c,pack).vision,'darkvision');assert.throws(()=>installDroidSystem(c,pack,loco.uid,true),/not available/);assert.throws(()=>installDroidSystem(c,pack,cpu.uid,true),/not available/);
 const d=derive(c,pack),ion=damageOutcome(c,d,pack,d.threshold,{type:'ion'}),stun=damageOutcome(c,d,pack,5,{type:'stun'});assert.equal(ion.conditionSteps,2);assert(!stun.immune);assert(!d.recovery.secondWind.available);assert(!d.recovery.naturalHealing.available);validateCharacter(c,pack);
});
test('Sorcerer grants its Force feats and contextual rules without spending normal feat or skill choices',()=>{
 const c=hero('sorcerer-of-rhand');let d=derive(c,pack);assert.equal(d.scores.int,18);assert.equal(d.scores.wis,16);assert.equal(d.scores.str,12);assert(d.ctx.feats.some(f=>f.id==='feat:force-sensitivity'&&f.automatic));assert(d.ctx.feats.some(f=>f.id==='feat:force-training'&&f.grantedBy===c.species));assert.equal(d.powerSlots,4);assert.equal(d.forcePowers.length,0);assert(d.conditionalDefenses.some(r=>r.against==='persuasion'&&r.amount===5));assert(!d.conditionalDefenses.some(r=>r.against==='deception-or-persuasion'));
 assert.deepEqual(ix.species.get(c.species).skillRerolls,[{skill:'skill:persuasion',keep:'best',when:'intimidate'}]);assert(d.issues.some(t=>t.includes('GM Special Qualities')));validateCharacter(c,pack);
});
test('Dark-Infused excludes Light powers, requires rounded-down half Dark powers, and permits mixed ordinary training',()=>{
 const c=hero('sorcerer-of-rhand');c.trainedSkills=['skill:use-the-force'];let d=derive(c,pack),s=ix.species.get(c.species),light=pack.forcePowers.find(p=>p.descriptors.includes('light-side')),dark=pack.forcePowers.find(p=>p.descriptors.includes('dark-side')),neutral=pack.forcePowers.find(p=>!p.descriptors.some(d=>['light-side','dark-side'].includes(d)));
 assert(speciesPowerIssue(s,d.ctx,pack,light));c.levels[0].forcePowers=Array.from({length:4},()=>({id:crypto.randomUUID(),powerId:neutral.id,spent:false}));d=derive(c,pack);assert.equal(d.forcePowers.length,2);assert(d.issues.some(t=>t.includes('Dark-Infused')));
 c.levels[0].forcePowers=[neutral,neutral,dark,dark].map(p=>({id:crypto.randomUUID(),powerId:p.id,spent:false}));d=derive(c,pack);assert.equal(d.forcePowers.length,4);assert(!d.issues.some(t=>t.includes('Dark-Infused')));
 c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=[light,light,light,light,neutral,neutral,dark,dark].map(p=>({id:crypto.randomUUID(),powerId:p.id,spent:false}));d=derive(c,pack);assert.equal(d.powerSlots,8);assert.equal(d.forcePowers.length,8);assert(!d.issues.some(t=>t.includes('Dark-Infused')));validateCharacter(c,pack);
});
test('GM qualities preserve verbatim user text, stay per species, are bounded and appear in the stat block',()=>{
 const c=hero('sorcerer-of-rhand');changeSpeciesQuality(c,pack,0,'name','GM quality');changeSpeciesQuality(c,pack,0,'text','<img src=x> Verbatim rules');assert(!derive(c,pack).issues.some(t=>t.includes('GM Special Qualities')));assert(renderStatBlock(c,derive(c,pack),pack).includes('GM quality (Manual)'));assert.throws(()=>changeSpeciesQuality(c,pack,0,'name','bad\nname'));c.species='species:human';assert.throws(()=>changeSpeciesQuality(c,pack,0,'name','wrong'));c.species='species:sorcerer-of-rhand';assert.equal(c.speciesQualities[c.species][0].text,'<img src=x> Verbatim rules');validateCharacter(c,pack);
});
test('malformed body profiles, shell values, grants and GM fields cannot pass validation',()=>{
 for(const mutate of [p=>p.species.find(s=>s.id==='species:shard').speed=6,p=>p.species.find(s=>s.id==='species:shard').droidBody.allowedSystems.push('equipment:unknown'),p=>p.species.find(s=>s.id==='species:sorcerer-of-rhand').bonusForceTraining.fraction=0,p=>p.species.find(s=>s.id==='species:sorcerer-of-rhand').gmQualities.maximum=100]){const p=structuredClone(pack);mutate(p);assert.throws(()=>validatePack(p));}
 const c=hero('shard');for(const shellSpeed of [-1,1.5,100001,'6']){const copy=structuredClone(c);copy.droidSystems[copy.species].shellSpeed=shellSpeed;assert.throws(()=>validateCharacter(copy,pack));}
 const r=hero('sorcerer-of-rhand');r.speciesQualities={[r.species]:Array.from({length:4},()=>({name:'x',text:''}))};assert.throws(()=>validateCharacter(r,pack));
});
