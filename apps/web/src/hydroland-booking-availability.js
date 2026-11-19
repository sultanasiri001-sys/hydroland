(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("booking-availability", {
  "غير متاحة": "Unavailable",
  "السعر لم يُعتمد بعد": "Price not yet approved",
  "مكتملة السعة": "Fully booked",
  "مؤجلة بقرار السلامة": "Postponed by the safety decision",
  "تحتاج اعتماد السلامة": "Safety approval required",
  "مؤجلة بسبب الطقس": "Postponed due to weather",
  "تحتاج مراجعة الطقس": "Weather review required",
  "بيانات الطقس غير متاحة": "Weather data unavailable",
  "غير متاحة بسبب الطقس": "Unavailable due to weather",
  "بدأت الرحلة": "Trip started",
  "· الموج {0}م": "· Waves {0} m",
  "متبقي {0} من {1}{2}": "{0} of {1} remaining{2}",
  "احجز الآن": "Book now",
  " · الموج {0}م": " · Waves {0} m"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase;
  const normalize=v=>String(v||'').trim().toLowerCase();
  const explainSource=trip=>{
    if(!trip)return uiLocale.t('غير متاحة');
    if(trip.price?.configured===false)return uiLocale.t('السعر لم يُعتمد بعد');
    if(!['DISABLED','REVIEW'].includes(trip.bookingPolicy?.capacityLimit)&&Number(trip.remainingSeats)<=0)return uiLocale.t('مكتملة السعة');
    if(trip.safety?.decision==='DEFERRED')return uiLocale.t('مؤجلة بقرار السلامة');
    const safetyOptional=['DISABLED','REVIEW'].includes(trip.bookingPolicy?.safetyApproval);
    if(!safetyOptional&&trip.safety?.decision!=='ALLOWED')return uiLocale.t('تحتاج اعتماد السلامة');
    if(trip.weather?.evaluation?.blocking){
      const decision=trip.weather.evaluation.decision;
      if(decision==='DEFERRED')return uiLocale.t('مؤجلة بسبب الطقس');
      if(decision==='REVIEW_REQUIRED')return uiLocale.t('تحتاج مراجعة الطقس');
      if(decision==='UNAVAILABLE')return uiLocale.t('بيانات الطقس غير متاحة');
      return uiLocale.t('غير متاحة بسبب الطقس');
    }
    if(new Date(trip.startsAt)<=new Date())return uiLocale.t('بدأت الرحلة');
    return'';
  };
  const explain=trip=>uiLocale.t(explainSource(trip));
  const explainMessage=trip=>{const source=explainSource(trip);return source?uiLocale.message(source):'';};
  async function refresh(){
    try{
      const r=await fetch(`${api()}/trips`);if(!r.ok)return;
      const trips=await r.json();
      document.querySelectorAll('[data-book]').forEach(btn=>{
        const trip=(Array.isArray(trips)?trips:[]).find(x=>btn.dataset.tripId?x.id===btn.dataset.tripId:normalize(x.title)===normalize(btn.dataset.book));
        const reason=explainSource(trip);
        btn.disabled=Boolean(reason);
        btn.setAttribute('aria-disabled',reason?'true':'false');
        if(reason){
          btn.dataset.availabilityReason=reason;
          uiLocale.setAttribute(btn, 'title', reason);
          uiLocale.setMessage(btn, uiLocale.message(reason));
        }else if(trip){
          delete btn.dataset.availabilityReason;
          btn.dataset.tripId=trip.id;
          const weather=trip.weather?.snapshot;
          const weatherHint=weather?.waveHeightM!=null?uiLocale.message(" · الموج {0}م", [weather.waveHeightM]):'';
          uiLocale.setAttribute(btn, 'title', 'متبقي {0} من {1}{2}', [trip.remainingSeats, trip.capacity, weatherHint]);
          uiLocale.setMessage(btn, uiLocale.message('احجز الآن'));
        }
      });
    }catch{}
  }
  window.addEventListener('hydroland:booking-created',refresh);
  window.addEventListener('hydroland:booking-cancelled',refresh);
  window.addEventListener('hydroland:booking-confirmed',refresh);
  window.addEventListener('hydroland:weather-gate-changed',refresh);
  document.addEventListener('hydroland:safety-decision-changed',refresh);
  document.addEventListener('hydroland:auth-changed',refresh);
  refresh();
  window.HydrolandBookingAvailability={refresh,explain,explainMessage};
})();
