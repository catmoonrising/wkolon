const creationUI=require('./creator-actions.cjs');
const choose=async(page,kind,value,level=0,slot=0)=>{
 const body=page.locator('#cr-body'),modal=page.locator('#feature-tree-modal');
 const creation=await page.locator('#cr-stepper').isVisible();await creationUI.closePicker(page);if(creation)await creationUI.tab(page,'levels');
 const control=body.locator(`[data-choice="${kind}"][data-level="${level}"][data-slot="${slot}"][data-primary]`);
 if(await control.count())await control.click();
 const root=await modal.isVisible()?modal:body;
 if(await root.locator('[data-feature-primary]').count())await root.locator('[data-feature-primary]').click();
 if(await root.locator('[data-tree-group="all"]').count())await root.locator('[data-tree-group="all"]').click();
 await root.locator(`[data-tree-pick="${value}"]`).click();
 // Follow-up choices stay in the picker for both creation and advancement.
};
module.exports=choose;
