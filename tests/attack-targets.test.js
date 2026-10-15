import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {attackTarget,targetConcealment} from '../src/attack-targets.js';
import {createHouseRules,ambiguityValue} from '../src/house-rules.js';
import {rollCombatRoutine,rollRoutine} from '../src/combat.js';
import {spendAttackResources} from '../src/ammunition.js';
import {renderStatBlock} from '../src/stat-block.js';
import {articleText} from '../src/wiki-content.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),ambiguity='ambiguity:prone-helpless';
function hero(){
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:10,int:14,wis:10,cha:10};c.levels[0].classId='class:soldier';
 c.inventory=['knife','blaster-pistol'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0,...(id==='blaster-pistol'?{shotsRemaining:20}:{})}));return c;
}
const routine=(c,indices=[0])=>({name:'Test',steps:indices.map(i=>({attackId:c.inventory[i].uid,count:1,attackMod:0,damageMod:0}))});
const roller=(natural=12,calls=[])=>expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?natural+Number(m[1]):12,d20:m?[natural]:[],display:expr,coeffs:[1]};};
const noDice=()=>assert.fail('No dice before validation');

test('Prone and Helpless stack to +10 by default, with the approved +5 alternative saved per character',()=>{
 const c=hero(),before=derive(c,pack);c.attackTarget={prone:true,helpless:true};let d=derive(c,pack);
 assert.equal(d.attacks[0].attack,before.attacks[0].attack+10);assert.equal(d.attacks[1].attack,before.attacks[1].attack-5);
 const ui=createHouseRules(pack);ui.setTab('ambiguities');assert(ui.render(c).includes('Do not stack (+5 melee)'));
 assert.equal(ambiguityValue(c,pack,ambiguity),'stack');assert(ui.change({hasAttribute:k=>k==='data-ambiguity',dataset:{ambiguity},value:'no-stack'},c));
 d=derive(c,pack);assert.equal(d.attacks[0].attack,before.attacks[0].attack+5);assert.equal(d.attacks[1].attack,before.attacks[1].attack-5);
 const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(derive(saved,pack).attacks[0].attack,d.attacks[0].attack);
 c.attackTarget.prone=false;assert.equal(derive(c,pack).attacks[0].attack,before.attacks[0].attack+5);
 c.attackTarget.helpless=false;c.attackTarget.prone=true;assert.equal(derive(c,pack).attacks[0].attack,before.attacks[0].attack+5);
 assert.equal(ambiguityValue(hero(),pack,ambiguity),'stack');
});
test('own Prone penalizes melee independently; knockdown immunity never removes voluntary prone penalties',()=>{
 const c=hero(),before=derive(c,pack);c.prone=true;let d=derive(c,pack);
 assert.equal(d.attacks[0].attack,before.attacks[0].attack-5);assert.equal(d.attacks[1].attack,before.attacks[1].attack);
 c.attackTarget={prone:true,helpless:true};assert.equal(derive(c,pack).attacks[0].attack,before.attacks[0].attack+5);
 c.species='species:hutt';const standing=derive({...c,prone:false},pack);assert.equal(derive(c,pack).attacks[0].attack,standing.attacks[0].attack-5);assert.equal(derive(c,pack).attacks[1].attack,standing.attacks[1].attack);
});
test('attacking into melee penalizes ranged and thrown attacks; only an eligible Precise Shot removes it',()=>{
 const c=hero(),before=derive(c,pack);c.attackTarget={adjacentToAlly:true};assert.equal(derive(c,pack).attacks[1].attack,before.attacks[1].attack-5);assert.equal(derive(c,pack).attacks[0].attack,before.attacks[0].attack);
 c.inventory[0].attackStyle='thrown';let d=derive(c,pack);assert.equal(d.attacks[0].mode,'ranged');const penalty=d.attacks[0].attack;
 c.levels[0].feats=[{id:'feat:precise-shot'}];assert.equal(derive(c,pack).attacks[0].attack,penalty,'inactive feat cannot remove the penalty');
 c.levels[0].feats=[{id:'feat:point-blank-shot'},{id:'feat:precise-shot'}];d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:precise-shot'));c.attackTarget.adjacentToAlly=false;assert.equal(d.attacks[0].attack,derive(c,pack).attacks[0].attack);
});
test('vision ignores darkness but not smoke; low-light and scopes never ignore Total Concealment',()=>{
 const c=hero(),before=derive(c,pack);c.attackTarget={concealment:'concealment',darkness:true};assert.equal(derive(c,pack).attacks[1].attack,before.attacks[1].attack-2);
 c.species='species:gungan';const clean=derive({...c,attackTarget:undefined},pack);assert.equal(derive(c,pack).attacks[1].attack,clean.attacks[1].attack);
 c.attackTarget.darkness=false;assert.equal(derive(c,pack).attacks[1].attack,clean.attacks[1].attack-2);
 c.attackTarget={concealment:'total',darkness:true};assert.equal(derive(c,pack).attacks[1].available,false);
 c.attackTarget.attackSquare=true;assert.equal(derive(c,pack).attacks[1].attack,clean.attacks[1].attack-5);
 c.species='species:sullustan';c.attackTarget.attackSquare=false;assert.equal(derive(c,pack).attacks[1].available,true);
 c.attackTarget.darkness=false;assert.equal(derive(c,pack).attacks[1].available,false);
 assert.equal(targetConcealment({concealment:'total',darkness:true},undefined,true),'total');
});
test('Total Cover and concealed direct targets reject an entire routine before dice or ammunition changes',()=>{
 const c=hero();c.attackTarget={cover:'total'};const r=routine(c,[0,1]);assert.throws(()=>rollCombatRoutine(r,derive(c,pack),pack,noDice),/Total Cover/);assert.equal(c.inventory[1].shotsRemaining,20);
 c.inventory[1].aimed=true;assert.equal(derive(c,pack).attacks[1].aimed,false);
 c.attackTarget={concealment:'total',darkness:true};let d=derive(c,pack);assert.equal(d.attacks[1].canAimTarget,false);assert.throws(()=>rollCombatRoutine(r,d,pack,noDice),/Attack square/);
 c.attackTarget.attackSquare=true;d=derive(c,pack);assert.equal(d.attacks[1].available,true);assert.equal(d.attacks[1].aimed,false);const result=rollCombatRoutine(r,d,pack,roller());spendAttackResources(c,result,pack);assert.equal(c.inventory[1].shotsRemaining,19);
});
test('cover changes Reflex thresholds rather than the attack roll; Aim ignores it only for the first attack',()=>{
 const c=hero(),uid=c.inventory[1].uid,base=derive(c,pack).attacks[1];c.inventory[1].aimed=true;c.attackTarget={cover:'improved'};const d=derive(c,pack),a=d.attacks[1];
 assert.equal(a.attack,base.attack);assert.equal(a.coverBonus,0);assert.equal(a.unAimed.coverBonus,10);
 const result=rollCombatRoutine(routine(c,[1,1]),d,pack,roller(12));assert.equal(result.results[0].total,result.results[1].total);assert.deepEqual(result.results.map(r=>r.coverBonus),[0,10]);
 assert.equal(result.rows[0].lo,base.attack+13);assert.equal(result.rows[1].damage,12);assert.equal(result.rows[2].damage,24);assert(result.html.includes('Reflex (before cover)'));
 spendAttackResources(c,result,pack);assert.equal(c.inventory[1].aimed,false);assert.equal(c.inventory[1].shotsRemaining,18);assert.equal(derive(c,pack).attacks.find(a=>a.uid===uid).coverBonus,10);
 const natural=rollCombatRoutine(routine(c,[1]),derive(c,pack),pack,roller(20));assert(natural.results[0].naturalHit);assert.equal(natural.rows.length,1);assert(natural.rows[0].damage>0);
});
test('area minimum 10 uses the actual roll; cover removes miss damage, and area attacks cannot Aim',()=>{
 const c=hero();c.inventory[1]={...c.inventory[1],id:'equipment:blaster-rifle',fireMode:'autofire',shotsRemaining:30,aimed:true};c.attackTarget={cover:'cover'};
 const d=derive(c,pack),a=d.attacks[1];assert(a.areaType);assert.equal(a.aimed,false);assert.equal(a.coverBonus,5);
 const result=rollCombatRoutine(routine(c,[1]),d,pack,roller(10-a.attack));assert.equal(result.results[0].total,10);assert.equal(result.results[0].failedArea,false);assert.equal(result.rows[0].damage,0);assert.equal(result.rows.at(-1).damage,12);assert.equal(result.rows.at(-1).hi,5);
 const failed=rollCombatRoutine(routine(c,[1]),d,pack,roller(9-a.attack));assert(failed.results[0].failedArea);assert(failed.rows.every(r=>r.damage===0));
 c.attackTarget.cover='none';const open=rollCombatRoutine(routine(c,[1]),derive(c,pack),pack,roller(12));assert.equal(open.rows[0].damage,6);
});
test('losing Aim restores scope darkness and range penalties in the same routine; expiring Brace remains additive',()=>{
 const c=hero();c.inventory.push({id:'equipment:targeting-scope-low-light',uid:crypto.randomUUID(),quantity:1,equipped:false,twoHanded:false,attackMod:0,damageMod:0});c.inventory[1].scopeUid=c.inventory[2].uid;c.inventory[1].aimed=true;c.inventory[1].distance=60;c.attackTarget={cover:'cover',concealment:'concealment',darkness:true};
 const d=derive(c,pack),a=d.attacks[1];assert(a.ignoresDarkness);assert.equal(a.targetModifiers.penalty,0);assert(a.unAimed.attack<=a.attack-2);
 const result=rollCombatRoutine(routine(c,[1,1]),d,pack,roller());assert.equal(result.results[1].total-result.results[0].total,a.unAimed.attack-a.attack);assert.deepEqual(result.results.map(r=>r.coverBonus),[0,5]);
 c.attackTarget.concealment='total';c.attackTarget.attackSquare=true;const concealed=derive(c,pack).attacks[1];assert.equal(concealed.aimed,false);const unAimed=derive({...c,inventory:c.inventory.map(e=>({...e,aimed:false}))},pack).attacks[1];assert.equal(concealed.range.penalty,unAimed.range.penalty,'lost line of sight cannot retain the scope range benefit');
 const combined={uid:c.id,name:'Combined',available:true,attack:10,damageDisplay:'1d6',aimed:true,braced:true,coverBonus:0,targetCover:true,unAimed:{attack:7,aimed:false,coverBonus:5},unBraced:{attack:8,braced:false}};
 const two=rollRoutine({steps:[{attackId:c.id,count:2,attackMod:0,damageMod:0}]},[combined],pack.rules.combat,roller());assert.equal(two.results[1].total,17);assert.equal(two.results[1].coverBonus,5);
});
test('target contexts survive save validation but do not alter the general printed stat block',()=>{
 const c=hero(),before=renderStatBlock(c,derive(c,pack),pack);c.attackTarget={...attackTarget(c),cover:'improved',prone:true,helpless:true,adjacentToAlly:true};
 assert.equal(renderStatBlock(c,derive(c,pack),pack),before);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 for(const invalid of [{cover:'invented'},{prone:1},{concealment:'partial'},{attackSquare:'yes'},{coverBonus:999},null,[]]){const bad={...c,attackTarget:invalid};assert.throws(()=>validateCharacter(bad,pack),/attack target|target cover|target concealment/);}
 const bad={...c,prone:1};assert.throws(()=>validateCharacter(bad,pack),/prone state/);
});
test('target mechanics and the ambiguity retain exact pinned passages and reject invented calculations',()=>{
 validatePack(pack);const r=pack.rules.ambiguities.find(r=>r.id===ambiguity);assert.equal(r.default,'stack');assert.equal(r.passages.length,3);
 const text=id=>articleText(pack.rulePages.find(r=>r.id===id).article);assert(text('rule:helpless').includes('equivalent to attacking a Prone target'));assert(text('rule:bonuses-and-penalties').includes('including bonuses without a descriptor'));assert(text('rule:prone').includes('A Prone character takes a -5 penalty'));
 const invalid=structuredClone(pack);invalid.rules.attackTargets.coverBonus=4;assert.throws(()=>validatePack(invalid),/Invalid target modifiers/);
 const unpinned=structuredClone(pack);unpinned.rules.attackTargets.sourceIds=[];assert.throws(()=>validatePack(unpinned),/Invalid target sources/);
});
