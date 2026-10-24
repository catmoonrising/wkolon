const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:scoundrel'});
 const row=t=>({classId:'class:scoundrel',hpRoll:4,feats:[],talent:t?{id:'talent:'+t}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 c.name='Skirmisher';c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:12};c.trainedSkills=['skill:acrobatics','skill:deception','skill:perception','skill:stealth'];c.levels[0].talent={id:'talent:skirmisher'};c.levels.push(row(null),row('improved-skirmisher'));
 c.inventory=[{id:'equipment:blaster-pistol',uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}];validateCharacter(c,pack);const initial=derive(c,pack);
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await ctx.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const actions=page.locator('#module-actions'),modal=page.locator('#actions-modal'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);
 const reflex=()=>page.locator('[data-defense="reflex"]').textContent().then(Number);
 async function move(squares,displacement){await actions.locator('[data-action-menu="move"]').click();await modal.locator('.action-menu > button').filter({hasText:/^Move/}).first().click();await modal.locator('[data-action-option="path.path.squares"]').fill(String(squares));await modal.locator('[data-action-option="path.displacement"]').fill(String(displacement));await modal.locator('[type="submit"]').click();await settle();}
 try{
  await page.goto(base);await actions.waitFor();await actions.locator('[data-turn-next]').click();
  await move(2,0);assert.equal((await saved()).moveTalentEffects,undefined);assert.equal(await reflex(),initial.defenses.reflex);
  await move(2,1);let x=await saved();assert.deepEqual(x.moveTalentEffects,['skirmisher','improved-skirmisher']);assert.equal(await reflex(),initial.defenses.reflex+1);assert.equal(derive(x,pack).attacks[0].attack,initial.attacks[0].attack+1);assert.match(await actions.innerText(),/Skirmisher \(Attack \+1\)/);
  await page.locator('#print').click();const block=await page.locator('#stat-block-text').inputValue();assert.match(block,/Improved Skirmisher/);assert(!/[—·]/.test(block));await page.locator('#stat-block-close').click();
  await page.reload();await actions.waitFor();assert.equal(await reflex(),initial.defenses.reflex+1);await actions.locator('[data-turn-end]').click();await settle();assert.equal(await reflex(),initial.defenses.reflex+1);
  await actions.locator('[data-turn-next]').click();await settle();assert.equal(await reflex(),initial.defenses.reflex);assert.equal((await saved()).moveTalentEffects,undefined);
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});await move(3,2);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await actions.screenshot({path:path.join(root,'.build/skirmisher-'+browser.browserType().name()+'-mobile.png')});
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await actions.waitFor();x=await saved();assert.deepEqual(x.moveTalentEffects,['skirmisher','improved-skirmisher']);validateCharacter(x,pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Skirmisher Move displacement boundary, attack/Defense bonuses, print, reload, End turn/New Turn expiry and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
