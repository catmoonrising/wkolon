const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./class-defense-fixtures.cjs')(pack,rules);
 const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:false,twoHanded:false,attackMod:0,damageMod:0});
 const c=make.adept('force-talisman',3);c.name='Force Talisman';c.levels[9].talent={id:'talent:greater-force-talisman'};c.inventory=[item('knife'),item('blaster-pistol')];rules.validateCharacter(c,pack);
 const base0=rules.derive(c,pack).defenses,ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),value=k=>page.locator(`[data-defense="${k}"]`).innerText().then(Number),saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const inventory=page.locator('#module-inventory .inventory-list'),select=i=>inventory.locator(`[data-inventory="talisman"][data-index="${i}"]`);
 const defenses=async()=>({reflex:await value('reflex'),fortitude:await value('fortitude'),will:await value('will')});
 try{
  await page.goto(base);await page.locator('#module-inventory').waitFor();assert.deepEqual(await defenses(),base0);
  await select(0).selectOption('will');await settle();assert.deepEqual(await defenses(),{...base0,will:base0.will+1});
  assert(await select(1).locator('option[value="reflex"]').evaluate(el=>el.disabled),'one Force Talisman');
  await select(1).selectOption('all');await settle();assert.deepEqual(await defenses(),{reflex:base0.reflex+1,fortitude:base0.fortitude+1,will:base0.will+1});
  await inventory.locator('article').nth(1).locator('[data-inventory="carried"]').uncheck();await settle();assert.deepEqual(await defenses(),{...base0,will:base0.will+1});
  await page.reload();await page.locator('#module-inventory').waitFor();assert.equal(await select(0).inputValue(),'will');assert.equal(await select(1).inputValue(),'all');assert.deepEqual(await defenses(),{...base0,will:base0.will+1});
  await select(0).selectOption('');await settle();const s=await saved();assert.equal(s.inventory[0].talisman,undefined);rules.validateCharacter(s,pack);assert.deepEqual(await defenses(),base0);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Force Talisman and Greater Force Talisman inventory designation, Force non-stacking, carried loss, reload, mobile passed');
};
