(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-customers", {
  "مؤكد": "Confirmed",
  "بانتظار التأكيد": "Awaiting confirmation",
  "إعادة المحاولة": "Try again",
  "ملغى": "Cancelled",
  "مفتوحة للحجز": "Open for booking",
  "مغلقة للحجز": "Closed for booking",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "بحث": "Search",
  "مسح البحث": "Clear search",
  "تحديث القائمة": "Refresh list",
  "موعد الرحلة:": "Trip date:",
  "— توقيت الرياض": "— Riyadh time",
  "عميل": "Customer",
  "رحلة": "Trip",
  "السابق": "Previous",
  "صفحة": "Page",
  "من": "of",
  "التالي": "Next",
  "موقوف": "Suspended",
  "محفوظة": "Saved",
  "نشط": "Active",
  "مكتمل": "Complete",
  "لم يبدأ": "Not started",
  "قيد التدريب": "In training",
  "مجتاز": "Passed",
  "غير معروف": "Unknown",
  "الحجوزات:": "Bookings:",
  "· المؤكدة:": "· Confirmed:",
  "· بانتظار التأكيد:": "· Awaiting confirmation:",
  "· الملغاة:": "· Cancelled:",
  "مقاعد الحجوزات غير الملغاة:": "Seats in noncancelled bookings:",
  "· المقاعد المسجّلة تاريخيًا:": "· Historically recorded seats:",
  "الدورات:": "Courses:",
  "· غير المنتهية:": "· Ongoing:",
  "· المكتملة:": "· Completed:",
  "آخر حجز أو تسجيل:": "Latest booking or enrollment:",
  "العملاء": "Customers",
  "الحجوزات": "Bookings",
  "التدريب": "Training",
  "عملاء المركز": "Center customers",
  "أصحاب حجوزات الرحلات والمسجّلون في تدريب المركز المُدار، مع احتساب السجلات التاريخية والملغاة.": "Trip booking holders and trainees enrolled with the managed center, including historical and cancelled records.",
  "اسم العميل": "Customer name",
  "نوع التعامل": "Relationship type",
  "جميع العملاء": "All customers",
  "حجوزات الرحلات": "Trip bookings",
  "المتدربون": "Trainees",
  "جارٍ تحميل العملاء...": "Loading customers...",
  "لا تملك صلاحية عرض عملاء هذا المركز.": "You do not have permission to view this center's customers.",
  "تعذر تحميل العملاء": "Could not load customers",
  "استجابة عملاء المركز غير مكتملة. أعد المحاولة.": "The center customer response is incomplete. Try again.",
  "عدد العملاء المطابقين:": "Matching customers:",
  "عرض سجل العميل": "View customer history",
  "لا توجد نتائج مطابقة للبحث.": "No results match this search.",
  "لا يوجد عملاء مرتبطون بحجوزات أو تدريب هذا المركز.": "No customers are linked to bookings or training at this center.",
  "جارٍ تحميل سجل العميل…": "Loading customer history…",
  "إغلاق السجل": "Close history",
  "العميل غير مرتبط بحجوزات أو تدريب هذا المركز.": "This customer is not linked to bookings or training at this center.",
  "لا تملك صلاحية عرض سجل العميل.": "You do not have permission to view this customer's history.",
  "تعذر تحميل سجل العميل.": "Could not load customer history.",
  "سجل العميل غير مكتمل. أعد المحاولة.": "The customer history is incomplete. Try again.",
  "سجل العميل:": "Customer history:",
  "حجوزات رحلات المركز": "Center trip bookings",
  "تدريب العميل في المركز": "Customer training at the center",
  "الحجز:": "Booking:",
  "مقعد · الرحلة:": "seats · Trip:",
  "· تاريخ الحجز:": "· Booking date:",
  "لا توجد حجوزات لهذا العميل في المركز.": "This customer has no bookings at the center.",
  "التسجيل:": "Enrollment:",
  "تاريخ التسجيل:": "Enrollment date:",
  "دورة": "Course",
  "· تقدم التدريب: {0}٪": "· Training progress: {0}%",
  "· تاريخ الإكمال:": "· Completion date:",
  "لا توجد دورات لهذا العميل في المركز.": "This customer has no courses at the center.",
  "إعادة تحميل السجل": "Reload history",
  " · تقدم التدريب: {0}٪": " · Training progress: {0}%",
  " · تاريخ الإكمال: {0}": " · Completion date: {0}",
  "صفحات العملاء": "Customer pages",
  "صفحات الحجوزات": "Booking pages",
  "صفحات التدريب": "Training pages"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

  // Local labels retain identity; unknown API values remain plain text.
  const authoredStatus=(value)=>((value=>value?uiLocale.message(value):value)({DRAFT:'محفوظة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',PENDING:'بانتظار التأكيد',ACTIVE:'نشط',SUSPENDED:'موقوف',CONFIRMED:'مؤكد',CANCELLED:'ملغى',COMPLETED:'مكتمل',NOT_STARTED:'لم يبدأ',IN_PROGRESS:'قيد التدريب',PASSED:'مجتاز'}[value]) || uiLocale.message('غير معروف'));

 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,viewVersion=0,detailVersion=0,filters={q:'',source:'ALL',page:1},selected=null;
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleDateString('ar-SA',{timeZone:'Asia/Riyadh'})};
 const count=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const status=value=>({DRAFT:'محفوظة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',PENDING:'بانتظار التأكيد',ACTIVE:'نشط',SUSPENDED:'موقوف',CONFIRMED:'مؤكد',CANCELLED:'ملغى',COMPLETED:'مكتمل',NOT_STARTED:'لم يبدأ',IN_PROGRESS:'قيد التدريب',PASSED:'مجتاز'}[value]||'غير معروف');
 const clear=()=>{viewVersion++;detailVersion++;section?.remove();section=null;selected=null;filters={q:'',source:'ALL',page:1}};
 const alive=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&session===auth()?.getSessionVersion?.();
 const current=(host,version,session)=>alive(host,version,session)&&eligible();
 async function authorize(host,version,session,extra=()=>true){
   const centralized=access()?.authorizeRole;if(typeof centralized!=='function'){if(alive(host,version,session)&&extra())clear();return false}
   const isCurrent=()=>alive(host,version,session)&&extra(),valid=await centralized('center',{sessionVersion:session,isCurrent});
   if(!valid||!current(host,version,session)||!extra()){if(isCurrent())clear();return false}return true;
 }
 const validPage=data=>data&&Array.isArray(data.items)&&Number.isSafeInteger(data.total)&&data.total>=0&&Number.isSafeInteger(data.page)&&data.page>=1&&Number.isSafeInteger(data.totalPages)&&data.totalPages>=data.page;
 const summary=row=>uiLocale.html`<p>الحجوزات: ${count(row.bookingCount)} · المؤكدة: ${count(row.confirmedBookings)} · بانتظار التأكيد: ${count(row.pendingBookings)} · الملغاة: ${count(row.cancelledBookings)}</p><p>مقاعد الحجوزات غير الملغاة: ${count(row.nonCancelledSeats)} · المقاعد المسجّلة تاريخيًا: ${count(row.totalSeats)}</p><p>الدورات: ${count(row.trainingCount)} · غير المنتهية: ${count(row.activeTraining)} · المكتملة: ${count(row.completedTraining)}</p><small>آخر حجز أو تسجيل: ${esc(date(row.lastActivityAt))} — توقيت الرياض</small>`;
 const pager=(data,kind)=>data.totalPages>1?uiLocale.html`<nav class="hl-customer-pager" ${uiLocale.attribute('aria-label',kind==='list'?'صفحات العملاء':kind==='bookings'?'صفحات الحجوزات':'صفحات التدريب')}><button type="button" data-customer-page="${kind}" data-page="${data.page-1}" ${data.page<=1?'disabled':''}>السابق</button><span>صفحة ${data.page} من ${data.totalPages}</span><button type="button" data-customer-page="${kind}" data-page="${data.page+1}" ${data.page>=data.totalPages?'disabled':''}>التالي</button></nav>`:'';
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.className='hl-center-customers';host.id='hl-center-customers';host.hidden=true;
   uiLocale.setHTML(host, uiLocale.html`<header><div><small>DIVE CENTER · مركز الغوص</small><h2>عملاء المركز</h2><p>أصحاب حجوزات الرحلات والمسجّلون في تدريب المركز المُدار، مع احتساب السجلات التاريخية والملغاة.</p></div></header><form data-customer-search><label>اسم العميل<input name="q" maxlength="120" type="search" autocomplete="off"></label><label>نوع التعامل<select name="source"><option value="ALL">جميع العملاء</option><option value="BOOKING">حجوزات الرحلات</option><option value="TRAINING">المتدربون</option></select></label><button type="submit">بحث</button><button type="button" data-customer-reset>مسح البحث</button><button type="button" data-center-customers-retry>تحديث القائمة</button></form><div data-center-customers aria-live="polite"></div><section data-customer-detail hidden aria-live="polite"></section>`);
   host.addEventListener('submit',event=>{if(event.target.matches('[data-customer-search]')){event.preventDefault();const data=new FormData(event.target);filters={q:String(data.get('q')||'').trim(),source:String(data.get('source')||'ALL'),page:1};void open()}});
   host.addEventListener('click',event=>{
     const button=event.target.closest?.('button');if(!button||button.disabled)return;
     if(button.hasAttribute('data-customer-close')){detailVersion++;selected=null;const box=host.querySelector('[data-customer-detail]');box.hidden=true;box.replaceChildren();return}
     if(button.hasAttribute('data-customer-reset')){filters={q:'',source:'ALL',page:1};void open();return}
     if(button.hasAttribute('data-center-customers-retry')){void open();return}
     if(button.hasAttribute('data-customer-open')){selected={id:button.dataset.customerOpen,bookingsPage:1,trainingPage:1};void detail();return}
     if(button.hasAttribute('data-customer-detail-retry')){void detail();return}
     if(button.hasAttribute('data-customer-page')){const page=Number(button.dataset.page),kind=button.dataset.customerPage;if(!Number.isSafeInteger(page)||page<1)return;if(kind==='list'){filters.page=page;void open()}else if(selected){selected[kind==='bookings'?'bookingsPage':'trainingPage']=page;void detail()}}
   });
   section=host;document.getElementById('main')?.append(host);return host;
 }
 async function open(){
   if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-customers]'),version=++viewVersion,session=auth().getSessionVersion?.();
   detailVersion++;selected=null;host.querySelector('[data-customer-detail]').hidden=true;host.querySelector('[data-customer-detail]').replaceChildren();
   host.querySelector('[name=q]').value=filters.q;host.querySelector('[name=source]').value=filters.source;
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل العملاء...</p>`);
   const query=new URLSearchParams({q:filters.q,source:filters.source,page:String(filters.page),pageSize:'20'});
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/customers?'+query),data=await response.json().catch(()=>null);if(!current(host,version,session))return;
     if(!response.ok)throw (response.status===403?localError('لا تملك صلاحية عرض عملاء هذا المركز.'):(value=>value?new Error(value):localError('تعذر تحميل العملاء'))(data?.message));
     if(!validPage(data)||data.items.some(row=>typeof row.customerId!=='string'))throw localError('استجابة عملاء المركز غير مكتملة. أعد المحاولة.');
     filters.page=data.page;
     uiLocale.setHTML(list, uiLocale.html`<p data-customer-result-count>عدد العملاء المطابقين: ${data.total}</p>${(data.items.length?data.items.map(row=>uiLocale.html`<article class="hl-course" data-center-customer="${esc(row.customerId)}"><div class="hl-course-top"><b>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('عميل')))(row.displayName)}</b><button type="button" data-customer-open="${esc(row.customerId)}">عرض سجل العميل</button></div>${summary(row)}</article>`).join(''):uiLocale.html`<p>${uiLocale.messageHTML((filters.q||filters.source!=='ALL'?uiLocale.message('لا توجد نتائج مطابقة للبحث.'):uiLocale.message('لا يوجد عملاء مرتبطون بحجوزات أو تدريب هذا المركز.')))}</p>`)}${pager(data,'list')}`);
   }catch(error){if(current(host,version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${localErrorHTML(error, 'تعذر تحميل العملاء')}</p><button type="button" data-center-customers-retry>إعادة المحاولة</button>`)}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function detail(){
   if(!selected||!section||!eligible())return;
   const host=section,version=viewVersion,request=++detailVersion,session=auth().getSessionVersion?.(),value={...selected},box=host.querySelector('[data-customer-detail]');
   const active=()=>current(host,version,session)&&request===detailVersion;
   box.hidden=false;box.setAttribute('aria-busy','true');uiLocale.setHTML(box, uiLocale.html`<p>جارٍ تحميل سجل العميل…</p><button type="button" data-customer-close>إغلاق السجل</button>`);
   try{
     if(!(await authorize(host,version,session,()=>request===detailVersion)))return;
     const query=new URLSearchParams({bookingsPage:String(value.bookingsPage),trainingPage:String(value.trainingPage)}),response=await auth().authorizedFetch('/center/me/customers/'+encodeURIComponent(value.id)+'?'+query),data=await response.json().catch(()=>null);if(!active())return;
     if(!response.ok)throw (response.status===404?localError('العميل غير مرتبط بحجوزات أو تدريب هذا المركز.'):(response.status===403?localError('لا تملك صلاحية عرض سجل العميل.'):(value=>value?new Error(value):localError('تعذر تحميل سجل العميل.'))(data?.message)));
     if(!data?.customer||data.customer.customerId!==value.id||!validPage(data.bookings)||!validPage(data.training))throw localError('سجل العميل غير مكتمل. أعد المحاولة.');
     selected={id:value.id,bookingsPage:data.bookings.page,trainingPage:data.training.page};
     uiLocale.setHTML(box, uiLocale.html`<header><h3>سجل العميل: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('عميل')))(data.customer.displayName)}</h3><button type="button" data-customer-close>إغلاق السجل</button></header>${summary(data.customer)}<h4>حجوزات رحلات المركز</h4>${(data.bookings.items.length?data.bookings.items.map(row=>uiLocale.html`<article class="hl-member-row" data-customer-booking="${esc(row.id)}"><b>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('رحلة')))(row.trip?.title)}</b><p>الحجز: ${uiLocale.messageHTML(authoredStatus(row.status))} · ${count(row.seats)} مقعد · الرحلة: ${uiLocale.messageHTML(authoredStatus(row.trip?.status))}</p><small>موعد الرحلة: ${esc(date(row.trip?.startsAt))} · تاريخ الحجز: ${esc(date(row.createdAt))}</small></article>`).join(''):uiLocale.html`<p>لا توجد حجوزات لهذا العميل في المركز.</p>`)}${pager(data.bookings,'bookings')}<h4>تدريب العميل في المركز</h4>${(data.training.items.length?data.training.items.map(row=>uiLocale.html`<article class="hl-member-row" data-customer-training="${esc(row.id)}"><b>${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('دورة')))(row.courseCode)}</b><p>التسجيل: ${uiLocale.messageHTML(authoredStatus(row.status))}${(row.record?uiLocale.label(" · تقدم التدريب: {0}٪", [count(row.record.progressPercent)]):'')}</p><small>تاريخ التسجيل: ${esc(date(row.enrolledAt))}${(row.completedAt?uiLocale.label(" · تاريخ الإكمال: {0}", [date(row.completedAt)]):'')}</small></article>`).join(''):uiLocale.html`<p>لا توجد دورات لهذا العميل في المركز.</p>`)}${pager(data.training,'training')}`);
     box.scrollIntoView({block:'nearest'});
   }catch(error){if(active())uiLocale.setHTML(box, uiLocale.html`<p role="alert">${localErrorHTML(error, 'تعذر تحميل سجل العميل.')}</p><button type="button" data-customer-detail-retry>إعادة تحميل السجل</button><button type="button" data-customer-close>إغلاق السجل</button>`)}
   finally{if(active())box.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 const search=q=>{if(typeof q!=='string'||!q.trim()||q.trim().length>120)return;filters={q:q.trim(),source:'ALL',page:1};return open()};
 window.HydrolandCenterCustomers=Object.freeze({open,search});
})();
