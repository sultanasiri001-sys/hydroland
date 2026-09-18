(() => {
  const root = document.getElementById('role-console');
  if (!root) return;
  const panel = document.createElement('section');
  panel.className = 'hl-theme-admin';
  panel.hidden = true;
  panel.innerHTML = '<div class="hl-theme-admin__head"><div><span class="eyebrow">THEME CONTROL</span><h3>إدارة ثيمات HYDROLAND</h3></div><span data-theme-admin-state>بانتظار الاتصال</span></div><form data-theme-admin-form><label>الثيم<select name="themeId" required></select></label><label>اسم الحملة<input name="name" maxlength="80"></label><label>يبدأ<input name="startsAt" type="datetime-local" required></label><label>ينتهي<input name="endsAt" type="datetime-local" required></label><label>الحالة<select name="status"><option value="DRAFT">مسودة</option><option value="PUBLISHED">منشور</option></select></label><div class="hl-theme-admin__actions"><button type="button" data-preview>معاينة</button><button type="submit">حفظ الجدولة</button></div></form><div data-theme-admin-list></div>';
  root.insertAdjacentElement('afterend', panel);
  const base = () => (window.HydrolandAuth?.apiBase || window.HYDROLAND_API_BASE || 'http://localhost:3001/api/v1').replace(/\/$/, '');
  const token = () => window.HydrolandAuth?.getAccessToken?.();
  const state = (text) => { const el = panel.querySelector('[data-theme-admin-state]'); if (el) el.textContent = text; };
  const authHeaders = (json) => ({ ...(json ? {'Content-Type':'application/json'} : {}), Authorization: 'Bearer ' + token() });
  const fill = () => {
    const select = panel.querySelector('[name="themeId"]');
    if (!select || !window.HydrolandThemes) return;
    select.textContent = '';
    window.HydrolandThemes.list().forEach(theme => {
      const option=document.createElement('option');
      option.value=String(theme.id||'');
      option.textContent=String(theme.nameAr||theme.id||'');
      select.appendChild(option);
    });
  };
  const actionButton=(label,attrs,onClick)=>{const button=document.createElement('button');button.type='button';button.textContent=label;Object.entries(attrs).forEach(([key,value])=>button.dataset[key]=String(value??''));button.onclick=onClick;return button;};
  const render = (items) => {
    const list = panel.querySelector('[data-theme-admin-list]');
    if (!list) return;
    list.textContent='';
    if(!Array.isArray(items)||!items.length){const empty=document.createElement('p');empty.textContent='لا توجد ثيمات مجدولة.';list.appendChild(empty);return;}
    items.forEach(item=>{
      const article=document.createElement('article'),info=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small'),status=document.createElement('span');
      strong.textContent=String(item.themeId||'—');
      small.textContent=String(item.name||'بدون اسم');
      status.textContent=String(item.status||'—');
      info.append(strong,small);
      article.append(info,status);
      article.appendChild(actionButton('معاينة',{previewId:item.themeId},()=>window.HydrolandThemes?.apply(String(item.themeId||''))));
      ['PUBLISHED','ARCHIVED'].forEach(nextStatus=>article.appendChild(actionButton(nextStatus==='PUBLISHED'?'نشر':'أرشفة',{status:nextStatus,id:item.id},async()=>{try{state('جارٍ الحفظ');const r=await fetch(base()+'/themes/admin/schedules/'+encodeURIComponent(String(item.id||''))+'/status',{method:'PATCH',headers:authHeaders(true),body:JSON.stringify({status:nextStatus})});if(!r.ok)throw new Error();await refresh();}catch{state('تعذر الحفظ');}})));
      list.appendChild(article);
    });
  };
  async function refresh(){ if(!token()){state('يتطلب دخول إداري');return;} try{state('جارٍ التحديث'); const r=await fetch(base()+'/themes/admin/schedules',{headers:authHeaders(false)}); if(!r.ok) throw new Error(); render(await r.json()); state('متصل بالخادم');}catch{state('تعذر الاتصال');} }
  panel.querySelector('[data-preview]').onclick = () => { const id=panel.querySelector('[name="themeId"]').value; window.HydrolandThemes?.apply(id); state('وضع المعاينة'); };
  panel.querySelector('[data-theme-admin-form]').onsubmit = async (e) => { e.preventDefault(); if(!token()){state('يتطلب دخول إداري');return;} const d=Object.fromEntries(new FormData(e.currentTarget).entries()); try{state('جارٍ الحفظ'); const r=await fetch(base()+'/themes/admin/schedules',{method:'POST',headers:authHeaders(true),body:JSON.stringify({themeId:d.themeId,name:d.name||undefined,startsAt:new Date(d.startsAt).toISOString(),endsAt:new Date(d.endsAt).toISOString(),status:d.status})}); if(!r.ok) throw new Error(); e.currentTarget.reset(); fill(); await refresh(); state('تم حفظ الجدولة');}catch{state('تعذر حفظ الجدولة');} };
  document.addEventListener('hydroland:role-changed', e => { const active=e.detail?.role==='admin'; panel.hidden=!active; if(active){fill();refresh();} });
  document.addEventListener('hydroland:auth-changed', () => { if(!panel.hidden) refresh(); });
  fill();
})();
