const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=require('./charlatan-fixtures.cjs')(pack,rules).charlatan(),d=rules.derive(c,pack).defenses;
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const actions=page.locator('#module-actions'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),reflex=()=>page.locator('[data-defense="reflex"]').innerText().then(Number);
 const open=async()=>{if(!await page.locator('#defensive-options').evaluate(d=>d.open))await page.locator('#defensive-options > summary').click();},box=()=>page.locator('[data-triggered-defense="improved-soft-cover"]');
 try{
  await page.goto(base);await actions.waitFor();assert.equal(await reflex(),d.reflex);
  await open();await box().check();await settle();assert.equal(await reflex(),d.reflex+2);
  await page.reload();await actions.waitFor();assert.equal(await reflex(),d.reflex+2);
  await actions.locator('[data-turn-next]').click();await settle();assert.equal(await reflex(),d.reflex,'ends at the start of your next turn');
  await open();await box().check();await settle();await box().uncheck();await settle();assert.equal(await reflex(),d.reflex,'no longer adjacent');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Improved Soft Cover Noble/Charlatan trigger, Reflex +2 cover, reload, New Turn expiry, manual clear, mobile passed');
};
