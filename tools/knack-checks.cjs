const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,validateCharacter}=await import('../src/rules.js');
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:scoundrel'}),other=newCharacter(pack,{classId:'class:soldier'});
 c.name='Knack';c.species='species:cerean';c.levels[0].talent={id:'talent:knack'};c.levels.push({classId:'class:scoundrel',hpRoll:3,feats:[],startingFeat:null,talent:null,abilityIncreases:[],trainedSkills:[]},{classId:'class:scoundrel',hpRoll:3,feats:[],startingFeat:null,talent:{id:'talent:knack'},abilityIncreases:[],trainedSkills:[]});validateCharacter(c,pack);const fp=c.forcePoints;
 const context=await browser.newContext({viewport:{width:1440,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await context.addInitScript(({c,other})=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c,other]}));},{c,other});
 const saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);}),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 const knack=id=>page.locator(`[data-talent-reroll="talent:knack"][data-reroll-skill="skill:${id}"]`),roll=id=>page.locator(`[data-skill-roll="skill:${id}"]`);
 async function open(id){if(await knack(id).isVisible())return;const row=roll(id).locator('xpath=ancestor::tr');await row.locator('summary').first().click();}
 try{
  await page.goto(base);await page.locator('#module-skills').waitFor();await open('initiative');assert(await knack('initiative').isDisabled());assert((await knack('initiative').innerText()).includes('2/2'));
  await roll('initiative').click();assert(await knack('initiative').isEnabled());await knack('initiative').click();await settle();assert.equal((await saved()).recovery.knacksSpent,1);assert(await knack('initiative').isDisabled());
  // The Cerean source remains independently available after Knack.
  const species=page.locator('[data-species-reroll="skill:initiative"]');assert(await species.isEnabled());await species.click();await settle();assert.equal((await saved()).recovery.knacksSpent,1);
  await page.reload();await page.locator('#module-skills').waitFor();await open('initiative');assert(await knack('initiative').isDisabled());assert((await knack('initiative').innerText()).includes('1/2'));
  await roll('initiative').click();await roll('stealth').click();assert(await knack('initiative').isDisabled());assert.equal((await saved()).recovery.knacksSpent,1);
  await page.locator(`[data-character="${other.id}"]`).click();assert.equal(await page.locator('[data-talent-reroll="talent:knack"]').count(),0);await page.locator(`[data-character="${c.id}"]`).click();await open('perception');
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});await roll('perception').click();assert(await knack('perception').isEnabled());assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/knack-'+browser.browserType().name()+'-mobile.png')});
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await context.setOffline(true);}
  await page.reload();await page.locator('#module-skills').waitFor();await open('perception');assert(await knack('perception').isDisabled());await roll('perception').click();await knack('perception').click();await settle();const x=await saved();assert.equal(x.recovery.knacksSpent,2);assert.equal(x.forcePoints,fp);assert.equal(x.actionState,undefined);validateCharacter(x,pack);await roll('perception').click();assert(await knack('perception').isDisabled());assert((await knack('perception').innerText()).includes('0/2'));assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await context.close();}
 console.log('Browser: Knack daily capacities, spending, independent Cerean reroll, stale/reloaded opportunities, character isolation and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
