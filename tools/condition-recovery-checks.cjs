const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js');
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:jedi'}),other=newCharacter(pack,{classId:'class:soldier'}),soldier=newCharacter(pack,{classId:'class:soldier'});
 c.name='Recovery Jedi';c.condition=4;c.currentHP=1;c.levels[0].talent={id:'talent:equilibrium'};
 c.recovery={secondWindsSpent:0,secondWindEncounter:false,ragesSpent:0,rageRounds:0,persistent:['injury','other']};
 soldier.name='Recovery Soldier';soldier.condition=3;soldier.levels[0].talent={id:'talent:indomitable'};soldier.recovery={...c.recovery,persistent:['other']};
 validateCharacter(c,pack);validateCharacter(soldier,pack);const fp=c.forcePoints;
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await context.addInitScript(({c,other,soldier})=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c,other,soldier]}));},{c,other,soldier});
 const modal=page.locator('#actions-modal'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 async function choose(name){await page.locator('[data-action-menu="swift"]').click();await modal.locator('.action-menu > button').filter({hasText:name}).click();}
 async function switchTo(id){await page.locator(`[data-character="${id}"]`).click();}
 try{
  await page.goto(base);await page.locator('#module-actions').waitFor();await choose('Equilibrium');assert((await modal.innerText()).includes('1 FP'));
  await modal.locator('[data-rule-page]').click();await page.locator('#rule-detail-modal').waitFor({state:'visible'});assert((await page.locator('#rule-detail-body').innerText()).includes('debilitating'));await page.locator('#rule-detail-close').click();
  await modal.locator('[data-action-queue]').click();await settle();let x=await saved();assert.equal(x.condition,4);assert.equal(x.forcePoints,fp);assert.deepEqual(x.recovery.persistent,['injury','other']);
  await page.locator('[data-turn-run]').click();await settle();x=await saved();assert.equal(x.condition,0);assert.equal(x.forcePoints,fp-1);assert.equal(x.currentHP,1);assert.deepEqual(x.recovery.persistent,[]);assert.deepEqual(x.actionState.spent,['swift']);assert(x.actionState.forceSpent);
  await page.reload();await page.locator('#module-actions').waitFor();assert.equal((await saved()).condition,0);assert.equal((await saved()).forcePoints,fp-1);await choose('Equilibrium');assert(await modal.locator('[type="submit"]').isDisabled());assert((await modal.locator('[data-action-error]').innerText()).includes('Normal State'));await page.keyboard.press('Escape');
  await switchTo(other.id);await page.locator('[data-action-menu="swift"]').click();assert.equal(await modal.locator('.action-menu > button').filter({hasText:'Equilibrium'}).count(),0);assert.equal(await modal.locator('.action-menu > button').filter({hasText:'Indomitable'}).count(),0);await page.keyboard.press('Escape');
  await switchTo(soldier.id);await choose('Indomitable');assert((await modal.innerText()).includes('1 / 1'));await modal.locator('[type="submit"]').click();await settle();x=await saved();assert.equal(x.condition,0);assert.deepEqual(x.recovery.persistent,['other']);assert.equal(x.recovery.indomitableSpent,1);assert(!x.actionState.forceSpent);
  await page.reload();await page.locator('#module-actions').waitFor();await page.locator('[data-turn-next]').click();await choose('Indomitable');assert(await modal.locator('[type="submit"]').isDisabled());assert((await modal.locator('[data-action-error]').innerText()).includes('daily uses'));await page.keyboard.press('Escape');
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});await choose('Indomitable');assert(await modal.isVisible());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/condition-recovery-'+browser.browserType().name()+'-mobile.png')});await page.keyboard.press('Escape');
  // Warm the shell, then verify a fresh character can recover during a real outage.
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await context.setOffline(true);}
  await page.reload();await page.locator('#module-actions').waitFor();await switchTo(other.id);
  // Check an offline import of a fresh recovery character, through the same user file input.
  const fresh={...c,id:crypto.randomUUID(),name:'Offline Equilibrium'};const input=page.locator('input[type="file"]').first();await input.setInputFiles({name:'recovery.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fresh))});await settle();assert.equal((await saved()).name,fresh.name);
  await choose('Equilibrium');await modal.locator('[type="submit"]').click();await settle();x=await saved();assert.equal(x.condition,0);assert.equal(x.forcePoints,fp-1);assert.deepEqual(x.recovery.persistent,[]);validateCharacter(x,pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await context.close();}
 console.log('Browser: Equilibrium and Indomitable source, queue previews, tracked costs, persistent conditions, daily spending, reload, character isolation and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
