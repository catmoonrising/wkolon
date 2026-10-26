const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json')));
 const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 const item=id=>({id:'equipment:'+id,uid:crypto.randomUUID(),quantity:1,equipped:true,twoHanded:false,attackMod:0,damageMod:0});
 // Legal Jedi 7 to Force Adept with Attune Weapon; a second character without the talent checks isolation.
 const make=(name,talent)=>{const c=require('./class-defense-fixtures.cjs')(pack,{newCharacter,derive,validateCharacter}).adept(talent);c.name=name;c.inventory=[item('vibroblade'),item('blaster-pistol')];validateCharacter(c,pack);assert.deepEqual(derive(c,pack).issues,[]);return c;};
 const owner=make('Attuner','attune-weapon'),other=make('Other',null),base0=derive(owner,pack).attacks.find(a=>a.uid===owner.inventory[0].uid).attack;
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await ctx.addInitScript(cs=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:cs[0].id,characters:cs}));},[owner,other]);
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved'),open=()=>page.locator('#module-inventory details').evaluateAll(ds=>ds.forEach(d=>d.open=true));
 const attack=uid=>page.locator(`#module-attacks [data-combat="attack"][data-attack-id="${uid}"]`).locator('xpath=ancestor::tr').locator('[data-roll]').first().getAttribute('data-roll').then(Number);
 const saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 try{
  await page.goto(base);await page.locator('#module-attacks').waitFor();assert.equal(await attack(owner.inventory[0].uid),base0);await open();
  assert.equal(await page.locator('[data-inventory="attuned"][data-index="1"]').count(),0,'no control on a ranged weapon');
  await page.locator('[data-inventory="attuned"][data-index="0"]').check();await settle();assert.equal(await attack(owner.inventory[0].uid),base0+1);assert.equal((await saved()).inventory[0].attuned,true);validateCharacter(await saved(),pack);
  await page.locator(`[data-character="${other.id}"]`).click();await settle();await open();assert.equal(await page.locator('[data-inventory="attuned"]').count(),0,'hidden without the talent');
  await page.locator(`[data-character="${owner.id}"]`).click();await settle();
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await page.locator('#module-attacks').waitFor();assert.equal(await attack(owner.inventory[0].uid),base0+1);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: Attune Weapon owner-only melee control, +1 Force attack, saved flag, character isolation, Dracula mobile and reload'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
