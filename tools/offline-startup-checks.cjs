const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const api=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=require('./force-track-fixtures.cjs')(pack,api).adept();
 for(const kind of ['success','failure','late','controlled']){
  const ctx=await browser.newContext({serviceWorkers:'block'}),page=await ctx.newPage(),errors=[];page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));let releaseCore,navigations=0;const coreGate=new Promise(r=>releaseCore=r),started=page.waitForRequest(r=>r.url().endsWith('/data/core.json'));
  await ctx.addInitScript(({c,controlled})=>{
   if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));
   window.__registrations=[];window.__testController=controlled?{}:null;
   Object.defineProperty(navigator.serviceWorker,'controller',{configurable:true,get:()=>window.__testController});
   navigator.serviceWorker.register=()=>{window.__registrations.push({settled:document.documentElement.dataset.bootSettled,rendered:!!document.querySelector('#module-actions'),failed:document.querySelector('#save-status')?.textContent==='Sheet unavailable'});return Promise.resolve({waiting:null,addEventListener(){}});};
  },{c,controlled:kind==='controlled'});
  await ctx.route('https://startup.wkolon.test/**',async route=>{
   const url=new URL(route.request().url()),name=url.pathname.replace(/^\/wkolon\//,'')||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep))return route.fulfill({status:403,body:''});
   if(name==='index.html')navigations++;
   if(name==='data/core.json'){await coreGate;if(kind==='failure')return route.fulfill({status:503,body:'Unavailable'});}
   if(name==='src/offline.js'&&kind==='late')return route.fulfill({status:200,contentType:'text/javascript',body:''});
   try{await route.fulfill({status:200,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});}catch(e){if(!page.isClosed()&&!/closed|canceled|cancelled|interrupted/i.test(e.message))throw e;}
  });
  try{
   await page.goto('https://startup.wkolon.test/wkolon/',{waitUntil:'commit'});await started;
   if(kind!=='late')await page.waitForLoadState('domcontentloaded');
   assert.deepEqual(await page.evaluate(()=>window.__registrations),[]);assert.equal(await page.locator('#save-status').textContent(),'Loading');
   if(kind==='controlled'){
    const navigation=page.waitForEvent('framenavigated',f=>f===page.mainFrame());await page.evaluate(()=>navigator.serviceWorker.dispatchEvent(new Event('controllerchange')));await navigation;releaseCore();await page.waitForFunction(()=>document.querySelector('#save-status')?.textContent==='Saved');assert.equal(navigations,2);
   }else{
    if(kind==='success'){await page.evaluate(()=>{window.__testController={};navigator.serviceWorker.dispatchEvent(new Event('controllerchange'));});assert.equal(navigations,1);}
    releaseCore();await page.waitForFunction(failure=>document.querySelector('#save-status')?.textContent===(failure?'Sheet unavailable':'Saved'),kind==='failure');
    if(kind==='late'){assert.deepEqual(await page.evaluate(()=>window.__registrations),[]);assert.equal(await page.evaluate(()=>document.documentElement.dataset.bootSettled),'true');await page.addScriptTag({content:fs.readFileSync(path.join(root,'src/offline.js'),'utf8')});}
   }
   await page.waitForFunction(()=>window.__registrations.length===1);assert.deepEqual(await page.evaluate(()=>window.__registrations),[{settled:'true',rendered:kind!=='failure',failed:kind==='failure'}]);await page.evaluate(()=>{document.dispatchEvent(new Event('wkolon:boot-settled'));document.dispatchEvent(new Event('wkolon:boot-settled'));});assert.equal(await page.evaluate(()=>window.__registrations.length),1);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0].id),c.id);assert.deepEqual(errors,[]);
  }finally{releaseCore();await ctx.close();}
 }
 console.log('Browser: actual app/offline startup holds precache until success/failure, late script and repeat guards, first install and controlled update during pending rules passed');
};
