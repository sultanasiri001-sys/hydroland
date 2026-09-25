(()=>{
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2200)};
  const state={trips:[],selected:null};
  const normalize=value=>String(value||'').trim().toLowerCase();
  const locationText=trip=>{const location=trip?.location;if(location&&typeof location==='object')return String(location.locationName||trip?.siteName||trip?.meetingPoint||'حسب بيانات الرحلة');if(typeof location==='string'&&location.trim())return location;return trip?.siteName||trip?.meetingPoint||'حسب بيانات الرحلة'};
  const request=async(path,options={})=>{
    let response;
    if(options.public){
      const {public:_,...fetchOptions}=options;
      const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
      response=await fetch(`${auth()?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase}${path}`,fetchOptions);
    }else{
      const client=auth()?.authorizedFetch;if(!client)throw new Error('سجّل الدخول أولًا');
      response=await client(path,options);
    }
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(body?.message||`تعذر تنفيذ الطلب (${response.status})`);
    return body;
  };
  const bookingDialog=document.getElementById('booking-dialog');
  const confirm=document.getElementById('confirm-booking');
  let seatsInput=document.getElementById('booking-seats');
  if(bookingDialog&&confirm&&!seatsInput){
    const field=document.createElement('label');field.className='booking-seats-field';field.innerHTML='<span>عدد المقاعد</span><input id="booking-seats" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="عدد المقاعد"><small id="booking-seats-hint">مقعد واحد</small>';
    confirm.insertAdjacentElement('beforebegin',field);seatsInput=field.querySelector('#booking-seats');
  }
  const syncSeats=trip=>{
    if(!seatsInput)return;
    const remaining=Math.max(1,Number(trip?.remainingSeats??trip?.capacity??1));
    seatsInput.max=String(remaining);
    const current=Number(seatsInput.value||1);seatsInput.value=String(Math.min(Math.max(1,current),remaining));
    const hint=document.getElementById('booking-seats-hint');if(hint)hint.textContent=trip?`المتاح ${remaining} مقعد`:'اختر عدد المقاعد';
  };
  const bindButtons=()=>{
    document.querySelectorAll('[data-book]').forEach(button=>{
      const title=button.dataset.book||'';
      const trip=state.trips.find(item=>normalize(item.title)===normalize(title));
      if(trip){button.dataset.tripId=trip.id;button.title=`السعة ${trip.capacity} · ${new Date(trip.startsAt).toLocaleString('ar-SA')}`;button.addEventListener('click',()=>{const location=document.getElementById('booking-location');if(location)location.textContent=locationText(trip);const safety=document.querySelector('#booking-dialog .booking-safety span');if(safety)safety.textContent=trip.safety?.decision||'REVIEW';syncSeats(trip);},{capture:true});}
      if(!button.dataset.hlBookingBound){button.dataset.hlBookingBound='1';button.addEventListener('click',()=>{state.selected=trip||null;syncSeats(trip||null);},{capture:true});}
    });
  };
  const loadTrips=async()=>{
    try{const trips=await request('/trips',{method:'GET',public:true});state.trips=Array.isArray(trips)?trips:[];bindButtons();}
    catch{bindButtons();}
  };
  if(confirm){confirm.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(!auth()?.isAuthenticated?.()){toast('سجّل الدخول أولًا لإتمام الحجز');return;}
    const title=document.getElementById('booking-title')?.textContent||'';
    const trip=state.selected||state.trips.find(item=>normalize(item.title)===normalize(title));
    if(!trip){toast('هذه الرحلة غير متاحة في قاعدة البيانات بعد');return;}
    const seats=Number(seatsInput?.value||1),remaining=Number(trip.remainingSeats??trip.capacity??0);
    if(!Number.isInteger(seats)||seats<1){toast('اختر عدد مقاعد صحيح');seatsInput?.focus();return;}
    if(remaining>0&&seats>remaining){toast(`المتاح حاليًا ${remaining} مقعد فقط`);seatsInput?.focus();return;}
    confirm.disabled=true;const original=confirm.textContent;confirm.textContent='جارٍ حفظ الحجز...';
    try{
      const booking=await request(`/trips/${encodeURIComponent(trip.id)}/bookings`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seats})});
      bookingDialog?.close();
      if(seatsInput)seatsInput.value='1';
      toast(booking?.status?`تم إنشاء الحجز بنجاح · الحالة ${booking.status}`:'تم إنشاء الحجز بنجاح');
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
  if(!document.querySelector('script[src$="hydroland-booking-participants.js"]')){const module=document.createElement('script');module.src='./hydroland-booking-participants.js';module.defer=true;document.body.appendChild(module);}
  loadTrips();
  window.HydrolandBookings={reload:loadTrips,listMine:()=>request('/trips/bookings/mine',{method:'GET'})};
})();
