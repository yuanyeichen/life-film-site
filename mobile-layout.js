'use strict';
// Keep desktop hover intact. On touch, select first; open details on a second tap.
(()=>{
 const gallery=document.querySelector('.story-exhibit');
 if(!gallery)return;
 const cards=[...gallery.querySelectorAll('.story-card')];
 const touchLayout=matchMedia('(max-width:699px), (hover:none) and (pointer:coarse) and (max-width:1100px)');
 let active=0;
 let gesture=null;
 let ignoreClickUntil=0;
 function select(index){
  active=Math.max(0,Math.min(cards.length-1,index));
  cards.forEach((card,i)=>{
   card.classList.toggle('is-active',touchLayout.matches&&i===active);
   const photo=card.querySelector('.story-photo');
   if(touchLayout.matches)photo.setAttribute('aria-expanded',String(i===active));
   else photo.removeAttribute('aria-expanded');
  });
 }
 gallery.addEventListener('click',event=>{
  if(!touchLayout.matches)return;
  const card=event.target.closest('.story-card');
  if(!card)return;
  if(Date.now()<ignoreClickUntil){event.preventDefault();event.stopImmediatePropagation();return;}
  const index=cards.indexOf(card);
  if(index!==active){event.preventDefault();event.stopImmediatePropagation();select(index);}
 },true);
 gallery.addEventListener('pointerdown',event=>{
  if(!touchLayout.matches||event.pointerType==='mouse'||!event.isPrimary)return;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 },{passive:true});
 gallery.addEventListener('pointerup',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  const dx=event.clientX-gesture.x;
  const dy=event.clientY-gesture.y;
  gesture=null;
  if(!touchLayout.matches||Math.abs(dx)<32||Math.abs(dx)<Math.abs(dy)*1.25)return;
  ignoreClickUntil=Date.now()+400;
  select(active+(dx<0?1:-1));
 },{passive:true});
 gallery.addEventListener('pointercancel',()=>{gesture=null;},{passive:true});
 gallery.addEventListener('keydown',event=>{
  if(!touchLayout.matches||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  event.preventDefault();
  select(event.key==='Home'?0:event.key==='End'?cards.length-1:active+(event.key==='ArrowRight'?1:-1));
  cards[active].querySelector('.story-photo').focus({preventScroll:true});
 });
 touchLayout.addEventListener('change',()=>{gesture=null;select(active);});
 select(active);
})();
