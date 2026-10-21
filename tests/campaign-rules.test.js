import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {newDay,restEightHours} from '../src/recovery.js';
import {resizeLevelPlan,choosePlannedClass} from '../src/level-plan.js';
import {claimStartingCredits} from '../src/equipment.js';
import {activeBudget,abilityRecord,setAbilityBudget} from '../src/ability-profiles.js';
import {setGenerationMethod,assignScore,setPoolScore} from '../src/ability-generation.js';
import {CAMPAIGN_RULES,campaignRuleEnabled,forcePoolAfterAdvancement} from '../src/campaign-rules.js';
import {setTeamAllies} from '../src/team-skills.js';
import {createHouseRules} from '../src/house-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const hero=(n=1)=>{const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};while(c.levels.length<n)c.levels.push({...structuredClone(c.levels[0]),hpRoll:1});return c;};
const use=(c,id,on=true)=>{c.houseRules??={};c.houseRules.campaign??={};c.houseRules.campaign[id]=on;};

test('campaign rules default off, persist strict settings and record both manual rulings without restricting play',()=>{
 const c=hero(),ui=createHouseRules(pack);assert(CAMPAIGN_RULES.every(r=>!campaignRuleEnabled(c,r.id)));
 for(const id of ['legalReprogram','playerDarkSide'])assert(ui.change({dataset:{campaignRule:id},checked:true,hasAttribute:k=>k==='data-campaign-rule'},c));
 c.darkSideScore=10;const loaded=JSON.parse(JSON.stringify(c));validateCharacter(loaded,pack);assert.equal(loaded.id,c.id);assert(!derive(loaded,pack).incapacitated);
 const html=ui.render(loaded);assert(html.includes('achievable without using Reprogram'));assert(html.includes('the player may continue playing'));assert(!/[\u2014\u00b7]/.test(html));
 for(const bad of [{campaign:{unknown:true}},{campaign:{dailyForcePoints:'true'}},{hpRounding:'nearest'}])assert.throws(()=>validateCharacter({...c,houseRules:bad},pack),/campaign rules|house rules/);
});

test('planned generation fixes the budget at 25 without rewriting stored scores, including five-score droids',()=>{
 const c=newCharacter(pack),before=structuredClone(c.abilities);c.pointBudget=50;use(c,'plannedGeneration');assert.deepEqual(c.abilities,before);
 assert(derive(c,pack).issues.includes('Use Planned Generation (25 points)'));assert.equal(setGenerationMethod(c,'standard',pack),false);assert.deepEqual(c.abilities,before);
 setGenerationMethod(c,'point-buy',pack);assert.equal(activeBudget(c,pack),25);assert.equal(setAbilityBudget(c,pack,50),false);
 for(let i=0;i<6;i++){setPoolScore(c,i,18,pack);assignScore(c,['str','dex','con','int','wis','cha'][i],i,pack);}
 assert(derive(c,pack).issues.some(s=>s.includes('Point-buy budget exceeded')));validateCharacter(c,pack);
 use(c,'plannedGeneration',false);assert.equal(activeBudget(c,pack),50);
 const d=hero();d.species=pack.species.find(s=>s.isDroid&&s.noConstitution&&!s.fixedAbilities).id;use(d,'plannedGeneration');setGenerationMethod(d,'point-buy',pack);assert.equal(abilityRecord(d,pack).abilityGeneration.pool.length,5);assert.equal(activeBudget(d,pack),25);validateCharacter(d,pack);
});

test('average HP rounds up and supports multiclass dice while preserving first-level maximum and stored rolls',()=>{
 const c=hero(3),rolls=c.levels.map(l=>l.hpRoll);assert.equal(derive(c,pack).hp,32);use(c,'averageHP');
 assert.equal(derive(c,pack).hp,42);
 c.levels[2].classId='class:noble';assert.equal(derive(c,pack).hp,40);assert.deepEqual(c.levels.map(l=>l.hpRoll),rolls);
 use(c,'averageHP',false);assert.equal(derive(c,pack).hp,32);validateCharacter(c,pack);
});

test('average credits use exact expected values once, without rolling or changing money when merely toggled',()=>{
 for(const [id,amount] of [['jedi',750],['noble',3000],['scoundrel',1875],['scout',1875],['soldier',1875]]){
  const c=newCharacter(pack,{classId:'class:'+id});use(c,'averageCredits');assert.equal(c.credits,0);
  const result=claimStartingCredits(c,pack,()=>{throw new Error('Must not roll');});assert.equal(c.credits,amount);assert(result.average);assert.deepEqual(result.rolls,[]);assert.throws(()=>claimStartingCredits(c,pack),/already assigned/);validateCharacter(c,pack);
 }
 const c=hero(),r=claimStartingCredits(c,pack,()=>1);assert.equal(c.credits,750);assert(!r.average);
});

test('Skill Focus scales by heroic level, remains competence, and is lost when training is absent',()=>{
 for(const [n,focus] of [[1,1],[2,1],[3,2],[10,5],[11,6],[20,10]]){
  const c=hero(n);c.trainedSkills=['skill:perception'];c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:perception'}];use(c,'scalingSkillFocus');
  const skill=derive(c,pack).skills.find(s=>s.id==='skill:perception');assert.equal(skill.focus,focus);assert.equal(skill.total,Math.floor(n/2)+5+focus);assert(skill.breakdown.includes(focus+' competence'));
  use(c,'scalingSkillFocus',false);assert.equal(derive(c,pack).skills.find(s=>s.id==='skill:perception').focus,5);
  c.trainedSkills=[];use(c,'scalingSkillFocus');assert.equal(derive(c,pack).skills.find(s=>s.id==='skill:perception').focus,0);
 }
});

test('daily Force Points use exact level bands and Force Boon, discard carryover, and do not refresh with rest or advancement',()=>{
 for(const [level,max] of [[1,1],[5,1],[6,2],[10,2],[11,3],[15,3],[16,4],[20,4]]){
  const c=hero(level);use(c,'dailyForcePoints');assert.equal(derive(c,pack).forceMaximum,max);c.forcePoints=0;newDay(c,pack);assert.equal(c.forcePoints,max);
  c.levels[0].feats=[{id:'feat:force-sensitivity'},{id:'feat:force-boon'}];assert.equal(derive(c,pack).forceMaximum,max+1);newDay(c,pack);assert.equal(c.forcePoints,max+1);
  c.forcePoints=100;assert.throws(()=>validateCharacter(c,pack),/daily Force Point pool/);newDay(c,pack);assert.equal(c.forcePoints,max+1);c.forcePoints=0;restEightHours(c,derive(c,pack),pack);assert.equal(c.forcePoints,0);
  validateCharacter(c,pack);
 }
 const c=hero(5);use(c,'dailyForcePoints');c.forcePoints=0;resizeLevelPlan(c,pack,6);choosePlannedClass(c,pack,5,'class:soldier');assert.equal(derive(c,pack).forceMaximum,2);assert.equal(c.forcePoints,0);
 assert.equal(forcePoolAfterAdvancement(c,derive(c,pack),{gained:true}),0);newDay(c,pack);assert.equal(c.forcePoints,2);
 c.forcePoints=1;resizeLevelPlan(c,pack,5);assert.equal(c.forcePoints,1);use(c,'dailyForcePoints',false);newDay(c,pack);assert.equal(c.forcePoints,1);
 const draft=newCharacter(pack);use(draft,'dailyForcePoints');choosePlannedClass(draft,pack,0,'class:soldier');assert.equal(draft.forcePoints,1);
 const v=hero();v.species='species:yuuzhan-vong-core-rulebook';use(v,'dailyForcePoints');newDay(v,pack);assert.equal(v.forcePoints,0);assert.equal(derive(v,pack).forceMaximum,0);
});

test('scaled Skill Focus competes with other competence bonuses instead of stacking',()=>{
 const c=hero();c.trainedSkills=['skill:climb'];c.levels[0].feats=[{id:'feat:ascension-specialists'},{id:'feat:skill-focus',choice:'skill:climb'}];use(c,'scalingSkillFocus');setTeamAllies(c,pack,'feat:ascension-specialists',4);
 const skill=derive(c,pack).skills.find(s=>s.id==='skill:climb');assert.equal(skill.focus,1);assert.equal(skill.total,12);assert(skill.breakdown.includes('7 competence'));
});

test('enabling daily pools clamps old points atomically without a refill, and disabling does not award points',()=>{
 const c=hero(),ui=createHouseRules(pack),el={dataset:{campaignRule:'dailyForcePoints'},checked:true,hasAttribute:k=>k==='data-campaign-rule'};assert(ui.change(el,c));validateCharacter(c,pack);assert.equal(c.forcePoints,1);c.forcePoints=0;el.checked=false;ui.change(el,c);assert.equal(c.forcePoints,0);
});
