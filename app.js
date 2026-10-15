'use strict';
const storyData = {
  family: {label:'家庭',english:'FAMILY',number:'01',image:'assets/family.jpg',title:'一个家的来路',description:'他们是父母，也曾是少年。把年轻时的选择、共同生活的片段和一家人的记忆串联起来，让家里的故事有人讲，也有人记得。'},
  friends: {label:'朋友',english:'FRIENDS',number:'02',image:'assets/friends.jpg',title:'一起走过的日子',description:'一起出发的旅行，一起熬过的难关，还有那些说起就会笑的往事。记录彼此如何相遇，也记录你们怎样陪伴对方走过一段人生。'},
  love: {label:'恋人',english:'LOVE',number:'03',image:'assets/love.jpg',title:'从相遇，到我们',description:'从最初的相遇，到后来共同生活的日子。值得留下的，除了重要的纪念日，还有那些只有你们才懂的平常细节。'},
  life: {label:'其他',english:'YOUR OWN',number:'04',image:'assets/life.jpg',title:'成为自己的路上',description:'一次选择，一段旅程，一项坚持多年的热爱。可以为自己，也可以为任何重要的人，把最想留下的经历讲述成一部属于你的电影。'}
};
// Cover navigation has its own labels and imagery; existing story content stays intact.
const coverData = {
  family: {label:'岁月长河',english:'LIFE STORY',number:'01',image:'assets/hero-life.jpg',video:'assets/hero-life.mp4',consultCategory:'自己'},
  friends: {label:'峥嵘岁月',english:'ENTREPRENEUR',number:'02',image:'assets/hero-business.jpg',video:'assets/hero-business.mp4',consultCategory:'其他'},
  love: {label:'家族传承',english:'FAMILY LEGACY',number:'03',image:'assets/hero-family.jpg',video:'assets/hero-family.mp4',consultCategory:'家庭'},
  life: {label:'挚爱时光',english:'CHERISHED DAYS',number:'04',image:'assets/hero-love.jpg',video:'assets/hero-love.mp4',consultCategory:'恋人'}
};
const hero = document.querySelector('.hero');
const previewImage = document.querySelector('#preview-image');
const choices = [...document.querySelectorAll('.hero-choice')];
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let activeCategory = 'family';
Object.values(storyData).forEach(story => {const img = new Image(); img.src = story.image;});

function activateCategory(category) {
  if (!coverData[category] || activeCategory === category) return;
  activeCategory = category;
  hero.dataset.category = category;
  choices.forEach(choice => {
    const selected = choice.dataset.category === category;
    choice.classList.toggle('is-active', selected);
    choice.querySelector('.choice-name').setAttribute('aria-pressed', String(selected));
    choice.querySelector('.choice-link').tabIndex = selected ? 0 : -1;
  });
  requestHeroScene(category);

}
choices.forEach(choice => {
  choice.addEventListener('pointerenter', event => {if(event.pointerType === 'mouse') activateCategory(choice.dataset.category);});
  choice.querySelector('.choice-name').addEventListener('focus', () => activateCategory(choice.dataset.category));
  choice.querySelector('.choice-name').addEventListener('click', () => activateCategory(choice.dataset.category));
});

// One horizontal mask timeline drives both the poster and its video.
const heroScenes = [...document.querySelectorAll('.hero-scene')];
const heroVideoLayers = heroScenes.map(scene => scene.querySelector('video'));
const previewVideo = document.querySelector('#preview-video');
const heroMotionToggle = document.querySelector('.hero-motion-toggle');
let currentScene = heroScenes[0];
let requestedCategory = 'family';
let sceneBusy = false;
let sceneAnimation;
let heroPausedByUser = false;
let heroInView = true;
function heroMotionAllowed() {return !reducedMotion.matches && !heroPausedByUser && !document.hidden && heroInView;}
function pauseHeroVideos() {heroVideoLayers.forEach(video => video.pause());previewVideo.pause();}
function playSceneVideo(scene) {
  const video = scene.querySelector('video');
  if (!heroMotionAllowed()) {video.pause();return;}
  video.play().then(() => {
    if (heroMotionAllowed() && (scene === currentScene || scene.classList.contains('is-entering'))) video.classList.add('is-visible');
    else video.pause();
  }).catch(() => video.classList.remove('is-visible'));
}
function updateHeroPreview(category) {
  const story = coverData[category];
  previewImage.src = story.image;
  document.querySelector('#preview-label').textContent = `${story.label} / ${story.english}`;
  document.querySelector('#preview-count').textContent = `${story.number} — 04`;
  previewVideo.classList.remove('is-visible');
  previewVideo.poster = story.image;
  previewVideo.src = story.video;
  if (heroMotionAllowed()) previewVideo.play().then(() => {
    if (previewVideo.getAttribute('src') === story.video && heroMotionAllowed()) previewVideo.classList.add('is-visible');
  }).catch(() => {});
}
function requestHeroScene(category) {
  requestedCategory = category;
  drainHeroScene();
}
async function drainHeroScene() {
  if (sceneBusy || currentScene.dataset.category === requestedCategory) return;
  sceneBusy = true;
  const category = requestedCategory;
  const story = coverData[category];
  const incoming = heroScenes.find(scene => scene !== currentScene);
  const outgoing = currentScene;
  const video = incoming.querySelector('video');
  const poster = incoming.querySelector('img');
  video.pause();video.classList.remove('is-visible');
  incoming.dataset.category = category;
  poster.src = story.image;
  video.poster = story.image;video.src = story.video;
  try {await poster.decode();} catch {}
  // If the pointer crossed multiple headings while loading, show only the latest request.
  if (category !== requestedCategory) {sceneBusy = false;drainHeroScene();return;}
  const forwards = Object.keys(coverData).indexOf(category) > Object.keys(coverData).indexOf(outgoing.dataset.category);
  incoming.dataset.direction = forwards ? 'right' : 'left';
  incoming.classList.add('is-entering');
  playSceneVideo(incoming);
  updateHeroPreview(category);
  const duration = reducedMotion.matches ? 0 : 800;
  const easing = 'cubic-bezier(.16,1,.3,1)';
  sceneAnimation = incoming.animate({'--scene-reveal':['0%','100%']},{duration,easing,fill:'both'});
  const zooms = [...incoming.children].map(media => media.animate(
    {transform:['scale(1.075)','scale(1)']},{duration,easing,fill:'both'}));
  try {await sceneAnimation.finished;} catch {}
  incoming.classList.add('is-current');incoming.classList.remove('is-entering');
  outgoing.classList.remove('is-current');outgoing.querySelector('video').pause();
  currentScene = incoming;
  sceneAnimation.cancel();zooms.forEach(animation => animation.cancel());
  sceneAnimation = null;
  sceneBusy = false;
  drainHeroScene();
}
function resumeHeroMedia() {
  if (!heroMotionAllowed()) {pauseHeroVideos();return;}
  playSceneVideo(currentScene);
  if (sceneBusy) heroScenes.filter(scene => scene.classList.contains('is-entering')).forEach(playSceneVideo);
  previewVideo.play().then(() => {if(heroMotionAllowed())previewVideo.classList.add('is-visible');}).catch(() => {});
}
heroMotionToggle.addEventListener('click',()=>{
  heroPausedByUser=!heroPausedByUser;
  heroMotionToggle.textContent=heroPausedByUser?'▶':'Ⅱ';
  heroMotionToggle.setAttribute('aria-label',heroPausedByUser?'播放封面影像':'暂停封面影像');
  heroMotionToggle.setAttribute('aria-pressed',String(heroPausedByUser));
  resumeHeroMedia();
});
document.addEventListener('visibilitychange',resumeHeroMedia);
reducedMotion.addEventListener('change',()=>{
  heroMotionToggle.hidden=reducedMotion.matches;
  if (reducedMotion.matches) sceneAnimation?.finish();
  resumeHeroMedia();
});
if('IntersectionObserver' in window) {
  new IntersectionObserver(entries=>{heroInView=entries[0].isIntersecting;resumeHeroMedia();},{threshold:0}).observe(hero);
}
heroMotionToggle.hidden=reducedMotion.matches;
resumeHeroMedia();

function filterStories(category) {
  if (category !== 'all' && !storyData[category]) return;
  document.querySelectorAll('[data-story-filter]').forEach(button => {
    const selected = button.dataset.storyFilter === category;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  document.querySelectorAll('.story-card').forEach(card => {card.hidden = category !== 'all' && card.dataset.story !== category;});
}
document.querySelectorAll('[data-story-filter]').forEach(button => button.addEventListener('click', () => filterStories(button.dataset.storyFilter)));
document.querySelectorAll('[data-filter]').forEach(link => link.addEventListener('click', () => filterStories(link.dataset.filter)));

const menuToggle = document.querySelector('.menu-toggle');
const menu = document.querySelector('#site-menu');
function setMenu(open) {menuToggle.setAttribute('aria-expanded', String(open)); menu.hidden = !open;}
menuToggle.addEventListener('click', () => setMenu(menu.hidden));
menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setMenu(false)));
document.addEventListener('click', event => {if(!menu.hidden && !menu.contains(event.target) && !menuToggle.contains(event.target)) setMenu(false);});
document.addEventListener('keydown', event => {if(event.key === 'Escape' && !menu.hidden) {setMenu(false);menuToggle.focus();}});

const storyDialog = document.querySelector('#story-dialog');
const consultDialog = document.querySelector('#consult-dialog');
let selectedStory = 'family';
function openDialog(dialog) {dialog.showModal(); document.body.style.overflow = 'hidden';}
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if(event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if(event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {if(!document.querySelector('dialog[open]')) document.body.style.overflow = '';});
});
document.querySelectorAll('[data-story]').forEach(button => button.addEventListener('click', () => {
  selectedStory = button.dataset.story;
  const story = storyData[selectedStory];
  document.querySelector('#dialog-story-image').src = story.image;
  document.querySelector('#dialog-story-image').alt = story.title;
  document.querySelector('#dialog-story-category').textContent = `${story.label} / ${story.english}`;
  document.querySelector('#dialog-story-title').textContent = story.title;
  document.querySelector('#dialog-story-description').textContent = story.description;
  openDialog(storyDialog);
}));
function openConsult(packageName,category) {
  document.querySelector('#consult-package').value = packageName;
  document.querySelector('#consult-category').value = category ? (storyData[category]?.label || '其他') : coverData[activeCategory].consultCategory;
  document.querySelector('#copy-status').textContent = '';
  openDialog(consultDialog);
}
document.querySelectorAll('[data-consult]').forEach(button => button.addEventListener('click', () => openConsult(button.dataset.consult)));
document.querySelector('#story-consult').addEventListener('click', () => {storyDialog.close();openConsult('聊聊我的故事',selectedStory);});
document.querySelector('#consult-form').addEventListener('submit', async event => {
  event.preventDefault();
  const story = document.querySelector('#consult-story').value.trim();
  if(!story) {document.querySelector('#consult-story').focus();return;}
  const brief = `我的纪录片需求\n方案：${document.querySelector('#consult-package').value}\n记录对象：${document.querySelector('#consult-category').value}\n想留下的故事：${story}`;
  const status = document.querySelector('#copy-status');
  try {
    if(!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(brief);
    status.textContent = '已复制。你可以保存或粘贴给制作方；内容没有提交。';
  } catch {
    const textArea = document.querySelector('#consult-story');
    textArea.value = brief;
    textArea.focus();textArea.select();
    status.textContent = '请复制已选中的咨询内容，保存后用于沟通。';
  }
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.12});
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
} else document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));

// Reversible scroll-driven paper cover and line reveals. Native scroll stays intact.
const timelineSection = document.querySelector('.life-timeline');
if (timelineSection && !reducedMotion.matches) {
  const albumRows = [...timelineSection.querySelectorAll('.timeline-card')];
  const albumElements = albumRows.map(row => ({row,frame:row.querySelector('.timeline-frame'),lines:[...row.querySelectorAll('.album-line-mask')]}));
  const clamp01 = value => Math.max(0,Math.min(1,value));
  let albumFramePending = false;
  function updateAlbumMotion() {
    albumFramePending = false;
    if (reducedMotion.matches) return;
    albumElements.forEach(({row,frame,lines}) => {
      const rect = frame.getBoundingClientRect();
      if (rect.bottom < -innerHeight || rect.top > innerHeight * 2) return;
      const progress = clamp01((innerHeight * .94 - rect.top) / (innerHeight * .6));
      row.style.setProperty('--page-progress',progress.toFixed(4));
      row.style.setProperty('--caption-progress',clamp01((progress-.5)*2).toFixed(4));
      lines.forEach((line,index) => {
        const offsets = [.08,.14,.23,.30,.36,.36];
        const offset = offsets[index] ?? .36;
        line.style.setProperty('--line-progress',clamp01((progress-offset)/(1-offset)).toFixed(4));
      });
      const parallax = Math.max(-1,Math.min(1,((rect.top+rect.height/2)-innerHeight/2)/innerHeight));
      frame.style.setProperty('--image-shift',`${(-parallax*18).toFixed(2)}px`);
    });
  }
  function scheduleAlbumMotion() {
    if (!albumFramePending) {albumFramePending=true;requestAnimationFrame(updateAlbumMotion);}
  }
  updateAlbumMotion();
  timelineSection.classList.add('timeline-motion');
  addEventListener('scroll',scheduleAlbumMotion,{passive:true});
  addEventListener('resize',scheduleAlbumMotion,{passive:true});
  addEventListener('load',scheduleAlbumMotion,{once:true});
  reducedMotion.addEventListener('change',event => {
    if (event.matches) timelineSection.classList.remove('timeline-motion');
  });
}

// A native-scroll, reversible expansion from the middle character toward both edges.
const filmStatement = document.querySelector('.film-statement');
if (filmStatement) {
  const filmStage = filmStatement.querySelector('.film-stage');
  const filmReveal = filmStatement.querySelector('.film-reveal');
  const filmLetters = [...filmStatement.querySelectorAll('.film-glyph')];
  let filmTarget = 0;
  let filmCurrent = 0;
  let filmTick = 0;
  let filmLetterWidth = 0;
  function paintFilm() {
    const expansion = Math.max(0,Math.min(1,filmCurrent / .72));
    const eased = expansion * expansion * (3 - 2 * expansion);
    const cover = ((1-eased)*48.5).toFixed(3);
    filmReveal.style.clipPath = `inset(0 ${cover}% 0 ${cover}%)`;
    const midpoint = (filmLetters.length-1)/2;
    filmLetters.forEach((letter,index) => {
      const offset = (midpoint-index) * filmLetterWidth * .08 * (1-eased);
      letter.style.transform = `translate3d(${offset.toFixed(3)}px,0,0)`;
    });
    filmStatement.dataset.progress = filmCurrent.toFixed(3);
  }
  function animateFilm() {
    filmTick=0;
    filmCurrent += (filmTarget-filmCurrent)*.13;
    if(Math.abs(filmTarget-filmCurrent)<.0003) filmCurrent=filmTarget;
    paintFilm();
    if(filmCurrent!==filmTarget) filmTick=requestAnimationFrame(animateFilm);
  }
  function measureFilm() {
    if(reducedMotion.matches) return;
    const rect=filmStatement.getBoundingClientRect();
    const distance=filmStatement.offsetHeight-filmStage.offsetHeight;
    filmLetterWidth=filmLetters[0].getBoundingClientRect().width;
    filmTarget=Math.max(0,Math.min(1,-rect.top/Math.max(1,distance)));
    if(!filmTick) filmTick=requestAnimationFrame(animateFilm);
  }
  function setFilmMotion() {
    filmStatement.classList.toggle('is-animated',!reducedMotion.matches);
    if(reducedMotion.matches) {
      cancelAnimationFrame(filmTick);filmTick=0;
      filmReveal.style.clipPath='none';
      filmLetters.forEach(letter=>letter.style.transform='none');
    } else measureFilm();
  }
  addEventListener('scroll',measureFilm,{passive:true});
  addEventListener('resize',measureFilm,{passive:true});
  addEventListener('load',measureFilm,{once:true});
  reducedMotion.addEventListener('change',setFilmMotion);
  setFilmMotion();
}
