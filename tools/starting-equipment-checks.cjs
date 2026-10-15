const creationUI=require('./creator-actions.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url');
module.exports=async function(browser,base,root){
 const {newCharacter}=await import(pathToFileURL(path.join(root,'src/rules.js')).href),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json')));
 const c=newCharacter(pack,{classId:'class:scoundrel'});c.name='Kel Dor Jedi';c.species='species:kel-dor';c.levels[0].classId='class:jedi';
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 try{
  await context.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
  await page.goto(base+'#creation');await creationUI.body(page).waitFor();await creationUI.tab(page,'equipment');
  const body=creationUI.body(page),species=body.locator('[data-starting-equipment="species:kel-dor"]'),jedi=body.locator('[data-starting-equipment="class:jedi"]'),roll=body.locator('[data-action="starting-credits"]'),credits=body.locator('[data-field="credits"]');
  await species.click();assert(await species.isDisabled());assert.equal(await credits.inputValue(),'0');assert(!(await roll.isDisabled()));
  await jedi.click();assert(await jedi.isDisabled());assert.equal(await body.locator('.inventory-list article').count(),4);assert(!(await roll.isDisabled()));assert.equal(await credits.inputValue(),'0');
  const row=body.locator('.inventory-list article').first();await row.locator('summary').first().click();assert((await row.innerText()).includes('begin play with these items at no cost'));assert((await row.innerText()).includes('poisonous to other'));await row.locator('summary').first().click();
  for(const [i,value] of ['0.2','0.1','0.4'].entries()){const input=body.locator('.inventory-list article').nth(i).locator('[data-inventory="weightOverride"]');await input.fill(value);await input.dispatchEvent('change');}
  await roll.click();assert(Number(await credits.inputValue())>0);assert(await roll.isDisabled());await credits.fill('0');await credits.dispatchEvent('input');assert(await roll.isDisabled());
  await body.locator('#cr-purchase-item').selectOption('equipment:antiox-breath-mask');await credits.fill('10000');await credits.dispatchEvent('input');await body.locator('#cr-purchase button[type="submit"]').click();assert.equal(await credits.inputValue(),'8000');assert.equal(await body.locator('.inventory-list article').count(),5);
  await body.locator('#cr-purchase-item').selectOption('equipment:protective-goggles');assert(await body.locator('#cr-purchase button[type="submit"]').isDisabled());
  await body.locator('.inventory-list article').nth(1).locator('[data-remove-item]').click();assert.equal(await body.locator('.inventory-list article').count(),4);assert(await species.isDisabled());
  await page.waitForTimeout(400);await page.reload();await creationUI.tab(page,'equipment');assert(await species.isDisabled());assert(await jedi.isDisabled());assert.equal(await body.locator('.inventory-list article').count(),4);
  const weight=body.locator('.inventory-list article').first().locator('[data-inventory="weightOverride"]');assert.equal(await weight.inputValue(),'0.2');await weight.fill('');await weight.dispatchEvent('change');assert((await body.locator('.weight').innerText()).includes('?'));
  await page.setViewportSize({width:390,height:844});await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()==='#282a36');await page.waitForTimeout(150);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/starting-equipment-mobile.png')});
  await page.waitForTimeout(400);await page.evaluate(async()=>{await navigator.serviceWorker.register('sw.js',{scope:'./'});await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await creationUI.tab(page,'equipment');assert(await species.isDisabled());assert.equal(await body.locator('.inventory-list article').count(),4);assert((await body.locator('.weight').innerText()).includes('?'));
  await body.locator('.inventory-list article').first().locator('summary').first().click();assert((await body.locator('.inventory-list article').first().innerText()).includes('begin play with these items at no cost'));
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);assert(saved.startingCreditsRolled);assert.deepEqual(saved.startingEquipmentClaims,['species:kel-dor','class:jedi']);assert.equal(saved.inventory.length,4);assert.deepEqual(errors,[]);
 }finally{await context.close();}
 console.log('Browser: Kel Dor/Jedi grants, replacement purchases, credit rolls, weight editing, persistence, mobile and offline passed');
};
