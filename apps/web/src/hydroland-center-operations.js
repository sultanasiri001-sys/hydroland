(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;let section=null,viewVersion=0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('ar-SA')};
 const count=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const ensure=()=>{if(section?.isConnected)return section;section=document.createElement('section');section.className='hl-center-operations';section.id='hl-center-operations';section.hidden=true;section.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>الرحلات والحجوزات</h2><p>رحلات المركز المُدار وحجوزاتها فقط.</p></div></header><div data-center-ops-list aria-live="polite"></div>';section.addEventListener('click',event=>{if(event.target.closest?.('[data-center-operations-retry]'))void open()});document.getElementById('main')?.prepend(section);return section};
 const authorize=async()=>{if(!eligible())return false;const freshness=window.HydrolandPortalFreshness;if(typeof freshness?.refresh!=='function'){clear();return false}const refreshed=await freshness.refresh();if(!refreshed){clear();return false}if(!eligible()){clear();return false}return true};
 async function bookings(tripId,article){
   if(!(await authorize())){clear();return}const session=auth().getSessionVersion?.(),requestVersion=viewVersion;
   const response=await auth().authorizedFetch('/center/me/trips/'+encodeURIComponent(tripId)+'/bookings'),rows=await response.json().catch(()=>null);
   if(!eligible()||session!==auth()?.getSessionVersion?.()||requestVersion!==viewVersion||!article.isConnected)return;
   if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض حجوزات هذه الرحلة.':response.status===404?'الرحلة غير موجودة ضمن المركز المُدار.':rows?.message||'تعذر تحميل الحجوزات');
   if(!Array.isArray(rows))throw new Error('استجابة حجوزات الرحلة غير مكتملة.');
   let box=article.querySelector('[data-bookings]');if(!box){box=document.createElement('div');box.dataset.bookings='';article.append(box)}
   box.innerHTML=rows.length?rows.map(row=>`<div class="hl-member-row" data-center-booking="${esc(row.id)}"><b>حجز ${esc(String(row.id||'').slice(0,8)||'—')}</b><span>${esc(row.status||'—')} · ${count(row.seats)} مقعد</span><small>${esc([row.account?.person?.firstName,row.account?.person?.lastName].filter(Boolean).join(' ').trim()||'عميل')} · المشاركون: ${Array.isArray(row.participants)?row.participants.length:0}</small></div>`).join(''):'<p>لا توجد حجوزات لهذه الرحلة.</p>';
 }
 async function open(){
   if(!eligible()){clear();return}const host=ensure(),list=host.querySelector('[data-center-ops-list]'),version=++viewVersion,session=auth().getSessionVersion?.(),current=()=>version===viewVersion&&host.isConnected&&eligible()&&session===auth()?.getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل رحلات المركز...</p>';
   try{const response=await auth().authorizedFetch('/center/me/trips'),rows=await response.json().catch(()=>null);if(!current())return;if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض رحلات هذا المركز.':rows?.message||'تعذر تحميل الرحلات');if(!Array.isArray(rows))throw new Error('استجابة رحلات المركز غير مكتملة. أعد المحاولة.');list.innerHTML=rows.length?rows.map(row=>`<article class="hl-course" data-center-trip="${esc(row.id)}"><div class="hl-course-top"><div><b>${esc(row.title||'رحلة المركز')}</b><small>${esc(date(row.startsAt))} · ${esc(row.type||'—')}</small></div><span>${esc(row.status||'—')}</span></div><small>السعة: ${count(row.capacity)} · الحجوزات: ${count(row._count?.bookings)}</small><button type="button" data-center-bookings>عرض الحجوزات</button></article>`).join(''):'<p>لا توجد رحلات مرتبطة بهذا المركز حاليًا.</p>'}
   catch(error){if(current())list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل الرحلات')}</p><button type="button" data-center-operations-retry>إعادة المحاولة</button>`}
   finally{if(current())list.removeAttribute('aria-busy')}
 }
 ensure().addEventListener('click',async event=>{const button=event.target.closest?.('[data-center-bookings]');if(!button)return;const article=button.closest('[data-center-trip]');if(!article)return;button.disabled=true;try{await bookings(article.dataset.centerTrip,article)}catch(error){if(eligible()&&article.isConnected)article.insertAdjacentHTML('beforeend',`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل الحجوزات')}</p>`)}finally{button.disabled=false}});
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterOperations=Object.freeze({open});
})();