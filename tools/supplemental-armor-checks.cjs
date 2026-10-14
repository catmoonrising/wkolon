const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),{newCharacter}=await import('../src/rules.js');
 const c=newCharacter(pack);c.name='Armor tester';c.abilityMethod='manual';c.abilities={str:14,dex:18,con:12,int:12,wis:10,cha:10};c.levels[0].classId='class:soldier';c.levels[0].feats=[{id:'feat:armor-proficiency-heavy'}];c.credits=250000;c.currentHP=100;c.inventory=[];
 const roster={schemaVersion:1,activeId:c.id,characters:[c]},context=await browser.newContext({viewport:{width:1280,height:1000}});
 await context.addInitScript(({roster})=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{roster});
 const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const settle=()=>page.waitForFunction(()=>document.getElementById('save-status').textContent==='Saved');
 const index=async id=>(await saved()).inventory.findIndex(e=>e.id==='equipment:'+id);
 const skill=async name=>Number(await page.locator('#module-skills [data-roll-label="'+name+'"]').getAttribute('data-roll'));
 async function buy(id,owned=false){await page.locator('#purchase-item').selectOption('equipment:'+id);await page.locator(owned?'#purchase [data-action="add-gear"]':'#purchase button[type="submit"]').click();await settle();const state=await saved();for(const [i,e]of state.inventory.entries())if(pack.equipment.find(r=>r.id===e.id)?.kind==='armor'&&!e.equipped&&e.carried!==false){await page.locator(`[data-inventory="carried"][data-index="${i}"]`).uncheck();await settle();}}
 const hp=()=>page.locator('#hp-cur').inputValue();
 try{
  await page.goto(base);await page.locator('#module-hp').waitFor();await page.locator('#equipment-catalog > summary').click();
  await buy('camo-armor');const camo=await index('camo-armor');await page.locator(`#armor-checks-${camo} > summary`).click();
  await page.locator('[data-armor-check="hiding"]').check();await settle();
  assert.equal(await skill('Stealth'),14);
  await buy('thinsuit');assert.equal(await page.locator('[data-inventory="equipped"]:checked').count(),2);
  assert.equal(await page.locator('[data-defense="reflex"]').innerText(),'19');
  await buy('darth-revan-s-armor',true);assert.equal(await page.locator('[data-defense="reflex"]').innerText(),'22');
  await buy('katarn-class-commando-armor');assert.equal(await skill('Perception'),2);
  await buy('blinding-helmet');await buy('blaster-pistol');
  assert((await page.locator('#module-attacks').innerText()).includes('Total Concealment'));
  await page.locator('#module-attacks #attack-target > summary').click();await page.locator('#module-attacks [data-attack-target="attackSquare"]').check();await settle();
  const mask=await index('blinding-helmet');await page.locator(`[data-inventory="carried"][data-index="${mask}"]`).uncheck();await settle();
  await buy('orbalisk-armor',true);assert((await page.locator('#module-hp .dr-bar').innerText()).includes('10'));
  await page.locator('#armor-dr-sources > summary').click();await page.locator('[data-field="protection.dr"]').fill('15');await page.locator('[data-field="protection.dr"]').press('Tab');await settle();
  await page.locator('#hp-damage-controls > summary').click();await page.locator('[data-incoming-damage]').fill('20');await page.locator('[data-damage-lightsaber]').check();await page.locator('#apply-damage button').click();await settle();assert.equal(await hp(),'90');
  if(await page.locator('#roll-mirror').isVisible().catch(()=>false))await page.locator('#roll-mirror-close').click();
  await buy('microbe-armor');await page.locator('[data-field="protection.dr"]').fill('0');await page.locator('[data-field="protection.dr"]').press('Tab');await settle();
  await page.locator('[data-incoming-damage]').fill('20');await page.locator('[data-damage-energy]').check();await page.locator('#apply-damage button').click();await settle();assert.equal(await hp(),'72');
  if(await page.locator('#roll-mirror').isVisible().catch(()=>false))await page.locator('#roll-mirror-close').click();
  await buy('medium-pressure-suit');assert.equal(await page.locator('#module-speed .stat-big').innerText(),'3');
  await page.locator('#condition-effect button[data-condition-step="4"]').click();await settle();assert.equal(await page.locator('#module-speed .stat-big').innerText(),'1');
  await buy('zero-gravity-stormtrooper-armor');assert.equal(await page.locator('#purchase [data-shop-field="armorSize"] option').count(),1);assert.equal(await page.locator('#module-speed .stat-big').innerText(),'2');
  await page.locator(`#module-inventory [data-inventory="carried"][data-index="${await index('zero-gravity-stormtrooper-armor')}"]`).uncheck();await settle();
  await page.locator(`[data-inventory="carried"][data-index="${await index('medium-pressure-suit')}"]`).check();await page.locator(`[data-inventory="equipped"][data-index="${await index('medium-pressure-suit')}"]`).check();await settle();
  await page.reload();await page.locator('#module-speed').waitFor();assert.equal(await page.locator('#module-speed .stat-big').innerText(),'1');assert.equal((await saved()).armorChecks.hiding,true);
  await page.locator('#print').click();assert((await page.locator('#stat-block-text').inputValue()).includes('Medium Pressure Suit'));await page.locator('#stat-block-close').click();
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});await page.locator('#module-inventory').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(root,'.build/supplemental-armor-mobile.png')});
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await context.setOffline(true);await page.reload();await page.locator('#module-speed').waitFor();assert.equal(await page.locator('#module-speed .stat-big').innerText(),'1');const gear=page.locator('#module-inventory .rules-ref-detail').filter({has:page.locator('summary',{hasText:'Medium Pressure Suit'})}).first();await gear.locator('summary').click();assert((await gear.innerText()).includes('reduces'));}
  assert.deepEqual(errors,[]);console.log('Browser: supplemental armor purchases, tandem items, conditions, Heavy-specific helmet bonuses, blind targeting, sourced DR and Lightsaber bypass, Energy damage, pressure/condition movement, persistence, stat blocks, Dracula mobile'+(base.startsWith('https:')?' and offline':'')+' passed');
 }finally{await context.close();}
};
