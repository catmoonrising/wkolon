const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:soldier'});
 c.name='Passive defenses';c.species='species:gungan';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:13,int:12,wis:12,cha:12};c.levels[0].feats=[{id:'feat:warrior-heritage'}];
 for(const feats of [[],[{id:'feat:poison-resistance'}]])c.levels.push({classId:'class:soldier',hpRoll:5,feats,talent:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});c.inventory=[{id:'equipment:cesta',uid:crypto.randomUUID(),quantity:1,equipped:false,twoHanded:false,attackMod:0,damageMod:0}];validateCharacter(c,pack);const initial=derive(c,pack);
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await ctx.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),value=k=>page.locator(`[data-defense="${k}"]`).textContent().then(Number);
 try{
  await page.goto(base);await page.locator('#module-defenses').waitFor();assert.equal(await value('fortitude-poison'),initial.defenses.fortitude+5);assert.match(await page.locator('#module-defenses').innerText(),/Fortitude vs\. Poison/);assert.equal(await value('will'),initial.defenses.will);
  await page.locator('#module-inventory details').evaluateAll(rows=>rows.forEach(d=>d.open=true));await page.locator('[data-inventory="equipped"][data-index="0"]').check();await settle();assert.equal(await value('will'),initial.defenses.will+2);
  await page.locator('#print').click();const block=await page.locator('#stat-block-text').inputValue();assert.match(block,/vs\. Poison/);assert(!/[—·]/.test(block));await page.locator('#stat-block-close').click();
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('#module-defenses').screenshot({path:path.join(root,'.build/passive-defenses-'+browser.browserType().name()+'-mobile.png')});
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await page.locator('#module-defenses').waitFor();assert.equal(await value('will'),initial.defenses.will+2);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Poison Resistance conditional Fortitude row, Warrior Heritage wielded Cesta Will bonus, print and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
