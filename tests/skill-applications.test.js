import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import make from '../tools/skill-application-fixtures.cjs';
import * as api from '../src/rules.js';
import {createSpeciesChecks} from '../src/species-rules.js';
import {skillApplicationControl} from '../src/skill-applications.js';
import {validatePack} from '../tools/validate-rules.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),skill=(c,id,p=pack)=>api.derive(c,p).skills.find(s=>s.id==='skill:'+id);
test('three pinned records are Partial and the complete Duros build satisfies actual prerequisites',()=>{
 validatePack(pack);const c=f.duros();assert.deepEqual(api.derive(c,pack).issues,[]);
 for(const [id,revision]of [['feat:veteran-spacer',20816],['feat:master-of-disguise',21209],['talent:bomb-thrower',21239]]){const r=[...pack.feats,...pack.talents].find(r=>r.id===id);assert.equal(r.automation,'partial');assert.equal(pack.sources.find(s=>s.id===r.sourceId).revision,revision);const p=structuredClone(pack);[...p.feats,...p.talents].find(r=>r.id===id).effects[0].amount=7;assert.throws(()=>validatePack(p));}
});
test('each use changes only its named skill and context, with the printed rush penalty',()=>{
 const c=f.duros(),before=api.derive(c,pack).skills;for(const [id,use,bonus]of [['use-computer','astrogate-starship',5],['deception','deceptive-appearance',5],['deception','deceptive-appearance-rushed',3],['mechanics','handle-explosives',5]]){
  c.skillApplications={['skill:'+id]:use};api.validateCharacter(c,pack);for(const s of api.derive(c,pack).skills)assert.equal(s.checkTotal,before.find(b=>b.id===s.id).total+(s.id==='skill:'+id?bonus:0));assert.match(skillApplicationControl(skill(c,id)),/General/);assert.deepEqual(api.derive(c,pack).skills.map(s=>s.total),before.map(s=>s.total));
 }
});
test('native typed bonuses compete, source loss gives no bonus, and saved skill/use pairs are strict',()=>{
 const c=f.duros();c.skillApplications={'skill:deception':'deceptive-appearance'};const p=structuredClone(pack);p.feats.find(r=>r.id==='feat:master-of-disguise').effects.push({target:'skills',amount:7,type:'insight'});const a=skill(c,'deception',p).checkTotal;delete c.skillApplications;assert.equal(skill(c,'deception',p).checkTotal,a,'insight does not stack');
 c.skillApplications={'skill:use-computer':'astrogate-starship'};const initial=skill(c,'use-computer').checkTotal;c.levels[0].feats=[{id:'feat:toughness'}];assert.equal(skill(c,'use-computer').checkTotal,initial-5);api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);
 for(const choice of [[],null,{'skill:deception':'astrogate-starship'},{'skill:pilot':'handle-explosives'},{'skill:mechanics':true},{'skill:mechanics':'bogus'}])assert.throws(()=>api.validateCharacter({...c,skillApplications:choice},pack),/skill applications/);
});
test('rerolls retain the application modifier and cannot cross an equal-total application change',()=>{
 const c=f.duros();c.skillApplications={'skill:mechanics':'handle-explosives'};let d=api.derive(c,pack),calls=[],logs=[];const ui=createSpeciesChecks({current:()=>c,derived:()=>d,log:(...x)=>logs.push(x)},expr=>{calls.push(expr);return {value:10+d.skills.find(s=>s.id==='skill:mechanics').checkTotal,d20:[10],display:expr};});
 const el=dataset=>({dataset});ui.click(el({skillRoll:'skill:mechanics'}),pack.species.find(s=>s.id===c.species));assert.match(logs[0][1],/Handle Explosives/);assert.equal(calls[0],'1d20+'+skill(c,'mechanics').checkTotal);const html=ui.controls(skill(c,'mechanics'),pack.species.find(s=>s.id===c.species),false);assert.match(html,/data-talent-reroll="talent:knack"/);assert.doesNotMatch(html,/disabled/);
 ui.click(el({talentReroll:'talent:knack',rerollSkill:'skill:mechanics'}),pack.species.find(s=>s.id===c.species));assert.equal(calls[1],calls[0]);assert.equal(c.recovery.knacksSpent,1);
 // The UI change handler invalidates tickets; even a direct same-total context edit cannot reuse one.
 c.recovery.knacksSpent=0;d=api.derive(c,pack);ui.click(el({skillRoll:'skill:mechanics'}),pack.species.find(s=>s.id===c.species));const total=skill(c,'mechanics').checkTotal;delete c.skillApplications;c.skillModifiers={'skill:mechanics':5};d=api.derive(c,pack);assert.equal(skill(c,'mechanics').checkTotal,total);assert.match(ui.controls(skill(c,'mechanics'),pack.species.find(s=>s.id===c.species),false),/disabled/);
});
