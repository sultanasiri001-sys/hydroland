(()=>{
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;t.textContent=message;t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const state={trips:[],selected:null,pendingBooking:null,paymentReturnHandled:null,paymentId:null,publicStatus:'loading',filter:'all'};
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
    const remaining=['DISABLED','REVIEW'].includes(trip?.bookingPolicy?.capacityLimit)?2000:Math.max(1,Number(trip?.remainingSeats??trip?.capacity??1));
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
  const openBooking=async id=>{
    let trip=state.trips.find(item=>item.id===id);
    if(!trip){const trips=await loadTrips();trip=trips.find(item=>item.id===id)}
    if(!trip)return;
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
      const badge=document.createElement('span');badge.textContent=tripTypeLabel(trip.type);image.appendChild(badge);const artworkNote=document.createElement('small');artworkNote.className='hl-trip-art-note';artworkNote.textContent='صورة توضيحية';image.appendChild(artworkNote);
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
  const paymentReturnKey='hl-payment-return-id';
  let paymentViewVersion=0,paymentSessionVersion=auth()?.getSessionVersion?.(),paymentToast=null,paymentResumePending=false;
  const cleanPaymentReturn=paymentId=>{const url=new URL(window.location.href);if(url.searchParams.get('payment_id')!==paymentId)return;url.searchParams.delete('payment');url.searchParams.delete('payment_id');history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`)};
  const rememberPayment=id=>{try{if(id)sessionStorage.setItem(paymentReturnKey,id);else sessionStorage.removeItem(paymentReturnKey)}catch{}};
  const storedPayment=()=>{try{return sessionStorage.getItem(paymentReturnKey)}catch{return null}};
  const clearPaymentToast=()=>{const notice=document.getElementById('toast');if(paymentToast&&notice?.textContent===paymentToast){notice.textContent='';notice.classList.remove('visible')}paymentToast=null;};
  const forgetPayment=()=>{
    paymentViewVersion++;
    if(state.paymentId)cleanPaymentReturn(state.paymentId);
    state.paymentId=null;paymentResumePending=false;rememberPayment(null);
    clearPaymentToast();
  };
  const clearPaymentView=event=>{
    // Expiry preserves only an opaque verification intent. Re-authentication must
    // repeat the protected payment lookup before any result is shown again.
    const resume=event?.detail?.reason==='expired'?(state.paymentId||paymentResumePending&&storedPayment()):null;
    forgetPayment();document.getElementById('hl-payment-status-dialog')?.remove();
    if(resume){paymentResumePending=true;state.paymentReturnHandled=null;rememberPayment(resume)}
  };
  const paymentDialog=()=>{
    let dialog=document.getElementById('hl-payment-status-dialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='hl-payment-status-dialog';dialog.className='booking-dialog';dialog.setAttribute('aria-labelledby','hl-payment-status-title');
    dialog.innerHTML='<div class="dialog-head"><h2 id="hl-payment-status-title">حالة الدفع والحجز</h2><button type="button" data-payment-status-close aria-label="إغلاق حالة الدفع">×</button></div><p data-payment-trip></p><div class="booking-grid"><div><small>الدفع</small><b data-payment-state>جارٍ التحقق…</b></div><div><small>الحجز</small><b data-payment-booking-state>جارٍ التحقق…</b></div></div><p data-payment-summary role="status" aria-live="polite"></p><p data-payment-next-step></p><button type="button" class="primary-button" data-payment-status-refresh>تحديث حالة الدفع والحجز</button>';
    dialog.querySelector('[data-payment-status-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{if(dialog.isConnected)forgetPayment()});
    dialog.querySelector('[data-payment-status-refresh]').addEventListener('click',()=>{if(state.paymentId)void refreshPaymentStatus(state.paymentId)});
    document.body.appendChild(dialog);return dialog;
  };
  const refreshPaymentStatus=async paymentId=>{
    if(!auth()?.isAuthenticated?.())return;
    const dialog=paymentDialog(),version=++paymentViewVersion,session=auth()?.getSessionVersion?.();
    state.paymentId=paymentId;paymentSessionVersion=session;paymentResumePending=false;rememberPayment(paymentId);
    if(!dialog.open)dialog.showModal();
    const current=()=>version===paymentViewVersion&&session===auth()?.getSessionVersion?.()&&auth()?.isAuthenticated?.()&&dialog.isConnected&&dialog.open&&state.paymentId===paymentId;
    const field=name=>dialog.querySelector(`[data-payment-${name}]`),refresh=field('status-refresh');
    clearPaymentToast();
    refresh.disabled=true;field('state').textContent='جارٍ التحقق…';field('booking-state').textContent='جارٍ التحقق…';field('trip').textContent='';field('summary').textContent='جارٍ تحديث حالة الدفع والحجز…';field('next-step').textContent='';
    try{
      const payment=await request(`/payments/${encodeURIComponent(paymentId)}/refresh`,{method:'POST'});
      if(!current())return;
      if(payment?.id!==paymentId||typeof payment?.bookingId!=='string'||!payment.bookingId)throw new Error('INVALID_PAYMENT_RESPONSE');
      let booking=null;
      try{const rows=await request('/trips/bookings/mine',{method:'GET'});if(Array.isArray(rows))booking=rows.find(row=>row?.id===payment.bookingId)||null}catch{}
      if(!current())return;
      const paymentLabels={CAPTURED:'تم الدفع بنجاح',REFUNDED:'مسترد',FAILED:'لم يكتمل الدفع',CANCELLED:'عملية الدفع ملغاة',CREATED:'قيد المعالجة',PENDING:'قيد المعالجة',AUTHORIZED:'محجوز ماليًا — لم يُحصّل'};
      const bookingLabels={PENDING:'بانتظار تأكيد المشغّل',CONFIRMED:'مؤكد',CANCELLED:'ملغى'};
      field('state').textContent=paymentLabels[payment.status]||'حالة غير معروفة';
      field('booking-state').textContent=bookingLabels[booking?.status]||'تعذر التحقق من حالة الحجز';
      field('trip').textContent=typeof booking?.trip?.title==='string'?booking.trip.title:'';
      let message;
      if(payment.status==='CAPTURED'){
        message=booking?.status==='PENDING'?'تم الدفع بنجاح، وحجزك بانتظار تأكيد المشغّل.':booking?.status==='CONFIRMED'?'تم الدفع بنجاح، وحجزك مؤكد.':booking?.status==='CANCELLED'?'تم الدفع بنجاح، لكن الحجز ملغى.':'تم الدفع بنجاح. تعذر التحقق من حالة الحجز.';
        field('next-step').textContent=booking?.status==='PENDING'?'يراجع المشغّل متطلبات الحجز ثم يؤكده. يمكنك تحديث الحالة هنا دون تكرار الدفع.':booking?.status==='CANCELLED'?'راجع المشغّل لمتابعة المبلغ المدفوع؛ إلغاء الحجز لا يعني استرداده تلقائيًا.':booking?.status==='CONFIRMED'?'يمكنك متابعة تفاصيل الرحلة من حجوزاتي.':'حدّث الحالة أو راجع المشغّل، ولا تكرر الدفع.';
      }else{
        message=payment.status==='REFUNDED'?'تم التحقق من حالة الدفع · مسترد':payment.status==='FAILED'||payment.status==='CANCELLED'?'لم تكتمل عملية الدفع':['CREATED','PENDING','AUTHORIZED'].includes(payment.status)?'تم التحقق من العملية، والدفع ما زال قيد المعالجة':'تعذر التحقق من حالة الدفع.';
        field('next-step').textContent='تظهر حالة الحجز مستقلة عن الدفع. حدّث الحالة أو راجع المشغّل قبل محاولة الدفع مجددًا.';
      }
      field('summary').textContent=message;paymentToast=message;toast(message);
      window.dispatchEvent(new CustomEvent('hydroland:payment-reconciled',{detail:payment}));
    }catch{
      if(!current())return;
      field('state').textContent='تعذر التحقق من الدفع';field('booking-state').textContent='تعذر التحقق من حالة الحجز';field('summary').textContent='تعذر تحديث الحالة الآن.';field('next-step').textContent='أعد التحديث أو راجع المشغّل، ولا تكرر الدفع قبل معرفة نتيجة العملية.';
    }finally{if(current()){refresh.disabled=false;cleanPaymentReturn(paymentId)}}
  };
  const reconcilePaymentReturn=async()=>{
    const params=new URL(window.location.href).searchParams,paymentId=params.get('payment_id')||storedPayment();
    if(!paymentId||paymentId.length>200||state.paymentReturnHandled===paymentId)return;
    if(!auth()?.isAuthenticated?.())return;
    state.paymentReturnHandled=paymentId;
    await refreshPaymentStatus(paymentId);
  };
  document.addEventListener('hydroland:session-cleared',clearPaymentView);
  document.addEventListener('hydroland:auth-changed',()=>{const session=auth()?.getSessionVersion?.();if((!auth()?.isAuthenticated?.()&&!paymentResumePending)||(state.paymentId&&session!==paymentSessionVersion))clearPaymentView();paymentSessionVersion=session;void reconcilePaymentReturn()});
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
    if(!['DISABLED','REVIEW'].includes(trip.bookingPolicy?.capacityLimit)&&remaining>0&&seats>remaining){toast(`المتاح حاليًا ${remaining} مقعد فقط`);seatsInput?.focus();return;}
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
