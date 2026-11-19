(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-operations", {
  "مؤكد": "Confirmed",
  "بانتظار التأكيد": "Awaiting confirmation",
  "مؤهل": "Eligible",
  "تعذر تحميل الحجوزات": "Could not load bookings",
  "عدد المقاعد": "Number of seats",
  "رحلة بحرية": "Marine trip",
  "إعادة المحاولة": "Try again",
  "ملغى": "Cancelled",
  "مفتوحة للحجز": "Open for booking",
  "مغلقة للحجز": "Closed for booking",
  "مكتملة": "Completed",
  "غير مؤهل": "Not eligible",
  "تحتاج إلى مراجعة": "Needs review",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "جارٍ تحميل الحجوزات…": "Loading bookings…",
  "مقعد": "seats",
  "عميل": "Customer",
  "حجز": "Booking",
  "المشاركون": "Participants",
  "غير معروفة": "Unknown",
  "محفوظة — غير منشورة": "Saved — unpublished",
  "ملغاة": "Cancelled",
  "بانتظار مراجعة الأهلية": "Awaiting eligibility review",
  "غوص من الشاطئ": "Shore diving",
  "عنوان الرحلة": "Trip title",
  "نوع الرحلة": "Trip type",
  "البداية — توقيت الرياض": "Start — Riyadh time",
  "النهاية — توقيت الرياض": "End — Riyadh time",
  "سعر المقعد بالريال — صفر للرحلة المجانية": "Price per seat in SAR — zero for a free trip",
  "اسم الموقع": "Location name",
  "خط العرض": "Latitude",
  "خط الطول": "Longitude",
  "تُحفظ الرحلة قبل النشر. فتح الحجز لا يُعد موافقة على السلامة أو الطقس أو تصريحًا بالتشغيل.": "The trip is saved before publication. Opening bookings is not safety or weather approval or permission to operate.",
  "حفظ الرحلة": "Save trip",
  "تعديل الرحلة": "Edit trip",
  "إضافة رحلة": "Add trip",
  "أدخل سعرًا صحيحًا بمنزلتين عشريتين كحد أقصى.": "Enter a valid price with no more than two decimal places.",
  "السعر أكبر من الحد المدعوم.": "The price exceeds the supported limit.",
  "تحقق من بيانات الرحلة.": "Check the trip details.",
  "جارٍ حفظ الرحلة…": "Saving trip…",
  "تعذر حفظ الرحلة.": "Could not save the trip.",
  "تم حفظ الرحلة. يمكنك مراجعتها ثم فتح الحجز.": "Trip saved. Review it before opening bookings.",
  "حذف مسودة الرحلة نهائيًا؟ الرحلات المرتبطة بسجلات تشغيلية لا تُحذف.": "Permanently delete the trip draft? Trips linked to operational records cannot be deleted.",
  "تعذر حذف المسودة.": "Could not delete the draft.",
  "تم حذف مسودة الرحلة.": "Trip draft deleted.",
  "فتح هذه الرحلة للحجز؟ تبقى اشتراطات السلامة والطقس سارية.": "Open bookings for this trip? Safety and weather requirements remain in effect.",
  "جارٍ فتح الحجز…": "Opening bookings…",
  "تعذر فتح الحجز.": "Could not open bookings.",
  "تم فتح الرحلة للحجز، مع استمرار تطبيق اشتراطات السلامة والطقس.": "Trip opened for booking. Safety and weather requirements remain in effect.",
  "الرحلات والحجوزات": "Trips and bookings",
  "رحلات المركز المُدار وحجوزاتها فقط.": "Only trips and bookings belonging to the managed center.",
  "لا تملك صلاحية عرض حجوزات هذه الرحلة.": "You do not have permission to view this trip's bookings.",
  "الرحلة غير موجودة ضمن المركز المُدار.": "The trip was not found within the managed center.",
  "استجابة حجوزات الرحلة غير مكتملة.": "The trip booking response is incomplete.",
  "· المشاركون:": "· Participants:",
  "تاريخ الحجز:": "Booking date:",
  "(توقيت الرياض)": "(Riyadh time)",
  "مشارك": "Participant",
  "لم تُسجّل أسماء المشاركين بعد.": "Participant names have not been recorded yet.",
  "لا توجد حجوزات لهذه الرحلة.": "No bookings for this trip.",
  "جارٍ تحميل رحلات المركز...": "Loading center trips...",
  "لا تملك صلاحية عرض رحلات هذا المركز.": "You do not have permission to view this center's trips.",
  "تعذر تحميل الرحلات": "Could not load trips",
  "استجابة رحلات المركز غير مكتملة. أعد المحاولة.": "The center trip response is incomplete. Try again.",
  "(توقيت الرياض) ·": "(Riyadh time) ·",
  "السعة:": "Capacity:",
  "· الحجوزات:": "· Bookings:",
  "عرض الحجوزات": "View bookings",
  "إجراءات الرحلة": "Trip actions",
  "رحلة المركز": "Center trip",
  "الموقع: {0} ·": "Location: {0} ·",
  "سعر المقعد: {0} ريال": "Seat price: SAR {0}",
  "السعر غير محدد": "Price not specified",
  "فتح الحجز": "Open bookings",
  "حذف المسودة": "Delete draft",
  "لا توجد رحلات مرتبطة بهذا المركز حاليًا.": "No trips are currently linked to this center.",
  "تم حفظ إجراء الرحلة وتحديث سجلاتها.": "Trip action saved and its records updated.",
  "الموقع: {0} · ": "Location: {0} · "
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  // Local labels retain identity; unknown API values remain plain text.
  const authoredTripStatus=(value)=>((value=>value?uiLocale.message(value):value)({DRAFT:'محفوظة — غير منشورة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',CANCELLED:'ملغاة',COMPLETED:'مكتملة'}[value]) || uiLocale.message('غير معروفة'));
  const authoredBookingStatus=(value)=>((value=>value?uiLocale.message(value):value)({PENDING:'بانتظار التأكيد',CONFIRMED:'مؤكد',CANCELLED:'ملغى'}[value]) || uiLocale.message('غير معروفة'));
  const authoredEligibility=(value)=>((value=>value?uiLocale.message(value):value)({PENDING:'بانتظار مراجعة الأهلية',ELIGIBLE:'مؤهل',REJECTED:'غير مؤهل'}[value]) || uiLocale.message('تحتاج إلى مراجعة'));
  const authoredTripType=(value)=>(((value=>value?uiLocale.message(value):value)({BOAT:'رحلة بحرية',SHORE:'غوص من الشاطئ'}[value]) || value) || '—');

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,viewVersion=0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})};
 const tripStatus=value=>({DRAFT:'محفوظة — غير منشورة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',CANCELLED:'ملغاة',COMPLETED:'مكتملة'}[value]||'غير معروفة');
 const bookingStatus=value=>({PENDING:'بانتظار التأكيد',CONFIRMED:'مؤكد',CANCELLED:'ملغى'}[value]||'غير معروفة');
 const eligibility=value=>({PENDING:'بانتظار مراجعة الأهلية',ELIGIBLE:'مؤهل',REJECTED:'غير مؤهل'}[value]||'تحتاج إلى مراجعة');
 const tripType=value=>({BOAT:'رحلة بحرية',SHORE:'غوص من الشاطئ'}[value]||value||'—');
 const count=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
 const localTime=value=>{const parsed=new Date(value);return value&&Number.isFinite(parsed.getTime())?new Date(parsed.getTime()+3*3600000).toISOString().slice(0,16):''};
 const editor=(row=null)=>uiLocale.html`<details class="hl-center-trip-editor"><summary>${uiLocale.messageHTML((row?uiLocale.message('تعديل الرحلة'):uiLocale.message('إضافة رحلة')))}</summary><form data-center-trip-edit data-trip-id="${esc(row?.id||'')}" data-version="${esc(row?.updatedAt||'')}" data-request-id="${row?'':crypto.randomUUID()}"><label>عنوان الرحلة<input name="title" maxlength="240" required value="${esc(row?.title||'')}"></label><label>نوع الرحلة<select name="type"><option value="BOAT" ${row?.type==='BOAT'?'selected':''}>رحلة بحرية</option><option value="SHORE" ${row?.type==='SHORE'?'selected':''}>غوص من الشاطئ</option></select></label><label>البداية — توقيت الرياض<input name="startsAt" type="datetime-local" required value="${esc(localTime(row?.startsAt))}"></label><label>النهاية — توقيت الرياض<input name="endsAt" type="datetime-local" required value="${esc(localTime(row?.endsAt))}"></label><label>عدد المقاعد<input name="capacity" type="number" min="1" step="1" max="2147483647" required value="${esc(row?.capacity??'')}"></label><label>سعر المقعد بالريال — صفر للرحلة المجانية<input name="price" type="number" min="0" step="0.01" required value="${esc(Number.isSafeInteger(row?.price?.pricePerSeatMinor)?(row.price.pricePerSeatMinor/100).toFixed(2):'')}"></label><label>اسم الموقع<input name="locationName" maxlength="240" required value="${esc(row?.location?.locationName||'')}"></label><label>خط العرض<input name="latitude" type="number" min="-90" max="90" step="any" required value="${esc(row?.location?.latitude??'')}"></label><label>خط الطول<input name="longitude" type="number" min="-180" max="180" step="any" required value="${esc(row?.location?.longitude??'')}"></label><p>تُحفظ الرحلة قبل النشر. فتح الحجز لا يُعد موافقة على السلامة أو الطقس أو تصريحًا بالتشغيل.</p><button type="submit">حفظ الرحلة</button><p data-trip-feedback role="status"></p></form></details>`;
 async function saveTrip(form){
   if(form.dataset.busy)return;
   const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),button=form.querySelector('[type=submit]'),feedback=form.querySelector('[data-trip-feedback]');
   const values=Object.fromEntries(new FormData(form));let body;
   try{const parts=values.price.split('.');if(!/^\d+(\.\d{1,2})?$/.test(values.price))throw localError('أدخل سعرًا صحيحًا بمنزلتين عشريتين كحد أقصى.');const pricePerSeatMinor=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));if(!Number.isSafeInteger(pricePerSeatMinor))throw localError('السعر أكبر من الحد المدعوم.');body={title:values.title,type:values.type,startsAt:new Date(values.startsAt+':00+03:00').toISOString(),endsAt:new Date(values.endsAt+':00+03:00').toISOString(),capacity:Number(values.capacity),pricePerSeatMinor,locationName:values.locationName,latitude:Number(values.latitude),longitude:Number(values.longitude),...(form.dataset.tripId?{expectedUpdatedAt:form.dataset.version}:{requestId:form.dataset.requestId})}}catch(error){setLocalErrorText(feedback, error, 'تحقق من بيانات الرحلة.');return}
   form.dataset.busy='true';button.disabled=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ الرحلة…'));
   try{if(!(await authorize(host,version,session)))return;const id=form.dataset.tripId,response=await auth().authorizedFetch('/center/me/trips'+(id?'/'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!current(host,version,session))return;if(!response.ok)throw (value=>value?new Error(value):localError('تعذر حفظ الرحلة.'))(data?.message);document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed'));await open(uiLocale.message('تم حفظ الرحلة. يمكنك مراجعتها ثم فتح الحجز.'))}catch(error){if(current(host,version,session))setLocalErrorText(feedback, error, 'تعذر حفظ الرحلة.')}finally{delete form.dataset.busy;button.disabled=false}
 }
 async function deleteTrip(button){
   if(button.disabled||!window.confirm(uiLocale.t('حذف مسودة الرحلة نهائيًا؟ الرحلات المرتبطة بسجلات تشغيلية لا تُحذف.')))return;
   const article=button.closest('[data-center-trip]'),host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=article.querySelector('[data-trip-publish-feedback]');button.disabled=true;
   try{if(!(await authorize(host,version,session)))return;const response=await auth().authorizedFetch('/center/me/trips/'+encodeURIComponent(article.dataset.centerTrip),{method:'DELETE',body:JSON.stringify({expectedUpdatedAt:button.dataset.version})}),data=await response.json().catch(()=>null);if(!current(host,version,session))return;if(!response.ok)throw (value=>value?new Error(value):localError('تعذر حذف المسودة.'))(data?.message);document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed'));await open(uiLocale.message('تم حذف مسودة الرحلة.'))}catch(error){if(current(host,version,session))setLocalErrorText(feedback, error, 'تعذر حذف المسودة.')}finally{button.disabled=false}
 }
 async function publishTrip(button){
   if(button.disabled||!window.confirm(uiLocale.t('فتح هذه الرحلة للحجز؟ تبقى اشتراطات السلامة والطقس سارية.')))return;
   const article=button.closest('[data-center-trip]'),host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=article.querySelector('[data-trip-publish-feedback]');button.disabled=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ فتح الحجز…'));
   try{if(!(await authorize(host,version,session)))return;const response=await auth().authorizedFetch('/center/me/trips/'+encodeURIComponent(article.dataset.centerTrip)+'/publish',{method:'POST',body:JSON.stringify({expectedUpdatedAt:button.dataset.version})}),data=await response.json().catch(()=>null);if(!current(host,version,session))return;if(!response.ok)throw (value=>value?new Error(value):localError('تعذر فتح الحجز.'))(data?.message);document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed'));await open(uiLocale.message('تم فتح الرحلة للحجز، مع استمرار تطبيق اشتراطات السلامة والطقس.'))}catch(error){if(current(host,version,session))setLocalErrorText(feedback, error, 'تعذر فتح الحجز.')}finally{button.disabled=false}
 }
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.className='hl-center-operations';host.id='hl-center-operations';host.hidden=true;
   uiLocale.setHTML(host, uiLocale.html`<header><div><small>DIVE CENTER · مركز الغوص</small><h2>الرحلات والحجوزات</h2><p>رحلات المركز المُدار وحجوزاتها فقط.</p></div></header><div data-center-ops-list aria-live="polite"></div>`);
   // The listener belongs to this instance, including after portal/session cleanup.
   host.addEventListener('click',onClick);
   host.addEventListener('submit',event=>{const form=event.target.closest?.('[data-center-trip-edit]');if(form){event.preventDefault();void saveTrip(form)}});
   section=host;document.getElementById('main')?.append(host);return host;
 }
 async function authorize(host,version,session){
   const centralized=access()?.authorizeRole;if(typeof centralized!=='function'){clear();return false}
   const valid=await centralized('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&version===viewVersion});
   if(!valid||!current(host,version,session)){if(host===section&&host.isConnected)clear();return false}return true
 }
 async function bookings(tripId,article,host,version,session){
   if(!(await authorize(host,version,session))||!article.isConnected)return;
   const response=await auth().authorizedFetch('/center/me/trips/'+encodeURIComponent(tripId)+'/bookings'),rows=await response.json().catch(()=>null);
   if(!current(host,version,session)||!article.isConnected)return;
   if(!response.ok)throw (response.status===403?localError('لا تملك صلاحية عرض حجوزات هذه الرحلة.'):(response.status===404?localError('الرحلة غير موجودة ضمن المركز المُدار.'):(value=>value?new Error(value):localError('تعذر تحميل الحجوزات'))(rows?.message)));
   if(!Array.isArray(rows))throw localError('استجابة حجوزات الرحلة غير مكتملة.');
   let box=article.querySelector('[data-bookings]');if(!box){box=document.createElement('div');box.dataset.bookings='';article.append(box)}
   uiLocale.setHTML(box, rows.length?rows.map(row=>uiLocale.html`<div class="hl-member-row" data-center-booking="${esc(row.id)}"><b>حجز ${esc(String(row.id||'').slice(0,8)||'—')}</b><span>${uiLocale.messageHTML(authoredBookingStatus(row.status))} · ${count(row.seats)} مقعد</span><small>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('عميل')))([row.account?.person?.firstName,row.account?.person?.lastName].filter(Boolean).join(' ').trim())} · المشاركون: ${(Array.isArray(row.participants)?row.participants.length:0)}</small><small>تاريخ الحجز: ${esc(date(row.createdAt))} (توقيت الرياض)</small>${(Array.isArray(row.participants)&&row.participants.length?uiLocale.html`<ul aria-label="المشاركون">${row.participants.map(person=>uiLocale.html`<li>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('مشارك')))(person.fullName)} — ${uiLocale.messageHTML(authoredEligibility(person.eligibilityStatus))}</li>`).join('')}</ul>`:uiLocale.html`<p>لم تُسجّل أسماء المشاركين بعد.</p>`)}</div>`).join(''):uiLocale.html`<p>لا توجد حجوزات لهذه الرحلة.</p>`);
 }
 async function open(notice=''){
   if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-ops-list]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل رحلات المركز...</p>`);
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/trips'),rows=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok)throw (response.status===403?localError('لا تملك صلاحية عرض رحلات هذا المركز.'):(value=>value?new Error(value):localError('تعذر تحميل الرحلات'))(rows?.message));
     if(!Array.isArray(rows))throw localError('استجابة رحلات المركز غير مكتملة. أعد المحاولة.');
     uiLocale.setHTML(list, (notice?uiLocale.html`<p role="status">${uiLocale.messageHTML(notice)}</p>`:'')+editor()+(rows.length?rows.map(row=>uiLocale.html`<article class="hl-course" data-center-trip="${esc(row.id)}"><div class="hl-course-top"><div><b>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('رحلة المركز')))(row.title)}</b><small>${esc(date(row.startsAt))} (توقيت الرياض) · ${uiLocale.messageHTML(authoredTripType(row.type))}</small></div><span>${uiLocale.messageHTML(authoredTripStatus(row.status))}</span></div><small>السعة: ${count(row.capacity)} · الحجوزات: ${count(row._count?.bookings)}</small><p>${(row.location?.locationName?uiLocale.label("الموقع: {0} · ", [row.location.locationName]):'')}${(Number.isSafeInteger(row.price?.pricePerSeatMinor)?uiLocale.label("سعر المقعد: {0} ريال", [(row.price.pricePerSeatMinor/100).toFixed(2)]):uiLocale.messageHTML(uiLocale.message('السعر غير محدد')))}</p><button type="button" data-center-bookings>عرض الحجوزات</button><button type="button" data-center-trip-lifecycle>إجراءات الرحلة</button>${(row.status==='DRAFT'&&row.updatedAt?uiLocale.html`${editor(row)}<button type="button" data-center-trip-publish data-version="${esc(row.updatedAt)}">فتح الحجز</button><button type="button" data-center-trip-delete data-version="${esc(row.updatedAt)}">حذف المسودة</button><p data-trip-publish-feedback role="status"></p>`:'')}</article>`).join(''):uiLocale.html`<p>لا توجد رحلات مرتبطة بهذا المركز حاليًا.</p>`));
   }catch(error){if(current(host,version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر تحميل الرحلات')}</p><button type="button" data-center-operations-retry>إعادة المحاولة</button>`)}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function onClick(event){
   const host=event.currentTarget;
   const lifecycle=event.target.closest?.('[data-center-trip-lifecycle]');
   if(lifecycle){
     const article=lifecycle.closest('[data-center-trip]'),version=viewVersion,session=auth()?.getSessionVersion?.();if(!article)return;
     let box=article.querySelector('[data-trip-lifecycle]');if(box){box.scrollIntoView({block:'nearest'});return}
     box=document.createElement('div');box.dataset.tripLifecycle='';box.className='hl-trip-lifecycle';article.append(box);
     const path='/center/me/trips/'+encodeURIComponent(article.dataset.centerTrip);
     window.HydrolandTripLifecycle.mount(box,{isCurrent:()=>current(host,version,session),authorize:()=>authorize(host,version,session),load:()=>auth().authorizedFetch(path+'/lifecycle'),send:body=>auth().authorizedFetch(path+'/actions',{method:'POST',body:JSON.stringify(body)}),onSaved:async()=>{document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed'));await open(uiLocale.message('تم حفظ إجراء الرحلة وتحديث سجلاتها.'))}});return
   }
   const remove=event.target.closest?.('[data-center-trip-delete]');if(remove){void deleteTrip(remove);return}
   const publish=event.target.closest?.('[data-center-trip-publish]');if(publish){void publishTrip(publish);return}
   if(event.target.closest?.('[data-center-operations-retry]')){void open();return}
   const button=event.target.closest?.('[data-center-bookings]');if(!button||button.disabled)return;
   const article=button.closest('[data-center-trip]');if(!article||!host.contains(article))return;
   const version=viewVersion,session=auth()?.getSessionVersion?.();button.disabled=true;
   let box=article.querySelector('[data-bookings]');if(!box){box=document.createElement('div');box.dataset.bookings='';article.append(box)}
   box.setAttribute('aria-busy','true');uiLocale.setHTML(box, uiLocale.html`<p>جارٍ تحميل الحجوزات…</p>`);
   try{await bookings(article.dataset.centerTrip,article,host,version,session)}
   catch(error){if(current(host,version,session)&&article.isConnected)uiLocale.setHTML(box, uiLocale.html`<p role="alert">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر تحميل الحجوزات')}</p>`)}
   finally{button.disabled=false;box.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterOperations=Object.freeze({open});
})();

