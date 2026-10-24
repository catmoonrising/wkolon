const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {emptyActionState}=await import('../src/action-economy.js');
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:soldier'});
 c.name='Focused Warrior';c.abilityMethod='manual';c.abilities={str:14,dex:12,con:12,int:10,wis:12,cha:10};c.levels[0].talent={id:'talent:focused-warrior'};validateCharacter(c,pack);const initial=derive(c,pack);
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await ctx.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);
 const will=()=>page.locator('[data-defense="will"]').textContent().then(Number),box=()=>page.locator('[data-triggered-defense="focused-warrior"]'),ff=()=>page.locator('[data-flat-footed]');
 const open=async()=>{if(!await page.locator('#defensive-options').evaluate(d=>d.open))await page.locator('#defensive-options > summary').click();};
 try{
  await page.goto(base);await page.locator('#module-defenses').waitFor();await open();await box().check();await settle();assert.equal(await will(),initial.defenses.will+5);
  await ff().check();await settle();assert.equal((await saved()).triggeredDefenses,undefined);await ff().uncheck();await settle();assert.equal(await will(),initial.defenses.will,'not restored');
  await ff().check();await settle();await open();await box().click();await page.waitForFunction(()=>!document.querySelector('[data-triggered-defense="focused-warrior"]').checked);assert.match(await page.locator('#message').innerText(),/flat-footed/);assert.equal((await saved()).triggeredDefenses,undefined,'rejected while flat-footed');await ff().uncheck();await settle();
  await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));Object.assign(r.characters[0],{triggeredDefenses:['focused-warrior'],flatFooted:true});localStorage.setItem('wkolon-roster-v1',JSON.stringify(r));});
  await page.reload();await page.locator('#module-defenses').waitFor();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0].triggeredDefenses);
  await page.evaluate(state=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));Object.assign(r.characters[0],{triggeredDefenses:['focused-warrior'],flatFooted:false,actionState:state});localStorage.setItem('wkolon-roster-v1',JSON.stringify(r));},{...emptyActionState(),phase:'surprised',active:true});
  await page.reload();await page.locator('#module-defenses').waitFor();await page.waitForFunction(()=>!JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0].triggeredDefenses);assert.equal(await will(),initial.defenses.will,'Surprised independently removes the trigger');
  await page.evaluate(state=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));Object.assign(r.characters[0],{triggeredDefenses:['focused-warrior'],flatFooted:false,actionState:state});localStorage.setItem('wkolon-roster-v1',JSON.stringify(r));},{...emptyActionState(),phase:'aware',active:true});
  await page.reload();await page.locator('#module-defenses').waitFor();assert.equal(await will(),initial.defenses.will+5,'Aware alone preserves a newly declared trigger');await page.locator('#module-actions [data-turn-next]').click();await settle();assert.equal(await will(),initial.defenses.will,'New Turn expires the declaration');
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await page.locator('#module-defenses').waitFor();validateCharacter(await saved(),pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Focused Warrior loss on Flat-Footed, no restoration, flat-footed preflight, legacy load removal and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
