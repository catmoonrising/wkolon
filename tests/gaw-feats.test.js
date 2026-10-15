import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,eligible,validateCharacter} from '../src/rules.js';
import {setTeamAllies} from '../src/team-skills.js';
import {damageOutcome} from '../src/incoming-damage.js';
import {opportunityPlan} from '../src/opportunity-actions.js';
import {opportunityContext} from '../src/opportunity.js';
import {articleText} from '../src/wiki-content.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ix=indexPack(pack);
const f=(id,choice)=>({id:'feat:'+id,...(choice?{choice}:{})}),item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='blaster-pistol'?{shotsRemaining:20}:{})});
function hero(){const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:18,dex:12,con:12,int:20,wis:10,cha:20};c.trainedSkills=['skill:climb','skill:perception'];const choices={0:[f('ascension-specialists'),f('skill-focus','skill:climb')],1:[f('resilient-strength')],2:[f('predictive-defense')],3:[f('unstoppable-force')],5:[f('force-of-personality'),f('opportunistic-shooter')],8:[f('fight-through-pain')],11:[f('grand-army-of-the-republic-training')]};c.levels=Array.from({length:12},(_,i)=>({classId:'class:soldier',hpRoll:i?6:null,feats:choices[i]||[],talent:i===0?{id:'talent:armored-defense'}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]}));c.inventory=[item('knighthunter-armor'),item('blaster-pistol'),item('knife')];return c;}
const skill=(d,id='climb')=>d.skills.find(s=>s.id==='skill:'+id);
test('Galaxy at War options use pinned full articles and both Staggering Attack book versions remain distinct',()=>{
 validatePack(pack);const gaw=pack.feats.filter(r=>pack.sources.find(s=>s.id===r.sourceId).title==='Staggering Attack'||pack.catalog.records.some(c=>c.mechanicsIds.includes(r.id)&&c.books.includes('Galaxy at War')));assert(gaw.length>=35);
 const ga=ix.feats.get('feat:staggering-attack-galaxy-at-war'),sv=ix.feats.get('feat:staggering-attack-scum-and-villainy');assert(ga&&sv);assert(!ix.feats.has('feat:staggering-attack'));const gt=articleText(ga.article),st=articleText(sv.article);assert(gt.includes('concentration')&&!gt.includes('forgo'));assert(st.includes('forgo')&&!st.includes('concentration'));assert.equal(pack.sources.find(s=>s.id===ga.sourceId).section,'Galaxy at War');assert.equal(pack.sources.find(s=>s.id===sv.sourceId).section,'Scum and Villainy');assert.equal(ga.exclusiveGroup,sv.exclusiveGroup);for(const c of pack.classes){assert.equal(c.bonusFeats.includes(ga.id),['class:jedi','class:soldier'].includes(c.id));assert(!c.bonusFeats.includes(sv.id));}
 const ctx=derive(hero(),pack).ctx;assert(eligible(ga,{id:ga.id},ctx,ix,'feats'));assert(!eligible(sv,{id:sv.id},ctx,ix,'feats'));ctx.feats.push(f('rapid-shot'));assert(eligible(sv,{id:sv.id},ctx,ix,'feats'));ctx.feats.push({id:ga.id});assert(!eligible(sv,{id:sv.id},ctx,ix,'feats'));
});
test('all thirteen team feat rules use a fixed skill and capped competence bonus',()=>{
 const rows=pack.feats.filter(r=>r.effects.some(e=>e.target==='teamSkill'));assert.equal(rows.length,13);for(const r of rows){const e=r.effects[0];assert.equal(e.type,'competence');assert.equal(e.amount,3);assert.equal(e.perAlly,1);assert.equal(e.maximum,7);assert.equal(e.radius,12);assert.equal(r.prerequisite.requirements[0].value,e.skill);}
});
test('team bonuses compete with Skill Focus, cap at seven, and survive saves',()=>{
 const c=hero();const before=skill(derive(c,pack)).total;setTeamAllies(c,pack,'feat:ascension-specialists',1);assert.equal(skill(derive(c,pack)).total,before);setTeamAllies(c,pack,'feat:ascension-specialists',3);assert.equal(skill(derive(c,pack)).total,before+1);setTeamAllies(c,pack,'feat:ascension-specialists',1000);assert.equal(skill(derive(c,pack)).total,before+2);validateCharacter(c,pack);assert.equal(skill(derive(JSON.parse(JSON.stringify(c)),pack)).total,before+2);
 c.levels[0].feats[1]=null;setTeamAllies(c,pack,'feat:ascension-specialists',0);assert.equal(skill(derive(c,pack)).total,before-2);c.trainedSkills=[];assert.equal(derive(c,pack).teamSkills.length,0,'An acquisition without its trained prerequisite is unavailable');
});
test('invalid team counts and defense overrides reject before state changes',()=>{
 const c=hero(),before=structuredClone(c);for(const [id,n] of [['feat:skill-focus',1],['feat:ascension-specialists',-1],['feat:ascension-specialists',1.5],['feat:ascension-specialists',1001]])assert.throws(()=>setTeamAllies(c,pack,id,n),/Allies/);assert.deepEqual(c,before);
 for(const mutate of [x=>x.teamFeatAllies={'feat:skill-focus':1},x=>x.teamFeatAllies=[],x=>x.defenseAbilities={reflex:'cha'},x=>x.defenseAbilities=JSON.parse('{"__proto__":"int"}'),x=>x.thresholdDefense='reflex']){const bad=structuredClone(c);mutate(bad);assert.throws(()=>validateCharacter(bad,pack),/team allies|defense abilities|threshold defense/);}
});
test('Predictive Defense uses Intelligence literally while attacks still use their ordinary abilities',()=>{
 const c=hero();let d=derive(c,pack);assert.equal(d.defenseAbilities.reflex.ability,'int');assert.equal(d.defenseAbilities.reflex.modifier,5);assert(d.armor.maxDex<5);const ref=d.defenses.reflex,shot=d.attacks.find(a=>a.group==='pistols').attack;c.flatFooted=true;assert.equal(derive(c,pack).defenses.reflex,ref);c.helpless=true;assert.equal(derive(c,pack).defenses.reflex,ref);c.helpless=false;c.flatFooted=false;c.defenseAbilities={reflex:'dex'};d=derive(c,pack);assert.equal(d.defenses.reflex,ref-4);assert.equal(d.attacks.find(a=>a.group==='pistols').attack,shot);c.levels[2].feats=[];c.defenseAbilities.reflex='int';d=derive(c,pack);assert.equal(d.defenseAbilities.reflex.ability,'dex');
});
test('Strength/Charisma alternatives affect defenses, with saved explicit lower choices and unchanged HP',()=>{
 const c=hero();let d=derive(c,pack);assert.equal(d.defenseAbilities.fortitude.ability,'str');assert.equal(d.defenseAbilities.will.ability,'cha');const hp=d.hp,ft=d.defenses.fortitude,will=d.defenses.will;c.defenseAbilities={fortitude:'con',will:'wis'};d=derive(c,pack);assert.equal(d.defenses.fortitude,ft-3);assert.equal(d.defenses.will,will-5);assert.equal(d.hp,hp);validateCharacter(c,pack);
});
test('Fight Through Pain chooses the strongest defense per context, including a conditional change of source',()=>{
 const c=hero(),d=derive(c,pack);assert(d.defenses.fortitude>d.defenses.will);assert.equal(d.threshold,d.defenses.fortitude);const expected=d.defenses.will+8;assert.equal(d.conditionalThresholds.find(r=>r.against==='use-the-force').total,expected);assert.equal(damageOutcome(c,d,pack,d.threshold,{requiresUseTheForce:true}).threshold,expected);assert(renderStatBlock(c,d,pack).includes(expected+' vs. Use the Force'));
 c.thresholdDefense='will';let selected=derive(c,pack);assert.equal(selected.threshold,selected.defenses.will);c.thresholdDefense='fortitude';selected=derive(c,pack);assert.equal(damageOutcome(c,selected,pack,1,{requiresUseTheForce:true}).threshold,selected.defenses.fortitude+5);
});
test('combined damage contexts obey bonus types and equipment replacement',()=>{
 const c=hero();c.thresholdDefense='will';c.levels[5].feats[0]=f('unwavering-resolve');let d=derive(c,pack);const before=d.defenses.will;assert.equal(damageOutcome(c,d,pack,1,{against:['use-the-force','deception-or-persuasion']}).threshold,before+8,'Insight five applies once, with three additional Equipment');assert.throws(()=>damageOutcome(c,d,pack,1,{against:['invented']}),/context/);
});
test('Mission Specialist uses a trained secondary skill and can repeat only for another skill',()=>{
 const c=hero(),ctx=derive(c,pack).ctx,r=ix.feats.get('feat:mission-specialist');assert(eligible(r,f('mission-specialist','skill:climb'),ctx,ix,'feats'));assert(!eligible(r,f('mission-specialist','skill:deception'),ctx,ix,'feats'));ctx.feats.push(f('mission-specialist','skill:climb'));assert(!eligible(r,f('mission-specialist','skill:climb'),ctx,ix,'feats'));assert(eligible(r,f('mission-specialist','skill:perception'),ctx,ix,'feats'));
});
test('Opportunistic Shooter adds two only to ranged opportunities and leaves ordinary/melee attacks unchanged',()=>{
 const c=hero();c.opportunity={...opportunityContext(c),opponent:'Guard',action:'Reload',provoked:true};const d=derive(c,pack),pistol=c.inventory[1].uid,knife=c.inventory[2].uid;assert.equal(opportunityPlan(c,pack,pistol).attack.attack,d.attacks.find(a=>a.uid===pistol).attack+2);assert.equal(opportunityPlan(c,pack,knife).attack.attack,d.attacks.find(a=>a.uid===knife).attack);
});
