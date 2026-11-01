const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json')));
 // Tree access needs a prestige entry; the page loads the same pack with the tree opened on Soldier.
 pack.classes.find(k=>k.id==='class:soldier').talentTrees.push('tree:knight-s-armor');
 const c=rules.newCharacter(pack,{classId:'class:soldier'});c.name='Armored Augmentation';c.abilityMethod='manual';c.abilities={str:12,dex:12,con:12,int:10,wis:10,cha:12};c.levels[0].talent={id:'talent:armored-augmentation-i',manualRequirements:true};c.inventory=[{id:'equipment:battle-armor',uid:crypto.randomUUID(),quantity:1,carried:true,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];c.currentHP=rules.derive(c,pack).hp;
 const before=rules.derive(c,pack).threshold,armorBonus=pack.equipment.find(e=>e.id==='equipment:battle-armor').armorBonus;
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.route('**/data/core.json',route=>route.fulfill({json:pack}));
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 const modal=page.locator('#actions-modal'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 try{
  await page.goto(base);await page.locator('#module-actions').waitFor();
  await page.locator('[data-action-menu="swift"]').click();await modal.locator('.action-menu > button').filter({hasText:'Armored Augmentation'}).click();await modal.locator('[type="submit"]').click();await settle();
  const s=await saved();assert.deepEqual(s.talentActivations,[{id:'talent:armored-augmentation-i',choice:'threshold'}]);assert.equal(rules.derive(s,pack).threshold,before+armorBonus);
  await page.reload();await page.locator('#module-actions').waitFor();assert.deepEqual((await saved()).talentActivations,s.talentActivations);
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Armored Augmentation Swift activation, save, Damage Threshold, reload, mobile passed');
};
