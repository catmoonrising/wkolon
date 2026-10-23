const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:jedi'});
 const level=(talent=null)=>({classId:'class:jedi',hpRoll:4,startingFeat:null,feats:[],talent:talent?{id:'talent:'+talent,...(talent==='dark-presence'?{darkSideScore:1}:{})}:null,trainedSkills:[],abilityIncreases:[]});
 c.name='Encounter buffs';c.abilityMethod='manual';c.abilities={str:14,dex:14,con:12,int:10,wis:12,cha:14};c.trainedSkills=['skill:use-the-force'];c.darkSideScore=1;c.levels[0].talent={id:'talent:power-of-the-dark-side',darkSideScore:1};
 for(let n=2;n<=5;n++)c.levels.push(level(n===3?'dark-presence':n===5?'battle-meditation':null));c.forcePoints=5;validateCharacter(c,pack);const initial=derive(c,pack),fp=c.forcePoints;c.currentHP=initial.hp;
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await ctx.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const actions=page.locator('#module-actions'),modal=page.locator('#actions-modal'),hp=page.locator('#module-hp'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('wkolon-roster-v1')).characters[0]);
 const will=page.locator('[data-defense="will"]');
 async function choose(type,name){await actions.locator(`[data-action-menu="${type}"]`).click();await modal.locator('.action-menu > button').filter({hasText:name}).click();}
 try{
  await page.goto(base);await actions.waitFor();await actions.locator('[data-turn-next]').click();
  await choose('standard','Dark Presence');assert.equal(await modal.locator('[data-action-option="choice"]').count(),0);await modal.locator('[type="submit"]').click();await settle();let x=await saved();assert.deepEqual(x.talentActivations,[{id:'talent:dark-presence',choice:'defenses'}]);assert.equal(x.forcePoints,fp);assert.equal(Number(await will.textContent()),initial.defenses.will+1);
  // A Condition Track knockout must end the effect, not let it return on waking.
  await page.locator('#condition-effect button[data-condition-step="5"]').click();await settle();assert.equal((await saved()).talentActivations,undefined);
  await page.locator('#condition-effect button[data-condition-step="0"]').click();await settle();assert.equal(Number(await will.textContent()),initial.defenses.will);
  await actions.locator('[data-turn-next]').click();await choose('standard','Dark Presence');await modal.locator('[type="submit"]').click();await settle();assert.equal(Number(await will.textContent()),initial.defenses.will+1);
  await actions.locator('[data-turn-next]').click();await choose('full','Battle Meditation');await modal.locator('[type="submit"]').click();await settle();x=await saved();assert.equal(x.forcePoints,fp-1);assert.equal(x.talentActivations.length,2);
  const d=derive(x,pack);assert.equal(d.attacks[0].attack,initial.attacks[0].attack+1);assert.match(await actions.innerText(),/Battle Meditation \(Attack rolls\)/);
  await page.locator('#print').click();const block=await page.locator('#stat-block-text').inputValue();assert.match(block,/Dark Presence/);assert(!/[—·]/.test(block));await page.locator('#stat-block-close').click();
  await hp.locator('#hp-damage-controls > summary').click();const damage=hp.locator('#apply-damage');await damage.locator('[data-incoming-damage]').fill(String(initial.hp));await damage.locator('[type="submit"]').click();await settle();x=await saved();
  if(x.recovery?.dead)assert.deepEqual(x.talentActivations,[{id:'talent:battle-meditation',choice:'attacks'}]);else{assert.equal(x.currentHP,0);assert.deepEqual(x.talentActivations,[{id:'talent:battle-meditation',choice:'attacks'}]);}
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await actions.screenshot({path:path.join(root,'.build/encounter-buffs-'+browser.browserType().name()+'-mobile.png')});
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await actions.waitFor();x=await saved();validateCharacter(x,pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Dark Presence Standard/no-FP defenses, Battle Meditation Full-Round/FP attacks, single-benefit forms, unconscious loss, print and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
