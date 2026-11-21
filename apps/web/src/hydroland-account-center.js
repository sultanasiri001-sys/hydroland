(()=>{
  // Authored interface messages only. Account, provider and document values remain opaque.
  const uiLocale=window.HydrolandI18n?.createScope("account-center", {
  "لم تُسلّم": "Not handed over",
  "عرض الشروط والدفع": "Review terms and pay",
  "تحديث حالة الدفع": "Refresh payment status",
  "موعد التسليم:": "Scheduled handover:",
  "مقدم الخدمة:": "Service provider:",
  "السجل التجاري:": "Commercial registration:",
  "شروط تأجير المعدات": "Equipment rental terms",
  "إلغاء مجاني قبل موعد التسليم بـ٢٤ ساعة أو أكثر. داخل آخر ٢٤ ساعة وقبل التسليم: خصم ٢٥٪. لا استرداد اختياري بعد التسليم، مع بقاء الحقوق النظامية المنطبقة. تعذر التسليم من مقدم الخدمة يستوجب رد المبلغ كاملًا.": "Free cancellation at least 24 hours before the agreed handover. Within the last 24 hours before handover: a 25% deduction. No voluntary refund after handover; applicable statutory rights remain. If the provider cannot hand over the equipment, a full refund applies.",
  "اطلعت على بيانات التأجير وشروطه وأوافق عليها": "I have reviewed and accept the rental details and terms",
  "المتابعة إلى الدفع": "Continue to payment",
  "وافق على شروط التأجير للمتابعة": "Accept the rental terms to continue",
  "تعذر تجهيز دفع التأجير": "Could not prepare the rental checkout",
  "رابط الدفع غير صالح": "Invalid checkout URL",
  "لم يكتمل التحصيل بعد. يمكنك متابعة رابط الدفع الأصلي خلال المهلة.": "Collection is not complete. Continue the original checkout within its payment deadline.",
  "تم التحقق من التحصيل؛ بانتظار المطابقة المالية لدى المركز.": "Collection verified with the provider. The center's financial verification is pending.",
  "تمت المطابقة المالية؛ بانتظار تأكيد الحجز من المركز.": "Financial verification is complete. The center's reservation confirmation is pending.",
  "تم تأكيد دفع التأجير.": "Rental payment confirmed.",
  "حالة الدفع تحتاج مراجعة من المركز؛ لا تنشئ دفعة جديدة.": "The center must review this payment. Do not create another payment.",
  "انتهى رابط الدفع أو أُلغي.": "The checkout expired or was cancelled.",
  "تعذر تحديث حالة الدفع": "Could not refresh the payment status",
  "انتهت مهلة الدفع": "Payment deadline expired",
  "ملغى": "Cancelled",
  "آخر موعد لتأكيد الدفع:": "Confirm payment by:",
  "إلغاء الحجز غير المدفوع": "Cancel unpaid reservation",
  "تعذر إلغاء الحجز": "Could not cancel the reservation",
  "انتهت الجلسة، سجّل الدخول من جديد": "Your session has expired. Sign in again",
  "تعذر تنفيذ الطلب ({0})": "The request could not be completed ({0})",
  "إغلاق": "Close",
  "سجّل الدخول أولًا": "Sign in first",
  "فتح الإشعارات": "Open notifications",
  "{0}، {1} إشعارات غير مقروءة": "{0}, {1} unread notifications",
  "حجوزاتي": "My bookings",
  "MY BOOKINGS · حجوزاتي": "MY BOOKINGS",
  "جارٍ تحميل الحجوزات...": "Loading bookings...",
  "لا توجد حجوزات حتى الآن.": "No bookings yet.",
  "عدد المقاعد:": "Seats:",
  "المشاركون": "Participants",
  "إلغاء الحجز": "Cancel booking",
  "تم إلغاء الحجز": "Booking cancelled",
  "تعذر إلغاء الحجز": "Could not cancel the booking",
  "، ": ", ",
  "لا توجد بيانات مشاركين": "No participant details",
  "تعذر تحميل المشاركين": "Could not load participants",
  "تعذر تحميل الحجوزات": "Could not load bookings",
  "إيجاراتي": "My rentals",
  "MY RENTALS · إيجاراتي": "MY RENTALS",
  "جارٍ تحميل إيجارات المعدات...": "Loading equipment rentals...",
  "لا توجد إيجارات معدات حتى الآن.": "No equipment rentals yet.",
  "· المقاس": "· Size",
  "تم الإرجاع": "Returned",
  "مع الغواص": "With the diver",
  "طلب التمديد: قيد المراجعة": "Extension request: under review",
  "تمت الموافقة على آخر طلب تمديد.": "The latest extension request was approved.",
  "تم رفض آخر طلب تمديد.": "The latest extension request was rejected.",
  "فاتورة": "Invoice",
  "الإجمالي:": "Total:",
  "· المتبقي للإرجاع:": "· Remaining to return:",
  "مدفوعة": "Paid",
  "بانتظار الدفع": "Awaiting payment",
  "متأخر": "Overdue",
  "موعد الإرجاع:": "Return deadline:",
  "انتهت مدة الإيجار. مدّد الإيجار أو أعد المعدات للمستودع.": "The rental period has ended. Extend the rental or return the equipment to the warehouse.",
  "تاريخ إغلاق الإيجار:": "Rental closed on:",
  "تمديد الإيجار": "Extend rental",
  "سأعيد المعدات": "I will return the equipment",
  "أدخل تاريخ ووقت التمديد الجديد بصيغة YYYY-MM-DD HH:MM": "Enter the new extension date and time as YYYY-MM-DD HH:MM",
  "صيغة التاريخ غير صحيحة": "Invalid date format",
  "تم إرسال طلب التمديد للمراجعة": "Extension request submitted for review",
  "تعذر إرسال طلب التمديد": "Could not submit the extension request",
  "تم إشعار المستودع بأنك ستعيد المعدات": "The warehouse has been notified that you will return the equipment",
  "تم إشعار المستودع": "Warehouse notified",
  "تعذر إرسال إشعار الإرجاع": "Could not send the return notice",
  "تعذر تحميل الإيجارات": "Could not load rentals",
  "رسالة جديدة": "New message",
  "تم تأكيد الحجز": "Booking confirmed",
  "تم إلغاء الرحلة": "Trip cancelled",
  "تأكيد حجز رحلة": "Trip booking confirmation",
  "تكليف بطاقم رحلة": "Trip crew assignment",
  "تحديث تكليف الرحلة": "Trip assignment update",
  "مراجعة استجابة طاقم الرحلة": "Trip crew response review",
  "تأخر استجابة طاقم الرحلة": "Trip crew response overdue",
  "تحديث طلب التفعيل": "Activation request update",
  "تحديث مراجعة الشهادة": "Certificate review update",
  "دعوة للانضمام إلى جهة": "Organization invitation",
  "تحديث دعوة الانضمام": "Organization invitation update",
  "تحديث عضويتك في المركز": "Center membership update",
  "تحديث مراجعة الجهة": "Organization review update",
  "تحديث أهلية المشاركة": "Participant eligibility update",
  "فاتورة تأجير معدات": "Equipment rental invoice",
  "تنبيه سلامة تجريبي": "Test safety alert",
  "الجهة": "Organization",
  "المنطقة": "Region",
  "الرحلة": "Trip",
  "رقم الفاتورة": "Invoice number",
  "الموقع": "Location",
  "موعد الرحلة": "Trip time",
  "موعد الاستحقاق": "Due date",
  "مطلوب إجراء من حسابك.": "Action is required from your account.",
  "الإشعارات": "Notifications",
  "NOTIFICATIONS · الإشعارات": "NOTIFICATIONS",
  "تجربة تنبيه سلامة": "Test a safety alert",
  "جرّب تنبيهًا لمنطقة الرأس يظهر في حسابك فقط.": "Try an alert for the Al Rais area, visible only in your account.",
  "جارٍ تحميل الإشعارات...": "Loading notifications...",
  "جارٍ إنشاء التنبيه التجريبي...": "Creating the test alert...",
  "تمت إضافة تنبيه السلامة التجريبي إلى حسابك.": "The test safety alert was added to your account.",
  "التنبيه التجريبي موجود بالفعل؛ يمكنك تجربة تنبيه آخر بعد دقيقة.": "A test alert already exists. You can try another after one minute.",
  "تعذر إنشاء التنبيه التجريبي. حاول مرة أخرى.": "Could not create the test alert. Try again.",
  "إشعار من HYDROLAND": "Notification from HYDROLAND",
  "تجريبي · حسابك فقط": "Test · Your account only",
  "جديد": "New",
  "مقروء": "Read",
  "عرض دعوة الانضمام": "View invitation",
  "هذا اختبار لظهور التنبيهات، وليس بلاغًا عن خطر فعلي.": "This tests notification display. It is not a report of an actual hazard.",
  "تحديد كمقروء": "Mark as read",
  "لا توجد إشعارات جديدة.": "No new notifications.",
  "جارٍ التحقق من الدعوة...": "Checking the invitation...",
  "تعذر قراءة الدعوة. أعد المحاولة.": "Could not read the invitation. Try again.",
  "هذه الدعوة لم تعد معلقة أو تم استبدالها. حدّث الإشعارات.": "This invitation is no longer pending or has been replaced. Refresh notifications.",
  "مدير الجهة": "Organization manager",
  "مسؤول تشغيل": "Operations officer",
  "مدرب غوص": "Dive instructor",
  "عضو فريق": "Team member",
  "مشاهد": "Viewer",
  "بيانات الدعوة غير مكتملة.": "Invitation details are incomplete.",
  "الجهة:": "Organization:",
  "الدور المقترح:": "Proposed role:",
  "قبول الدعوة يضيف عضويتك في الجهة بهذا الدور، ولا يمنح اعتمادًا مهنيًا أو صلاحيات الإدارة العليا.": "Accepting the invitation adds you to the organization in this role. It does not grant professional accreditation or platform administrator permissions.",
  "قبول الدعوة": "Accept invitation",
  "رفض الدعوة": "Decline invitation",
  "غير معروف": "Unknown",
  "قبول الدعوة متاح بعد تفعيل الجهة.": "The invitation can be accepted after the organization is activated.",
  "تم قبول الدعوة وتفعيل العضوية في الجهة.": "Invitation accepted and organization membership activated.",
  "تم رفض الدعوة.": "Invitation declined.",
  "تعذر الرد على الدعوة.": "Could not respond to the invitation.",
  "تعذر تحميل الدعوة.": "Could not load the invitation.",
  "تعذر تحديث الإشعار": "Could not update the notification",
  "إعادة المحاولة": "Retry",
  "تعذر تحميل الإشعارات": "Could not load notifications",
  "،": ","
}) || {messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),attribute:(name,text,values=[])=>name+'=\"'+String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))+'\"',message:(text,values=[])=>String(text).replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),setMessage:(node,value)=>(node.textContent=value??''),t:value=>value,label:(text,values=[])=>String(text??'').replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Only this module's authored Error instances retain translatable messages.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  if(!document.querySelector('script[src="./hydroland-agent-access.js"]')){const script=document.createElement('script');script.src='./hydroland-agent-access.js';script.defer=true;document.body.appendChild(script);}
  if(!document.querySelector('script[src="./hydroland-technology-requests.js"]')){const script=document.createElement('script');script.src='./hydroland-technology-requests.js';script.defer=true;document.body.appendChild(script);}
  const auth=()=>window.HydrolandAuth;
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, message);t.classList.add('visible');setTimeout(()=>t.classList.remove('visible'),2400)};
  const request=async(path,options={})=>{const client=auth()?.authorizedFetch;if(!client)throw new Error('AUTH_REQUIRED');const response=await client(path,options);const body=await response.json().catch(()=>null);if(!response.ok){if(response.status===401)throw localError(uiLocale.message('انتهت الجلسة، سجّل الدخول من جديد'));throw localError(body?.message||uiLocale.message("تعذر تنفيذ الطلب ({0})", [response.status]))}return body;};
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const sar=halala=>new Intl.NumberFormat('ar-SA',{style:'currency',currency:'SAR'}).format(Number(halala||0)/100);
  const ensureStyle=()=>{if(document.getElementById('hl-account-center-style'))return;const style=document.createElement('style');style.id='hl-account-center-style';style.textContent=`.hl-account-dialog{width:min(760px,calc(100vw - 24px));max-height:min(82vh,760px);border:1px solid rgba(120,191,224,.2);border-radius:24px;background:#071f31;color:#edf7fb;padding:0;box-shadow:0 28px 90px rgba(0,0,0,.45)}.hl-account-dialog::backdrop{background:rgba(1,10,18,.7);backdrop-filter:blur(5px)}.hl-account-head{display:flex;align-items:center;justify-content:space-between;padding:1rem 1.1rem;border-bottom:1px solid rgba(120,191,224,.14)}.hl-account-head h2{margin:.2rem 0 0}.hl-account-head button{border:0;background:transparent;color:#fff;font-size:1.6rem;cursor:pointer}.hl-account-body{padding:1rem;display:grid;gap:.8rem;overflow:auto;max-height:66vh}.hl-account-card{display:grid;gap:.55rem;padding:1rem;border:1px solid rgba(120,191,224,.14);border-radius:18px;background:rgba(255,255,255,.035)}.hl-account-card.overdue{border-color:rgba(255,128,105,.45);background:rgba(255,92,70,.055)}.hl-account-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:.8rem}.hl-account-card h3{margin:0;font-size:1rem}.hl-account-card p,.hl-account-card small{margin:0;color:#9fbdcc}.hl-status{font-size:.72rem;font-weight:900;padding:.3rem .55rem;border-radius:999px;background:rgba(255,255,255,.08)}.hl-status.confirmed,.hl-status.active,.hl-status.returned,.hl-status.read{color:#90e7ba;background:rgba(68,190,126,.12)}.hl-status.cancelled,.hl-status.rejected,.hl-status.overdue{color:#ffaaa0;background:rgba(255,100,90,.11)}.hl-status.pending,.hl-status.reserved{color:#f6d88d;background:rgba(229,180,95,.12)}.hl-account-actions{display:flex;gap:.55rem;flex-wrap:wrap}.hl-account-actions button{border:1px solid rgba(120,191,224,.18);border-radius:12px;padding:.58rem .8rem;background:rgba(255,255,255,.05);color:#eaf7fb;font-weight:800;cursor:pointer}.hl-account-actions button.primary{background:linear-gradient(135deg,#f4d18c,#e5b45f);color:#102131;border:0}.hl-account-actions button.danger{border-color:rgba(255,120,110,.28);color:#ffc0b9}.hl-account-actions button:disabled{opacity:.5;cursor:not-allowed}.hl-account-empty{text-align:center;padding:2rem 1rem;color:#9fbdcc}.hl-account-error{color:#ffc0b9;text-align:center;padding:1rem}.hl-notification.unread{border-color:rgba(229,180,95,.32);background:rgba(229,180,95,.05)}.hl-rental-items{display:grid;gap:.45rem}.hl-rental-item{display:flex;justify-content:space-between;gap:.7rem;padding:.65rem;border-radius:12px;background:rgba(255,255,255,.04)}.hl-rental-item b{display:block}.hl-rental-item span{text-align:end;color:#bcd3de;font-size:.8rem}.hl-overdue-note{padding:.7rem;border-radius:12px;background:rgba(255,100,90,.09);color:#ffc0b9;font-weight:800}@media(max-width:640px){.hl-account-dialog{width:calc(100vw - 16px);border-radius:20px}.hl-account-card-head{align-items:flex-start;flex-direction:column}.hl-rental-item{flex-direction:column}.hl-rental-item span{text-align:start}}`;document.head.appendChild(style);};
  const ensureDialog=(id,title,eyebrow)=>{let dialog=document.getElementById(id);if(dialog)return dialog;dialog=document.createElement('dialog');dialog.id=id;dialog.className='hl-account-dialog';uiLocale.setHTML(dialog, uiLocale.html`<div class="hl-account-head"><div><p class="eyebrow">${uiLocale.label(eyebrow)}</p><h2>${uiLocale.label(title)}</h2></div><button type="button" aria-label="إغلاق">×</button></div><div class="hl-account-body"></div>`);dialog.querySelector('.hl-account-head button').addEventListener('click',()=>dialog.close());dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});document.body.appendChild(dialog);return dialog;};
  const requireAuth=()=>{if(auth()?.isAuthenticated?.())return true;toast(uiLocale.message('سجّل الدخول أولًا'));return false};
  const formatDate=value=>{if(!value)return '—';const date=new Date(value);return Number.isNaN(date.getTime())?'—':date.toLocaleString('ar-SA')};
  let notificationUnreadCount=0,notificationRefreshVersion=0,notificationViewVersion=0;
  let notificationSessionVersion=auth()?.getSessionVersion?.();
  const notificationSession=()=>{const version=auth()?.getSessionVersion?.();return()=>auth()?.isAuthenticated?.()&&auth()?.getSessionVersion?.()===version};
  const updateNotificationIndicators=count=>{notificationUnreadCount=Math.max(0,Number(count)||0);document.querySelectorAll('#top-notifications,[data-diver-notifications],[data-portal-notifications]').forEach(button=>{button.dataset.hlIndicatorBaseLabel='فتح الإشعارات';if(notificationUnreadCount){button.dataset.unread=notificationUnreadCount>99?'99+':String(notificationUnreadCount);uiLocale.setAttribute(button, "aria-label", ...["{0}، {1} إشعارات غير مقروءة", [uiLocale.message(button.dataset.hlIndicatorBaseLabel), notificationUnreadCount]])}else{delete button.dataset.unread;uiLocale.setAttribute(button,'aria-label',button.dataset.hlIndicatorBaseLabel)}})};
  const inAppNotifications=rows=>Array.isArray(rows)?rows.filter(item=>item&&!String(item.type||'').startsWith('AUTH_')):[];
  const notificationCount=rows=>inAppNotifications(rows).filter(item=>item.status&&item.status!=='READ').length;
  const refreshNotificationIndicators=async()=>{const version=++notificationRefreshVersion,current=notificationSession();if(!current()){updateNotificationIndicators(0);return}try{const rows=await request('/notifications',{method:'GET'});if(current()&&version===notificationRefreshVersion)updateNotificationIndicators(notificationCount(rows))}catch{}};
  const renderBookings=async()=>{if(!requireAuth())return;ensureStyle();const dialog=ensureDialog('hl-bookings-dialog','حجوزاتي','MY BOOKINGS · حجوزاتي');const body=dialog.querySelector('.hl-account-body');uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-empty">جارٍ تحميل الحجوزات...</div>`);dialog.showModal();try{const rows=await request('/trips/bookings/mine',{method:'GET'});const bookings=Array.isArray(rows)?rows:[];if(!bookings.length){uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-empty">لا توجد حجوزات حتى الآن.</div>`);return}uiLocale.setHTML(body, bookings.map(item=>{const status=String(item.status||'').toLowerCase();const cancellable=['pending','confirmed'].includes(status)&&item.trip&&new Date(item.trip.startsAt)>new Date();return uiLocale.html`<article class="hl-account-card" data-booking-id="${esc(item.id)}"><div class="hl-account-card-head"><div><h3>${esc(item.trip?.title||'—')}</h3><p>${esc(formatDate(item.trip?.startsAt))}</p></div><span class="hl-status ${esc(status)}">${esc(item.status||'—')}</span></div><small>عدد المقاعد: ${esc(item.seats??'—')}</small><div class="hl-account-actions">${cancellable?uiLocale.html`<button class="danger" data-cancel-booking>إلغاء الحجز</button>`:''}<button data-booking-participants>المشاركون</button></div></article>`}).join(''));body.querySelectorAll('[data-cancel-booking]').forEach(button=>button.addEventListener('click',async()=>{const bookingId=button.closest('[data-booking-id]')?.dataset.bookingId;if(!bookingId)return;button.disabled=true;try{await request(`/trips/bookings/${encodeURIComponent(bookingId)}/cancel`,{method:'PATCH'});toast(uiLocale.message('تم إلغاء الحجز'));dialog.close();await renderBookings()}catch(error){toast(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر إلغاء الحجز'));button.disabled=false}}));body.querySelectorAll('[data-booking-participants]').forEach(button=>button.addEventListener('click',async()=>{const bookingId=button.closest('[data-booking-id]')?.dataset.bookingId;if(!bookingId)return;button.disabled=true;try{const participants=await request(`/trips/bookings/${encodeURIComponent(bookingId)}/participants`,{method:'GET'});const names=(Array.isArray(participants)?participants:[]).map((p,index)=>p.fullName||'—').join('، ');toast((names || uiLocale.message('لا توجد بيانات مشاركين')))}catch(error){toast(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل المشاركين'))}finally{button.disabled=false}}))}catch(error){uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-error">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الحجوزات'))}</div>`)}};
  const rentalPaymentMessage=state=>state.paymentStatus==='PAID'&&state.collectionVerified
    ?'تم تأكيد دفع التأجير.':state.collectionVerified?'تمت المطابقة المالية؛ بانتظار تأكيد الحجز من المركز.'
    :state.status==='CAPTURED'?'تم التحقق من التحصيل؛ بانتظار المطابقة المالية لدى المركز.'
    :state.status==='PENDING'?'لم يكتمل التحصيل بعد. يمكنك متابعة رابط الدفع الأصلي خلال المهلة.'
    :['CANCELLED','FAILED'].includes(state.status)?'انتهى رابط الدفع أو أُلغي.':'حالة الدفع تحتاج مراجعة من المركز؛ لا تنشئ دفعة جديدة.';
  const rentalViewSession=detail=>{const active=notificationSession(),version=rentalViewVersion,dialog=detail?.closest('dialog');return()=>active()&&version===rentalViewVersion&&detail?.isConnected&&dialog?.open};
  const refreshRentalPayment=async(rentalId,detail)=>{
    const current=rentalViewSession(detail),state=await request('/payments/rentals/'+encodeURIComponent(rentalId)+'/refresh',{method:'POST'});
    if(current()&&detail?.isConnected)uiLocale.setText(detail,rentalPaymentMessage(state));
    return state;
  };
  const showRentalCheckout=async(rentalId,detail)=>{
    const current=rentalViewSession(detail),quote=await request('/payments/rentals/'+encodeURIComponent(rentalId)+'/quote',{method:'GET'});
    if(!current()||!detail.isConnected)return;
    const snapshot=quote.snapshot,issuer=snapshot?.issuer;
    uiLocale.setHTML(detail,uiLocale.html`<section><h4>شروط تأجير المعدات</h4><p>مقدم الخدمة: ${esc(issuer?.legalName||'—')}</p><p>السجل التجاري: ${esc(issuer?.registrationNumber||'—')}</p><p>${esc(issuer?.address||'—')}</p><p>موعد التسليم: ${esc(formatDate(snapshot.scheduledHandoverAt))}</p><p>موعد الإرجاع: ${esc(formatDate(snapshot.originalDueAt))}</p><p>الإجمالي: ${sar(snapshot.amountMinor)}</p><p>إلغاء مجاني قبل موعد التسليم بـ٢٤ ساعة أو أكثر. داخل آخر ٢٤ ساعة وقبل التسليم: خصم ٢٥٪. لا استرداد اختياري بعد التسليم، مع بقاء الحقوق النظامية المنطبقة. تعذر التسليم من مقدم الخدمة يستوجب رد المبلغ كاملًا.</p><label><input type="checkbox" data-rental-terms-accepted> اطلعت على بيانات التأجير وشروطه وأوافق عليها</label><div class="hl-account-actions"><button type="button" data-rental-start-checkout>المتابعة إلى الدفع</button></div><p role="status" data-rental-payment-message></p></section>`);
    const button=detail.querySelector('[data-rental-start-checkout]'),message=detail.querySelector('[data-rental-payment-message]');
    button.addEventListener('click',async()=>{
      if(!current()||button.disabled)return;
      if(!detail.querySelector('[data-rental-terms-accepted]').checked){uiLocale.setText(message,'وافق على شروط التأجير للمتابعة');return;}
      button.disabled=true;
      try{
        const state=await request('/payments/rentals/'+encodeURIComponent(rentalId)+'/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({quoteHash:quote.quoteHash,acceptedPolicyVersion:quote.policyVersion,idempotencyKey:'rental:'+rentalId})});
        if(!current()||!detail.isConnected)return;
        if(state.checkoutUrl){const url=new URL(state.checkoutUrl);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw localError('رابط الدفع غير صالح');window.location.assign(url.toString());return;}
        uiLocale.setText(message,rentalPaymentMessage(state));
      }catch(error){if(current()&&detail.isConnected)uiLocale.setMessage(message,localErrorMessage(error,'تعذر تجهيز دفع التأجير'));}
      finally{if(current()&&detail.isConnected)button.disabled=false;}
    });
  };
  let rentalViewVersion=0;
  const renderRentals=async()=>{if(!requireAuth())return;const version=++rentalViewVersion,current=notificationSession();ensureStyle();const dialog=ensureDialog('hl-rentals-dialog','إيجاراتي','MY RENTALS · إيجاراتي');const body=dialog.querySelector('.hl-account-body');uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-empty">جارٍ تحميل إيجارات المعدات...</div>`);dialog.showModal();try{const rows=await request('/trips/equipment-rentals/mine');if(!current()||version!==rentalViewVersion||!dialog.open)return;const rentals=Array.isArray(rows)?rows:[];if(!rentals.length){uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-empty">لا توجد إيجارات معدات حتى الآن.</div>`);return}uiLocale.setHTML(body, rentals.map(rental=>{const status=String(rental.status||'').toLowerCase(),items=(rental.items||[]).map(item=>uiLocale.html`<div class="hl-rental-item"><div><b>${esc(item.equipmentNameSnapshot)}</b><small>${esc(item.assetCodeSnapshot)}${item.serialNumberSnapshot?` · S/N ${esc(item.serialNumberSnapshot)}`:''}</small></div><span>${esc(item.equipmentType||'—')} · المقاس ${esc(item.size||'—')}<br>${sar(item.unitPriceHalala)} · ${uiLocale.label(item.returnedAt?'تم الإرجاع':item.handedOverAt?'مع الغواص':'لم تُسلّم')}</span></div>`).join(''),extension=rental.extensionStatus==='PENDING'?uiLocale.html`<small>طلب التمديد: قيد المراجعة</small>`:rental.extensionStatus==='APPROVED'?uiLocale.html`<small>تمت الموافقة على آخر طلب تمديد.</small>`:rental.extensionStatus==='REJECTED'?uiLocale.html`<small>تم رفض آخر طلب تمديد.</small>`:'';return uiLocale.html`<article class="hl-account-card ${rental.overdue?'overdue':''}" data-rental-id="${esc(rental.id)}"><div class="hl-account-card-head"><div><h3>فاتورة ${esc(rental.invoiceNumber)}</h3><p>${formatDate(rental.reservedAt)} · ${rental.paymentStatus==='PAID'?uiLocale.label('مدفوعة'):rental.paymentStatus==='PENDING'?uiLocale.label('بانتظار الدفع'):esc(rental.paymentStatus||'—')}</p></div><span class="hl-status ${rental.overdue?'overdue':esc(status)}">${rental.overdue?uiLocale.label('متأخر'):rental.status==='EXPIRED'?uiLocale.label('انتهت مهلة الدفع'):rental.status==='CANCELLED'?uiLocale.label('ملغى'):esc(rental.status||'—')}</span></div>${rental.status==='RESERVED'&&rental.paymentStatus==='PENDING'&&rental.holdExpiresAt?uiLocale.html`<small>آخر موعد لتأكيد الدفع: ${esc(formatDate(rental.holdExpiresAt))}</small>`:''}${rental.status==='RESERVED'&&rental.paymentStatus==='PENDING'?uiLocale.html`<button type="button" data-rental-cancel>إلغاء الحجز غير المدفوع</button>`:''}${rental.scheduledHandoverAt?uiLocale.html`<small>موعد التسليم: <b>${esc(formatDate(rental.scheduledHandoverAt))}</b></small>`:''}${rental.dueAt?uiLocale.html`<small>موعد الإرجاع: <b>${esc(formatDate(rental.dueAt))}</b></small>`:''}${rental.overdue?uiLocale.html`<div class="hl-overdue-note">انتهت مدة الإيجار. مدّد الإيجار أو أعد المعدات للمستودع.</div>`:''}<div class="hl-rental-items">${items}</div><small>الإجمالي: <b>${sar(rental.totalHalala)}</b> · المتبقي للإرجاع: ${esc(rental.pendingReturnCount||0)}</small>${extension}${rental.returnedAt?uiLocale.html`<small>تاريخ إغلاق الإيجار: ${esc(formatDate(rental.returnedAt))}</small>`:''}${rental.paymentStatus==='PENDING'&&rental.contractSnapshot?uiLocale.html`<div class="hl-account-actions">${rental.status==='RESERVED'?uiLocale.html`<button type="button" data-rental-checkout>عرض الشروط والدفع</button>`:''}<button type="button" data-rental-refresh>تحديث حالة الدفع</button></div><div data-rental-payment-detail aria-live="polite"></div>`:''}${rental.status==='ACTIVE'?uiLocale.html`<div class="hl-account-actions"><button class="primary" data-rental-extend ${rental.extensionStatus==='PENDING'?'disabled':''}>تمديد الإيجار</button><button data-rental-return>سأعيد المعدات</button></div>`:''}</article>`}).join(''));body.querySelectorAll('[data-rental-checkout],[data-rental-refresh]').forEach(button=>button.addEventListener('click',async()=>{
    const card=button.closest('[data-rental-id]'),detail=card.querySelector('[data-rental-payment-detail]'),active=rentalViewSession(detail);button.disabled=true;
    try{if(button.hasAttribute('data-rental-refresh'))await refreshRentalPayment(card.dataset.rentalId,detail);else await showRentalCheckout(card.dataset.rentalId,detail);}
    catch(error){if(active()&&detail.isConnected)uiLocale.setMessage(detail,localErrorMessage(error,'تعذر تحديث حالة الدفع'));}
    finally{if(button.isConnected)button.disabled=false;}
  }));body.querySelectorAll('[data-rental-cancel]').forEach(button=>button.addEventListener('click',async()=>{
    const id=button.closest('[data-rental-id]').dataset.rentalId;button.disabled=true;
    try{await request('/trips/equipment-rentals/'+encodeURIComponent(id)+'/mine/cancel',{method:'POST'});dialog.close();await renderRentals()}
    catch(error){toast(error instanceof Error?error.message:uiLocale.message('تعذر إلغاء الحجز'));button.disabled=false}
  }));body.querySelectorAll('[data-rental-extend]').forEach(button=>button.addEventListener('click',async()=>{const rentalId=button.closest('[data-rental-id]')?.dataset.rentalId;if(!rentalId)return;const value=prompt(uiLocale.t('أدخل تاريخ ووقت التمديد الجديد بصيغة YYYY-MM-DD HH:MM'));if(!value)return;const parsed=new Date(value.replace(' ','T'));if(Number.isNaN(parsed.getTime())){toast(uiLocale.message('صيغة التاريخ غير صحيحة'));return}button.disabled=true;try{await request(`/trips/equipment-rentals/${encodeURIComponent(rentalId)}/extension-request`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestedUntil:parsed.toISOString()})});toast(uiLocale.message('تم إرسال طلب التمديد للمراجعة'));dialog.close();await renderRentals()}catch(error){toast(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر إرسال طلب التمديد'));button.disabled=false}}));body.querySelectorAll('[data-rental-return]').forEach(button=>button.addEventListener('click',async()=>{const rentalId=button.closest('[data-rental-id]')?.dataset.rentalId;if(!rentalId)return;button.disabled=true;try{await request(`/trips/equipment-rentals/${encodeURIComponent(rentalId)}/return-intent`,{method:'POST'});toast(uiLocale.message('تم إشعار المستودع بأنك ستعيد المعدات'));uiLocale.setText(button, ...['تم إشعار المستودع'])}catch(error){toast(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر إرسال إشعار الإرجاع'));button.disabled=false}}))}catch(error){if(current()&&version===rentalViewVersion&&dialog.open)uiLocale.setHTML(body, uiLocale.html`<div class="hl-account-error">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الإيجارات'))}</div>`)}};
  const notificationTitles={MESSAGE_RECEIVED:'رسالة جديدة',BOOKING_CONFIRMED:'تم تأكيد الحجز',BOOKING_CANCELLED:'تم إلغاء الحجز',TRIP_CANCELLED:'تم إلغاء الرحلة',TRIP_BOOKING_CONFIRMED:'تأكيد حجز رحلة',TRIP_CREW_ASSIGNMENT:'تكليف بطاقم رحلة',CREW_ASSIGNMENT_ESCALATED:'تحديث تكليف الرحلة',CREW_RESPONSE_REVIEW_REQUIRED:'مراجعة استجابة طاقم الرحلة',CREW_RESPONSE_OVERDUE:'تأخر استجابة طاقم الرحلة',ACTIVATION_REQUEST_DECIDED:'تحديث طلب التفعيل',CREDENTIAL_REVIEWED:'تحديث مراجعة الشهادة',ORGANIZATION_INVITATION:'دعوة للانضمام إلى جهة',ORGANIZATION_INVITATION_RESPONSE:'تحديث دعوة الانضمام',ORGANIZATION_MEMBERSHIP_CHANGED:'تحديث عضويتك في المركز',ORGANIZATION_REVIEWED:'تحديث مراجعة الجهة',PARTICIPANT_ELIGIBILITY_CHANGED:'تحديث أهلية المشاركة',EQUIPMENT_RENTAL_INVOICE_SHARED:'فاتورة تأجير معدات',SAFETY_TEST:'تنبيه سلامة تجريبي'};
  const notificationText=value=>typeof value==='string'?value:'';
  const notificationSummary=payload=>{
    const details=[];
    for(const [key,label] of [['organizationName','الجهة'],['areaLabel','المنطقة'],['tripTitle','الرحلة'],['invoiceNumber','رقم الفاتورة'],['location','الموقع']]){
      if(notificationText(payload[key]))details.push(`${label}: ${payload[key]}`);
    }
    for(const [key,label] of [['startsAt','موعد الرحلة'],['dueAt','موعد الاستحقاق']]){
      if(payload[key])details.push(`${label}: ${formatDate(payload[key])}`);
    }
    if(payload.actionRequired===true)details.push(uiLocale.t('مطلوب إجراء من حسابك.'));
    return details.join(' · ');
  };
  const ensureNotificationStyle=()=>{
    if(document.getElementById('hl-notification-style'))return;
    const style=document.createElement('style');style.id='hl-notification-style';
    style.textContent='.hl-notification-tools{display:grid;gap:.6rem}.hl-notification-tools p,.hl-notification-feedback{margin:0;color:#bcd3de;font-size:.85rem;line-height:1.8}.hl-notification-list{display:grid;gap:.8rem}.hl-notification{min-width:0;overflow-wrap:anywhere}.hl-notification h3{line-height:1.7}.hl-notification-message{line-height:1.9;white-space:pre-line}.hl-notification-test{border-inline-start:3px solid #e5b45f}.hl-notification-test-label{justify-self:start;color:#f4d18c;border:1px solid rgba(229,180,95,.35);border-radius:999px;padding:.25rem .65rem;font-size:.78rem;font-weight:800}.hl-notification-feedback:empty{display:none}.hl-notification-test-note{padding:.7rem;border-radius:12px;background:rgba(229,180,95,.08);line-height:1.8}.hl-notification-tools button:focus-visible,.hl-notification button:focus-visible{outline:2px solid #f4d18c;outline-offset:3px}';
    document.head.appendChild(style);
  };
  const renderNotifications=async(message='')=>{
    if(!requireAuth())return;
    ensureStyle();ensureNotificationStyle();
    const sessionCurrent=notificationSession(),viewVersion=++notificationViewVersion,refreshVersion=++notificationRefreshVersion;
    const dialog=ensureDialog('hl-notifications-dialog','الإشعارات','NOTIFICATIONS · الإشعارات');
    dialog.dir='rtl';uiLocale.setAttribute(dialog, "aria-label", ...['الإشعارات']);
    const current=()=>sessionCurrent()&&viewVersion===notificationViewVersion&&dialog.open;
    const body=dialog.querySelector('.hl-account-body');
    uiLocale.setHTML(body, uiLocale.html`<div class="hl-notification-tools"><div class="hl-account-actions"><button type="button" class="primary" data-safety-test aria-describedby="hl-safety-test-description">تجربة تنبيه سلامة</button></div><p id="hl-safety-test-description">جرّب تنبيهًا لمنطقة الرأس يظهر في حسابك فقط.</p></div><p class="hl-notification-feedback" role="status" aria-live="polite">${esc(typeof message==='string'?message:'')}</p><div class="hl-notification-list" aria-busy="true"><div class="hl-account-empty">جارٍ تحميل الإشعارات...</div></div>`);
    if(!dialog.open)dialog.showModal();
    const list=body.querySelector('.hl-notification-list'),feedback=body.querySelector('.hl-notification-feedback');
    body.querySelector('[data-safety-test]').addEventListener('click',async event=>{
      const button=event.currentTarget;button.disabled=true;uiLocale.setText(feedback, ...['جارٍ إنشاء التنبيه التجريبي...']);
      try{
        const result=await request('/notifications/safety-test',{method:'POST'});
        if(current())await renderNotifications(result.created?uiLocale.t('تمت إضافة تنبيه السلامة التجريبي إلى حسابك.'):uiLocale.t('التنبيه التجريبي موجود بالفعل؛ يمكنك تجربة تنبيه آخر بعد دقيقة.'));
      }catch(error){if(current()){uiLocale.setMessage(feedback, error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر إنشاء التنبيه التجريبي. حاول مرة أخرى.'));button.disabled=false}}
    });
    try{
      const notifications=inAppNotifications(await request('/notifications',{method:'GET'}));
      if(!current())return;
      if(refreshVersion===notificationRefreshVersion)updateNotificationIndicators(notificationCount(notifications));
      list.setAttribute('aria-busy','false');
      uiLocale.setHTML(list, notifications.length?notifications.map(item=>{
        const unread=Boolean(item.status&&item.status!=='READ'),isTest=item.type==='SAFETY_TEST';
        const payload=item.payload&&typeof item.payload==='object'?item.payload:{};
        const title=notificationText(payload.title)||uiLocale.t(notificationTitles[item.type])||uiLocale.t('إشعار من HYDROLAND');
        const message=notificationText(payload.message),details=notificationSummary(payload);
        return uiLocale.html`<article class="hl-account-card hl-notification ${unread?'unread':''} ${isTest?'hl-notification-test':''}" data-notification-id="${esc(item.id)}">${isTest?uiLocale.html`<span class="hl-notification-test-label">تجريبي · حسابك فقط</span>`:''}<div class="hl-account-card-head"><div><h3>${esc(title)}</h3><p>${esc(formatDate(item.createdAt))}</p></div><span class="hl-status ${unread?'pending':'read'}">${uiLocale.label(unread?'جديد':'مقروء')}</span></div>${message?uiLocale.html`<p class="hl-notification-message">${esc(message)}</p>`:''}${details?uiLocale.html`<small>${esc(details)}</small>`:''}${item.type==='ORGANIZATION_INVITATION'&&notificationText(payload.organizationId)?uiLocale.html`<div class="hl-account-actions"><button type="button" data-view-invitation>عرض دعوة الانضمام</button></div><div data-invitation-detail aria-live="polite"></div>`:''}${isTest?uiLocale.html`<p class="hl-notification-test-note">هذا اختبار لظهور التنبيهات، وليس بلاغًا عن خطر فعلي.</p>`:''}${unread?uiLocale.html`<div class="hl-account-actions"><button type="button" data-mark-read>تحديد كمقروء</button></div>`:''}</article>`;
      }).join(''):uiLocale.html`<div class="hl-account-empty">لا توجد إشعارات جديدة.</div>`);
      list.querySelectorAll('[data-view-invitation]').forEach(button=>button.addEventListener('click',async()=>{
        const card=button.closest('[data-notification-id]'),item=notifications.find(row=>row.id===card?.dataset.notificationId),payload=item?.payload||{},detail=card?.querySelector('[data-invitation-detail]');
        const live=()=>current()&&card?.isConnected;
        if(!detail||!live()||button.disabled)return;button.disabled=true;uiLocale.setText(detail, ...['جارٍ التحقق من الدعوة...']);
        try{
          const memberships=await request('/organizations/mine');if(!live())return;
          if(!Array.isArray(memberships))throw localError(uiLocale.message('تعذر قراءة الدعوة. أعد المحاولة.'));
          const member=memberships.find(row=>row.organizationId===payload.organizationId&&(!payload.memberId||row.id===payload.memberId));
          if(!member||member.status!=='PENDING'||member.role==='OWNER'||(payload.membershipUpdatedAt&&member.updatedAt!==payload.membershipUpdatedAt)){uiLocale.setText(detail, ...['هذه الدعوة لم تعد معلقة أو تم استبدالها. حدّث الإشعارات.']);return;}
          const roleLabels={ADMIN:'مدير الجهة',OPERATOR:'مسؤول تشغيل',INSTRUCTOR:'مدرب غوص',STAFF:'عضو فريق',VIEWER:'مشاهد'};
          if(!member.updatedAt||!member.organization)throw localError(uiLocale.message('بيانات الدعوة غير مكتملة.'));
          uiLocale.setHTML(detail, uiLocale.html`<p>الجهة: ${esc(member.organization.displayName)}</p><p>الدور المقترح: ${uiLocale.label(roleLabels[member.role]||'غير معروف')}</p><p>قبول الدعوة يضيف عضويتك في الجهة بهذا الدور، ولا يمنح اعتمادًا مهنيًا أو صلاحيات الإدارة العليا.</p>${member.organization.status!=='ACTIVE'?uiLocale.html`<p>قبول الدعوة متاح بعد تفعيل الجهة.</p>`:''}<div class="hl-account-actions"><button type="button" data-invitation-response="accept" ${member.organization.status!=='ACTIVE'?'disabled':''}>قبول الدعوة</button><button type="button" data-invitation-response="decline">رفض الدعوة</button></div><p data-invitation-message role="status"></p>`);
          detail.querySelectorAll('[data-invitation-response]').forEach(action=>action.addEventListener('click',async()=>{
            if(!live()||detail.dataset.busy)return;detail.dataset.busy='true';detail.querySelectorAll('button').forEach(node=>node.disabled=true);
            const accept=action.dataset.invitationResponse==='accept';
            try{
              await request('/organizations/'+encodeURIComponent(payload.organizationId)+'/membership-response',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accept,expectedUpdatedAt:member.updatedAt})});
              if(live()){uiLocale.setText(detail, ...[accept?'تم قبول الدعوة وتفعيل العضوية في الجهة.':'تم رفض الدعوة.']);document.dispatchEvent(new CustomEvent('hydroland:organization-membership-changed'));}
            }catch(error){if(live()){uiLocale.setMessage(detail.querySelector('[data-invitation-message]'), error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر الرد على الدعوة.'));detail.querySelectorAll('button').forEach(node=>node.disabled=node.dataset.invitationResponse==='accept'&&member.organization.status!=='ACTIVE')}}
            finally{delete detail.dataset.busy}
          }));
        }catch(error){if(live()){uiLocale.setMessage(detail, error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الدعوة.'));button.disabled=false}}
      }));
      list.querySelectorAll('[data-mark-read]').forEach(button=>button.addEventListener('click',async()=>{
        const id=button.closest('[data-notification-id]')?.dataset.notificationId;if(!id||!current())return;
        button.disabled=true;
        try{await request(`/notifications/${encodeURIComponent(id)}/read`,{method:'POST'});if(current())await renderNotifications()}
        catch(error){if(current()){uiLocale.setMessage(feedback, error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحديث الإشعار'));button.disabled=false}}
      }));
    }catch(error){
      if(!current())return;
      list.setAttribute('aria-busy','false');
      uiLocale.setHTML(list, uiLocale.html`<div class="hl-account-error" role="alert">${uiLocale.messageHTML(error instanceof Error?localErrorMessage(error):uiLocale.message('تعذر تحميل الإشعارات'))}</div><div class="hl-account-actions"><button type="button" data-notification-retry>إعادة المحاولة</button></div>`);
      list.querySelector('[data-notification-retry]').addEventListener('click',()=>renderNotifications());
    }
  };
  const bind=()=>{const nextTrip=document.querySelector('.mobile-welcome button');if(nextTrip&&!nextTrip.dataset.hlBound){nextTrip.dataset.hlBound='1';nextTrip.removeAttribute('data-toast');nextTrip.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();renderBookings()},true)}document.querySelectorAll('.profile-list button').forEach(button=>{const label=button.textContent||'';if(label.includes('الإشعارات')&&!button.dataset.hlBound){button.dataset.hlBound='1';button.removeAttribute('data-toast');button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();document.getElementById('profile-dialog')?.close();renderNotifications()},true)}});const notificationsButton=document.getElementById('top-notifications');if(notificationsButton){notificationsButton.hidden=!Boolean(auth()?.isAuthenticated?.());if(!notificationsButton.dataset.hlBound){notificationsButton.dataset.hlBound='1';uiLocale.setAttribute(notificationsButton, "aria-label", ...['فتح الإشعارات']);notificationsButton.addEventListener('click',event=>{event.preventDefault();renderNotifications()})}}updateNotificationIndicators(auth()?.isAuthenticated?.()?notificationUnreadCount:0);if(auth()?.isAuthenticated?.())void refreshNotificationIndicators();const profileList=document.querySelector('.profile-list');if(profileList&&!profileList.querySelector('[data-hl-bookings]')){const bookings=document.createElement('button');bookings.dataset.hlBookings='1';uiLocale.setHTML(bookings, uiLocale.html`<span>⌖</span>حجوزاتي <b>←</b>`);bookings.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();renderBookings()});profileList.prepend(bookings)}if(profileList&&!profileList.querySelector('[data-hl-rentals]')){const rentals=document.createElement('button');rentals.dataset.hlRentals='1';uiLocale.setHTML(rentals, uiLocale.html`<span>▣</span>إيجاراتي <b>←</b>`);rentals.addEventListener('click',()=>{document.getElementById('profile-dialog')?.close();renderRentals()});profileList.prepend(rentals)}};
  const clearNotificationState=()=>{notificationRefreshVersion++;notificationViewVersion++;updateNotificationIndicators(0);const dialog=document.getElementById('hl-notifications-dialog');dialog?.close();dialog?.querySelector('.hl-account-body')?.replaceChildren()};
  const clearRentalState=()=>{rentalViewVersion++;const rentals=document.getElementById('hl-rentals-dialog');rentals?.close();rentals?.querySelector('.hl-account-body')?.replaceChildren()};
  document.addEventListener('hydroland:session-cleared',()=>{clearNotificationState();clearRentalState()});
  document.addEventListener('hydroland:auth-changed',()=>{const version=auth()?.getSessionVersion?.();if(version!==notificationSessionVersion||!auth()?.isAuthenticated?.()){clearNotificationState();clearRentalState()}notificationSessionVersion=version;bind()});bind();
  const indicatorObserver=new MutationObserver(()=>updateNotificationIndicators(notificationUnreadCount));indicatorObserver.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshNotificationIndicators()});setInterval(()=>{if(document.visibilityState==='visible')void refreshNotificationIndicators()},60000);
  let rentalReturnBusy=false;
  const resumeRentalPayment=async()=>{
    const url=new URL(window.location.href),rentalId=url.searchParams.get('rental_id');
    if(rentalReturnBusy||!url.searchParams.has('rental_payment')||!rentalId||rentalId.length>128||!auth()?.isAuthenticated?.())return;
    const current=notificationSession();rentalReturnBusy=true;
    try{
      await renderRentals();if(!current())return;
      const card=[...document.querySelectorAll('#hl-rentals-dialog [data-rental-id]')].find(node=>node.dataset.rentalId===rentalId);
      const detail=card?.querySelector('[data-rental-payment-detail]');
      if(detail)await refreshRentalPayment(rentalId,detail);
      // The return query is navigation only; the verified GET decides the status.
      if(current()){url.searchParams.delete('rental_id');url.searchParams.delete('rental_payment');history.replaceState(null,'',url.pathname+url.search+url.hash);}
    }catch(error){if(current())toast(localErrorMessage(error,'تعذر تحديث حالة الدفع'));}
    finally{rentalReturnBusy=false;}
  };
  document.addEventListener('hydroland:auth-changed',()=>{void resumeRentalPayment()});
  void resumeRentalPayment();
  window.HydrolandAccountCenter={openBookings:renderBookings,openRentals:renderRentals,openNotifications:renderNotifications,refreshNotifications:refreshNotificationIndicators};
})();
