'use strict';
const {films,features,stories}=window.FILM_CONTENT;
const $=selector=>document.querySelector(selector);
const $$=selector=>[...document.querySelectorAll(selector)];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hero=$('.hero');
const heroVideo=$('#hero-video');
const brandVideo=$('#brand-video');
const brand=$('.brand-link');
const manifesto=$('.hero-manifesto');
const backgroundVideos=$$('[data-lazy-video]');
let pausedByUser=false;
let menuOpen=false;
let heroVisible=true;
let scrollFrame=0;
const visibleVideos=new Set();
const motionToggle=$('.motion-toggle');
function backgroundAllowed(){return !reduced.matches&&!pausedByUser&&!document.hidden&&!menuOpen&&!$('dialog[open]');}
function playBackground(video){
 if(!backgroundAllowed())return;
 if(video.dataset.lazyVideo&&!video.getAttribute('src'))video.src=video.dataset.lazyVideo;
 video.muted=true;
 const attempt=video.play();
 if(attempt)attempt.then(()=>{
  if(!backgroundAllowed()){video.pause();return;}
  if(video===heroVideo)video.classList.add('is-ready');
  else if(video!==brandVideo)video.classList.add('is-playing');
 }).catch(()=>{});
}
function updateMedia(){
 const allowed=backgroundAllowed();
 if(allowed&&heroVisible){playBackground(heroVideo);if(!brand.classList.contains('is-small'))playBackground(brandVideo);else brandVideo.pause();}
 else{heroVideo.pause();brandVideo.pause();}
 backgroundVideos.forEach(video=>{if(allowed&&visibleVideos.has(video))playBackground(video);else video.pause();});
}
heroVideo.addEventListener('loadeddata',()=>heroVideo.classList.add('is-ready'));
brandVideo.addEventListener('loadedmetadata',()=>{if(Number.isFinite(brandVideo.duration))brandVideo.currentTime=heroVideo.currentTime%brandVideo.duration;});
heroVideo.addEventListener('play',()=>{if(brandVideo.readyState>=1&&Math.abs(brandVideo.currentTime-heroVideo.currentTime)>.2)brandVideo.currentTime=heroVideo.currentTime;});
motionToggle.addEventListener('click',()=>{
 pausedByUser=!pausedByUser;
 motionToggle.textContent=pausedByUser?'播放 ▶':'暂停 Ⅱ';
 motionToggle.setAttribute('aria-label',pausedByUser?'播放动态影像':'暂停动态影像');
 motionToggle.setAttribute('aria-pressed',String(pausedByUser));updateMedia();
});
function paintScroll(){
 scrollFrame=0;
 const vh=innerHeight;
 const p=Math.min(1,Math.max(0,scrollY/(vh*.72)));
 const mobile=innerWidth<700;
 const maxWidth=Math.min(820,innerWidth*.44);
 const width=mobile?110:maxWidth+(110-maxWidth)*(1-Math.pow(1-p,2));
 brand.style.width=`${width.toFixed(2)}px`;
 const small=mobile||p>.94||menuOpen;
 const wasSmall=brand.classList.contains('is-small');
 brand.classList.toggle('is-small',small);
 if(menuOpen)brand.style.width='110px';
 const heroP=Math.min(1,Math.max(0,scrollY/vh));
 hero.style.setProperty('--hero-scale',reduced.matches?'1':(1+heroP*.17).toFixed(4));
 hero.style.setProperty('--hero-shade',(.18+heroP*.4).toFixed(4));
 const reveal=Math.min(1,Math.max(0,(heroP-.48)/.35));
 manifesto.style.opacity=reduced.matches?'1':reveal.toFixed(3);
 manifesto.style.transform=reduced.matches?'none':`translate3d(0,${((1-reveal)*35).toFixed(2)}px,0)`;
 if(wasSmall!==small)updateMedia();
}
function scheduleScroll(){if(!scrollFrame)scrollFrame=requestAnimationFrame(paintScroll);}
addEventListener('scroll',scheduleScroll,{passive:true});
addEventListener('resize',scheduleScroll,{passive:true});
paintScroll();
const mediaObserver=new IntersectionObserver(entries=>{
 entries.forEach(entry=>{
  if(entry.target===hero)heroVisible=entry.isIntersecting;
  else{const video=entry.target.querySelector('[data-lazy-video]');if(!video)return;if(entry.isIntersecting)visibleVideos.add(video);else visibleVideos.delete(video);}
 });updateMedia();
},{threshold:0});
mediaObserver.observe(hero);
backgroundVideos.forEach(video=>mediaObserver.observe(video.parentElement));
const revealTargets=new Map();
const revealObserver=new IntersectionObserver(entries=>{
 entries.forEach(entry=>{if(entry.isIntersecting){revealTargets.get(entry.target)?.forEach(el=>el.classList.add('is-revealed'));revealObserver.unobserve(entry.target);}});
},{threshold:.06,rootMargin:'0px 0px 5% 0px'});
if(!reduced.matches)document.body.classList.add('js-motion');
$$('.media-reveal').forEach(el=>{const target=el.parentElement;const list=revealTargets.get(target)||[];list.push(el);revealTargets.set(target,list);revealObserver.observe(target);});
reduced.addEventListener('change',()=>{document.body.classList.toggle('js-motion',!reduced.matches);motionToggle.hidden=reduced.matches;paintScroll();updateMedia();});
document.addEventListener('visibilitychange',()=>{updateMedia();if(document.hidden)$('#dialog-video').pause();});
motionToggle.hidden=reduced.matches;
updateMedia();

// Mobile navigation preserves native scrolling and closes before anchor navigation.
const menu=$('#mobile-menu');
const menuToggle=$('.menu-toggle');
function setMenu(open){
 menuOpen=open;
 document.body.classList.toggle('menu-is-open',open);
 menu.inert=!open;
 menuToggle.setAttribute('aria-expanded',String(open));
 paintScroll();updateMedia();
 if(open)requestAnimationFrame(()=>menu.querySelector('a').focus({preventScroll:true}));
}
menuToggle.addEventListener('click',()=>setMenu(!menuOpen));
menu.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
document.addEventListener('keydown',event=>{
 if(!menuOpen)return;
 if(event.key==='Escape'){setMenu(false);menuToggle.focus();}
 if(event.key==='Tab'){
  const stops=[menuToggle,...menu.querySelectorAll('a')];
  const i=stops.indexOf(document.activeElement);
  if(event.shiftKey&&(i<=0)){event.preventDefault();stops.at(-1).focus();}
  else if(!event.shiftKey&&i===stops.length-1){event.preventDefault();stops[0].focus();}
 }
});
addEventListener('resize',()=>{if(innerWidth>=700&&menuOpen)setMenu(false);});

// Features follow the reference's large image + copy + navigation + thumbnails.
let featureIndex=0;
let featureToken=0;
let featureAnimation;
const imageStack=$('.feature-image-stack');
const featureSection=$('#features');
async function showFeature(index){
 const next=(index+features.length)%features.length;
 if(next===featureIndex)return;
 const previous=featureIndex;
 featureIndex=next;
 const token=++featureToken;
 const feature=features[next];
 const incoming=new Image();incoming.src=feature.image;incoming.alt=`${feature.title}，AI生成场景示意`;incoming.width=1536;incoming.height=1024;
 try{await incoming.decode();}catch{return;}
 if(token!==featureToken)return;
 featureAnimation?.finish();
 const outgoing=imageStack.lastElementChild;
 imageStack.append(incoming);
 const direction=next>previous;
 const start=direction?'inset(0 100% 0 0)':'inset(0 0 0 100%)';
 featureAnimation=incoming.animate([{clipPath:start,transform:'scale(1.04)'},{clipPath:'inset(0)',transform:'scale(1)'}],{duration:reduced.matches?0:600,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});
 $('.feature-index').textContent=`0${next+1} / 04`;
 $('#feature-title').textContent=feature.title;
 $('#feature-description').textContent=feature.description;
 $('#feature-note').textContent=feature.note;
 $$('[data-feature]').forEach(button=>{const selected=Number(button.dataset.feature)===next;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));});
 if(!reduced.matches)$('.feature-copy>div').animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:450,easing:'ease-out'});
 try{await featureAnimation.finished;}catch{}
 outgoing?.remove();
 if(token===featureToken){incoming.style.clipPath='none';featureAnimation.cancel();featureAnimation=null;}
}
$('#feature-prev').addEventListener('click',()=>showFeature(featureIndex-1));
$('#feature-next').addEventListener('click',()=>showFeature(featureIndex+1));
$$('[data-feature]').forEach(button=>button.addEventListener('click',()=>showFeature(Number(button.dataset.feature))));
featureSection.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();showFeature(featureIndex+(event.key==='ArrowRight'?1:-1));}});
let touchStart;
imageStack.addEventListener('touchstart',event=>{const t=event.changedTouches[0];touchStart={x:t.clientX,y:t.clientY};},{passive:true});
imageStack.addEventListener('touchend',event=>{if(!touchStart)return;const t=event.changedTouches[0];const dx=t.clientX-touchStart.x;const dy=t.clientY-touchStart.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)showFeature(featureIndex+(dx<0?1:-1));touchStart=null;},{passive:true});

// Real, reversible dialogs for viewing footage, story details and consultation.
const videoDialog=$('#video-dialog');
const dialogVideo=$('#dialog-video');
const pricingDialog=$('#pricing-dialog');
const consultDialog=$('#consult-dialog');
const storyDialog=$('#story-dialog');
let selectedStory=0;
function openDialog(dialog){setMenu(false);dialog.showModal();document.body.classList.add('dialog-is-open');updateMedia();$('.cursor-label').classList.remove('is-visible');}
$$('dialog').forEach(dialog=>{
 dialog.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>{
  document.body.classList.toggle('dialog-is-open',!!$('dialog[open]'));
  if(dialog===videoDialog){dialogVideo.pause();dialogVideo.removeAttribute('src');dialogVideo.load();}
  updateMedia();
 });
});
function openFilm(index){
 const film=index===-1?{title:'树上花开 · 人生影像',video:'assets/hero-reel.mp4',poster:'assets/hero-family.jpg'}:films[index];
 if(!film)return;
 $('#video-title').textContent=film.title;
 dialogVideo.poster=film.poster;dialogVideo.src=film.video;
 openDialog(videoDialog);
 dialogVideo.play().catch(()=>{});
}
$$('[data-film]').forEach(button=>button.addEventListener('click',()=>openFilm(Number(button.dataset.film))));
$$('[data-reel]').forEach(button=>button.addEventListener('click',()=>openFilm(-1)));
$$('[data-story]').forEach(button=>button.addEventListener('click',()=>{
 selectedStory=Number(button.dataset.story);
 const story=stories[selectedStory];
 $('#dialog-story-image').src=story.image;$('#dialog-story-image').alt=story.title;
 $('#dialog-story-category').textContent=story.label;
 $('#dialog-story-title').textContent=story.title;
 $('#dialog-story-description').textContent=story.description;
 openDialog(storyDialog);
}));
function openConsult(packageName='聊聊我的故事',category='自己'){
 $('#consult-package').value=packageName;$('#consult-category').value=category;$('#copy-status').textContent='';openDialog(consultDialog);
}
$$('[data-consult]').forEach(button=>button.addEventListener('click',()=>{if(pricingDialog.open)pricingDialog.close();openConsult(button.dataset.consult);}));
$('#story-consult').addEventListener('click',()=>{storyDialog.close();openConsult('聊聊我的故事',stories[selectedStory].category);});
$$('[data-open-pricing]').forEach(link=>link.addEventListener('click',event=>{event.preventDefault();openDialog(pricingDialog);}));
pricingDialog.querySelector('a[href="#contact"]').addEventListener('click',event=>{event.preventDefault();pricingDialog.close();requestAnimationFrame(()=>$('#contact').scrollIntoView({behavior:reduced.matches?'instant':'smooth'}));});
$('#quick-consult').addEventListener('submit',event=>{event.preventDefault();$('#consult-story').value=$('#quick-story').value.trim();openConsult();});
$('#consult-form').addEventListener('submit',async event=>{
 event.preventDefault();
 const story=$('#consult-story').value.trim();if(!story)return;
 const brief=`我的纪录片需求\n方案：${$('#consult-package').value}\n记录对象：${$('#consult-category').value}\n想留下的故事：${story}`;
 try{await navigator.clipboard.writeText(brief);$('#copy-status').textContent='已复制。可以粘贴给制作方；此处没有发送或提交内容。';}
 catch{$('#consult-story').value=brief;$('#consult-story').focus();$('#consult-story').select();$('#copy-status').textContent='请复制已选中的咨询内容，保存后用于沟通。';}
});
if(location.hash==='#pricing')openDialog(pricingDialog);

// Desktop pointer label accompanies imagery without replacing focus or touch controls.
const cursor=$('.cursor-label');
if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!reduced.matches){
 $$('[data-cursor]').forEach(target=>{
  target.addEventListener('pointerenter',()=>{if($('dialog[open]'))return;cursor.textContent=target.dataset.cursor;cursor.classList.add('is-visible');});
  target.addEventListener('pointerleave',()=>cursor.classList.remove('is-visible'));
 });
 addEventListener('pointermove',event=>{cursor.style.transform=`translate3d(${event.clientX}px,${event.clientY}px,0) translate(-50%,-50%)`;},{passive:true});
 document.addEventListener('pointerleave',()=>cursor.classList.remove('is-visible'));
}
