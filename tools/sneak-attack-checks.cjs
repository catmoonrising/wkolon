const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:scoundrel'}),other=newCharacter(pack,{classId:'class:soldier'});
 c.name='Sneak Attack';c.abilityMethod='manual';c.abilities={str:12,dex:16,con:12,int:12,wis:10,cha:12};c.levels[0].talent={id:'talent:sneak-attack'};
 for(let n=2;n<=3;n++)c.levels.push({classId:'class:scoundrel',hpRoll:4,feats:[],talent:n===3?{id:'talent:sneak-attack'}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 c.inventory=['knife','blaster-pistol'].map(id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0}));validateCharacter(c,pack);const plain=derive(c,pack).attacks;
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);await ctx.addInitScript(({c,other})=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c,other]}));},{c,other});
 const attacks=page.locator('#module-attacks'),target=attacks.locator('#attack-target'),settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(x=>x.id===r.activeId);});
 const row=name=>attacks.locator('tbody tr').filter({hasText:name}).first();
 try{
  await page.goto(base);await attacks.waitFor();const knife=plain.find(a=>a.name.startsWith('Knife'));assert.match(await row('Knife').innerText(),new RegExp(knife.damageDisplay.replace(/[+]/g,'\\+')));
  await target.locator('summary').click();const flag=target.locator('[data-attack-target="dexDenied"]');await flag.check();await settle();assert.equal((await saved()).attackTarget.dexDenied,true);
  assert.match(await row('Knife').innerText(),/\+2d6/);assert.doesNotMatch(await row('Blaster Pistol').innerText(),/\+2d6/);assert.match(await target.locator('summary').innerText(),/Denied Dexterity/);
  await page.locator('#print').click();assert.doesNotMatch(await page.locator('#stat-block-text').inputValue(),/\+2d6/);await page.locator('#stat-block-close').click();
  await page.locator(`[data-character="${other.id}"]`).click();await attacks.locator('#attack-target summary').click();assert.equal(await attacks.locator('[data-attack-target="dexDenied"]').count(),0);assert.equal(await attacks.locator('[data-attack-target="jedi"]').count(),0);await page.locator(`[data-character="${c.id}"]`).click();
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await attacks.screenshot({path:path.join(root,'.build/sneak-attack-'+browser.browserType().name()+'-mobile.png')});
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await attacks.waitFor();assert.match(await row('Knife').innerText(),/\+2d6/);validateCharacter(await saved(),pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Sneak Attack Denied Dexterity target flag, melee dice, ranged distance gate, print omission, isolation and Dracula mobile'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
