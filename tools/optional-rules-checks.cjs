const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),{newCharacter,validateCharacter}=await import('../src/rules.js');
 const c=newCharacter(pack,{classId:'class:soldier'});c.abilityMethod='manual';c.abilities={str:10,dex:10,con:10,int:10,wis:10,cha:10};validateCharacter(c,pack);
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await context.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const house=page.locator('#module-house-rules'),search=house.locator('[data-optional-search]'),row=id=>house.locator(`[data-optional-rule="optional:${id}"]`),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 const open=async id=>{await house.locator('[data-house-tab="optional"]').click();await search.fill('');await row(id).locator(':scope > summary').click();};
 const setting='jc:114-variant-rule-multiple-second-winds';
 try{
  await page.goto(base);await house.waitFor();await house.locator('[data-house-tab="optional"]').click();
  assert.equal(await house.locator('[data-optional-rule]').count(),pack.optionalRules.entries.length);assert.equal(await house.locator('[data-optional-rule][open]').count(),0);
  await search.fill('scavenger manufacturer');assert(await row('droid-manufacturer-traits').isVisible());assert.equal(await row('destiny').count(),0);
  await search.fill('1d12');assert(await row('droid-quirks').isVisible());await row('droid-quirks').locator(':scope > summary').click();assert(await row('droid-quirks').locator('table').isVisible());
  await open('daily-force-points');assert((await row('daily-force-points').innerText()).includes('Unused Force Points do not carry over'));
  const link=row('daily-force-points').locator('.wiki-article a[data-rule-reference]').first();assert(await link.count());await link.click();await page.locator('#rule-detail-body .wiki-article').waitFor();await page.locator('#rule-detail-close').click();
  await open('multiple-second-winds');assert(await row('multiple-second-winds').locator('[data-counseling]').isChecked());await row('multiple-second-winds').locator('[data-counseling]').uncheck();await settle();
  await house.locator('[data-house-tab="counseling"]').click();assert(!await house.locator(`[data-counseling="${setting}"]`).isChecked());
  await page.reload();await house.waitFor();await open('multiple-second-winds');assert(!await row('multiple-second-winds').locator('[data-counseling]').isChecked());
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});await open('droid-quirks');await row('droid-quirks').scrollIntoViewIfNeeded();
  assert(await row('droid-quirks').locator('.optional-body').evaluate(el=>el.scrollWidth>el.clientWidth));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(!/[\u2014\u00b7]/.test(await house.innerText()));await page.screenshot({path:path.join(root,`.build/optional-rules-${browser.browserType().name()}-mobile.png`)});await settle();
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  if(transport)await transport.offline();else await context.setOffline(true);
  await page.reload();await house.waitFor();await open('sacrificial-appendage');assert((await row('sacrificial-appendage').innerText()).includes('retains 1 Hit Point'));
  await open('vital-limits');assert((await row('vital-limits').innerText()).includes('24-hour period'));assert(await row('vital-limits').locator('[href*="oldid="]').count());
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);validateCharacter(saved,pack);assert.equal(saved.houseRules.jediCounseling[setting],false);assert.deepEqual(errors,[]);
  console.log('Optional rules: pinned catalog, name/text/book search, tables, rule popup, shared Counseling settings, saved reload, Dracula mobile and offline passages passed');
 }finally{if(transport)await transport.online();await context.close();}
};
