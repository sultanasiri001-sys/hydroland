(()=>{
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
 const editor=(row=null)=>`<details class="hl-center-trip-editor"><summary>${row?'تعديل الرحلة':'إضافة رحلة'}</summary><form data-center-trip-edit data-trip-id="${esc(row?.id||'')}" data-version="${esc(row?.updatedAt||'')}" data-request-id="${row?'':crypto.randomUUID()}"><label>عنوان الرحلة<input name="title" maxlength="240" required value="${esc(row?.title||'')}"></label><label>نوع الرحلة<select name="type"><option value="BOAT" ${row?.type==='BOAT'?'selected':''}>رحلة بحرية</option><option value="SHORE" ${row?.type==='SHORE'?'selected':''}>غوص من الشاطئ</option></select></label><label>البداية — توقيت الرياض<input name="startsAt" type="datetime-local" required value="${esc(localTime(row?.startsAt))}"></label><label>النهاية — توقيت الرياض<input name="endsAt" type="datetime-local" required value="${esc(localTime(row?.endsAt))}"></label><label>عدد المقاعد<input name="capacity" type="number" min="1" step="1" max="2147483647" required value="${esc(row?.capacity??'')}"></label><label>سعر المقعد بالريال — صفر للرحلة المجانية<input name="price" type="number" min="0" step="0.01" required value="${esc(Number.isSafeInteger(row?.price?.pricePerSeatMinor)?(row.price.pricePerSeatMinor/100).toFixed(2):'')}"></label><label>اسم الموقع<input name="locationName" maxlength="240" required value="${esc(row?.location?.locationName||'')}"></label><label>خط العرض<input name="latitude" type="number" min="-90" max="90" step="any" required value="${esc(row?.location?.latitude??'')}"></label><label>خط الطول<input name="longitude" type="number" min="-180" max="180" step="any" required value="${esc(row?.location?.longitude??'')}"></label><p>تُحفظ الرحلة قبل النشر. فتح الحجز لا يُعد موافقة على السلامة أو الطقس أو تصريحًا بالتشغيل.</p><button type="submit">حفظ الرحلة</button><p data-trip-feedback role="status"></p></form></details>`;
 async function saveTrip(form){
   if(form.dataset.busy)return;
   const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),button=form.querySelector('[type=submit]'),feedback=form.querySelector('[data-trip-feedback]');
   const values=Object.fromEntries(new FormData(form));let body;
   try{const parts=values.price.split('.');if(!/^\d+(\.\d{1,2})?$/.test(values.price))throw new Error('أدخل سعرًا صحيحًا بمنزلتين عشريتين كحد أقصى.');const pricePerSeatMinor=Number(parts[0])*100+Number((parts[1]||'').padEnd(2,'0'));if(!Number.isSafeInteger(pricePerSeatMinor))throw new Error('السعر أكبر من الحد المدعوم.');body={title:values.title,type:values.type,startsAt:new Date(values.startsAt+':00+03:00').toISOString(),endsAt:new Date(values.endsAt+':00+03:00').toISOString(),capacity:Number(values.capacity),pricePerSeatMinor,locationName:values.locationName,latitude:Number(values.latitude),longitude:Number(values.longitude),...(form.dataset.tripId?{expectedUpdatedAt:form.dataset.version}:{requestId:form.dataset.requestId})}}catch(error){feedback.textContent=error.message||'تحقق من بيانات الرحلة.';return}
   form.dataset.busy='true';button.disabled=true;feedback.textContent='جارٍ حفظ الرحلة…';
   try{if(!(await authorize(host,version,session)))return;const id=form.dataset.tripId,response=await auth().authorizedFetch('/center/me/trips'+(id?'/'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);if(!current(host,version,session))return;if(!response.ok)throw new Error(data?.message||'تعذر حفظ الرحلة.');document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed'));await open('تم حفظ الرحلة. يمكنك مراجعتها ثم فتح الحجز.')}catch(error){if(current(host,version,session))feedback.textContent=error.message||'تعذر حفظ الرحلة.'}finally{delete form.dataset.busy;button.disabled=false}
 }
 async function publishTrip(button){
   if(button.disabled||!window.confirm('فتح هذه الرحلة للحجز؟ تبقى اشتراطات السلامة والطقس سارية.'))return;
   const article=button.closest('[data-center-trip]'),host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=article.querySelector('[data-trip-publish-feedback]');button.disabled=true;feedback.textContent='جارٍ فتح الحجز…';
   try{if(!(await authorize(host,version,session)))return;const response=await auth().authorizedFetch('/center/me/trips/'+encodeURIComponent(article.dataset.centerTrip)+'/publish',{method:'POST',body:JSON.stringify({expectedUpdatedAt:button.dataset.version})}),data=await response.json().catch(()=>null);if(!current(host,version,session))return;if(!response.ok)throw new Error(data?.message||'تعذر فتح الحجز.');document.dispatchEvent(new CustomEvent('hydroland:center-trips-changed'));await open('تم فتح الرحلة للحجز، مع استمرار تطبيق اشتراطات السلامة والطقس.')}catch(error){if(current(host,version,session))feedback.textContent=error.message||'تعذر فتح الحجز.'}finally{button.disabled=false}
 }
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.className='hl-center-operations';host.id='hl-center-operations';host.hidden=true;
   host.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>الرحلات والحجوزات</h2><p>رحلات المركز المُدار وحجوزاتها فقط.</p></div></header><div data-center-ops-list aria-live="polite"></div>';
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
   if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض حجوزات هذه الرحلة.':response.status===404?'الرحلة غير موجودة ضمن المركز المُدار.':rows?.message||'تعذر تحميل الحجوزات');
   if(!Array.isArray(rows))throw new Error('استجابة حجوزات الرحلة غير مكتملة.');
   let box=article.querySelector('[data-bookings]');if(!box){box=document.createElement('div');box.dataset.bookings='';article.append(box)}
   box.innerHTML=rows.length?rows.map(row=>`<div class="hl-member-row" data-center-booking="${esc(row.id)}"><b>حجز ${esc(String(row.id||'').slice(0,8)||'—')}</b><span>${esc(bookingStatus(row.status))} · ${count(row.seats)} مقعد</span><small>${esc([row.account?.person?.firstName,row.account?.person?.lastName].filter(Boolean).join(' ').trim()||'عميل')} · المشاركون: ${Array.isArray(row.participants)?row.participants.length:0}</small><small>تاريخ الحجز: ${esc(date(row.createdAt))} (توقيت الرياض)</small>${Array.isArray(row.participants)&&row.participants.length?`<ul aria-label="المشاركون">${row.participants.map(person=>`<li>${esc(person.fullName||'مشارك')} — ${esc(eligibility(person.eligibilityStatus))}</li>`).join('')}</ul>`:'<p>لم تُسجّل أسماء المشاركين بعد.</p>'}</div>`).join(''):'<p>لا توجد حجوزات لهذه الرحلة.</p>';
 }
 async function open(notice=''){
   if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-ops-list]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل رحلات المركز...</p>';
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/trips'),rows=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض رحلات هذا المركز.':rows?.message||'تعذر تحميل الرحلات');
     if(!Array.isArray(rows))throw new Error('استجابة رحلات المركز غير مكتملة. أعد المحاولة.');
     list.innerHTML=(notice?`<p role="status">${esc(notice)}</p>`:'')+editor()+(rows.length?rows.map(row=>`<article class="hl-course" data-center-trip="${esc(row.id)}"><div class="hl-course-top"><div><b>${esc(row.title||'رحلة المركز')}</b><small>${esc(date(row.startsAt))} (توقيت الرياض) · ${esc(tripType(row.type))}</small></div><span>${esc(tripStatus(row.status))}</span></div><small>السعة: ${count(row.capacity)} · الحجوزات: ${count(row._count?.bookings)}</small><p>${row.location?.locationName?`الموقع: ${esc(row.location.locationName)} · `:''}${Number.isSafeInteger(row.price?.pricePerSeatMinor)?`سعر المقعد: ${(row.price.pricePerSeatMinor/100).toFixed(2)} ريال`:'السعر غير محدد'}</p><button type="button" data-center-bookings>عرض الحجوزات</button>${row.status==='DRAFT'&&row.updatedAt?`${editor(row)}<button type="button" data-center-trip-publish data-version="${esc(row.updatedAt)}">فتح الحجز</button><p data-trip-publish-feedback role="status"></p>`:''}</article>`).join(''):'<p>لا توجد رحلات مرتبطة بهذا المركز حاليًا.</p>');
   }catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل الرحلات')}</p><button type="button" data-center-operations-retry>إعادة المحاولة</button>`}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function onClick(event){
   const host=event.currentTarget;
   const publish=event.target.closest?.('[data-center-trip-publish]');if(publish){void publishTrip(publish);return}
   if(event.target.closest?.('[data-center-operations-retry]')){void open();return}
   const button=event.target.closest?.('[data-center-bookings]');if(!button||button.disabled)return;
   const article=button.closest('[data-center-trip]');if(!article||!host.contains(article))return;
   const version=viewVersion,session=auth()?.getSessionVersion?.();button.disabled=true;
   let box=article.querySelector('[data-bookings]');if(!box){box=document.createElement('div');box.dataset.bookings='';article.append(box)}
   box.setAttribute('aria-busy','true');box.innerHTML='<p>جارٍ تحميل الحجوزات…</p>';
   try{await bookings(article.dataset.centerTrip,article,host,version,session)}
   catch(error){if(current(host,version,session)&&article.isConnected)box.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل الحجوزات')}</p>`}
   finally{button.disabled=false;box.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterOperations=Object.freeze({open});
})();
