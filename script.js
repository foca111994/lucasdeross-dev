const modal=document.getElementById('projectModal');
const frame=document.getElementById('projectFrame');
const openProject=document.getElementById('openProject');
const contact=document.getElementById('contactPanel');

document.querySelectorAll('[data-preview]').forEach(btn=>{
  btn.addEventListener('click',()=>{
    const url=btn.dataset.preview;
    frame.src=url;
    openProject.href=url;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow='hidden';
  });
});
document.querySelectorAll('[data-close-preview]').forEach(el=>el.addEventListener('click',()=>{
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden','true');
  frame.src='about:blank';
  document.body.style.overflow='';
}));

document.querySelectorAll('[data-contact]').forEach(el=>el.addEventListener('click',()=>{
  contact.classList.add('open');
  contact.setAttribute('aria-hidden','false');
  document.body.style.overflow='hidden';
}));
document.querySelectorAll('[data-close-contact]').forEach(el=>el.addEventListener('click',()=>{
  contact.classList.remove('open');
  contact.setAttribute('aria-hidden','true');
  document.body.style.overflow='';
}));

document.addEventListener('keydown',e=>{
  if(e.key==='Escape'){
    modal.classList.remove('open');
    contact.classList.remove('open');
    frame.src='about:blank';
    document.body.style.overflow='';
  }
});

// Keep the retro computer feeling alive without competing with the PORTFOLIO rhythm.
const mac=document.querySelector('.retro-computer');
if(mac && !matchMedia('(prefers-reduced-motion: reduce)').matches){
  let tx=0,ty=0,cx=0,cy=0;
  window.addEventListener('pointermove',e=>{
    tx=(e.clientX/innerWidth-.5)*8;
    ty=(e.clientY/innerHeight-.5)*5;
  },{passive:true});
  const animate=()=>{
    cx+=(tx-cx)*.035; cy+=(ty-cy)*.035;
    mac.style.marginLeft=cx+'px';
    mac.style.marginTop=cy+'px';
    requestAnimationFrame(animate);
  };
  animate();
}
