const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./class-defense-fixtures.cjs')(pack,rules);
 const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
 const c=make.adept('force-perception');c.name='Defensive Acuity';c.levels[6].talent={id:'talent:defensive-acuity'};c.inventory=[item('lightsaber'),item('knife')];rules.validateCharacter(c,pack);
 const initial=rules.derive(c,pack).attacks,saber=initial.find(a=>a.uid===c.inventory[0].uid),knife=initial.find(a=>a.uid===c.inventory[1].uid);
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const actions=page.locator('#module-actions'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),damage=uid=>page.locator(`[data-combat="attack"][data-attack-id="${uid}"]`).locator('xpath=ancestor::tr').locator('[data-damage]').innerText();
 const open=async()=>{if(!await page.locator('#defensive-options').evaluate(d=>d.open))await page.locator('#defensive-options > summary').click();},box=()=>page.locator('[data-triggered-defense="defensive-acuity"]');
 const next=async()=>{await actions.locator('[data-turn-next]').click();await settle();},end=async()=>{await actions.locator('[data-turn-end]').click();await settle();};
 try{
  assert(saber.damageDisplay.startsWith('2d8'));await page.goto(base);await actions.waitFor();assert.equal(await damage(saber.uid),saber.damageDisplay);
  await open();await box().check();await settle();assert.equal(await damage(saber.uid),saber.damageDisplay.replace('2d8','3d8'));assert.equal(await damage(knife.uid),knife.damageDisplay);
  await page.reload();await actions.waitFor();assert.equal(await damage(saber.uid),saber.damageDisplay.replace('2d8','3d8'));
  await next();assert.equal(await damage(saber.uid),saber.damageDisplay.replace('2d8','3d8'),'through your next turn');await end();assert.equal(await damage(saber.uid),saber.damageDisplay);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Defensive Acuity declared Fight Defensively trigger, Lightsaber 2d8 to 3d8, reload, next-turn expiry, mobile passed');
};
