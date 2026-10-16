const sourceMarkup=document.documentElement.outerHTML;
const slides=[...document.querySelectorAll('.slide')], counter=document.getElementById('slide-counter'), progress=document.getElementById('progress-bar'), prev=document.getElementById('prev-button'), next=document.getElementById('next-button');
const overview=document.getElementById('overview-dialog'), overviewList=document.getElementById('overview-list'), notesPanel=document.getElementById('notes-panel'), notesContent=document.getElementById('notes-content');
const mediaDialog=document.getElementById('media-dialog'), mediaForm=document.getElementById('media-form'), mediaKind=document.getElementById('media-kind'), mediaList=document.getElementById('media-list'), mediaError=document.getElementById('media-error'), downloadButton=document.getElementById('download-button');
let current=0,mediaBySlide={};
const mediaPosition={}, embeddedMedia=document.getElementById('embedded-media'), storageKey='saga-cultural-slide-media-v1:'+location.pathname;
const titleOf=slide=>slide.querySelector('h1,h2')?.innerText.trim().replace(/\s+/g,' ')||'Diapositiva';
function showError(message){mediaError.textContent=message;mediaError.hidden=!message}
function safeHttpUrl(value){try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)?url:null}catch{return null}}
function videoSource(value){
  const url=safeHttpUrl(value);if(!url)return null;
  const host=url.hostname.toLowerCase().replace(/^www\./,'');let id='';
  if(host==='youtu.be')id=url.pathname.split('/')[1]||'';
  if(host==='youtube.com'||host==='m.youtube.com'){
    if(url.pathname==='/watch')id=url.searchParams.get('v')||'';
    else if(/^\/(embed|shorts|live)\//.test(url.pathname))id=url.pathname.split('/')[2]||'';
  }
  if(/^[A-Za-z0-9_-]{11}$/.test(id))return {kind:'youtube',src:`https://www.youtube-nocookie.com/embed/${id}`};
  if(/\.(mp4|webm|ogg)$/i.test(url.pathname))return {kind:'file',src:url.href};
  return null;
}
function openDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open('saga-cultural-presentation',1);request.onupgradeneeded=()=>request.result.createObjectStore('media');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}
async function readSavedMedia(){const db=await openDatabase();try{return await new Promise((resolve,reject)=>{const request=db.transaction('media','readonly').objectStore('media').get(storageKey);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)})}finally{db.close()}}
async function saveMedia(){const db=await openDatabase();try{await new Promise((resolve,reject)=>{const tx=db.transaction('media','readwrite');tx.objectStore('media').put(mediaBySlide,storageKey);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
function fileAsDataUrl(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(file)})}
function wrapSlides(){
  slides.forEach(slide=>{const inner=slide.querySelector('.slide-inner'),copy=document.createElement('div');copy.className='slide-copy';
    for(const name of [...inner.classList])if(name!=='slide-inner'){copy.classList.add(name);inner.classList.remove(name)}
    while(inner.firstChild)copy.append(inner.firstChild);
    const stage=document.createElement('figure');stage.className='slide-media-stage';stage.hidden=true;inner.append(copy,stage)
  })
}
function renderMedia(slide){
  const items=mediaBySlide[slide.id]||[],inner=slide.querySelector('.slide-inner'),stage=slide.querySelector('.slide-media-stage');
  inner.classList.toggle('has-media',items.length>0);stage.hidden=!items.length;stage.replaceChildren();if(!items.length)return;
  const position=Math.min(mediaPosition[slide.id]||0,items.length-1),item=items[position];mediaPosition[slide.id]=position;
  const frame=document.createElement('div');frame.className='media-frame';
  if(item.kind==='photo'){const img=document.createElement('img');img.src=item.src;img.alt=item.alt||item.caption||'Imagen agregada a la diapositiva';img.loading='lazy';frame.append(img)}
  else if(item.kind==='youtube'){const iframe=document.createElement('iframe');iframe.src=item.src;iframe.title=item.caption||'Video agregado a la diapositiva';iframe.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';frame.append(iframe)}
  else{const video=document.createElement('video');video.src=item.src;video.controls=true;video.preload='metadata';frame.append(video)}
  stage.append(frame);
  if(item.caption){const caption=document.createElement('figcaption');caption.textContent=item.caption;stage.append(caption)}
  if(items.length>1){const controls=document.createElement('div'),before=document.createElement('button'),count=document.createElement('span'),after=document.createElement('button');
    controls.className='media-carousel';before.type=after.type='button';before.textContent='←';after.textContent='→';count.textContent=`${position+1} / ${items.length}`;
    before.setAttribute('aria-label','Material anterior');after.setAttribute('aria-label','Material siguiente');
    before.addEventListener('click',()=>{mediaPosition[slide.id]=(position-1+items.length)%items.length;renderMedia(slide)});
    after.addEventListener('click',()=>{mediaPosition[slide.id]=(position+1)%items.length;renderMedia(slide)});
    controls.append(before,count,after);stage.append(controls)}
}
function renderMediaList(){
  const slide=slides[current],items=mediaBySlide[slide.id]||[];
  document.getElementById('media-slide-name').textContent=`${current+1}. ${titleOf(slide)}`;mediaList.replaceChildren();
  if(!items.length){const empty=document.createElement('p');empty.className='empty-media';empty.textContent='Todavía no hay fotos ni videos en esta diapositiva.';mediaList.append(empty);return}
  items.forEach((item,index)=>{const row=document.createElement('div'),label=document.createElement('span'),remove=document.createElement('button');
    row.className='media-list-item';label.textContent=`${index+1}. ${item.kind==='photo'?'Foto':'Video'}${item.caption?' · '+item.caption:''}`;
    remove.type='button';remove.textContent='Quitar';remove.setAttribute('aria-label',`Quitar material ${index+1}`);
    remove.addEventListener('click',async()=>{items.splice(index,1);mediaPosition[slide.id]=0;renderMedia(slide);renderMediaList();try{await saveMedia()}catch{showError('No se pudo guardar el cambio. Descargá una copia para conservarlo.')}});
    row.append(label,remove);mediaList.append(row)})
}
function toggleMediaFields(){document.getElementById('photo-fields').hidden=mediaKind.value!=='photo';document.getElementById('video-fields').hidden=mediaKind.value!=='video'}
async function addMedia(event){
  event.preventDefault();showError('');const caption=document.getElementById('media-caption').value.trim();let item;
  if(mediaKind.value==='photo'){
    const file=document.getElementById('photo-file').files[0],url=document.getElementById('photo-url').value.trim(),alt=document.getElementById('photo-alt').value.trim();
    if(file){if(!file.type.startsWith('image/'))return showError('Elegí un archivo de imagen.');if(file.size>12*1024*1024)return showError('La foto debe pesar menos de 12 MB.');item={kind:'photo',src:await fileAsDataUrl(file),alt,caption}}
    else{const parsed=safeHttpUrl(url);if(!parsed)return showError('Elegí una foto o pegá un enlace que empiece con https://.');item={kind:'photo',src:parsed.href,alt,caption}}
  }else{const source=videoSource(document.getElementById('video-url').value.trim());if(!source)return showError('Pegá un enlace de YouTube o de un archivo MP4, WebM u OGG.');item={...source,caption}}
  const slide=slides[current],items=mediaBySlide[slide.id]||[];items.push(item);mediaBySlide[slide.id]=items;mediaPosition[slide.id]=items.length-1;
  renderMedia(slide);renderMediaList();mediaForm.reset();toggleMediaFields();
  try{await saveMedia()}catch{showError('Se agregó el material, pero no se pudo guardar en este navegador. Descargá una copia para conservarlo.')}
}
async function downloadDeck(){
  const label=downloadButton.textContent;downloadButton.disabled=true;downloadButton.textContent='Preparando…';
  try{
    const doc=new DOMParser().parseFromString(`<!doctype html>${sourceMarkup}`,'text/html');
    const cssLink=doc.querySelector('link[href="styles.css"]');
    if(cssLink){const response=await fetch('styles.css');if(!response.ok)throw new Error('CSS');const style=doc.createElement('style');style.setAttribute('data-deck-style','');style.textContent=await response.text();cssLink.replaceWith(style)}
    const scriptTag=doc.querySelector('script[src="script.js"]');
    if(scriptTag){const response=await fetch('script.js');if(!response.ok)throw new Error('JS');const script=doc.createElement('script');script.setAttribute('data-deck-script','');script.textContent=await response.text();scriptTag.remove();doc.body.append(script)}
    const portrait=doc.querySelector('img[src="saga.jpg"]');
    if(portrait){const response=await fetch('saga.jpg');if(!response.ok)throw new Error('portrait');portrait.src=await fileAsDataUrl(await response.blob())}
    let data=doc.getElementById('embedded-media');if(!data){data=doc.createElement('script');data.id='embedded-media';data.type='application/json';doc.body.append(data)}
    data.textContent=JSON.stringify(mediaBySlide).replace(/</g,'\\u003c');
    const executable=doc.querySelector('script[data-deck-script]');if(executable)doc.body.append(executable);
    const blob=new Blob([`<!doctype html>\n${doc.documentElement.outerHTML}`],{type:'text/html;charset=utf-8'}),link=document.createElement('a');
    link.href=URL.createObjectURL(blob);link.download='labor-artistica-gestion-cultural.html';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),60000)
  }catch{alert('No se pudo preparar la descarga. Probá de nuevo con conexión a internet.')}
  finally{downloadButton.disabled=false;downloadButton.textContent=label}
}
slides.forEach((slide,index)=>{const button=document.createElement('button'),number=document.createElement('span');number.textContent=String(index+1).padStart(2,'0');button.append(number,document.createTextNode(titleOf(slide)));button.addEventListener('click',()=>{overview.close();go(index)});overviewList.append(button)});
function render(){slides.forEach((slide,index)=>{slide.hidden=index!==current;slide.classList.toggle('is-active',index===current)});counter.textContent=`${current+1} / ${slides.length}`;progress.style.width=`${((current+1)/slides.length)*100}%`;prev.disabled=current===0;next.disabled=current===slides.length-1;notesContent.textContent=slides[current].querySelector('.speaker-notes')?.textContent.trim()||'';document.title=`${titleOf(slides[current])} · Labor artística y gestión cultural`}
function go(index){current=Math.max(0,Math.min(slides.length-1,index));history.replaceState(null,'',`#slide-${current+1}`);render()}
function readHash(){const match=location.hash.match(/^#slide-(\d+)$/);current=match?Math.max(0,Math.min(slides.length-1,Number(match[1])-1)):0;render()}
prev.addEventListener('click',()=>go(current-1));next.addEventListener('click',()=>go(current+1));
document.getElementById('overview-button').addEventListener('click',()=>overview.showModal());
document.getElementById('overview-close').addEventListener('click',()=>overview.close());
document.getElementById('media-button').addEventListener('click',()=>{renderMediaList();showError('');mediaDialog.showModal()});
document.getElementById('media-close').addEventListener('click',()=>mediaDialog.close());
mediaKind.addEventListener('change',toggleMediaFields);mediaForm.addEventListener('submit',addMedia);downloadButton.addEventListener('click',downloadDeck);
document.getElementById('notes-button').addEventListener('click',()=>{notesPanel.hidden=!notesPanel.hidden;document.getElementById('notes-button').setAttribute('aria-expanded',String(!notesPanel.hidden))});
document.getElementById('notes-close').addEventListener('click',()=>{notesPanel.hidden=true;document.getElementById('notes-button').setAttribute('aria-expanded','false')});
document.getElementById('fullscreen-button').addEventListener('click',async()=>{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()});
document.addEventListener('keydown',event=>{
  if(overview.open||mediaDialog.open||/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement.tagName))return;
  if(['ArrowRight','PageDown',' '].includes(event.key)){event.preventDefault();go(current+1)}
  else if(['ArrowLeft','PageUp'].includes(event.key)){event.preventDefault();go(current-1)}
  else if(event.key==='Home'){event.preventDefault();go(0)}
  else if(event.key==='End'){event.preventDefault();go(slides.length-1)}
  else if(event.key.toLowerCase()==='o')overview.showModal();
  else if(event.key.toLowerCase()==='m')document.getElementById('media-button').click();
  else if(event.key.toLowerCase()==='n')document.getElementById('notes-button').click();
  else if(event.key.toLowerCase()==='f')document.getElementById('fullscreen-button').click()
});
window.addEventListener('hashchange',readHash);
wrapSlides();toggleMediaFields();
(async()=>{let embedded={};if(embeddedMedia)try{embedded=JSON.parse(embeddedMedia.textContent)||{}}catch{};try{const saved=await readSavedMedia();mediaBySlide=saved===undefined?embedded:saved}catch{mediaBySlide=embedded};slides.forEach(renderMedia);readHash()})();
