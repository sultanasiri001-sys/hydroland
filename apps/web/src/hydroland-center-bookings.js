(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,version=0,detailVersion=0,selected=null,filters={q:'',status:'ALL',page:1};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const date=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'}):'—';
 const count=v=>Number.isSafeInteger(v)&&v>=0?v:0;
 const status=v=>({PENDING:'بانتظار التأكيد',CONFIRMED:'مؤكد',CANCELLED:'ملغى',DRAFT:'غير منشورة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',COMPLETED:'مكتملة',ELIGIBLE:'مؤهل',REJECTED:'غير مؤهل',CAPTURED:'مدفوع',CREATED:'بدأ الدفع',FAILED:'فشل الدفع',REFUNDED:'مسترد',AUTHORIZED:'محجوز ماليًا'}[v]||'تحتاج إلى مراجعة');
 const issue=v=>({PARTICIPANT_COUNT_MISMATCH:'عدد المشاركين لا يطابق المقاعد.',PARTICIPANT_ELIGIBILITY_PENDING:'أهلية المشاركين تحتاج مراجعة الجهة المخولة.',SAFETY_APPROVAL:'قرار السلامة بالموافقة غير متوفر.',CAPACITY_LIMIT:'المقاعد المؤكدة تتجاوز سعة الرحلة.',PRICE_NOT_CONFIGURED:'سعر الرحلة غير محدد أو غير صالح.',PAYMENT_REQUIRED:'لم يكتمل دفع المبلغ المطلوب.',WEATHER_GATE:'الطقس يحتاج تحديثًا وموافقة تشغيلية.',BOOKING_NOT_PENDING_OR_TRIP_CLOSED:'الحجز ليس بانتظار التأكيد أو أن موعد الرحلة أو حالتها يمنع التأكيد.'}[v]||'توجد ملاحظة تحتاج إلى مراجعة.');
 const money=v=>Number.isSafeInteger(v)?(v/100).toFixed(2):'—';
 const clear=()=>{version++;detailVersion++;section?.remove();section=null;selected=null;filters={q:'',status:'ALL',page:1}};
 const alive=(host,v,s)=>host===section&&host.isConnected&&v===version&&s===auth()?.getSessionVersion?.();
 const current=(host,v,s)=>alive(host,v,s)&&eligible();
 async function authorize(host,v,s,extra=()=>true){const isCurrent=()=>alive(host,v,s)&&extra();if(typeof access()?.authorizeRole!=='function'){if(isCurrent())clear();return false}const ok=await access().authorizeRole('center',{sessionVersion:s,isCurrent});if(!ok||!current(host,v,s)||!extra()){if(isCurrent())clear();return false}return true}
 const close=()=>{detailVersion++;selected=null;const box=section?.querySelector('[data-booking-detail]');if(box){delete box.dataset.busy;box.hidden=true;box.replaceChildren()}};
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.id='hl-center-bookings';host.className='hl-center-bookings';host.hidden=true;
   host.innerHTML='<header><small>DIVE CENTER · مركز الغوص</small><h2>إدارة الحجوزات</h2><p>حجوزات رحلات المركز، ومراجعة المشاركين وشروط التأكيد.</p></header><form data-booking-search><label>العميل أو الرحلة أو رقم الحجز<input type="search" name="q" maxlength="120"></label><label>حالة الحجز<select name="status"><option value="ALL">جميع الحجوزات</option><option value="PENDING">بانتظار التأكيد</option><option value="CONFIRMED">مؤكد</option><option value="CANCELLED">ملغى</option></select></label><button type="submit">بحث</button><button type="button" data-booking-reset>مسح البحث</button><button type="button" data-booking-reload>تحديث القائمة</button></form><div data-booking-list aria-live="polite"></div><section data-booking-detail hidden aria-live="polite"></section>';
   host.addEventListener('submit',event=>{if(event.target.matches('[data-booking-search]')){event.preventDefault();const data=new FormData(event.target);filters={q:String(data.get('q')||'').trim(),status:String(data.get('status')||'ALL'),page:1};void open()}else if(event.target.matches('[data-booking-action]')){event.preventDefault();void save(event.target)}});
   host.addEventListener('click',event=>{const b=event.target.closest?.('button');if(!b||b.disabled)return;if(b.hasAttribute('data-booking-reset')){filters={q:'',status:'ALL',page:1};void open()}else if(b.hasAttribute('data-booking-reload'))void open();else if(b.hasAttribute('data-booking-close'))close();else if(b.hasAttribute('data-booking-open')){selected={id:b.dataset.bookingOpen};void detail()}else if(b.hasAttribute('data-booking-detail-reload'))void detail();else if(b.hasAttribute('data-booking-page')){const page=Number(b.dataset.bookingPage);if(Number.isSafeInteger(page)&&page>0){filters.page=page;void open()}}});
   section=host;document.getElementById('main')?.append(host);return host;
 }
 async function open(notice='',reopenId=null){
   if(!eligible()){clear();return}
   const host=ensure(),v=++version,s=auth().getSessionVersion?.(),list=host.querySelector('[data-booking-list]');close();host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);host.querySelector('[name=q]').value=filters.q;host.querySelector('[name=status]').value=filters.status;
   list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل الحجوزات…</p>';
   try{
     if(!await authorize(host,v,s))return;
     const response=await auth().authorizedFetch('/center/me/bookings?'+new URLSearchParams({...filters,page:String(filters.page),pageSize:'20'})),data=await response.json().catch(()=>null);if(!current(host,v,s))return;
     if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية إدارة حجوزات المركز.':data?.message||'تعذر تحميل الحجوزات.');
     if(!data||!Array.isArray(data.items)||data.items.some(r=>typeof r.id!=='string')||!Number.isSafeInteger(data.total)||!Number.isSafeInteger(data.page)||data.page<1||!Number.isSafeInteger(data.totalPages)||data.totalPages<data.page||!Array.isArray(data.counts))throw new Error('استجابة الحجوزات غير مكتملة.');
     filters.page=data.page;
     list.innerHTML=(notice?`<p role="status">${esc(notice)}</p>`:'')+`<p data-booking-count>عدد الحجوزات المطابقة: ${count(data.total)}</p><p>ضمن البحث الحالي: ${data.counts.map(r=>`${esc(status(r.status))}: ${count(r.count)} حجز / ${count(r.seats)} مقعد`).join(' · ')}</p>`+(data.items.length?data.items.map(row=>`<article class="hl-course" data-center-booking="${esc(row.id)}"><div class="hl-course-top"><b>${esc(row.customerName||'عميل')}</b><span>${esc(status(row.status))}</span></div><p>${esc(row.trip?.title||'رحلة')} · ${count(row.seats)} مقعد</p><small>رقم الحجز: ${esc(row.id)}<br>موعد الرحلة: ${esc(date(row.trip?.startsAt))} — توقيت الرياض</small><p><button type="button" data-booking-open="${esc(row.id)}">تفاصيل الحجز</button></p></article>`).join(''):'<p>لا توجد حجوزات مطابقة للبحث.</p>')+(data.totalPages>1?`<nav class="hl-booking-pager" aria-label="صفحات الحجوزات"><button type="button" data-booking-page="${data.page-1}" ${data.page===1?'disabled':''}>السابق</button><span>صفحة ${data.page} من ${data.totalPages}</span><button type="button" data-booking-page="${data.page+1}" ${data.page===data.totalPages?'disabled':''}>التالي</button></nav>`:'');
     if(reopenId){selected={id:reopenId};await detail()}
   }catch(error){if(current(host,v,s))list.innerHTML=`<p role="alert">${esc(error.message||'تعذر تحميل الحجوزات.')}</p><button type="button" data-booking-reload>إعادة المحاولة</button>`}
   finally{if(current(host,v,s))list.removeAttribute('aria-busy')}
 }
 const form=(data,action)=>`<form data-booking-action="${action}" data-state="${esc(data.stateToken)}" data-request-id="${crypto.randomUUID()}"><h4>${action==='CONFIRM'?'تأكيد الحجز':'إلغاء الحجز'}</h4>${action==='CANCEL'?'<label>سبب الإلغاء<textarea name="reason" minlength="10" maxlength="1000" required></textarea></label><label class="hl-booking-check"><input name="financialAcknowledged" type="checkbox" required>أفهم أن إلغاء الحجز لا يعيد المبلغ تلقائيًا، ويلزم متابعة الاسترداد ماليًا.</label>':data.policyReview?.required?'<label class="hl-booking-check"><input name="policyReviewAcknowledged" type="checkbox" required>راجعت ملاحظات السياسات المسموح بمتابعتها تحت المراجعة.</label>':''}<button type="submit">${action==='CONFIRM'?'تأكيد الحجز':'حفظ إلغاء الحجز'}</button><p data-booking-feedback role="status"></p></form>`;
 async function detail(){
   if(!selected||!section||!eligible())return;
   const host=section,v=version,d=++detailVersion,s=auth().getSessionVersion?.(),id=selected.id,box=host.querySelector('[data-booking-detail]'),active=()=>current(host,v,s)&&d===detailVersion;
   delete box.dataset.busy;box.hidden=false;box.setAttribute('aria-busy','true');box.innerHTML='<p>جارٍ تحميل تفاصيل الحجز…</p><button type="button" data-booking-close>إغلاق التفاصيل</button>';
   try{
     if(!await authorize(host,v,s,()=>d===detailVersion))return;
     const response=await auth().authorizedFetch('/center/me/bookings/'+encodeURIComponent(id)),data=await response.json().catch(()=>null);if(!active())return;
     if(!response.ok)throw new Error(response.status===404?'الحجز غير موجود ضمن المركز.':response.status===403?'لا تملك صلاحية عرض هذا الحجز.':data?.message||'تعذر تحميل تفاصيل الحجز.');
     if(data?.booking?.id!==id||typeof data.stateToken!=='string'||!Array.isArray(data.participants)||!Array.isArray(data.financial)||!Array.isArray(data.blockers)||!Array.isArray(data.actions))throw new Error('تفاصيل الحجز غير مكتملة.');
     const row=data.booking;
     box.innerHTML=`<header><h3>حجز ${esc(row.customerName||'عميل')}</h3><button type="button" data-booking-close>إغلاق التفاصيل</button><button type="button" data-booking-detail-reload>تحديث التفاصيل</button></header><p>رقم الحجز: ${esc(id)} · ${esc(status(row.status))} · ${count(row.seats)} مقعد</p><p>${esc(row.trip?.title)} · ${esc(status(row.trip?.status))}<br>${esc(date(row.trip?.startsAt))} — توقيت الرياض</p><p>المقاعد المؤكدة للرحلة: ${count(data.confirmedSeats)} · المتبقية للتأكيد: ${count(data.remainingSeats)}</p><h4>المشاركون</h4>${data.participants.length?`<ul>${data.participants.map(p=>`<li>${esc(p.fullName)} — ${esc(status(p.eligibilityStatus))}${p.certificationTitle?' · '+esc(p.certificationTitle):''}</li>`).join('')}</ul>`:'<p>لم تُسجّل بيانات المشاركين.</p>'}<h4>حالة الدفع</h4><p>المبلغ المطلوب: ${money(data.requiredAmountMinor)} ريال · ${data.paymentSatisfied?'شرط الدفع مستوفى':'شرط الدفع غير مستوفى'}</p>${data.financial.length?data.financial.map(p=>`<p>${esc(status(p.status))}: ${money(p.amountMinor)} ${esc(p.currency)} · ${count(p.count)} عملية</p>`).join(''):'<p>لا توجد عمليات دفع مسجلة.</p>'}${data.blockers.length&&row.status==='PENDING'?`<h4>أسباب منع التأكيد</h4><ul>${data.blockers.map(c=>`<li>${esc(issue(c))}</li>`).join('')}</ul>`:''}${data.policyReview?.required?`<h4>ملاحظات السياسات</h4><ul>${data.policyReview.issues.map(c=>`<li>${esc(issue(c))}</li>`).join('')}</ul>`:''}${data.lastAction?`<p>آخر إجراء: ${esc(data.lastAction.reason||status(row.status))} · ${esc(date(data.lastAction.occurredAt))}</p>`:''}${data.actions.filter(a=>['CONFIRM','CANCEL'].includes(a)).map(a=>form(data,a)).join('')}${data.actions.length?'':'<p>لا توجد إجراءات متاحة لهذا الحجز في حالته الحالية.</p>'}`;
     box.scrollIntoView({block:'nearest'});
   }catch(error){if(active())box.innerHTML=`<p role="alert">${esc(error.message||'تعذر تحميل تفاصيل الحجز.')}</p><button type="button" data-booking-detail-reload>إعادة تحميل التفاصيل</button><button type="button" data-booking-close>إغلاق التفاصيل</button>`}
   finally{if(active())box.removeAttribute('aria-busy')}
 }
 async function save(form){
   if(!selected||form.dataset.busy)return;
   const host=section,v=version,d=detailVersion,s=auth().getSessionVersion?.(),id=selected.id,feedback=form.querySelector('[data-booking-feedback]'),box=host.querySelector('[data-booking-detail]'),active=()=>current(host,v,s)&&d===detailVersion&&form.isConnected;
   if(box.dataset.busy)return;
   const fields=new FormData(form),body={action:form.dataset.bookingAction,requestId:form.dataset.requestId,expectedState:form.dataset.state,...(fields.has('reason')?{reason:String(fields.get('reason')).trim(),financialAcknowledged:fields.get('financialAcknowledged')==='on'}:{}),...(fields.has('policyReviewAcknowledged')?{policyReviewAcknowledged:true}:{})};
   const serialized=JSON.stringify(body);if(form.dataset.lastBody&&form.dataset.lastBody!==serialized){body.requestId=crypto.randomUUID();form.dataset.requestId=body.requestId}form.dataset.lastBody=JSON.stringify(body);
   form.dataset.busy='true';box.dataset.busy='true';box.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=true);feedback.textContent='جارٍ حفظ الإجراء…';
   try{
     if(!await authorize(host,v,s,()=>d===detailVersion))return;
     const response=await auth().authorizedFetch('/center/me/bookings/'+encodeURIComponent(id)+'/actions',{method:'POST',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!active())return;
     if(!response.ok){if(response.status===409){form.dataset.stale='true';feedback.innerHTML=`${esc(data?.message||'تغيرت بيانات الحجز.')} <button type="button" data-booking-detail-reload>تحديث التفاصيل</button>`}else throw new Error(data?.message||'تعذر حفظ الإجراء.');return}
     document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed'));await open(body.action==='CONFIRM'?'تم تأكيد الحجز.':'تم حفظ إلغاء الحجز. تابع أي استرداد عبر الإجراءات المالية.',id);
   }catch(error){if(active())feedback.textContent=error.message||'تعذر حفظ الإجراء. يمكنك إعادة المحاولة.'}
   finally{delete form.dataset.busy;if(active()){delete box.dataset.busy;box.querySelectorAll('button,input,textarea').forEach(el=>el.disabled=false);if(form.dataset.stale)form.querySelector('[type=submit]').disabled=true}}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterBookings=Object.freeze({open});
})();
