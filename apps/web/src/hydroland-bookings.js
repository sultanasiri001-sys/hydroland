(()=>{
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const state={trips:[],selected:null,pendingBooking:null,paymentReturnHandled:false};
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
  const formatPrice=price=>{
    if(!price||price.configured!==true)return 'السعر غير مهيأ';
    const amount=Number(price.pricePerSeatMinor||0)/100;
    return amount===0?'مجانية':`${amount.toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2})} ر.س للمقعد`;
  };
  const bookingDialog=document.getElementById('booking-dialog');
  const confirm=document.getElementById('confirm-booking');
  let seatsInput=document.getElementById('booking-seats');
  let priceText=document.getElementById('booking-price');
  if(bookingDialog&&confirm&&!seatsInput){
    const field=document.createElement('label');field.className='booking-seats-field';field.innerHTML='<span>عدد المقاعد</span><input id="booking-seats" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="عدد المقاعد"><small id="booking-seats-hint">مقعد واحد</small>';
    confirm.insertAdjacentElement('beforebegin',field);seatsInput=field.querySelector('#booking-seats');
  }
  if(bookingDialog&&confirm&&!priceText){
    priceText=document.createElement('small');priceText.id='booking-price';priceText.className='booking-price';priceText.textContent='السعر غير مهيأ';confirm.insertAdjacentElement('beforebegin',priceText);
  }
  const syncSeats=trip=>{
    if(!seatsInput)return;
    const remaining=Math.max(1,Number(trip?.remainingSeats??trip?.capacity??1));
    seatsInput.max=String(remaining);
    const current=Number(seatsInput.value||1);seatsInput.value=String(Math.min(Math.max(1,current),remaining));
    const hint=document.getElementById('booking-seats-hint');if(hint)hint.textContent=trip?`المتاح ${remaining} مقعد`:'اختر عدد المقاعد';
  };
  const syncBookingDetails=trip=>{if(!trip)return;const location=document.getElementById('booking-location');if(location)location.textContent=locationText(trip);const safety=document.querySelector('#booking-dialog .booking-safety span');if(safety)safety.textContent=trip.safety?.decision||'REVIEW';if(priceText)priceText.textContent=formatPrice(trip.price);syncSeats(trip)};
  const tripForButton=button=>state.trips.find(item=>normalize(item.title)===normalize(button?.dataset?.book||''));
  const bindButtons=()=>{
    document.querySelectorAll('[data-book]').forEach(button=>{
      const trip=tripForButton(button);
      if(trip){
        button.dataset.tripId=trip.id;
        const price=formatPrice(trip.price);button.title=`السعة ${trip.capacity} · ${price} · ${new Date(trip.startsAt).toLocaleString('ar-SA')}`;
        if(trip.price?.configured===false){button.disabled=true;button.setAttribute('aria-disabled','true');}
      }
    });
  };
  const loadTrips=async()=>{
    try{const trips=await request('/trips',{method:'GET',public:true});state.trips=Array.isArray(trips)?trips:[];bindButtons();return state.trips;}
    catch{bindButtons();return state.trips;}
  };
  const startPayment=async booking=>{
    const price=booking?.price||state.selected?.price;
    if(price?.configured===true&&Number(price.pricePerSeatMinor)===0){state.pendingBooking=null;toast('تم إنشاء الحجز المجاني بنجاح');return{bypassed:true};}
    const payment=await request('/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookingId:booking.id,idempotencyKey:`booking:${booking.id}`})});
    if(payment?.status==='BYPASSED'||payment?.provider==='BYPASSED'||payment?.provider==='FREE_TRIP'){state.pendingBooking=null;toast('تم إنشاء الحجز بنجاح');return{bypassed:true};}
    if(typeof payment?.checkoutUrl!=='string'||!payment.checkoutUrl)throw new Error('تم حفظ الحجز لكن لم يتم تجهيز رابط الدفع');
    let checkout;try{checkout=new URL(payment.checkoutUrl);}catch{throw new Error('رابط الدفع غير صالح');}
    if(checkout.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(checkout.hostname))throw new Error('رابط الدفع غير آمن');
    window.location.assign(checkout.toString());return{redirected:true};
  };
  const cleanPaymentReturn=()=>{const url=new URL(window.location.href);url.searchParams.delete('payment');url.searchParams.delete('payment_id');history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`)};
  const reconcilePaymentReturn=async()=>{
    if(state.paymentReturnHandled)return;
    const params=new URL(window.location.href).searchParams,paymentId=params.get('payment_id');if(!paymentId)return;
    if(!auth()?.isAuthenticated?.())return;
    state.paymentReturnHandled=true;
    try{
      const payment=await request(`/payments/${encodeURIComponent(paymentId)}/refresh`,{method:'POST'});
      if(payment?.status==='CAPTURED')toast('تم التحقق من الدفع بنجاح');
      else if(payment?.status==='REFUNDED')toast('تم التحقق من حالة الدفع · مسترد');
      else if(['FAILED','CANCELLED'].includes(payment?.status))toast('لم تكتمل عملية الدفع');
      else toast('تم التحقق من العملية، والدفع ما زال قيد المعالجة');
      window.dispatchEvent(new CustomEvent('hydroland:payment-reconciled',{detail:payment}));
    }catch(error){toast(error instanceof Error?error.message:'تعذر التحقق من حالة الدفع');}
    finally{cleanPaymentReturn();}
  };
  document.addEventListener('hydroland:auth-changed',()=>void reconcilePaymentReturn());
  setTimeout(()=>void reconcilePaymentReturn(),0);
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-book]');if(!button||button.disabled)return;
    const apply=trip=>{if(!trip)return false;state.selected=trip;state.pendingBooking=null;button.dataset.tripId=trip.id;syncBookingDetails(trip);queueMicrotask(()=>syncBookingDetails(trip));return true};
    if(apply(tripForButton(button)))return;
    state.selected=null;state.pendingBooking=null;syncSeats(null);
    void loadTrips().then(()=>{const trip=tripForButton(button);if(trip)apply(trip)});
  },true);
  if(confirm){confirm.addEventListener('click',async event=>{
    event.preventDefault();event.stopImmediatePropagation();
    if(!auth()?.isAuthenticated?.()){toast('سجّل الدخول أولًا لإتمام الحجز');return;}
    const title=document.getElementById('booking-title')?.textContent||'';
    const trip=state.selected||state.trips.find(item=>normalize(item.title)===normalize(title));
    if(!trip){toast('هذه الرحلة غير متاحة في قاعدة البيانات بعد');return;}
    if(trip.price?.configured===false){toast('سعر الرحلة لم يُعتمد بعد');return;}
    const seats=Number(seatsInput?.value||1),remaining=Number(trip.remainingSeats??trip.capacity??0);
    if(!Number.isInteger(seats)||seats<1){toast('اختر عدد مقاعد صحيح');seatsInput?.focus();return;}
    if(remaining>0&&seats>remaining){toast(`المتاح حاليًا ${remaining} مقعد فقط`);seatsInput?.focus();return;}
    confirm.disabled=true;const original=confirm.textContent;
    try{
      let booking=state.pendingBooking&&state.pendingBooking.tripId===trip.id?state.pendingBooking:null;
      if(!booking){
        confirm.textContent='جارٍ حفظ الحجز...';
        booking=await request(`/trips/${encodeURIComponent(trip.id)}/bookings`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seats})});
        state.pendingBooking=booking;
        window.dispatchEvent(new CustomEvent('hydroland:booking-created',{detail:booking}));
      }
      if(booking?.price?.configured===true&&Number(booking.price.pricePerSeatMinor)===0){bookingDialog?.close();state.pendingBooking=null;if(seatsInput)seatsInput.value='1';toast('تم إنشاء الحجز المجاني بنجاح');return;}
      confirm.textContent='جارٍ تجهيز الدفع الآمن...';
      const result=await startPayment(booking);
      if(result?.bypassed){bookingDialog?.close();if(seatsInput)seatsInput.value='1';}
    }catch(error){toast(error instanceof Error?error.message:'تعذر إتمام الحجز والدفع');}
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
  window.HydrolandBookings={reload:loadTrips,listMine:()=>request('/trips/bookings/mine',{method:'GET'}),reconcilePaymentReturn};
})();