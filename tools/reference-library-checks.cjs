const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
module.exports=async(browser,base,root,transport={})=>{
 const index=JSON.parse(fs.readFileSync(path.join(root,'data/reference-index.json')));
 const record=index.records.find(r=>r.name==='Acclamator II-Class Assault Ship');
 assert(record,'Official starship reference must be imported');
 const article=JSON.parse(fs.readFileSync(path.join(root,record.path)));
 const context=await browser.newContext({viewport:{width:1280,height:900}});
 const page=await context.newPage();page.setDefaultTimeout(30000);
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('data/reference'))requests.push(r.url());});
 try{
  await page.goto(base);await page.locator('#module-hp').waitFor();
  assert.equal(requests.length,0,'Sheet startup must not download the library');
  await page.locator('[data-field="name"]').first().fill('Reference reader');await page.locator('[data-field="name"]').first().press('Tab');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')||'null')?.characters[0]?.name==='Reference reader');
  const before=await page.evaluate(()=>localStorage.getItem('wkolon-roster-v1'));
  await page.locator('footer a[href="#rules"]').click();
  await page.locator('#rules-book').waitFor();
  assert(requests.some(url=>url.endsWith('reference-index.json')));
  assert.equal(requests.filter(url=>/reference\/[a-f0-9]{64}\.json/.test(url)).length,0);
  const editor=page.locator('#creator-modal');
  assert.equal(await editor.locator('#rules-results tbody tr').count(),100,'Pagination bounds initial DOM size');
  await editor.locator('[data-rules-page="next"]').click();
  assert((await editor.locator('#rules-results [role="status"]').innerText()).startsWith('101–'));
  await editor.locator('#rules-search').fill(record.name);
  const link=editor.locator(`[data-rule-reference="${record.id}"]`);await link.waitFor();
  assert.equal(await link.count(),1); // Full-text search also finds pages mentioning this ship.
  await link.click();await page.locator('#rule-detail-body .wiki-article').waitFor();
  assert.equal(await page.locator('#rule-detail-title').innerText(),record.name);
  assert((await page.locator('#rule-detail-body').innerText()).includes('Reference Book'));
  assert((await page.locator('#rule-detail-body').innerText()).includes(String(record.source.revision)));
  // The graph/core options are not touched by reading an imported starship.
  assert.equal(await page.evaluate(()=>localStorage.getItem('wkolon-roster-v1')),before);
  const inline=page.locator('#rule-detail-body [data-rule-reference]').first();
  if(await inline.count()){
   const id=await inline.getAttribute('data-rule-reference'),target=index.records.find(r=>r.id===id);
   assert(target);await inline.click();await page.waitForFunction(name=>document.getElementById('rule-detail-title').textContent===name&&document.querySelector('#rule-detail-body .wiki-article'),target.name);
  }
  await page.locator('#rule-detail-close').click();
  await editor.locator('#rules-book').selectOption(record.books[0]);
  assert.equal(await link.count(),1);
  await editor.locator('#rules-builder-only').check();assert.equal(await link.count(),1,'Reviewed vehicle remains available in the builder filter');
  await editor.locator('#rules-builder-only').uncheck();
  await page.setViewportSize({width:390,height:844});
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});
  await page.screenshot({path:path.join(root,'.build/reference-library-mobile.png')});
  await link.click();await page.locator('#rule-detail-body .wiki-article').waitFor();
  await page.screenshot({path:path.join(root,'.build/reference-article-mobile.png')});
  await page.locator('#rule-detail-close').click();
  if(base.startsWith('https:')){
   await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);
   await page.waitForFunction(async()=>{const names=await caches.keys();return (await Promise.all(names.filter(n=>n.startsWith('wkolon-')).map(async n=>Boolean(await (await caches.open(n)).match(new URL('data/reference-index.json',location.href)))))).some(Boolean);});
   await context.setOffline(true);await transport.offline?.();await page.reload();await page.locator('#rules-book').waitFor();
   await page.locator('#rules-search').fill(record.name);
   await page.locator(`[data-rule-reference="${record.id}"]`).click();await page.locator('#rule-detail-body .wiki-article').waitFor();
   assert.equal(await page.locator('#rule-detail-title').innerText(),record.name);
   await page.locator('#rule-detail-close').click();
   const unopened=index.records.find(r=>!requests.some(url=>url.endsWith(r.path)));
   await page.locator('#rules-search').fill(unopened.name);
   await page.locator(`[data-rule-reference="${unopened.id}"]`).first().click();
   await page.locator('#rule-detail-body [role="alert"]').waitFor();
   assert((await page.locator('#rule-detail-body').innerText()).includes('retry'));
   await transport.online?.();await context.setOffline(false);await page.locator('#rule-detail-body button').click();await page.locator('#rule-detail-body .wiki-article').waitFor();
  }
  assert.deepEqual(errors,[]);
  console.log('Browser: lazy official reference imports, full-text search, pagination, source filters, local wiki links, revision attribution, read-only character state, Dracula mobile'+(base.startsWith('https:')?', offline opened pages and retry':'')+' passed');
 }catch(error){console.error('Reference browser state:',await page.locator('#rule-detail-title').innerText().catch(()=>''),(await page.locator('#rule-detail-body').innerText().catch(()=>'')).slice(0,1000));throw error;}finally{await context.close();}
};
