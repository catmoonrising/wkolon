const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),creation=require('./creator-actions.cjs');
module.exports=async(browser,base,root,transport)=>{
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),{derive}=await import('../src/rules.js');
 const stored=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);}),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 const chooseSpecies=async id=>{await creation.tab(page,'species');await page.locator('#species-search').fill(id);await page.locator('[data-select-species="species:'+id+'"]').click();};
 try{
  await page.goto(base+'#creation');await page.locator('.level-plan').waitFor();await creation.chooseClass(page,'class:noble');await creation.tab(page,'abilities');for(const [i,a]of ['str','dex','con','int','wis','cha'].entries())await page.locator('[data-generation-assign="'+a+'"]').selectOption(String(i));
  await creation.tab(page,'skills');assert(await page.locator('[data-trained="skill:stealth"]').isDisabled());
  for(const [id,skills]of [['anzati',['stealth','survival']],['cathar',['climb','stealth']],['nosaurian',['climb']],['nyriaanan',['survival']],['shistavanen',['survival']],['yarkora',['gather-information']]]){
   await chooseSpecies(id);await creation.tab(page,'skills');for(const skill of skills)assert(await page.locator('[data-trained="skill:'+skill+'"]').isEnabled(),id+' '+skill);
  }
  await chooseSpecies('anzati');await creation.tab(page,'skills');await page.locator('[data-trained="skill:stealth"]').check();await settle();assert(derive(await stored(),pack).ctx.trained.has('skill:stealth'));
  await chooseSpecies('human');await settle();assert(!derive(await stored(),pack).ctx.trained.has('skill:stealth'));await chooseSpecies('anzati');await settle();assert(derive(await stored(),pack).ctx.trained.has('skill:stealth'));
  await chooseSpecies('cathar');await creation.tab(page,'species');await page.locator('[data-species-detail="species:cathar"]').click();assert((await page.locator('#species-description-cathar').innerText()).includes('Reactive Claw'));assert.equal(await page.locator('#module-speed .stat-big').innerText(),'8');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/species-class-skills-'+browser.browserType().name()+'-mobile.png')});
  await settle();await page.reload();await page.locator('.level-plan').waitFor();assert.equal((await stored()).species,'species:cathar');await creation.tab(page,'skills');assert(await page.locator('[data-trained="skill:climb"]').isEnabled());
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await context.setOffline(true);await page.reload();await page.locator('.level-plan').waitFor();await creation.tab(page,'skills');assert(await page.locator('[data-trained="skill:stealth"]').isEnabled());}
  assert.deepEqual(errors,[]);console.log('Browser: six species with class skills, vertical skill availability/training, species replay, exact source text, speed, saved choice and mobile'+(base.startsWith('https:')?' / offline':'')+' passed');
 }finally{if(transport)await transport.online();await context.close();}
};
