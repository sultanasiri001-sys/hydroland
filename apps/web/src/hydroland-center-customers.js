(()=>{
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
 const summary=row=>`<p>الحجوزات: ${count(row.bookingCount)} · المؤكدة: ${count(row.confirmedBookings)} · بانتظار التأكيد: ${count(row.pendingBookings)} · الملغاة: ${count(row.cancelledBookings)}</p><p>مقاعد الحجوزات غير الملغاة: ${count(row.nonCancelledSeats)} · المقاعد المسجّلة تاريخيًا: ${count(row.totalSeats)}</p><p>الدورات: ${count(row.trainingCount)} · غير المنتهية: ${count(row.activeTraining)} · المكتملة: ${count(row.completedTraining)}</p><small>آخر حجز أو تسجيل: ${esc(date(row.lastActivityAt))} — توقيت الرياض</small>`;
 const pager=(data,kind)=>data.totalPages>1?`<nav class="hl-customer-pager" aria-label="صفحات ${kind==='list'?'العملاء':kind==='bookings'?'الحجوزات':'التدريب'}"><button type="button" data-customer-page="${kind}" data-page="${data.page-1}" ${data.page<=1?'disabled':''}>السابق</button><span>صفحة ${data.page} من ${data.totalPages}</span><button type="button" data-customer-page="${kind}" data-page="${data.page+1}" ${data.page>=data.totalPages?'disabled':''}>التالي</button></nav>`:'';
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.className='hl-center-customers';host.id='hl-center-customers';host.hidden=true;
   host.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>عملاء المركز</h2><p>أصحاب حجوزات الرحلات والمسجّلون في تدريب المركز المُدار، مع احتساب السجلات التاريخية والملغاة.</p></div></header><form data-customer-search><label>اسم العميل<input name="q" maxlength="120" type="search" autocomplete="off"></label><label>نوع التعامل<select name="source"><option value="ALL">جميع العملاء</option><option value="BOOKING">حجوزات الرحلات</option><option value="TRAINING">المتدربون</option></select></label><button type="submit">بحث</button><button type="button" data-customer-reset>مسح البحث</button><button type="button" data-center-customers-retry>تحديث القائمة</button></form><div data-center-customers aria-live="polite"></div><section data-customer-detail hidden aria-live="polite"></section>';
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
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل العملاء...</p>';
   const query=new URLSearchParams({q:filters.q,source:filters.source,page:String(filters.page),pageSize:'20'});
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/customers?'+query),data=await response.json().catch(()=>null);if(!current(host,version,session))return;
     if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض عملاء هذا المركز.':data?.message||'تعذر تحميل العملاء');
     if(!validPage(data)||data.items.some(row=>typeof row.customerId!=='string'))throw new Error('استجابة عملاء المركز غير مكتملة. أعد المحاولة.');
     filters.page=data.page;
     list.innerHTML=`<p data-customer-result-count>عدد العملاء المطابقين: ${data.total}</p>`+(data.items.length?data.items.map(row=>`<article class="hl-course" data-center-customer="${esc(row.customerId)}"><div class="hl-course-top"><b>${esc(row.displayName||'عميل')}</b><button type="button" data-customer-open="${esc(row.customerId)}">عرض سجل العميل</button></div>${summary(row)}</article>`).join(''):`<p>${filters.q||filters.source!=='ALL'?'لا توجد نتائج مطابقة للبحث.':'لا يوجد عملاء مرتبطون بحجوزات أو تدريب هذا المركز.'}</p>`)+pager(data,'list');
   }catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error.message||'تعذر تحميل العملاء')}</p><button type="button" data-center-customers-retry>إعادة المحاولة</button>`}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function detail(){
   if(!selected||!section||!eligible())return;
   const host=section,version=viewVersion,request=++detailVersion,session=auth().getSessionVersion?.(),value={...selected},box=host.querySelector('[data-customer-detail]');
   const active=()=>current(host,version,session)&&request===detailVersion;
   box.hidden=false;box.setAttribute('aria-busy','true');box.innerHTML='<p>جارٍ تحميل سجل العميل…</p><button type="button" data-customer-close>إغلاق السجل</button>';
   try{
     if(!(await authorize(host,version,session,()=>request===detailVersion)))return;
     const query=new URLSearchParams({bookingsPage:String(value.bookingsPage),trainingPage:String(value.trainingPage)}),response=await auth().authorizedFetch('/center/me/customers/'+encodeURIComponent(value.id)+'?'+query),data=await response.json().catch(()=>null);if(!active())return;
     if(!response.ok)throw new Error(response.status===404?'العميل غير مرتبط بحجوزات أو تدريب هذا المركز.':response.status===403?'لا تملك صلاحية عرض سجل العميل.':data?.message||'تعذر تحميل سجل العميل.');
     if(!data?.customer||data.customer.customerId!==value.id||!validPage(data.bookings)||!validPage(data.training))throw new Error('سجل العميل غير مكتمل. أعد المحاولة.');
     selected={id:value.id,bookingsPage:data.bookings.page,trainingPage:data.training.page};
     box.innerHTML=`<header><h3>سجل العميل: ${esc(data.customer.displayName||'عميل')}</h3><button type="button" data-customer-close>إغلاق السجل</button></header>${summary(data.customer)}<h4>حجوزات رحلات المركز</h4>${data.bookings.items.length?data.bookings.items.map(row=>`<article class="hl-member-row" data-customer-booking="${esc(row.id)}"><b>${esc(row.trip?.title||'رحلة')}</b><p>الحجز: ${esc(status(row.status))} · ${count(row.seats)} مقعد · الرحلة: ${esc(status(row.trip?.status))}</p><small>موعد الرحلة: ${esc(date(row.trip?.startsAt))} · تاريخ الحجز: ${esc(date(row.createdAt))}</small></article>`).join(''):'<p>لا توجد حجوزات لهذا العميل في المركز.</p>'}${pager(data.bookings,'bookings')}<h4>تدريب العميل في المركز</h4>${data.training.items.length?data.training.items.map(row=>`<article class="hl-member-row" data-customer-training="${esc(row.id)}"><b>${esc(row.courseCode||'دورة')}</b><p>التسجيل: ${esc(status(row.status))}${row.record?` · تقدم التدريب: ${count(row.record.progressPercent)}٪`:''}</p><small>تاريخ التسجيل: ${esc(date(row.enrolledAt))}${row.completedAt?' · تاريخ الإكمال: '+esc(date(row.completedAt)):''}</small></article>`).join(''):'<p>لا توجد دورات لهذا العميل في المركز.</p>'}${pager(data.training,'training')}`;
     box.scrollIntoView({block:'nearest'});
   }catch(error){if(active())box.innerHTML=`<p role="alert">${esc(error.message||'تعذر تحميل سجل العميل.')}</p><button type="button" data-customer-detail-retry>إعادة تحميل السجل</button><button type="button" data-customer-close>إغلاق السجل</button>`}
   finally{if(active())box.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterCustomers=Object.freeze({open});
})();
