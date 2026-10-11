const assert=require('node:assert/strict');
const path=require('node:path');
const choose=require('./choice-actions.cjs');
module.exports=async function checkCoreSpecies(browser,base,root){
 const context=await browser.newContext({viewport:{width:1440,height:1050}});
 try{
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#creation');const editor=page.locator('#creator-modal');
  const species=async name=>{await editor.locator('[data-step="1"]').click();await page.locator('#species-search').fill(name);await page.locator(`[data-select-species="species:${name.replaceAll(' ','-')}"]`).click();};
  await species('cerean');await page.locator('[data-species-detail="species:cerean"]').click();
  await page.locator('#species-description-cerean [data-rule-page="rule:binary-mind"]').click();
  assert((await page.locator('#rule-detail-body').innerText()).includes('Prerequisite:'));await page.locator('#rule-detail-close').click();
  await editor.locator('[data-step="2"]').click();await editor.locator('[data-class="0"]').selectOption('class:soldier');
  await species('hutt');await page.locator('#cr-close').click();
  assert.equal(await page.locator('[data-defense="will"]').innerText(),'11');
  assert.equal(await page.locator('[data-defense="will-use-the-force"]').innerText(),'16');
  assert.equal(await page.locator('#module-speed .stat-big').innerText(),'2');
  await page.screenshot({path:path.join(root,'.build/core-species-hutt.png')});
  await page.reload();assert.equal(await page.locator('[data-defense="will-use-the-force"]').innerText(),'16');
  await page.locator('#print').click();assert((await page.locator('#stat-block-text').inputValue()).includes('11 (16 vs. Use the Force)'));
  await page.locator('#stat-block-close').click();
  await page.locator('#module-header a[href="#creation"]').click();await species('ewok');
  await editor.locator('[data-step="2"]').click();await editor.locator('[data-class="0"]').selectOption('class:soldier');
  await editor.locator('[data-step="4"]').click();await choose(page,'feat','family:Weapon Proficiency');
  const secondary=editor.locator('[data-choice="feat"][data-secondary]');
  assert(await secondary.locator('option[value="feat:weapon-proficiency-heavy-weapons|"]').count());
  await secondary.selectOption('feat:weapon-proficiency-heavy-weapons|');
  await page.locator('#cr-close').click();
  const features=page.locator('#module-features');assert((await features.innerText()).includes('(F) Weapon Proficiency (Heavy Weapons)'));
  assert(!(await features.innerText()).includes('Weapon Proficiency (Pistols)'));assert(!(await features.innerText()).includes('Weapon Proficiency (Rifles)'));
  await page.locator('#module-header a[href="#creation"]').click();await species('mon calamari');await page.locator('#cr-close').click();
  assert((await page.locator('#module-speed').innerText()).includes('Swim 4'));
  await page.screenshot({path:path.join(root,'.build/core-species-swim.png')});
  if(base.startsWith('https:')){
   await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});await context.setOffline(true);await page.reload();
   assert((await page.locator('#module-speed').innerText()).includes('Swim 4'));
   await page.locator('#module-header a[href="#creation"]').click();await species('ithorian');await page.locator('[data-species-detail="species:ithorian"]').click();
   await page.locator('#species-description-ithorian [data-rule-page="rule:strong-bellow"]').click();
   assert((await page.locator('#rule-detail-body').innerText()).includes('Condition Track'));
  }
  assert.deepEqual(errors,[]);console.log('Core species: feat dialogs, conditional Force defense, saved selection, stat blocks, Primitive, proficiency subtypes and swim speed passed');
 }finally{await context.close();}
};
