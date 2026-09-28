(()=>{
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const state={trips:[],selected:null,pendingBooking:null,paymentReturnHandled:false,publicStatus:'loading',filter:'all'};
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
  const tripForButton=button=>state.trips.find(item=>button?.dataset?.tripId?item.id===button.dataset.tripId:normalize(item.title)===normalize(button?.dataset?.book||''));
  const tripTypeLabel=type=>({BOAT_DIVE:'رحلة قارب',SHORE_DIVE:'غوص شاطئي',DIVE:'رحلة غوص',SNORKELING:'سنوركل',MARINE_TRIP:'رحلة بحرية'})[String(type||'').toUpperCase()]||'رحلة بحرية';
  const tripDescription=trip=>String(trip.description||trip.summary||'تفاصيل الرحلة ومتطلبات المشاركة من بيانات المشغّل.');
  const tripDate=trip=>{const date=new Date(trip.startsAt);return Number.isNaN(date.getTime())?'الموعد من المشغّل':date.toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})};
  const publicCategory=trip=>{const type=String(trip.type||'').toUpperCase();return type.includes('SHORE')?'shore':type.includes('DIVE')?'dive':'marine'};
  const openBooking=id=>{
    const trip=state.trips.find(item=>item.id===id);if(!trip)return;
    const reason=window.HydrolandBookingAvailability?.explain?.(trip)||(trip.price?.configured===false?'السعر لم يُعتمد بعد':'');
    if(reason){toast(reason);return}
    state.selected=trip;state.pendingBooking=null;syncBookingDetails(trip);
    const title=document.getElementById('booking-title');if(title)title.textContent=trip.title;
    if(!auth()?.isAuthenticated?.()){toast('سجّل الدخول أولًا لإتمام الحجز');document.getElementById('visitor-auth-cta')?.click();return}
    bookingDialog?.showModal();
  };
  const renderPublicTrips=(trips,error=false)=>{
    const grid=document.querySelector('[data-public-trip-grid]');if(!grid)return;
    const status=grid.querySelector('[data-public-trip-state]');if(!status)return;
    grid.querySelectorAll('[data-public-trip]').forEach(card=>card.remove());
    const visible=trips.filter(trip=>state.filter==='all'||publicCategory(trip)===state.filter);
    grid.dataset.publicTripCount=String(visible.length);
    const counter=document.querySelector('[data-public-trip-count-label]');if(counter)counter.textContent=`${visible.length} رحلة منشورة`;
    if(error){grid.dataset.tripState='error';status.textContent='تعذر تحميل الرحلات الآن.';const retry=document.createElement('button');retry.type='button';retry.textContent='إعادة المحاولة';retry.addEventListener('click',()=>void loadTrips());status.appendChild(retry);status.hidden=false;return}
    if(!visible.length){grid.dataset.tripState='empty';status.textContent=trips.length?'لا توجد رحلات منشورة في هذا النشاط حاليًا.':'لا توجد رحلات منشورة للحجز الآن. ستظهر هنا الرحلات المعتمدة من المشغّلين.';status.hidden=false;return}
    grid.dataset.tripState='ready';status.hidden=true;
    const mapCard=grid.querySelector('.map-card');
    for(const trip of visible){
      const card=document.createElement('article');card.className='trip-card';card.dataset.publicTrip='1';
      const image=document.createElement('div');image.className=`trip-image ${String(trip.type||'').toUpperCase().includes('SHORE')?'depth':'summer'}`;image.dataset.publicArt=publicCategory(trip);image.setAttribute('role','img');image.setAttribute('aria-label','صورة تعبيرية للنشاط البحري');
      const badge=document.createElement('span');badge.textContent=tripTypeLabel(trip.type);image.appendChild(badge);
      const details=document.createElement('div');
      const location=document.createElement('small');location.textContent=locationText(trip);
      const kind=document.createElement('span');kind.className='hl-public-trip-kind';kind.textContent=tripTypeLabel(trip.type);
      const title=document.createElement('h3');title.textContent=String(trip.title||'رحلة بحرية');
      const description=document.createElement('p');description.textContent=tripDescription(trip);
      const meta=document.createElement('div');meta.className='trip-meta';
      const date=document.createElement('span');date.textContent=tripDate(trip);
      const seats=document.createElement('span');seats.textContent=`المتاح ${Number(trip.remainingSeats??trip.capacity??0)} من ${Number(trip.capacity||0)} مقعد`;
      meta.append(date,seats);
      const button=document.createElement('button');button.type='button';button.dataset.book=String(trip.title||'');button.dataset.tripId=String(trip.id||'');button.textContent='احجز الآن';
      button.addEventListener('click',()=>{if(!button.disabled)openBooking(trip.id)});
      const price=document.createElement('strong');price.className='hl-public-price';price.textContent=formatPrice(trip.price);
      const detailLink=document.createElement('a');detailLink.href='#trip/'+encodeURIComponent(trip.id);detailLink.dataset.publicDetail='trip';detailLink.textContent='تفاصيل الرحلة';detailLink.setAttribute('aria-label','تفاصيل '+trip.title);
      const actions=document.createElement('div');actions.className='hl-public-card-actions';actions.append(detailLink,button);
      details.append(location,title,description,meta,price,actions,kind);card.append(image,details);
      grid.insertBefore(card,mapCard||status);
    }
    window.HydrolandBookingAvailability?.refresh?.();
  };
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
    state.publicStatus='loading';
    try{const trips=await request('/trips',{method:'GET',public:true});if(!Array.isArray(trips))throw new Error('Invalid trips');state.trips=trips.filter(trip=>trip&&trip.id&&trip.title);state.publicStatus='ready';renderPublicTrips(state.trips);bindButtons();return state.trips;}
    catch{state.trips=[];state.publicStatus='error';renderPublicTrips([],true);bindButtons();return state.trips;}
    finally{document.dispatchEvent(new CustomEvent('hydroland:public-trips-updated'))}
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
  window.HydrolandBookings={reload:loadTrips,listMine:()=>request('/trips/bookings/mine',{method:'GET'}),reconcilePaymentReturn,getPublicTrips:()=>[...state.trips],getPublicStatus:()=>state.publicStatus,publicCategory,formatPrice,locationText,tripDate,tripTypeLabel,openBooking,setPublicFilter:filter=>{state.filter=['all','dive','shore','marine'].includes(filter)?filter:'all';renderPublicTrips(state.trips,state.publicStatus==='error');bindButtons()}};
})();
