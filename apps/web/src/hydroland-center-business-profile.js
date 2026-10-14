(()=>{
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;let section=null,viewVersion=0;
 const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const clear=()=>{viewVersion++;section?.remove();section=null};
 const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
 async function authorize(host,version,session){
   const centralized=access()?.authorizeRole;if(typeof centralized!=='function'){clear();return false}
   const valid=await centralized('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&version===viewVersion});
   if(!valid||!current(host,version,session)){if(host===section&&host.isConnected)clear();return false}return true
 }
 const editForm=o=>['ACTIVE','PENDING_REVIEW','REJECTED'].includes(o.status)&&o.updatedAt?`<details><summary>تعديل بيانات المركز</summary><form data-center-profile-edit="${esc(o.id)}" data-version="${esc(o.updatedAt)}"><label>اسم المركز <input name="displayName" value="${esc(o.displayName)}" maxlength="240" required></label><label>الاسم النظامي <input name="legalName" value="${esc(o.legalName||'')}" maxlength="240"></label><label>رقم السجل / الترخيص <input name="registrationNumber" value="${esc(o.registrationNumber||'')}" maxlength="120"></label><label>المنطقة <input name="regionCode" value="${esc(o.regionCode==='ASIR'?'عسير':o.regionCode||'')}" maxlength="32"></label>${o.status==='REJECTED'?'<p>حفظ البيانات المصححة يعيد المركز إلى انتظار المراجعة الإدارية.</p>':''}<button type="submit">حفظ بيانات المركز</button><p data-center-profile-feedback role="status"></p></form></details>`:'';
 async function save(form){
   if(form.dataset.busy)return;
   const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=form.querySelector('[data-center-profile-feedback]'),button=form.querySelector('[type=submit]');
   const body={expectedUpdatedAt:form.dataset.version};for(const name of ['displayName','legalName','registrationNumber','regionCode'])body[name]=form.elements[name].value;
   form.dataset.busy='true';button.disabled=true;feedback.textContent='جارٍ حفظ بيانات المركز…';
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/'+encodeURIComponent(form.dataset.centerProfileEdit)+'/business-profile',{method:'PATCH',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok)throw new Error(data?.message||'تعذر حفظ البيانات. حاول مجددًا.');
     document.dispatchEvent(new CustomEvent('hydroland:center-profile-saved',{detail:{organizationId:data?.id}}));
     await open('تم حفظ بيانات المركز.');
   }catch(error){if(current(host,version,session))feedback.textContent=error.message||'تعذر حفظ البيانات.'}
   finally{delete form.dataset.busy;button.disabled=false}
 }
 const ensure=()=>{if(section?.isConnected)return section;section=document.createElement('section');section.className='hl-center-business-profile';section.id='hl-center-business-profile';section.hidden=true;section.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>الملف التجاري للمركز</h2><p>بيانات المراكز المرتبطة بحسابك وحالة المراجعة الإدارية.</p></div></header><div data-center-business-profile aria-live="polite"></div>';section.addEventListener('click',event=>{if(event.target.closest?.('[data-center-business-profile-retry]'))void open()});section.addEventListener('submit',event=>{const form=event.target.closest?.('[data-center-profile-edit]');if(form){event.preventDefault();void save(form)}});document.getElementById('main')?.append(section);return section};
 async function open(notice=''){
   if(!eligible()){clear();return}const host=ensure(),list=host.querySelector('[data-center-business-profile]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل بيانات المركز...</p>';
   try{if(!(await authorize(host,version,session)))return;const response=await auth().authorizedFetch('/organizations/mine'),rows=await response.json().catch(()=>null);if(!current(host,version,session))return;if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض بيانات المركز.':'تعذر تحميل بيانات المركز.');if(!Array.isArray(rows)||rows.some(row=>!row?.organization||typeof row.organization.displayName!=='string'))throw new Error('استجابة بيانات المركز غير مكتملة. أعد المحاولة.');const centers=rows.filter(row=>row.status==='ACTIVE'&&['OWNER','ADMIN'].includes(row.role)&&row.organization.kind==='DIVE_CENTER');const statuses={PENDING_REVIEW:'بانتظار مراجعة الإدارة',ACTIVE:'نشط في المنصة',REJECTED:'مرفوض',SUSPENDED:'موقوف',ARCHIVED:'مؤرشف',DRAFT:'مسودة'};list.innerHTML=(notice?`<p role="status">${esc(notice)}</p>`:'')+(centers.length?centers.map((row,index)=>{const o=row.organization;return `<article class="hl-course" data-center-business-profile="${index}"><h3>${esc(o.displayName)}</h3><p>المنطقة: ${esc(o.regionCode==='ASIR'?'عسير':o.regionCode||'غير محددة')}</p><p>دورك: ${row.role==='OWNER'?'المالك':'مدير'}</p><p>حالة المركز: ${esc(statuses[o.status]||'غير معروفة')}</p><p>الاسم النظامي: ${esc(o.legalName||'غير مسجل')}</p><p>رقم السجل / الترخيص: ${esc(o.registrationNumber||'غير مسجل')}</p>${o.status==='PENDING_REVIEW'?'<p>يتطلب تفعيل المركز مراجعة إدارية مستقلة. لا يستطيع المالك اعتماد مركزه بنفسه.</p>':''}<small>حالة المركز في المنصة لا تُعد تحققًا من الترخيص لدى الجهة المصدرة.</small>${editForm(o)}</article>`}).join(''):'<p>لا يوجد مركز غوص مرتبط بحسابك بصفة مالك أو مدير.</p>') }
   catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل بيانات المركز')}</p><button type="button" data-center-business-profile-retry>إعادة المحاولة</button>`}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterBusinessProfile=Object.freeze({open});
})();