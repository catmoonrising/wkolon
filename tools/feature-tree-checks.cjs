const creationUI=require('./creator-actions.cjs');
const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const choose=require('./choice-actions.cjs');
module.exports=async function checkTrees(browser,base,root){
 const pack=JSON.parse(fs.readFileSync(path.join(root,'data/core.json')));
 const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
 try {
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'#creation');const body=creationUI.body(page);

  await creationUI.openChoice(page,'class');await creationUI.chooseClass(page,'class:scout');
  await creationUI.tab(page,'skills');
  assert.equal(await body.locator('[data-trained]').count(),18); // Knowledge's seven fields share one row.
  assert(await body.locator('[data-trained="skill:use-the-force"]').isDisabled());
  assert(await body.locator('[data-trained="skill:persuasion"]').isDisabled());
  assert(!(await body.locator('[data-trained="skill:initiative"]').isDisabled()));
  assert(await body.locator('[data-trained="skill:use-the-force"]').evaluate(el=>el.closest('label').classList.contains('skill-unavailable')));
  await body.locator('[data-trained="skill:initiative"]').check();
  await creationUI.openChoice(page,'feat');assert.equal(await body.locator('[data-choice="talent"]').count(),0);
  assert.equal(await body.locator('[data-tree-group]').count(),0);
  assert.equal(await body.locator('[data-tree-pick="feat:skill-focus|"]').count(),1);
  assert.equal(await body.locator('[data-tree-pick="family:Weapon Proficiency"]').count(),1);
  assert(await body.locator('[data-tree-pick="feat:dodge|"]').isDisabled());
  // Full feat selection is the dense real-world case: requirements repeat near
  // their owners, and long connections must never cut through another card.
  assert(await body.locator('.prerequisite-node').evaluateAll(nodes=>nodes.filter(n=>n.textContent.trim()==='DEX 13').length>1));
  const blocked=await body.locator('.feature-tree-canvas').evaluate(canvas=>{
   const cards=[...canvas.querySelectorAll('.feature-tree-node')].map(el=>({name:el.textContent.trim(),x:parseFloat(el.style.left),y:parseFloat(el.style.top),width:el.offsetWidth,height:el.offsetHeight})),blocked=[];
   for(const edge of canvas.querySelectorAll('.feature-edge'))for(let l=1;l<edge.getTotalLength();l+=3){const p=edge.getPointAtLength(l),card=cards.find(c=>p.x>c.x+.5&&p.x<c.x+c.width-.5&&p.y>c.y+.5&&p.y<c.y+c.height-.5);if(card){blocked.push(card.name);break;}}
   return blocked;
  });assert.deepEqual(blocked,[]);
  const steep=await body.locator('.feature-tree-arrows .feature-edge').evaluateAll(edges=>edges.filter(edge=>{
   const length=edge.getTotalLength();let prior=edge.getPointAtLength(0);
   for(let l=3;l<length+3;l+=3){const next=edge.getPointAtLength(Math.min(l,length));if(Math.abs(next.y-prior.y)>Math.sqrt(3)*(next.x-prior.x)+.01)return true;prior=next;}
   return false;
  }).length);assert.equal(steep,0);
  await page.screenshot({path:path.join(root,'.build/feat-tree-folded.png')});
  await choose(page,'feat','feat:force-sensitivity|');await creationUI.tab(page,'skills');assert(!(await body.locator('[data-trained="skill:use-the-force"]').isDisabled()));
  await body.locator('[data-trained="skill:use-the-force"]').check();
  await creationUI.openChoice(page,'feat');await choose(page,'feat','feat:force-sensitivity|');await creationUI.tab(page,'skills');
  assert(await body.locator('[data-trained="skill:use-the-force"]').isChecked());
  // Existing invalid training remains removable; it does not grant an eligible skill.
  await body.locator('[data-trained="skill:use-the-force"]').uncheck();assert(await body.locator('[data-trained="skill:use-the-force"]').isDisabled());
  await creationUI.openChoice(page,'talent');assert.equal(await body.locator('[data-choice="feat"]').count(),0);
  assert.deepEqual(await body.locator('[data-tree-group]').evaluateAll(buttons=>buttons.map(b=>b.dataset.treeGroup)),['all',...pack.classes.find(c=>c.id==='class:scout').talentTrees].sort((a,b)=>a.localeCompare(b)));
  await body.locator('[data-tree-group="tree:awareness"]').click();
  const pick=id=>body.locator(`[data-tree-pick="talent:${id}|"]`),node=id=>body.locator(`[data-tree-node="talent:${id}|"]`);
  assert.equal(await body.locator('[data-tree-group="tree:awareness"]').getAttribute('aria-pressed'),'true');
  assert(!(await pick('acute-senses').isDisabled()));assert(await pick('improved-initiative').isDisabled());
  assert.equal(await body.locator('.feature-tree-arrows .feature-edge').count(),8); // Reset Initiative has two incoming prerequisites.
  assert.equal(await body.locator('.feature-tree-arrows .feature-edge.unavailable').count(),8);
  assert.equal(await body.locator('.wiki-article').count(),0); // Default folded, without inline prose.
  assert((await page.locator('#creator-modal').boundingBox()).width>1300);
  const positions=()=>body.locator('.feature-tree-node').evaluateAll(nodes=>nodes.map(el=>[el.dataset.treeNode,el.style.left,el.style.top,el.offsetWidth,el.offsetHeight]));
  const before=await positions(),detail=page.locator('#rule-detail-modal');
  await node('acute-senses').locator('[data-tree-fold]').click();assert(await detail.isVisible());
  assert((await detail.locator('.wiki-article').innerText()).includes('even if it is worse'));
  await page.screenshot({path:path.join(root,'.build/talent-mechanics-popup.png')});
  await page.locator('#rule-detail-close').click();assert.deepEqual(await positions(),before);
  await node('improved-initiative').locator('[data-tree-fold]').click();assert(await detail.isVisible());await page.keyboard.press('Escape');
  await body.locator('[data-tree-all="unfold"]').click();assert.equal(await detail.locator('.feature-mechanics[open]').count(),8);
  await detail.locator('[data-mechanics-fold="fold"]').click();assert.equal(await detail.locator('.feature-mechanics[open]').count(),0);
  await detail.locator('[data-mechanics-fold="unfold"]').click();assert.equal(await detail.locator('.feature-mechanics[open]').count(),8);
  await page.locator('#rule-detail-close').click();assert.deepEqual(await positions(),before);
  assert.equal(new Set(before.map(n=>n[3])).size>1,true);
  assert(await body.locator('.prerequisite-node').evaluate(el=>el.offsetHeight<document.querySelector('[data-tree-pick]').closest('article').offsetHeight));
  // Each shaft's final point is the head's tip, including dotted incoming edges.
  assert(await body.locator('.feature-tree-arrows g').evaluate(g=>[...g.querySelectorAll('.feature-edge')].every(edge=>{const tip=edge.getPointAtLength(edge.getTotalLength()),head=edge.nextElementSibling.getPointAtLength(edge.nextElementSibling.getTotalLength()/2);return Math.abs(tip.x-head.x)<.01&&Math.abs(tip.y-head.y)<.01;})));
  await body.locator('[data-tree-zoom="in"]').click();assert.equal(await body.locator('[data-tree-zoom="reset"]').innerText(),'125%');
  await body.locator('[data-tree-zoom="out"]').click();assert.equal(await body.locator('[data-tree-zoom="reset"]').innerText(),'100%');
  await body.locator('[data-tree-zoom="out"]').click();await body.locator('[data-tree-zoom="reset"]').click();assert.deepEqual(await positions(),before);
  const noOverlap=await body.locator('.feature-tree-node').evaluateAll(nodes=>nodes.every((n,i)=>nodes.slice(i+1).every(m=>{const a=n.getBoundingClientRect(),b=m.getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;})));assert(noOverlap);
  await pick('acute-senses').click();assert(await node('acute-senses').evaluate(el=>el.classList.contains('owned')));
  // This level's selection cannot unlock another talent in the same slot.
  assert(await pick('improved-initiative').isDisabled());
  await body.locator('[data-tree-eligible]').check();assert.equal(await body.locator('[data-tree-pick]').count(),1);await body.locator('[data-tree-eligible]').uncheck();
  const search=body.locator('[data-tree-search]');await search.evaluate(el=>el._same=true);await search.fill('Damage Reduction');assert(await search.evaluate(el=>el._same && el===document.activeElement));assert(await node('weak-point').count());assert(await node('keen-shot').count());assert(await node('acute-senses').count());assert.equal(await pick('uncanny-dodge-i').count(),0);
  await search.fill('');await body.locator('[data-tree-group="tree:awareness"]').click();
  await page.screenshot({path:path.join(root,'.build/talent-tree-folded.png')});
  await creationUI.done(page,'close');await page.locator('#theme-select').selectOption('dracula-dark.css');
  await page.waitForFunction(()=>getComputedStyle(document.body).backgroundColor==='rgb(40, 42, 54)');
  await page.locator('#module-header a[href="#creation"]').click();await creationUI.openChoice(page,'talent');
  await pick('acute-senses').hover();
  assert(await pick('acute-senses').evaluate(el=>{const node=el.closest('article'),s=getComputedStyle(el),n=getComputedStyle(node);return s.backgroundColor==='rgba(0, 0, 0, 0)'&&s.color===n.color&&n.backgroundColor==='rgb(189, 147, 249)';}));
  await page.screenshot({path:path.join(root,'.build/talent-hover-dracula.png')});

  await creationUI.openChoice(page,'class');await creationUI.chooseClass(page,'class:soldier');await creationUI.openChoice(page,'talent');await body.locator('[data-tree-group="all"]').click();
  assert.equal(await node('acute-senses').count(),0);
  assert.deepEqual(await body.locator('[data-tree-group]').evaluateAll(buttons=>buttons.map(b=>b.dataset.treeGroup)),['all',...pack.classes.find(c=>c.id==='class:soldier').talentTrees].sort((a,b)=>a.localeCompare(b)));
  await creationUI.openChoice(page,'class');await creationUI.chooseClass(page,'class:scout');await creationUI.openChoice(page,'talent');if(await pick('acute-senses').getAttribute('aria-pressed')!=='true')await choose(page,'talent','talent:acute-senses|');
  // Add a third Scout level, so previous talents unlock the illustrated branches legitimately.
  await creationUI.done(page,'done');await page.locator('#module-classes a[href="#advancement"]').click();
  await body.locator('#next-class').selectOption('class:scout');await body.locator('[data-action="add-level"]').click();await body.locator('[data-action="add-level"]').click();
  await body.locator('[data-open-tree="talent:2:0"]').click();
  const modal=page.locator('#feature-tree-modal');await modal.locator('[data-tree-group="tree:awareness"]').click();
  assert(!(await modal.locator('[data-tree-pick="talent:improved-initiative|"]').isDisabled()));
  assert(await modal.locator('[data-tree-node="talent:acute-senses|"]').evaluate(el=>el.classList.contains('owned')));
  assert(await modal.locator('.feature-tree-arrows .feature-edge:not(.unavailable)').count()>=3);
  await modal.locator('[data-tree-pick="talent:improved-initiative|"]').click();await page.locator('#feature-tree-close').click();
  await body.locator('[data-action="add-level"]').click();
  await body.locator('[data-open-tree="feat:1:0"]').click();
  const bonus=page.locator('#feature-tree-modal');
  assert.equal(await bonus.locator('[data-tree-pick="feat:force-sensitivity|"]').count(),0);
  assert.equal(await bonus.locator('[data-tree-pick="feat:toughness|"]').count(),0);
  assert.equal(await bonus.locator('[data-tree-pick="feat:dodge|"]').count(),1);
  assert(await bonus.locator('[data-tree-pick="feat:dodge|"]').isDisabled());
  assert.equal(await bonus.locator('[data-tree-pick="family:Weapon Proficiency"]').count(),1);
  await page.locator('#feature-tree-close').click();
  await body.locator('[data-action="add-level"]').click();
  await body.locator('[data-open-tree="talent:4:0"]').click();await modal.locator('[data-tree-group="tree:awareness"]').click();
  assert(!(await modal.locator('[data-tree-pick="talent:reset-initiative|"]').isDisabled()));
  assert(!(await modal.locator('[data-tree-pick="talent:uncanny-dodge-i|"]').isDisabled()));
  assert(await modal.locator('[data-tree-pick="talent:weak-point|"]').isDisabled());
  await page.screenshot({path:path.join(root,'.build/talent-tree-owned.png')});
  for(let i=0;i<4;i++)await modal.locator('[data-tree-zoom="in"]').click();
  await modal.locator('.feature-tree-scroll').evaluate(el=>el.style.height='180px');
  const scroll=modal.locator('.feature-tree-scroll');assert.deepEqual(await scroll.evaluate(el=>[el.scrollWidth>el.clientWidth,el.scrollHeight>el.clientHeight]),[true,true]);
  assert(await modal.locator('[data-tree-zoom="in"]').isDisabled());
  for(let i=0;i<7;i++)await modal.locator('[data-tree-zoom="out"]').click();
  assert.equal(await modal.locator('[data-tree-zoom="reset"]').innerText(),'25%');assert(await modal.locator('[data-tree-zoom="out"]').isDisabled());
  assert.deepEqual(await scroll.evaluate(el=>[el.scrollWidth>el.clientWidth,el.scrollHeight>el.clientHeight]),[false,false]);
  for(let i=0;i<7;i++)await modal.locator('[data-tree-zoom="in"]').click();
  await scroll.evaluate(el=>{el.scrollLeft=200;el.scrollTop=100;});
  await modal.locator('[data-tree-pick="talent:reset-initiative|"]').click();assert(await modal.locator('[data-tree-node="talent:reset-initiative|"]').evaluate(el=>el.classList.contains('owned')));
  assert.equal(await modal.locator('[data-tree-zoom="reset"]').innerText(),'200%');
  await page.locator('#feature-tree-close').click();await creationUI.done(page,'done');
  const download=page.waitForEvent('download');await page.locator('#export-character').click();const c=JSON.parse(fs.readFileSync(await(await download).path(),'utf8'));
  assert.equal(c.levels[0].talent.id,'talent:acute-senses');assert.equal(c.levels[2].talent.id,'talent:improved-initiative');assert.equal(c.levels[4].talent.id,'talent:reset-initiative');
  assert((await page.locator('#module-species-features .feature-list > article').first().innerText()).includes('Human'));
  const featLabels=await page.locator('#module-feats .feature-list > article summary').allTextContents();
  const talentLabels=await page.locator('#module-talents .feature-list > article summary').allTextContents();
  assert(featLabels.length>0);assert(talentLabels.length>0);assert(!featLabels.some(name=>name.startsWith('(F) ')));assert(!talentLabels.some(name=>name.startsWith('(T) ')));
  assert(talentLabels.findIndex(name=>name.includes('Acute Senses'))<talentLabels.findIndex(name=>name.includes('Improved Initiative')));
  if(base.startsWith('https:'))await page.waitForFunction(()=>navigator.serviceWorker.controller!==null,null,{timeout:60000});
  await page.reload();await page.locator('#module-classes a[href="#advancement"]').click();await body.locator('[data-open-tree="talent:4:0"]').click();
  await modal.locator('[data-tree-group="tree:awareness"]').click();assert(await modal.locator('[data-tree-node="talent:reset-initiative|"]').evaluate(el=>el.classList.contains('owned')));
  await page.setViewportSize({width:390,height:844});assert(await scroll.evaluate(el=>el.scrollWidth>el.clientWidth));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(root,'.build/talent-tree-mobile.png')});
  if(base.startsWith('https:')){await context.setOffline(true);await page.reload();await page.locator('#creator-modal').waitFor({state:'visible'});await body.locator('[data-open-tree="talent:4:0"]').click();await modal.locator('[data-tree-group="tree:awareness"]').click();await modal.locator('[data-tree-node="talent:reset-initiative|"] [data-tree-fold]').click();assert((await detail.locator('.wiki-article').innerText()).includes('Initiative +5'));await page.locator('#rule-detail-close').click();}
  assert.deepEqual(errors,[]);console.log('Feature trees: separate feat/talent screens, visible unavailable skills, secondary choices, exact articles, prerequisite branches, possession, eligibility, joined arrows, stable mechanics popups, zoom, search, scroll, level replay and reload passed');
 }finally{await context.close();}
};
