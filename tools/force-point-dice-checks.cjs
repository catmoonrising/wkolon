const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./force-point-dice-fixtures.cjs')(pack,rules);
 const c=make.twilek('skill:persuasion'),ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 try{
  await page.goto(base);const button=page.locator('[data-force-skill="skill:deception"]');await button.waitFor();
  assert.equal(await button.innerText(),'Force Point d10');assert.equal(await page.locator('[data-force-skill="skill:persuasion"]').innerText(),'Force Point d8');assert.equal(await page.locator('[data-force-skill]').count(),2);
  const fp=(await saved()).forcePoints;await button.click();await settle();assert.equal((await saved()).forcePoints,fp-1);
  assert((await page.locator('#dicelog').innerText()).includes('Deception Force Point'));
  await page.reload();await button.waitFor();assert.equal(await button.innerText(),'Force Point d10');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Force Point dice skill buttons, spending, log, reload, mobile passed');
};
