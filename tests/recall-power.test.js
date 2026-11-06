import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as api from '../src/rules.js';
import {recoverPower} from '../src/force-powers.js';
import {takeAction,executeAction,previewPlan,beginNextTurn} from '../src/action-engine.js';
import {queueAction} from '../src/action-economy.js';
import {validatePack} from '../tools/validate-rules.js';
import make from '../tools/forceful-recovery-fixtures.cjs';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url))),f=make(pack,api),D=c=>api.derive(c,pack),no=()=>{throw Error('No roll expected');};
function hero(){const c=f.hero();c.levels[0].talent={id:'talent:recall-power'};api.validateCharacter(c,pack);assert.deepEqual(D(c).issues,[]);return c;}
const ids=c=>c.levels[0].forcePowers.map(p=>p.id),o=c=>({powerId:ids(c)[0],secondPowerId:ids(c)[1],trigger:'Power expended'}),run=c=>takeAction(c,pack,'recover-power',o(c),no);
const untouched=(c,fn)=>{const before=structuredClone(c);assert.throws(fn);assert.deepEqual(c,before);};
test('Recall Power remains source-bound and restores either distinct pair for one FP',()=>{
 validatePack(pack);const row=pack.talents.find(t=>t.id==='talent:recall-power'),source=pack.sources.find(s=>s.id===row.sourceId);assert.equal(source.revision,26763);assert.equal(source.sha256,'8467d26c7922a64c6284697d6ab72db6b796fdf4a209159bdbf7922c562b9ddb');assert.equal(row.automation,'partial');
 for(let a=0;a<3;a++)for(let b=0;b<3;b++){if(a===b)continue;const c=hero(),before=c.forcePoints,p=ids(c);takeAction(c,pack,'recover-power',{powerId:p[a],secondPowerId:p[b],trigger:'Spent power'},no);assert.equal(c.forcePoints,before-1);assert.deepEqual(c.levels[0].forcePowers.map(p=>p.spent),[0,1,2].map(i=>i!==a&&i!==b));assert(c.actionState.forceSpent);assert.deepEqual(c.actionState.spent,[]);api.validateCharacter(JSON.parse(JSON.stringify(c)),pack);}
});
test('a sole copy returns alone and exactly two copies default to both',()=>{
 const c=hero(),p=ids(c);c.levels[0].forcePowers[2].spent=false;const result=recoverPower(c,D(c),pack,p[0]);assert.equal(result.recovered.length,2);assert(c.levels[0].forcePowers.every(p=>!p.spent));
 const one=hero();one.levels[0].forcePowers.slice(1).forEach(p=>p.spent=false);assert.equal(recoverPower(one,D(one),pack,ids(one)[0]).recovered.length,1);
});
test('several copies require a second choice, and invalid/stale/source-lost choices fail before resources',()=>{
 for(const second of ['',null,2,'foreign']){const c=hero();untouched(c,()=>recoverPower(c,D(c),pack,ids(c)[0],second));}
 const missing=hero();untouched(missing,()=>recoverPower(missing,D(missing),pack,ids(missing)[0]));const same=hero();untouched(same,()=>recoverPower(same,D(same),pack,ids(same)[0],ids(same)[0]));
 const stale=hero();stale.levels[0].forcePowers[1].spent=false;untouched(stale,()=>run(stale));const source=hero();source.levels[0].talent=null;untouched(source,()=>run(source));
 const nofp=hero();nofp.forcePoints=0;untouched(nofp,()=>run(nofp));
});
test('pure queue preview restores both copies for later use and stale execution remains atomic',()=>{
 const c=hero();beginNextTurn(c,pack);const a=queueAction(c,'recover-power',o(c));queueAction(c,'power',{powerId:ids(c)[1],action:'free-action',fp:'none',rollMode:'roll'});const before=structuredClone(c),preview=previewPlan(c,pack);assert(!preview[0].issue);assert(!preview[1].issue);assert.deepEqual(c,before);
 c.levels[0].forcePowers[1].spent=false;untouched(c,()=>executeAction(c,pack,a.id,no));c.levels[0].forcePowers[1].spent=true;executeAction(c,pack,a.id,no);assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.levels[0].forcePowers[1].spent,false);
});
test('ordinary recovery returns one without Recall and Forceful Recovery still returns only one',()=>{
 const plain=hero();plain.levels[0].talent=null;const p=ids(plain),before=plain.forcePoints;recoverPower(plain,D(plain),pack,p[0]);assert.equal(plain.forcePoints,before-1);assert.deepEqual(plain.levels[0].forcePowers.map(p=>p.spent),[false,true,true]);
 const c=hero();takeAction(c,pack,'second-wind',{forcefulPowerId:ids(c)[0]},no);assert.deepEqual(c.levels[0].forcePowers.map(p=>p.spent),[false,true,true]);
});
