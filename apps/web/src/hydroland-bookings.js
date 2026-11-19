(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("bookings", {
  "مؤكد": "Confirmed",
  "تعذر تحميل الحجوزات": "Could not load bookings",
  "السعر لم يُعتمد بعد": "Price not yet approved",
  "احجز الآن": "Book now",
  "حسب بيانات الرحلة": "Based on trip details",
  "سجّل الدخول أولًا": "Sign in first",
  "تعذر تنفيذ الطلب ({0})": "Could not complete the request ({0})",
  "السعر غير مهيأ": "Price not configured",
  "مجانية": "Free",
  "{0} ر.س للمقعد": "SAR {0} per seat",
  "عدد المقاعد": "Number of seats",
  "مقعد واحد": "One seat",
  "المتاح {0} مقعد": "{0} seats available",
  "اختر عدد المقاعد": "Choose the number of seats",
  "رحلة قارب": "Boat dive",
  "غوص شاطئي": "Shore dive",
  "رحلة غوص": "Diving trip",
  "سنوركل": "Snorkeling",
  "رحلة بحرية": "Marine trip",
  "تفاصيل الرحلة ومتطلبات المشاركة من بيانات المشغّل.": "Trip details and participation requirements supplied by the operator.",
  "الموعد من المشغّل": "Schedule supplied by the operator",
  "سجّل الدخول أولًا لإتمام الحجز": "Sign in first to complete your booking",
  "{0} رحلة منشورة": "{0} published trips",
  "تعذر تحميل الرحلات الآن.": "Could not load trips right now.",
  "إعادة المحاولة": "Try again",
  "لا توجد رحلات منشورة في هذا النشاط حاليًا.": "No published trips for this activity right now.",
  "لا توجد رحلات منشورة للحجز الآن. ستظهر هنا الرحلات المعتمدة من المشغّلين.": "No published trips available to book. Trips approved by operators will appear here.",
  "صورة تعبيرية للنشاط البحري": "Illustrative image of a marine activity",
  "صورة توضيحية": "Illustrative image",
  "المتاح {0} من {1} مقعد": "{0} of {1} seats available",
  "تفاصيل الرحلة": "Trip details",
  "تفاصيل": "Details",
  "السعة {0} · {1} · {2}": "Capacity {0} · {1} · {2}",
  "تم إنشاء الحجز المجاني بنجاح": "Free booking created successfully",
  "تم إنشاء الحجز بنجاح": "Booking created successfully",
  "تم حفظ الحجز لكن لم يتم تجهيز رابط الدفع": "Booking saved, but the payment link could not be prepared",
  "رابط الدفع غير صالح": "Invalid payment link",
  "رابط الدفع غير آمن": "Unsafe payment link",
  "حالة الدفع والحجز": "Payment and booking status",
  "إغلاق حالة الدفع": "Close payment status",
  "الدفع": "Payment",
  "جارٍ التحقق…": "Checking…",
  "الحجز": "Booking",
  "تحديث حالة الدفع والحجز": "Refresh payment and booking status",
  "جارٍ تحديث حالة الدفع والحجز…": "Refreshing payment and booking status…",
  "تم الدفع بنجاح": "Payment successful",
  "مسترد": "Refunded",
  "لم يكتمل الدفع": "Payment incomplete",
  "عملية الدفع ملغاة": "Payment cancelled",
  "قيد المعالجة": "Processing",
  "محجوز ماليًا — لم يُحصّل": "Authorized — not captured",
  "بانتظار تأكيد المشغّل": "Awaiting operator confirmation",
  "ملغى": "Cancelled",
  "حالة غير معروفة": "Unknown status",
  "تعذر التحقق من حالة الحجز": "Could not verify booking status",
  "تم الدفع بنجاح، وحجزك بانتظار تأكيد المشغّل.": "Payment successful. Your booking awaits operator confirmation.",
  "تم الدفع بنجاح، وحجزك مؤكد.": "Payment successful. Your booking is confirmed.",
  "تم الدفع بنجاح، لكن الحجز ملغى.": "Payment successful, but the booking is cancelled.",
  "تم الدفع بنجاح. تعذر التحقق من حالة الحجز.": "Payment successful. Could not verify booking status.",
  "يراجع المشغّل متطلبات الحجز ثم يؤكده. يمكنك تحديث الحالة هنا دون تكرار الدفع.": "The operator will review the booking requirements and confirm it. You can refresh the status here without paying again.",
  "راجع المشغّل لمتابعة المبلغ المدفوع؛ إلغاء الحجز لا يعني استرداده تلقائيًا.": "Contact the operator about the paid amount. Cancelling a booking does not automatically refund it.",
  "يمكنك متابعة تفاصيل الرحلة من حجوزاتي.": "You can follow your trip details in My bookings.",
  "حدّث الحالة أو راجع المشغّل، ولا تكرر الدفع.": "Refresh the status or contact the operator. Do not pay again.",
  "تم التحقق من حالة الدفع · مسترد": "Payment status verified · Refunded",
  "لم تكتمل عملية الدفع": "Payment was not completed",
  "تم التحقق من العملية، والدفع ما زال قيد المعالجة": "Transaction verified. Payment is still processing",
  "تعذر التحقق من حالة الدفع.": "Could not verify payment status.",
  "تظهر حالة الحجز مستقلة عن الدفع. حدّث الحالة أو راجع المشغّل قبل محاولة الدفع مجددًا.": "Booking status is shown separately from payment. Refresh the status or contact the operator before paying again.",
  "تعذر التحقق من الدفع": "Could not verify payment",
  "تعذر تحديث الحالة الآن.": "Could not refresh the status right now.",
  "أعد التحديث أو راجع المشغّل، ولا تكرر الدفع قبل معرفة نتيجة العملية.": "Refresh or contact the operator. Do not pay again before checking the transaction result.",
  "هذه الرحلة غير متاحة في قاعدة البيانات بعد": "This trip is not yet available in the database",
  "سعر الرحلة لم يُعتمد بعد": "The trip price has not been approved yet",
  "اختر عدد مقاعد صحيح": "Choose a valid number of seats",
  "المتاح حاليًا {0} مقعد فقط": "Only {0} seats are currently available",
  "جارٍ حفظ الحجز...": "Saving booking...",
  "جارٍ تجهيز الدفع الآمن...": "Preparing secure payment...",
  "تعذر إتمام الحجز والدفع": "Could not complete booking and payment",
  "لا توجد حجوزات حالية": "No current bookings",
  "تفاصيل {0}": "Details {0}"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  // Local labels retain identity; unknown API values remain plain text.
  const authoredTripTypeLabel=(type)=>((value=>value?uiLocale.message(value):value)(({BOAT_DIVE:'رحلة قارب',SHORE_DIVE:'غوص شاطئي',DIVE:'رحلة غوص',SNORKELING:'سنوركل',MARINE_TRIP:'رحلة بحرية'})[String(type||'').toUpperCase()]) || uiLocale.message('رحلة بحرية'));

  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, message);t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const state={trips:[],selected:null,pendingBooking:null,paymentReturnHandled:null,paymentId:null,publicStatus:'loading',filter:'all'};
  const normalize=value=>String(value||'').trim().toLowerCase();
  const locationText=trip=>{const location=trip?.location;if(location&&typeof location==='object')return String(location.locationName||trip?.siteName||trip?.meetingPoint||uiLocale.t('حسب بيانات الرحلة'));if(typeof location==='string'&&location.trim())return location;return trip?.siteName||trip?.meetingPoint||uiLocale.t('حسب بيانات الرحلة')};
  const request=async(path,options={})=>{
    let response;
    if(options.public){
      const {public:_,...fetchOptions}=options;
      const defaultApiBase=/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)?'http://localhost:3001/api/v1':'https://hydroland.onrender.com/api/v1';
      response=await fetch(`${auth()?.apiBase||window.HYDROLAND_API_BASE||defaultApiBase}${path}`,fetchOptions);
    }else{
      const client=auth()?.authorizedFetch;if(!client)throw localError('سجّل الدخول أولًا');
      response=await client(path,options);
    }
    const body=await response.json().catch(()=>null);
    if(!response.ok)throw new Error(body?.message||uiLocale.format("تعذر تنفيذ الطلب ({0})", [response.status]));
    return body;
  };
  const formatPrice=price=>{
    if(!price||price.configured!==true)return uiLocale.t('السعر غير مهيأ');
    const amount=Number(price.pricePerSeatMinor||0)/100;
    return amount===0?uiLocale.t('مجانية'):uiLocale.format("{0} ر.س للمقعد", [amount.toLocaleString('ar-SA',{minimumFractionDigits:2,maximumFractionDigits:2})]);
  };
  const bookingDialog=document.getElementById('booking-dialog');
  const confirm=document.getElementById('confirm-booking');
  let seatsInput=document.getElementById('booking-seats');
  let priceText=document.getElementById('booking-price');
  if(bookingDialog&&confirm&&!seatsInput){
    const field=document.createElement('label');field.className='booking-seats-field';uiLocale.setHTML(field, uiLocale.html`<span>عدد المقاعد</span><input id="booking-seats" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="عدد المقاعد"><small id="booking-seats-hint">مقعد واحد</small>`);
    confirm.insertAdjacentElement('beforebegin',field);seatsInput=field.querySelector('#booking-seats');
  }
  if(bookingDialog&&confirm&&!priceText){
    priceText=document.createElement('small');priceText.id='booking-price';priceText.className='booking-price';uiLocale.setMessage(priceText, uiLocale.message('السعر غير مهيأ'));confirm.insertAdjacentElement('beforebegin',priceText);
  }
  const syncSeats=trip=>{
    if(!seatsInput)return;
    const remaining=['DISABLED','REVIEW'].includes(trip?.bookingPolicy?.capacityLimit)?2000:Math.max(1,Number(trip?.remainingSeats??trip?.capacity??1));
    seatsInput.max=String(remaining);
    const current=Number(seatsInput.value||1);seatsInput.value=String(Math.min(Math.max(1,current),remaining));
    const hint=document.getElementById('booking-seats-hint');if(hint)hint.textContent=trip?uiLocale.format("المتاح {0} مقعد", [remaining]):uiLocale.t('اختر عدد المقاعد');
  };
  const syncBookingDetails=trip=>{if(!trip)return;const location=document.getElementById('booking-location');if(location)location.textContent=locationText(trip);const safety=document.querySelector('#booking-dialog .booking-safety span');if(safety)safety.textContent=trip.safety?.decision||'REVIEW';if(priceText)priceText.textContent=formatPrice(trip.price);syncSeats(trip)};
  const tripForButton=button=>state.trips.find(item=>button?.dataset?.tripId?item.id===button.dataset.tripId:normalize(item.title)===normalize(button?.dataset?.book||''));
  const tripTypeLabel=type=>({BOAT_DIVE:'رحلة قارب',SHORE_DIVE:'غوص شاطئي',DIVE:'رحلة غوص',SNORKELING:'سنوركل',MARINE_TRIP:'رحلة بحرية'})[String(type||'').toUpperCase()]||'رحلة بحرية';
  const tripDescription=trip=>String(trip.description||trip.summary||uiLocale.t('تفاصيل الرحلة ومتطلبات المشاركة من بيانات المشغّل.'));
  const tripDate=trip=>{const date=new Date(trip.startsAt);return Number.isNaN(date.getTime())?uiLocale.t('الموعد من المشغّل'):date.toLocaleString('ar-SA',{dateStyle:'medium',timeStyle:'short'})};
  const publicCategory=trip=>{const type=String(trip.type||'').toUpperCase();return type.includes('SHORE')?'shore':type.includes('DIVE')?'dive':'marine'};
  const openBooking=async id=>{
    let trip=state.trips.find(item=>item.id===id);
    if(!trip){const trips=await loadTrips();trip=trips.find(item=>item.id===id)}
    if(!trip)return;
    const reason=window.HydrolandBookingAvailability?.explain?.(trip)||(trip.price?.configured===false?uiLocale.t('السعر لم يُعتمد بعد'):'');
    if(reason){toast(reason);return}
    state.selected=trip;state.pendingBooking=null;syncBookingDetails(trip);
    const title=document.getElementById('booking-title');if(title)title.textContent=trip.title;
    if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول أولًا لإتمام الحجز'));document.getElementById('visitor-auth-cta')?.click();return}
    bookingDialog?.showModal();
  };
  const renderPublicTrips=(trips,error=false)=>{
    const grid=document.querySelector('[data-public-trip-grid]');if(!grid)return;
    const status=grid.querySelector('[data-public-trip-state]');if(!status)return;
    grid.querySelectorAll('[data-public-trip]').forEach(card=>card.remove());
    const visible=trips.filter(trip=>state.filter==='all'||publicCategory(trip)===state.filter);
    grid.dataset.publicTripCount=String(visible.length);
    const counter=document.querySelector('[data-public-trip-count-label]');if(counter)uiLocale.setText(counter, "{0} رحلة منشورة", [visible.length]);
    if(error){grid.dataset.tripState='error';uiLocale.setMessage(status, uiLocale.message('تعذر تحميل الرحلات الآن.'));const retry=document.createElement('button');retry.type='button';uiLocale.setMessage(retry, uiLocale.message('إعادة المحاولة'));retry.addEventListener('click',()=>void loadTrips());status.appendChild(retry);status.hidden=false;return}
    if(!visible.length){grid.dataset.tripState='empty';uiLocale.setMessage(status, (trips.length?uiLocale.message('لا توجد رحلات منشورة في هذا النشاط حاليًا.'):uiLocale.message('لا توجد رحلات منشورة للحجز الآن. ستظهر هنا الرحلات المعتمدة من المشغّلين.')));status.hidden=false;return}
    grid.dataset.tripState='ready';status.hidden=true;
    const mapCard=grid.querySelector('.map-card');
    for(const trip of visible){
      const card=document.createElement('article');card.className='trip-card';card.dataset.publicTrip='1';
      const image=document.createElement('div');image.className=`trip-image ${String(trip.type||'').toUpperCase().includes('SHORE')?'depth':'summer'}`;image.dataset.publicArt=publicCategory(trip);image.setAttribute('role','img');uiLocale.setAttribute(image, "aria-label", 'صورة تعبيرية للنشاط البحري');
      const badge=document.createElement('span');uiLocale.setMessage(badge, authoredTripTypeLabel(trip.type));image.appendChild(badge);const artworkNote=document.createElement('small');artworkNote.className='hl-trip-art-note';uiLocale.setMessage(artworkNote, uiLocale.message('صورة توضيحية'));image.appendChild(artworkNote);
      const details=document.createElement('div');
      const location=document.createElement('small');location.textContent=locationText(trip);
      const kind=document.createElement('span');kind.className='hl-public-trip-kind';uiLocale.setMessage(kind, authoredTripTypeLabel(trip.type));
      const title=document.createElement('h3');title.textContent=String(trip.title||uiLocale.t('رحلة بحرية'));
      const description=document.createElement('p');description.textContent=tripDescription(trip);
      const meta=document.createElement('div');meta.className='trip-meta';
      const date=document.createElement('span');date.textContent=tripDate(trip);
      const seats=document.createElement('span');uiLocale.setText(seats, "المتاح {0} من {1} مقعد", [Number(trip.remainingSeats??trip.capacity??0), Number(trip.capacity||0)]);
      meta.append(date,seats);
      const button=document.createElement('button');button.type='button';button.dataset.book=String(trip.title||'');button.dataset.tripId=String(trip.id||'');uiLocale.setMessage(button, uiLocale.message('احجز الآن'));
      button.addEventListener('click',()=>{if(!button.disabled)openBooking(trip.id)});
      const price=document.createElement('strong');price.className='hl-public-price';price.textContent=formatPrice(trip.price);
      const detailLink=document.createElement('a');detailLink.href='#trip/'+encodeURIComponent(trip.id);detailLink.dataset.publicDetail='trip';uiLocale.setMessage(detailLink, uiLocale.message('تفاصيل الرحلة'));uiLocale.setAttribute(detailLink, "aria-label", "تفاصيل {0}", [trip.title]);
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
        const price=formatPrice(trip.price);button.title=uiLocale.format("السعة {0} · {1} · {2}", [trip.capacity, price, new Date(trip.startsAt).toLocaleString('ar-SA')]);
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
    if(price?.configured===true&&Number(price.pricePerSeatMinor)===0){state.pendingBooking=null;toast(uiLocale.message('تم إنشاء الحجز المجاني بنجاح'));return{bypassed:true};}
    const payment=await request('/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({bookingId:booking.id,idempotencyKey:`booking:${booking.id}`})});
    if(payment?.status==='BYPASSED'||payment?.provider==='BYPASSED'||payment?.provider==='FREE_TRIP'){state.pendingBooking=null;toast(uiLocale.message('تم إنشاء الحجز بنجاح'));return{bypassed:true};}
    if(typeof payment?.checkoutUrl!=='string'||!payment.checkoutUrl)throw localError('تم حفظ الحجز لكن لم يتم تجهيز رابط الدفع');
    let checkout;try{checkout=new URL(payment.checkoutUrl);}catch{throw localError('رابط الدفع غير صالح');}
    if(checkout.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(checkout.hostname))throw localError('رابط الدفع غير آمن');
    window.location.assign(checkout.toString());return{redirected:true};
  };
  const paymentReturnKey='hl-payment-return-id';
  let paymentViewVersion=0,paymentSessionVersion=auth()?.getSessionVersion?.(),paymentToast=null,paymentResumePending=false;
  const cleanPaymentReturn=paymentId=>{const url=new URL(window.location.href);if(url.searchParams.get('payment_id')!==paymentId)return;url.searchParams.delete('payment');url.searchParams.delete('payment_id');history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`)};
  const rememberPayment=id=>{try{if(id)sessionStorage.setItem(paymentReturnKey,id);else sessionStorage.removeItem(paymentReturnKey)}catch{}};
  const storedPayment=()=>{try{return sessionStorage.getItem(paymentReturnKey)}catch{return null}};
  const clearPaymentToast=()=>{const notice=document.getElementById('toast');if(paymentToast&&notice?.textContent===String(paymentToast)){notice.textContent='';notice.classList.remove('visible')}paymentToast=null;};
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
    uiLocale.setHTML(dialog, uiLocale.html`<div class="dialog-head"><h2 id="hl-payment-status-title">حالة الدفع والحجز</h2><button type="button" data-payment-status-close aria-label="إغلاق حالة الدفع">×</button></div><p data-payment-trip></p><div class="booking-grid"><div><small>الدفع</small><b data-payment-state>جارٍ التحقق…</b></div><div><small>الحجز</small><b data-payment-booking-state>جارٍ التحقق…</b></div></div><p data-payment-summary role="status" aria-live="polite"></p><p data-payment-next-step></p><button type="button" class="primary-button" data-payment-status-refresh>تحديث حالة الدفع والحجز</button>`);
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
    refresh.disabled=true;uiLocale.setMessage(field('state'), uiLocale.message('جارٍ التحقق…'));uiLocale.setMessage(field('booking-state'), uiLocale.message('جارٍ التحقق…'));field('trip').textContent='';uiLocale.setMessage(field('summary'), uiLocale.message('جارٍ تحديث حالة الدفع والحجز…'));field('next-step').textContent='';
    try{
      const payment=await request(`/payments/${encodeURIComponent(paymentId)}/refresh`,{method:'POST'});
      if(!current())return;
      if(payment?.id!==paymentId||typeof payment?.bookingId!=='string'||!payment.bookingId)throw new Error('INVALID_PAYMENT_RESPONSE');
      let booking=null;
      try{const rows=await request('/trips/bookings/mine',{method:'GET'});if(Array.isArray(rows))booking=rows.find(row=>row?.id===payment.bookingId)||null}catch{}
      if(!current())return;
      const paymentLabels={CAPTURED:'تم الدفع بنجاح',REFUNDED:'مسترد',FAILED:'لم يكتمل الدفع',CANCELLED:'عملية الدفع ملغاة',CREATED:'قيد المعالجة',PENDING:'قيد المعالجة',AUTHORIZED:'محجوز ماليًا — لم يُحصّل'};
      const bookingLabels={PENDING:'بانتظار تأكيد المشغّل',CONFIRMED:'مؤكد',CANCELLED:'ملغى'};
      uiLocale.setMessage(field('state'), ((value=>value?uiLocale.message(value):value)(paymentLabels[payment.status]) || uiLocale.message('حالة غير معروفة')));
      uiLocale.setMessage(field('booking-state'), ((value=>value?uiLocale.message(value):value)(bookingLabels[booking?.status]) || uiLocale.message('تعذر التحقق من حالة الحجز')));
      field('trip').textContent=typeof booking?.trip?.title==='string'?booking.trip.title:'';
      let message;
      if(payment.status==='CAPTURED'){
        message=(booking?.status==='PENDING'?uiLocale.message('تم الدفع بنجاح، وحجزك بانتظار تأكيد المشغّل.'):(booking?.status==='CONFIRMED'?uiLocale.message('تم الدفع بنجاح، وحجزك مؤكد.'):(booking?.status==='CANCELLED'?uiLocale.message('تم الدفع بنجاح، لكن الحجز ملغى.'):uiLocale.message('تم الدفع بنجاح. تعذر التحقق من حالة الحجز.'))));
        uiLocale.setMessage(field('next-step'), (booking?.status==='PENDING'?uiLocale.message('يراجع المشغّل متطلبات الحجز ثم يؤكده. يمكنك تحديث الحالة هنا دون تكرار الدفع.'):(booking?.status==='CANCELLED'?uiLocale.message('راجع المشغّل لمتابعة المبلغ المدفوع؛ إلغاء الحجز لا يعني استرداده تلقائيًا.'):(booking?.status==='CONFIRMED'?uiLocale.message('يمكنك متابعة تفاصيل الرحلة من حجوزاتي.'):uiLocale.message('حدّث الحالة أو راجع المشغّل، ولا تكرر الدفع.')))));
      }else{
        message=(payment.status==='REFUNDED'?uiLocale.message('تم التحقق من حالة الدفع · مسترد'):(payment.status==='FAILED'||payment.status==='CANCELLED'?uiLocale.message('لم تكتمل عملية الدفع'):(['CREATED','PENDING','AUTHORIZED'].includes(payment.status)?uiLocale.message('تم التحقق من العملية، والدفع ما زال قيد المعالجة'):uiLocale.message('تعذر التحقق من حالة الدفع.'))));
        uiLocale.setMessage(field('next-step'), uiLocale.message('تظهر حالة الحجز مستقلة عن الدفع. حدّث الحالة أو راجع المشغّل قبل محاولة الدفع مجددًا.'));
      }
      uiLocale.setMessage(field('summary'), message);paymentToast=message;toast(message);
      window.dispatchEvent(new CustomEvent('hydroland:payment-reconciled',{detail:payment}));
    }catch{
      if(!current())return;
      uiLocale.setMessage(field('state'), uiLocale.message('تعذر التحقق من الدفع'));uiLocale.setMessage(field('booking-state'), uiLocale.message('تعذر التحقق من حالة الحجز'));uiLocale.setMessage(field('summary'), uiLocale.message('تعذر تحديث الحالة الآن.'));uiLocale.setMessage(field('next-step'), uiLocale.message('أعد التحديث أو راجع المشغّل، ولا تكرر الدفع قبل معرفة نتيجة العملية.'));
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
    if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول أولًا لإتمام الحجز'));return;}
    const title=document.getElementById('booking-title')?.textContent||'';
    const trip=state.selected||state.trips.find(item=>normalize(item.title)===normalize(title));
    if(!trip){toast(uiLocale.message('هذه الرحلة غير متاحة في قاعدة البيانات بعد'));return;}
    if(trip.price?.configured===false){toast(uiLocale.message('سعر الرحلة لم يُعتمد بعد'));return;}
    const seats=Number(seatsInput?.value||1),remaining=Number(trip.remainingSeats??trip.capacity??0);
    if(!Number.isInteger(seats)||seats<1){toast(uiLocale.message('اختر عدد مقاعد صحيح'));seatsInput?.focus();return;}
    if(!['DISABLED','REVIEW'].includes(trip.bookingPolicy?.capacityLimit)&&remaining>0&&seats>remaining){toast(uiLocale.message("المتاح حاليًا {0} مقعد فقط", [remaining]));seatsInput?.focus();return;}
    confirm.disabled=true;const original=confirm.textContent;
    try{
      let booking=state.pendingBooking&&state.pendingBooking.tripId===trip.id?state.pendingBooking:null;
      if(!booking){
        uiLocale.setMessage(confirm, uiLocale.message('جارٍ حفظ الحجز...'));
        booking=await request(`/trips/${encodeURIComponent(trip.id)}/bookings`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({seats})});
        state.pendingBooking=booking;
        window.dispatchEvent(new CustomEvent('hydroland:booking-created',{detail:booking}));
      }
      if(booking?.price?.configured===true&&Number(booking.price.pricePerSeatMinor)===0){bookingDialog?.close();state.pendingBooking=null;if(seatsInput)seatsInput.value='1';toast(uiLocale.message('تم إنشاء الحجز المجاني بنجاح'));return;}
      uiLocale.setMessage(confirm, uiLocale.message('جارٍ تجهيز الدفع الآمن...'));
      const result=await startPayment(booking);
      if(result?.bypassed){bookingDialog?.close();if(seatsInput)seatsInput.value='1';}
    }catch(error){toast(localErrorMessage((error instanceof Error?error:undefined), 'تعذر إتمام الحجز والدفع'));}
    finally{confirm.disabled=false;confirm.textContent=original;}
  },true);}
  const nextTripButton=document.querySelector('[data-hl-action="trip"]');
  if(nextTripButton){nextTripButton.addEventListener('click',async event=>{
    if(!auth()?.isAuthenticated?.())return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      const bookings=await request('/trips/bookings/mine',{method:'GET'});
      const next=(Array.isArray(bookings)?bookings:[]).find(item=>item.trip&&item.status!=='CANCELLED');
      if(!next){toast(uiLocale.message('لا توجد حجوزات حالية'));return;}
      const when=new Date(next.trip.startsAt).toLocaleString('ar-SA');
      toast(`${next.trip.title} · ${when} · ${next.status}`);
    }catch(error){toast(localErrorMessage((error instanceof Error?error:undefined), 'تعذر تحميل الحجوزات'));}
  },true);}
  if(!document.querySelector('script[src$="hydroland-booking-participants.js"]')){const module=document.createElement('script');module.src='./hydroland-booking-participants.js';module.defer=true;document.body.appendChild(module);}
  loadTrips();
  window.HydrolandBookings={reload:loadTrips,listMine:()=>request('/trips/bookings/mine',{method:'GET'}),reconcilePaymentReturn,getPublicTrips:()=>[...state.trips],getPublicStatus:()=>state.publicStatus,publicCategory,formatPrice,locationText,tripDate,tripTypeLabel,tripTypeMessage:type=>uiLocale.message(tripTypeLabel(type)),openBooking,setPublicFilter:filter=>{state.filter=['all','dive','shore','marine'].includes(filter)?filter:'all';renderPublicTrips(state.trips,state.publicStatus==='error');bindButtons()}};
})();
