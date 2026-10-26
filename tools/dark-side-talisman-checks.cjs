const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),make=require('./class-defense-fixtures.cjs')(pack,rules);
 const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,carried:true,equipped:false,twoHanded:false,attackMod:0,damageMod:0});
 const c=make.adept('force-talisman',3);c.name='Dark Side Talisman';c.levels[9].talent={id:'talent:dark-side-talisman'};c.inventory=[item('knife'),item('blaster-pistol')];rules.validateCharacter(c,pack);
 const d=rules.derive(c,pack).defenses,ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),value=k=>page.locator(`[data-defense="${k}"]`).innerText().then(Number);
 const inventory=page.locator('#module-inventory .inventory-list'),select=(key,i)=>inventory.locator(`[data-inventory="${key}"][data-index="${i}"]`);
 try{
  await page.goto(base);await page.locator('#module-inventory').waitFor();assert.equal(await page.locator('[data-defense="will-light-side-powers"]').count(),0);
  assert.equal(await select('darkSideTalisman',0).locator('option[value="all"]').count(),0,'Greater not owned');
  await select('darkSideTalisman',0).selectOption('will');await settle();assert.equal(await value('will-light-side-powers'),d.will+2);assert.equal(await value('will'),d.will);
  assert(await select('darkSideTalisman',1).locator('option[value="reflex"]').evaluate(el=>el.disabled),'one Dark Side Talisman');
  await select('talisman',0).selectOption('will');await settle();assert.equal(await value('will'),d.will+1);assert.equal(await value('will-light-side-powers'),d.will+2,'Force bonuses do not stack');
  assert.match(await page.locator('#module-defenses').innerText(),/vs\. Light Side powers/);
  await page.reload();await page.locator('#module-inventory').waitFor();assert.equal(await select('darkSideTalisman',0).inputValue(),'will');assert.equal(await value('will-light-side-powers'),d.will+2);
  await select('darkSideTalisman',0).selectOption('');await settle();assert.equal(await page.locator('[data-defense="will-light-side-powers"]').count(),0);
  const saved=await page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});assert.equal(saved.inventory[0].darkSideTalisman,undefined);rules.validateCharacter(saved,pack);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Dark Side Talisman vs. Light Side powers row, one-talisman limit, Force Talisman non-stacking, reload, clear, mobile passed');
};
