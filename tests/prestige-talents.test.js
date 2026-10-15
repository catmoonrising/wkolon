import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,eligible,validateCharacter} from '../src/rules.js';
import {planFullAttack} from '../src/full-attacks.js';
import {rollRoutine} from '../src/combat.js';
import {featureChoices} from '../src/feature-choices.js';
import {featureGraph} from '../src/feature-trees.js';
import {acrobaticsMove} from '../src/acrobatics-movement-actions.js';
import {planAcrobaticsMove} from '../src/acrobatics-movement.js';
import {useAdeptPower} from '../src/force-powers.js';
import {renderStatBlock} from '../src/stat-block.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const f=(name,choice)=>({id:'feat:'+name,...(choice?{choice}:{})});
const t=(name,choice)=>({id:'talent:'+name,...(choice?{choice}:{})});
function add(c,cls,talent=null){
 const r=ix.classes.get('class:'+cls),n=c.levels.length+1;
 c.levels.push({classId:r.id,hpRoll:6,feats:[],talent,startingFeat:null,abilityIncreases:pack.rules.abilityLevels.includes(n)?['str','con']:[],trainedSkills:[],...(r.entrySpecials?{entryDeclarations:Object.fromEntries(r.entrySpecials.map(s=>[s.id,true]))}:{})});
}
function soldier(){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:13,dex:16,con:10,int:10,wis:10,cha:10};
 c.levels[0].classId='class:soldier';c.trainedSkills=['skill:pilot','skill:initiative','skill:perception','skill:endurance'];
 c.levels[0].feats=[f('martial-arts-i'),f('point-blank-shot')];c.levels[0].talent=t('armored-defense');
 for(let i=2;i<=7;i++){add(c,'soldier');if(i===2)c.levels.at(-1).feats=[f('quick-draw')];if(i===3)c.levels.at(-1).feats=[f('precise-shot')];}
 return c;
}
function jedi(){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:10,dex:18,con:10,int:10,wis:10,cha:10};
 c.levels[0].classId='class:jedi';c.trainedSkills=['skill:acrobatics','skill:initiative','skill:use-the-force'];c.levels[0].feats=[f('weapon-focus','lightsabers'),f('force-training')];c.levels[0].talent=t('acrobatic-recovery');
 c.levels[0].forcePowers=[{id:crypto.randomUUID(),powerId:'power:battle-strike',spent:false}];
 for(let i=2;i<=7;i++){add(c,'jedi');if(i===3)c.levels.at(-1).talent=t('weapon-specialization-lightsabers');}
 return c;
}
function weapon(c,name,extra={}){const e={id:'equipment:'+name,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,distance:1,...extra};c.inventory.push(e);return e;}
const fullRoutine=(a,b=a)=>({kind:'fullAttack',steps:[{attackId:a.uid,count:1,source:'base',attackMod:0,damageMod:0},{attackId:b.uid,count:1,source:a===b?'doubleAttack':'twoWeapons',attackMod:0,damageMod:0}]});

test('Core prestige talents have full sources, matching-choice prerequisites and class-limited graph access',()=>{
 assert.equal(pack.talents.length,194);
 const c=soldier();add(c,'gunslinger');const d=derive(c,pack),ids=ix.classes.get('class:gunslinger').talentTrees;
 const graph=featureGraph(pack,{type:'talents',ctx:d.ctx,allowedIds:pack.talents.filter(r=>ids.includes(r.tree)).map(r=>r.id)});
 assert(graph.nodes.has('talent:trigger-work|'));assert(!graph.nodes.has('talent:ataru|'));
 for(const r of pack.talents.slice(111))assert(r.article?.blocks.length,r.name);
});
test('Greater Focus and Specialization require the same group, preserve fixed Lightsaber aliases and exclude Lightsabers from generic Greater Specialization',()=>{
 const c=soldier(),ctx=derive(c,pack).ctx;ctx.feats.push(f('weapon-focus','pistols'));ctx.talents.push(t('weapon-specialization','pistols'),t('greater-weapon-focus','pistols'));
 const r=ix.talents.get('talent:greater-weapon-specialization');
 assert(eligible(r,t('greater-weapon-specialization','pistols'),ctx,ix,'talents'));
 assert(!eligible(r,t('greater-weapon-specialization','rifles'),ctx,ix,'talents'));
 assert(!featureChoices(r,pack).includes('lightsabers'));
 ctx.feats.push(f('weapon-focus','lightsabers'));ctx.talents.push(t('weapon-specialization-lightsabers'),t('greater-weapon-focus','lightsabers'));
 assert(eligible(ix.talents.get('talent:greater-weapon-specialization-lightsabers'),t('greater-weapon-specialization-lightsabers'),ctx,ix,'talents'));
 const graph=featureGraph(pack,{type:'talents',ctx,allowedIds:['talent:greater-weapon-specialization']});assert(graph.nodes.size>1);
});
test('Force Power Adept only permits known powers and never repeats the same power',()=>{
 const c=jedi(),ctx=derive(c,pack).ctx,r=ix.talents.get('talent:force-power-adept');
 assert(eligible(r,t('force-power-adept','power:battle-strike'),ctx,ix,'talents'));
 assert(!eligible(r,t('force-power-adept','power:force-lightning'),ctx,ix,'talents'));
 ctx.talents.push(t('force-power-adept','power:battle-strike'));assert(!eligible(r,t('force-power-adept','power:battle-strike'),ctx,ix,'talents'));
 assert.doesNotThrow(()=>featureGraph(pack,{type:'talents',ctx,allowedIds:[r.id]}));
});
test('Force Power Adept spends one FP and copy, keeps the higher check, and applies natural-20 recovery only once',()=>{
 const c=jedi();c.levels[0].talent=t('equilibrium');c.levels[2].talent=t('force-recovery');c.levels[4].talent=t('force-focus');add(c,'force-adept',t('force-power-adept','power:battle-strike'));c.forcePoints=2;
 const copy=c.levels[0].forcePowers[0],d=derive(c,pack);assert(d.forcePowers[0].adept);
 const before=structuredClone(c);assert.throws(()=>useAdeptPower(c,d,pack,copy.id,[3,21]),/Invalid power/);assert.deepEqual(c,before);
 const result=useAdeptPower(c,d,pack,copy.id,[3,20]);assert.equal(result.selected,20);assert.equal(c.forcePoints,1);assert(copy.spent);assert(c.forcePowerRecoveryPending);
 copy.spent=false;c.forcePoints=0;assert.throws(()=>useAdeptPower(c,derive(c,pack),pack,copy.id,[10,15]),/unavailable/);assert(!copy.spent);
});
test('Ataru selects Dexterity damage, doubles its positive bonus in two hands and retains a better Strength option',()=>{
 const c=jedi();add(c,'jedi-knight',t('ataru'));const w=weapon(c,'lightsaber');let d=derive(c,pack),a=d.attacks.find(a=>a.uid===w.uid);assert.equal(a.damageBonus,10); // 4 half + 4 Dex + 2 specialization.
 w.twoHanded=true;assert.equal(derive(c,pack).attacks.find(a=>a.uid===w.uid).damageBonus,14);
 c.abilities.str=22;assert.equal(derive(c,pack).attacks.find(a=>a.uid===w.uid).damageBonus,20);
});
test('Niman defenses require a wielded Lightsaber and Greater Focus/Specialization stack once with their base features',()=>{
 const c=jedi();add(c,'jedi-knight',t('niman'));add(c,'jedi-knight');add(c,'jedi-knight',t('greater-weapon-focus-lightsabers'));add(c,'jedi-knight');add(c,'jedi-knight',t('greater-weapon-specialization-lightsabers'));
 const w=weapon(c,'lightsaber');let d=derive(c,pack),a=d.attacks.find(a=>a.uid===w.uid);assert.equal(a.damageBonus,11);assert.equal(a.attack,d.bab+d.mods.str+2);
 const ref=d.defenses.reflex,will=d.defenses.will;w.equipped=false;d=derive(c,pack);assert.equal(d.defenses.reflex,ref-1);assert.equal(d.defenses.will,will-1);
});
test('Exotic Weapon Mastery grants proficiency with every Exotic Weapon without a proficiency feat',()=>{
 const c=soldier();add(c,'elite-trooper',t('exotic-weapon-mastery'));const w=weapon(c,'bowcaster');assert(derive(c,pack).attacks.find(a=>a.uid===w.uid).proficient);
 c.levels[7].talent=null;assert(!derive(c,pack).attacks.find(a=>a.uid===w.uid).proficient);
});
test('Multiattack Proficiency stacks, reduces matching Full Attack rolls only, and never turns a penalty into a bonus',()=>{
 const c=soldier();c.levels[5].feats=[f('double-attack','pistols')];add(c,'gunslinger',t('multiattack-proficiency-pistols'));
 const p=weapon(c,'blaster-pistol'),r=weapon(c,'blaster-rifle');let d=derive(c,pack),plan=planFullAttack(fullRoutine(p),d,pack);assert.equal(plan.attacks.find(a=>a.uid===p.uid).attack,d.attacks.find(a=>a.uid===p.uid).attack-3);
 assert.equal(plan.attacks.find(a=>a.uid===r.uid).attack,d.attacks.find(a=>a.uid===r.uid).attack-5);
 c.fullAttackPenalties={twoWeapons:0,doubleAttack:-5,tripleAttack:0};d=derive(c,pack);plan=planFullAttack(fullRoutine(p),d,pack);assert.equal(plan.attacks.find(a=>a.uid===p.uid).attack,d.attacks.find(a=>a.uid===p.uid).attack);
 add(c,'gunslinger');add(c,'gunslinger',t('multiattack-proficiency-pistols'));add(c,'gunslinger');add(c,'gunslinger',t('multiattack-proficiency-pistols'));
 d=derive(c,pack);assert.equal(d.attacks.find(a=>a.uid===p.uid).fullAttackPenalty,0);assert.equal(d.attacks.find(a=>a.uid===r.uid).fullAttackPenalty,-5);
});
test('Wookiee bowcasters use rifle Full Attack and Multiattack benefits only under the enabled familiarity ruling',()=>{
 const c=soldier();c.species='species:wookiee';c.levels[0].feats=[f('martial-arts-i')];c.levels[2].feats=[f('point-blank-shot')];c.levels[5].feats=[f('double-attack','rifles')];add(c,'elite-trooper',t('multiattack-proficiency-rifles'));const w=weapon(c,'bowcaster');let d=derive(c,pack),a=d.attacks.find(a=>a.uid===w.uid);
 assert.equal(a.effectGroup,'rifles');assert.equal(a.multiattackReduction,2);assert.equal(planFullAttack(fullRoutine(w),d,pack).attacks.find(a=>a.uid===w.uid).attack,a.attack-3);
 c.houseRules={jediCounseling:{'jc:112-weapon-familiarity-with-feats-and-talents':false}};d=derive(c,pack);a=d.attacks.find(a=>a.uid===w.uid);assert.equal(a.multiattackReduction,0);assert.throws(()=>planFullAttack(fullRoutine(w),d,pack),/requires its chosen/);
});
test('Trigger Work removes Rapid Shot penalties even below Dexterity 13; Controlled Burst reduces autofire, Burst Fire and braced attacks',()=>{
 const c=soldier();c.levels[3].feats=[f('rapid-shot'),f('burst-fire')];add(c,'gunslinger',t('trigger-work'));const p=weapon(c,'blaster-pistol',{attackTechnique:'rapid-shot'});c.abilities.dex=10;
 let d=derive(c,pack),a=d.attacks.find(a=>a.uid===p.uid);assert.equal(a.attack,d.bab+d.mods.dex+1);
 const e=soldier();e.levels[3].feats=[f('weapon-proficiency-heavy-weapons'),f('burst-fire')];add(e,'elite-trooper',t('controlled-burst'));const w=weapon(e,'heavy-repeating-blaster',{attackTechnique:'burst-fire'});e.abilities.str=10;d=derive(e,pack);a=d.attacks.find(a=>a.uid===w.uid);assert.equal(a.attack,d.bab+d.mods.dex+1-2);
 w.braced=true;d=derive(e,pack);a=d.attacks.find(a=>a.uid===w.uid);assert.equal(a.attack,d.bab+d.mods.dex+1);assert.equal(a.unBraced.attack,a.attack-2);
});
test('Vaapad makes natural 19 a critical only when it hits, leaves natural 20 automatic and prints the expanded range',()=>{
 const c=jedi();add(c,'jedi-knight',t('niman'));add(c,'jedi-knight');add(c,'jedi-knight',t('juyo'));add(c,'jedi-knight');add(c,'jedi-knight',t('vaapad'));const w=weapon(c,'lightsaber');const d=derive(c,pack),a=d.attacks.find(a=>a.uid===w.uid);assert.equal(a.criticalThreat,19);
 const rolls=[{value:19+a.attack,d20:[19],display:'19'},{value:22,display:'22'}];const result=rollRoutine({steps:[{attackId:w.uid,count:1,attackMod:0,damageMod:0}]},[a],pack.rules.combat,()=>rolls.shift());
 assert(result.results[0].critical);assert(!result.results[0].naturalHit);assert.equal(result.rows[0].damage,0);assert.equal(result.rows[1].damage,22);assert.match(result.html,/Critical if hits/);assert.match(renderStatBlock(c,d,pack),/19–20 critical/);
});
test('Sokan permits threatened Tumble Take10 and one-square costs, while terrain checks stay independent',()=>{
 const c=jedi();add(c,'jedi-knight',t('sokan'));c.acrobaticsMovement={tumble:true,crossTerrain:true,checkMode:'take10',terrainCheck:15,occupied:2,path:{squares:4,difficult:2},tumbled:{squares:2,difficult:2}};
 let d=derive(c,pack);assert.equal(planAcrobaticsMove(c,d,pack).cost,4);let calls=0;const result=acrobaticsMove(c,d,pack,()=>{calls++;throw new Error('unexpected roll');});assert.equal(calls,0);assert.equal(result.tumbleRoll.value,10+d.skills.find(s=>s.id==='skill:acrobatics').total);assert.equal(result.terrainRoll.value,15);assert(result.movementComplete);
 c.levels[7].talent=null;d=derive(c,pack);assert.throws(()=>planAcrobaticsMove(c,d,pack),/requires Sokan/);validateCharacter(c,pack);
});
test('Force Treatment and Force Deception grant training and substitutions, while an inactive Sith class removes its conditional training',()=>{
 const c=jedi();c.darkSideScore=10;add(c,'sith-apprentice',t('force-deception'));c.levels[7].acquisitionDSS=10;c.skillCheckSources={'skill:deception':'skill:use-the-force'};let d=derive(c,pack);assert(d.ctx.trained.has('skill:deception'));assert.equal(d.skills.find(s=>s.id==='skill:deception').checkSource,'skill:use-the-force');
 c.darkSideScore=9;d=derive(c,pack);assert(!d.ctx.trained.has('skill:deception'));assert.equal(d.skills.find(s=>s.id==='skill:deception').checkSource,'skill:deception');
 const ctx=derive(jedi(),pack).ctx;ctx.talents.push(t('equilibrium'));assert(eligible(ix.talents.get('talent:fortified-body'),t('fortified-body'),ctx,ix,'talents'));
});
