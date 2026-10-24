const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root,transport)=>{
 const {newCharacter,derive,validateCharacter}=await import('../src/rules.js');
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json'))),c=newCharacter(pack,{classId:'class:scout'});
 c.name='Strong-Willed';c.abilityMethod='manual';c.abilities={str:12,dex:14,con:14,int:12,wis:12,cha:12};c.trainedSkills=['skill:survival','skill:perception','skill:stealth'];c.levels[0].talent={id:'talent:acute-senses'};
 const row=(cls,talent=null)=>({classId:'class:'+cls,hpRoll:5,feats:[],talent:talent?{id:'talent:'+talent}:null,startingFeat:null,abilityIncreases:[],trainedSkills:[]});
 for(let level=2;level<=7;level++)c.levels.push(row('scout',level===3?'improved-initiative':null));c.levels.push(row('bounty-hunter','strong-willed'),row('bounty-hunter'));validateCharacter(c,pack);const initial=derive(c,pack);
 assert.equal(initial.ctx.classLevels.get('class:bounty-hunter'),2);assert(!initial.ctx.inactiveClasses.has('class:bounty-hunter'));assert(initial.ctx.talents.some(t=>t.id==='talent:strong-willed'&&!initial.ctx.inactiveTalents.has(t.id)));
 const ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(20000);
 await ctx.addInitScript(c=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify({schemaVersion:1,activeId:c.id,characters:[c]}));},c);
 const value=k=>page.locator(`[data-defense="${k}"]`).textContent().then(Number);
 try{
  await page.goto(base);await page.locator('#module-defenses').waitFor();assert.equal(await value('will'),initial.defenses.will);assert.equal(await value('will-use-the-force'),initial.defenses.will+2);assert.match(await page.locator('#module-defenses').innerText(),/Will vs\. Use the Force/);
  await page.locator('#print').click();assert.match(await page.locator('#stat-block-text').inputValue(),/vs\. Use the Force/);await page.locator('#stat-block-close').click();
  await page.locator('#theme-select').selectOption({label:'Dracula Dark'});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  if(base.startsWith('https:')){await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller);if(transport)await transport.offline();else await ctx.setOffline(true);}
  await page.reload();await page.locator('#module-defenses').waitFor();assert.equal(await value('will-use-the-force'),initial.defenses.will+2);assert.equal(await value('will'),initial.defenses.will);assert.deepEqual(errors,[]);
 }finally{if(transport)await transport.online();await ctx.close();}
 console.log('Browser: actual Scout/Bounty Hunter access, Strong-Willed class-level conditional Will, ordinary Will, text stat block, mobile and reload'+(base.startsWith('https:')?' / real offline':'')+' passed');
};
