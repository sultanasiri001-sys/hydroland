(() => {
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("theme-admin", {
  "إدارة ثيمات HYDROLAND": "HYDROLAND theme management",
  "بانتظار الاتصال": "Awaiting connection",
  "الثيم": "Theme",
  "اسم الحملة": "Campaign name",
  "يبدأ": "Starts",
  "ينتهي": "Ends",
  "الحالة": "Status",
  "مسودة": "Draft",
  "منشور": "Published",
  "معاينة": "Preview",
  "حفظ الجدولة": "Save schedule",
  "لا توجد ثيمات مجدولة.": "No scheduled themes.",
  "بدون اسم": "Unnamed",
  "نشر": "Publish",
  "أرشفة": "Archive",
  "جارٍ الحفظ": "Saving",
  "تعذر الحفظ": "Could not save",
  "يتطلب دخول إداري": "Administrative sign-in required",
  "جارٍ التحديث": "Refreshing",
  "متصل بالخادم": "Connected to server",
  "تعذر الاتصال": "Could not connect",
  "وضع المعاينة": "Preview mode",
  "تم حفظ الجدولة": "Schedule saved",
  "تعذر حفظ الجدولة": "Could not save schedule"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};


  const root = document.getElementById('role-console');
  if (!root) return;
  const panel = document.createElement('section');
  panel.className = 'hl-theme-admin';
  panel.hidden = true;
  uiLocale.setHTML(panel, uiLocale.html`<div class="hl-theme-admin__head"><div><span class="eyebrow">THEME CONTROL</span><h3>إدارة ثيمات HYDROLAND</h3></div><span data-theme-admin-state>بانتظار الاتصال</span></div><form data-theme-admin-form><label>الثيم<select name="themeId" required></select></label><label>اسم الحملة<input name="name" maxlength="80"></label><label>يبدأ<input name="startsAt" type="datetime-local" required></label><label>ينتهي<input name="endsAt" type="datetime-local" required></label><label>الحالة<select name="status"><option value="DRAFT">مسودة</option><option value="PUBLISHED">منشور</option></select></label><div class="hl-theme-admin__actions"><button type="button" data-preview>معاينة</button><button type="submit">حفظ الجدولة</button></div></form><div data-theme-admin-list></div>`);
  root.insertAdjacentElement('afterend', panel);
  const defaultApiBase = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) ? 'http://localhost:3001/api/v1' : 'https://hydroland.onrender.com/api/v1';
  const base = () => (window.HydrolandAuth?.apiBase || window.HYDROLAND_API_BASE || defaultApiBase).replace(/\/$/, '');
  const token = () => window.HydrolandAuth?.getAccessToken?.();
  const state = (text) => { const el = panel.querySelector('[data-theme-admin-state]'); if (el) uiLocale.setMessage(el, text); };
  const authHeaders = (json) => ({ ...(json ? {'Content-Type':'application/json'} : {}), Authorization: 'Bearer ' + token() });
  const fill = () => {
    const select = panel.querySelector('[name="themeId"]');
    if (!select || !window.HydrolandThemes) return;
    uiLocale.setMessage(select, '');
    window.HydrolandThemes.list().forEach(theme => {
      const option=document.createElement('option');
      option.value=String(theme.id||'');
      uiLocale.setMessage(option, window.HydrolandThemes?.displayName?.(theme)??String(theme.nameAr||theme.id||''));
      select.appendChild(option);
    });
  };
  const actionButton=(label,attrs,onClick)=>{const button=document.createElement('button');button.type='button';uiLocale.setMessage(button, label);Object.entries(attrs).forEach(([key,value])=>button.dataset[key]=String(value??''));button.onclick=onClick;return button;};
  const render = (items) => {
    const list = panel.querySelector('[data-theme-admin-list]');
    if (!list) return;
    uiLocale.setMessage(list, '');
    if(!Array.isArray(items)||!items.length){const empty=document.createElement('p');uiLocale.setMessage(empty, uiLocale.message('لا توجد ثيمات مجدولة.'));list.appendChild(empty);return;}
    items.forEach(item=>{
      const article=document.createElement('article'),info=document.createElement('div'),strong=document.createElement('strong'),small=document.createElement('small'),status=document.createElement('span');
      uiLocale.setMessage(strong, String(item.themeId||'—'));
      uiLocale.setMessage(small, String(item.name||'بدون اسم'));
      uiLocale.setMessage(status, String(item.status||'—'));
      info.append(strong,small);
      article.append(info,status);
      article.appendChild(actionButton(uiLocale.message('معاينة'), {previewId:item.themeId}, ()=>window.HydrolandThemes?.apply(String(item.themeId||''))));
      ['PUBLISHED','ARCHIVED'].forEach(nextStatus=>article.appendChild(actionButton((nextStatus==='PUBLISHED' ? uiLocale.message('نشر') : uiLocale.message('أرشفة')), {status:nextStatus,id:item.id}, async()=>{try{state(uiLocale.message('جارٍ الحفظ'));const r=await fetch(base()+'/themes/admin/schedules/'+encodeURIComponent(String(item.id||''))+'/status',{method:'PATCH',headers:authHeaders(true),body:JSON.stringify({status:nextStatus})});if(!r.ok)throw new Error();await refresh();}catch{state(uiLocale.message('تعذر الحفظ'));}})));
      list.appendChild(article);
    });
  };
  async function refresh(){ if(!token()){state(uiLocale.message('يتطلب دخول إداري'));return;} try{state(uiLocale.message('جارٍ التحديث')); const r=await fetch(base()+'/themes/admin/schedules',{headers:authHeaders(false)}); if(!r.ok) throw new Error(); render(await r.json()); state(uiLocale.message('متصل بالخادم'));}catch{state(uiLocale.message('تعذر الاتصال'));} }
  panel.querySelector('[data-preview]').onclick = () => { const id=panel.querySelector('[name="themeId"]').value; window.HydrolandThemes?.apply(id); state(uiLocale.message('وضع المعاينة')); };
  panel.querySelector('[data-theme-admin-form]').onsubmit = async (e) => { e.preventDefault(); if(!token()){state(uiLocale.message('يتطلب دخول إداري'));return;} const d=Object.fromEntries(new FormData(e.currentTarget).entries()); try{state(uiLocale.message('جارٍ الحفظ')); const r=await fetch(base()+'/themes/admin/schedules',{method:'POST',headers:authHeaders(true),body:JSON.stringify({themeId:d.themeId,name:d.name||undefined,startsAt:new Date(d.startsAt).toISOString(),endsAt:new Date(d.endsAt).toISOString(),status:d.status})}); if(!r.ok) throw new Error(); e.currentTarget.reset(); fill(); await refresh(); state(uiLocale.message('تم حفظ الجدولة'));}catch{state(uiLocale.message('تعذر حفظ الجدولة'));} };
  document.addEventListener('hydroland:role-changed', e => { const active=e.detail?.role==='admin'; panel.hidden=!active; if(active){fill();refresh();} });
  document.addEventListener('hydroland:auth-changed', () => { if(!panel.hidden) refresh(); });
  fill();
})();
