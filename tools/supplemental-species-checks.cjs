const assert=require('node:assert/strict'),path=require('node:path'),creation=require('./creator-actions.cjs');
module.exports=async(browser,base,root,transport)=>{
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 try{
  await page.goto(base+'#creation');await page.locator('.level-plan').waitFor();await creation.chooseClass(page,'class:soldier');await creation.tab(page,'abilities');
  for(const [i,a]of ['str','dex','con','int','wis','cha'].entries())await page.locator('[data-generation-assign="'+a+'"]').selectOption(String(i));
  const cases=[['advozse','Natural Armor',6],['aleena','Quick Energy',4],['altiri','Visually Striking',6],['amani','Reach',6],['anarrian','Strength Surge',6],['arcona','Scent',6],['arkanian','Intellectual Reputation',6]];
  for(const [id,mechanic,speed]of cases){
   await creation.tab(page,'species');await page.locator('#species-search').fill(id);const name=page.locator('[data-species-detail="species:'+id+'"]');assert(await name.isVisible());await name.click();assert((await page.locator('#species-description-'+id).innerText()).includes(mechanic));assert(await name.locator('..').locator('.automation-badge').count());const local=page.locator('#species-description-'+id+' [data-rule-page]').first();if(await local.count()){await local.click();assert((await page.locator('#rule-detail-body').innerText()).length>25);await page.locator('#rule-detail-close').click();}
   await page.locator('[data-select-species="species:'+id+'"]').click();assert.equal(await page.locator('#module-speed .stat-big').innerText(),String(speed));
  }
  await creation.tab(page,'abilities');assert.equal(await page.locator('#cr-final-int').innerText(),'14');assert.equal(await page.locator('#cr-final-cha').innerText(),'6');
  await creation.tab(page,'species');await page.locator('#species-search').fill('Anarrian');await page.locator('[data-select-species="species:anarrian"]').click();await creation.tab(page,'levels');assert.equal(await page.locator('[data-plan-level="0"] [data-open-tree^="feat:0:"]').count(),2);
  await creation.tab(page,'species');await page.locator('#species-search').fill('Amani');await page.locator('[data-select-species="species:amani"]').click();await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/supplemental-species-'+browser.browserType().name()+'-mobile.png')});
  await page.reload();await page.locator('.level-plan').waitFor();assert((await page.locator('#module-features').innerText()).includes('Simple Weapons'));assert(!(await page.locator('#module-features').innerText()).includes('Weapon Proficiency (Pistols)'));
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await context.setOffline(true);await page.reload();await page.locator('.level-plan').waitFor();await creation.tab(page,'species');await page.locator('#species-search').fill('Amani');await page.locator('[data-species-detail="species:amani"]').click();assert((await page.locator('#species-description-amani').innerText()).includes('Expert Climber'));}
  assert.deepEqual(errors,[]);console.log('Browser: seven published species, exact articles/Partial markers, fixed scores/speeds, species feat slots, Primitive, saved choice and mobile'+(base.startsWith('https:')?' / offline':'')+' passed');
 }finally{if(transport)await transport.online();await context.close();}
};
