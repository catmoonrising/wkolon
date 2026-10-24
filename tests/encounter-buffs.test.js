import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {takeAction,previewPlan,beginNextTurn,endTrackedCombat} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {newEncounter,receiveHealing,recordKnockout,setDead,checkConsciousness} from '../src/recovery.js';
import {rollBellow} from '../src/species-actions.js';
import {applyIncomingDamage} from '../src/incoming-damage.js';
import {renderStatBlock} from '../src/stat-block.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const level=(talent=null)=>({classId:'class:jedi',hpRoll:4,startingFeat:null,feats:[],talent:talent?{id:'talent:'+talent}:null,trainedSkills:[],abilityIncreases:[]});
function hero(talents,{dark=0}={}){
 const c=newCharacter(pack,{classId:'class:jedi'});c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:12,cha:14};c.trainedSkills=['skill:use-the-force'];c.darkSideScore=dark;
 c.levels[0].talent={id:'talent:'+talents[0]};for(let n=2;n<=5;n++)c.levels.push(level(n%2&&talents[(n-1)/2]?talents[(n-1)/2]:null));
 for(const l of c.levels)if(l.talent&&pack.talents.find(t=>t.id===l.talent.id).requiresDarkSide)l.talent.darkSideScore=dark;
 c.forcePoints=5;c.currentHP=derive(c,pack).hp;validateCharacter(c,pack);return c;
}
const meditation=()=>hero(['battle-meditation']),presence=()=>hero(['power-of-the-dark-side','dark-presence'],{dark:1});
const noRoll=()=>{throw Error('Should not roll');};
const use=(c,id,choice,p=pack)=>takeAction(c,p,'encounter-talent',{talentId:'talent:'+id,choice},noRoll);
const attack=(c,p=pack)=>derive(c,p).attacks.find(a=>a.mode==='melee').attack;

test('activation metadata pins Battle Meditation and Dark Presence exactly',()=>{
 validatePack(pack);
 for(const [id,change] of [['battle-meditation',a=>a.forcePoints=0],['battle-meditation',a=>a.choices[0].effects[0].type='competence'],['battle-meditation',a=>a.action='standard'],['dark-presence',a=>delete a.endsWhenUnconscious],['dark-presence',a=>a.choices[0].effects[0].amount=2],['dark-presence',a=>a.forcePoints=1]]){const p=structuredClone(pack);change(p.talents.find(t=>t.id==='talent:'+id).activation);assert.throws(()=>validatePack(p),id);}
 for(const id of ['battle-meditation','dark-presence'])assert.equal(pack.talents.find(t=>t.id==='talent:'+id).automation,'partial');
});

test('Battle Meditation costs a Full-Round Action and one FP for a personal +1 insight attack bonus',()=>{
 const c=meditation(),before=attack(c),fp=c.forcePoints;const r=use(c,'battle-meditation','attacks');
 assert.equal(r.text,'Battle Meditation (Attack rolls); Force Points -1');assert.equal(c.forcePoints,fp-1);assert.deepEqual([...c.actionState.spent].sort(),['move','standard','swift']);assert(c.actionState.forceSpent);
 assert.equal(attack(c),before+1);assert(derive(c,pack).attacks.every(a=>a.attack===derive(meditation(),pack).attacks.find(b=>b.uid===a.uid||b.name===a.name).attack+1));
 beginNextTurn(c,pack);assert.equal(attack(c),before+1);assert.throws(()=>use(c,'battle-meditation','attacks'),/already active/);
 assert.match(renderStatBlock(c,derive(c,pack),pack),/Battle Meditation/);validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 endTrackedCombat(c);assert.equal(attack(c),before);use(c,'battle-meditation','attacks');newEncounter(c);assert.equal(attack(c),before);
});

test('Battle Meditation insight competes with other insight bonuses and stacks with other types',()=>{
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:battle-meditation').effects=[{target:'attacks',amount:2,type:'insight'}];
 const c=meditation(),base=attack(c,pack);assert.equal(attack(c,p),base+2);use(c,'battle-meditation','attacks',p);assert.equal(attack(c,p),base+2);
 p.talents.find(t=>t.id==='talent:battle-meditation').effects=[{target:'attacks',amount:1,type:'competence'}];assert.equal(attack(c,p),base+2);
});

test('the user keeps Battle Meditation while unconscious; the printed loss applies to allies',()=>{
 const c=meditation(),base=attack(c);use(c,'battle-meditation','attacks');c.currentHP=3;applyIncomingDamage(c,derive(c,pack),pack,3,{});assert.equal(c.currentHP,0);assert(!c.recovery?.dead);
 assert.deepEqual(c.talentActivations,[{id:'talent:battle-meditation',choice:'attacks'}]);receiveHealing(c,derive(c,pack),pack,5);c.condition=0;assert.equal(attack(c),base+1);
});

test('Dark Presence is a Standard Action with no FP granting +1 Force to all Defenses',()=>{
 const c=presence(),d0=derive(c,pack),fp=c.forcePoints;const r=use(c,'dark-presence','defenses');
 assert.equal(r.text,'Dark Presence (Defenses)');assert.equal(c.forcePoints,fp);assert(!c.actionState.forceSpent);assert.deepEqual(c.actionState.spent,['standard']);
 const d=derive(c,pack);for(const k of ['reflex','fortitude','will'])assert.equal(d.defenses[k],d0.defenses[k]+1,k);
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:dark-presence').effects=[{target:'defenses',amount:1,type:'force'}];assert.equal(derive(c,p).defenses.will,d0.defenses.will+1);
 c.darkSideScore=0;assert.equal(derive(c,pack).defenses.will,d0.defenses.will);
});

test('Dark Presence is lost on falling unconscious or dying and does not return with healing',()=>{
 const c=presence(),base=derive(c,pack).defenses.will;use(c,'dark-presence','defenses');
 c.currentHP=3;applyIncomingDamage(c,derive(c,pack),pack,3,{});assert(!c.recovery?.dead);assert.equal(c.talentActivations,undefined);receiveHealing(c,derive(c,pack),pack,5);c.condition=0;assert.equal(derive(c,pack).defenses.will,base);
 const q=presence();use(q,'dark-presence','defenses');const ref=presence();q.condition=ref.condition=5;assert.equal(derive(q,pack).defenses.will,derive(ref,pack).defenses.will);receiveHealing(q,derive(q,pack),pack,1);q.condition=0;assert.equal(derive(q,pack).defenses.will,base);
 q.currentHP=ref.currentHP=0;ref.condition=0;assert.equal(derive(q,pack).defenses.will,derive(ref,pack).defenses.will);
 const m=hero(['power-of-the-dark-side','dark-presence','battle-meditation'],{dark:1});use(m,'dark-presence','defenses');beginNextTurn(m,pack);use(m,'battle-meditation','attacks');applyIncomingDamage(m,derive(m,pack),pack,m.currentHP,{});assert(m.recovery.dead);assert.deepEqual(m.talentActivations,[{id:'talent:battle-meditation',choice:'attacks'}]);
});

test('previews and failed preflight never spend real resources',()=>{
 const c=meditation();c.forcePoints=0;let before=structuredClone(c);assert.throws(()=>use(c,'battle-meditation','attacks'),/Not enough Force Points/);assert.deepEqual(c,before);
 const q=presence();beginNextTurn(q,pack);const s=queueAction(q,'encounter-talent',{talentId:'talent:dark-presence',choice:'defenses'});before=structuredClone(q);assert(!previewPlan(q,pack).find(r=>r.id===s.id).issue);assert.deepEqual(q,before);
 const w=hero(['battle-meditation']);assert.throws(()=>use(w,'dark-presence','defenses'),/Talent unavailable/);
});

test('Dark Presence ends on CT knockouts and Bellow, while an unrelated encounter activation survives',()=>{
 const c=hero(['power-of-the-dark-side','dark-presence','battle-meditation'],{dark:1});c.species='species:ithorian';use(c,'dark-presence','defenses');beginNextTurn(c,pack);use(c,'battle-meditation','attacks');const hp=c.currentHP;
 rollBellow(c,derive(c,pack),pack,4);assert.equal(c.condition,5);assert.equal(c.currentHP,hp);assert.deepEqual(c.talentActivations,[{id:'talent:battle-meditation',choice:'attacks'}]);receiveHealing(c,derive(c,pack),pack,3);assert(!c.talentActivations.some(s=>s.id==='talent:dark-presence'));
 const q=presence();use(q,'dark-presence','defenses');q.currentHP=0;recordKnockout(q,'normal',pack);assert.equal(q.talentActivations,undefined);
 const dead=presence();use(dead,'dark-presence','defenses');setDead(dead,true,pack);assert.equal(dead.talentActivations,undefined);
});
test('legacy unconscious activations cannot reappear after healing or a consciousness check; invalid healing stays atomic',()=>{
 const c=presence();use(c,'dark-presence','defenses');c.condition=5;const before=structuredClone(c);assert.throws(()=>receiveHealing(c,derive(c,pack),pack,0));assert.deepEqual(c,before);receiveHealing(c,derive(c,pack),pack,2);assert.equal(c.talentActivations,undefined);
 const q=presence();use(q,'dark-presence','defenses');q.currentHP=0;q.condition=5;const d=derive(q,pack);checkConsciousness(q,d,pack,()=>({value:20+d.recovery.unconscious.modifier,d20:[20],display:'20'}));assert.equal(q.talentActivations,undefined);assert.equal(q.condition,4);
});

test('Battle Meditation self-loss alternative removes the user\'s bonus on knockout; default keeps it',async()=>{
 const {endUnconsciousTalents}=await import('../src/talent-activations.js');
 const amb=pack.rules.ambiguities.find(a=>a.id==='ambiguity:battle-meditation-unconscious');assert.equal(amb.default,'allies-only');assert.deepEqual(amb.options.map(o=>o.value),['allies-only','self-lost']);
 const c=meditation(),base=attack(c);c.houseRules={ambiguities:{'ambiguity:battle-meditation-unconscious':'self-lost'}};validateCharacter(c,pack);use(c,'battle-meditation','attacks');assert.equal(attack(c),base+1);
 c.currentHP=3;applyIncomingDamage(c,derive(c,pack),pack,3,{});assert.equal(c.currentHP,0);endUnconsciousTalents(c,pack);assert.equal(c.talentActivations,undefined);receiveHealing(c,derive(c,pack),pack,5);c.condition=0;assert.equal(attack(c),base);
 const q=meditation();use(q,'battle-meditation','attacks');q.condition=5;endUnconsciousTalents(q,pack);assert.deepEqual(q.talentActivations,[{id:'talent:battle-meditation',choice:'attacks'}],'default keeps it');
 const p=structuredClone(pack);p.talents.find(t=>t.id==='talent:battle-meditation').activation.unconsciousAmbiguityId='ambiguity:invented';assert.throws(()=>validatePack(p));
});
