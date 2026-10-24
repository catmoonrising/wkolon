const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:noble'});
 const row=(cls,talent=null,extra={})=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[],...extra});
 c.name='Shift Defense';c.abilityMethod='manual';c.abilities={str:10,dex:14,con:12,int:14,wis:12,cha:14};c.trainedSkills=['skill:knowledge-tactics','skill:persuasion','skill:perception','skill:deception','skill:use-computer','skill:knowledge-galactic-lore'];c.levels[0].talent={id:'talent:born-leader'};
 for(let n=2;n<=7;n++)c.levels.push(row('noble'));const cls=pack.classes.find(r=>r.id==='class:officer');c.levels.push(row('officer','shift-defense-i',{entryDeclarations:Object.fromEntries((cls.entrySpecials||[]).map(s=>[s.id,true]))}),row('officer'),row('officer','shift-defense-ii'));
 validateCharacter(c,pack);const initial=derive(c,pack);
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await ctx.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const actions=page.locator('#module-actions'),modal=page.locator('#actions-modal'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);
 const value=k=>page.locator(`[data-defense="${k}"]`).textContent().then(Number);
 try{
  await page.goto(base);await actions.waitFor();await actions.locator('[data-turn-next]').click();
  await actions.locator('[data-action-menu="swift"]').click();await modal.locator('.action-menu > button').filter({hasText:/^Shift Defense II/}).click();
  await modal.locator('[data-action-option="bonus"]').selectOption('fortitude');await modal.locator('[data-action-option="penalty"]').selectOption('fortitude');assert(await modal.locator('[type="submit"]').isDisabled());assert.match(await modal.innerText(),/two different Defenses/);
  await modal.locator('[data-action-option="penalty"]').selectOption('reflex');await modal.locator('[type="submit"]').click();await settle();let x=await saved();assert.deepEqual(x.defenseShifts,[{id:'shift-defense-ii',bonus:'fortitude',penalty:'reflex'}]);
  assert.equal(await value('fortitude'),initial.defenses.fortitude+2);assert.equal(await value('reflex'),initial.defenses.reflex-5);assert.match(await actions.innerText(),/Shift Defense II \(Fortitude \+2, Reflex -5\)/);
  await page.locator('#print').click();assert.match(await page.locator('#stat-block-text').inputValue(),/Fortitude \+2, Reflex -5/);await page.locator('#stat-block-close').click();
  await page.reload();await actions.waitFor();assert.equal(await value('fortitude'),initial.defenses.fortitude+2);await actions.locator('[data-turn-next]').click();await settle();assert.equal(await value('reflex'),initial.defenses.reflex);assert.equal((await saved()).defenseShifts,undefined);
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});await actions.locator('[data-action-menu="swift"]').click();await modal.locator('.action-menu > button').filter({hasText:/^Shift Defense I(?!I)/}).click();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/shift-defense-'+browser.browserType().name()+'-mobile.png')});await modal.locator('[type="submit"]').click();await settle();
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await actions.waitFor();x=await saved();assert.deepEqual(x.defenseShifts,[{id:'shift-defense-i',bonus:'reflex',penalty:'will'}]);validateCharacter(x,pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Shift Defense I/II selectors, invalid same-Defense preflight, typed bonus/penalty totals, print, next-turn expiry and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
