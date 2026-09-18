(()=>{
  const api=()=>window.HydrolandAuth?.apiBase||window.HYDROLAND_API_BASE||'http://localhost:3001/api/v1';
  const normalize=v=>String(v||'').trim().toLowerCase();
  const explain=trip=>{
    if(!trip)return'غير متاحة';
    if(Number(trip.remainingSeats)<=0)return'مكتملة السعة';
    if(!trip.safety||trip.safety.decision==='REVIEW_REQUIRED')return'تحتاج اعتماد السلامة';
    if(trip.safety.decision==='DEFERRED')return'مؤجلة بقرار السلامة';
    if(trip.safety.decision!=='ALLOWED')return'تحتاج اعتماد السلامة';
    if(trip.weather?.evaluation?.blocking){
      const decision=trip.weather.evaluation.decision;
      if(decision==='DEFERRED')return'مؤجلة بسبب الطقس';
      if(decision==='REVIEW_REQUIRED')return'تحتاج مراجعة الطقس';
      if(decision==='UNAVAILABLE')return'بيانات الطقس غير متاحة';
      return'غير متاحة بسبب الطقس';
    }
    if(new Date(trip.startsAt)<=new Date())return'بدأت الرحلة';
    return'';
  };
  async function refresh(){
    try{
      const r=await fetch(`${api()}/trips`);if(!r.ok)return;
      const trips=await r.json();
      document.querySelectorAll('[data-book]').forEach(btn=>{
        const trip=(Array.isArray(trips)?trips:[]).find(x=>normalize(x.title)===normalize(btn.dataset.book));
        const reason=explain(trip);
        btn.disabled=Boolean(reason);
        btn.setAttribute('aria-disabled',reason?'true':'false');
        if(reason){
          btn.dataset.availabilityReason=reason;
          btn.title=reason;
          btn.textContent=reason;
        }else if(trip){
          delete btn.dataset.availabilityReason;
          btn.dataset.tripId=trip.id;
          const weather=trip.weather?.snapshot;
          const weatherHint=weather?.waveHeightM!=null?` · الموج ${weather.waveHeightM}م`:'';
          btn.title=`متبقي ${trip.remainingSeats} من ${trip.capacity}${weatherHint}`;
          btn.textContent='احجز الآن';
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
  window.HydrolandBookingAvailability={refresh};
})();