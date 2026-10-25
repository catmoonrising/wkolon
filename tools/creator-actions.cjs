const body=page=>page.locator('#feature-tree-modal[open] #feature-tree-body, #creator-modal:not(:has(~ #feature-tree-modal[open])) #cr-body');
async function closePicker(page){if(await page.locator('#feature-tree-modal').isVisible())await page.locator('#feature-tree-close').click();}
async function tab(page,id){await closePicker(page);await page.locator('[data-creation-tab="'+id+'"]').click();}
async function openChoice(page,kind,level=0,slot=0){await tab(page,'levels');await page.locator('#cr-body [data-open-tree="'+kind+':'+level+':'+slot+'"]').click();}
async function chooseClass(page,id,level=0){await openChoice(page,'class',level);await body(page).locator('[data-tree-search]').fill(id.slice(6).replaceAll('-',' '));await body(page).locator('[data-tree-pick="'+id+'|"]').click();}
async function done(page,action='done'){await closePicker(page);await page.locator('#cr-'+action).click();}
async function search(page,value){const root=page.locator('#feature-tree-body');if(await root.locator('[data-feature-primary]').count())await root.locator('[data-feature-primary]').click();await root.locator('[data-tree-search]').fill(value);}
module.exports={search,body,tab,openChoice,chooseClass,done,closePicker};
