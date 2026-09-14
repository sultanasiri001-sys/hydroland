(()=>{
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2200)};
  const state={trips:[],selected:null};
  const normalize=value=>String(value||'').trim().toLowerCase();
  const request=async(path,options={})=>{
    let response;
    const client=auth()?.authorizedFetch;
    if(client)response=await client(path,options);
    else response=await fetch(`${auth()?.apiBase||'http://localhost:3001/api/v1'}${path}`,options);
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(body?.message||`تعذر تنفيذ الطلب (${response.status})`);
    return body;
  };
  const bindButtons=()=>{
    document.querySelectorAll('[data-book]').forEach(button=>{
      const title=button.dataset.book||'';
      const trip=state.trips.find(item=>normalize(item.title)===normalize(title));
      if(trip){button.dataset.tripId=trip.id;button.title=`السعة ${trip.capacity} · ${new Date(trip.startsAt).toLocaleString('ar-SA')}`;}
      if(!button.dataset.hlBookingBound){button.dataset.hlBookingBound='1';button.addEventListener('click',()=>{state.selected=trip||null;},{capture:true});}
    });
  };
  const loadTrips=async()=>{
    try{const trips=await request('/trips',{method:'GET'});state.trips=Array.isArray(trips)?trips:[];bindButtons();}
    catch{bindButtons();}
  };
  const confirm=document.getElementById('confirm-booking');
  if(confirm){confirm.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(!auth()?.isAuthenticated?.()){toast('سجّل الدخول أولًا لإتمام الحجز');return;}
    const title=document.getElementById('booking-title')?.textContent||'';
    const trip=state.selected||state.trips.find(item=>normalize(item.title)===normalize(title));
    if(!trip){toast('هذه الرحلة غير متاحة في قاعدة البيانات بعد');return;}
    confirm.disabled=true;const original=confirm.textContent;confirm.textContent='جارٍ حفظ الحجز...';
    try{
      const booking=await request(`/trips/${encodeURIComponent(trip.id)}/bookings`,{method:'POST',body:JSON.stringify({seats:1})});
      document.getElementById('booking-dialog')?.close();
      toast(`تم إنشاء الحجز بنجاح · الحالة ${booking.status||'PENDING'}`);
      window.dispatchEvent(new CustomEvent('hydroland:booking-created',{detail:booking}));
    }catch(error){toast(error instanceof Error?error.message:'تعذر إنشاء الحجز');}
    finally{confirm.disabled=false;confirm.textContent=original;}
  },true);}
  const nextTripButton=document.querySelector('[data-hl-action="trip"]');
  if(nextTripButton){nextTripButton.addEventListener('click',async event=>{
    if(!auth()?.isAuthenticated?.())return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      const bookings=await request('/trips/bookings/mine',{method:'GET'});
      const next=(Array.isArray(bookings)?bookings:[]).find(item=>item.trip&&item.status!=='CANCELLED');
      if(!next){toast('لا توجد حجوزات حالية');return;}
      const when=new Date(next.trip.startsAt).toLocaleString('ar-SA');
      toast(`${next.trip.title} · ${when} · ${next.status}`);
    }catch(error){toast(error instanceof Error?error.message:'تعذر تحميل الحجوزات');}
  },true);}
  loadTrips();
  window.HydrolandBookings={reload:loadTrips,listMine:()=>request('/trips/bookings/mine',{method:'GET'})};
})();