import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import make from '../tools/repulse-fixtures.cjs';
import {repulsePowerSnapshot,resolveRepulse,savedRepulseResult,repulseSelection,newRepulseTarget} from '../src/repulse.js';
import {takeAction,executeAction,finishForceChoice,previewPlan,beginNextTurn,endCurrentTurn} from '../src/action-engine.js';
import {queueAction,archivePlan} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';

const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),id='power:repulse',f=make(pack,api),target=(x={})=>({...newRepulseTarget(),strengthCheck:10,...x}),snapshot=targets=>repulsePowerSnapshot(pack,{targets}),copy=c=>api.derive(c,pack).forcePowers.find(p=>p.id===id&&!p.spent).copyId;
const options=(c,targets=[target()])=>({powerId:copy(c),action:'standard-action',fp:'none',enhance:true,repulse:{targets}});
const roller=(calls=[],natural=20)=>e=>{calls.push(e);return e.startsWith('1d20')?{value:natural+16,d20:[natural],display:e}:{value:e==='3d6'?12:4,display:e};};

test('Repulse19561 has its own closed scope, complete real features and no Force Thrust range/door',()=>{
 validatePack(pack);assert.equal(pack.sources.find(s=>s.id==='source:wiki-repulse').revision,19561);const rule=pack.rules.displacementPowers.find(r=>r.powerId===id);assert.equal(rule.targetScope,'all-adjacent');assert.equal(rule.range,undefined);assert.equal(rule.rangeTechnique,undefined);assert.equal(rule.door,undefined);
 const bad=structuredClone(pack);bad.rules.displacementPowers.find(r=>r.powerId===id).comparison='at-least';assert.throws(()=>validatePack(bad));
 for(const mastery of [false,true]){const d=api.derive(f.adept({mastery}),pack),p=d.forcePowers.find(p=>p.id===id);assert.deepEqual(d.issues,[]);assert(p.adept);assert.equal(!!p.take10,mastery);}
});

test('all sizes, stability, strict ties and every five-point margin share one check with no invented natural rule',()=>{
 const sizes={fine:-20,diminutive:-15,tiny:-10,small:-5,medium:0,large:5,huge:10,gargantuan:15,colossal:20};
 for(const [size,bonus]of Object.entries(sizes))for(const stable of [false,true])for(const enhanced of [false,true])for(const margin of [-1,0,1,4,5,6,9,10])for(const natural of [1,20]){
  const opposed=10+3+bonus+(stable?5:0)-(enhanced?5:0),x=resolveRepulse(pack,{total:opposed+margin,natural},snapshot([target({baseAttack:3,size,stable})]),{enhanced,roller:()=>assert.fail('No collision RNG')}).targets[0];assert.equal(x.opposed,opposed);assert.equal(x.margin,margin);assert.equal(x.pushed,margin>0?1+Math.floor(margin/5):0);assert.equal(x.damage,0);
 }
});

test('mixed targets get separate collision rolls only after a successful push reaches the declared larger object',()=>{
 const s=snapshot([target({name:'Ally',collisionAt:2}),target({name:'Enemy',strengthCheck:20,collisionAt:1}),target({name:'Other',collisionAt:10}),target({name:'Stable',strengthCheck:15,stable:true,collisionAt:1})]),calls=[];
 let r=resolveRepulse(pack,{total:20},s,{roller:roller(calls)});assert.deepEqual(calls,['1d6']);assert.deepEqual(r.targets.map(t=>[t.pushed,t.damage]),[[3,4],[0,0],[3,0],[0,0]]);assert.equal(r.damageType,'unspecified');assert(!r.html.includes('Evasion'));
 calls.length=0;r=resolveRepulse(pack,{total:20},s,{enhanced:true,roller:roller(calls)});assert.deepEqual(calls,['3d6','3d6','3d6']);assert.deepEqual(r.targets.map(t=>[t.pushed,t.damage]),[[4,12],[2,12],[4,0],[2,12]]);assert.equal(r.targets[0].name,'Ally');
});

test('queue/preview/save retain the original targets and check, special FP resolves every collision once',()=>{
 const c=f.adept(),initial=structuredClone(c),calls=[],step=queueAction(c,'power',options(c,[target({name:'<Mara>',collisionAt:1}),target({name:'<Mara>',strengthCheck:42,collisionAt:1})])),queued=structuredClone(c);previewPlan(c,pack);assert.deepEqual(c,queued);executeAction(c,pack,step.id,roller(calls));assert.deepEqual(calls,['1d20+16']);assert.equal(c.actionState.plan[0].options.repulsePowerResolution,undefined);
 const q=JSON.parse(JSON.stringify(c)),check=structuredClone(q.actionState.plan[0].result.check);q.actionState.plan[0].options.repulse.targets[0].strengthCheck=99;const r=finishForceChoice(q,pack,step.id,'enhance',roller(calls));assert.deepEqual(calls,['1d20+16','3d6']);assert.equal(q.forcePoints,initial.forcePoints-1);assert.deepEqual(q.actionState.spent,['standard']);assert.deepEqual(q.actionState.plan[0].result.check,check);assert.deepEqual(q.actionState.plan[0].options.repulsePowerResolution.damage,[12,0]);assert.match(r.html,/&lt;Mara&gt;/);assert(!r.html.includes('<Mara>'));assert.deepEqual(q.inventory,initial.inventory);assert.equal(q.currentHP,initial.currentHP);assert.equal(q.condition,initial.condition);api.validateCharacter(q,pack);
 const done=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,step.id,'enhance',()=>assert.fail('No replay')));assert.deepEqual(q,done);const result=savedRepulseResult(q.actionState.plan[0],pack);assert.equal(result.targets[0].damage,12);assert.equal(result.targets[1].damage,0);
});

test('ordinary FP boosts the one original check for all targets without special collision dice',()=>{
 const c=f.adept(),fp=c.forcePoints,calls=[];takeAction(c,pack,'power',{...options(c,[target({strengthCheck:36,collisionAt:1}),target({strengthCheck:37})]),fp:'ask'},roller(calls));const step=c.actionState.plan[0],r=finishForceChoice(c,pack,step.id,true,e=>{calls.push(e);return {value:e==='1d6'?4:2,display:e};});assert.equal(c.forcePoints,fp-1);assert.equal(step.result.check.total,36);assert.equal(c.actionState.plan[0].result.check.total,38);assert.equal(c.actionState.plan[0].options.repulsePowerResolution.enhanced,false);assert.deepEqual(c.actionState.plan[0].options.repulsePowerResolution.damage,[4,0]);assert.match(r.text,/2 pushed/);assert.equal(calls.at(-1),'1d6');
});

test('invalid Nth collision roll rolls back the full character, FP ledger and saved result',()=>{
 const c=f.adept();takeAction(c,pack,'power',options(c,[target({collisionAt:1}),target({collisionAt:1})]),roller());const before=structuredClone(c);let calls=0;assert.throws(()=>finishForceChoice(c,pack,c.actionState.plan[0].id,'enhance',()=>({value:++calls===1?12:19,display:'3d6'})),/collision roll/);assert.equal(calls,2);assert.deepEqual(c,before);
});

test('100 duplicate long names and collision results remain complete in saved plan and archived history without RNG',()=>{
 const c=f.adept(),name='<Mara>'+('x'.repeat(94)),targets=Array.from({length:100},()=>target({name,collisionAt:1})),calls=[];takeAction(c,pack,'power',{...options(c,targets),enhance:false},roller(calls));assert.equal(calls.length,101);assert.equal(c.actionState.plan[0].result.text.length<2000,true);const q=JSON.parse(JSON.stringify(c));api.validateCharacter(q,pack);const original=savedRepulseResult(q.actionState.plan[0],pack);assert.equal(original.targets.length,100);assert.equal((original.html.match(/<tr>/g)||[]).length,101);assert.equal(original.resolution.damage.length,100);assert.equal(original.resolution.damage.at(-1),4);archivePlan(q);api.validateCharacter(q,pack);assert.deepEqual(savedRepulseResult(q.actionState.history.at(-1),pack),original);assert.equal(calls.length,101);
});

test('Mastery/Adept/suite recovery share normal budgets; Extended Force Thrust adds no range or Door option',()=>{
 const c=f.adept({mastery:true}),fp=c.forcePoints;beginNextTurn(c,pack);takeAction(c,pack,'power',{...options(c),rollMode:'take10',enhance:false},()=>assert.fail('Mastery does not roll'));assert.equal(c.actionState.plan[0].result.check.natural,10);assert(!c.forcePowerRecoveryPending);beginNextTurn(c,pack);const before=structuredClone(c);assert.throws(()=>takeAction(c,pack,'power',{...options(c),rollMode:'adept'},roller()),/Only one Force Point/);assert.deepEqual(c,before);
 const calls=[];takeAction(c,pack,'power',{...options(c),rollMode:'adept',enhance:false},roller(calls));assert.equal(calls.length,2);assert.equal(c.forcePoints,fp-1);assert(c.forcePowerRecoveryPending);endCurrentTurn(c,pack);assert(c.levels.flatMap(l=>l.forcePowers||[]).every(p=>!p.spent));
 const extended=f.adept({extended:true});assert.deepEqual(api.derive(extended,pack).issues,[]);assert.throws(()=>takeAction(extended,pack,'power',{...options(extended),thrust:{mode:'door',distance:18,lineOfSight:true,breakDC:1}},()=>assert.fail('No inherited Thrust')));
});

test('zero targets, all invalid declarations and saved result/snapshot corruption respect shared validation',()=>{
 const c=f.adept();takeAction(c,pack,'power',{...options(c,[]),enhance:false},roller());assert.deepEqual(c.actionState.plan[0].options.repulsePowerResolution.damage,[]);api.validateCharacter(c,pack);
 for(const value of [null,{},[],{targets:[{...target(),size:['medium']}]},{targets:[{...target(),stable:1}]},{targets:[{...target(),name:null}]},{targets:[{...target(),collisionAt:0}]},{targets:[{...target(),strengthCheck:0.1}]},{targets:[{...target(),extra:1}]},{targets:Array.from({length:101},()=>target())}]){const q=f.adept(),before=structuredClone(q);assert.throws(()=>takeAction(q,pack,'power',{...options(q),repulse:value},()=>assert.fail('Before RNG')));assert.deepEqual(q,before);}
 const q=f.adept();takeAction(q,pack,'power',{...options(q,[target({collisionAt:1})]),enhance:false},roller());
 for(const change of [s=>delete s.options.repulsePowerResolution,s=>s.options.repulsePowerResolution.damage.push(4),s=>s.options.repulsePowerResolution.damage[0]=7,s=>s.options.repulsePowerSnapshot.targets[0].strengthCheck=99,s=>s.options.repulsePowerSnapshot.extra=true,s=>s.options.repulsePowerSnapshot.targets[0].name=' spaced ']){const bad=structuredClone(q);change(bad.actionState.plan[0]);assert.throws(()=>api.validateCharacter(bad,pack));}
 const waiting=f.adept();takeAction(waiting,pack,'power',options(waiting),roller());waiting.actionState.plan[0].options.repulsePowerResolution={powerId:id,enhanced:false,damage:[0]};assert.throws(()=>api.validateCharacter(waiting,pack));
});

test('legacy manual history and source loss never apply new pushes or damage',()=>{
 const c=f.adept();takeAction(c,pack,'power',options(c),roller());const s=c.actionState.plan[0];delete s.options.effectPowerId;delete s.options.repulsePowerSnapshot;delete s.options.repulse;api.validateCharacter(c,pack);const r=finishForceChoice(c,pack,s.id,'enhance',()=>assert.fail('Legacy no collision'));assert.match(r.text,/enhancement manual/);assert.equal(c.actionState.plan[0].options.repulsePowerResolution,undefined);api.validateCharacter(c,pack);
 const q=f.adept();takeAction(q,pack,'power',options(q),roller());for(const l of q.levels)l.forcePowers=(l.forcePowers||[]).filter(p=>p.powerId!==id);const before=structuredClone(q);assert.throws(()=>finishForceChoice(q,pack,q.actionState.plan[0].id,'enhance',()=>assert.fail('No source RNG')));assert.deepEqual(q,before);
});
