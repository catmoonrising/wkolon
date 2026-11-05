import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/force-point-dice-fixtures.cjs';
import * as api from '../src/rules.js';
import {takeAction,beginNextTurn,finishForceChoice} from '../src/action-engine.js';
import {forcePointDieFor,forcePointExpression,forcePointDamageIncrease} from '../src/force-point-dice.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api);
const roller=(value,log=[])=>e=>{log.push(e);return /^1d20/.test(e)?{value:15,d20:[10],display:'15'}:{value,display:String(value),d20:[]};};

test('records are Partial and the validator rejects other shapes',()=>{
 validatePack(pack);
 for(const id of ['feat:imperceptible-liar','feat:master-tracker','feat:nature-specialist','feat:sharp-senses','feat:gungan-weapon-master','feat:bowcaster-marksman','talent:skill-boon'])assert.equal([...pack.feats,...pack.talents].find(r=>r.id===id).automation,'partial');
 const bad=structuredClone(pack);bad.feats.find(r=>r.id==='feat:sharp-senses').effects[0].steps=1;assert.throws(()=>validatePack(bad),/Force Point die/);
});
test('species Feats step only their printed skill, two steps from d6',()=>{
 for(const [c,skill] of [[f.twilek('skill:persuasion'),'skill:deception'],[f.monCalamari(),'skill:perception'],[f.rodian(),'skill:survival'],[f.ithorian(),'skill:knowledge-life-sciences']]){
  const d=api.derive(c,pack);assert.equal(forcePointDieFor(d,{skill}),10,skill);assert.equal(forcePointDieFor(d,{skill:'skill:gather-information'}),6);assert.equal(forcePointDieFor(d),6);
 }
});
test('Strong in the Force starts at d8; steps stop at d12',()=>{
 const d=api.derive(f.strong(),pack);assert.equal(d.forcePointDie,8);assert.equal(forcePointDieFor(d,{skill:'skill:deception'}),12);assert.equal(forcePointDieFor(d,{skill:'skill:persuasion'}),10);assert.equal(forcePointDieFor(d,{skill:'skill:perception'}),10);assert.equal(forcePointDieFor(d),8);
 assert.equal(forcePointDieFor(api.derive(f.twilek('skill:deception'),pack),{skill:'skill:deception'}),12);
 assert.equal(forcePointDieFor(api.derive(f.strong('skill:deception'),pack),{skill:'skill:deception'}),12);
});
test('Skill Boon follows its selection and an untrained choice is an issue',()=>{
 const c=f.monCalamari('skill:deception');let d=api.derive(c,pack);assert.equal(forcePointDieFor(d,{skill:'skill:deception'}),8);assert.equal(forcePointDieFor(d,{skill:'skill:persuasion'}),6);
 c.levels[0].talent.choice='skill:mechanics';d=api.derive(c,pack);assert(d.issues.length>0);assert.equal(forcePointDieFor(d,{skill:'skill:mechanics'}),6);
 c.levels[0].talent=null;assert.deepEqual(api.derive(c,pack).forcePointCheckDice,{'skill:perception':10});
});
test('dice count is preserved: three dice at high Heroic Level keep the highest',()=>{
 const d={forcePointDice:3,forcePointDie:6,forcePointCheckDice:{'skill:deception':10}};
 assert.equal(forcePointExpression(d,{skill:'skill:deception'}),'3d10kh1');assert.equal(forcePointExpression(d),'3d6kh1');
});
test('the skill action spends one Force Point at the stepped die and rejects an unavailable skill',()=>{
 const c=f.twilek('skill:persuasion');beginNextTurn(c,pack);const fp=c.forcePoints,log=[];
 const r=takeAction(c,pack,'force-bonus',{skill:'skill:deception'},roller(9,log));assert.deepEqual(log,['1d10kh1']);assert.equal(c.forcePoints,fp-1);assert.match(r.text,/^Deception: Force Point: \+9$/);
 const q=f.twilek('skill:persuasion');beginNextTurn(q,pack);const before=structuredClone(q);assert.throws(()=>takeAction(q,pack,'force-bonus',{skill:'skill:nope'},roller(1)),/Skill unavailable/);assert.deepEqual(q,before);
 const plain=f.twilek('skill:persuasion');beginNextTurn(plain,pack);const plainLog=[];assert.match(takeAction(plain,pack,'force-bonus',{},roller(4,plainLog)).text,/^Force Point: \+4$/);assert.deepEqual(plainLog,['1d6kh1']);
});
const attack=(c,log,value,index=0)=>{beginNextTurn(c,pack);return takeAction(c,pack,'attack',{uid:c.inventory[index].uid,fp:'before'},roller(value,log));};
test('Gungan Weapon Master steps Atlatl and Cesta attacks only',()=>{
 for(const w of ['atlatl','cesta']){const c=f.gungan(w),log=[],fp=c.forcePoints;attack(c,log,5);assert.equal(log[0],'1d8kh1',w);assert.equal(c.forcePoints,fp-1);assert(c.actionState.forceSpent);}
 const c=f.gungan(),log=[];attack(c,log,5,1);assert.equal(log[0],'1d6kh1');
});
test('Bowcaster Marksman adds the amount to Bowcaster damage, and not to other weapons or attacks without the point',()=>{
 const c=f.wookiee(),log=[];attack(c,log,5);assert.equal(log[0],'1d6kh1');assert.match(log.find(e=>e.includes('d10')),/\+5$/);
 const other=f.wookiee(),otherLog=[];attack(other,otherLog,5,1);assert(!/\+5$/.test(otherLog.at(-1)));
 const none=f.wookiee(),noneLog=[];beginNextTurn(none,pack);takeAction(none,pack,'attack',{uid:none.inventory[0].uid},roller(5,noneLog));assert(!noneLog.some(e=>/kh1/.test(e)));assert(!/\+5$/.test(noneLog.at(-1)));
});
test('saved action options reload through validateCharacter',()=>{
 const c=f.twilek('skill:persuasion');beginNextTurn(c,pack);takeAction(c,pack,'force-bonus',{skill:'skill:deception'},roller(3));api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);
});
test('a replacement check uses the selected skill, without borrowing its native die feat',()=>{
 const c=f.forcePerception(),d=api.derive(c,pack);assert.deepEqual(d.issues,[]);
 assert.equal(forcePointDieFor(d,{skill:'skill:perception'}),6);
 const log=[];beginNextTurn(c,pack);takeAction(c,pack,'force-bonus',{skill:'skill:perception'},roller(4,log));assert.deepEqual(log,['1d6kh1']);
 c.skillCheckSources={'skill:perception':'skill:perception'};assert.equal(forcePointDieFor(api.derive(c,pack),{skill:'skill:perception'}),10);
 const replacement={...d,forcePointCheckDice:{'skill:perception':10,'skill:use-the-force':8}};assert.equal(forcePointDieFor(replacement,{skill:'skill:perception'}),8);
});
test('invalid Force Point rolls leave resources, planned actions and history unchanged',()=>{
 for(const value of [0,-1,1.5,NaN,Infinity,13])for(const action of ['force-bonus','attack']){
  const c=action==='attack'?f.wookiee():f.twilek('skill:persuasion');beginNextTurn(c,pack);const before=structuredClone(c),log=[];
  assert.throws(()=>takeAction(c,pack,action,action==='attack'?{uid:c.inventory[0].uid,fp:'before'}:{skill:'skill:deception'},roller(value,log)),/Invalid Force Point roll/);
  assert.deepEqual(c,before);assert.equal(log.length,1,'no attack or damage roll after an invalid point');
 }
});
test('context spending shares the once-per-round limit with other point uses',()=>{
 const c=f.twilek('skill:persuasion');beginNextTurn(c,pack);takeAction(c,pack,'force-bonus',{skill:'skill:deception'},roller(7));
 const before=structuredClone(c);let calls=0;assert.throws(()=>takeAction(c,pack,'force-bonus',{},()=>{calls++;throw Error('unexpected roll');}),/already spent/);assert.equal(calls,0);assert.deepEqual(c,before);
 beginNextTurn(c,pack);assert.doesNotThrow(()=>takeAction(c,pack,'force-bonus',{},roller(3)));
});
test('Bowcaster competence joins base and declared-target contributions before critical multiplication',()=>{
 const local=structuredClone(pack),armor=local.talents.find(r=>r.id==='talent:armored-defense');
 // Inject ordinary and target-conditioned typed contributions to exercise the
 // shared resolver independently of which future records provide them.
 armor.effects.push({target:'damage',amount:3,type:'competence'},{target:'targetDamage',against:'darkSide',amount:7,type:'competence'});
 const c=f.wookiee();c.attackTarget={darkSide:true};const d=api.derive(c,local),a=d.attacks.find(a=>a.uid===c.inventory[0].uid);
 assert.equal(forcePointDamageIncrease(d,a,5),0);assert.equal(forcePointDamageIncrease(d,a,9),2);
 c.attackTarget.darkSide=false;const plain=api.derive(c,local),b=plain.attacks.find(a=>a.uid===c.inventory[0].uid);assert.equal(forcePointDamageIncrease(plain,b,5),2);
 beginNextTurn(c,local);const expressions=[];
 takeAction(c,local,'attack',{uid:c.inventory[0].uid,fp:'before'},expr=>{expressions.push(expr);return expr.includes('1d20')?{value:30,d20:[20],display:'20'}:{value:5,d20:[],display:'5'};});
 assert.equal(expressions[0],'1d6kh1');assert.match(expressions.at(-1),/\+2\)\*2$/);
 assert.equal(c.forcePoints,f.wookiee().forcePoints-1);assert(c.actionState.forceSpent);api.validateCharacter(c,local);
});

test('the pack validator rejects mismatched skill, weapon, step and bonus type',()=>{
 for(const [id,change] of [['feat:sharp-senses',e=>e.skill='skill:survival'],['feat:gungan-weapon-master',e=>e.steps=20],['feat:gungan-weapon-master',e=>e.weapons=['equipment:bowcaster']],['feat:bowcaster-marksman',e=>e.type='untyped']]){const bad=structuredClone(pack);change(bad.feats.find(r=>r.id===id).effects[0]);assert.throws(()=>validatePack(bad),/must match its source/);}
});

test('Skill Boon applies to pending Force power and Force Focus checks without spending twice',()=>{
 for(const action of ['power','force-focus']){
  const c=f.boonJedi();if(action==='force-focus')c.levels[0].forcePowers[0].spent=true;beginNextTurn(c,pack);
  const logs=[],roll=expr=>{logs.push(expr);const m=/^1d20([+-]\d+)?$/.exec(expr);return m?{value:10+Number(m[1]||0),d20:[10],display:'10'}:{value:7,d20:[],display:'7'};};
  const fp=c.forcePoints;takeAction(c,pack,action,{powerId:c.levels[0].forcePowers[0].id,fp:'ask',enhance:false},roll);const step=c.actionState.plan.find(s=>s.status==='waiting');assert(step);assert.equal(c.forcePoints,fp);
  finishForceChoice(c,pack,step.id,true,roll);assert.equal(logs.at(-1),'1d8kh1');assert.equal(c.forcePoints,fp-1);assert(c.actionState.forceSpent);assert.equal(c.actionState.plan.find(s=>s.id===step.id).status,'done');
  const before=structuredClone(c);assert.throws(()=>finishForceChoice(c,pack,step.id,true,roll),/No pending check/);assert.deepEqual(c,before);api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 }
});
