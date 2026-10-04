(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 let section=null,viewVersion=0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'})};
 const tripStatus=value=>({DRAFT:'مسودة',OPEN:'مفتوحة للحجز',CLOSED:'مغلقة للحجز',CANCELLED:'ملغاة',COMPLETED:'مكتملة'}[value]||'غير معروفة');
 const bookingStatus=value=>({PENDING:'بانتظار التأكيد',CONFIRMED:'مؤكد',CANCELLED:'ملغى'}[value]||'غير معروفة');
 const eligibility=value=>({PENDING:'بانتظار مراجعة الأهلية',ELIGIBLE:'مؤهل',REJECTED:'غير مؤهل'}[value]||'تحتاج إلى مراجعة');
 const tripType=value=>({BOAT:'رحلة بحرية',SHORE:'غوص من الشاطئ'}[value]||value||'—');
 const count=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
 function ensure(){
   if(section?.isConnected)return section;
   const host=document.createElement('section');host.className='hl-center-operations';host.id='hl-center-operations';host.hidden=true;
   host.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>الرحلات والحجوزات</h2><p>رحلات المركز المُدار وحجوزاتها فقط.</p></div></header><div data-center-ops-list aria-live="polite"></div>';
   // The listener belongs to this instance, including after portal/session cleanup.
   host.addEventListener('click',onClick);
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
 async function open(){
   if(!eligible()){clear();return}
   const host=ensure(),list=host.querySelector('[data-center-ops-list]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل رحلات المركز...</p>';
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/me/trips'),rows=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض رحلات هذا المركز.':rows?.message||'تعذر تحميل الرحلات');
     if(!Array.isArray(rows))throw new Error('استجابة رحلات المركز غير مكتملة. أعد المحاولة.');
     list.innerHTML=rows.length?rows.map(row=>`<article class="hl-course" data-center-trip="${esc(row.id)}"><div class="hl-course-top"><div><b>${esc(row.title||'رحلة المركز')}</b><small>${esc(date(row.startsAt))} (توقيت الرياض) · ${esc(tripType(row.type))}</small></div><span>${esc(tripStatus(row.status))}</span></div><small>السعة: ${count(row.capacity)} · الحجوزات: ${count(row._count?.bookings)}</small><button type="button" data-center-bookings>عرض الحجوزات</button></article>`).join(''):'<p>لا توجد رحلات مرتبطة بهذا المركز حاليًا.</p>';
   }catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل الرحلات')}</p><button type="button" data-center-operations-retry>إعادة المحاولة</button>`}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 async function onClick(event){
   const host=event.currentTarget;
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
