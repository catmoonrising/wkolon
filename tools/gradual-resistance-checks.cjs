const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./class-defense-fixtures.cjs')(pack,rules);
 const c=make.adept('force-perception');c.name='Gradual Resistance';c.levels[6].talent={id:'talent:gradual-resistance'};rules.validateCharacter(c,pack);const d=rules.derive(c,pack).defenses;
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const actions=page.locator('#module-actions'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),value=k=>page.locator(`[data-defense="${k}"]`).innerText().then(Number);
 const open=async()=>{if(!await page.locator('#defensive-options').evaluate(d=>d.open))await page.locator('#defensive-options > summary').click();},box=()=>page.locator('[data-triggered-defense="gradual-resistance"]');
 try{
  await page.goto(base);await actions.waitFor();assert.equal(await page.locator('[data-defense="will-damaging-force-power"]').count(),0);
  await open();await box().check();await settle();for(const k of ['reflex','fortitude','will']){assert.equal(await value(k+'-damaging-force-power'),d[k]+2);assert.equal(await value(k),d[k]);}
  assert.match(await page.locator('#module-defenses').innerText(),/vs\. the damaging Force Power/);
  await page.reload();await actions.waitFor();assert.equal(await value('will-damaging-force-power'),d.will+2);
  await actions.locator('[data-turn-next]').click();await settle();assert.equal(await value('will-damaging-force-power'),d.will+2,'lasts past New Turn');
  await open();await box().uncheck();await settle();assert.equal(await page.locator('[data-defense="will-damaging-force-power"]').count(),0);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Gradual Resistance encounter rows vs. the damaging Force Power on all Defenses, reload, survives New Turn, clear, mobile passed');
};
