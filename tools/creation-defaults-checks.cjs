const assert=require('node:assert/strict'),path=require('node:path'),creation=require('./creator-actions.cjs');
module.exports=async(browser,base,root,transport)=>{
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 const stored=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const noPunctuation=async()=>assert(!/[\u2014\u00b7]/.test(await page.locator('body').innerText()));
 try{
  await page.goto(base+'#creation');await page.locator('.level-plan').waitFor();
  assert.equal(await page.locator('[data-plan-level="0"] [data-open-tree="class:0:0"]').innerText(),'Choose…');
  await creation.tab(page,'abilities');await page.locator('#cr-body [data-generation-assign="str"]').selectOption('0');await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
  assert((await stored()).levels[0].pendingClass);assert.equal(await page.locator('#module-classes tbody tr').count(),0);
  await creation.tab(page,'skills');assert.equal(await page.locator('#cr-body [data-trained]:enabled').count(),0);assert((await page.locator('#cr-body').innerText()).includes('0 / 0'));
  await creation.tab(page,'equipment');assert(await page.locator('#cr-body [data-action="starting-credits"]').isDisabled());
  await page.reload();await page.locator('.level-plan').waitFor();assert((await stored()).levels[0].pendingClass);
  await creation.openChoice(page,'class');const tree=page.locator('#feature-tree-body'),bases=tree.locator('.base-class-options');
  assert.deepEqual(await bases.locator('[data-tree-pick]').allTextContents(),['Jedi','Noble','Scoundrel','Scout','Soldier']);
  assert.equal(await bases.locator('[aria-pressed="true"]').count(),0);
  assert(await bases.evaluate(el=>el.getBoundingClientRect().bottom<=el.nextElementSibling.getBoundingClientRect().top));
  assert.equal(await tree.locator('[data-tree-pick^="class:"]').count(),37);
  await noPunctuation();await bases.locator('[data-tree-fold="class:jedi|"]').click();assert((await bases.locator('.expanded .feature-tree-description').innerText()).includes('Starting Feats'));await noPunctuation();await bases.locator('[data-tree-fold="class:jedi|"]').click();
  await tree.locator('[data-tree-all="unfold"]').click();assert.equal(await tree.locator('.feature-tree-description').count(),37+await tree.locator('.prerequisite-node [data-tree-fold]').count());await noPunctuation();await tree.locator('[data-tree-all="fold"]').click();
  await tree.locator('[data-tree-search]').fill('Soldier');assert(await bases.locator('[data-tree-pick]').count()<5);await bases.locator('[data-tree-pick="class:soldier|"]').click();
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');assert(!(await stored()).levels[0].pendingClass);assert.equal((await stored()).forcePoints,5);
  await creation.openChoice(page,'class');await tree.locator('[data-tree-search]').fill('');assert.equal(await bases.locator('[data-tree-pick="class:soldier|"]').getAttribute('aria-pressed'),'true');
  await page.setViewportSize({width:390,height:844});assert(await bases.evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert(await bases.locator('[data-tree-pick="class:soldier|"]').isVisible());await page.screenshot({path:path.join(root,'.build/creation-defaults-'+browser.browserType().name()+'-mobile.png')});
  await creation.closePicker(page);await creation.done(page);await noPunctuation();
  await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));r.logs={[r.activeId]:[{kind:'roll',text:'Legacy\u2014roll \u00b7 1/2'}]};localStorage.setItem('wkolon-roster-v1',JSON.stringify(r));});await page.reload();await page.locator('#module-header').waitFor();assert.equal(await page.locator('#dicelog').textContent(),'Legacy - roll, 1/2');
  await page.locator('#module-header a[href="#creation"]').click();await creation.tab(page,'levels');assert((await page.locator('[data-plan-level="0"]').innerText()).includes('Soldier (1)'));
  if(base.startsWith('https:')){
   await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
   if(transport)await transport.offline();else await context.setOffline(true);
   await page.reload();await page.locator('.level-plan').waitFor();await creation.openChoice(page,'class');assert.equal(await bases.locator('[data-tree-pick]').count(),5);await noPunctuation();
  }
  assert.deepEqual(errors,[]);console.log('Browser: empty class default, no phantom resources, five base classes first, search, source popups, unfold all, selection, persistence, concise copy, punctuation and mobile'+(base.startsWith('https:')?' / offline':'')+' passed');
 }finally{if(transport)await transport.online();await context.close();}
};
