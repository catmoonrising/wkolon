import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {newCharacter,derive,progression,validateCharacter} from '../src/rules.js';
import {choosePlannedClass} from '../src/level-plan.js';
import {canRollStartingCredits,startingEquipmentGrants} from '../src/equipment.js';
import {createFeatureTrees} from '../src/feature-trees.js';
import {renderArticle,displayText,escapeHTML} from '../src/wiki-content.js';
const pack=JSON.parse(fs.readFileSync(new URL('../data/core.json',import.meta.url)));

test('new characters have no selected class or earned class resources, including after save and reload',()=>{
 const c=newCharacter(pack),d=derive(c,pack);
 assert.equal(c.name,'unnamed');assert(c.levels[0].pendingClass);
 assert.equal(d.level,0);assert.equal(d.bab,0);assert.equal(d.hp,0);
 assert.equal(d.forceMaximum,0);assert.equal(d.forceCurrent,0);
 assert.equal(d.ctx.classLevels.size,0);assert.equal(d.ctx.feats.length,0);
 assert.equal(d.ctx.trained.size,0);assert.equal(d.rows[0].slots.length,0);
 assert(d.issues.includes('Level 1: choose a class'));
 assert(!canRollStartingCredits(c));assert(!startingEquipmentGrants(c,pack).some(g=>g.id.startsWith('class:')));
 const saved=JSON.parse(JSON.stringify(c));validateCharacter(saved,pack);assert.equal(derive(saved,pack).level,0);
 choosePlannedClass(saved,pack,0,'class:soldier');const soldier=derive(saved,pack);
 assert.equal(saved.levels[0].pendingClass,undefined);assert.equal(soldier.level,1);
 assert.equal(soldier.bab,1);assert(soldier.hp>0);assert.equal(soldier.forceMaximum,5);assert.equal(saved.forcePoints,5);
 assert(canRollStartingCredits(saved));assert(soldier.ctx.feats.some(f=>f.id==='feat:weapon-proficiency-rifles'));
 validateCharacter(saved,pack);
});

test('base classes render before the prestige graph, without duplicates or an initial highlight',()=>{
 const c=newCharacter(pack),ctx=progression(c,pack,0).ctx;
 const html=createFeatureTrees(pack).render({key:'default-class',type:'classes',ctx,allowedIds:pack.classes.map(r=>r.id),selected:null});
 const first=html.indexOf('class="base-class-options"'),graph=html.indexOf('class="feature-tree-scroll"');
 assert(first>=0&&graph>first);const base=html.slice(first,graph);
 for(const name of ['jedi','noble','scoundrel','scout','soldier']){
  const attr='data-tree-pick="class:'+name+'|"';assert(base.includes(attr));assert.equal(html.split(attr).length,2);
 }
 assert(!base.includes('aria-pressed="true"'));assert(!base.includes('data-tree-node='));
 assert(html.indexOf('data-tree-pick="class:jedi-knight|"')>graph);
});

test('presentation removes unwanted punctuation while preserving source text and link addresses',()=>{
 const text='First\u2014second \u00b7 third <tag>',url='https://swse.miraheze.org/wiki/Test\u2014Page';
 const article={blocks:[{tag:'p',children:[text,{tag:'a',href:url,children:['Read\u00b7more']}]}]},before=JSON.stringify(article);
 const rendered=renderArticle(article);
 assert(rendered.includes('First - second, third &lt;tag&gt;'));
 assert(rendered.includes('Read, more'));assert(rendered.includes(new URL(url).href));
 assert.equal(JSON.stringify(article),before);assert.equal(escapeHTML(text),'First\u2014second \u00b7 third &lt;tag&gt;');
 assert.equal(displayText('Attack \u00b7 1/2'),'Attack, 1/2');
 for(const records of Object.values(pack).filter(Array.isArray))for(const r of records)if(r?.article){
  const html=renderArticle(r.article);assert(!/[\u2014\u00b7]/.test(html),r.name);
 }
});
