(()=>{
  const auth=window.HydrolandAuth;
  if(!auth)return;
  const apiBase=auth.apiBase;
  const token=()=>auth.getAccessToken();
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2200)};
  let currentLogs=[];
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  async function request(path,options={}){
    const access=token();
    if(!access)throw new Error('سجل الدخول أولًا');
    const response=await fetch(`${apiBase}${path}`,{...options,headers:{'Content-Type':'application/json','Authorization':`Bearer ${access}`,...options.headers}});
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(body?.message||'تعذر الاتصال بالخادم');
    return body;
  }

  function statusLabel(status){return status==='VERIFIED'?'موثق':status==='REJECTED'?'مرفوض':'مسودة بانتظار التحقق';}
  function formatDate(value){try{return new Intl.DateTimeFormat('ar-SA',{dateStyle:'medium'}).format(new Date(value));}catch{return value;}}
  function sourceMeta(log){
    if(log.sourceTrip){
      return {tripId:log.sourceTrip.id,tripTitle:log.sourceTrip.title,participantName:log.sourceParticipant?.fullName||null,label:'من رحلة HYDROLAND'};
    }
    const marker=String(log.notes||'').match(/HYDROLAND_TRIP:([^\s|]+)/);
    if(!marker)return null;
    return {tripId:marker[1],tripTitle:null,participantName:null,label:'من رحلة HYDROLAND'};
  }

  function ensurePanel(){
    const host=document.querySelector('.hl-log');
    if(!host||host.querySelector('.hl-real-log'))return host?.querySelector('.hl-real-log')||null;
    host.querySelectorAll(':scope > article').forEach(el=>el.remove());
    const panel=document.createElement('div');panel.className='hl-real-log';
    panel.innerHTML=`<div class="hl-log-state"><small>سجل الغوص الحقيقي</small><b>سجل الدخول لعرض غوصاتك.</b></div><div class="hl-log-list"></div><form class="hl-log-form" hidden><input name="siteName" required placeholder="موقع الغوص"><input name="diveDate" type="date" required><input name="maxDepthM" type="number" min="1" max="150" step="0.1" required placeholder="أقصى عمق بالمتر"><input name="durationMin" type="number" min="1" max="600" required placeholder="المدة بالدقائق"><input name="buddyName" placeholder="اسم الزميل - اختياري"><button type="submit">حفظ الغوصة</button><button type="button" data-close-log>إلغاء</button></form>`;
    host.querySelector('.hl-member-actions')?.before(panel);
    const style=document.createElement('style');style.textContent=`.hl-real-log{display:grid;gap:.7rem}.hl-log-state{display:flex;justify-content:space-between;gap:.7rem;padding:.65rem .75rem;border-radius:14px;background:rgba(7,49,73,.5)}.hl-log-state small{color:#9ebdce}.hl-log-list{display:grid;gap:.5rem}.hl-log-item{display:grid;grid-template-columns:1fr auto;gap:.65rem;padding:.75rem;border:1px solid rgba(120,191,224,.12);border-radius:14px;background:rgba(255,255,255,.025)}.hl-log-item small{display:block;color:#9ebdce;margin-top:.18rem}.hl-log-item span{align-self:center;padding:.3rem .5rem;border-radius:999px;background:rgba(50,198,230,.1);font-size:.72rem}.hl-log-source{display:inline-flex;flex-wrap:wrap;gap:.3rem;margin-top:.35rem;padding:.25rem .45rem;border-radius:999px;background:rgba(244,209,140,.1);color:#ffe4aa;font-size:.68rem}.hl-log-participant{color:#cbeefa}.hl-log-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;padding:.75rem;border:1px solid rgba(120,191,224,.15);border-radius:14px}.hl-log-form[hidden]{display:none}.hl-log-form input,.hl-log-form button{min-width:0;padding:.7rem;border-radius:11px}.hl-log-form input{border:1px solid rgba(120,191,224,.18);background:rgba(255,255,255,.04);color:#fff}.hl-log-form button{border:1px solid rgba(120,191,224,.2);background:rgba(255,255,255,.05);color:#eaf6fb;font-weight:800}@media(max-width:600px){.hl-log-state{align-items:flex-start;flex-direction:column}.hl-log-item{grid-template-columns:1fr}.hl-log-item>span{justify-self:start}.hl-log-form{grid-template-columns:1fr}}`;document.head.appendChild(style);
    return panel;
  }

  async function load(){
    const panel=ensurePanel();if(!panel)return;
    const state=panel.querySelector('.hl-log-state b');const list=panel.querySelector('.hl-log-list');
    if(!auth.isAuthenticated()){state.textContent='سجل الدخول لعرض غوصاتك.';list.innerHTML='';return;}
    state.textContent='جارٍ تحميل سجل الغوص...';
    try{
      const logs=await request('/dive-logs');currentLogs=Array.isArray(logs)?logs:[];
      state.textContent=`${logs.length} غوصة مسجلة`;
      list.innerHTML=logs.length?logs.map(log=>{
        const source=sourceMeta(log);
        const sourceText=source?`${esc(source.label)}${source.tripTitle?` · ${esc(source.tripTitle)}`:` · ${esc(source.tripId.slice(0,8))}`}${source.participantName?` · <span class="hl-log-participant">${esc(source.participantName)}</span>`:''}`:'';
        return `<article class="hl-log-item"><div><b>${esc(log.siteName)}</b><small>${esc(formatDate(log.diveDate))} · ${Number(log.maxDepthM)}م · ${Number(log.durationMin)} دقيقة</small>${source?`<small class="hl-log-source">${sourceText}</small>`:''}</div><span>${esc(statusLabel(log.status))}</span></article>`;
      }).join(''):'<small>لا توجد غوصات مسجلة بعد.</small>';
      const stat=document.querySelector('.hl-profile-stats article:first-child strong');if(stat)stat.textContent=String(logs.length);
    }catch(error){state.textContent=error instanceof Error?error.message:'تعذر تحميل سجل الغوص';}
  }

  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-member-action="log"],[data-hl-action="logbook"]');if(!button)return;
    const panel=ensurePanel();if(!panel)return;
    if(!auth.isAuthenticated()){toast('سجل الدخول أولًا لإضافة غوصة');return;}
    const form=panel.querySelector('.hl-log-form');form.hidden=false;form.querySelector('[name="siteName"]')?.focus();
  });

  document.addEventListener('click',event=>{if(event.target.closest?.('[data-close-log]')){const form=ensurePanel()?.querySelector('.hl-log-form');if(form)form.hidden=true;}});
  document.addEventListener('submit',async event=>{
    if(!event.target.matches?.('.hl-log-form'))return;
    event.preventDefault();const form=event.target;const data=new FormData(form);
    try{
      await request('/dive-logs',{method:'POST',body:JSON.stringify({siteName:String(data.get('siteName')||''),diveDate:String(data.get('diveDate')||''),maxDepthM:Number(data.get('maxDepthM')),durationMin:Number(data.get('durationMin')),buddyName:String(data.get('buddyName')||'')})});
      form.reset();form.hidden=true;toast('تم حفظ الغوصة في سجلك');await load();
    }catch(error){toast(error instanceof Error?error.message:'تعذر حفظ الغوصة');}
  });

  const exportLogs=()=>{if(!auth.isAuthenticated()){toast('سجل الدخول أولًا لتصدير السجل');return}if(!currentLogs.length){toast('لا توجد غوصات لتصديرها');return}const rows=[['siteName','diveDate','maxDepthM','durationMin','buddyName','status'],...currentLogs.map(log=>[log.siteName,log.diveDate,log.maxDepthM,log.durationMin,log.buddyName||'',log.status])],csv=rows.map(row=>row.map(value=>'"'+String(value??'').replace(/"/g,'""')+'"').join(',')).join('\n'),blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='hydroland-dive-log.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);toast('تم تصدير سجل الغوص')};
  const bindExport=()=>{const actions=document.querySelector('.hl-log .hl-member-actions');if(!actions)return;const button=actions.querySelectorAll('button')[1];if(!button||button.dataset.hlExportBound)return;button.disabled=false;button.textContent='تصدير السجل';button.dataset.hlExportBound='1';button.addEventListener('click',exportLogs)};
  bindExport();
  document.addEventListener('hydroland:auth-changed',load);
  document.addEventListener('hydroland:trip-completed',load);
  window.HydrolandDiveLogs={reload:load};
  setTimeout(load,0);
})();
