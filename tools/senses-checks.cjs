const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),{newCharacter,derive,validateCharacter}=await import('../src/rules.js');
 const ordinary=newCharacter(pack,{classId:'class:scout'});ordinary.name='Ordinary vision';
 const low=newCharacter(pack,{classId:'class:scout'});low.name='Low light';low.species='species:gungan';
 const dark=newCharacter(pack,{classId:'class:scout'});dark.name='Darkvision';dark.species=pack.species.find(s=>s.vision==='darkvision').id;
 const blind=newCharacter(pack,{classId:'class:scout'});blind.name='Blinded';blind.inventory=[{id:'equipment:blinding-helmet',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];assert(derive(blind,pack).blind);
 const characters=[ordinary,low,dark,blind];characters.forEach(c=>validateCharacter(c,pack));const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(characters=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:characters[0].id,characters}));},characters);
 const senses=page.locator('#module-senses'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 const roster=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters);
 async function menu(){if(!await page.locator('#lay-modules').evaluate(el=>el.open))await page.locator('#lay-modules > summary').click();}
 async function show(on){await menu();await page.locator('[data-module-visibility="senses"]').setChecked(on);await page.locator('#lay-modules > summary').click();}
 async function character(c){await page.locator('[data-character="'+c.id+'"]').click();await settle();}
 try{
  await page.goto(base);await page.locator('#module-header').waitFor();await settle();const before=await roster();assert(await senses.isHidden());
  await show(true);assert.equal(await senses.locator('.lay-body').innerText(),'Normal Vision');await settle();await page.reload();await senses.waitFor();assert.equal(await senses.locator('.lay-body').innerText(),'Normal Vision');
  await character(low);assert.equal(await senses.locator('.lay-body').innerText(),'Low-Light Vision');await show(false);await character(dark);assert(await senses.isHidden());
  await menu();await page.locator('#lay-module-auto').click();await page.locator('#lay-modules > summary').click();await senses.waitFor();assert.equal(await senses.locator('.lay-body').innerText(),'Darkvision');
  await character(blind);assert.equal(await senses.locator('.lay-body').innerText(),'Blinded');assert(derive((await roster()).find(c=>c.id===blind.id),pack).blind);
  await senses.locator('.lay-collapse-btn').click();assert(await senses.evaluate(el=>el.classList.contains('lay-collapsed')));await character(low);assert(await senses.evaluate(el=>el.classList.contains('lay-collapsed')));await senses.locator('.lay-collapse-btn').click();
  await character(ordinary);assert(await senses.isHidden());await character(low);assert(await senses.isVisible());assert.deepEqual(await roster(),before);
  await page.locator('#print').click();assert((await page.locator('#stat-block-text').inputValue()).includes('Low-Light Vision'));await page.locator('#stat-block-close').click();
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await senses.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'.build/senses-'+browser.browserType().name()+'-mobile.png')});
  await page.evaluate(async()=>{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;});await page.waitForFunction(()=>navigator.serviceWorker.controller);await settle();
  if(transport)await transport.offline();else await context.setOffline(true);
  await page.reload();await senses.waitFor();assert.equal(await senses.locator('.lay-body').innerText(),'Low-Light Vision');await character(ordinary);assert(await senses.isHidden());await show(true);assert.equal(await senses.locator('.lay-body').innerText(),'Normal Vision');await page.reload();await senses.waitFor();assert.equal(await senses.locator('.lay-body').innerText(),'Normal Vision');assert.deepEqual(await roster(),before);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await context.close();}
 console.log('Browser: Senses real species/armor, automatic relevance, visibility overrides, folds, roster isolation, printing, persistence, mobile and offline passed');
};
