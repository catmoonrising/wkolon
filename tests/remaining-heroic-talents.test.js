import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter,indexPack,eligible,progression} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
import {featureGraph} from '../src/feature-trees.js';
import {articleText} from '../src/wiki-content.js';
import {purchaseQuote} from '../src/equipment.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const talent=id=>({id:'talent:'+id});
const item=id=>({id:'equipment:'+id,quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
function hero(cls,t){const c=newCharacter(pack);c.abilityMethod='manual';c.levels[0].classId='class:'+cls;c.levels[0].feats=[];c.levels[0].talent=talent(t);return c;}
function add(c,t,cls=c.levels[0].classId){c.levels.push({classId:cls,hpRoll:4,feats:[],talent:t?talent(t):null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});}
const get=(d,id)=>d.skills.find(s=>s.id==='skill:'+id);

test('every Core Jedi, Noble and Scoundrel class-tree talent is selectable with a pinned, complete article',()=>{
 const trees={jedi:['jedi-consular','jedi-guardian','jedi-sentinel','lightsaber-combat'],noble:['influence','inspiration','leadership','lineage'],scoundrel:['fortune','misfortune','slicer','spacer']};
 const counts={'jedi-consular':4,'jedi-guardian':5,'jedi-sentinel':5,'lightsaber-combat':6,influence:4,inspiration:5,leadership:6,lineage:4,fortune:5,misfortune:5,slicer:3,spacer:4};
 for(const [cls,names] of Object.entries(trees)){
  const r=pack.classes.find(r=>r.id==='class:'+cls);assert.deepEqual(r.talentTrees,names.map(n=>'tree:'+n));assert(pack.sources.some(s=>s.id===r.talentAccessSourceId));
  for(const tree of r.talentTrees){const records=pack.talents.filter(t=>t.tree===tree);assert.equal(records.length,counts[tree.slice(5)],tree);
   for(const t of records){const source=pack.sources.find(s=>s.id===t.sourceId);assert.equal(source.section,t.name);assert(articleText(t.article).includes('Core Rulebook'));assert(pack.catalog.records.some(r=>r.mechanicsIds.includes(t.id)&&r.status==='available'));}
  }
 }
 const c=hero('noble','presence'),allowed=pack.talents.filter(t=>trees.noble.map(n=>'tree:'+n).includes(t.tree)).map(t=>t.id);
 const graph=featureGraph(pack,{type:'talents',ctx:derive(c,pack).ctx,allowedIds:allowed});
 assert(graph.nodes.get('talent:demand-surrender|').available);assert(!graph.nodes.get('talent:improved-weaken-resolve|').available);assert(!graph.nodes.has('talent:spacehound|'));
});

test('Force Intuition grants training in order; substitution uses the full source modifier exactly once and persists a native override',()=>{
 const c=hero('jedi','force-intuition');c.abilities.cha=20;c.abilities.dex=8;c.trainedSkills=['skill:use-the-force'];c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:use-the-force'}];c.condition=2;
 let d=derive(c,pack);assert(d.ctx.trained.has('skill:initiative'));assert.equal(get(d,'initiative').total,get(d,'use-the-force').total);assert.equal(get(d,'initiative').total,13);assert.equal(get(d,'initiative').checkSource,'skill:use-the-force');
 assert.equal(get(d,'initiative').checkSources[0].total,2); // -1 DEX +5 training -2 condition
 add(c);c.levels[1].feats=[{id:'feat:skill-focus',choice:'skill:initiative'}];d=derive(c,pack);assert(d.ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:initiative'));assert.equal(get(d,'initiative').checkSources[0].total,8);assert.equal(get(d,'initiative').total,14);
 c.skillCheckSources={'skill:initiative':'skill:initiative'};d=derive(c,pack);assert.equal(get(d,'initiative').total,8);validateCharacter(c,pack);assert.equal(get(derive(JSON.parse(JSON.stringify(c)),pack),'initiative').checkSource,'skill:initiative');
 c.levels[0].talent=null;assert(!derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:initiative')); // later focus loses its prerequisite
 c.levels[0].feats=[{id:'feat:skill-focus',choice:'skill:initiative'}];c.levels[0].talent=talent('force-intuition');assert(!derive(c,pack).ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.level===1)); // a later talent cannot authorize an earlier feat
});

test('Force Persuasion grants training and its conditional species focus, while Trace requires an explicit network choice',()=>{
 const c=hero('jedi','adept-negotiator');c.species='species:neimoidian-galaxy-of-intrigue';c.abilities.cha=20;c.trainedSkills=['skill:use-the-force'];add(c);add(c,'force-persuasion');
 let d=derive(c,pack);assert(d.ctx.trained.has('skill:persuasion'));assert(d.ctx.feats.some(f=>f.id==='feat:skill-focus'&&f.choice==='skill:persuasion')); // Neimoidian's conditional focus
 assert.equal(get(d,'persuasion').checkSource,'skill:persuasion'); // higher native modifier remains usable
 const s=hero('scoundrel','trace');s.abilities.cha=8;s.abilities.int=18;s.trainedSkills=['skill:use-computer'];d=derive(s,pack);
 assert.equal(get(d,'gather-information').checkSource,'skill:gather-information');assert(!get(d,'gather-information').trained);
 s.skillCheckSources={'skill:gather-information':'skill:use-computer'};d=derive(s,pack);assert.equal(get(d,'gather-information').total,get(d,'use-computer').total);assert(get(d,'gather-information').breakdown.includes('computer network'));
 s.levels[0].talent=null;d=derive(s,pack);assert.equal(get(d,'gather-information').checkSource,'skill:gather-information');assert.equal(get(d,'gather-information').total,-1);
 s.skillCheckSources={'skill:pilot':'skill:invented'};assert.throws(()=>validateCharacter(s,pack),/skill check sources/);
});

test('explicit repeat caps stop at three Lightsaber Defenses, five Coordinates and ten Sneak Attacks',()=>{
 const ix=indexPack(pack),ctx=progression(hero('jedi','force-intuition'),pack).ctx;
 for(const [id,max] of [['lightsaber-defense',3],['coordinate',5],['sneak-attack',10]]){
  const r=ix.talents.get('talent:'+id);ctx.talents=Array.from({length:max-1},()=>talent(id));assert(eligible(r,talent(id),ctx,ix,'talents'));ctx.talents.push(talent(id));assert(!eligible(r,talent(id),ctx,ix,'talents'));
 }
 const c=hero('jedi','lightsaber-defense');for(let n=2;n<=7;n++)add(c,n%2?'lightsaber-defense':null);assert.equal(derive(c,pack).ctx.talents.length,3);assert(derive(c,pack).issues.some(s=>s.includes('Lightsaber Defense is not eligible')));
 assert.equal(derive(c,pack).defenses.reflex,derive({...c,levels:c.levels.map(l=>({...l,talent:null}))},pack).defenses.reflex); // a Swift Action benefit is not always active
});

test('Jedi specialization requires Lightsaber focus and shares its once-per-group limit with Soldier',()=>{
 const c=hero('jedi','weapon-specialization-lightsabers');c.levels[0].feats=[{id:'feat:weapon-focus',choice:'lightsabers'}];c.inventory=[item('lightsaber'),item('blaster-pistol')];
 let d=derive(c,pack);const bonus=d.attacks[0].damageBonus;c.levels[0].talent=null;const baseline=derive(c,pack);assert.equal(bonus,baseline.attacks[0].damageBonus+2);assert.equal(d.attacks[1].damageBonus,baseline.attacks[1].damageBonus);
 const ix=indexPack(pack),generic=ix.talents.get('talent:weapon-specialization'),fixed=ix.talents.get('talent:weapon-specialization-lightsabers');
 c.levels[0].talent=talent('weapon-specialization-lightsabers');d=derive(c,pack);assert(!eligible(generic,{id:generic.id,choice:'lightsabers'},d.ctx,ix,'talents'));
 d.ctx.feats.push({id:'feat:weapon-focus',choice:'rifles'});assert(eligible(generic,{id:generic.id,choice:'rifles'},d.ctx,ix,'talents'));
 d.ctx.talents=[{id:generic.id,choice:'lightsabers'}];assert(!eligible(fixed,{id:fixed.id},d.ctx,ix,'talents'));
 const graph=featureGraph(pack,{type:'talents',ctx:d.ctx,allowedIds:[fixed.id]});assert(graph.nodes.get(fixed.id+'|').owned);assert(!graph.nodes.get(fixed.id+'|').available);
 c.levels[0].feats=[];assert(!derive(c,pack).ctx.talents.some(t=>t.id===fixed.id));
 const fixture=structuredClone(pack);fixture.equipment.find(r=>r.id==='equipment:lightsaber').mode='ranged';assert.equal(derive({...c,levels:[{...c.levels[0],feats:[{id:'feat:weapon-focus',choice:'lightsabers'}]}]},fixture).attacks[0].damageBonus,0); // fixed Jedi bonus is melee only
});

test('Counseling applies Force Point and Force check activation restrictions, with the RAW off-state preserved',()=>{
 const c=hero('scout','evasion');add(c,'battle-meditation','class:jedi');c.levels[1].startingFeat={id:'feat:weapon-proficiency-lightsabers'};
 let d=derive(c,pack);assert(!d.ctx.talents.some(t=>t.id==='talent:battle-meditation'));
 c.houseRules={jediCounseling:{'jc:106-jedi-multiclassing':false}};d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:battle-meditation'));
 c.houseRules.jediCounseling['jc:106-jedi-multiclassing']=true;c.levels[1].startingFeat={id:'feat:force-sensitivity'};assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:battle-meditation'));
 c.levels[1].startingFeat={id:'feat:weapon-proficiency-lightsabers'};c.levels[1].talent=talent('lightsaber-throw');assert(derive(c,pack).ctx.talents.some(t=>t.id==='talent:lightsaber-throw')); // optional return check does not forbid throwing
});

test('Connections checks full purchase quantities before license fees and reduces black-market multipliers at any price',()=>{
 const c=hero('noble','connections'),options={benefits:derive(c,pack).purchaseBenefits};
 let q=purchaseQuote(item('blaster-pistol'),2,pack,c,options);assert.equal(q.total,1000);assert.equal(q.fee,0);assert(q.connections);assert.equal(q.licenseStatus,'approved');
 q=purchaseQuote(item('blaster-pistol'),3,pack,c,options);assert.equal(q.total,1650);assert.equal(q.licenseStatus,'pending');assert(!q.connections);
 q=purchaseQuote(item('blaster-pistol'),3,pack,c,{...options,market:'black-market'});assert.equal(q.total,3000);assert.equal(q.licenseStatus,'none');
 q=purchaseQuote(item('stormtrooper-armor'),1,pack,c,{...options,market:'black-market'});assert.equal(q.total,24000);assert(!q.connections);
 assert.equal(purchaseQuote(item('vonduun-crabshell'),1,pack,c,options).total,null);
 c.levels[0].talent=null;assert.equal(purchaseQuote(item('blaster-pistol'),2,pack,c,{benefits:derive(c,pack).purchaseBenefits}).total,1100);
 const bad=structuredClone(pack);bad.talents.find(t=>t.id==='talent:trace').effects[0].grantsTraining=true;assert.throws(()=>validatePack(bad),/Conditional substitutions/);
});
