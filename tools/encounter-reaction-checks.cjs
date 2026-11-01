const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./encounter-reaction-fixtures.cjs')(pack,rules);
 const c=make.lucky(),start=rules.derive(c,pack).defenses,ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const value=k=>page.locator(`[data-defense="${k}"]`).innerText().then(Number),saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 const modal=page.locator('#actions-modal');
 const pick=async name=>{await page.locator('[data-action-menu="reaction"]').click();await modal.locator('.action-menu > button').filter({hasText:name}).click();};
 try{
  await page.goto(base);await page.locator('#module-actions').waitFor();
  await pick('Better Lucky than Dead');await modal.locator('[data-action-option="defense"]').selectOption('will');const trigger=modal.locator('[data-action-option="trigger"]');if(await trigger.count())await trigger.fill('Attack');await modal.locator('[type="submit"]').click();await settle();
  assert.equal(await value('will'),start.will+5);assert.equal(await value('reflex'),start.reflex);
  const s=await saved();assert.deepEqual(s.defenseReactionsUsed,['better-lucky-than-dead']);assert.equal(s.defenseReactions[0].defense,'will');
  await page.reload();await page.locator('#module-actions').waitFor();assert.equal(await value('will'),start.will+5);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: encounter Defense reactions choice, bonus, save, reload, mobile passed');
};
