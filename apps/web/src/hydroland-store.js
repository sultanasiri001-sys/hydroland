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
  "مدفوعات دوراتي": "My course payments",
  "إنشاء الطلب يحفظ السلة. راجع الشروط ووافق عليها قبل الانتقال إلى الدفع.": "Creating an order saves your cart. Review and accept the terms before continuing to payment.",
  "عرض الشروط والدفع": "Review terms and pay",
  "تحديث حالة الدفع": "Refresh payment status",
  "إذا ألغيت الدورة المؤكدة قبل بدايتها بـ٤٨ ساعة أو أكثر، يُخصم ٢٥٪ ويُردّ لك ٧٥٪. عند الإلغاء الاختياري خلال آخر ٤٨ ساعة لا يُردّ المبلغ. لا استرداد عادي لعدم الحضور أو الانسحاب بعد البدء. إذا ألغى المركز قبل البداية تسترد المبلغ كاملًا.": "Cancel a confirmed course at least 48 hours before its start for a 75% refund. The deduction is 25%. Voluntary cancellation inside the final 48 hours has no ordinary refund. No ordinary refund applies to a no-show or voluntary withdrawal after starting. A center cancellation before the start gives a full refund.",
  "تأكيد استلام سلعة": "Confirm receipt of goods",
  "وقت الاستلام الفعلي": "Actual receipt time",
  "الكمية": "Quantity",
  "تسجيل الاستلام": "Record delivery",
  "طلب إرجاع سلعة": "Request a goods return",
  "تقديم طلب الإرجاع": "Submit return request",
  "سبب الإرجاع": "Reason for return",
  "تغيير الرأي": "Change of mind",
  "عيب": "Defect",
  "عدم المطابقة": "Not as described",
  "ضمان": "Warranty",
  "تعذر حفظ الطلب.": "Could not save the request.",
  "أُرسل طلب الإرجاع إلى المركز.": "Return requested from the center.",
  "استلم المركز المرتجع.": "The center received the returned goods.",
  "إلغاء الدورة المؤكدة": "Cancel confirmed course",
  "تأكيد إلغاء التسجيل وفق شروط الدورة الأصلية؟": "Cancel this enrollment under its original terms?",
  "سُجّل الإلغاء. تُراجع الأهلية المالية لدى المركز.": "Cancellation recorded. The center will review refund eligibility.",
  "سُجّل الإلغاء دون استرداد عادي.": "Cancellation recorded with no ordinary refund.",
  "سُجّل الإلغاء. المبلغ المؤهل للرد {0}.": "Cancellation recorded. The eligible refund is {0}.",
  "تفاصيل الدفع": "Payment details",
  "إغلاق": "Close",
  "جارٍ تحميل شروط الطلب...": "Loading the original order terms...",
  "تعذر تحميل شروط الدفع": "Could not load payment terms",
  "المورد:": "Provider:",
  "السجل التجاري:": "Commercial registration:",
  "الإجمالي:": "Total:",
  "موعد البداية:": "Start time:",
  "إصدار الشروط:": "Terms version:",
  "اطلعت على بيانات الطلب وشروطه وأوافق عليها": "I have reviewed and accept the order details and terms",
  "المتابعة إلى الدفع": "Continue to payment",
  "وافق على الشروط للمتابعة": "Accept the terms to continue",
  "تعذر تجهيز الدفع؛ حدّث حالة الطلب قبل المحاولة مجددًا.": "Could not prepare payment. Refresh the order status before trying again.",
  "رابط الدفع غير صالح": "Invalid payment link",
  "تم تأكيد التحصيل ومطابقته ماليًا.": "Collection has been confirmed and financially reconciled.",
  "تم التحقق من التحصيل؛ بانتظار المطابقة المالية لدى المركز.": "Collection has been verified and is awaiting the center's financial reconciliation.",
  "لم يكتمل التحصيل بعد. يمكنك متابعة رابط الدفع الأصلي خلال المهلة.": "Collection is not complete. You can continue using the original payment link while it remains valid.",
  "حالة الدفع تحتاج مراجعة من المركز؛ لا تنشئ دفعة جديدة.": "The center needs to review the payment status. Do not create another payment.",
  "انتهى رابط الدفع أو أُلغي.": "The payment link has expired or been canceled.",
  "لم يبدأ الدفع بعد.": "Payment has not started.",
  "إرجاع السلع المؤهلة خلال ٧ أيام من الاستلام الفعلي. تُراجع حالات العيب وعدم المطابقة والضمان بصورة مستقلة.": "Eligible goods may be returned within seven days of actual receipt. Defects, nonconformity and warranty claims are reviewed separately.",
  "لا توجد مهلة إلغاء مجانية بعد تأكيد الدورة. إلغاء العميل قبل البداية يحتاج مراجعة لأن رسمه لم يُحدد. لا استرداد عادي لعدم الحضور أو الانسحاب بعد البدء. إلغاء المركز قبل البدء يستوجب ردًا كاملًا.": "There is no free cancellation window after course confirmation. Customer cancellation before the start requires review because its charge is not set. No ordinary refund applies to no-shows or withdrawal after starting. Center cancellation before starting requires a full refund.",
  "تأكيد الدفع لا يعني قبول التدريب أو إتمامه.": "Payment confirmation does not mean training has been approved or completed.",
  "هذه بيانات الطلب وشروطه، وليست فاتورة ضريبية نهائية.": "These are the order details and terms, not a final tax invoice.",
  "تم إنشاء الطلب. راجع الشروط من «طلباتي» لإتمام الدفع.": "Order created. Review the terms in My orders to complete payment.",
  "لا توجد دورات مشتراة حتى الآن.": "No purchased course enrollments yet.",
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
  const panel=document.createElement('div');panel.className='hl-store-cart';uiLocale.setHTML(panel, uiLocale.html`<strong>السلة</strong><span class="hl-store-summary">السلة فارغة</span><button type="button" class="hl-store-checkout" disabled>إنشاء الطلب</button><small class="hl-store-payment-note">إنشاء الطلب يحفظ السلة. راجع الشروط ووافق عليها قبل الانتقال إلى الدفع.</small><button type="button" class="hl-store-orders">طلباتي</button><button type="button" class="hl-store-course-payments">مدفوعات دوراتي</button><div class="hl-store-orders-list" hidden></div><div class="hl-store-course-list" hidden></div>`);section.appendChild(panel);
  const summary=panel.querySelector('.hl-store-summary'),checkout=panel.querySelector('.hl-store-checkout'),orders=panel.querySelector('.hl-store-orders-list');
  const renderCart=()=>{let n=0,total=0;for(const x of cart.values()){n+=x.quantity;total+=x.priceMinor*x.quantity}summary.textContent=n?(n+uiLocale.t(' منتج · ')+money(total)):uiLocale.t('السلة فارغة');checkout.disabled=!n};
  const parse=async r=>{const body=await r.json().catch(()=>({}));if(!r.ok)throw (Array.isArray(body.message)?new Error(body.message.join('، ')):new Error(body.message||`HTTP ${r.status}`));return body};
  const loadPayments=async()=>{const r=await auth().authorizedFetch('/store/payments/mine');const data=await parse(r);return Array.isArray(data)?data:[]};
  const paymentForOrder=(payments,orderId)=>payments.find(payment=>payment.orderId===orderId)||null;
  const paymentMessage=state=>state?.collectionVerified?'تم تأكيد التحصيل ومطابقته ماليًا.'
    :state?.status==='CAPTURED'?'تم التحقق من التحصيل؛ بانتظار المطابقة المالية لدى المركز.'
    :state?.status==='PENDING'?'لم يكتمل التحصيل بعد. يمكنك متابعة رابط الدفع الأصلي خلال المهلة.'
    :['CANCELLED','FAILED'].includes(state?.status)?'انتهى رابط الدفع أو أُلغي.'
    :!state||state.status==='CREATED'?'لم يبدأ الدفع بعد.':'حالة الدفع تحتاج مراجعة من المركز؛ لا تنشئ دفعة جديدة.';
  const paymentStatusText=payment=>payment?uiLocale.t(paymentMessage(payment)):uiLocale.t('لا يوجد سجل دفع');
  let paymentViewVersion=0,ordersVersion=0,courseListVersion=0,storeSession=auth()?.getSessionVersion?.();
  const sameSession=()=>{const version=auth()?.getSessionVersion?.();return()=>auth()?.isAuthenticated?.()&&version===auth()?.getSessionVersion?.()};
  const paymentPath=(kind,id)=>kind==='COURSE'?'/payments/courses/'+encodeURIComponent(id):'/store/orders/'+encodeURIComponent(id);
  const paymentDialog=()=>{
    let dialog=document.getElementById('hl-store-payment-dialog');if(dialog)return dialog;
    const style=document.createElement('style');style.textContent='#hl-store-payment-dialog{width:min(640px,calc(100vw - 24px));max-height:85vh;overflow:auto;background:#071f31;color:#edf7fb;border:1px solid #30556b;border-radius:20px;padding:1.2rem}#hl-store-payment-dialog::backdrop{background:#071524bb}#hl-store-payment-dialog header{display:flex;justify-content:space-between;align-items:center;gap:1rem}#hl-store-payment-dialog button{padding:.65rem .9rem;border-radius:10px;border:1px solid #527288;background:#12354a;color:inherit;cursor:pointer}#hl-store-payment-dialog p,#hl-store-payment-dialog li{line-height:1.9;overflow-wrap:anywhere}#hl-store-payment-dialog label{display:flex;align-items:flex-start;gap:.6rem;margin:1rem 0}#hl-store-payment-dialog [data-commerce-controls]{display:flex;flex-wrap:wrap;gap:.7rem}.hl-store-orders-list article,.hl-store-course-list article{display:grid;gap:.6rem;margin:.7rem 0;padding:1rem;border:1px solid #30556b;border-radius:12px}';document.head.appendChild(style);
    dialog=document.createElement('dialog');dialog.id='hl-store-payment-dialog';uiLocale.setHTML(dialog,uiLocale.html`<header><h3>تفاصيل الدفع</h3><button type="button" data-commerce-close>إغلاق</button></header><div data-commerce-body></div>`);
    dialog.querySelector('[data-commerce-close]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{paymentViewVersion++;dialog.querySelector('[data-commerce-body]').replaceChildren()});document.body.appendChild(dialog);return dialog;
  };
  const openPayment=async(kind,id,{refresh=false}={})=>{
    if(!auth()?.isAuthenticated?.())return;
    const dialog=paymentDialog(),body=dialog.querySelector('[data-commerce-body]'),version=++paymentViewVersion,session=sameSession();
    const current=()=>session()&&version===paymentViewVersion&&dialog.open&&dialog.isConnected;
    uiLocale.setText(body,'جارٍ تحميل شروط الطلب...');if(!dialog.open)dialog.showModal();
    const base=paymentPath(kind,id);
    try{
      if(refresh){const state=await parse(await auth().authorizedFetch(base+'/refresh',{method:'POST'}));if(current())uiLocale.setText(body,paymentMessage(state));return;}
      const quote=await parse(await auth().authorizedFetch(base+'/quote'));if(!current())return;
      if(!quote.snapshot||typeof quote.quoteHash!=='string'||typeof quote.policyVersion!=='string')throw localError('تعذر تحميل شروط الدفع');
      const snapshot=quote.snapshot,lines=Array.isArray(snapshot.lines)?snapshot.lines:[snapshot],issuer=snapshot.issuer||lines[0]?.issuer;
      uiLocale.setHTML(body,uiLocale.html`<p>المورد: ${esc(issuer?.legalName||issuer?.displayName||'—')}</p><p>السجل التجاري: ${esc(issuer?.registrationNumber||'—')}</p><ul>${lines.map(line=>uiLocale.html`<li>${esc(line.title||line.name||'—')} · ${esc(line.quantity||1)} · ${esc(money(line.amountMinor||0,line.currency||snapshot.currency||'SAR'))}</li>`).join('')}</ul><p>الإجمالي: ${esc(money(snapshot.amountMinor,snapshot.currency))}</p>${kind==='COURSE'?uiLocale.html`<p>موعد البداية: ${esc(new Date(snapshot.originalSchedule?.startsAt).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}))}</p><p>${uiLocale.messageHTML(uiLocale.message(quote.policyVersion==='2026-11-21.2'?'إذا ألغيت الدورة المؤكدة قبل بدايتها بـ٤٨ ساعة أو أكثر، يُخصم ٢٥٪ ويُردّ لك ٧٥٪. عند الإلغاء الاختياري خلال آخر ٤٨ ساعة لا يُردّ المبلغ. لا استرداد عادي لعدم الحضور أو الانسحاب بعد البدء. إذا ألغى المركز قبل البداية تسترد المبلغ كاملًا.':'لا توجد مهلة إلغاء مجانية بعد تأكيد الدورة. إلغاء العميل قبل البداية يحتاج مراجعة لأن رسمه لم يُحدد. لا استرداد عادي لعدم الحضور أو الانسحاب بعد البدء. إلغاء المركز قبل البدء يستوجب ردًا كاملًا.'))}</p><p>تأكيد الدفع لا يعني قبول التدريب أو إتمامه.</p>`:uiLocale.html`<p>إرجاع السلع المؤهلة خلال ٧ أيام من الاستلام الفعلي. تُراجع حالات العيب وعدم المطابقة والضمان بصورة مستقلة.</p>`}<p>إصدار الشروط: ${esc(quote.policyVersion)}</p><small>هذه بيانات الطلب وشروطه، وليست فاتورة ضريبية نهائية.</small><label><input type="checkbox" data-commerce-accepted> اطلعت على بيانات الطلب وشروطه وأوافق عليها</label><div data-commerce-controls><button type="button" data-commerce-pay>المتابعة إلى الدفع</button><button type="button" data-commerce-refresh>تحديث حالة الدفع</button></div><p role="status" data-commerce-feedback></p>`);
      const button=body.querySelector('[data-commerce-pay]'),feedback=body.querySelector('[data-commerce-feedback]');
      body.querySelector('[data-commerce-refresh]').addEventListener('click',()=>{if(current())void openPayment(kind,id,{refresh:true})});
      button.addEventListener('click',async()=>{
        if(!current()||button.disabled)return;
        if(!body.querySelector('[data-commerce-accepted]')?.checked){uiLocale.setText(feedback,'وافق على الشروط للمتابعة');return;}
        button.disabled=true;
        try{
          const state=await parse(await auth().authorizedFetch(base+'/checkout',{method:'POST',body:JSON.stringify({quoteHash:quote.quoteHash,acceptedPolicyVersion:quote.policyVersion,idempotencyKey:(kind==='COURSE'?'course:':'store:')+id})}));
          if(!current())return;
          if(state.checkoutUrl){const url=new URL(state.checkoutUrl);if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname)))throw localError('رابط الدفع غير صالح');window.location.assign(url.toString());return;}
          uiLocale.setText(feedback,paymentMessage(state));
        }catch(error){if(current())uiLocale.setMessage(feedback,localErrorMessage(error,'تعذر تجهيز الدفع؛ حدّث حالة الطلب قبل المحاولة مجددًا.'));}
        finally{if(current())button.disabled=false;}
      });
    }catch(error){if(current())uiLocale.setMessage(body,localErrorMessage(error,'تعذر تحميل شروط الدفع'));}
  };
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
  const goodsControls = order => (order.items || []).map(item => {
    const original = item.contractSnapshot;
    if (original?.kind !== 'PHYSICAL_GOOD') return '';
    const deliveries = item.deliveries || [];
    const pending = item.quantity - deliveries.reduce((sum, row) => sum + row.quantity, 0);
    const quantityInput = max => uiLocale.html`<label>الكمية <input name="quantity" type="number" min="1" max="${esc(max)}" value="${esc(max)}" required></label>`;
    const deliveryForm = pending > 0 && !item.actualReceivedAt && ['CONFIRMED','FULFILLED'].includes(order.status)
      ? uiLocale.html`<details><summary>تأكيد استلام سلعة</summary><form data-goods-delivery="${esc(item.id)}">${quantityInput(pending)}<label>وقت الاستلام الفعلي <input name="receivedAt" type="datetime-local" required></label><button>تسجيل الاستلام</button></form></details>` : '';
    const returns = deliveries.map(delivery => {
      const requested = delivery.returns || [];
      const available = delivery.quantity - requested.reduce((sum,row) => sum + row.quantity, 0);
      const receipt = new Date(delivery.receivedAt).toLocaleString(undefined, {timeZoneName:'short'});
      const status = requested.map(row => uiLocale.html`<p>${esc(row.quantity)} · ${uiLocale.messageHTML(uiLocale.message(row.sellerReceivedAt?'استلم المركز المرتجع.':'أُرسل طلب الإرجاع إلى المركز.'))}</p>`).join('');
      return uiLocale.html`<p>${esc(receipt)} · ${esc(delivery.quantity)}</p>${status}${available > 0 ? uiLocale.html`<details><summary>طلب إرجاع سلعة</summary><form data-goods-return="${esc(delivery.id)}">${quantityInput(available)}<label>سبب الإرجاع <select name="reason"><option value="CHANGE_OF_MIND">تغيير الرأي</option><option value="DEFECT">عيب</option><option value="NON_CONFORMITY">عدم المطابقة</option><option value="WARRANTY">ضمان</option></select></label><button>تقديم طلب الإرجاع</button></form></details>` : ''}`;
    }).join('');
    return deliveryForm || returns ? uiLocale.html`<section><b>${esc(original.title)}</b>${deliveryForm}${returns}</section>` : '';
  }).join('');
  const loadOrders=async()=>{
    if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول لعرض طلباتك'));return}
    const active=sameSession(),version=++ordersVersion;
    orders.hidden=false;uiLocale.setMessage(orders, uiLocale.message('جارٍ تحميل الطلبات...'));
    try{
      const [orderResponse,payments]=await Promise.all([auth().authorizedFetch('/store/orders/mine'),loadPayments()]);
      const data=await parse(orderResponse);if(!active()||version!==ordersVersion)return;if(!Array.isArray(data))throw localError('تعذر تحميل الطلبات');
      uiLocale.setHTML(orders, data.length?data.map(o=>{const payment=paymentForOrder(payments,o.id),eligible=['CREATED','CONFIRMED'].includes(o.status)&&!['CAPTURED','REFUNDED'].includes(payment?.status);return uiLocale.html`<article data-store-order="${esc(o.id)}"><b>${esc(o.status)}</b><span>${money(o.totalMinor,o.currency)}</span><small>${new Date(o.createdAt).toLocaleString('ar-SA')}</small><small data-store-payment-state>${esc(paymentStatusText(payment))}</small>${eligible?uiLocale.html`<button type="button" data-store-payment-retry>عرض الشروط والدفع</button>`:''}${payment?uiLocale.html`<button type="button" data-store-payment-refresh>تحديث حالة الدفع</button>`:''}${goodsControls(o)}</article>`}).join(''):uiLocale.t('لا توجد طلبات حتى الآن.'));
      orders.querySelectorAll('form[data-goods-delivery],form[data-goods-return]').forEach(form => form.addEventListener('submit',async event => {
        event.preventDefault();
        if (!active() || version !== ordersVersion || form.dataset.busy) return;
        const values = new FormData(form), quantity = Number(values.get('quantity'));
        const orderId = form.closest('[data-store-order]').dataset.storeOrder;
        const delivery = form.hasAttribute('data-goods-delivery');
        const path = delivery ? '/store/orders/'+encodeURIComponent(orderId)+'/items/'+encodeURIComponent(form.dataset.goodsDelivery)+'/deliveries'
          : '/store/deliveries/'+encodeURIComponent(form.dataset.goodsReturn)+'/returns';
        const data = delivery ? {quantity,receivedAt:new Date(values.get('receivedAt')).toISOString()} : {quantity,reason:values.get('reason')};
        if (form.dataset.payload !== JSON.stringify(data)) {
          form.dataset.requestId = crypto.randomUUID();
          form.dataset.payload = JSON.stringify(data);
        }
        form.dataset.busy='true'; form.querySelector('button').disabled=true;
        try {
          await parse(await auth().authorizedFetch(path,{method:'POST',body:JSON.stringify({...data,requestId:form.dataset.requestId})}));
          if (active() && version===ordersVersion) await loadOrders();
        } catch (error) { if (active() && version===ordersVersion) toast(localErrorMessage(error,'تعذر حفظ الطلب.')); }
        finally { delete form.dataset.busy; form.querySelector('button').disabled=false; }
      }));
      orders.querySelectorAll('[data-store-payment-retry],[data-store-payment-refresh]').forEach(button=>button.addEventListener('click',()=>{if(active()&&version===ordersVersion)void openPayment('STORE',button.closest('[data-store-order]').dataset.storeOrder,{refresh:button.hasAttribute('data-store-payment-refresh')})}));
    }catch{if(active()&&version===ordersVersion)uiLocale.setMessage(orders, uiLocale.message('تعذر تحميل الطلبات.'))}
  };
  const loadCoursePayments=async()=>{
    if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول لعرض طلباتك'));return}
    const active=sameSession(),version=++courseListVersion,list=panel.querySelector('.hl-store-course-list');list.hidden=false;uiLocale.setText(list,'جارٍ تحميل الطلبات...');
    try{
      const rows=await parse(await auth().authorizedFetch('/training/mine/enrollments'));if(!active()||version!==courseListVersion)return;
      if(!Array.isArray(rows))throw localError('تعذر تحميل الطلبات');const enrolled=rows.filter(row=>row.storeCourseOfferId||row.metadata?.source==='UNIFIED_STORE');
      uiLocale.setHTML(list,enrolled.length?enrolled.map(row=>uiLocale.html`<article data-course-enrollment="${esc(row.id)}"><b>${esc(row.metadata?.title||row.courseCode)}</b><span>${esc(row.status)}</span>${row.status==='PENDING'?uiLocale.html`<button type="button" data-course-checkout>عرض الشروط والدفع</button>`:''}<button type="button" data-course-payment-refresh>تحديث حالة الدفع</button>${row.metadata?.financialConfirmation?.status==='VERIFIED'&&['ACTIVE','PENDING'].includes(row.status)?uiLocale.html`<button type="button" data-course-cancel>إلغاء الدورة المؤكدة</button>`: ''}<small>تأكيد الدفع لا يعني قبول التدريب أو إتمامه.</small></article>`).join(''):uiLocale.t('لا توجد دورات مشتراة حتى الآن.'));
      list.querySelectorAll('[data-course-cancel]').forEach(button=>button.addEventListener('click',async()=>{
        if (!active() || version!==courseListVersion || button.disabled || !window.confirm(uiLocale.t('تأكيد إلغاء التسجيل وفق شروط الدورة الأصلية؟'))) return;
        button.disabled=true;
        try {
          const id=button.closest('[data-course-enrollment]').dataset.courseEnrollment;
          const result=await parse(await auth().authorizedFetch(paymentPath('COURSE',id)+'/cancellation',{method:'POST'}));
          if (!active() || version!==courseListVersion) return;
          const decision=result.decision;
          const message=decision.status==='REVIEW_REQUIRED'?uiLocale.message('سُجّل الإلغاء. تُراجع الأهلية المالية لدى المركز.')
            :decision.refundAmountMinor>0?uiLocale.message('سُجّل الإلغاء. المبلغ المؤهل للرد {0}.',[money(decision.refundAmountMinor,decision.currency)])
            :uiLocale.message('سُجّل الإلغاء دون استرداد عادي.');
          toast(message); await loadCoursePayments();
        } catch(error){if(active()&&version===courseListVersion)toast(localErrorMessage(error,'تعذر حفظ الطلب.'));}
        finally{button.disabled=false;}
      }));
      list.querySelectorAll('[data-course-checkout],[data-course-payment-refresh]').forEach(button=>button.addEventListener('click',()=>{if(active()&&version===courseListVersion)void openPayment('COURSE',button.closest('[data-course-enrollment]').dataset.courseEnrollment,{refresh:button.hasAttribute('data-course-payment-refresh')})}));
    }catch(error){if(active()&&version===courseListVersion)uiLocale.setMessage(list,localErrorMessage(error,'تعذر تحميل الطلبات'));}
  };
  checkout.addEventListener('click',async()=>{
    if(!auth()?.isAuthenticated?.()){toast(uiLocale.message('سجّل الدخول أولًا لإتمام الطلب'));document.getElementById('visitor-auth-cta')?.click();return}
    checkout.disabled=true;
    const active=sameSession();
    let order=null;
    try{
      const r=await auth().authorizedFetch('/store/orders',{method:'POST',body:JSON.stringify({items:[...cart.values()].map(x=>({productId:x.id,quantity:x.quantity}))})});
      order=await parse(r);
      if(!active())return;
      cart.clear();renderCart();await loadProducts();
      if(!active())return;
      toast(uiLocale.message('تم إنشاء الطلب. راجع الشروط من «طلباتي» لإتمام الدفع.'));
      window.dispatchEvent(new CustomEvent('hydroland:store-order-created',{detail:{order}}));
      await loadOrders();
    }catch(error){if(active())toast(localErrorMessage(error, 'تعذر إنشاء الطلب'))}
    finally{if(active())renderCart()}
  });
  panel.querySelector('.hl-store-orders').addEventListener('click',loadOrders);
  panel.querySelector('.hl-store-course-payments').addEventListener('click',loadCoursePayments);
  const clearCommerceSession=()=>{paymentViewVersion++;ordersVersion++;courseListVersion++;cart.clear();renderCart();orders.replaceChildren();orders.hidden=true;const list=panel.querySelector('.hl-store-course-list');list.replaceChildren();list.hidden=true;document.getElementById('hl-store-payment-dialog')?.close();};
  let returnHandled=null;
  const resumeCommercePayment=async()=>{const params=new URLSearchParams(window.location.search),course=params.get('enrollment_id'),order=params.get('store_order_id'),kind=params.has('course_payment')?'COURSE':params.has('store_payment')?'STORE':null,id=kind==='COURSE'?course:order;if(!kind||!id||id.length>128||!auth()?.isAuthenticated?.())return;const key=kind+':'+id+':'+auth().getSessionVersion?.();if(returnHandled===key)return;returnHandled=key;await openPayment(kind,id,{refresh:true});};
  document.addEventListener('hydroland:session-cleared',()=>{clearCommerceSession();returnHandled=null});
  document.addEventListener('hydroland:auth-changed',()=>{const version=auth()?.getSessionVersion?.();if(version!==storeSession||!auth()?.isAuthenticated?.()){clearCommerceSession();returnHandled=null;}storeSession=version;void resumeCommercePayment()});
  document.addEventListener('hydroland:center-trips-changed',loadProducts);
  loadProducts();
  window.HydrolandStore={reloadProducts:loadProducts,openOrders:loadOrders,openCoursePayments:loadCoursePayments,getCart:()=>[...cart.values()],setTypeFilter,getProducts:()=>[...catalog.products],getPublicStatus:()=>catalog.errors.includes('products')?'error':catalog.status,addToCart,setFilter:filter=>{catalog.filter=['all','available','unavailable'].includes(filter)?filter:'all';if(catalog.status==='ready')renderProducts()}};
  void resumeCommercePayment();
})();

