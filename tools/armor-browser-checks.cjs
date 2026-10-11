const assert=require('node:assert/strict');
const path=require('node:path');
const choose=require('./choice-actions.cjs');
module.exports=async function(browser,base,root){
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const strength=()=>page.locator('#module-abilities tbody tr').first().locator('.derived');
 const speed=()=>page.locator('#module-speed .stat-big');
 const saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 try{
  await page.goto(base+'#creation');const editor=page.locator('#creator-modal');
  await editor.locator('[data-step="2"]').click();await editor.locator('[data-class="0"]').selectOption('class:soldier');
  await editor.locator('[data-step="0"]').click();
  for(const [i,a] of ['str','dex','con','int','wis','cha'].entries())await editor.locator(`[data-generation-assign="${a}"]`).selectOption(String(i));
  await editor.locator('[data-step="4"]').click();
  await choose(page,'feat','family:Armor Proficiency');
  await editor.locator('[data-secondary][data-slot="0"]').selectOption('feat:armor-proficiency-heavy|');
  await editor.locator('#cr-done').click();
  await page.locator('#module-inventory [data-field="credits"]').fill('100000');await page.locator('#module-inventory [data-field="credits"]').press('Tab');
  await page.locator('#equipment-catalog > summary').click();
  await page.locator('#purchase-item').selectOption('equipment:corellian-powersuit');
  assert((await page.locator('#purchase [data-shop-quote]').innerText()).includes('11,000 cr'));
  await page.locator('#purchase button[type="submit"]').click();
  assert.equal(await strength().innerText(),'17');assert.equal(await speed().innerText(),'4');
  assert.equal(await page.locator('#module-abilities [data-ability="str"]').inputValue(),'15');
  await page.locator('#module-abilities details summary').click();assert((await page.locator('#module-abilities details').innerText()).includes('15 + 2 Corellian Powersuit'));
  await page.locator('[data-inventory="equipped"][data-index="0"]').uncheck();assert.equal(await strength().innerText(),'15');assert.equal(await speed().innerText(),'6');
  await page.locator('[data-inventory="equipped"][data-index="0"]').check();assert.equal(await strength().innerText(),'17');
  await page.locator('#purchase-item').selectOption('equipment:heavy-battle-armor');await page.locator('#purchase button[type="submit"]').click();
  assert.equal(await strength().innerText(),'15');assert.equal(await speed().innerText(),'4');assert((await page.locator('#module-speed').innerText()).includes('Run 12'));
  assert.equal(await page.locator('[data-inventory="equipped"]:checked').count(),1);
  await page.locator('#print').click();assert((await page.locator('#stat-block-text').inputValue()).includes('4 Squares (Run 12 Squares)'));await page.locator('#stat-block-close').click();
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
  const c=await saved();assert.equal(c.abilities.str,15);assert.equal(c.inventory[0].equipped,false);assert.equal(c.inventory[1].licenseStatus,'pending');
  assert.equal(c.levels[0].feats[0].id,'feat:armor-proficiency-heavy');
  // Local development intentionally skips automatic registration.
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});
  await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await context.setOffline(true);await page.reload();await speed().waitFor();
  assert.equal(await speed().innerText(),'4');assert((await page.locator('#module-speed').innerText()).includes('Run 12'));
  await page.locator('#condition-effect button[data-condition-step="4"]').click();assert.equal(await speed().innerText(),'2');assert((await page.locator('#module-speed').innerText()).includes('Run 6'));
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.locator('#module-speed').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(root,'.build/armor-dracula.png')});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('Browser: armor buying, Heavy secondary choice, equipped Strength, running, printed stats and offline persistence passed');
 }finally{await context.close();}
};
