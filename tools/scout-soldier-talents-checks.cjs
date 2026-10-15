const creationUI=require('./creator-actions.cjs');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const choose=require('./choice-actions.cjs');
module.exports=async function(browser,base,root){
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json')));
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto(base+'#creation');const editor=page.locator('#creator-modal'),body=creationUI.body(page);
  await creationUI.tab(page,'abilities');await body.locator('[data-generation-assign="str"]').selectOption('0');

  await creationUI.openChoice(page,'class');await creationUI.chooseClass(page,'class:soldier');
  await creationUI.openChoice(page,'feat');await choose(page,'feat','family:Armor Proficiency');await body.locator('[data-secondary][data-slot="0"]').selectOption('feat:armor-proficiency-heavy|');
  await creationUI.openChoice(page,'talent');await body.locator('[data-tree-group="tree:weapon-specialist"]').click();
  assert(await body.locator('[data-tree-pick="talent:penetrating-attack|"]').isDisabled());
  await body.locator('[data-tree-pick="talent:devastating-attack|"]').click();
  const secondary=body.locator('[data-secondary][data-choice="talent"]');
  assert(await secondary.isVisible());await secondary.selectOption('talent:devastating-attack|rifles');
  await body.locator('[data-tree-fold="talent:devastating-attack|"]').click();
  assert((await page.locator('#rule-detail-body').innerText()).includes("Damage Threshold"));await page.locator('#rule-detail-close').click();
  await choose(page,'talent','talent:armored-defense|');await creationUI.done(page,'done');
  await page.locator('#module-inventory [data-field="credits"]').fill('100000');await page.locator('#module-inventory [data-field="credits"]').press('Tab');
  await page.locator('#equipment-catalog > summary').click();await page.locator('#purchase-item').selectOption('equipment:heavy-battle-armor');await page.locator('#purchase button[type="submit"]').click();
  assert.equal(await page.locator('#module-speed .stat-big').innerText(),'4');assert((await page.locator('#module-speed').innerText()).includes('Run 12'));
  await page.locator('#module-classes a[href="#advancement"]').click();await body.locator('#next-class').selectOption('class:soldier');
  await body.locator('[data-action="add-level"]').click();await body.locator('[data-action="add-level"]').click();
  await choose(page,'talent','talent:juggernaut|',2);await creationUI.done(page,'done');
  assert.equal(await page.locator('#module-speed .stat-big').innerText(),'6');
  const speedCalculations=page.locator('#module-speed details').filter({has:page.locator('summary.hint')});await speedCalculations.locator('summary.hint').click();assert((await speedCalculations.innerText()).includes('× 1 armor'));
  await page.locator('#print').click();assert((await page.locator('#stat-block-text').inputValue()).includes('6 Squares'));await page.locator('#stat-block-close').click();
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.locator('#module-classes a[href="#advancement"]').click();
  await body.locator('[data-open-tree="talent:2:0"]').click();const tree=page.locator('#feature-tree-modal');await tree.locator('[data-tree-group="tree:armor-specialist"]').click();
  assert.equal(await tree.locator('[data-tree-pick]').count(),pack.talents.filter(r=>r.tree==='tree:armor-specialist').length);assert(await tree.locator('[data-tree-node="talent:juggernaut|"]').evaluate(el=>el.classList.contains('owned')));
  await page.screenshot({path:path.join(root,'.build/armor-specialist-talents.png')});await page.locator('#feature-tree-close').click();await creationUI.done(page,'done');
  await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller!==null);
  await context.setOffline(true);await page.reload();assert.equal(await page.locator('#module-speed .stat-big').innerText(),'6');
  await page.locator('#condition-effect button[data-condition-step="4"]').click();assert.equal(await page.locator('#module-speed .stat-big').innerText(),'3');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
  console.log('Scout/Soldier talents: class access, weapon secondary choices, Juggernaut advancement, equipped armor, print, Dracula, persistence and offline mobile passed');
 }finally{await context.close();}
};
