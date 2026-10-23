import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {chooseSpeciesOption} from '../src/species-choices.js';
import {setGenerationMethod,setPoolScore,assignScore} from '../src/ability-generation.js';
import {activeAbilities} from '../src/ability-profiles.js';
import {declareDefenseStance} from '../src/defensive-combat.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const row=(cls,talent=null,extra={})=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});
function hero({cls='soldier',species='species:human',feat=null,talent=null,con=14}={}){const c=newCharacter(pack,{classId:'class:'+cls});c.species=species;c.abilityMethod='manual';c.abilities={str:12,dex:14,con,int:12,wis:12,cha:12};c.levels[0].feats=feat?[{id:feat}]:[];c.levels[0].talent=talent?{id:talent}:null;return c;}
const base=c=>derive(c,pack),cond=(d,against)=>d.conditionalDefenses.find(r=>r.against===against);
const without=(c,fn)=>{const q=structuredClone(c);fn(q);return derive(q,pack);};

test('reviewed passive defense records pin exact effects and reject unreviewed contexts',()=>{
 validatePack(pack);
 for(const [id,change] of [['feat:thick-skin',r=>r.effects[0].amount=3],['feat:poison-resistance',r=>r.effects[0].type='species'],['feat:warrior-heritage',r=>r.effects[0].weapons.pop()],['feat:resolute-stance',r=>r.effects[0].amount=5]]){const p=structuredClone(pack);change([...p.feats,...p.talents].find(r=>r.id===id));assert.throws(()=>validatePack(p),id);}
 const p=structuredClone(pack);p.feats.find(r=>r.id==='feat:toughness').effects.push({target:'conditionalDefense',defense:'fortitude',against:'poison',amount:5,type:'untyped'});assert.throws(()=>validatePack(p));
 for(const id of ['feat:thick-skin','talent:force-of-will','talent:jedi-hunter','feat:poison-resistance','feat:scion-of-dorin','talent:environmentally-shielded','feat:warrior-heritage','feat:resolute-stance'])assert.equal([...pack.feats,...pack.talents].find(r=>r.id===id).automation,'partial',id);
});

test('Thick Skin adds a species Fortitude bonus for Trandoshans and threshold follows',()=>{
 const c=hero({species:'species:trandoshan',feat:'feat:thick-skin'});validateCharacter(c,pack);const d=base(c),w=without(c,q=>q.levels[0].feats=[]);
 assert.equal(d.defenses.fortitude,w.defenses.fortitude+2);assert.equal(d.threshold,w.threshold+2);
 const human=hero({feat:'feat:thick-skin'});assert.equal(base(human).defenses.fortitude,without(human,q=>q.levels[0].feats=[]).defenses.fortitude,'species prerequisite');
});

test('Force of Will grants the user +2 insight Will and Jedi Hunter-style insight bonuses do not stack',()=>{
 const c=hero({cls:'jedi',talent:'talent:force-of-will'});c.trainedSkills=['skill:use-the-force'];validateCharacter(c,pack);const w=without(c,q=>q.levels[0].talent=null);
 assert.equal(base(c).defenses.will,w.defenses.will+2);
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:force-of-will').effects.push({target:'defenseBonus',defense:'will',amount:1,type:'insight'});assert.equal(derive(c,p).defenses.will,w.defenses.will+2);
});

test('Jedi Hunter grants +1 insight to Fortitude and Will for a Bounty Hunter',()=>{
 const c=hero({cls:'scout',talent:'talent:acute-senses'});c.trainedSkills=['skill:survival','skill:perception','skill:stealth'];for(let n=2;n<=7;n++)c.levels.push(row('scout',n===3?'improved-initiative':null));c.levels.push(row('bounty-hunter','jedi-hunter'));validateCharacter(c,pack);
 const d=base(c);assert(d.ctx.talents.some(t=>t.id==='talent:jedi-hunter')&&!d.ctx.inactiveTalents.has('talent:jedi-hunter'));const w=without(c,q=>q.levels[7].talent=null);
 assert.equal(d.defenses.fortitude,w.defenses.fortitude+1);assert.equal(d.defenses.will,w.defenses.will+1);assert.equal(d.defenses.reflex,w.defenses.reflex);
});

test('Poison Resistance, Scion of Dorin and Environmentally Shielded show separate conditional Fortitude totals',()=>{
 const c=hero({feat:'feat:poison-resistance',con:13});validateCharacter(c,pack);let d=base(c);assert.equal(cond(d,'poison').total,d.defenses.fortitude+5);assert.equal(cond(d,'poison').defense,'fortitude');assert.match(renderStatBlock(c,d,pack),/vs\. Poison/);
 assert(!cond(base(hero({feat:'feat:poison-resistance',con:12})),'poison'),'CON 13 prerequisite');
 const k=hero({species:'species:kel-dor',feat:'feat:scion-of-dorin'});validateCharacter(k,pack);d=base(k);assert.equal(cond(d,'natural-hazards').total,d.defenses.fortitude+5);assert.match(renderStatBlock(k,d,pack),/vs\. Natural Hazards/);
 const r=newCharacter(pack,{classId:'class:soldier'});r.species='species:custom-droid';r.trainedSkills=[];r.levels[0].feats=[];chooseSpeciesOption(r,pack,'degree','degree-5');chooseSpeciesOption(r,pack,'size','medium');chooseSpeciesOption(r,pack,'language','basic');setGenerationMethod(r,'manual',pack);for(const [i,a]of activeAbilities(r,pack).entries()){setPoolScore(r,i,[15,14,13,12,10][i],pack);assignScore(r,a,i,pack);}
 r.levels[0].talent={id:'talent:environmentally-shielded'};d=base(r);assert(d.ctx.talents.some(t=>t.id==='talent:environmentally-shielded')&&!d.ctx.inactiveTalents.has('talent:environmentally-shielded'));assert.equal(cond(d,'environmental-hazards').total,d.defenses.fortitude+5);
});

test('Warrior Heritage requires a wielded Atlatl or Cesta and Resolute Stance requires Fighting Defensively',()=>{
 const c=hero({species:'species:gungan',feat:'feat:warrior-heritage'});validateCharacter(c,pack);const plain=base(c).defenses.will;
 for(const id of ['equipment:atlatl','equipment:cesta']){c.inventory=[{id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];validateCharacter(c,pack);assert.equal(base(c).defenses.will,plain+2,id);c.inventory[0].equipped=false;assert.equal(base(c).defenses.will,plain);c.inventory[0].equipped=true;c.inventory[0].carried=false;assert.equal(base(c).defenses.will,plain);}
 c.inventory=[{id:'equipment:quarterstaff',uid:crypto.randomUUID(),quantity:1,equipped:true,attackMod:0,damageMod:0}];assert.equal(base(c).defenses.will,plain);
 const s=hero({feat:'feat:resolute-stance'});s.levels.push(row('soldier'));validateCharacter(s,pack);const w=base(s).defenses.will;declareDefenseStance(s,base(s),'fight');assert.equal(base(s).defenses.will,w+2);
});
