(()=>{
  const top=document.querySelector('.top-actions');
  if(!top)return;
  const b=document.createElement('button');
  b.className='icon-button';
  b.textContent='◐';
  b.title='الثيمات';
  top.prepend(b);

  const d=document.createElement('dialog');
  d.className='theme-dialog';
  const head=document.createElement('div');
  head.className='dialog-head';
  const title=document.createElement('h2');
  title.textContent='ثيمات HYDROLAND';
  const close=document.createElement('button');
  close.type='button';
  close.dataset.close='';
  close.textContent='×';
  head.append(title,close);
  const copy=document.createElement('p');
  copy.textContent='اختر ثيماً للمعاينة. النشر والجدولة الإدارية يحفظان ضمن إعدادات المنصة.';
  const list=document.createElement('div');
  list.dataset.themes='';
  list.className='theme-list';
  d.append(head,copy,list);
  document.body.append(d);

  const draw=()=>{
    const current=document.documentElement.dataset.theme;
    list.textContent='';
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
      strong.textContent=String(theme.nameAr||theme.id||'ثيم');
      const small=document.createElement('small');
      small.textContent=String(theme.category||'');
      button.append(swatch,strong,small);
      button.onclick=()=>{window.HydrolandThemes?.apply?.(String(theme.id||''));draw();};
      list.appendChild(button);
    });
  };

  b.onclick=()=>{draw();d.showModal();};
  close.onclick=()=>d.close();
  const load=(selector,src,datasetKey)=>{if(document.querySelector(selector))return;const s=document.createElement('script');s.src=src;s.defer=true;s.dataset[datasetKey]='1';document.body.appendChild(s)};
  load('script[data-hl-theme-admin]','./hydroland-theme-admin.js','hlThemeAdmin');
  load('script[data-hl-commerce-guard]','./hydroland-commerce-guard.js','hlCommerceGuard');
})();
