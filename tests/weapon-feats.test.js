import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,validateCharacter} from '../src/rules.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));
function hero(feat,weapons,{proficient=true}={}){
 const c=newCharacter(pack,{classId:proficient?'class:soldier':'class:jedi'});c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:10};c.levels[0].feats=feat?[{id:'feat:'+feat}]:[];if(!proficient)c.trainedSkills=['skill:use-the-force'];
 c.inventory=weapons.map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));validateCharacter(c,pack);return c;
}
const at=(c,id,extra={})=>{const q=structuredClone(c),e=q.inventory.find(e=>e.id==='equipment:'+id);Object.assign(e,extra);return derive(q,pack).attacks.find(a=>a.uid===e.uid);};
const rl=pack.rules.weaponRanges.limits,feats=['pistoleer','riflemaster','disabler','sport-hunter'];

test('weapon feat traits are pinned per exact weapon and Partial',()=>{
 validatePack(pack);for(const [id,change] of [['pistoleer',r=>r.effects[0].weapon='equipment:hold-out-blaster-pistol'],['riflemaster',r=>r.effects[1].damageDie=10],['sport-hunter',r=>r.effects.pop()]]){const p=structuredClone(pack);change(p.feats.find(f=>f.id==='feat:'+id));assert.throws(()=>validatePack(p),id);}
 const p=structuredClone(pack);p.feats.find(f=>f.id==='feat:toughness').effects.push({target:'weaponTrait',weapon:'equipment:blaster-pistol',accurate:true});assert.throws(()=>validatePack(p));
 for(const id of feats)assert.equal(pack.feats.find(f=>f.id==='feat:'+id).automation,'partial');
});
test('Pistoleer makes the Blaster Pistol Accurate and removes Heavy Blaster Pistol Inaccuracy',()=>{
 const base=hero(null,['blaster-pistol','heavy-blaster-pistol','hold-out-blaster-pistol']),c=hero('pistoleer',['blaster-pistol','heavy-blaster-pistol','hold-out-blaster-pistol']),d=rl.pistols[1]+1;
 assert.equal(at(base,'blaster-pistol',{distance:d}).range.penalty,-5);assert.equal(at(c,'blaster-pistol',{distance:d}).range.penalty,-5,'Accurate Medium Range is -5');assert.equal(at(c,'blaster-pistol',{distance:rl.pistols[0]+1}).range.penalty,0);assert.equal(at(base,'blaster-pistol',{distance:rl.pistols[0]+1}).range.penalty,-2);
 assert.equal(at(base,'heavy-blaster-pistol',{distance:rl.pistols[3]}).range.available,false);assert.equal(at(c,'heavy-blaster-pistol',{distance:rl.pistols[3]}).range.available,true);
 assert.equal(at(c,'hold-out-blaster-pistol',{distance:rl.pistols[3]}).range.available,false,'Hold-Out clause remains manual');
});
test('Riflemaster, Disabler and Sport Hunter change only their printed weapons',()=>{
 const r=hero('riflemaster',['blaster-rifle','heavy-blaster-rifle','blaster-carbine']);assert.equal(at(r,'blaster-rifle',{distance:rl.rifles[0]+1}).range.penalty,0);assert.equal(at(r,'heavy-blaster-rifle').damage,'3d12');assert.equal(at(r,'blaster-carbine',{distance:rl.rifles[0]+1}).range.penalty,-2);
 const i=hero('disabler',['ion-pistol','ion-rifle']);assert.equal(at(i,'ion-pistol').damage,'3d8');assert.equal(at(i,'ion-rifle',{distance:rl.rifles[0]+1}).range.penalty,0);assert.match(at(i,'ion-pistol').damageDisplay,/^3d8/);
 const s=hero('sport-hunter',['slugthrower-rifle','sporting-blaster-rifle','slugthrower-pistol']),b=hero(null,['slugthrower-rifle','sporting-blaster-rifle','slugthrower-pistol']);assert.equal(at(s,'slugthrower-rifle').damage,'2d12');assert.equal(at(s,'slugthrower-pistol').damage,at(b,'slugthrower-pistol').damage);
 const aimed=at(s,'sporting-blaster-rifle',{aimed:true}),plain=at(b,'sporting-blaster-rifle',{aimed:true});assert.equal(aimed.attack,plain.attack+1);assert.equal(aimed.unAimed.attack,at(b,'sporting-blaster-rifle').attack);assert.match(aimed.breakdown,/\+ 1 Aim/);
 assert.equal(at(s,'sporting-blaster-rifle').attack,at(b,'sporting-blaster-rifle').attack,'no bonus without Aim');
});
test('the traits require proficiency with the weapon',()=>{
 const c=hero('riflemaster',['heavy-blaster-rifle'],{proficient:false});assert.equal(at(c,'heavy-blaster-rifle').proficient,false);assert.equal(at(c,'heavy-blaster-rifle').damage,'3d10');
});

test('folded-stock Riflemaster range benefits honor the saved ambiguity while proficiency stays separate',()=>{
 const c=hero('riflemaster',['blaster-rifle']);const w=at(c,'blaster-rifle',{stockPosition:'folded',distance:rl.pistols[0]+1});assert.equal(w.printedGroup,'rifles');assert.equal(w.group,'pistols');assert.equal(w.range.penalty,0);c.houseRules={ambiguities:{'ambiguity:folded-stock-rifle-range':'pistol-ranges'}};assert.equal(at(c,'blaster-rifle',{stockPosition:'folded',distance:rl.pistols[0]+1}).range.penalty,-2);const restored=JSON.parse(JSON.stringify(c));validateCharacter(restored,pack);assert.equal(at(restored,'blaster-rifle',{stockPosition:'folded',distance:rl.pistols[0]+1}).range.penalty,-2);
});
