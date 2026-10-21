const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const {newCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json')));
 const c=newCharacter(pack,{classId:'class:soldier'});
 const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage(),errors=[];
 page.setDefaultTimeout(12000);
 page.on('pageerror',e=>errors.push(e.message));
 await context.addInitScript(c=>localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]})),c);
 const panel=page.locator('#actions-modal'),menu=panel.locator('.action-menu'),button=page.locator('[data-action-menu="move"]');
 const bounds=()=>panel.boundingBox();
 async function inside(){await page.waitForFunction(()=>{const r=document.querySelector('#actions-modal').getBoundingClientRect();return r.x>=7&&r.y>=7&&r.right<=innerWidth-7&&r.bottom<=innerHeight-7;});}
 try{
  await page.goto(base);await button.waitFor();
  for(const type of ['full','standard','move','swift','free','reaction']){
   const opener=page.locator(`[data-action-menu="${type}"]`);await opener.scrollIntoViewIfNeeded();const r=await opener.boundingBox(),point={x:r.x+6,y:r.y+6};
   await opener.click({position:{x:6,y:6}});await panel.waitFor();await inside();
   assert(await panel.evaluate(el=>el.matches(':popover-open')));
   assert.equal(await page.locator('dialog:modal').count(),0);
   const box=await bounds();assert(box.x<=point.x+3&&box.y<=point.y+3);
   assert(box.width<550,'Action list should fit its contents');
   await page.keyboard.press('Escape');assert(!await panel.isVisible());assert(await opener.evaluate(el=>document.activeElement===el));
  }
  await button.focus();await page.keyboard.press('Enter');await panel.waitFor();await inside();
  assert(await menu.locator('button').first().evaluate(el=>document.activeElement===el));
  await page.keyboard.press('End');assert(await menu.locator('button').last().evaluate(el=>document.activeElement===el));
  await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');assert(await menu.locator('button').nth(1).evaluate(el=>document.activeElement===el));
  await menu.locator('button').filter({hasText:/^Other/}).click();await panel.locator('[data-action-option="note"]').waitFor();await inside();
  assert(await panel.locator('[data-action-option="note"]').evaluate(el=>document.activeElement===el));
  await panel.locator('[data-action-back]').click();await menu.waitFor();
  await menu.locator('button').filter({hasText:/^Move/}).first().click();
  await panel.locator('[data-action-option="path.path.squares"]').fill('3');
  await panel.locator('[data-rule-page]').first().click();await page.locator('#rule-detail-modal').waitFor();await page.locator('#rule-detail-close').click();assert(await panel.isVisible());assert.equal(await panel.locator('[data-action-option="path.path.squares"]').inputValue(),'3');
  await panel.locator('[data-action-back]').click();await menu.waitFor();
  await page.mouse.click(2,2);assert(!await panel.isVisible());
  await page.locator('#roll-mirror-close').click();
  // Place a real opener at the lower-right edge to exercise clamping after each content change.
  await button.evaluate(el=>{el.style.position='fixed';el.style.right='8px';el.style.bottom='45px';el.style.zIndex='2147483640';});
  await button.click();await inside();await menu.locator('button').filter({hasText:/^Move/}).first().click();await inside();
  await page.keyboard.press('Escape');
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});
  await page.setViewportSize({width:390,height:844});await button.click();await inside();
  await menu.locator('button').filter({hasText:/^Move/}).first().click();await inside();
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:path.join(root,'.build/action-context-'+browser.browserType().name()+'-mobile.png')});
  await panel.locator('[data-action-back]').click();await inside();
  await page.screenshot({path:path.join(root,'.build/action-context-'+browser.browserType().name()+'-menu.png')});
  await page.keyboard.press('Escape');assert(!await panel.isVisible());assert.deepEqual(errors,[]);
 }catch(e){await page.screenshot({path:path.join(root,'.build/action-context-failure-'+browser.browserType().name()+'.png')});console.error('Panel debug',await page.evaluate(()=>({open:document.querySelector('#actions-modal')?.matches(':popover-open'),html:document.querySelector('#actions-body')?.innerHTML.slice(0,500),errors:document.querySelector('#message')?.textContent})));throw e;}finally{await context.close();}
 console.log('Browser: pointer action panels, all six menus, no modal backdrop, keyboard navigation, focus return, outside dismissal, edge clamping, growing forms and Dracula mobile passed');
};
