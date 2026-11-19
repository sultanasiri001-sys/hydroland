(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("weather-admin", {
  "بوابة الطقس والتقويم": "Weather and calendar control",
  "توقعات Stormglass لوقت الرحلة مع اعتماد تشغيلي بشري قبل تأكيد الحجز.": "Stormglass forecasts for the trip time, with human operating approval before booking confirmation.",
  "بانتظار الاتصال": "Awaiting connection",
  "حالة البوابة": "Control status",
  "تفعيل": "Enable",
  "وضع التشغيل": "Operating mode",
  "عرض فقط": "Display only",
  "تطبيق على الحجز": "Apply to bookings",
  "مزود البيانات": "Data provider",
  "المزود يقدم بيانات البحر والرياح فقط؛ قرار التشغيل يعتمد على مراجعة بشرية موثقة.": "The provider supplies sea and wind data only. The operating decision relies on documented human review.",
  "مفعلة": "Enabled",
  "متوقفة": "Disabled",
  "إيقاف": "Disable",
  "معتمد": "Approved",
  "مرفوض": "Rejected",
  "بانتظار المراجعة": "Awaiting review",
  "الرياح": "Wind",
  "هبّات": "Gusts",
  "الموج": "Waves",
  "فترة الموج": "Wave period",
  "السويل": "Swell",
  "حرارة الماء": "Water temperature",
  "تحديث Stormglass": "Refresh Stormglass",
  "اعتماد": "Approve",
  "رفض": "Reject",
  "بدون موقع تشغيلي": "No operational location",
  "يلزم تحديث التوقع": "Forecast refresh required",
  "لم يتم التحديث": "Not refreshed",
  "أضف الإحداثيات من إدارة الرحلات أولًا.": "Add coordinates in trip management first.",
  " كم/س": " km/h",
  " م": " m",
  " ث": " s",
  "لا توجد رحلات.": "No trips.",
  "تعذر تحميل الرحلات": "Could not load trips",
  "يتطلب دخول إداري": "Administrator sign-in required",
  "جارٍ تحميل الإعدادات": "Loading settings",
  "تعذر تحميل الإعدادات": "Could not load settings",
  "متصل بالخادم": "Connected to server",
  "جارٍ حفظ الإعداد": "Saving setting",
  "تعذر حفظ الإعداد": "Could not save setting",
  "تم حفظ الإعداد": "Setting saved",
  "جارٍ جلب توقع Stormglass لوقت الرحلة": "Fetching the Stormglass forecast for the trip time",
  "تعذر تحديث الطقس": "Could not refresh weather",
  "تم تحديث الطقس · الاعتماد السابق ما زال صالحًا": "Weather refreshed · Previous approval remains valid",
  "تم تحديث الطقس · بانتظار المراجعة البشرية": "Weather refreshed · Awaiting human review",
  "ملاحظات الاعتماد التشغيلي - اختياري": "Operating approval notes — optional",
  "سبب رفض حالة الطقس - اختياري": "Weather rejection reason — optional",
  "جارٍ حفظ قرار الطقس": "Saving weather decision",
  "تعذر حفظ القرار": "Could not save decision",
  "تم اعتماد حالة الطقس": "Weather approved",
  "تم رفض حالة الطقس": "Weather rejected",
  "تعذر حفظ قرار الطقس": "Could not save weather decision",
  "كم/س": "km/h",
  "م": "m",
  "ث": "s"
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  if(window.__hydrolandWeatherAdminLoaded)return;window.__hydrolandWeatherAdminLoaded=true;
  const host=document.getElementById('role-console')||document.querySelector('main');if(!host)return;
  const panel=document.createElement('section');panel.className='hl-weather-admin';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<div class="hl-admin__header"><div><span class="eyebrow">WEATHER GATE</span><h3>بوابة الطقس والتقويم</h3><p>توقعات Stormglass لوقت الرحلة مع اعتماد تشغيلي بشري قبل تأكيد الحجز.</p></div><span data-weather-state>بانتظار الاتصال</span></div><div class="hl-admin__grid"><article class="hl-admin__panel"><div class="hl-admin__panel-title"><h3>حالة البوابة</h3><strong data-weather-enabled>—</strong></div><button class="btn btn-primary" type="button" data-weather-toggle>تفعيل</button></article><article class="hl-admin__panel"><div class="hl-admin__panel-title"><h3>وضع التشغيل</h3><strong data-weather-mode>—</strong></div><button class="btn" type="button" data-weather-advisory>عرض فقط</button><button class="btn" type="button" data-weather-enforce>تطبيق على الحجز</button></article><article class="hl-admin__panel"><div class="hl-admin__panel-title"><h3>مزود البيانات</h3><strong data-weather-provider>STORMGLASS</strong></div><p>المزود يقدم بيانات البحر والرياح فقط؛ قرار التشغيل يعتمد على مراجعة بشرية موثقة.</p></article></div><div data-weather-trips></div>`);
  host.insertAdjacentElement('afterend',panel);
  const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase;
  const token=()=>window.HydrolandAuth?.getAccessToken?.();
  const headers=()=>({'Content-Type':'application/json',Authorization:'Bearer '+token()});
  const state=t=>{const e=panel.querySelector('[data-weather-state]');if(e)uiLocale.setMessage(e, t)};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt=v=>v?new Date(v).toLocaleString('ar-SA'):'—';
  const metric=(v,suffix='')=>v!==null&&v!==undefined&&String(v).trim()!==''&&Number.isFinite(Number(v))?`${Number(v).toFixed(1)}${suffix}`:'—';
  function render(settings){
    const enabled=panel.querySelector('[data-weather-enabled]');if(enabled)uiLocale.setText(enabled, ...[settings.enabled?'مفعلة':'متوقفة']);
    const mode=panel.querySelector('[data-weather-mode]');if(mode)uiLocale.setText(mode, ...[settings.mode==='ENFORCE'?'تطبيق على الحجز':'عرض فقط']);
    const provider=panel.querySelector('[data-weather-provider]');if(provider)provider.textContent=settings.provider||'STORMGLASS';
    const toggle=panel.querySelector('[data-weather-toggle]');if(toggle)uiLocale.setText(toggle, ...[settings.enabled?'إيقاف':'تفعيل']);
    panel.dataset.enabled=String(Boolean(settings.enabled));
  }
  const reviewLabel=status=>status==='APPROVED'?'معتمد':status==='REJECTED'?'مرفوض':'بانتظار المراجعة';
  function renderTrips(items){
    const holder=panel.querySelector('[data-weather-trips]');if(!holder)return;
    uiLocale.setHTML(holder, items.length?items.map(trip=>{const w=trip.weatherReview,s=w?.snapshot||{},location=trip.location;return uiLocale.html`<article class="hl-admin__panel" data-weather-trip="${esc(trip.id)}" data-weather-token="${esc(w?.decisionToken||'')}"><div class="hl-admin__panel-title"><div><h3>${esc(trip.title)}</h3><small>${fmt(trip.startsAt)} · ${location?esc(location.locationName):uiLocale.t('بدون موقع تشغيلي')}</small></div><strong data-weather-review-status>${uiLocale.label(w?.requiresRefresh?'يلزم تحديث التوقع':w?reviewLabel(w.status):'لم يتم التحديث')}</strong></div>${location?uiLocale.html`<p>${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}</p>`:uiLocale.html`<p>أضف الإحداثيات من إدارة الرحلات أولًا.</p>`}<div class="hl-admin__grid"><small>الرياح ${metric(s.windSpeedKph,uiLocale.t(' كم/س'))}</small><small>هبّات ${metric(s.windGustKph,uiLocale.t(' كم/س'))}</small><small>الموج ${metric(s.waveHeightM,uiLocale.t(' م'))}</small><small>فترة الموج ${metric(s.wavePeriodS,uiLocale.t(' ث'))}</small><small>السويل ${metric(s.swellHeightM,uiLocale.t(' م'))}</small><small>حرارة الماء ${metric(s.waterTemperatureC,'°')}</small></div><small>Forecast: ${fmt(w?.forecastAt)} · Fetch: ${fmt(w?.fetchedAt)}</small><div class="hl-account-actions"><button type="button" data-weather-refresh ${location?'':'disabled'}>تحديث Stormglass</button><button type="button" data-weather-approve ${w?.decisionToken&&!w.requiresRefresh?'':'disabled'}>اعتماد</button><button type="button" data-weather-reject ${w?.decisionToken&&!w.requiresRefresh?'':'disabled'}>رفض</button></div></article>`}).join(''):uiLocale.html`<p>لا توجد رحلات.</p>`);
    holder.querySelectorAll('[data-weather-trip]').forEach(card=>{const tripId=card.dataset.weatherTrip;card.querySelector('[data-weather-refresh]')?.addEventListener('click',()=>refreshTrip(tripId));card.querySelector('[data-weather-approve]')?.addEventListener('click',()=>decideTrip(tripId,'APPROVED',card.dataset.weatherToken));card.querySelector('[data-weather-reject]')?.addEventListener('click',()=>decideTrip(tripId,'REJECTED',card.dataset.weatherToken))});
  }
  async function loadTrips(){const r=await fetch(api()+'/trips/admin',{headers:headers()}),body=await r.json().catch(()=>null);if(!r.ok)throw localError(body?.message||uiLocale.message('تعذر تحميل الرحلات'));renderTrips(Array.isArray(body)?body:[])}
  async function load(){
    if(!token()){state(uiLocale.message('يتطلب دخول إداري'));return}
    try{state(uiLocale.message('جارٍ تحميل الإعدادات'));const [settingsResponse]=await Promise.all([fetch(api()+'/trips/admin/weather-gate',{headers:headers()}),loadTrips()]);const body=await settingsResponse.json();if(!settingsResponse.ok)throw localError(body?.message||uiLocale.message('تعذر تحميل الإعدادات'));render(body);state(uiLocale.message('متصل بالخادم'))}catch(error){state(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الإعدادات'))}
  }
  async function save(payload){
    try{state(uiLocale.message('جارٍ حفظ الإعداد'));const r=await fetch(api()+'/trips/admin/weather-gate',{method:'PATCH',headers:headers(),body:JSON.stringify(payload)});const body=await r.json();if(!r.ok)throw localError(body?.message||uiLocale.message('تعذر حفظ الإعداد'));render(body);window.dispatchEvent(new CustomEvent('hydroland:weather-gate-changed',{detail:body}));state(uiLocale.message('تم حفظ الإعداد'))}catch(error){state(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر حفظ الإعداد'))}
  }
  async function refreshTrip(tripId){try{state(uiLocale.message('جارٍ جلب توقع Stormglass لوقت الرحلة'));const r=await fetch(`${api()}/trips/admin/weather-gate/trips/${tripId}/refresh`,{method:'POST',headers:headers()}),body=await r.json().catch(()=>null);if(!r.ok)throw localError(body?.message||uiLocale.message('تعذر تحديث الطقس'));await loadTrips();window.dispatchEvent(new CustomEvent('hydroland:weather-review-changed',{detail:body}));state(body?.review?.status==='APPROVED'?uiLocale.message('تم تحديث الطقس · الاعتماد السابق ما زال صالحًا'):uiLocale.message('تم تحديث الطقس · بانتظار المراجعة البشرية'))}catch(error){state(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحديث الطقس'))}}
  async function decideTrip(tripId,status,expectedReview){const notes=window.prompt(status==='APPROVED'?uiLocale.t('ملاحظات الاعتماد التشغيلي - اختياري'):uiLocale.t('سبب رفض حالة الطقس - اختياري'),'');if(notes===null)return;try{state(uiLocale.message('جارٍ حفظ قرار الطقس'));const r=await fetch(`${api()}/trips/admin/weather-gate/trips/${tripId}/decision`,{method:'POST',headers:headers(),body:JSON.stringify({status,notes,expectedReview})}),body=await r.json().catch(()=>null);if(!r.ok)throw localError(body?.message||uiLocale.message('تعذر حفظ القرار'));await loadTrips();window.dispatchEvent(new CustomEvent('hydroland:weather-review-changed',{detail:body}));state(status==='APPROVED'?uiLocale.message('تم اعتماد حالة الطقس'):uiLocale.message('تم رفض حالة الطقس'))}catch(error){state(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر حفظ قرار الطقس'));await loadTrips().catch(()=>{})}}
  panel.querySelector('[data-weather-toggle]')?.addEventListener('click',()=>save({enabled:panel.dataset.enabled!=='true'}));
  panel.querySelector('[data-weather-advisory]')?.addEventListener('click',()=>save({mode:'ADVISORY'}));
  panel.querySelector('[data-weather-enforce]')?.addEventListener('click',()=>save({mode:'ENFORCE'}));
  const applyRole=role=>{const active=role==='admin';panel.hidden=!active;if(active)load()};
  document.addEventListener('hydroland:role-changed',e=>applyRole(e.detail?.role));
  document.addEventListener('hydroland:auth-changed',()=>{if(!panel.hidden)load()});
  document.addEventListener('hydroland:operational-controls-changed',event=>{if(event.detail?.id==='WEATHER.WEATHER_GATE'&&window.HydrolandPortalAccess?.getCurrentRole?.()==='admin')void load()});
  document.addEventListener('hydroland:trip-location-changed',()=>{if(!panel.hidden)loadTrips()});
  applyRole(window.HydrolandPortalAccess?.getCurrentRole?.()||'diver');
})();