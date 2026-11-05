const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const rules=await import('../src/rules.js'),profiles=await import('../src/ability-profiles.js'),generation=await import('../src/ability-generation.js'),species=await import('../src/species-choices.js'),installation=await import('../src/droid-installation.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./encounter-reaction-fixtures.cjs')(pack,{...rules,...profiles,...generation,...species,...installation});
 const c=make.lucky(),droid=make.droid(),start=rules.derive(c,pack).defenses,droidStart=rules.derive(droid,pack).defenses,ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c,droid]});
 const value=k=>page.locator(`[data-defense="${k}"]`).innerText().then(Number),saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 const modal=page.locator('#actions-modal');
 const close=async()=>{if(await page.locator('#roll-mirror-close').isVisible())await page.locator('#roll-mirror-close').click();};
 const submit=async name=>{const trigger=modal.locator('[data-action-option="trigger"]');if(await trigger.count())await trigger.fill(name);await modal.locator('[type="submit"]').click();await settle();await close();};
 const pick=async name=>{await page.locator('[data-action-menu="reaction"]').click();await modal.locator('.action-menu > button').filter({hasText:name}).click();};
 try{
  await page.goto(base);await page.locator('#module-actions').waitFor();
  await pick('Better Lucky than Dead');await modal.locator('[data-action-option="defense"]').selectOption('will');const trigger=modal.locator('[data-action-option="trigger"]');if(await trigger.count())await trigger.fill('Attack');await modal.locator('[type="submit"]').click();await settle();
  assert.equal(await value('will'),start.will+5);assert.equal(await value('reflex'),start.reflex);
  const s=await saved();assert.deepEqual(s.defenseReactionsUsed,['better-lucky-than-dead']);assert.equal(s.defenseReactions[0].defense,'will');
  await page.reload();await page.locator('#module-actions').waitFor();assert.equal(await value('will'),start.will+5);
  const actions=page.locator('#module-actions');
  await actions.locator('[data-turn-next]').click();await settle();assert.equal(await value('will'),start.will);
  const fp=(await saved()).forcePoints;await pick('Brilliant Defense');await submit('Brilliant');assert.equal(await value('reflex'),start.reflex+3);
  await pick('Indomitable Personality');await submit('Personality');assert.equal(await value('will'),start.will+3);assert.equal((await saved()).forcePoints,fp);
  await actions.locator('[data-turn-end]').click();await settle();assert.equal(await value('reflex'),start.reflex+3);assert.equal(await value('will'),start.will+3);
  await actions.locator('[data-turn-next]').click();await settle();assert.equal(await value('reflex'),start.reflex);assert.equal(await value('will'),start.will+3);
  await actions.locator('[data-turn-end]').click();await settle();assert.equal(await value('will'),start.will);
  const human=await saved();assert.equal(human.defenseReactions,undefined);assert.deepEqual([...human.defenseReactionsUsed].sort(),['better-lucky-than-dead','brilliant-defense','indomitable-personality']);
  await actions.locator('[data-combat-end]').click();await settle();assert.equal((await saved()).defenseReactionsUsed,undefined);
  await page.locator('[data-character="'+droid.id+'"]').click();await settle();await pick('Logic Upgrade: Self Defense');assert.equal(await modal.locator('[data-action-option="defense"] option').count(),3);await modal.locator('[data-action-option="defense"]').selectOption('fortitude');await submit('Droid attack');
  assert.equal(await value('fortitude'),droidStart.fortitude+2);assert.equal(await value('reflex'),droidStart.reflex);assert.deepEqual((await saved()).defenseReactionsUsed,['logic-upgrade-self-defense']);
  await page.reload();await actions.waitFor();assert.equal(await value('fortitude'),droidStart.fortitude+2);assert.deepEqual(rules.derive(await saved(),pack).issues,[]);
  if(transport){if(transport.prime)await transport.prime(page);await transport.offline();await page.reload();await actions.waitFor();assert.equal(await value('fortitude'),droidStart.fortitude+2);await transport.online();}
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#module-defenses').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(root,'.build/encounter-reactions-'+browser.browserType().name()+'-mobile.png')});assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: all four encounter Defense reactions, legal Droid choices, own/off-turn expiry, spent ledger/reset, unchanged Force Points, save/reload and Dracula mobile passed');
};
