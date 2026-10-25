const creationUI=require('./creator-actions.cjs');
const assert=require('node:assert/strict'),path=require('node:path');
module.exports=async function(browser,base,root){
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'#creation');const body=creationUI.body(page),editor=page.locator('#creator-modal');

  await creationUI.openChoice(page,'class');assert.equal(await body.locator('[data-tree-pick^="class:"]').count(),37);
  assert(await body.locator('[data-tree-pick="class:jedi-knight|"]').isDisabled());
  await body.locator('[data-tree-fold="class:soldier|"]').click();assert((await body.locator('.base-class-node.expanded .feature-tree-description').innerText()).includes('CLASS LEVEL'));await body.locator('[data-tree-fold="class:soldier|"]').click();
  await require('./creator-actions.cjs').search(page,'cold-hearted killers');assert(await body.locator('[data-tree-pick="class:soldier|"]').isVisible());
  await creationUI.chooseClass(page,'class:soldier');await page.screenshot({path:path.join(root,'.build/class-options.png')});
  await creationUI.tab(page,'skills');assert.equal(await body.locator('[data-skill-option]').count(),19);assert.equal(await body.locator('[data-trained]').count(),18);
  assert.equal(await body.locator('[data-knowledge-group]').count(),1);assert.equal(await body.locator('[data-trained^="skill:knowledge-"]').count(),0);
  const acrobatics=body.locator('[data-skill-option="skill:acrobatics"]'),pilot=body.locator('[data-skill-option="skill:pilot"]');
  assert.equal(await body.locator('[data-option-preview]:visible').count(),0);await acrobatics.locator('[data-option-toggle]').click();assert((await acrobatics.innerText()).includes('You can move at normal speed across'));assert(await body.locator('[data-trained="skill:use-the-force"]').isDisabled());
  assert.equal(await acrobatics.locator('a.option-name').count(),0);assert((await acrobatics.innerText()).includes('DC 15'));assert(!(await acrobatics.locator('[data-trained]').isChecked()));
  const search=body.locator('[data-option-search]');await search.fill('Nimble Charge');assert.equal(await body.locator('[data-skill-option]').count(),1);await search.fill('');
  assert((await acrobatics.innerText()).includes('Additional Applications'));
  await body.locator('[data-option-fold="fold"]').click();assert.equal(await body.locator('[data-option-preview]:visible').count(),0);
  await body.locator('[data-option-fold="unfold"]').click();assert.equal(await body.locator('[data-option-preview]:visible').count(),19);assert.equal(await body.locator('[data-option-applications]').count(),0);
  await pilot.locator('[data-option-toggle]').click();await pilot.locator('[data-trained]').check();assert(!(await pilot.locator('[data-option-preview]').isVisible()));assert(pilot&&await pilot.locator('[data-trained]').isChecked());
  await creationUI.openChoice(page,'feat');await creationUI.tab(page,'skills');assert(!(await pilot.locator('[data-option-preview]').isVisible()));
  await body.locator('[data-knowledge-group]').check();await body.locator('[data-knowledge-field]').selectOption('skill:knowledge-tactics');
  assert.equal(await body.locator('[data-knowledge-field]').inputValue(),'skill:knowledge-tactics');await body.locator('[data-remove-knowledge]').click();assert.equal(await body.locator('[data-knowledge-field]').count(),0);
  await body.locator('[data-option-fold="fold"]').click();await page.screenshot({path:path.join(root,'.build/skill-options-folded.png')});
  await body.locator('[data-option-fold="unfold"]').click();await creationUI.done(page,'done');await page.locator('#theme-select').selectOption({label:'Dracula Dark'});
  await page.locator('#module-header a[href="#creation"]').click();await creationUI.tab(page,'skills');await body.locator('[data-option-fold="fold"]').click();await body.locator('[data-option-toggle="skill:acrobatics"]').click();
  await page.screenshot({path:path.join(root,'.build/skill-options-dracula.png')});
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await context.setOffline(true);await page.reload();await editor.waitFor();await creationUI.tab(page,'skills');assert(await body.locator('[data-trained="skill:pilot"]').isChecked());
  await body.locator('[data-option-toggle="skill:acrobatics"]').click();assert((await body.locator('[data-skill-option="skill:acrobatics"]').innerText()).includes('Tumble'));assert(!await page.locator('#rule-detail-modal').isVisible());
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await creationUI.openChoice(page,'class');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);console.log('Creation options: comparison cards, verbatim skill rules, full-text search, fold states, Knowledge fields, unavailable choices and offline mobile passed');
 }finally{await context.close();}
};
