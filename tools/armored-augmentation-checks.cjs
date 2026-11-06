const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const api=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),f=require('./armored-augmentation-fixtures.cjs')(pack,api),knight=f.knight(),vital=f.vital();
 knight.inventory.push(f.item('battle-armor',{equipped:false}));f.finish(knight);const initial=api.derive(knight,pack),ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await ctx.addInitScript(characters=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:characters[0].id,characters}));},[knight,vital]);
 const actions=page.locator('#module-actions'),inventory=page.locator('#module-inventory'),modal=page.locator('#actions-modal');
 const saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 const reveal=async field=>{await field.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});};
 const closeRoll=async()=>{if(await page.locator('#roll-mirror-close').isVisible())await page.locator('#roll-mirror-close').click();};
 const pick=async(type,name)=>{await actions.locator('[data-action-menu="'+type+'"]').click();await modal.locator('.action-menu > button').filter({hasText:name}).click();};
 const submit=async()=>{await modal.locator('[type="submit"]').click();await settle();await closeRoll();};
 const equipped=i=>inventory.locator('[data-inventory="equipped"][data-index="'+i+'"]');
 const setEquipped=async(i,value)=>{await reveal(equipped(i));await equipped(i).setChecked(value);await settle();};
 const select=async c=>{await page.locator('[data-character="'+c.id+'"]').click();await settle();};
 const hpGrant=()=>page.locator('[data-combat="declared-bonus-hp"][data-grant="vital-encouragement"]');
 const newEncounter=async()=>{const b=page.locator('[data-recovery="encounter"]');await reveal(b);await b.click();await settle();await closeRoll();};
 try{
  await page.goto(base);await actions.waitFor();await settle();await pick('swift','Armored Augmentation');assert.equal(await modal.locator('[data-action-option="armorUid"]').inputValue(),knight.inventory[0].uid);await submit();
  let c=await saved();assert.deepEqual(c.talentActivations,[{id:'talent:armored-augmentation-i',choice:'threshold',armorUid:knight.inventory[0].uid}]);assert.deepEqual(c.actionState.spent,['swift']);assert.equal(c.forcePoints,knight.forcePoints-1);assert.equal(api.derive(c,pack).threshold,initial.threshold+initial.armor.armorBonus);
  const dr=2*initial.armor.fortitudeBonus;assert.equal(Number(await page.locator('.dr-bar .derived').first().innerText()),dr);
  const damage=page.locator('#apply-damage');await reveal(damage);await damage.locator('[data-incoming-damage]').fill('12');await damage.locator('[type="submit"]').click();await closeRoll();await settle();assert.equal((await saved()).currentHP,c.currentHP-(12-dr));
  await page.reload();await actions.waitFor();await settle();assert.equal(api.derive(await saved(),pack).normalProtection.dr,dr);
  await setEquipped(0,false);await setEquipped(2,true);assert.equal(api.derive(await saved(),pack).threshold,initial.threshold);assert.equal(api.derive(await saved(),pack).normalProtection.dr,0);
  await page.reload();await actions.waitFor();assert.equal(api.derive(await saved(),pack).normalProtection.dr,0);await setEquipped(2,false);await setEquipped(0,true);assert.equal(api.derive(await saved(),pack).normalProtection.dr,dr);
  await actions.locator('[data-turn-next]').click();await settle();assert.equal(api.derive(await saved(),pack).normalProtection.dr,dr);await newEncounter();assert.equal(api.derive(await saved(),pack).normalProtection.dr,0);
  await setEquipped(0,false);await pick('swift','Armored Augmentation');assert(await modal.locator('[type="submit"]').isDisabled());assert.match(await modal.locator('[data-action-error]').innerText(),/armor/);await page.locator('#actions-close').click();await setEquipped(0,true);await pick('swift','Armored Augmentation');await submit();

  await select(vital);assert.equal(await hpGrant().count(),1);const hp=page.locator('#hp-cur');await hp.fill('0');await hp.blur();await settle();assert.equal(await hpGrant().count(),0);await hp.fill(String(vital.currentHP));await hp.blur();await settle();assert.equal(await hpGrant().count(),1);
  await page.locator('#condition-effect [data-condition-step="5"]').first().click();await settle();assert.equal(await hpGrant().count(),0);await page.locator('#condition-effect [data-condition-step="0"]').first().click();await settle();
  const flat=page.locator('[data-flat-footed]');await flat.check();await settle();assert.equal(await hpGrant().count(),0);await flat.uncheck();await settle();
  await actions.locator('[data-turn-next]').click();await settle();await actions.locator('[data-turn-end]').click();await settle();assert.equal(await hpGrant().count(),0);await actions.locator('[data-turn-next]').click();await settle();
  for(let i=0;i<2;i++){await pick('free','Vital Encouragement');await modal.locator('[data-action-queue]').click();await settle();}
  c=await saved();assert.equal(c.bonusHP,undefined);assert.equal(c.actionState.plan.length,2);assert.match(await actions.locator('.turn-plan > li').last().innerText(),/unavailable/);
  await actions.locator('[data-turn-edit]').first().click();await submit();c=await saved();assert.equal(c.bonusHP,10);assert.deepEqual(c.bonusHPGrantsUsed,['vital-encouragement']);assert.deepEqual(c.actionState.spent,[]);assert.equal(c.forcePoints,vital.forcePoints);assert.equal(c.actionState.plan[0].status,'done');assert.equal(c.actionState.plan[1].status,'queued');assert.equal(await hpGrant().count(),0);
  await actions.locator('[data-turn-delete]').click();await settle();await page.reload();await actions.waitFor();assert.deepEqual((await saved()).bonusHPGrantsUsed,['vital-encouragement']);
  const dead=page.locator('[data-recovery-dead]');await reveal(dead);await dead.check();await settle();assert.equal((await saved()).bonusHP,undefined);assert.deepEqual((await saved()).bonusHPGrantsUsed,['vital-encouragement']);await dead.uncheck();await settle();const healing=page.locator('#recovery-healing');await reveal(healing);await healing.locator('[data-received-healing]').fill(String(vital.currentHP));await healing.locator('[type="submit"]').click();await settle();await closeRoll();assert.equal((await saved()).condition,4);assert.equal(await hpGrant().count(),0);
  await newEncounter();await hpGrant().click();await settle();await closeRoll();assert.equal((await saved()).bonusHP,10);assert.equal((await saved()).actionState.plan.at(-1).action,'vital-encouragement');
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});await page.locator('#module-hp').scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/augmentation-'+browser.browserType().name()+'-mobile.png')});
  if(transport){if(transport.prime)await transport.prime(page);await transport.offline();await page.reload();await actions.waitFor();assert.deepEqual((await saved()).bonusHPGrantsUsed,['vital-encouragement']);await select(knight);assert.equal(api.derive(await saved(),pack).normalProtection.dr,dr);await setEquipped(0,false);await page.reload();await actions.waitFor();assert.equal(api.derive(await saved(),pack).normalProtection.dr,0);await setEquipped(0,true);assert.equal(api.derive(await saved(),pack).normalProtection.dr,dr);await transport.online();}
  api.validateCharacter(await saved(),pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: legal armor and Guardian Spirit builds, real costs/selection/damage/suit swap, free menu/queue/HP button, incapacity/offturn, death ledger, save/reload and Dracula mobile'+(transport?' / refused offline':'')+' passed');
};
