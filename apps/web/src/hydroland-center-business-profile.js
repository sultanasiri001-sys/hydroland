(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("center-business-profile", {
  "مرفوض": "Rejected",
  "غير مسجل": "Not recorded",
  "إعادة المحاولة": "Try again",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER",
  "تعديل بيانات المركز": "Edit center details",
  "اسم المركز": "Center name",
  "الاسم النظامي": "Legal name",
  "رقم السجل / الترخيص": "Registration / license number",
  "العنوان الوطني / عنوان المركز": "National address / center address",
  "منظمة التدريب ومرجع عضوية المركز": "Training agency and center membership reference",
  "المنطقة": "Region",
  "حفظ بيانات المركز": "Save center details",
  "عسير": "Aseer",
  "حفظ البيانات المصححة يعيد المركز إلى انتظار المراجعة الإدارية.": "Saving corrected details returns the center to pending administrative review.",
  "جارٍ حفظ بيانات المركز…": "Saving center details…",
  "تعذر حفظ البيانات. حاول مجددًا.": "Could not save the details. Try again.",
  "تم حفظ بيانات المركز.": "Center details saved.",
  "تعذر حفظ البيانات.": "Could not save the details.",
  "الملف التجاري للمركز": "Center business profile",
  "بيانات المراكز المرتبطة بحسابك وحالة المراجعة الإدارية.": "Centers linked to your account and their administrative review status.",
  "جارٍ تحميل بيانات المركز...": "Loading center details...",
  "لا تملك صلاحية عرض بيانات المركز.": "You do not have permission to view center details.",
  "تعذر تحميل بيانات المركز.": "Could not load center details.",
  "استجابة بيانات المركز غير مكتملة. أعد المحاولة.": "The center details response is incomplete. Try again.",
  "بانتظار مراجعة الإدارة": "Awaiting administrative review",
  "نشط في المنصة": "Active on the platform",
  "موقوف": "Suspended",
  "مؤرشف": "Archived",
  "مسودة": "Draft",
  "المنطقة:": "Region:",
  "دورك:": "Your role:",
  "حالة المركز:": "Center status:",
  "الاسم النظامي:": "Legal name:",
  "رقم السجل / الترخيص:": "Registration / license number:",
  "حالة المركز في المنصة لا تُعد تحققًا من الترخيص لدى الجهة المصدرة.": "A center's platform status does not verify its license with the issuing authority.",
  "غير محددة": "Not specified",
  "المالك": "Owner",
  "مدير": "Manager",
  "غير معروفة": "Unknown",
  "يتطلب تفعيل المركز مراجعة إدارية مستقلة. لا يستطيع المالك اعتماد مركزه بنفسه.": "Center activation requires an independent administrative review. An owner cannot approve their own center.",
  "لا يوجد مركز غوص مرتبط بحسابك بصفة مالك أو مدير.": "No dive center is linked to your account as an owner or manager.",
  "تعذر تحميل بيانات المركز": "Could not load center details"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

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
 const editForm=o=>['ACTIVE','PENDING_REVIEW','REJECTED'].includes(o.status)&&o.updatedAt?uiLocale.html`<details><summary>تعديل بيانات المركز</summary><form data-center-profile-edit="${esc(o.id)}" data-version="${esc(o.updatedAt)}"><label>اسم المركز <input name="displayName" value="${esc(o.displayName)}" maxlength="240" required></label><label>الاسم النظامي <input name="legalName" value="${esc(o.legalName||'')}" maxlength="240"></label><label>رقم السجل / الترخيص <input name="registrationNumber" value="${esc(o.registrationNumber||'')}" maxlength="120"></label><label>العنوان الوطني / عنوان المركز<input name="address" value="${esc(o.address||'')}" maxlength="300"></label><label>منظمة التدريب ومرجع عضوية المركز<input name="trainingMembershipReference" value="${esc(o.trainingMembershipReference||'')}" maxlength="300"></label><label>المنطقة <input name="regionCode" value="${esc(o.regionCode==='ASIR'?'عسير':o.regionCode||'')}" maxlength="32"></label>${(o.status==='REJECTED'?uiLocale.html`<p>حفظ البيانات المصححة يعيد المركز إلى انتظار المراجعة الإدارية.</p>`:'')}<button type="submit">حفظ بيانات المركز</button><p data-center-profile-feedback role="status"></p></form></details>`:'';
 async function save(form){
   if(form.dataset.busy)return;
   const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=form.querySelector('[data-center-profile-feedback]'),button=form.querySelector('[type=submit]');
   const body={expectedUpdatedAt:form.dataset.version};for(const name of ['displayName','legalName','registrationNumber','regionCode','address','trainingMembershipReference'])body[name]=form.elements[name].value;
   form.dataset.busy='true';button.disabled=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ بيانات المركز…'));
   try{
     if(!(await authorize(host,version,session)))return;
     const response=await auth().authorizedFetch('/center/'+encodeURIComponent(form.dataset.centerProfileEdit)+'/business-profile',{method:'PATCH',body:JSON.stringify(body)}),data=await response.json().catch(()=>null);
     if(!current(host,version,session))return;
     if(!response.ok)throw (value=>value?new Error(value):localError('تعذر حفظ البيانات. حاول مجددًا.'))(data?.message);
     document.dispatchEvent(new CustomEvent('hydroland:center-profile-saved',{detail:{organizationId:data?.id}}));
     await open(uiLocale.message('تم حفظ بيانات المركز.'));
   }catch(error){if(current(host,version,session))setLocalErrorText(feedback, error, 'تعذر حفظ البيانات.')}
   finally{delete form.dataset.busy;button.disabled=false}
 }
 const ensure=()=>{if(section?.isConnected)return section;section=document.createElement('section');section.className='hl-center-business-profile';section.id='hl-center-business-profile';section.hidden=true;uiLocale.setHTML(section, uiLocale.html`<header><div><small>DIVE CENTER · مركز الغوص</small><h2>الملف التجاري للمركز</h2><p>بيانات المراكز المرتبطة بحسابك وحالة المراجعة الإدارية.</p></div></header><div data-center-business-profile aria-live="polite"></div>`);section.addEventListener('click',event=>{if(event.target.closest?.('[data-center-business-profile-retry]'))void open()});section.addEventListener('submit',event=>{const form=event.target.closest?.('[data-center-profile-edit]');if(form){event.preventDefault();void save(form)}});document.getElementById('main')?.append(section);return section};
 async function open(notice=''){
   if(!eligible()){clear();return}const host=ensure(),list=host.querySelector('[data-center-business-profile]'),version=++viewVersion,session=auth().getSessionVersion?.();
   host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل بيانات المركز...</p>`);
   try{if(!(await authorize(host,version,session)))return;const response=await auth().authorizedFetch('/organizations/mine'),rows=await response.json().catch(()=>null);if(!current(host,version,session))return;if(!response.ok)throw localError(response.status===403?'لا تملك صلاحية عرض بيانات المركز.':'تعذر تحميل بيانات المركز.');if(!Array.isArray(rows)||rows.some(row=>!row?.organization||typeof row.organization.displayName!=='string'))throw localError('استجابة بيانات المركز غير مكتملة. أعد المحاولة.');const centers=rows.filter(row=>row.status==='ACTIVE'&&['OWNER','ADMIN'].includes(row.role)&&row.organization.kind==='DIVE_CENTER');const statuses={PENDING_REVIEW:'بانتظار مراجعة الإدارة',ACTIVE:'نشط في المنصة',REJECTED:'مرفوض',SUSPENDED:'موقوف',ARCHIVED:'مؤرشف',DRAFT:'مسودة'};uiLocale.setHTML(list, (notice?uiLocale.html`<p role="status">${uiLocale.messageHTML(notice)}</p>`:'')+(centers.length?centers.map((row,index)=>{const o=row.organization;return uiLocale.html`<article class="hl-course" data-center-business-profile="${index}"><h3>${esc(o.displayName)}</h3><p>المنطقة: ${esc(o.regionCode==='ASIR'?uiLocale.t('عسير'):o.regionCode||uiLocale.t('غير محددة'))}</p><p>دورك: ${uiLocale.messageHTML((row.role==='OWNER'?uiLocale.message('المالك'):uiLocale.message('مدير')))}</p><p>حالة المركز: ${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(statuses[o.status]) || uiLocale.message('غير معروفة')))}</p><p>الاسم النظامي: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('غير مسجل')))(o.legalName)}</p><p>رقم السجل / الترخيص: ${(value=>value?esc(value):uiLocale.messageHTML(uiLocale.message('غير مسجل')))(o.registrationNumber)}</p>${(o.status==='PENDING_REVIEW'?uiLocale.html`<p>يتطلب تفعيل المركز مراجعة إدارية مستقلة. لا يستطيع المالك اعتماد مركزه بنفسه.</p>`:'')}<small>حالة المركز في المنصة لا تُعد تحققًا من الترخيص لدى الجهة المصدرة.</small>${editForm(o)}</article>`}).join(''):uiLocale.html`<p>لا يوجد مركز غوص مرتبط بحسابك بصفة مالك أو مدير.</p>`)) }
   catch(error){if(current(host,version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${localErrorHTML((error instanceof Error?error:undefined), 'تعذر تحميل بيانات المركز')}</p><button type="button" data-center-business-profile-retry>إعادة المحاولة</button>`)}
   finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
 }
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
 window.HydrolandCenterBusinessProfile=Object.freeze({open});
})();