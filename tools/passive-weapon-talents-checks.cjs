const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),creation=require('./creator-actions.cjs');
module.exports=async(browser,base,root,transport)=>{
 const api=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),f=require('./passive-weapon-fixtures.cjs')(pack,api);
 const hammer=f.hammer(),elegance=f.duelist({elegance:true}),advanced=f.duelist(),exotic=f.gladiator(),martial=f.martial(),knight=f.knight(),gun=f.gunslinger(),wookiee=f.gunslinger({species:'wookiee'});
 hammer.inventory=[f.item('lightsaber',{activated:false,equipped:false})];
 for(const [c,id]of [[advanced,'equipment:vibroblade'],[exotic,'equipment:amphistaff'],[martial,null]]){
  const a=api.derive(c,pack).attacks.find(a=>id?a.id===id:a.uid===c.id);c.routines=[{id:crypto.randomUUID(),name:c.name,kind:'fullAttack',steps:['base','doubleAttack'].map(source=>({id:crypto.randomUUID(),attackId:a.uid,count:1,attackMod:0,damageMod:0,source}))}];
 }
 const characters=[hammer,elegance,advanced,exotic,martial,knight,gun,wookiee];characters.forEach(f.finish);
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await ctx.addInitScript(characters=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:characters[0].id,characters}));Math.random=()=>.6;},characters);
 const attacks=page.locator('#module-attacks'),inventory=page.locator('#module-inventory'),actions=page.locator('#module-actions');
 const saved=()=>page.evaluate(()=>{const r=JSON.parse(localStorage.getItem('wkolon-roster-v1'));return r.characters.find(c=>c.id===r.activeId);});
 const settle=()=>page.waitForFunction(()=>document.querySelector('#save-status').textContent==='Saved');
 const switchTo=async c=>{await page.locator('[data-character="'+c.id+'"]').click();await settle();};
 const row=uid=>attacks.locator('[data-combat="attack"][data-attack-id="'+uid+'"]').locator('xpath=ancestor::tr');
 const total=uid=>row(uid).locator('[data-roll]').getAttribute('data-roll').then(Number);
 const reveal=async field=>{await field.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;});};
 const close=async()=>{if(await page.locator('#roll-mirror-close').isVisible())await page.locator('#roll-mirror-close').click();};
 try{
  await page.goto(base);await attacks.waitFor();await settle();const full=api.derive(hammer,pack).attacks.find(a=>a.uid===hammer.id).attack;
  assert.equal(await total(hammer.id),full);const mods=attacks.locator('#unarmed-modifiers');assert.equal(await mods.getAttribute('open'),null,'starts folded');await mods.locator(':scope > summary').click();
  const held=attacks.locator('[data-unarmed-holding]');assert.equal(await held.count(),1);await held.check();await settle();assert((await saved()).unarmedModifiers.holdingItem);assert.equal(await total(hammer.id),full-2);
  await page.reload();await attacks.waitFor();assert.equal(await total(hammer.id),full-2);await reveal(held);assert(await held.isChecked());await held.uncheck();await settle();assert.equal(await total(hammer.id),full);
  const ability=attacks.locator('[data-attack-ability="'+hammer.id+'"]');await reveal(ability);assert.match(await ability.locator('option[value="str"]').innerText(),/\+6/);await ability.selectOption('dex');await settle();assert.equal(await total(hammer.id),full-2);await ability.selectOption('auto');await settle();assert.equal(await total(hammer.id),full);
  const hilt=inventory.locator('[data-inventory="equipped"][data-index="0"]');await reveal(hilt);await hilt.check();await settle();assert.equal(await total(hammer.id),full-2);await hilt.uncheck();await settle();assert.equal(await total(hammer.id),full);
  await switchTo(elegance);const knife=elegance.inventory[0].uid,before=api.derive(await saved(),pack).attacks.find(a=>a.uid===knife).damageBonus,dex=api.derive(await saved(),pack).mods.dex;
  const grip=inventory.locator('[data-inventory="twoHanded"][data-index="0"]');await reveal(grip);await grip.check();await settle();const doubled=api.derive(await saved(),pack).attacks.find(a=>a.uid===knife);assert.equal(doubled.damageBonus,before+dex);assert.equal(await row(knife).locator('[data-damage]').getAttribute('data-damage'),doubled.damageDisplay);
  await page.reload();await attacks.waitFor();assert.equal(api.derive(await saved(),pack).attacks.find(a=>a.uid===knife).damageBonus,before+dex);
  await page.locator('#module-header a[href="#creation"]').click();await creation.openChoice(page,'talent',9);await creation.search(page,'Counterpunch');await page.locator('[data-tree-pick="talent:counterpunch|"]').click();await creation.done(page);await settle();
  assert(!api.derive(await saved(),pack).ctx.talents.some(t=>t.id==='talent:master-of-elegance'));const ordinary=api.derive(await saved(),pack).attacks.find(a=>a.uid===knife).damageBonus;assert(ordinary<before);await reveal(grip);assert(await grip.isChecked());assert(await grip.isEnabled());await grip.uncheck();await settle();assert.equal(api.derive(await saved(),pack).attacks.find(a=>a.uid===knife).damageBonus,ordinary);await grip.check();await settle();assert.equal(api.derive(await saved(),pack).attacks.find(a=>a.uid===knife).damageBonus,ordinary,'Light STR stays undoubled');

  for(const c of [advanced,exotic,martial]){
   await switchTo(c);const uid=c.routines[0].steps[0].attackId,before=await total(uid),fp=(await saved()).forcePoints;
   await actions.locator('[data-turn-next]').click();await settle();const r=page.locator('#module-routines [data-routine="'+c.routines[0].id+'"]');await r.locator('[data-combat="run"]').click();await close();await settle();
   assert.equal(await total(uid),before-1);const state=await saved();assert.equal(state.fullAttackPenalties.doubleAttack,-5);assert.equal(state.actionState.spent.length,3);assert.equal(state.actionState.plan.at(-1).action,'full-attack');assert.equal(state.forcePoints,fp);assert.deepEqual(api.derive(state,pack).issues,[]);
  }
  await switchTo(knight);const reflex=api.derive(knight,pack).defenses.reflex;assert.equal(Number(await page.locator('[data-defense="reflex"]').innerText()),reflex);const armor=inventory.locator('[data-inventory="equipped"][data-index="0"]');await reveal(armor);await armor.uncheck();await settle();assert.equal(Number(await page.locator('[data-defense="reflex"]').innerText()),api.derive(await saved(),pack).defenses.reflex);await armor.check();await settle();assert.equal(Number(await page.locator('[data-defense="reflex"]').innerText()),reflex);
  for(const c of [gun,wookiee]){
   await switchTo(c);const uid=c.inventory.find(e=>e.id===(c===gun?'equipment:blaster-pistol':'equipment:bowcaster')).uid,normal=await total(uid);
   const conceal=attacks.locator('[data-attack-target="concealment"]');await reveal(conceal);await conceal.selectOption('total');await settle();const square=attacks.locator('[data-attack-target="attackSquare"]');await square.check();await settle();assert.equal(await total(uid),normal);
   if(c===wookiee){const house=page.locator('#module-house-rules');await house.locator('[data-house-tab="counseling"]').click();const fam=house.locator('[data-counseling="jc:112-weapon-familiarity-with-feats-and-talents"]');await fam.uncheck();await settle();assert.equal(await total(uid),normal-5);await fam.check();await settle();assert.equal(await total(uid),normal);}
  }
  await switchTo(hammer);await reveal(held);await held.check();await settle();const blocked=await total(hammer.id);await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});await held.scrollIntoViewIfNeeded();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(root,'.build/passive-talents-'+browser.browserType().name()+'-mobile.png')});
  if(transport){if(transport.prime)await transport.prime(page);await transport.offline();await page.reload();await attacks.waitFor();assert.equal(await total(hammer.id),blocked);await reveal(held);assert(await held.isChecked());await held.uncheck();await settle();assert.equal(await total(hammer.id),full);await transport.online();}
  api.validateCharacter(await saved(),pack);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: eight legal talent builds, real hand/ability/hilt/grip controls, three Full Attack reductions and budgets, armor, concealment/familiarity, persistence and Dracula mobile'+(transport?' / refused offline':'')+' passed');
};
