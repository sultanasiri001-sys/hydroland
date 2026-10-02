(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;let section=null,viewVersion=0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleDateString('ar-SA')};
 const count=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const ensure=()=>{if(section?.isConnected)return section;section=document.createElement('section');section.className='hl-center-customers';section.id='hl-center-customers';section.hidden=true;section.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>عملاء المركز</h2><p>ملخص العملاء المستمد من حجوزات رحلات المركز المُدار فقط.</p></div></header><div data-center-customers aria-live="polite"></div>';section.addEventListener('click',event=>{if(event.target.closest?.('[data-center-customers-retry]'))void open()});document.getElementById('main')?.prepend(section);return section};
 async function open(){
   if(!eligible()){clear();return}const host=ensure(),list=host.querySelector('[data-center-customers]'),version=++viewVersion,session=auth().getSessionVersion?.();
   const current=()=>version===viewVersion&&host.isConnected&&eligible()&&session===auth()?.getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل العملاء...</p>';
   try{const response=await auth().authorizedFetch('/center/me/customers'),rows=await response.json().catch(()=>null);if(!current())return;if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض عملاء هذا المركز.':rows?.message||'تعذر تحميل العملاء');if(!Array.isArray(rows))throw new Error('استجابة عملاء المركز غير مكتملة. أعد المحاولة.');list.innerHTML=rows.length?rows.map((row,index)=>`<article class="hl-course" data-center-customer="${index}"><div class="hl-course-top"><b>${esc(row.displayName||'عميل')}</b><span>${count(row.bookingCount)} حجز</span></div><small>الحجوزات المؤكدة: ${count(row.confirmedBookings)} · المقاعد: ${count(row.totalSeats)} · آخر حجز: ${esc(date(row.lastBookingAt))}</small></article>`).join(''):'<p>لا يوجد عملاء مرتبطون برحلات هذا المركز.</p>'}
   catch(error){if(current())list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل العملاء')}</p><button type="button" data-center-customers-retry>إعادة المحاولة</button>`}
   finally{if(current())list.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterCustomers=Object.freeze({open});
})();