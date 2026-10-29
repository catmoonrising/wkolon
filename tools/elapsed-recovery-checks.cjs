const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const api=await import('../src/rules.js'),{takeAction}=await import('../src/action-engine.js'),{recoveryState}=await import('../src/recovery.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json')));
 for(const kind of ['first','retry','recuperate']){
  const c=require('./force-track-fixtures.cjs')(pack,api).adept(),p=api.derive(c,pack).forcePowers.find(p=>p.id==='power:force-track');takeAction(c,pack,'power',{powerId:p.copyId,action:'swift-action',fp:'none',enhance:false,effectDC:15,tracking:{quarry:'Mara'}},()=>({value:26,d20:[10],display:'26'}));
  c.farseeingFailures=[{id:crypto.randomUUID(),key:'mara',name:'Mara',rounds:14400}];
  c.recovery={...recoveryState(c),unconsciousRetry:kind==='retry'};if(kind==='recuperate'){c.condition=1;c.recovery.persistent=['rage'];}else{c.currentHP=0;c.condition=5;}api.validateCharacter(c,pack);
  const ctx=await browser.newContext(),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await ctx.addInitScript(c=>{localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));Math.random=()=>.999;},c);
  try{await page.goto(base);const details=page.locator(kind==='recuperate'?'#persistent-conditions':'#recovery-controls');await details.waitFor();if(await details.getAttribute('open')===null)await details.locator(':scope > summary').click();await page.locator(`[data-recovery="${kind==='recuperate'?'recuperate':'consciousness'}"]`).click();await page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');const x=await page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);assert.equal(x.farseeingFailures[0].rounds,14400-(kind==='retry'?600:kind==='recuperate'?100:10));if(kind==='retry')assert.equal(x.trackingPowerEffects,undefined);else assert.equal(x.trackingPowerEffects[0].rounds,kind==='first'?590:500);if(kind==='recuperate')assert(!x.recovery.persistent.includes('rage'));api.validateCharacter(x,pack);assert.deepEqual(errors,[]);}finally{await ctx.close();}
 }
 console.log('Browser: first/retry CON waits and ten-minute recuperation advance Force Track and Farseeing game time passed');
};
