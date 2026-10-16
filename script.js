const slides=[...document.querySelectorAll('.slide')];
const counter=document.getElementById('slide-counter');
const progress=document.getElementById('progress-bar');
const prev=document.getElementById('prev-button');
const next=document.getElementById('next-button');
const overview=document.getElementById('overview-dialog');
const overviewList=document.getElementById('overview-list');
const notesPanel=document.getElementById('notes-panel');
const notesContent=document.getElementById('notes-content');
let current=0;

function titleOf(slide){return slide.querySelector('h1,h2')?.innerText.trim().replace(/\s+/g,' ')||'Diapositiva'}

slides.forEach((slide,index)=>{
  const button=document.createElement('button');
  const number=document.createElement('span');
  number.textContent=String(index+1).padStart(2,'0');
  button.append(number,document.createTextNode(titleOf(slide)));
  button.addEventListener('click',()=>{overview.close();go(index)});
  overviewList.append(button);
});

function render(){
  slides.forEach((slide,index)=>{
    slide.hidden=index!==current;
    slide.classList.toggle('is-active',index===current);
  });
  counter.textContent=`${current+1} / ${slides.length}`;
  progress.style.width=`${((current+1)/slides.length)*100}%`;
  prev.disabled=current===0;
  next.disabled=current===slides.length-1;
  notesContent.textContent=slides[current].querySelector('.speaker-notes')?.textContent.trim()||'';
  document.title=`${titleOf(slides[current])} · Labor artística y gestión cultural`;
}

function go(index){
  current=Math.max(0,Math.min(slides.length-1,index));
  history.replaceState(null,'',`#slide-${current+1}`);
  render();
}

function readHash(){
  const match=location.hash.match(/^#slide-(\d+)$/);
  current=match?Math.max(0,Math.min(slides.length-1,Number(match[1])-1)):0;
  render();
}

prev.addEventListener('click',()=>go(current-1));
next.addEventListener('click',()=>go(current+1));
document.getElementById('overview-button').addEventListener('click',()=>overview.showModal());
document.getElementById('overview-close').addEventListener('click',()=>overview.close());
document.getElementById('notes-button').addEventListener('click',()=>{
  notesPanel.hidden=!notesPanel.hidden;
  document.getElementById('notes-button').setAttribute('aria-expanded',String(!notesPanel.hidden));
});
document.getElementById('notes-close').addEventListener('click',()=>{
  notesPanel.hidden=true;
  document.getElementById('notes-button').setAttribute('aria-expanded','false');
});
document.getElementById('fullscreen-button').addEventListener('click',async()=>{
  if(document.fullscreenElement)await document.exitFullscreen();
  else await document.documentElement.requestFullscreen();
});
document.addEventListener('keydown',event=>{
  if(overview.open||/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName))return;
  if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();go(current+1)}
  else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(current-1)}
  else if(event.key==='Home'){event.preventDefault();go(0)}
  else if(event.key==='End'){event.preventDefault();go(slides.length-1)}
  else if(event.key.toLowerCase()==='o')overview.showModal();
  else if(event.key.toLowerCase()==='n')document.getElementById('notes-button').click();
  else if(event.key.toLowerCase()==='f')document.getElementById('fullscreen-button').click();
});
window.addEventListener('hashchange',readHash);
readHash();
