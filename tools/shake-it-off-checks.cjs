const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:soldier'});
 c.abilityMethod='manual';c.abilities.con=14;c.trainedSkills=['skill:endurance'];c.levels[0].feats=[{id:'feat:shake-it-off'}];c.condition=3;
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await ctx.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);
 const b=page.locator('[data-recovery="recover"]'),actions=page.locator('#module-actions'),modal=page.locator('#actions-modal');
 try{
  await page.goto(base);await actions.waitFor();assert.equal(await b.getAttribute('title'),'2 Swift Actions');await actions.locator('[data-turn-next]').click();await b.click();await settle();let x=await saved();assert.equal(x.condition,2);assert.deepEqual(x.actionState.spent,['swift','move']);assert.equal(x.actionState.recover.count,0);
  await actions.locator('[data-action-menu="swift"]').click();await modal.locator('.action-menu > button').filter({hasText:/^Recover/}).first().click();await modal.locator('[data-action-option="count"]').selectOption('1');await modal.locator('[type="submit"]').click();await settle();x=await saved();assert.equal(x.actionState.recover.count,1);assert.equal(x.condition,2);assert((await actions.innerText()).includes('Recover 1/2'));
  await page.reload();await actions.waitFor();await actions.locator('[data-turn-next]').click();await b.click();await settle();x=await saved();assert.equal(x.condition,1);assert.deepEqual(x.actionState.spent,['swift']);assert.equal(x.actionState.recover.count,0);validateCharacter(x,pack);
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await actions.waitFor();await actions.locator('[data-turn-next]').click();await b.click();await settle();x=await saved();assert.equal(x.condition,0);assert.deepEqual(x.actionState.spent,['swift','move']);assert.equal(x.actionState.recover.count,0);assert(await b.isDisabled());assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Shake It Off two-Swift recovery, saved partial progress, remaining-cost legacy control and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
