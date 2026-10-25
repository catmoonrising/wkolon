// Exercise the visible follow-up controls, including when the parent level
// editor has reopened an already-selected feature.
const secondary=page=>{
 const root=page.locator('#feature-tree-body');
 const choice=value=>root.locator('[data-feature-secondary-value='+JSON.stringify(value)+']');
 return {root,choice,pick:value=>choice(value).click(),labels:()=>root.locator('[data-feature-secondary-value]:not([data-feature-secondary-value=""])').evaluateAll(es=>es.map(e=>e.getAttribute('aria-label').replace(/^Select /,''))),selected:()=>root.locator('[data-feature-secondary-value][aria-pressed="true"]').getAttribute('data-feature-secondary-value')};
};
module.exports=secondary;
