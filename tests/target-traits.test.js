import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {rollRoutine} from '../src/combat.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const core=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
// Tree access is covered elsewhere; these reviewed talents sit in a Soldier tree here.
const pack=structuredClone(core);for(const id of ['dark-scourge','dark-side-scourge','inquisition','jedi-hunter']){const t=pack.talents.find(t=>t.id==='talent:'+id);t.tree='tree:weapon-specialist';t.prerequisite={kind:'all',requirements:[]};delete t.requiresDarkSide;}
const pick=t=>({id:'talent:'+t,...(pack.talents.find(r=>r.id==='talent:'+t).manualPrerequisites?{manualRequirements:true}:{})});
const row=t=>({classId:'class:soldier',hpRoll:5,feats:[],talent:t?pick(t):null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
function hero(talents,cha=14){
 const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:10,cha};c.levels[0].talent=talents[0]?pick(talents[0]):null;
 for(let n=2;n<=2*talents.length-1;n++)c.levels.push(row(n%2?talents[(n-1)/2]:null));
 c.inventory=['vibroblade','blaster-pistol','frag-grenade'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));validateCharacter(c,pack);return c;
}
const at=(c,id,target={})=>{const q=structuredClone(c);q.attackTarget=target;validateCharacter(q,pack);const e=q.inventory.find(e=>e.id==='equipment:'+id);return derive(q,pack).attacks.find(a=>a.uid===e.uid);};

test('opponent trait records are pinned and target flags validate as booleans',()=>{
 validatePack(core);for(const [id,change] of [['dark-scourge',r=>r.effects[0].type='force'],['dark-side-scourge',r=>r.effects[0].minimum=2],['inquisition',r=>r.effects.pop()],['jedi-hunter',r=>r.effects.pop()]]){const p=structuredClone(core);change(p.talents.find(t=>t.id==='talent:'+id));assert.throws(()=>validatePack(p),id);}
 for(const id of ['dark-scourge','dark-side-scourge','inquisition','jedi-hunter'])assert.equal(core.talents.find(t=>t.id==='talent:'+id).automation,'partial');
 const c=hero(['dark-scourge']);for(const key of ['jedi','forceSensitive','darkSide'])assert.throws(()=>validateCharacter({...c,attackTarget:{[key]:1}},pack),new RegExp('attack target '+key));
});
test('Dark Scourge adds a +1 Dark Side bonus only against declared Jedi and leaves per-target area resolution manual',()=>{
 const c=hero(['dark-scourge']),plain=at(c,'vibroblade');assert.equal(at(c,'vibroblade',{jedi:true}).attack,plain.attack+1);assert.equal(at(c,'blaster-pistol',{jedi:true}).attack,at(c,'blaster-pistol').attack+1);
 assert.equal(at(c,'vibroblade',{forceSensitive:true}).attack,plain.attack);assert.match(at(c,'vibroblade',{jedi:true}).breakdown,/Dark Scourge: \+1 attack/);
 assert.equal(at(c,'frag-grenade',{jedi:true}).attack,at(c,'frag-grenade').attack);
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:dark-scourge').effects.push({target:'attacks',amount:2,type:'dark-side'});const q=structuredClone(c);q.attackTarget={jedi:true};const e=q.inventory.find(e=>e.id==='equipment:vibroblade');const r=structuredClone(c);r.attackTarget={};
 assert.equal(derive(q,p).attacks.find(a=>a.uid===e.uid).attack,derive(r,p).attacks.find(a=>a.uid===e.uid).attack,'same-type Dark Side bonuses do not stack');
});
test('Dark Side Scourge adds CHA (minimum +1) to melee damage against Dark Side Score 1+',()=>{
 const c=hero(['dark-side-scourge'],14);assert.equal(at(c,'vibroblade',{darkSide:true}).damageDisplay,at(c,'vibroblade').damageDisplay+'+2');assert.equal(at(c,'blaster-pistol',{darkSide:true}).damageDisplay,at(c,'blaster-pistol').damageDisplay);
 const low=hero(['dark-side-scourge'],8);assert.equal(at(low,'vibroblade',{darkSide:true}).damageDisplay,at(low,'vibroblade').damageDisplay+'+1');
});
test('Inquisition and Jedi Hunter extra dice stack against Force Sensitivity and critical hits multiply them',()=>{
 const c=hero(['inquisition','jedi-hunter']),plain=at(c,'blaster-pistol'),a=at(c,'blaster-pistol',{forceSensitive:true});
 assert.equal(a.attack,plain.attack+1);assert.equal(a.damageDisplay,plain.damageDisplay+'+2d6');assert.match(a.breakdown,/Inquisition: \+1d6; Jedi Hunter: \+1d6/);
 const q=structuredClone(c);q.attackTarget={forceSensitive:true};const d=derive(q,pack),calls=[];const roller=expr=>{calls.push(expr);const m=/^1d20([+-]\d+)$/.exec(expr);return {value:m?20+Number(m[1]):5,d20:m?[20]:[],display:expr,coeffs:[1]};};
 rollRoutine({name:'Shot',steps:[{attackId:a.uid,count:1,attackMod:0,damageMod:0}]},d.attacks,pack.rules.combat,roller);assert(calls.some(e=>/^\(.*\+2d6\)\*2$/.test(e)),calls.join(' | '));
 assert.doesNotMatch(renderStatBlock(q,d,pack),/\+2d6/);
});


test('published classes and prerequisites activate each reviewed opponent talent without modifying the pack',()=>{
 const make=cls=>{const c=newCharacter(core,{classId:'class:'+cls});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:12,wis:12,cha:14};c.trainedSkills=cls==='scout'?['skill:survival','skill:perception','skill:stealth']:['skill:use-the-force','skill:initiative'];c.inventory=[{id:'equipment:knife',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];return c;};
 const add=(c,cls,talent=null,extra={})=>c.levels.push({classId:'class:'+cls,hpRoll:4,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});
 const adeptBase=()=>{const c=make('jedi');c.levels[0].talent={id:'talent:equilibrium'};for(let n=2;n<=7;n++)add(c,'jedi',n===3?'force-focus':n===5?'force-perception':null);return c;};
 const check=(c,id,target)=>{validateCharacter(c,core);const d=derive(c,core);assert(d.ctx.talents.some(t=>t.id==='talent:'+id),id);assert(!d.ctx.inactiveTalents.has('talent:'+id),id);const plain=d.attacks.find(a=>a.id==='equipment:knife');c.attackTarget=target;const boosted=derive(c,core).attacks.find(a=>a.id==='equipment:knife');assert(boosted.targetTraits,id);return {plain,boosted};};
 const sith=adeptBase();sith.darkSideScore=12;const cls=core.classes.find(r=>r.id==='class:sith-apprentice');add(sith,'sith-apprentice','dark-scourge',{acquisitionDSS:12,entryDeclarations:Object.fromEntries(cls.entrySpecials.map(s=>[s.id,true]))});let a=check(sith,'dark-scourge',{jedi:true});assert.equal(a.boosted.attack,a.plain.attack+1);
 const sentinel=make('jedi');sentinel.levels[0].talent={id:'talent:dark-side-sense'};add(sentinel,'jedi');add(sentinel,'jedi','dark-side-scourge');a=check(sentinel,'dark-side-scourge',{darkSide:true});assert.equal(a.boosted.damageDisplay,a.plain.damageDisplay+'+2');
 const inquisitor=adeptBase();inquisitor.darkSideScore=1;add(inquisitor,'force-adept',null,{talent:{id:'talent:inquisition',manualRequirements:true}});a=check(inquisitor,'inquisition',{forceSensitive:true});assert.equal(a.boosted.attack,a.plain.attack+1);assert.equal(a.boosted.damageDisplay,a.plain.damageDisplay+'+1d4');
 const hunter=make('scout');hunter.levels[0].talent={id:'talent:acute-senses'};for(let n=2;n<=7;n++)add(hunter,'scout',n===3?'improved-initiative':null);add(hunter,'bounty-hunter','jedi-hunter');a=check(hunter,'jedi-hunter',{forceSensitive:true});assert.equal(a.boosted.damageDisplay,a.plain.damageDisplay+'+1d4');
});
