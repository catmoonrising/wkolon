const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./class-defense-fixtures.cjs')(pack,rules);
 const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
 const c=make.adept('empower-weapon');c.name='Empower Weapon';c.inventory=[item('lightsaber'),item('knife'),item('blaster-pistol')];rules.validateCharacter(c,pack);
 const initial=rules.derive(c,pack).attacks,ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),damage=uid=>page.locator(`[data-combat="attack"][data-attack-id="${uid}"]`).locator('xpath=ancestor::tr').locator('[data-damage]').innerText();
 const inventory=page.locator('#module-inventory .inventory-list'),saber=initial.find(a=>a.uid===c.inventory[0].uid);
 try{
  assert(saber.damageDisplay.startsWith('2d8'));  await page.goto(base);await page.locator('#module-attacks').waitFor();assert.equal(await damage(saber.uid),saber.damageDisplay);
  assert.equal(await inventory.locator('[data-inventory="empowered"][data-index="2"]').count(),0,'ranged weapons cannot be empowered');
  await inventory.locator('[data-inventory="empowered"][data-index="0"]').check();await settle();assert.equal(await damage(saber.uid),saber.damageDisplay.replace('2d8','3d8'));
  await page.reload();await page.locator('#module-attacks').waitFor();assert.equal(await damage(saber.uid),saber.damageDisplay.replace('2d8','3d8'));
  const saved=await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});assert.equal(saved.inventory[0].empowered,true);rules.validateCharacter(saved,pack);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Empower Weapon Lightsaber 2d8 to 3d8, melee-only control, reload, mobile passed');
};
