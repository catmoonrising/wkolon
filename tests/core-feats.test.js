import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,indexPack,eligible} from '../src/rules.js';
import {articleText} from '../src/wiki-content.js';

const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
const ix=indexPack(pack);
const ids=['acrobatic-strike','careful-shot','charging-fire','combat-reflexes','coordinated-attack','quick-draw','rapid-shot','rapid-strike','running-attack','vehicular-combat'];
function context(){
 const c=newCharacter(pack);c.levels[0].classId='class:soldier';c.levels[0].feats=[];c.levels[0].talent=null;
 return derive(c,pack).ctx;
}
const can=(id,ctx)=>eligible(ix.feats.get('feat:'+id),{id:'feat:'+id},ctx,ix,'feats');

test('Core combat feats use trained skills and BAB prerequisites, not assumed ability thresholds',()=>{
 const ctx=context();ctx.scores.str=8;ctx.scores.dex=8;ctx.trained=new Set();
 assert(can('rapid-shot',ctx));assert(can('rapid-strike',ctx));assert(can('quick-draw',ctx));
 assert(!can('acrobatic-strike',ctx));assert(!can('vehicular-combat',ctx));
 ctx.trained.add('skill:acrobatics');ctx.trained.add('skill:pilot');
 assert(can('acrobatic-strike',ctx));assert(can('vehicular-combat',ctx));
 ctx.bab=0;assert(!can('rapid-shot',ctx));assert(!can('rapid-strike',ctx));assert(!can('quick-draw',ctx));
 ctx.scores.dex=13;assert(can('running-attack',ctx));ctx.scores.dex=12;assert(!can('running-attack',ctx));
 ctx.bab=2;assert(!can('careful-shot',ctx));assert(can('coordinated-attack',ctx));
 ctx.feats.push({id:'feat:point-blank-shot'});assert(can('careful-shot',ctx));
 ctx.bab=3;assert(!can('charging-fire',ctx));ctx.bab=4;assert(can('charging-fire',ctx));
});

test('reviewed class bonus lists retain their class restrictions',()=>{
 const expected={jedi:['acrobatic-strike','combat-reflexes','quick-draw','rapid-strike','running-attack'],noble:[],scoundrel:['quick-draw','rapid-shot','running-attack','vehicular-combat'],scout:['careful-shot','rapid-shot','running-attack','vehicular-combat'],soldier:['careful-shot','charging-fire','combat-reflexes','coordinated-attack','quick-draw','rapid-shot','rapid-strike','running-attack','vehicular-combat']};
 for(const [cls,list] of Object.entries(expected))assert.deepEqual(ix.classes.get('class:'+cls).bonusFeats.filter(id=>ids.includes(id.slice(5))).sort(),list.map(id=>'feat:'+id).sort());
});

test('conditional combat feats retain full imported Special rules and do not modify ordinary attacks',()=>{
 for(const id of ids){
  const feat=ix.feats.get('feat:'+id),record=pack.catalog.records.find(r=>r.mechanicsIds.includes(feat.id));
  assert.equal(record.status,'available');assert.equal(record.sourceId,feat.sourceId);
  assert.deepEqual(feat.effects,[]);
  const text=articleText(pack.rulePages.find(r=>r.id===record.ruleId).article);
  assert(text.replace(/\s/g,'').includes(feat.reminder.replace(/\s/g,'')));
 }
 const text=name=>articleText(pack.rulePages.find(r=>r.name===name).article);
 assert(text('Rapid Shot').includes('Strength')&&text('Rapid Shot').includes('-5'));
 assert(text('Rapid Strike').includes('Dexterity')&&text('Rapid Strike').includes('Light'));
 const c=newCharacter(pack);c.levels[0].classId='class:soldier';c.levels[0].feats=[];c.levels[0].talent=null;
 c.inventory=[{id:'equipment:blaster-pistol',quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];
 const before=derive(c,pack);c.levels[0].feats=[{id:'feat:rapid-shot'},{id:'feat:vehicular-combat'}];c.trainedSkills=['skill:pilot'];
 const after=derive(c,pack);assert(after.ctx.feats.some(f=>f.id==='feat:rapid-shot'));assert(after.ctx.feats.some(f=>f.id==='feat:vehicular-combat'));
 assert.deepEqual(after.attacks,before.attacks);assert.deepEqual(after.defenses,before.defenses);
});
