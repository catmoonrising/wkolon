import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,beginNextTurn,endCurrentTurn,endTrackedCombat,finishForceChoice,previewPlan} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {rollCombatRoutine,defenseRangeRows,rollCharge} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {evalExpr} from '../src/dice.js';
import {rollRunningAttack} from '../src/combat-movement-actions.js';
import {movementSegment} from '../src/combat-movement.js';
import {rollOpportunity} from '../src/opportunity-actions.js';
import {rollCleave} from '../src/attack-follow-up-actions.js';
import {followUpState} from '../src/attack-follow-ups.js';
import {rollBellow} from '../src/species-actions.js';
import {chooseSelfPowerDice,battleStrike,withBattleStrike,finishSelfPower,removeSelfPowerEffect} from '../src/self-power-effects.js';
import {newDay,restEightHours} from '../src/recovery.js';
import {recoverSuite} from '../src/force-powers.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(){const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:14,int:14,wis:14,cha:14};c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:force-training'}];c.levels[0].forcePowers=Array.from({length:3},()=>({id:crypto.randomUUID(),powerId:'power:battle-strike',spent:false}));c.inventory=[{uid:crypto.randomUUID(),id:'equipment:lightsaber',quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];return c;}
const checkRoll=total=>expr=>{const mod=Number(expr.match(/1d20([+-]\d+)/)[1]);return {value:total,d20:[Math.min(20,Math.max(1,total-mod))],display:String(total),coeffs:[1]};};
function use(c,total=25,options={}){const copy=c.levels[0].forcePowers.find(p=>!p.spent);return takeAction(c,pack,'power',{powerId:copy.id,fp:'none',...options},checkRoll(total));}
function weapon(c,{count=1,natural=12,base=8,bonus=6}={}){const calls=[],roll=expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?natural+Number(m[1]):expr.includes('d6')&&!expr.includes('d8')?bonus:base,d20:m?[natural]:[],display:expr,coeffs:[1]};},r=rollCombatRoutine({name:'Strike',steps:[{attackId:c.inventory[0].uid,count,attackMod:0,damageMod:0}]},derive(c,pack),pack,roll);return {...r,calls};}

test('Battle Strike resolves baseline and all tiers, spends one suite copy and Swift, and failures grant no effect',()=>{validatePack(pack);for(const [total,dice]of [[14,0],[15,1],[19,1],[20,2],[24,2],[25,3]]){const c=hero(),fp=c.forcePoints,base=derive(c,pack).attacks[0].attack;use(c,total);assert.equal(c.levels[0].forcePowers[0].spent,true);assert.deepEqual(c.actionState.spent,['swift']);assert.equal(c.forcePoints,fp);assert.equal(c.selfPowerEffects?.[0].baseDice||0,dice);assert.equal(derive(c,pack).attacks[0].attack,base+(dice?1:0));validateCharacter(c,pack);}});
test('FP after check changes tier without rerolling; enhanced damage waits and spends exactly once',()=>{
 const c=hero();use(c,19,{fp:'ask'});const step=c.actionState.plan[0],fp=c.forcePoints;assert(!c.selfPowerEffects);const final=finishForceChoice(c,pack,step.id,'bonus',()=>({value:1,display:'1'}));assert.match(final.html,/Attack \+1 Force; \+2d6 on hit/);assert.equal(c.selfPowerEffects[0].baseDice,2);assert.equal(c.forcePoints,fp-1);assert.throws(()=>finishForceChoice(c,pack,step.id,'bonus'));
 const h=hero();use(h,25,{enhance:true});assert(!h.selfPowerEffects);const saved=JSON.parse(JSON.stringify(h));finishForceChoice(saved,pack,saved.actionState.plan[0].id,'enhance');assert.equal(saved.selfPowerEffects[0].baseDice,3);assert(saved.selfPowerEffects[0].enhanced);assert.equal(battleStrike(saved,pack).dice,5);assert.equal(saved.forcePoints,h.forcePoints-1);validateCharacter(saved,pack);
});
test('failed enhancement cannot create an effect, while a declined FP decision applies the original tier',()=>{
 const c=hero();use(c,14,{enhance:true});assert(!c.selfPowerEffects);assert.equal(c.actionState.plan[0].status,'done');const h=hero();use(h,20,{fp:'ask'});finishForceChoice(h,pack,h.actionState.plan[0].id,false);assert.equal(h.selfPowerEffects[0].baseDice,2);
});
test('first attack gets Force bonus and hit dice, next routine attacks do not, including a first natural-1 miss',()=>{
 const c=hero(),before=derive(c,pack).attacks[0].attack;use(c,15);const r=weapon(c,{count:2});assert.equal(r.results[0].attackBonus,before+1);assert.equal(r.results[1].attackBonus,before);assert.equal(r.results[0].damage,14);assert.equal(r.results[1].damage,8);assert.equal(r.results[0].hitOnlyDamage,6);spendAttackResources(c,r);assert.equal(c.selfPowerEffects,undefined);assert.throws(()=>spendAttackResources(c,r),/changed/);
 const h=hero();use(h,15);const miss=weapon(h,{natural:1,count:2});assert(miss.results[0].naturalMiss);assert.equal(miss.results[0].damage,0);assert.equal(miss.results[1].attackBonus,derive(h,pack).attacks[0].attack-1);spendAttackResources(h,miss);assert(!h.selfPowerEffects);
});
test('area misses halve only ordinary damage; hits and Evasion-on-hit use the full damage',()=>{
 const rows=defenseRangeRows([{areaType:'burst',total:20,damage:18,hitOnlyDamage:6,naturalHit:false,naturalMiss:false,failedArea:false}]);const miss=rows.find(r=>r.hi===null),hit=rows.find(r=>r.hi===20);assert.equal(miss.damage,6);assert.equal(miss.evasion,0);assert.equal(hit.damage,18);assert.equal(hit.evasion,9);
});
test('Bellow shares attack bonus, damage, hit-only area rows and consumption even when it knocks the caster out',()=>{
 const c=hero();c.species='species:ithorian';use(c,15);const before=derive(c,pack),r=rollBellow(c,before,pack,10,null,expr=>{const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?12+Number(m[1]):expr==='1d6'?6:40,d20:m?[12]:[],display:expr,coeffs:[1]};});assert.equal(r.results[0].attackBonus,before.level+before.specialAttackPenalty);assert.equal(r.results[0].damage,46);assert.equal(r.rows[0].damage,20);assert.equal(c.condition,5);assert(!c.selfPowerEffects);
});
test('extra dice are included before applying minimum damage and non-area critical multipliers',()=>{
 const c=hero();use(c,15);const r=weapon(c,{base:-4,bonus:6});assert.equal(r.results[0].damage,2);assert.equal(r.results[0].hitOnlyDamage,1);
 const h=hero();use(h,15);const crit=weapon(h,{natural:20,base:16,bonus:12});assert.equal(crit.results[0].damage,28);assert(crit.calls.some(expr=>expr==='(1d6)*2'));
});
test('repeated uses keep a single Force bonus but stack unnamed damage dice, and can choose lesser achieved tiers',()=>{
 const c=hero(),base=derive(c,pack).attacks[0].attack;use(c,25);use(c,20);assert.equal(derive(c,pack).attacks[0].attack,base+1);assert.equal(battleStrike(c,pack).dice,5);chooseSelfPowerDice(c,c.selfPowerEffects[0].id,1);assert.equal(battleStrike(c,pack).dice,3);assert.throws(()=>chooseSelfPowerDice(c,c.selfPowerEffects[1].id,3));assert.equal(battleStrike(c,pack,[{amount:3,type:'force'}]).attackBonus,0);
});
test('expiry is end of next turn; repeated end clicks, implicit new turns, rests and saved effects behave consistently',()=>{
 const c=hero();use(c,15);endCurrentTurn(c,pack);endCurrentTurn(c,pack);assert.equal(c.selfPowerEffects[0].endsRemaining,1);const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);beginNextTurn(saved,pack);assert(saved.selfPowerEffects);endCurrentTurn(saved,pack);assert(!saved.selfPowerEffects);
 for(const rest of [c=>recoverSuite(c,derive(c,pack)),c=>newDay(c,pack),c=>restEightHours(c,derive(c,pack),pack)]){const h=hero();use(h,15);rest(h);assert(!h.selfPowerEffects);}
 const h=hero();use(h,15);endTrackedCombat(h);assert(h.selfPowerEffects);beginNextTurn(h,pack);beginNextTurn(h,pack);assert(!h.selfPowerEffects);
});
test('invalid attacks, stale power snapshots and queued previews do not consume real effects',()=>{
 const c=hero();use(c,15);const before=structuredClone(c);queueAction(c,'attack',{uid:c.inventory[0].uid});const queued=structuredClone(c);previewPlan(c,pack);assert.deepEqual(c,queued);const r=weapon(c);chooseSelfPowerDice(c,c.selfPowerEffects[0].id,1);c.selfPowerEffects[0].ended=true;assert.throws(()=>spendAttackResources(c,r),/changed/);assert(c.selfPowerEffects);c.inventory[0].equipped=false;assert.throws(()=>weapon(c));assert(c.selfPowerEffects);
});
test('old characters and strict saved effects validate; stat blocks show the active source and damage',()=>{
 const c=hero();use(c,25);assert.match(renderStatBlock(c,derive(c,pack),pack),/3d6 on hit/);for(const change of [s=>s.maxDice=4,s=>s.baseDice=0,s=>s.endsRemaining=3,s=>s.enhanced=1,s=>s.extra=true]){const bad=structuredClone(c);change(bad.selfPowerEffects[0]);assert.throws(()=>validateCharacter(bad,pack));}assert.doesNotThrow(()=>validateCharacter(hero(),pack));
});

test('Force Power Adept uses the better natural roll, spends one FP, and natural 20 recovery preserves the active effect',()=>{
 const c=hero();c.levels[0].talent={id:'talent:equilibrium'};for(let i=1;i<7;i++)c.levels.push({classId:'class:jedi',hpRoll:5,feats:[],talent:i===2?{id:'talent:force-recovery'}:i===4?{id:'talent:force-focus'}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});c.levels.push({classId:'class:force-adept',hpRoll:5,feats:[],talent:{id:'talent:force-power-adept',choice:'power:battle-strike'},startingFeat:null,abilityIncreases:[],trainedSkills:[]});assert(derive(c,pack).forcePowers[0].adept);const fp=c.forcePoints,rolls=[11,20],bonus=derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total;takeAction(c,pack,'power',{powerId:c.levels[0].forcePowers[0].id,rollMode:'adept',fp:'none'},()=>{const natural=rolls.shift();return {value:natural+bonus,d20:[natural],display:String(natural),coeffs:[1]};});
 assert.equal(rolls.length,0);assert.equal(c.forcePoints,fp-1);assert.equal(c.selfPowerEffects[0].maxDice,3);assert(c.forcePowerRecoveryPending);endCurrentTurn(c,pack);assert(c.levels[0].forcePowers.every(p=>!p.spent));assert.equal(c.selfPowerEffects[0].endsRemaining,1);
});
test('Power Mastery Take 10 plus an after-check FP can cross a damage tier without a skill die',()=>{
 const c=hero();c.abilities.cha=20;for(let i=1;i<7;i++)c.levels.push({classId:'class:jedi',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});const cls=pack.classes.find(r=>r.id==='class:jedi-knight');for(let i=0;i<2;i++)c.levels.push({classId:cls.id,hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],entryDeclarations:Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true])),acquisitionDSS:0,...(i?{classChoices:[{id:'classchoice:force-power-mastery',choice:'power:battle-strike'}]}:{})});assert(derive(c,pack).forcePowers[0].take10);const copy=c.levels[0].forcePowers[0];takeAction(c,pack,'power',{powerId:copy.id,rollMode:'take10',fp:'ask'},()=>assert.fail('No skill die'));const step=c.actionState.plan[0];assert.equal(step.result.check.total,24);finishForceChoice(c,pack,step.id,'bonus',()=>({value:1,display:'1'}));assert.equal(c.selfPowerEffects[0].maxDice,3);assert.equal(c.actionState.plan[0].result.check.natural,10);
});
test('lost pending power copy cannot spend an FP or create an unrelated effect; manual expiry refunds nothing',()=>{
 const c=hero();use(c,20,{fp:'ask'});const id=c.actionState.plan[0].id,copy=c.levels[0].forcePowers.shift(),before=structuredClone(c);assert.throws(()=>finishForceChoice(c,pack,id,'enhance'),/Power unavailable/);assert.deepEqual(c,before);c.levels[0].forcePowers.unshift(copy);finishForceChoice(c,pack,id,'none');const fp=c.forcePoints;removeSelfPowerEffect(c,id);assert(!c.selfPowerEffects);assert.equal(c.forcePoints,fp);assert(c.levels[0].forcePowers[0].spent);
});

test('high skill modifiers let a natural-1 power check succeed; Natural 1 is not an automatic skill failure',()=>{
 const c=hero();c.abilities.cha=30;c.levels[0].feats.push({id:'feat:skill-focus',choice:'skill:use-the-force'});for(let i=1;i<9;i++)c.levels.push({classId:'class:jedi',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});assert.equal(derive(c,pack).skills.find(s=>s.id==='skill:use-the-force').total,24);use(c,25);assert.equal(c.actionState.plan[0].result.check.natural,1);assert.equal(c.selfPowerEffects[0].maxDice,3);assert(!c.forcePowerRecoveryPending);
});
test('Battle Strike does not restore expired Mighty Swing or Aim/Deadeye damage on subsequent routine attacks',()=>{
 const c=hero();c.levels[0].feats.push({id:'feat:mighty-swing'});use(c,15);c.mightySwing=true;const r=weapon(c,{count:2});assert(r.calls.includes('3d8+2'));assert(r.calls.includes('2d8+2'));assert.equal(r.calls.filter(s=>s==='1d6').length,1);assert.equal(r.results[1].damage,8);
 const h=hero();h.levels[0].feats.push({id:'feat:point-blank-shot'});for(let i=1;i<7;i++)h.levels.push({classId:'class:jedi',hpRoll:5,feats:i===2?[{id:'feat:precise-shot'}]:i===5?[{id:'feat:deadeye'}]:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});h.inventory[0]={...h.inventory[0],id:'equipment:blaster-rifle',shotsRemaining:10,distance:1};use(h,15);h.inventory[0].aimed=true;const a=derive(h,pack).attacks[0];assert(a.aimed);const out=weapon(h,{count:2});assert(out.calls.includes('4d8+4'),JSON.stringify({calls:out.calls,feats:derive(h,pack).ctx.feats.map(f=>f.id)}));assert(out.calls.includes('3d8+4'));assert.equal(out.calls.filter(s=>s==='1d6').length,1);
});

test('Powerful Charge retains its flat damage with Battle Strike, and moving/opportunity attacks consume the same effect',()=>{
 const random=Math.random;Math.random=()=>.5;
 try{
  const c=hero();c.levels[0].feats.push({id:'feat:powerful-charge'});for(let i=0;i<3;i++)c.levels.push({classId:'class:jedi',hpRoll:5,feats:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});use(c,15);c.chargePath={squares:2};const r=rollCharge(c,derive(c,pack),pack,c.inventory[0].uid,evalExpr);assert.equal(r.charge.damageBonus,2);assert.equal(r.results[0].damage,20);spendAttackResources(c,r);assert(!c.selfPowerEffects);
  const h=hero();h.levels[0].feats.push({id:'feat:running-attack'});h.inventory[0]={...h.inventory[0],id:'equipment:blaster-pistol',shotsRemaining:20};use(h,15);h.runningAttack={mode:'normal',before:movementSegment({squares:1}),after:movementSegment({squares:1})};const run=rollRunningAttack(h,pack,h.inventory[0].uid,evalExpr);assert.equal(run.results[0].damage,16);spendAttackResources(h,run);assert(!h.selfPowerEffects);assert.equal(h.inventory[0].shotsRemaining,19);
  const a=hero();use(a,15);a.opportunity={opponent:'Guard',action:'Move',distance:1,provoked:true};const opportunity=rollOpportunity(a,pack,a.inventory[0].uid,evalExpr);assert.equal(opportunity.results[0].damage,16);spendAttackResources(a,opportunity);assert(!a.selfPowerEffects);assert.equal(a.opportunity.used.length,1);
 }finally{Math.random=random;}
});
test('Cleave retains its copied triggering bonus while Battle Strike damage dice apply only to the triggering attack',()=>{
 const random=Math.random;Math.random=()=>.5;
 try{const c=hero();c.levels[0].feats.push({id:'feat:power-attack'});for(let i=0;i<2;i++)c.levels.push({classId:'class:jedi',hpRoll:5,feats:i?[{id:'feat:cleave'}]:[],talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});use(c,15);const r=rollCombatRoutine({name:'Hit',steps:[{attackId:c.inventory[0].uid,count:1,attackMod:0,damageMod:0}]},derive(c,pack),pack,evalExpr);assert.equal(r.results[0].damage,17);spendAttackResources(c,r);c.followUp={...followUpState(c),opponent:'A',nextOpponent:'B',dropped:true,immediate:true,inReach:true};const extra=rollCleave(c,pack,evalExpr);assert.equal(extra.results[0].attackBonus,r.results[0].attackBonus);assert.equal(extra.results[0].damage,13);assert.equal(extra.battleStrikePrevious,undefined);spendAttackResources(c,extra);assert.equal(c.followUp.cleavesSpent,1);}finally{Math.random=random;}
});

test('starting an own action after combat reopens end-turn clocks without reviving an expired earlier use',()=>{
 const c=hero();use(c,15);const original=c.selfPowerEffects[0].id;endCurrentTurn(c,pack);endTrackedCombat(c);use(c,15);assert.equal(c.selfPowerEffects.length,2);endCurrentTurn(c,pack);assert.equal(c.selfPowerEffects.length,1);assert.notEqual(c.selfPowerEffects[0].id,original);
 const h=hero();use(h,15);endCurrentTurn(h,pack);endTrackedCombat(h);const random=Math.random;Math.random=()=>.5;try{takeAction(h,pack,'attack',{uid:h.inventory[0].uid,fp:'none'},evalExpr);assert(!h.selfPowerEffects);}finally{Math.random=random;}
});
