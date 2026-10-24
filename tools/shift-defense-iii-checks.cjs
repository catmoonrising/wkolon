const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:noble'});
 const row=(cls,talent=null,extra={})=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});
 c.name='Shift Defense III';c.abilityMethod='manual';c.abilities={str:10,dex:14,con:12,int:14,wis:12,cha:14};c.trainedSkills=['skill:knowledge-tactics','skill:persuasion','skill:perception','skill:deception','skill:use-computer','skill:knowledge-galactic-lore'];c.levels[0].talent={id:'talent:born-leader'};
 for(let n=2;n<=7;n++)c.levels.push(row('noble'));const cls=pack.classes.find(r=>r.id==='class:officer');c.levels.push(row('officer','shift-defense-i',{entryDeclarations:Object.fromEntries((cls.entrySpecials||[]).map(s=>[s.id,true]))}),row('officer'),row('officer','shift-defense-ii'),row('officer'),row('officer','shift-defense-iii'));
 c.houseRules={ambiguities:{'ambiguity:shift-defense-iii-duration':'permanent'}};validateCharacter(c,pack);const initial=derive(c,pack);
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await ctx.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const actions=page.locator('#module-actions'),modal=page.locator('#actions-modal'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);
 const value=k=>page.locator(`[data-defense="${k}"]`).textContent().then(Number);
 try{
  await page.goto(base);await actions.waitFor();await actions.locator('[data-turn-next]').click();
  await actions.locator('[data-action-menu="swift"]').click();await modal.locator('.action-menu > button').filter({hasText:/^Shift Defense III/}).click();assert.equal(await modal.locator('[data-action-option="penalty"]').count(),0);
  await modal.locator('[data-action-option="bonus"]').selectOption('will');await modal.locator('[type="submit"]').click();await settle();
  assert.deepEqual((await saved()).defenseShifts,[{id:'shift-defense-iii',bonus:'will',penalty:null,persistent:true}]);assert.equal(await value('will'),initial.defenses.will+5);assert.equal(await value('reflex'),initial.defenses.reflex-5);
  await actions.locator('[data-turn-next]').click();await actions.locator('[data-combat-end]').click();await settle();assert.equal(await value('will'),initial.defenses.will+5,'no automatic expiry');
  await page.reload();await actions.waitFor();await actions.locator('[data-defense-shift-remove="0"]').click();await settle();assert.equal((await saved()).defenseShifts,undefined);assert.equal(await value('will'),initial.defenses.will);
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await actions.waitFor();validateCharacter(await saved(),pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Shift Defense III single-Defense form, +5/-5/-5 totals, no-expiry alternative across New Turn/End combat, remove control and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
