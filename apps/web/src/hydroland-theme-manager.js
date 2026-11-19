(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("theme-manager", {
  "الثيمات": "Themes",
  "فتح الثيمات": "Open themes",
  "ثيمات HYDROLAND": "HYDROLAND themes",
  "اختر ثيماً للمعاينة. النشر والجدولة الإدارية يحفظان ضمن إعدادات المنصة.": "Select a theme to preview. Administrative publication and scheduling are saved in platform settings.",
  "ثيم": "Theme"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};


  const init=()=>{
  const top=document.querySelector('.top-actions');
  if(!top||top.querySelector('[data-hl-theme-button]'))return;
  const b=document.createElement('button');
  b.className='icon-button';
  uiLocale.setMessage(b, '◐');
  uiLocale.setAttribute(b,'title','الثيمات');
  uiLocale.setAttribute(b, "aria-label", 'فتح الثيمات');
  b.dataset.hlThemeButton='1';
  top.prepend(b);

  const d=document.createElement('dialog');
  d.className='theme-dialog';
  const head=document.createElement('div');
  head.className='dialog-head';
  const title=document.createElement('h2');
  uiLocale.setMessage(title, uiLocale.message('ثيمات HYDROLAND'));
  const close=document.createElement('button');
  close.type='button';
  close.dataset.close='';
  uiLocale.setMessage(close, '×');
  head.append(title,close);
  const copy=document.createElement('p');
  uiLocale.setMessage(copy, uiLocale.message('اختر ثيماً للمعاينة. النشر والجدولة الإدارية يحفظان ضمن إعدادات المنصة.'));
  const list=document.createElement('div');
  list.dataset.themes='';
  list.className='theme-list';
  d.append(head,copy,list);
  document.body.append(d);

  const draw=()=>{
    const current=document.documentElement.dataset.theme;
    uiLocale.setMessage(list, '');
    const themes=Array.isArray(window.HydrolandThemes?.list?.())?window.HydrolandThemes.list():[];
    themes.forEach(theme=>{
      const button=document.createElement('button');
      button.type='button';
      button.dataset.id=String(theme.id||'');
      if(theme.id===current)button.classList.add('active');
      const swatch=document.createElement('span');
      swatch.classList.add('theme-swatch');
      const safeThemeId=String(theme.id||'').replace(/[^a-zA-Z0-9_-]/g,'');
      if(safeThemeId)swatch.classList.add(safeThemeId);
      const strong=document.createElement('strong');
      uiLocale.setMessage(strong, window.HydrolandThemes?.displayName?.(theme)??String(theme.nameAr||theme.id||'ثيم'));
      const small=document.createElement('small');
      uiLocale.setMessage(small, window.HydrolandThemes?.displayCategory?.(theme.category)??String(theme.category||''));
      button.append(swatch,strong,small);
      button.onclick=()=>{window.HydrolandThemes?.apply?.(String(theme.id||''));draw();};
      list.appendChild(button);
    });
  };

  b.onclick=()=>{draw();d.showModal();};
  close.onclick=()=>d.close();
  if(!document.querySelector('script[data-hl-theme-admin]')){
    const s=document.createElement('script');
    s.src='./hydroland-theme-admin.js';
    s.defer=true;
    s.dataset.hlThemeAdmin='1';
    document.body.appendChild(s);
  }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
