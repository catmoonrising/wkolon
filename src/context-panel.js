// A light-dismiss panel in the browser's top layer, anchored to its opening click.
export function contextPanel(element, onClose) {
 let opener=null, point={x:8,y:8};
 const isOpen=()=>element.matches(':popover-open');
 const nestedDialog=()=>document.querySelector('dialog:modal');
 function position(){
  if(!isOpen())return;
  const viewport=window.visualViewport, left=viewport?.offsetLeft||0, top=viewport?.offsetTop||0;
  const width=viewport?.width||innerWidth, height=viewport?.height||innerHeight;
  element.style.maxWidth=`${Math.max(0,width-16)}px`;
  element.style.maxHeight=`${Math.max(0,height-16)}px`;
  const box=element.getBoundingClientRect();
  element.style.left=`${Math.max(left+8,Math.min(point.x,left+width-box.width-8))}px`;
  element.style.top=`${Math.max(top+8,Math.min(point.y,top+height-box.height-8))}px`;
 }
 function anchor(button,event){
  if(isOpen()||element.contains(button)||event?.composedPath().includes(element))return;
  opener=button;
  const box=button.getBoundingClientRect();
  point=event?.detail>0?{x:event.clientX+2,y:event.clientY+2}:{x:box.left,y:box.bottom+2};
 }
 function focus(){
  (element.querySelector('#actions-body button:not(:disabled), #actions-body input:not(:disabled), #actions-body select:not(:disabled)')||element).focus({preventScroll:true});
 }
 element.addEventListener('beforetoggle',event=>{
  if(event.newState==='closed'){
   opener?.removeAttribute('aria-expanded');
   onClose();
  }
 });
 element.addEventListener('keydown',event=>{
  if(event.key==='Escape'){
   event.preventDefault();event.stopPropagation();close();
  }
  if(event.target.closest('.action-menu')&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){
   event.preventDefault();
   const items=[...element.querySelectorAll('.action-menu > button:not(:disabled)')];
   const index=items.indexOf(document.activeElement), next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
   items[next]?.focus({preventScroll:true});
   items[next]?.scrollIntoView({block:'nearest'});
  }
 });
 function close(){
  if(!isOpen())return;
  element.hidePopover();
  if(opener?.isConnected)opener.focus({preventScroll:true});
 }
 document.addEventListener('pointerdown',event=>{
  if(isOpen()&&!element.contains(event.target)&&!nestedDialog())element.hidePopover();
 },true);
 document.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&isOpen()&&!nestedDialog()){
   event.preventDefault();event.stopPropagation();close();
  }
 });
 new ResizeObserver(position).observe(element);
 window.addEventListener('resize',position);
 window.visualViewport?.addEventListener('resize',position);
 window.visualViewport?.addEventListener('scroll',position);
 // Allow scrolling long menus; dismiss when the user scrolls the page instead.
 for(const type of ['wheel','touchmove'])document.addEventListener(type,event=>{
  if(isOpen()&&!element.contains(event.target)&&!nestedDialog())element.hidePopover();
 },{passive:true});
 return {anchor,isOpen,close,open(){
  if(!isOpen())element.showPopover();
  opener?.setAttribute('aria-expanded','true');
  position();focus();
 }};
}
