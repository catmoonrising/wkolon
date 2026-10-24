import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,previewPlan,beginNextTurn,endCurrentTurn,endTrackedCombat} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {newEncounter} from '../src/recovery.js';
import {removeDefenseShift} from '../src/defense-shifts.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=(cls,talent=null,extra={})=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});
function officer(ranks=2){
 const c=newCharacter(pack,{classId:'class:noble'});c.abilityMethod='manual';c.abilities={str:10,dex:14,con:12,int:14,wis:12,cha:14};c.trainedSkills=['skill:knowledge-tactics','skill:persuasion','skill:perception','skill:deception','skill:use-computer','skill:knowledge-galactic-lore'];c.levels[0].talent={id:'talent:born-leader'};
 for(let n=2;n<=7;n++)c.levels.push(row('noble'));
 const cls=pack.classes.find(r=>r.id==='class:officer'),entryDeclarations=Object.fromEntries((cls.entrySpecials||[]).map(s=>[s.id,true]));
 c.levels.push(row('officer',ranks>=1?'shift-defense-i':null,{entryDeclarations}),row('officer'),row('officer',ranks>=2?'shift-defense-ii':null));
 if(ranks>=3)c.levels.push(row('officer'),row('officer','shift-defense-iii'));
 c.forcePoints=5;validateCharacter(c,pack);return c;
}
const noRoll=()=>{throw Error('Should not roll');};
const shift=(c,id,bonus,penalty)=>takeAction(c,pack,id,{bonus,penalty},noRoll);
test('Shift Defense metadata pins I/II/III amounts and the III ruling options',()=>{
 validatePack(pack);for(const change of [p=>p.rules.defenseShiftActions[0].bonus=2,p=>p.rules.defenseShiftActions[1].penalty=-2,p=>p.rules.defenseShiftActions[0].type='dodge',p=>{delete p.rules.defenseShiftActions[2].penaltyScope;},p=>{p.rules.ambiguities.find(a=>a.id==='ambiguity:shift-defense-iii-duration').options.pop();}]){const p=structuredClone(pack);change(p);assert.throws(()=>validatePack(p));}
 const d=derive(officer(),pack);for(const id of ['shift-defense-i','shift-defense-ii'])assert(d.ctx.talents.some(t=>t.id==='talent:'+id)&&!d.ctx.inactiveTalents.has('talent:'+id),id);
});
test('Shift Defense I trades -2 for a +1 competence bonus with one Swift Action until the next turn',()=>{
 const c=officer(),d0=derive(c,pack),fp=c.forcePoints;const r=shift(c,'shift-defense-i','reflex','will');
 assert.equal(r.text,'Shift Defense I: Reflex +1, Will -2');assert.deepEqual(c.actionState.spent,['swift']);assert.equal(c.forcePoints,fp);
 let d=derive(c,pack);assert.equal(d.defenses.reflex,d0.defenses.reflex+1);assert.equal(d.defenses.will,d0.defenses.will-2);assert.equal(d.defenses.fortitude,d0.defenses.fortitude);
 assert.match(renderStatBlock(c,d,pack),/Reflex \+1, Will -2/);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 endCurrentTurn(c,pack);assert.equal(derive(c,pack).defenses.reflex,d0.defenses.reflex+1);beginNextTurn(c,pack);d=derive(c,pack);assert.equal(d.defenses.reflex,d0.defenses.reflex);assert.equal(c.defenseShifts,undefined);
});
test('separate shifts coexist: competence bonuses take the highest, penalties add, and threshold follows Fortitude',()=>{
 const c=officer(),d0=derive(c,pack);shift(c,'shift-defense-i','reflex','fortitude');shift(c,'shift-defense-ii','reflex','will');shift(c,'shift-defense-i','will','fortitude');
 const d=derive(c,pack);assert.equal(d.defenses.reflex,d0.defenses.reflex+2);assert.equal(d.defenses.fortitude,d0.defenses.fortitude-4);assert.equal(d.defenses.will,d0.defenses.will-5+1);assert.equal(d.threshold,d0.threshold-4);
 assert.throws(()=>shift(c,'shift-defense-i','reflex','fortitude'),/Already active/);
});
test('Shift Defense preflight, previews, ownership loss, resets and saved rows are strict',()=>{
 const c=officer();let before=structuredClone(c);assert.throws(()=>shift(c,'shift-defense-i','reflex','reflex'),/two different Defenses/);assert.throws(()=>shift(c,'shift-defense-i','reflex','speed'),/two different Defenses/);assert.deepEqual(c,before);
 const one=officer(1);assert.throws(()=>shift(one,'shift-defense-ii','reflex','will'),/Talent unavailable/);
 const h=officer();h.helpless=true;before=structuredClone(h);assert.throws(()=>shift(h,'shift-defense-i','reflex','will'),/helpless/);assert.deepEqual(h,before);
 beginNextTurn(c,pack);const s=queueAction(c,'shift-defense-ii',{bonus:'will',penalty:'reflex'});before=structuredClone(c);assert(!previewPlan(c,pack).find(r=>r.id===s.id).issue);assert.deepEqual(c,before);
 const q=officer(),base=derive(q,pack).defenses.will;shift(q,'shift-defense-ii','reflex','will');q.levels[9].talent=null;assert.equal(derive(q,pack).defenses.will,base);
 for(const reset of [x=>endTrackedCombat(x),x=>newEncounter(x)]){const x=officer();shift(x,'shift-defense-i','reflex','will');reset(x);assert.equal(x.defenseShifts,undefined);}
 for(const rows of [null,[{id:'shift-defense-iii',bonus:'reflex',penalty:'will'}],[{id:'shift-defense-i',bonus:'reflex',penalty:'reflex'}],[{id:'shift-defense-i',bonus:'reflex'}],[{id:'shift-defense-i',bonus:'reflex',penalty:'will'},{id:'shift-defense-i',bonus:'reflex',penalty:'will'}]])assert.throws(()=>validateCharacter({...c,defenseShifts:rows},pack),/defense shifts/);
});

test('Shift Defense III: +5 competence to one Defense and -5 to both others until the next turn by default',()=>{
 const c=officer(3),d0=derive(c,pack);assert(d0.ctx.talents.some(t=>t.id==='talent:shift-defense-iii')&&!d0.ctx.inactiveTalents.has('talent:shift-defense-iii'));
 const r=shift(c,'shift-defense-iii','will','reflex');assert.equal(r.text,'Shift Defense III: Will +5, Reflex -5, Fortitude -5');assert.deepEqual(c.defenseShifts,[{id:'shift-defense-iii',bonus:'will',penalty:null}]);
 const d=derive(c,pack);assert.equal(d.defenses.will,d0.defenses.will+5);assert.equal(d.defenses.reflex,d0.defenses.reflex-5);assert.equal(d.defenses.fortitude,d0.defenses.fortitude-5);
 assert.throws(()=>shift(c,'shift-defense-iii','will','fortitude'),/Already active/);beginNextTurn(c,pack);assert.equal(c.defenseShifts,undefined);
 assert.equal(pack.talents.find(t=>t.id==='talent:shift-defense-iii').automation,'partial');
});
test('Shift Defense III no-automatic-expiry alternative survives resets until removed; existing rows keep their snapshot',()=>{
 const c=officer(3),d0=derive(c,pack);c.houseRules={ambiguities:{'ambiguity:shift-defense-iii-duration':'permanent'}};validateCharacter(c,pack);
 const r=takeAction(c,pack,'shift-defense-iii',{bonus:'reflex'},noRoll);assert.match(r.text,/no automatic expiry/);assert.deepEqual(c.defenseShifts,[{id:'shift-defense-iii',bonus:'reflex',penalty:null,persistent:true}]);shift(c,'shift-defense-i','will','fortitude');
 beginNextTurn(c,pack);assert.deepEqual(c.defenseShifts.map(s=>s.id),['shift-defense-iii']);for(const reset of [x=>endTrackedCombat(x),x=>newEncounter(x)])reset(c);assert.equal(derive(c,pack).defenses.reflex,d0.defenses.reflex+5);
 validateCharacter(JSON.parse(JSON.stringify(c)),pack);c.houseRules={};assert.equal(c.defenseShifts[0].persistent,true,'setting change does not rewrite');
 removeDefenseShift(c,0);assert.equal(c.defenseShifts,undefined);assert.equal(derive(c,pack).defenses.reflex,d0.defenses.reflex);
 for(const rows of [[{id:'shift-defense-iii',bonus:'reflex',penalty:'will'}],[{id:'shift-defense-i',bonus:'reflex',penalty:'will',persistent:true}],[{id:'shift-defense-iii',bonus:'reflex',penalty:null,persistent:false}]])assert.throws(()=>validateCharacter({...c,defenseShifts:rows},pack),/defense shifts/);
});
