(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("store", {
  "رحلة غوص": "Diving trip",
  "رحلة بحرية": "Marine trip",
  "إعادة المحاولة": "Try again",
  "مقعد": "seats",
  "من": "of",
  "غوص من الشاطئ": "Shore diving",
  "الرحلات": "Trips",
  "النهاية:": "End:",
  "تعذر تحميل الطلبات.": "Could not load requests.",
  "جارٍ تحميل الطلبات...": "Loading orders...",
  "لا توجد طلبات حتى الآن.": "No orders yet.",
  "سلعة": "Goods",
  "خدمة": "Service",
  "السلة": "Cart",
  "السلة فارغة": "Cart is empty",
  "إنشاء الطلب": "Create order",
  "الدفع الإلكتروني غير متاح حاليًا. إنشاء الطلب لا يخصم أي مبلغ.": "Online payment is currently unavailable. Creating an order does not charge any amount.",
  "طلباتي": "My orders",
  "منتج ·": "Product ·",
  "سجل الدفع: {0} · {1}{2}": "Payment record: {0} · {1}{2}",
  "· لا يوجد تحصيل مالي منفذ": "· No funds captured",
  "لا يوجد سجل دفع": "No payment record",
  "لا يمكن تجاوز المخزون المتاح": "Available stock cannot be exceeded",
  "تمت إضافة المنتج إلى السلة": "Product added to cart",
  "تصنيف عروض المتجر": "Store offer categories",
  "الكل": "All",
  "السلع": "Goods",
  "الدورات": "Courses",
  "الخدمات": "Services",
  "الموعد يحدده المركز": "Schedule set by the center",
  "سجّل الدخول أولًا للتسجيل في الدورة": "Sign in first to enroll in the course",
  "إرسال طلب تسجيل في الدورة؟ الطلب بانتظار مراجعة المركز ولا يخصم أي مبلغ.": "Submit a course enrollment request? The request awaits center review and does not charge any amount.",
  "تم حفظ تسجيلك في الدورة بانتظار مراجعة المركز. لم يُخصم أي مبلغ.": "Your course enrollment was saved pending center review. No amount was charged.",
  "تعذر التسجيل في الدورة": "Could not enroll in the course",
  "تعذر تحميل": "Could not load",
  "السلع والخدمات": "goods and services",
  ". المعروض أدناه هو ما أمكن تحميله.": ". The items below are those that could be loaded.",
  "صورة العرض غير متاحة": "Offer image unavailable",
  "المتوفر:": "Available:",
  "وحدة خدمة": "service units",
  "تُنسّق تفاصيل تنفيذ الخدمة مع المركز بعد الطلب.": "Service delivery details are arranged with the center after ordering.",
  "\">تفاصيل المنتج": "\">Product details",
  "تفاصيل المنتج": "Product details",
  "نفد المخزون": "Out of stock",
  "أضف للسلة": "Add to cart",
  "رحلة ·": "Trip ·",
  "الموقع يحدده المركز": "Location set by the center",
  "المتاح": "Available",
  "السعر حسب بيانات الرحلة": "Price based on trip details",
  "\">تفاصيل الرحلة": "\">Trip details",
  "تفاصيل الرحلة": "Trip details",
  "\">احجز الرحلة": "\">Book trip",
  "احجز الرحلة": "Book trip",
  "دورة غوص": "Diving course",
  "دورة ·": "Course ·",
  "مركز غوص": "Dive center",
  "تفاصيل الدورة": "Course details",
  "تواصل مع المركز لمعرفة تفاصيل البرنامج.": "Contact the center for program details.",
  "البرنامج:": "Program:",
  "التسجيل بانتظار مراجعة المركز، ولا ينفّذ دفعًا إلكترونيًا.": "Enrollment awaits center review and does not make an online payment.",
  "اكتملت المقاعد": "Fully booked",
  "طلب التسجيل": "Request enrollment",
  "لا توجد عروض متاحة مطابقة لهذا الاختيار.": "No available offers match this selection.",
  "جارٍ تحميل عروض المتجر...": "Loading store offers...",
  "سجّل الدخول لعرض طلباتك": "Sign in to view your orders",
  "تعذر تحميل الطلبات": "Could not load orders",
  "إنشاء سجل الدفع": "Create payment record",
  "جارٍ إنشاء سجل الدفع...": "Creating payment record...",
  "تم إنشاء سجل الدفع للطلب؛ مزود الدفع لم يُفعّل بعد.": "Payment record created for the order. The payment provider is not enabled yet.",
  "تعذر إنشاء سجل الدفع": "Could not create payment record",
  "سجّل الدخول أولًا لإتمام الطلب": "Sign in first to complete your order",
  "تم إنشاء الطلب واستعادة سجل الدفع الموجود · مزود الدفع غير مفعّل": "Order created and existing payment record recovered · Payment provider not enabled",
  "تم إنشاء الطلب وسجل الدفع · مزود الدفع غير مفعّل": "Order and payment record created · Payment provider not enabled",
  "تم إنشاء الطلب وحفظ المخزون، لكن تعذر إنشاء سجل الدفع. افتح «طلباتي» لاستكماله.": "Order created and stock saved, but the payment record could not be created. Open My orders to complete it.",
  "تعذر إنشاء الطلب": "Could not create the order",
  " منتج · ": " Product · ",
  " · لا يوجد تحصيل مالي منفذ": " · No funds captured",
  " وحدة خدمة": " service units"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  const section=document.getElementById('store');if(!section)return;
  const grid=section.querySelector('.product-grid');
  const toast=m=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, m);t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2600)};
  const cart=new Map();
  const capacityAvailable=item=>['DISABLED','REVIEW'].includes(item.bookingPolicy?.capacityLimit)||Number(item.remainingSeats??item.capacity??0)>0;
  const catalog={products:[],trips:[],courses:[],errors:[],status:'loading',filter:'all',typeFilter:'all'};
  const money=(v,c='SAR')=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:c}).format(v/100);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const auth=()=>window.HydrolandAuth;
  const idempotencyKey=()=>`store-${Date.now()}-${globalThis.crypto?.randomUUID?.()||Math.random().toString(36).slice(2)}`;
  const panel=document.createElement('div');panel.className='hl-store-cart';uiLocale.setHTML(panel, uiLocale.html`<strong>السلة</strong><span class="hl-store-summary">السلة فارغة</span><button type="button" class="hl-store-checkout" disabled>إنشاء الطلب</button><small class="hl-store-payment-note">الدفع الإلكتروني غير متاح حاليًا. إنشاء الطلب لا يخصم أي مبلغ.</small><button type="button" class="hl-store-orders">طلباتي</button><div class="hl-store-orders-list" hidden></div>`);section.appendChild(panel);
  const summary=panel.querySelector('.hl-store-summary'),checkout=panel.querySelector('.hl-store-checkout'),orders=panel.querySelector('.hl-store-orders-list');
  const renderCart=()=>{let n=0,total=0;for(const x of cart.values()){n+=x.quantity;total+=x.priceMinor*x.quantity}summary.textContent=n?(n+uiLocale.t(' منتج · ')+money(total)):uiLocale.t('السلة فارغة');checkout.disabled=!n};
  const parse=async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw (Array.isArray(body.message)?new Error(body.message.join('، ')):new Error(body.message||`HTTP ${r.status}`));return body};
  const loadPayments=async()=>{const r=await auth().authorizedFetch('/store/payments/mine');const data=await parse(r);return Array.isArray(data)?data:[]};
  const paymentForOrder=(payments,orderId)=>payments.find(payment=>payment.orderId===orderId)||null;
  const createPaymentRecord=async(orderId,key=idempotencyKey())=>{
    try{
      const r=await auth().authorizedFetch(`/store/orders/${encodeURIComponent(orderId)}/payment`,{method:'POST',body:JSON.stringify({idempotencyKey:key})});
      return{payment:await parse(r),recovered:false};
    }catch(error){
      try{const payments=await loadPayments(),existing=paymentForOrder(payments,orderId);if(existing)return{payment:existing,recovered:true}}catch{}
      throw error;
    }
  };
  const paymentStatusText=payment=>payment?uiLocale.format("سجل الدفع: {0} · {1}{2}", [payment.status, (payment.provider || 'NOT_SELECTED'), (payment.financialActionExecuted?'':uiLocale.message(' · لا يوجد تحصيل مالي منفذ'))]):uiLocale.t('لا يوجد سجل دفع');
  const addToCart=id=>{
    const product=catalog.products.find(item=>item.id===id);if(!product)return false;
    const quantity=cart.get(id)?.quantity||0;
    if(quantity>=product.stockQuantity){toast(uiLocale.message('لا يمكن تجاوز المخزون المتاح'));return false}
    cart.set(id,{...product,quantity:quantity+1});renderCart();toast(uiLocale.message('تمت إضافة المنتج إلى السلة'));return true;
  };
  const catalogControls=document.createElement('div');catalogControls.className='hl-store-catalog-controls';if(!document.getElementById('hl-store-catalog-controls-style')){const style=document.createElement('style');style.id='hl-store-catalog-controls-style';style.textContent='.hl-store-catalog-controls{display:flex;gap:.55rem;flex-wrap:wrap;margin:1rem 0}.hl-store-catalog-controls button{border:1px solid rgba(120,191,224,.24);border-radius:999px;padding:.55rem .9rem;background:rgba(255,255,255,.05);color:inherit;font-weight:800;cursor:pointer}.hl-store-catalog-controls button[aria-pressed=true]{border-color:#27c4df;background:rgba(39,196,223,.14)}';document.head.appendChild(style)}catalogControls.setAttribute('role','group');uiLocale.setAttribute(catalogControls, "aria-label", 'تصنيف عروض المتجر');uiLocale.setHTML(catalogControls, uiLocale.html`<button type="button" data-store-type-filter="all" aria-pressed="true">الكل</button><button type="button" data-store-type-filter="products" aria-pressed="false">السلع</button><button type="button" data-store-type-filter="trips" aria-pressed="false">الرحلات</button><button type="button" data-store-type-filter="courses" aria-pressed="false">الدورات</button><button type="button" data-store-type-filter="services" aria-pressed="false">الخدمات</button>`);grid.insertAdjacentElement('beforebegin',catalogControls);
  const setTypeFilter=type=>{catalog.typeFilter=['all','products','trips','courses','services'].includes(type)?type:'all';catalogControls.querySelectorAll('[data-store-type-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.storeTypeFilter===catalog.typeFilter)));if(catalog.status!=='loading')renderProducts()};
  catalogControls.querySelectorAll('[data-store-type-filter]').forEach(button=>button.addEventListener('click',()=>setTypeFilter(button.dataset.storeTypeFilter)));
  const tripDate=trip=>{const value=new Date(trip.startsAt);return Number.isNaN(value.getTime())?uiLocale.t('الموعد يحدده المركز'):value.toLocaleString('ar-SA',{timeZone:'Asia/Riyadh',dateStyle:'medium',timeStyle:'short'})};
  const available=quantity=>catalog.filter==='all'||(catalog.filter==='available'?quantity>0:quantity<1);
  const courseDate=value=>tripDate({startsAt:value});
  async function enrollCourse(button){
    if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول أولًا للتسجيل في الدورة'));document.getElementById('visitor-auth-cta')?.click();return}
    if(!window.confirm(uiLocale.t('إرسال طلب تسجيل في الدورة؟ الطلب بانتظار مراجعة المركز ولا يخصم أي مبلغ.')))return;
    const session=auth().getSessionVersion?.();button.disabled=true;
    try{
      await parse(await auth().authorizedFetch('/store/courses/'+encodeURIComponent(button.dataset.storeEnroll)+'/enroll',{method:'POST'}));
      if(session!==auth()?.getSessionVersion?.())return;
      toast(uiLocale.message('تم حفظ تسجيلك في الدورة بانتظار مراجعة المركز. لم يُخصم أي مبلغ.'));
      window.HydrolandTraining?.reload?.();await loadProducts();
    }catch(error){if(session===auth()?.getSessionVersion?.())toast(localErrorMessage(error, 'تعذر التسجيل في الدورة'))}
    finally{button.disabled=false}
  }
  const renderProducts=()=>{
    const products=catalog.products.filter(product=>(catalog.typeFilter==='all'||(catalog.typeFilter==='products'&&product.kind!=='SERVICE')||(catalog.typeFilter==='services'&&product.kind==='SERVICE'))&&available(product.stockQuantity));
    const trips=['all','trips'].includes(catalog.typeFilter)?catalog.trips.filter(trip=>available(capacityAvailable(trip)?1:0)):[];
    const courses=['all','courses'].includes(catalog.typeFilter)?catalog.courses.filter(course=>available(capacityAvailable(course)?1:0)):[];
    const warning=catalog.errors.length?uiLocale.html`<article class="hl-public-empty" role="status"><span>تعذر تحميل ${esc(catalog.errors.map(key=>({products:'السلع والخدمات',trips:'الرحلات',courses:'الدورات'}[key])).join('، '))}. المعروض أدناه هو ما أمكن تحميله.</span><button type="button" class="hl-store-retry">إعادة المحاولة</button></article>`:'';
    const productCards=products.map(p=>uiLocale.html`<article data-public-product="${esc(p.id)}"><div class="product-art"><svg aria-hidden="true" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 22h28l4 32H14l4-32Z"/><path d="M24 26V18a8 8 0 0 1 16 0v8M25 37h14M25 44h9"/></svg><span class="hl-product-image-state">صورة العرض غير متاحة</span></div><small>${uiLocale.messageHTML((p.kind==='SERVICE'?uiLocale.message('خدمة'):uiLocale.message('سلعة')))} · ${esc(p.organization?.displayName||p.sku)}</small><h3>${esc(p.nameAr)}</h3><strong>${money(p.priceMinor,p.currency)}</strong><small>المتوفر: ${Number(p.stockQuantity)}${uiLocale.messageHTML((p.kind==='SERVICE'?uiLocale.message(' وحدة خدمة'):''))}</small>${(p.kind==='SERVICE'?uiLocale.html`<p>تُنسّق تفاصيل تنفيذ الخدمة مع المركز بعد الطلب.</p>`:'')}<div class="hl-public-card-actions"><a data-public-detail="product" href="#product/${encodeURIComponent(p.id)}">تفاصيل المنتج</a><button type="button" data-store-add="${esc(p.id)}" ${p.stockQuantity<1?'disabled':''}>${uiLocale.messageHTML((p.stockQuantity<1?uiLocale.message('نفد المخزون'):uiLocale.message('أضف للسلة')))}</button></div></article>`).join('');
    const tripCards=trips.map(trip=>uiLocale.html`<article data-store-trip="${esc(trip.id)}" data-public-service="trip"><div class="product-art"><span class="hl-product-image-state">رحلة غوص</span></div><small>رحلة · ${uiLocale.messageHTML((String(trip.type||'').toUpperCase().includes('SHORE')?uiLocale.message('غوص من الشاطئ'):uiLocale.message('رحلة بحرية')))}</small><h3>${esc(trip.title)}</h3><small>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('الموقع يحدده المركز')))(trip.location?.locationName||trip.siteName||trip.meetingPoint)}</small><small>${esc(tripDate(trip))}</small><small>المتاح ${Number(trip.remainingSeats??trip.capacity??0)} من ${Number(trip.capacity||0)} مقعد</small><strong>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('السعر حسب بيانات الرحلة')))(window.HydrolandBookings?.formatPrice?.(trip.price))}</strong><div class="hl-public-card-actions"><a data-public-detail="trip" href="#trip/${encodeURIComponent(trip.id)}">تفاصيل الرحلة</a><button type="button" data-book="${esc(trip.title)}" data-trip-id="${esc(trip.id)}">احجز الرحلة</button></div></article>`).join('');
    const courseCards=courses.map(course=>uiLocale.html`<article data-store-course="${esc(course.id)}"><div class="product-art"><span class="hl-product-image-state">دورة غوص</span></div><small>دورة · ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('مركز غوص')))(course.organization?.displayName)}</small><h3>${esc(course.title)}</h3><small>${esc(course.locationName)}</small><small>${esc(courseDate(course.startsAt))}</small><small>المتاح ${Number(course.remainingSeats)} من ${Number(course.capacity)} مقعد</small><strong>${money(course.priceMinor,course.currency)}</strong><details><summary>تفاصيل الدورة</summary><p>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('تواصل مع المركز لمعرفة تفاصيل البرنامج.')))(course.description)}</p><p>البرنامج: ${esc(course.courseCode)}</p><p>النهاية: ${esc(courseDate(course.endsAt))}</p><p>التسجيل بانتظار مراجعة المركز، ولا ينفّذ دفعًا إلكترونيًا.</p></details><button type="button" data-store-enroll="${esc(course.id)}" ${!capacityAvailable(course)?'disabled':''}>${uiLocale.messageHTML((!capacityAvailable(course)?uiLocale.message('اكتملت المقاعد'):uiLocale.message('طلب التسجيل')))}</button></article>`).join('');
    uiLocale.setHTML(grid, warning+productCards+tripCards+courseCards+(!products.length&&!trips.length&&!courses.length?uiLocale.html`<article class="hl-public-empty"><span>لا توجد عروض متاحة مطابقة لهذا الاختيار.</span></article>`:''));
    grid.querySelector('.hl-store-retry')?.addEventListener('click',loadProducts);
    grid.querySelectorAll('[data-store-add]').forEach(button=>button.addEventListener('click',()=>addToCart(button.dataset.storeAdd)));
    grid.querySelectorAll('[data-book]').forEach(button=>button.addEventListener('click',()=>window.HydrolandBookings?.openBooking?.(button.dataset.tripId)));
    grid.querySelectorAll('[data-store-enroll]').forEach(button=>button.addEventListener('click',()=>enrollCourse(button)));
    window.HydrolandBookingAvailability?.refresh?.();
  };
  let catalogVersion=0;
  const loadProducts=async()=>{
    const version=++catalogVersion;catalog.status='loading';uiLocale.setHTML(grid, uiLocale.html`<article class="hl-public-empty"><span>جارٍ تحميل عروض المتجر...</span></article>`);
    const base=auth()?.apiBase||'https://hydroland.onrender.com/api/v1';
    const sources=[['products',fetch(base+'/store/products')],['trips',fetch(base+'/trips')],['courses',fetch(base+'/store/courses')]];
    const results=await Promise.allSettled(sources.map(([,request])=>request.then(async response=>{const rows=await parse(response);if(!Array.isArray(rows))throw new Error('INVALID_CATALOG');return rows})));
    if(version!==catalogVersion)return;
    catalog.errors=[];
    results.forEach((result,index)=>{const key=sources[index][0];catalog[key]=result.status==='fulfilled'?result.value.filter(row=>row&&row.id&&(row.nameAr||row.title)):[];if(result.status==='rejected')catalog.errors.push(key)});
    catalog.status=catalog.errors.length===sources.length?'error':'ready';
    renderProducts();document.dispatchEvent(new CustomEvent('hydroland:public-products-updated'));
  };
  const loadOrders=async()=>{
    if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول لعرض طلباتك'));return}
    orders.hidden=false;uiLocale.setMessage(orders, uiLocale.message('جارٍ تحميل الطلبات...'));
    try{
      const [orderResponse,payments]=await Promise.all([auth().authorizedFetch('/store/orders/mine'),loadPayments()]);
      const data=await parse(orderResponse);if(!Array.isArray(data))throw localError('تعذر تحميل الطلبات');
      uiLocale.setHTML(orders, data.length?data.map(o=>{const payment=paymentForOrder(payments,o.id),eligible=['CREATED','CONFIRMED'].includes(o.status)&&!payment;return uiLocale.html`<article data-store-order="${esc(o.id)}"><b>${esc(o.status)}</b><span>${money(o.totalMinor,o.currency)}</span><small>${new Date(o.createdAt).toLocaleString('ar-SA')}</small><small data-store-payment-state>${esc(paymentStatusText(payment))}</small>${(eligible?uiLocale.html`<button type="button" data-store-payment-retry>إنشاء سجل الدفع</button>`:'')}</article>`}).join(''):uiLocale.t('لا توجد طلبات حتى الآن.'));
      orders.querySelectorAll('[data-store-payment-retry]').forEach(button=>button.addEventListener('click',async()=>{const article=button.closest('[data-store-order]'),orderId=article?.dataset.storeOrder,status=article?.querySelector('[data-store-payment-state]');if(!orderId)return;button.disabled=true;if(status)uiLocale.setMessage(status, uiLocale.message('جارٍ إنشاء سجل الدفع...'));try{const {payment}=await createPaymentRecord(orderId);if(status)status.textContent=paymentStatusText(payment);button.remove();toast(uiLocale.message('تم إنشاء سجل الدفع للطلب؛ مزود الدفع لم يُفعّل بعد.'))}catch(error){if(status)uiLocale.setMessage(status, uiLocale.message('تعذر إنشاء سجل الدفع'));toast(localErrorMessage(error, 'تعذر إنشاء سجل الدفع'))}finally{button.disabled=false}}));
    }catch{uiLocale.setMessage(orders, uiLocale.message('تعذر تحميل الطلبات.'))}
  };
  checkout.addEventListener('click',async()=>{
    if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول أولًا لإتمام الطلب'));document.getElementById('visitor-auth-cta')?.click();return}
    checkout.disabled=true;
    let order=null;
    try{
      const r=await auth().authorizedFetch('/store/orders',{method:'POST',body:JSON.stringify({items:[...cart.values()].map(x=>({productId:x.id,quantity:x.quantity}))})});
      order=await parse(r);
      cart.clear();renderCart();await loadProducts();
      try{
        const {payment,recovered}=await createPaymentRecord(order.id);
        toast((recovered?uiLocale.message('تم إنشاء الطلب واستعادة سجل الدفع الموجود · مزود الدفع غير مفعّل'):uiLocale.message('تم إنشاء الطلب وسجل الدفع · مزود الدفع غير مفعّل')));
        window.dispatchEvent(new CustomEvent('hydroland:store-checkout-created',{detail:{order,payment}}));
      }catch(error){
        toast(uiLocale.message('تم إنشاء الطلب وحفظ المخزون، لكن تعذر إنشاء سجل الدفع. افتح «طلباتي» لاستكماله.'));
        window.dispatchEvent(new CustomEvent('hydroland:store-order-created',{detail:{order,paymentError:error?.message||'PAYMENT_RECORD_FAILED'}}));
      }
    }catch(error){toast(localErrorMessage(error, 'تعذر إنشاء الطلب'))}
    finally{renderCart()}
  });
  panel.querySelector('.hl-store-orders').addEventListener('click',loadOrders);
  document.addEventListener('hydroland:center-trips-changed',loadProducts);
  loadProducts();
  window.HydrolandStore={reloadProducts:loadProducts,openOrders:loadOrders,getCart:()=>[...cart.values()],setTypeFilter,getProducts:()=>[...catalog.products],getPublicStatus:()=>catalog.errors.includes('products')?'error':catalog.status,addToCart,setFilter:filter=>{catalog.filter=['all','available','unavailable'].includes(filter)?filter:'all';if(catalog.status==='ready')renderProducts()}};
})();

