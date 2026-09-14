(()=>{
  const root=document.getElementById('role-console')||document.querySelector('main');if(!root)return;
  const panel=document.createElement('section');panel.className='hl-calendar-admin';panel.hidden=true;
  panel.innerHTML='<div class="hl-trip-admin__head"><div><span class="eyebrow">UNIFIED OPERATIONS CALENDAR</span><h3>التقويم التشغيلي الموحد</h3></div><span data-calendar-state>بانتظار الاتصال</span></div><div class="hl-calendar-toolbar"><button type="button" data-calendar-prev>الأسبوع السابق</button><strong data-calendar-range>—</strong><button type="button" data-calendar-next>الأسبوع التالي</button></div><div data-calendar-list></div>';
  root.insertAdjacentElement('afterend',panel);
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||'http://localhost:3001/api/v1';
  const token=()=>window.HydrolandAuth?.getAccessToken?.();
  const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token()});
  const state=t=>{const e=panel.querySelector('[data-calendar-state]');if(e)e.textContent=t};
  const fmt=d=>new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',weekday:'short',day:'numeric',month:'short'}).format(d);
  const time=d=>new Intl.DateTimeFormat('ar-SA',{timeZone:'Asia/Riyadh',hour:'2-digit',minute:'2-digit'}).format(d);
  let anchor=new Date();let resources=[];
  const startOfWeek=d=>{const x=new Date(d);const day=x.getUTCDay();const diff=(day+6)%7;x.setUTCDate(x.getUTCDate()-diff);x.setUTCHours(0,0,0,0);return x};
  const endOfWeek=s=>{const x=new Date(s);x.setUTCDate(x.getUTCDate()+7);return x};
  const weatherLabel=w=>{const d=w?.evaluation?.decision;if(d==='ALLOWED')return'طقس مناسب';if(d==='REVIEW_REQUIRED')return'الطقس يحتاج مراجعة';if(d==='DEFERRED')return'مؤجلة بالطقس';if(d==='UNAVAILABLE')return'بيانات الطقس غير متاحة';return'بدون تقييم طقس'};
  const typeLabel=t=>({BOAT:'قارب',INSTRUCTOR:'مدرب',CREW:'طاقم',SITE:'موقع',EQUIPMENT:'معدات'})[t]||t;

  async function saveResources(tripId,select,button){
    try{
      state('جارٍ حفظ الموارد');button.disabled=true;
      const resourceIds=[...select.selectedOptions].map(o=>o.value).filter(Boolean);
      const r=await fetch(`${api()}/trips/admin/calendar/${tripId}/allocations`,{method:'POST',headers:headers(),body:JSON.stringify({resourceIds})});
      const body=await r.json().catch(()=>null);
      if(!r.ok)throw new Error(body?.message||'تعذر حفظ الموارد');
      state('تم تحديث الموارد');await load();
    }catch(error){state(error instanceof Error?error.message:'تعذر حفظ الموارد');button.disabled=false;}
  }

  function resourceEditor(item){
    const wrap=document.createElement('div');wrap.className='hl-calendar-resource-editor';
    const label=document.createElement('label');label.textContent='تخصيص الموارد';
    const select=document.createElement('select');select.multiple=true;select.setAttribute('aria-label','موارد الرحلة');
    const assigned=new Set((item.resources||[]).map(r=>r.resourceId));
    resources.filter(r=>r.active!==false).forEach(resource=>{const option=document.createElement('option');option.value=resource.id;option.textContent=`${typeLabel(resource.type)} · ${resource.name}`;option.selected=assigned.has(resource.id);select.appendChild(option)});
    const button=document.createElement('button');button.type='button';button.textContent='حفظ الموارد';button.onclick=()=>saveResources(item.id,select,button);
    wrap.append(label,select,button);return wrap;
  }

  function render(items,start,end){
    const host=panel.querySelector('[data-calendar-list]');host.textContent='';
    panel.querySelector('[data-calendar-range]').textContent=`${fmt(start)} — ${fmt(new Date(end.getTime()-1))}`;
    if(!items.length){const p=document.createElement('p');p.textContent='لا توجد رحلات أو أنشطة في هذا الأسبوع.';host.appendChild(p);return;}
    const byDay=new Map();items.forEach(item=>{const key=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(item.startsAt));if(!byDay.has(key))byDay.set(key,[]);byDay.get(key).push(item)});
    [...byDay.entries()].forEach(([,rows])=>{
      const section=document.createElement('section');section.className='hl-calendar-day';
      const h=document.createElement('h4');h.textContent=fmt(new Date(rows[0].startsAt));section.appendChild(h);
      rows.sort((a,b)=>new Date(a.startsAt)-new Date(b.startsAt)).forEach(item=>{
        const card=document.createElement('article');card.className='hl-calendar-event';
        const head=document.createElement('div');const title=document.createElement('strong');title.textContent=item.title;const meta=document.createElement('small');meta.textContent=`${time(new Date(item.startsAt))}–${time(new Date(item.endsAt))} · ${item.type} · ${item.remainingSeats}/${item.capacity} متاح`;head.append(title,meta);
        const tags=document.createElement('div');tags.className='hl-calendar-tags';
        const weather=document.createElement('span');weather.textContent=weatherLabel(item.weather);tags.appendChild(weather);
        const safety=document.createElement('span');safety.textContent=item.safety?.decision==='ALLOWED'?'السلامة معتمدة':item.safety?.decision==='DEFERRED'?'مؤجلة بالسلامة':'السلامة تحتاج مراجعة';tags.appendChild(safety);
        const allocated=document.createElement('span');const names=(item.resources||[]).map(r=>r.resource?.name||r.name).filter(Boolean);allocated.textContent=names.length?`الموارد: ${names.join('، ')}`:'لم تُخصص موارد';tags.appendChild(allocated);
        card.append(head,tags,resourceEditor(item));section.appendChild(card);
      });host.appendChild(section);
    });
  }

  async function load(){
    if(!token()){state('يتطلب دخول إداري');return}
    try{
      state('جارٍ تحميل التقويم');const start=startOfWeek(anchor),end=endOfWeek(start);
      const [calendarResponse,resourcesResponse]=await Promise.all([
        fetch(`${api()}/trips/admin/calendar?from=${encodeURIComponent(start.toISOString())}&to=${encodeURIComponent(end.toISOString())}`,{headers:headers()}),
        fetch(`${api()}/trips/admin/calendar/resources`,{headers:headers()})
      ]);
      const rows=await calendarResponse.json().catch(()=>[]);const resourceRows=await resourcesResponse.json().catch(()=>[]);
      if(!calendarResponse.ok||!resourcesResponse.ok)throw new Error();
      resources=Array.isArray(resourceRows)?resourceRows:[];render(Array.isArray(rows)?rows:[],start,end);state('متصل بالخادم');
    }catch{state('تعذر تحميل التقويم')}
  }
  panel.querySelector('[data-calendar-prev]').onclick=()=>{anchor=new Date(anchor.getTime()-7*86400000);load()};
  panel.querySelector('[data-calendar-next]').onclick=()=>{anchor=new Date(anchor.getTime()+7*86400000);load()};
  document.addEventListener('hydroland:role-changed',e=>{const active=e.detail?.role==='admin';panel.hidden=!active;if(active)load()});
  document.addEventListener('hydroland:auth-changed',()=>{if(!panel.hidden)load()});
  document.addEventListener('hydroland:safety-decision-changed',()=>{if(!panel.hidden)load()});
  document.addEventListener('hydroland:weather-gate-changed',()=>{if(!panel.hidden)load()});
  window.addEventListener('hydroland:booking-created',()=>{if(!panel.hidden)load()});
  window.HydrolandOperationsCalendar={reload:load};
})();