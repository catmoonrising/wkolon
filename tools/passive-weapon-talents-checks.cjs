const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
module.exports=async(browser,base,root)=>{
 const rules=await import('../src/rules.js'),pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json')));
 const c=rules.newCharacter(pack,{classId:'class:soldier'});c.name='Hammerblow';c.abilityMethod='manual';c.abilities={str:16,dex:12,con:12,int:10,wis:10,cha:10};c.levels[0].talent={id:'talent:hammerblow'};c.levels[0].feats=[{id:'feat:toughness'},{id:'feat:skill-focus',choice:'skill:initiative'}];
 const classSkills=pack.classes.find(k=>k.id==='class:soldier').skills;c.trainedSkills=['skill:initiative'];
 const need=Number(/choose (\d+) starting trained/.exec(rules.derive(c,pack).issues.join(';'))?.[1]??c.trainedSkills.length);c.trainedSkills=['skill:initiative',...classSkills.filter(id=>id!=='skill:initiative')].slice(0,need);c.currentHP=rules.derive(c,pack).hp;rules.validateCharacter(c,pack);assert.deepEqual(rules.derive(c,pack).issues,[],JSON.stringify(rules.derive(c,pack).issues));
 const d=rules.derive(c,pack),unarmed=d.attacks.find(a=>a.unarmed),ctx=await browser.newContext({viewport:{width:1440,height:1050}}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
 await ctx.addInitScript(roster=>{if(!localStorage.getItem('wkolon-roster-v1'))localStorage.setItem('wkolon-roster-v1',JSON.stringify(roster));},{schemaVersion:1,activeId:c.id,characters:[c]});
 try{
  assert.match(unarmed.breakdown,/Hammerblow: \+3/);
  await page.goto(base);await page.locator('#module-attacks').waitFor();
  const text=await page.locator('#module-attacks').innerText();assert(text.includes((unarmed.attack>=0?'+':'')+unarmed.attack),'Unarmed Attack total shown');
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.deepEqual(errors,[]);
 }finally{await ctx.close();}
 console.log('Browser: Hammerblow legal Soldier Unarmed Attack total and mobile passed');
};
