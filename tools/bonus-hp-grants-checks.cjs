const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:scoundrel'});
 const row=t=>({classId:'class:scoundrel',hpRoll:4,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 c.name='Thrive on Chaos';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:12,int:12,wis:10,cha:12};c.levels[0].talent={id:'talent:advantageous-opening'};c.levels.push(row(null),row('thrive-on-chaos'));validateCharacter(c,pack);
 const d=derive(c,pack);assert(d.ctx.talents.some(t=>t.id==='talent:thrive-on-chaos')&&!d.ctx.inactiveTalents.has('talent:thrive-on-chaos'));c.currentHP=d.hp;
 const noble=newCharacter(pack,{classId:'class:noble'});noble.name='Luck Favors the Bold';noble.abilityMethod='manual';noble.abilities={...c.abilities};noble.levels[0].talent={id:'talent:face-the-foe'};noble.levels.push({...row(null),classId:'class:noble'},{...row('luck-favors-the-bold'),classId:'class:noble'});validateCharacter(noble,pack);assert(derive(noble,pack).ctx.talents.some(t=>t.id==='talent:luck-favors-the-bold'));noble.currentHP=derive(noble,pack).hp;
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await ctx.addInitScript(({c,noble})=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c,noble]}));},{c,noble});
 const hp=page.locator('#module-hp'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);})());
 try{
  await page.goto(base);await hp.waitFor();const button=hp.locator('[data-grant="thrive-on-chaos"]');assert.equal((await button.innerText()).trim(),'Thrive on Chaos: +6 bonus HP');await button.click();await settle();assert.equal((await saved()).bonusHP,6);
  await button.click();await settle();assert.equal((await saved()).bonusHP,6,'no stacking');
  await page.reload();await hp.waitFor();assert.equal((await saved()).bonusHP,6);
  await page.locator(`[data-character="${noble.id}"]`).click();const luck=hp.locator('[data-grant="luck-favors-the-bold"]');await luck.click();await settle();assert.equal((await saved()).bonusHP,6);await luck.click();await settle();assert.equal((await saved()).bonusHP,6);
  await page.locator('#condition-effect button[data-condition-step="5"]').click();await settle();assert.equal(await luck.count(),0);assert.equal((await saved()).bonusHP,6,'existing pool survives unconsciousness');await page.locator('#condition-effect button[data-condition-step="0"]').click();await settle();assert.equal(await luck.count(),1);
  await page.locator(`[data-character="${c.id}"]`).click();assert.equal((await saved()).bonusHP,6);assert.equal(await hp.locator('[data-grant="luck-favors-the-bold"]').count(),0);await page.locator(`[data-character="${noble.id}"]`).click();
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await hp.waitFor();validateCharacter(await saved(),pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: legal Thrive on Chaos/Luck grants, consciousness gate, retained pool, non-stacking, character isolation, reload and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
