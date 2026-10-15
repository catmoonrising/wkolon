const creationUI=require('./creator-actions.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const choose=require('./choice-actions.cjs');
module.exports=async function(browser,base,root){
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'#creation');const editor=page.locator('#creator-modal'),body=creationUI.body(page);
  await creationUI.tab(page,'abilities');await body.locator('[data-generation-assign="str"]').selectOption('0');
  await creationUI.openChoice(page,'class');await creationUI.chooseClass(page,'class:scout');
  await creationUI.openChoice(page,'talent');await choose(page,'talent','talent:sprint|');await creationUI.done(page,'done');
  const speed=page.locator('#module-speed');assert((await speed.innerText()).includes('Run 30'));
  await page.locator('#module-inventory [data-field="credits"]').fill('100000');await page.locator('#module-inventory [data-field="credits"]').press('Tab');
  await page.locator('#equipment-catalog > summary').click();await page.locator('#purchase-item').selectOption('equipment:heavy-battle-armor');await page.locator('#purchase button[type="submit"]').click();
  assert((await speed.innerText()).includes('Run 12'));
  const house=page.locator('#module-house-rules'),control=house.locator('[data-ambiguity="ambiguity:sprint-heavy-armor"]');
  await house.locator('[data-house-tab="ambiguities"]').click();assert.equal(await control.inputValue(),'armor-limit');
  const topics=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))).rules.ambiguities;assert.equal(await house.locator('[data-ambiguity]').count(),topics.length);assert(!topics.some(r=>/droid.*armor|armor.*droid/i.test(r.name)));
  await house.locator('details summary').first().click();const text=await house.innerText();assert(text.includes('five times')&&text.includes('three times'));assert(!text.includes('Hard March'));
  await control.selectOption('sprint-limit');assert((await speed.innerText()).includes('Run 20'));
  await page.locator('#print').click();assert((await page.locator('#stat-block-text').inputValue()).includes('4 Squares (Run 20 Squares)'));await page.locator('#stat-block-close').click();
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');await page.reload();await house.waitFor();
  await house.locator('[data-house-tab="ambiguities"]').click();assert.equal(await control.inputValue(),'sprint-limit');assert((await speed.innerText()).includes('Run 20'));
  await control.selectOption('armor-limit');assert((await speed.innerText()).includes('Run 12'));await control.selectOption('sprint-limit');
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await house.locator('details summary').first().click();await house.scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(root,'.build/ambiguities-dracula.png')});
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await context.setOffline(true);await page.reload();await house.waitFor();await house.locator('[data-house-tab="ambiguities"]').click();
  assert.equal(await control.inputValue(),'sprint-limit');assert((await speed.innerText()).includes('Run 20'));await house.locator('details summary').first().click();assert((await house.innerText()).includes('five times'));
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('Ambiguities: pinned passages, normal Sprint, heavy-armor settings, immediate calculations, print, saved choices and offline mobile passed');
 }finally{await context.close();}
};
