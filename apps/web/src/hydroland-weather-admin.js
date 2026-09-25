(()=>{
  const host=document.getElementById('role-console')||document.querySelector('main');if(!host)return;
  const panel=document.createElement('section');panel.className='hl-weather-admin';panel.hidden=true;
  panel.innerHTML='<div class="hl-admin__header"><div><span class="eyebrow">WEATHER GATE</span><h3>بوابة الطقس والتقويم</h3><p>توقعات Stormglass لوقت الرحلة مع اعتماد تشغيلي بشري قبل تأكيد الحجز.</p></div><span data-weather-state>بانتظار الاتصال</span></div><div class="hl-admin__grid"><article class="hl-admin__panel"><div class="hl-admin__panel-title"><h3>حالة البوابة</h3><strong data-weather-enabled>—</strong></div><button class="btn btn-primary" type="button" data-weather-toggle>تفعيل</button></article><article class="hl-admin__panel"><div class="hl-admin__panel-title"><h3>وضع التشغيل</h3><strong data-weather-mode>—</strong></div><button class="btn" type="button" data-weather-advisory>عرض فقط</button><button class="btn" type="button" data-weather-enforce>تطبيق على الحجز</button></article><article class="hl-admin__panel"><div class="hl-admin__panel-title"><h3>مزود البيانات</h3><strong data-weather-provider>STORMGLASS</strong></div><p>المزود يقدم بيانات البحر والرياح فقط؛ قرار التشغيل يعتمد على مراجعة بشرية موثقة.</p></article></div><div data-weather-trips></div>';
  host.insertAdjacentElement('afterend',panel);
  const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase;
  const token=()=>window.HydrolandAuth?.getAccessToken?.();
  const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token()});
  const state=t=>{const e=panel.querySelector('[data-weather-state]');if(e)e.textContent=t};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v?new Date(v).toLocaleString('ar-SA'):'—';
  const metric=(v,suffix='')=>Number.isFinite(Number(v))?`${Number(v).toFixed(1)}${suffix}`:'—';
  function render(settings){
    const enabled=panel.querySelector('[data-weather-enabled]');if(enabled)enabled.textContent=settings.enabled?'مفعلة':'متوقفة';
    const mode=panel.querySelector('[data-weather-mode]');if(mode)mode.textContent=settings.mode==='ENFORCE'?'تطبيق على الحجز':'عرض فقط';
    const provider=panel.querySelector('[data-weather-provider]');if(provider)provider.textContent=settings.provider||'STORMGLASS';
    const toggle=panel.querySelector('[data-weather-toggle]');if(toggle)toggle.textContent=settings.enabled?'إيقاف':'تفعيل';
    panel.dataset.enabled=String(Boolean(settings.enabled));
  }
  const reviewLabel=status=>status==='APPROVED'?'معتمد':status==='REJECTED'?'مرفوض':'بانتظار المراجعة';
  function renderTrips(items){
    const holder=panel.querySelector('[data-weather-trips]');if(!holder)return;
    holder.innerHTML=items.length?items.map(trip=>{const w=trip.weatherReview,s=w?.snapshot||{},location=trip.location;return `<article class="hl-admin__panel" data-weather-trip="${esc(trip.id)}"><div class="hl-admin__panel-title"><div><h3>${esc(trip.title)}</h3><small>${fmt(trip.startsAt)} · ${location?esc(location.locationName):'بدون موقع تشغيلي'}</small></div><strong data-weather-review-status>${w?reviewLabel(w.status):'لم يتم التحديث'}</strong></div>${location?`<p>${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}</p>`:'<p>أضف الإحداثيات من إدارة الرحلات أولًا.</p>'}<div class="hl-admin__grid"><small>الرياح ${metric(s.windSpeedKph,' كم/س')}</small><small>هبّات ${metric(s.windGustKph,' كم/س')}</small><small>الموج ${metric(s.waveHeightM,' م')}</small><small>فترة الموج ${metric(s.wavePeriodS,' ث')}</small><small>السويل ${metric(s.swellHeightM,' م')}</small><small>حرارة الماء ${metric(s.waterTemperatureC,'°')}</small></div><small>Forecast: ${fmt(w?.forecastAt)} · Fetch: ${fmt(w?.fetchedAt)}</small><div class="hl-account-actions"><button type="button" data-weather-refresh ${location?'':'disabled'}>تحديث Stormglass</button><button type="button" data-weather-approve ${w?'':'disabled'}>اعتماد</button><button type="button" data-weather-reject ${w?'':'disabled'}>رفض</button></div></article>`}).join(''):'<p>لا توجد رحلات.</p>';
    holder.querySelectorAll('[data-weather-trip]').forEach(card=>{const tripId=card.dataset.weatherTrip;card.querySelector('[data-weather-refresh]')?.addEventListener('click',()=>refreshTrip(tripId));card.querySelector('[data-weather-approve]')?.addEventListener('click',()=>decideTrip(tripId,'APPROVED'));card.querySelector('[data-weather-reject]')?.addEventListener('click',()=>decideTrip(tripId,'REJECTED'))});
  }
  async function loadTrips(){const r=await fetch(api()+'/trips/admin',{headers:headers()}),body=await r.json().catch(()=>null);if(!r.ok)throw new Error(body?.message||'تعذر تحميل الرحلات');renderTrips(Array.isArray(body)?body:[])}
  async function load(){
    if(!token()){state('يتطلب دخول إداري');return}
    try{state('جارٍ تحميل الإعدادات');const [settingsResponse]=await Promise.all([fetch(api()+'/trips/admin/weather-gate',{headers:headers()}),loadTrips()]);const body=await settingsResponse.json();if(!settingsResponse.ok)throw new Error(body?.message||'تعذر تحميل الإعدادات');render(body);state('متصل بالخادم')}catch(error){state(error instanceof Error?error.message:'تعذر تحميل الإعدادات')}
  }
  async function save(payload){
    try{state('جارٍ حفظ الإعداد');const r=await fetch(api()+'/trips/admin/weather-gate',{method:'PATCH',headers:headers(),body:JSON.stringify(payload)});const body=await r.json();if(!r.ok)throw new Error(body?.message||'تعذر حفظ الإعداد');render(body);window.dispatchEvent(new CustomEvent('hydroland:weather-gate-changed',{detail:body}));state('تم حفظ الإعداد')}catch(error){state(error instanceof Error?error.message:'تعذر حفظ الإعداد')}
  }
  async function refreshTrip(tripId){try{state('جارٍ جلب توقع Stormglass لوقت الرحلة');const r=await fetch(`${api()}/trips/admin/weather-gate/trips/${tripId}/refresh`,{method:'POST',headers:headers()}),body=await r.json().catch(()=>null);if(!r.ok)throw new Error(body?.message||'تعذر تحديث الطقس');await loadTrips();window.dispatchEvent(new CustomEvent('hydroland:weather-review-changed',{detail:body}));state(body?.review?.status==='APPROVED'?'تم تحديث الطقس · الاعتماد السابق ما زال صالحًا':'تم تحديث الطقس · بانتظار المراجعة البشرية')}catch(error){state(error instanceof Error?error.message:'تعذر تحديث الطقس')}}
  async function decideTrip(tripId,status){const notes=window.prompt(status==='APPROVED'?'ملاحظات الاعتماد التشغيلي - اختياري':'سبب رفض حالة الطقس - اختياري','');if(notes===null)return;try{state('جارٍ حفظ قرار الطقس');const r=await fetch(`${api()}/trips/admin/weather-gate/trips/${tripId}/decision`,{method:'POST',headers:headers(),body:JSON.stringify({status,notes})}),body=await r.json().catch(()=>null);if(!r.ok)throw new Error(body?.message||'تعذر حفظ القرار');await loadTrips();window.dispatchEvent(new CustomEvent('hydroland:weather-review-changed',{detail:body}));state(status==='APPROVED'?'تم اعتماد حالة الطقس':'تم رفض حالة الطقس')}catch(error){state(error instanceof Error?error.message:'تعذر حفظ قرار الطقس')}}
  panel.querySelector('[data-weather-toggle]')?.addEventListener('click',()=>save({enabled:panel.dataset.enabled!=='true'}));
  panel.querySelector('[data-weather-advisory]')?.addEventListener('click',()=>save({mode:'ADVISORY'}));
  panel.querySelector('[data-weather-enforce]')?.addEventListener('click',()=>save({mode:'ENFORCE'}));
  document.addEventListener('hydroland:role-changed',e=>{const active=e.detail?.role==='admin';panel.hidden=!active;if(active)load()});
  document.addEventListener('hydroland:auth-changed',()=>{if(!panel.hidden)load()});
  document.addEventListener('hydroland:trip-location-changed',()=>{if(!panel.hidden)loadTrips()});
})();