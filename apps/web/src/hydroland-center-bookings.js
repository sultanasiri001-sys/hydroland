(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-bookings", {
  "مؤكد": "Confirmed",
  "بانتظار التأكيد": "Awaiting confirmation",
  "مؤهل": "Eligible",
  "إعادة المحاولة": "Try again",
  "مسترد": "Refunded",
  "ملغى": "Cancelled",
  "غير منشورة": "Unpublished",
  "مفتوحة للحجز": "Open for booking",
  "مغلقة للحجز": "Closed for booking",
  "مكتملة": "Completed",
  "غير مؤهل": "Not eligible",
  "مدفوع": "Paid",
  "بدأ الدفع": "Payment started",
  "فشل الدفع": "Payment failed",
  "محجوز ماليًا": "Payment authorized",
  "تحتاج إلى مراجعة": "Needs review",
  "حدث الرحلة في التقويم غير موجود أو غير نشط.": "The trip calendar event is missing or inactive.",
  "موعد حدث التقويم لا يطابق موعد الرحلة.": "The calendar event time does not match the trip time.",
  "أحد موارد الرحلة غير نشط.": "One of the trip resources is inactive.",
  "موعد تخصيص الموارد لا يطابق موعد الرحلة.": "The resource allocation time does not match the trip time.",
  "لم يُخصص المورد المطلوب لنوع الرحلة.": "The resource required for this trip type has not been allocated.",
  "يوجد تعارض في حجز مورد للرحلة.": "A trip resource booking conflicts with another booking.",
  "عدد المشاركين لا يطابق المقاعد.": "The participant count does not match the seats.",
  "أهلية المشاركين تحتاج مراجعة الجهة المخولة.": "Participant eligibility needs review by the authorized party.",
  "قرار السلامة بالموافقة غير متوفر.": "An approving safety decision is unavailable.",
  "المقاعد المؤكدة تتجاوز سعة الرحلة.": "Confirmed seats exceed trip capacity.",
  "سعر الرحلة غير محدد أو غير صالح.": "The trip price is missing or invalid.",
  "لم يكتمل دفع المبلغ المطلوب.": "Payment of the required amount is incomplete.",
  "الطقس يحتاج تحديثًا وموافقة تشغيلية.": "Weather data needs updating and operational approval.",
  "الحجز ليس بانتظار التأكيد أو أن موعد الرحلة أو حالتها يمنع التأكيد.": "The booking is not awaiting confirmation, or the trip time or status prevents confirmation.",
  "توجد ملاحظة تحتاج إلى مراجعة.": "An issue needs review.",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "إدارة الحجوزات": "Manage bookings",
  "حجوزات رحلات المركز، ومراجعة المشاركين وشروط التأكيد.": "Center trip bookings, participant reviews and confirmation requirements.",
  "العميل أو الرحلة أو رقم الحجز": "Customer, trip or booking number",
  "حالة الحجز": "Booking status",
  "جميع الحجوزات": "All bookings",
  "بحث": "Search",
  "مسح البحث": "Clear search",
  "تحديث القائمة": "Refresh list",
  "جارٍ تحميل الحجوزات…": "Loading bookings…",
  "لا تملك صلاحية إدارة حجوزات المركز.": "You do not have permission to manage this center's bookings.",
  "تعذر تحميل الحجوزات.": "Could not load bookings.",
  "استجابة الحجوزات غير مكتملة.": "The booking response is incomplete.",
  "عدد الحجوزات المطابقة:": "Matching bookings:",
  "ضمن البحث الحالي:": "Within the current search:",
  "{0}: {1} حجز / {2} مقعد": "{0}: {1} bookings / {2} seats",
  "مقعد": "seats",
  "رقم الحجز:": "Booking number:",
  "موعد الرحلة:": "Trip date:",
  "— توقيت الرياض": "— Riyadh time",
  "تفاصيل الحجز": "Booking details",
  "عميل": "Customer",
  "رحلة": "Trip",
  "لا توجد حجوزات مطابقة للبحث.": "No bookings match this search.",
  "صفحات الحجوزات": "Booking pages",
  "السابق": "Previous",
  "صفحة": "Page",
  "من": "of",
  "التالي": "Next",
  "تأكيد الحجز": "Confirm booking",
  "إلغاء الحجز": "Cancel booking",
  "سبب الإلغاء": "Cancellation reason",
  "أفهم أن إلغاء الحجز لا يعيد المبلغ تلقائيًا، ويلزم متابعة الاسترداد ماليًا.": "I understand that cancellation does not automatically refund payment. Any refund must be followed up through finance.",
  "راجعت ملاحظات السياسات المسموح بمتابعتها تحت المراجعة.": "I reviewed the policy notes that allow processing to continue under review.",
  "حفظ إلغاء الحجز": "Save booking cancellation",
  "جارٍ تحميل تفاصيل الحجز…": "Loading booking details…",
  "إغلاق التفاصيل": "Close details",
  "الحجز غير موجود ضمن المركز.": "This booking was not found within the center.",
  "لا تملك صلاحية عرض هذا الحجز.": "You do not have permission to view this booking.",
  "تعذر تحميل تفاصيل الحجز.": "Could not load booking details.",
  "تفاصيل الحجز غير مكتملة.": "Booking details are incomplete.",
  "حجز": "Booking",
  "تحديث التفاصيل": "Refresh details",
  "المقاعد المؤكدة للرحلة:": "Confirmed trip seats:",
  "· المتبقية للتأكيد:": "· Remaining for confirmation:",
  "المشاركون": "Participants",
  "حالة الدفع": "Payment status",
  "المبلغ المطلوب:": "Required amount:",
  "ريال ·": "SAR ·",
  "حجز موارد الرحلة في التقويم": "Trip resource reservation in the calendar",
  "تخصيص نشط": "active allocations",
  "موارد الرحلة محجوزة في موعدها": "Trip resources are reserved for the scheduled time",
  "حجز موارد الرحلة يحتاج مراجعة": "The trip resource reservation needs review",
  "لم تُسجّل بيانات المشاركين.": "Participant details have not been recorded.",
  "شرط الدفع مستوفى": "Payment requirement satisfied",
  "شرط الدفع غير مستوفى": "Payment requirement not satisfied",
  "عملية": "transactions",
  "لا توجد عمليات دفع مسجلة.": "No payment transactions recorded.",
  "أسباب منع التأكيد": "Reasons preventing confirmation",
  "ملاحظات السياسات": "Policy notes",
  "آخر إجراء:": "Last action:",
  "لا توجد إجراءات متاحة لهذا الحجز في حالته الحالية.": "No actions are available for this booking in its current status.",
  "إعادة تحميل التفاصيل": "Reload details",
  "جارٍ حفظ الإجراء…": "Saving action…",
  "تغيرت بيانات الحجز.": "The booking details have changed.",
  "تعذر حفظ الإجراء.": "Could not save the action.",
  "تم تأكيد الحجز.": "Booking confirmed.",
  "تم حفظ إلغاء الحجز. تابع أي استرداد عبر الإجراءات المالية.": "Booking cancellation saved. Follow up any refund through the financial workflow.",
  "تعذر حفظ الإجراء. يمكنك إعادة المحاولة.": "Could not save the action. You can try again."
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  // Local labels retain identity; unknown API values remain plain text.
  const authoredStatus=(v)=>((value=>value?uiLocale.message(value):value)({PENDING:'بانتظار التأكيد',CONFIRMED:'مؤكد',CANCELLED:'ملغى',DRAFT:'غير منشورة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',COMPLETED:'مكتملة',ELIGIBLE:'مؤهل',REJECTED:'غير مؤهل',CAPTURED:'مدفوع',CREATED:'بدأ الدفع',FAILED:'فشل الدفع',REFUNDED:'مسترد',AUTHORIZED:'محجوز ماليًا'}[v]) || uiLocale.message('تحتاج إلى مراجعة'));
  const authoredIssue=(v)=>((value=>value?uiLocale.message(value):value)({CALENDAR_EVENT_MISSING_OR_INACTIVE:'حدث الرحلة في التقويم غير موجود أو غير نشط.',CALENDAR_TIME_MISMATCH:'موعد حدث التقويم لا يطابق موعد الرحلة.',CALENDAR_RESOURCE_INACTIVE:'أحد موارد الرحلة غير نشط.',CALENDAR_ALLOCATION_TIME_MISMATCH:'موعد تخصيص الموارد لا يطابق موعد الرحلة.',CALENDAR_REQUIRED_RESOURCE_MISSING:'لم يُخصص المورد المطلوب لنوع الرحلة.',CALENDAR_RESOURCE_CONFLICT:'يوجد تعارض في حجز مورد للرحلة.',PARTICIPANT_COUNT_MISMATCH:'عدد المشاركين لا يطابق المقاعد.',PARTICIPANT_ELIGIBILITY_PENDING:'أهلية المشاركين تحتاج مراجعة الجهة المخولة.',SAFETY_APPROVAL:'قرار السلامة بالموافقة غير متوفر.',CAPACITY_LIMIT:'المقاعد المؤكدة تتجاوز سعة الرحلة.',PRICE_NOT_CONFIGURED:'سعر الرحلة غير محدد أو غير صالح.',PAYMENT_REQUIRED:'لم يكتمل دفع المبلغ المطلوب.',WEATHER_GATE:'الطقس يحتاج تحديثًا وموافقة تشغيلية.',BOOKING_NOT_PENDING_OR_TRIP_CLOSED:'الحجز ليس بانتظار التأكيد أو أن موعد الرحلة أو حالتها يمنع التأكيد.'}[v]) || uiLocale.message('توجد ملاحظة تحتاج إلى مراجعة.'));

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,version=0,detailVersion=0,selected=null,filters={q:'',status:'ALL',page:1};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const date=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}):'—';
 const count=v=>Number.isSafeInteger(v)&&v>=0?v:0;
 const status=v=>({PENDING:'بانتظار التأكيد',CONFIRMED:'مؤكد',CANCELLED:'ملغى',DRAFT:'غير منشورة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',COMPLETED:'مكتملة',ELIGIBLE:'مؤهل',REJECTED:'غير مؤهل',CAPTURED:'مدفوع',CREATED:'بدأ الدفع',FAILED:'فشل الدفع',REFUNDED:'مسترد',AUTHORIZED:'محجوز ماليًا'}[v]||'تحتاج إلى مراجعة');
 const issue=v=>({CALENDAR_EVENT_MISSING_OR_INACTIVE:'حدث الرحلة في التقويم غير موجود أو غير نشط.',CALENDAR_TIME_MISMATCH:'موعد حدث التقويم لا يطابق موعد الرحلة.',CALENDAR_RESOURCE_INACTIVE:'أحد موارد الرحلة غير نشط.',CALENDAR_ALLOCATION_TIME_MISMATCH:'موعد تخصيص الموارد لا يطابق موعد الرحلة.',CALENDAR_REQUIRED_RESOURCE_MISSING:'لم يُخصص المورد المطلوب لنوع الرحلة.',CALENDAR_RESOURCE_CONFLICT:'يوجد تعارض في حجز مورد للرحلة.',PARTICIPANT_COUNT_MISMATCH:'عدد المشاركين لا يطابق المقاعد.',PARTICIPANT_ELIGIBILITY_PENDING:'أهلية المشاركين تحتاج مراجعة الجهة المخولة.',SAFETY_APPROVAL:'قرار السلامة بالموافقة غير متوفر.',CAPACITY_LIMIT:'المقاعد المؤكدة تتجاوز سعة الرحلة.',PRICE_NOT_CONFIGURED:'سعر الرحلة غير محدد أو غير صالح.',PAYMENT_REQUIRED:'لم يكتمل دفع المبلغ المطلوب.',WEATHER_GATE:'الطقس يحتاج تحديثًا وموافقة تشغيلية.',BOOKING_NOT_PENDING_OR_TRIP_CLOSED:'الحجز ليس بانتظار التأكيد أو أن موعد الرحلة أو حالتها يمنع التأكيد.'}[v]||'توجد ملاحظة تحتاج إلى مراجعة.');
 const money=v=>Number.isSafeInteger(v)?(v/100).toFixed(2):'—';
 const clear=()=>{version++;detailVersion++;section?.remove();section=null;selected=null;filters={q:'',status:'ALL',page:1}};
 const alive=(host,v,s)=>host===section&&host.isConnected&&v===version&&s===auth()?.getSessionVersion?.();
 const current=(host,v,s)=>alive(host,v,s)&&eligible();
 async function authorize(host,v,s,extra=()=>true){const isCurrent=()=>alive(host,v,s)&&extra();if(typeof access()?.authorizeRole!=='function'){if(isCurrent())clear();return false}const ok=await access().authorizeRole('center',{sessionVersion:s,isCurrent});if(!ok||!current(host,v,s)||!extra()){if(isCurrent())clear();return false}return true}
 const close=()=>{detailVersion++;selected=null;const box=section?.querySelector('[data-booking-detail]');if(box){delete box.dataset.busy;box.hidden=true;box.replaceChildren()}};
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.id='hl-center-bookings';host.className='hl-center-bookings';host.hidden=true;
   uiLocale.setHTML(host, uiLocale.html`<header><small>DIVE CENTER · مركز الغوص</small><h2>إدارة الحجوزات</h2><p>حجوزات رحلات المركز، ومراجعة المشاركين وشروط التأكيد.</p></header><form data-booking-search><label>العميل أو الرحلة أو رقم الحجز<input type="search" name="q" maxlength="120"></label><label><span id="hl-center-booking-status-label">حالة الحجز</span><select name="status" aria-labelledby="hl-center-booking-status-label"><option value="ALL">جميع الحجوزات</option><option value="PENDING">بانتظار التأكيد</option><option value="CONFIRMED">مؤكد</option><option value="CANCELLED">ملغى</option></select></label><button type="submit">بحث</button><button type="button" data-booking-reset>مسح البحث</button><button type="button" data-booking-reload>تحديث القائمة</button></form><div data-booking-list aria-live="polite"></div><section data-booking-detail hidden aria-live="polite"></section>`);
   host.addEventListener('submit',event=>{if(event.target.matches('[data-booking-search]')){event.preventDefault();const data=new FormData(event.target);filters={q:String(data.get('q')||'').trim(),status:String(data.get('status')||'ALL'),page:1};void open()}else if(event.target.matches('[data-booking-action]')){event.preventDefault();void save(event.target)}});
   host.addEventListener('click',event=>{const b=event.target.closest?.('button');if(!b||b.disabled)return;if(b.hasAttribute('data-booking-reset')){filters={q:'',status:'ALL',page:1};void open()}else if(b.hasAttribute('data-booking-reload'))void open();else if(b.hasAttribute('data-booking-close'))close();else if(b.hasAttribute('data-booking-open')){selected={id:b.dataset.bookingOpen};void detail()}else if(b.hasAttribute('data-booking-detail-reload'))void detail();else if(b.hasAttribute('data-booking-page')){const page=Number(b.dataset.bookingPage);if(Number.isSafeInteger(page)&&page>0){filters.page=page;void open()}}});
   section=host;document.getElementById('main')?.append(host);return host;
 }
 async function open(notice='',reopenId=null){
   if(!eligible()){clear();return}
   const host=ensure(),v=++version,s=auth().getSessionVersion?.(),list=host.querySelector('[data-booking-list]');close();host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);host.querySelector('[name=q]').value=filters.q;host.querySelector('[name=status]').value=filters.status;
   list.setAttribute('aria-busy','true');uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل الحجوزات…</p>`);
   try{
     if(!await authorize(host,v,s))return;
     const response=await auth().authorizedFetch('/center/me/bookings?'+new URLSearchParams({...filters,page:String(filters.page),pageSize:'20'})),data=await response.json().catch(()=>null);if(!current(host,v,s))return;
     if(!response.ok)throw (response.status===403?localError('لا تملك صلاحية إدارة حجوزات المركز.'):(value=>value?new Error(value):localError('تعذر تحميل الحجوزات.'))(data?.message));
     if(!data||!Array.isArray(data.items)||data.items.some(r=>typeof r.id!=='string')||!Number.isSafeInteger(data.total)||!Number.isSafeInteger(data.page)||data.page<1||!Number.isSafeInteger(data.totalPages)||data.totalPages<data.page||!Array.isArray(data.counts))throw localError('استجابة الحجوزات غير مكتملة.');
     filters.page=data.page;
     uiLocale.setHTML(list, (notice?uiLocale.html`<p role="status">${uiLocale.messageHTML(notice)}</p>`:'')+uiLocale.html`<p data-booking-count>عدد الحجوزات المطابقة: ${count(data.total)}</p><p>ضمن البحث الحالي: ${data.counts.map(r=>uiLocale.messageHTML(uiLocale.message("{0}: {1} حجز / {2} مقعد", [authoredStatus(r.status), count(r.count), count(r.seats)]))).join(' · ')}</p>`+(data.items.length?data.items.map(row=>uiLocale.html`<article class="hl-course" data-center-booking="${esc(row.id)}"><div class="hl-course-top"><b>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('عميل')))(row.customerName)}</b><span>${uiLocale.messageHTML(authoredStatus(row.status))}</span></div><p>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('رحلة')))(row.trip?.title)} · ${count(row.seats)} مقعد</p><small>رقم الحجز: ${esc(row.id)}<br>موعد الرحلة: ${esc(date(row.trip?.startsAt))} — توقيت الرياض</small><p><button type="button" data-booking-open="${esc(row.id)}">تفاصيل الحجز</button></p></article>`).join(''):uiLocale.html`<p>لا توجد حجوزات مطابقة للبحث.</p>`)+(data.totalPages>1?uiLocale.html`<nav class="hl-booking-pager" aria-label="صفحات الحجوزات"><button type="button" data-booking-page="${data.page-1}" ${data.page===1?'disabled':''}>السابق</button><span>صفحة ${data.page} من ${data.totalPages}</span><button type="button" data-booking-page="${data.page+1}" ${data.page===data.totalPages?'disabled':''}>التالي</button></nav>`:''));
     if(reopenId){selected={id:reopenId};await detail()}
   }catch(error){if(current(host,v,s))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${localErrorHTML(error, 'تعذر تحميل الحجوزات.')}</p><button type="button" data-booking-reload>إعادة المحاولة</button>`)}
   finally{if(current(host,v,s))list.removeAttribute('aria-busy')}
 }
 const form=(data,action)=>uiLocale.html`<form data-booking-action="${action}" data-state="${esc(data.stateToken)}" data-request-id="${crypto.randomUUID()}"><h4>${uiLocale.messageHTML((action==='CONFIRM'?uiLocale.message('تأكيد الحجز'):uiLocale.message('إلغاء الحجز')))}</h4>${(action==='CANCEL'?uiLocale.html`<label>سبب الإلغاء<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label><label class="hl-booking-check"><input name="financialAcknowledged" type="checkbox" required>أفهم أن إلغاء الحجز لا يعيد المبلغ تلقائيًا، ويلزم متابعة الاسترداد ماليًا.</label>`:(data.policyReview?.required?uiLocale.html`<label class="hl-booking-check"><input name="policyReviewAcknowledged" type="checkbox" required>راجعت ملاحظات السياسات المسموح بمتابعتها تحت المراجعة.</label>`:''))}<button type="submit">${uiLocale.messageHTML((action==='CONFIRM'?uiLocale.message('تأكيد الحجز'):uiLocale.message('حفظ إلغاء الحجز')))}</button><p data-booking-feedback role="status"></p></form>`;
 async function detail(){
   if(!selected||!section||!eligible())return;
   const host=section,v=version,d=++detailVersion,s=auth().getSessionVersion?.(),id=selected.id,box=host.querySelector('[data-booking-detail]'),active=()=>current(host,v,s)&&d===detailVersion;
   delete box.dataset.busy;box.hidden=false;box.setAttribute('aria-busy','true');uiLocale.setHTML(box, uiLocale.html`<p>جارٍ تحميل تفاصيل الحجز…</p><button type="button" data-booking-close>إغلاق التفاصيل</button>`);
   try{
     if(!await authorize(host,v,s,()=>d===detailVersion))return;
     const response=await auth().authorizedFetch('/center/me/bookings/'+encodeURIComponent(id)),data=await response.json().catch(()=>null);if(!active())return;
     if(!response.ok)throw (response.status===404?localError('الحجز غير موجود ضمن المركز.'):(response.status===403?localError('لا تملك صلاحية عرض هذا الحجز.'):(value=>value?new Error(value):localError('تعذر تحميل تفاصيل الحجز.'))(data?.message)));
     if(data?.booking?.id!==id||typeof data.stateToken!=='string'||!Array.isArray(data.participants)||!Array.isArray(data.financial)||!Array.isArray(data.blockers)||!Array.isArray(data.actions))throw localError('تفاصيل الحجز غير مكتملة.');
     const row=data.booking;
     uiLocale.setHTML(box, uiLocale.html`<header><h3>حجز ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('عميل')))(row.customerName)}</h3><button type="button" data-booking-close>إغلاق التفاصيل</button><button type="button" data-booking-detail-reload>تحديث التفاصيل</button></header><p>رقم الحجز: ${esc(id)} · ${uiLocale.messageHTML(authoredStatus(row.status))} · ${count(row.seats)} مقعد</p><p>${esc(row.trip?.title)} · ${uiLocale.messageHTML(authoredStatus(row.trip?.status))}<br>${esc(date(row.trip?.startsAt))} — توقيت الرياض</p><p>المقاعد المؤكدة للرحلة: ${count(data.confirmedSeats)} · المتبقية للتأكيد: ${count(data.remainingSeats)}</p>${(data.calendarReservation?uiLocale.html`<h4>حجز موارد الرحلة في التقويم</h4><p>${uiLocale.messageHTML((data.calendarReservation.status==='RESERVED'?uiLocale.message('موارد الرحلة محجوزة في موعدها'):uiLocale.message('حجز موارد الرحلة يحتاج مراجعة')))} · ${count(data.calendarReservation.activeAllocationCount)} تخصيص نشط</p>${(Array.isArray(data.calendarReservation.issues)&&data.calendarReservation.issues.length?uiLocale.html`<ul>${data.calendarReservation.issues.map(c=>uiLocale.html`<li>${uiLocale.messageHTML(authoredIssue(c))}</li>`).join('')}</ul>`:'')}`:'')}<h4>المشاركون</h4>${(data.participants.length?uiLocale.html`<ul>${data.participants.map(p=>uiLocale.html`<li>${esc(p.fullName)} — ${uiLocale.messageHTML(authoredStatus(p.eligibilityStatus))}${(p.certificationTitle?' · '+esc(p.certificationTitle):'')}</li>`).join('')}</ul>`:uiLocale.html`<p>لم تُسجّل بيانات المشاركين.</p>`)}<h4>حالة الدفع</h4><p>المبلغ المطلوب: ${money(data.requiredAmountMinor)} ريال · ${uiLocale.messageHTML((data.paymentSatisfied?uiLocale.message('شرط الدفع مستوفى'):uiLocale.message('شرط الدفع غير مستوفى')))}</p>${(data.financial.length?data.financial.map(p=>uiLocale.html`<p>${uiLocale.messageHTML(authoredStatus(p.status))}: ${money(p.amountMinor)} ${esc(p.currency)} · ${count(p.count)} عملية</p>`).join(''):uiLocale.html`<p>لا توجد عمليات دفع مسجلة.</p>`)}${(data.blockers.length&&row.status==='PENDING'?uiLocale.html`<h4>أسباب منع التأكيد</h4><ul>${data.blockers.map(c=>uiLocale.html`<li>${uiLocale.messageHTML(authoredIssue(c))}</li>`).join('')}</ul>`:'')}${(data.policyReview?.required?uiLocale.html`<h4>ملاحظات السياسات</h4><ul>${data.policyReview.issues.map(c=>uiLocale.html`<li>${uiLocale.messageHTML(authoredIssue(c))}</li>`).join('')}</ul>`:'')}${(data.lastAction?uiLocale.html`<p>آخر إجراء: ${(value=>value?esc(value):uiLocale.messageHTML(authoredStatus(row.status)))(data.lastAction.reason)} · ${esc(date(data.lastAction.occurredAt))}</p>`:'')}${data.actions.filter(a=>['CONFIRM','CANCEL'].includes(a)).map(a=>form(data,a)).join('')}${(data.actions.length?'':uiLocale.html`<p>لا توجد إجراءات متاحة لهذا الحجز في حالته الحالية.</p>`)}`);
     box.scrollIntoView({block:'nearest'});
   }catch(error){if(active())uiLocale.setHTML(box, uiLocale.html`<p role="alert">${localErrorHTML(error, 'تعذر تحميل تفاصيل الحجز.')}</p><button type="button" data-booking-detail-reload>إعادة تحميل التفاصيل</button><button type="button" data-booking-close>إغلاق التفاصيل</button>`)}
   finally{if(active())box.removeAttribute('aria-busy')}
 }
 async function save(form){
   if(!selected||form.dataset.busy)return;
   const host=section,v=version,d=detailVersion,s=auth().getSessionVersion?.(),id=selected.id,feedback=form.querySelector('[data-booking-feedback]'),box=host.querySelector('[data-booking-detail]'),active=()=>current(host,v,s)&&d===detailVersion&&form.isConnected;
   if(box.dataset.busy)return;
   const fields=new FormData(form),body={action:form.dataset.bookingAction,requestId:form.dataset.requestId,expectedState:form.dataset.state,...(fields.has('reason')?{reason:String(fields.get('reason')).trim(),financialAcknowledged:fields.get('financialAcknowledged')==='on'}:{}),...(fields.has('policyReviewAcknowledged')?{policyReviewAcknowledged:true}:{})};
   const serialized=JSON.stringify(body);if(form.dataset.lastBody&&form.dataset.lastBody!==serialized){body.requestId=crypto.randomUUID();form.dataset.requestId=body.requestId}form.dataset.lastBody=JSON.stringify(body);
   form.dataset.busy='true';box.dataset.busy='true';box.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ الإجراء…'));
   try{
     if(!await authorize(host,v,s,()=>d===detailVersion))return;
     const response=await auth().authorizedFetch('/center/me/bookings/'+encodeURIComponent(id)+'/actions',{method:'POST',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!active())return;
     if(!response.ok){if(response.status===409){form.dataset.stale='true';uiLocale.setHTML(feedback, uiLocale.html`${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('تغيرت بيانات الحجز.')))(data?.message)} <button type="button" data-booking-detail-reload>تحديث التفاصيل</button>`)}else throw (value=>value?new Error(value):localError('تعذر حفظ الإجراء.'))(data?.message);return}
     document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed'));await open((body.action==='CONFIRM'?uiLocale.message('تم تأكيد الحجز.'):uiLocale.message('تم حفظ إلغاء الحجز. تابع أي استرداد عبر الإجراءات المالية.')), id);
   }catch(error){if(active())setLocalErrorText(feedback, error, 'تعذر حفظ الإجراء. يمكنك إعادة المحاولة.')}
   finally{delete form.dataset.busy;if(active()){delete box.dataset.busy;box.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=false);if(form.dataset.stale)form.querySelector('[type=submit]').disabled=true}}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 const search=q=>{if(typeof q!=='string'||!q.trim()||q.trim().length>120)return;filters={q:q.trim(),status:'ALL',page:1};return open()};
 window.HydrolandCenterBookings=Object.freeze({open,search});
})();
