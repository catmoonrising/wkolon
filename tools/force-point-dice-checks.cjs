const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./force-point-dice-fixtures.cjs')(pack,rules);
 const c=make.twilek('skill:persuasion'),ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));window.__pointRolls=0;Math.random=()=>{window.__pointRolls++;return .6;};},{schemaVersion:1,activeId:c.id,characters:[c]});
 const saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 try{
  await page.goto(base);const button=page.locator('[data-force-skill="skill:deception"]');await button.waitFor();
  assert.equal(await button.innerText(),'Force Point d10');assert.equal(await page.locator('[data-force-skill="skill:persuasion"]').innerText(),'Force Point d8');assert.equal(await page.locator('[data-force-skill]').count(),2);
  const fp=(await saved()).forcePoints;await button.click();await settle();assert.equal((await saved()).forcePoints,fp-1);
  assert(/Deception:? Force Point/.test(await page.locator('#dicelog').innerText()));
  const close=async()=>{if(await page.locator('#roll-mirror-close').isVisible())await page.locator('#roll-mirror-close').click();};
  await close();await page.reload();await button.waitFor();assert.equal(await button.innerText(),'Force Point d10');
  await page.locator('#module-actions [data-turn-next]').click();await settle();await button.click();await settle();await close();
  const tracked=await saved();assert.equal(tracked.forcePoints,fp-2);assert(tracked.actionState.forceSpent);assert.equal(tracked.actionState.plan.at(-1).action,'force-bonus');assert.equal(tracked.actionState.plan.at(-1).options.skill,'skill:deception');
  const rolls=await page.evaluate(()=>window.__pointRolls);await button.click();assert.match(await page.locator('#message').innerText(),/already spent/);assert.deepEqual(await saved(),tracked);assert.equal(await page.evaluate(()=>window.__pointRolls),rolls);
  if(transport){if(transport.prime)await transport.prime(page);await transport.offline();await page.reload();await button.waitFor();assert.equal(await button.innerText(),'Force Point d10');assert.deepEqual(await saved(),tracked);await transport.online();}
  await page.locator('#module-actions [data-turn-next]').click();await settle();await button.click();await settle();await close();assert.equal((await saved()).forcePoints,fp-3);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/force-point-'+browser.browserType().name()+'-mobile.png')});assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 const check=make.forcePerception(),other=await browser.newContext(),replacement=await other.newPage();
 try{
  await other.addInitScript(c=>localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]})),check);await replacement.goto(base);
  const source=replacement.locator('[data-skill-source="skill:perception"]');await source.waitFor();assert.equal(await replacement.locator('[data-force-skill="skill:perception"]').count(),0);
  await source.selectOption('skill:perception');await replacement.locator('[data-force-skill="skill:perception"]').waitFor();assert.equal(await replacement.locator('[data-force-skill="skill:perception"]').innerText(),'Force Point d10');
  await source.selectOption('skill:use-the-force');assert.equal(await replacement.locator('[data-force-skill="skill:perception"]').count(),0);
 }finally{await other.close();}
 console.log('Browser: Force Point context dice, tracked round limit and zero RNG on refusal, next-turn reset, source selection, log, reload and mobile'+(transport?' / refused offline':'')+' passed');
};
