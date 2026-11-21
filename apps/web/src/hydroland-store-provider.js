(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = window.HydrolandI18n?.createScope("store-provider", {
  "تعذر تنفيذ الإجراء.": "Could not complete the action.",
  "مرتجعات السلع": "Goods returns",
  "عرض طلبات الإرجاع": "View return requests",
  "وقت استلام المرتجع": "Actual return receipt time",
  "تأكيد استلام المرتجع": "Confirm returned goods receipt",
  "لا توجد مرتجعات بانتظار الاستلام.": "No returns awaiting receipt.",
  "الكمية المطلوب إرجاعها": "Return quantity",
  "مراجعة المرتجعات المستلمة": "Review received returns",
  "أساس قبول الرد": "Refund eligibility basis",
  "سلعة غير مستعملة مؤهلة للإرجاع": "Eligible unused goods",
  "حق موثّق في رد الثمن": "Documented right to a refund",
  "مرجع دليل الفحص": "Inspection evidence reference",
  "تسجيل نتيجة الفحص": "Record inspection result",
  "حُفظت نتيجة الفحص.": "Inspection result saved.",
  "عدد المقاعد": "Number of seats",
  "إعادة المحاولة": "Try again",
  "مسودة": "Draft",
  "دورة": "Course",
  "البداية — توقيت الرياض": "Start — Riyadh time",
  "النهاية — توقيت الرياض": "End — Riyadh time",
  "الموقع": "Location",
  "السعر بالريال": "Price in SAR",
  "إدارة عروض المركز": "Manage center offers",
  "سلعة أو خدمة": "Goods or service",
  "عنوان الدورة": "Course title",
  "رمز البرنامج التدريبي": "Training program code",
  "اسم العرض": "Offer name",
  "رمز العرض الفريد": "Unique offer code",
  "نوع العرض": "Offer type",
  "سلعة": "Goods",
  "خدمة": "Service",
  "المخزون أو عدد وحدات الخدمة المتاحة": "Stock or available service units",
  "الوصف وشروط العرض": "Description and offer terms",
  "حالة العرض": "Offer status",
  "حفظ العرض": "Save offer",
  "تعديل العرض": "Edit offer",
  "إضافة": "Add",
  "منشور": "Published",
  "متوقف": "Paused",
  "إيقاف العرض": "Pause offer",
  "نشر العرض": "Publish offer",
  "حذف العرض": "Delete offer",
  "أوقف العرض لإزالته من المتجر. تُحفظ العروض المرتبطة بطلبات أو تسجيلات.": "Pause the offer to remove it from the store. Offers linked to orders or enrollments are retained.",
  "جارٍ تحميل عروض المركز...": "Loading center offers...",
  "استجابة العروض غير مكتملة.": "The offer response is incomplete.",
  "عروض": "Offers",
  "العروض المنشورة تظهر في المتجر للجميع. إيقاف العرض يمنع الطلبات الجديدة ويحفظ الطلبات والتسجيلات السابقة.": "Published offers appear in the store for everyone. Pausing an offer blocks new orders and retains previous orders and enrollments.",
  "تحديث العروض": "Refresh offers",
  "معاينة المتجر": "Preview store",
  "إدارة الرحلات والحجوزات": "Manage trips and bookings",
  "لا توجد عروض للمركز بعد.": "No center offers yet.",
  "أدخل السعر بمنزلتين عشريتين كحد أقصى.": "Enter a price with no more than two decimal places.",
  "تحقق من بيانات العرض.": "Check the offer details.",
  "جارٍ حفظ العرض...": "Saving offer...",
  "تم حفظ العرض.": "Offer saved.",
  "حذف هذا العرض نهائيًا؟": "Permanently delete this offer?",
  "تغيير حالة العرض؟ تبقى الطلبات والتسجيلات السابقة محفوظة.": "Change offer status? Previous orders and enrollments will be retained.",
  "تم حذف العرض.": "Offer deleted.",
  "تم تحديث حالة العرض.": "Offer status updated.",
  "إضافة {0}": "Add {0}"
}) || {t:value=>value,message(source,values=[]){return this.format(source,values)},messageHTML:value=>String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])),setMessage:(node,value)=>(node.textContent=value??''),label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))},attribute(name,text,values=[]){if(!['aria-label','aria-description','placeholder','title','alt'].includes(name))throw new TypeError('Invalid display attribute');return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'}};

  // Preserve provenance of local errors; provider and user messages remain opaque.
  const localErrors=new WeakMap();
  const localError=(source,values=[])=>{const error=new Error(uiLocale.format(source,values));localErrors.set(error,{source,values});return error;};
  const localErrorMessage=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.message(known.source,known.values):error?.message||uiLocale.message(fallback);};
  const localErrorHTML=(error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.label(known.source,known.values):error?.message?String(error.message).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])):uiLocale.label(fallback);};
  const setLocalErrorText=(node,error,fallback='')=>{const known=localErrors.get(error);return known?uiLocale.setText(node,known.source,known.values):error?.message?(node.textContent=error.message):uiLocale.setText(node,fallback);};

 const store=document.getElementById('store');if(!store)return;
 const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
 const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const toggle=document.createElement('button');toggle.type='button';toggle.hidden=true;toggle.dataset.storeManage='';uiLocale.setMessage(toggle, uiLocale.message('إدارة عروض المركز'));toggle.setAttribute('aria-expanded','false');
 store.querySelector('.section-heading').append(toggle);
 const panel=document.createElement('section');panel.className='hl-store-provider';panel.hidden=true;uiLocale.setAttribute(panel, "aria-label", 'إدارة عروض المركز');store.querySelector('.section-heading').after(panel);
 const style=document.createElement('style');style.textContent='#store .section-heading{flex-wrap:wrap}.hl-store-provider{padding:1rem;border:1px solid #27c4df;border-radius:1rem;margin:1rem 0}.hl-store-provider form{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:.8rem;padding:1rem 0}.hl-store-provider label{display:flex;flex-direction:column;gap:.35rem}.hl-store-provider input,.hl-store-provider textarea,.hl-store-provider select{width:100%;min-width:0;padding:.6rem;border:1px solid #6195ae;border-radius:.4rem;background:#08253a;color:#fff;font:inherit}.hl-store-provider button,.hl-store-provider summary{cursor:pointer;padding:.6rem}.hl-store-provider article{padding:1rem 0;border-top:1px solid #6195ae}.hl-store-provider [role=alert]{color:#ffd29a}';document.head.append(style);
 let version=0;
 const clear=()=>{version++;panel.replaceChildren();panel.hidden=true;toggle.hidden=!eligible();toggle.setAttribute('aria-expanded','false')};
 const live=(v,session)=>v===version&&eligible()&&session===auth()?.getSessionVersion?.()&&!panel.hidden;
 const authorize=async(v,session)=>{
   if(!live(v,session))return false;
   const ok=await access()?.authorizeRole?.('center',{sessionVersion:session,isCurrent:()=>live(v,session)});
   if(!ok||!live(v,session)){if(v===version)clear();return false}return true;
 };
 const request=async(path,options={})=>{const response=await auth().authorizedFetch(path,options),data=await response.json().catch(()=>null);if(!response.ok)throw (Array.isArray(data?.message)?new Error(data.message.join('، ')):(value=>value?new Error(value):localError('تعذر تنفيذ الإجراء.'))(data?.message));return data};
 const time=value=>value?new Date(new Date(value).getTime()+3*3600000).toISOString().slice(0,16):'';
 const input=(name,label,value='',attrs='')=>uiLocale.html`<label>${uiLocale.messageHTML(label)}<input name="${name}" value="${esc(value)}" ${attrs}></label>`;
 function editor(type,row=null){
   const course=type==='courses',title=course?'دورة':'سلعة أو خدمة';
   const fields=course?
     input('title', uiLocale.message('عنوان الدورة'), row?.title, 'required maxlength="240"')+input('courseCode', uiLocale.message('رمز البرنامج التدريبي'), row?.courseCode, 'required maxlength="80"')+input('locationName', uiLocale.message('الموقع'), row?.locationName, 'required maxlength="240"')+input('startsAt', uiLocale.message('البداية — توقيت الرياض'), time(row?.startsAt), 'type="datetime-local" required')+input('endsAt', uiLocale.message('النهاية — توقيت الرياض'), time(row?.endsAt), 'type="datetime-local" required')+input('capacity', uiLocale.message('عدد المقاعد'), row?.capacity, 'type="number" min="1" max="2147483647" step="1" required'):
     input('nameAr', uiLocale.message('اسم العرض'), row?.nameAr, 'required maxlength="240"')+input('sku', uiLocale.message('رمز العرض الفريد'), row?.sku, 'required maxlength="80"')+uiLocale.html`<label>نوع العرض<select name="kind"><option value="GOODS">سلعة</option><option value="SERVICE" ${row?.kind==='SERVICE'?'selected':''}>خدمة</option></select></label>`+input('stockQuantity', uiLocale.message('المخزون أو عدد وحدات الخدمة المتاحة'), row?.stockQuantity, 'type="number" min="0" max="2147483647" step="1" required');
   return uiLocale.html`<details><summary>${(row?uiLocale.messageHTML(uiLocale.message('تعديل العرض')):uiLocale.label("إضافة {0}", [uiLocale.message(title)]))}</summary><form data-offer-form data-type="${type}" data-id="${esc(row?.id||'')}" data-revision="${esc(row?.updatedAt||'')}" data-request-id="${row?'':crypto.randomUUID()}">${fields}${course?'':(window.HydrolandProductCatalog?.editor(row?.catalogDetails || {}, row?.currency) || '')}${input('price', uiLocale.message('السعر بالريال'), row?(row.priceMinor/100).toFixed(2):'', 'type="number" min="0" max="21474836.47" step="0.01" required')}<label>الوصف وشروط العرض<textarea name="description" maxlength="4000">${esc(row?.description||'')}</textarea></label><label>حالة العرض<select name="status">${[['DRAFT','مسودة'],['ACTIVE','منشور'],['INACTIVE','متوقف']].map(([value,label])=>uiLocale.html`<option value="${value}" ${row?.status===value?'selected':''}>${uiLocale.messageHTML(uiLocale.message(label))}</option>`).join('')}</select></label><button type="submit">حفظ العرض</button><p data-offer-feedback role="status"></p></form></details>`;
 }
 function rowHtml(type,row){
   const used=type==='courses'?row._count?.enrollments:row._count?.items;
   return uiLocale.html`<article data-managed-offer="${esc(row.id)}" data-type="${type}" data-revision="${esc(row.updatedAt)}"><h4>${esc(row.title||row.nameAr)}</h4><p>${uiLocale.messageHTML(((value=>value?uiLocale.message(value):value)(({DRAFT:'مسودة',ACTIVE:'منشور',INACTIVE:'متوقف'})[row.status]) || row.status))} · ${uiLocale.messageHTML((type==='courses'?uiLocale.message('دورة'):(row.kind==='SERVICE'?uiLocale.message('خدمة'):uiLocale.message('سلعة'))))}</p>${editor(type,row)}<button type="button" data-offer-status="${row.status==='ACTIVE'?'INACTIVE':'ACTIVE'}">${uiLocale.messageHTML((row.status==='ACTIVE'?uiLocale.message('إيقاف العرض'):uiLocale.message('نشر العرض')))}</button>${(row.status!=='ACTIVE'&&!used?uiLocale.html`<button type="button" data-offer-delete>حذف العرض</button>`:uiLocale.html`<small>أوقف العرض لإزالته من المتجر. تُحفظ العروض المرتبطة بطلبات أو تسجيلات.</small>`)}<p data-offer-action-feedback role="status"></p></article>`;
 }
 async function open(notice='',focusCourse=false){
   if(!eligible()){clear();return}
   window.HydrolandWorkspaceUI?.show?.(store);const heading=document.querySelector('[data-service-title]');if(heading)uiLocale.setMessage(heading, uiLocale.message('إدارة عروض المركز'));
   panel.hidden=false;toggle.setAttribute('aria-expanded','true');const v=++version,session=auth().getSessionVersion?.();uiLocale.setHTML(panel, uiLocale.html`<p>جارٍ تحميل عروض المركز...</p>`);
   try{
     if(!(await authorize(v,session)))return;
     const data=await request('/store/provider/catalog');if(!live(v,session))return;
     if(!data?.organization||!Array.isArray(data.products)||!Array.isArray(data.courses))throw localError('استجابة العروض غير مكتملة.');
     uiLocale.setHTML(panel, uiLocale.html`<h3>عروض ${esc(data.organization.displayName)}</h3><p>العروض المنشورة تظهر في المتجر للجميع. إيقاف العرض يمنع الطلبات الجديدة ويحفظ الطلبات والتسجيلات السابقة.</p>${(notice?uiLocale.html`<p role="status">${uiLocale.messageHTML(notice)}</p>`:'')}<button type="button" data-offer-refresh>تحديث العروض</button><button type="button" data-offer-preview>معاينة المتجر</button><button type="button" data-offer-trips>إدارة الرحلات والحجوزات</button>${editor('products')}${editor('courses')}<details><summary>مرتجعات السلع</summary><button type="button" data-list-returns>عرض طلبات الإرجاع</button><button type="button" data-reviewed-returns>مراجعة المرتجعات المستلمة</button><div data-return-queue></div></details><div data-managed-offers>${data.products.map(row=>rowHtml('products',row)).join('')}${data.courses.map(row=>rowHtml('courses',row)).join('')}${(!data.products.length&&!data.courses.length?uiLocale.html`<p>لا توجد عروض للمركز بعد.</p>`:'')}</div>`);
   const queue=panel.querySelector('[data-return-queue]');
   let queueVersion=0;
   const loadReturns=async(received=false)=>{
     if (!live(v,session)) return;
     const intent=++queueVersion;
     try {
       const rows=await request('/store/provider/returns'+(received?'?stage=received':''));
       if (!live(v,session) || intent!==queueVersion) return;
       if (received) {
         uiLocale.setHTML(queue,rows.map(row=>uiLocale.html`<form data-remedy-id="${esc(row.id)}"><b>${esc(row.title)} · ${esc(row.orderId)}</b><label>أساس قبول الرد <select name="basis" required><option value=""></option><option value="ELIGIBLE_UNUSED">سلعة غير مستعملة مؤهلة للإرجاع</option><option value="VERIFIED_RIGHT">حق موثّق في رد الثمن</option></select></label><label>مرجع دليل الفحص <input name="evidenceReference" maxlength="200" required></label><button>تسجيل نتيجة الفحص</button><span role="status"></span></form>`).join(''));
         queue.querySelectorAll('form').forEach(form=>form.addEventListener('submit',async event=>{
           event.preventDefault(); const button=form.querySelector('button'),message=form.querySelector('[role=status]');
           if(button.disabled || intent!==queueVersion || !live(v,session))return;
           button.disabled=true;
           try {
             await request('/store/provider/returns/'+encodeURIComponent(form.dataset.remedyId)+'/remedy',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(form)))});
             if(live(v,session)&&intent===queueVersion)uiLocale.setText(message,'حُفظت نتيجة الفحص.');
           }catch(error){if(live(v,session)&&intent===queueVersion)setLocalErrorText(message,error,'تعذر تنفيذ الإجراء.');}
           finally{button.disabled=false;}
         }));
         return;
       }
       uiLocale.setHTML(queue,rows.length?rows.map(row=>uiLocale.html`<form data-return-id="${esc(row.id)}"><b>${esc(row.title)} · ${esc(row.orderId)}</b><span>الكمية المطلوب إرجاعها ${esc(row.quantity)}</span><label>وقت استلام المرتجع <input type="datetime-local" name="receivedAt" required></label><button>تأكيد استلام المرتجع</button></form>`).join(''):uiLocale.html`<p>لا توجد مرتجعات بانتظار الاستلام.</p>`);
       queue.querySelectorAll('form').forEach(form=>form.addEventListener('submit',async event=>{
         event.preventDefault();
         const button=form.querySelector('button'); if(button.disabled||!live(v,session)||intent!==queueVersion)return;
         button.disabled=true;
         try {
           const receivedAt=new Date(new FormData(form).get('receivedAt')).toISOString();
           await request('/store/provider/returns/'+encodeURIComponent(form.dataset.returnId)+'/receipt',{method:'POST',body:JSON.stringify({receivedAt})});
           if(live(v,session)&&intent===queueVersion)await loadReturns();
         }catch(error){if(live(v,session))setLocalErrorText(queue,error,'تعذر تنفيذ الإجراء.');}
         finally{button.disabled=false;}
       }));
     }catch(error){if(live(v,session))setLocalErrorText(queue,error,'تعذر تنفيذ الإجراء.');}

   };
   panel.querySelector('[data-list-returns]').addEventListener('click',()=>loadReturns(false));
   panel.querySelector('[data-reviewed-returns]').addEventListener('click',()=>loadReturns(true));
   if(focusCourse){const form=panel.querySelector('[data-offer-form][data-type="courses"][data-id=""]');if(form){form.closest('details').open=true;form.querySelector('[name=title]')?.focus({preventScroll:true});form.scrollIntoView({behavior:'instant',block:'start'})}}
   }catch(error){if(live(v,session))uiLocale.setHTML(panel, uiLocale.html`<p role="alert">${localErrorHTML(error, '')}</p><button type="button" data-offer-refresh>إعادة المحاولة</button>`)}
 }
 async function save(form){
   if(form.dataset.busy)return;
   const values=Object.fromEntries(new FormData(form)),feedback=form.querySelector('[data-offer-feedback]');let body;
   try{
     if(!/^\d+(\.\d{1,2})?$/.test(values.price))throw localError('أدخل السعر بمنزلتين عشريتين كحد أقصى.');
     const [whole,fraction='']=values.price.split('.'),priceMinor=Number(whole)*100+Number(fraction.padEnd(2,'0'));
     body={description:values.description,priceMinor,status:values.status,...(form.dataset.id?{expectedUpdatedAt:form.dataset.revision}:{requestId:form.dataset.requestId})};
     if(form.dataset.type==='courses')Object.assign(body,{title:values.title,courseCode:values.courseCode,locationName:values.locationName,startsAt:new Date(values.startsAt+':00+03:00').toISOString(),endsAt:new Date(values.endsAt+':00+03:00').toISOString(),capacity:Number(values.capacity)});
     else Object.assign(body,{...(window.HydrolandProductCatalog ? {catalogDetails:window.HydrolandProductCatalog.read(form,{},priceMinor)} : {}),nameAr:values.nameAr,sku:values.sku,kind:values.kind,stockQuantity:Number(values.stockQuantity)});
   }catch(error){setLocalErrorText(feedback, error, 'تحقق من بيانات العرض.');return}
   const v=version,session=auth()?.getSessionVersion?.(),button=form.querySelector('[type=submit]');form.dataset.busy='true';button.disabled=true;uiLocale.setMessage(feedback, uiLocale.message('جارٍ حفظ العرض...'));
   try{
     if(!(await authorize(v,session)))return;
     await request('/store/provider/'+form.dataset.type+(form.dataset.id?'/'+encodeURIComponent(form.dataset.id):''),{method:form.dataset.id?'PATCH':'POST',body:JSON.stringify(body)});
     if(!live(v,session))return;
     void window.HydrolandStore?.reloadProducts?.();await open(uiLocale.message('تم حفظ العرض.'));
   }catch(error){if(live(v,session))setLocalErrorText(feedback, error, '')}
   finally{delete form.dataset.busy;button.disabled=false}
 }
 async function act(button){
   const row=button.closest('[data-managed-offer]');if(!row||button.disabled)return;
   const remove=button.hasAttribute('data-offer-delete'),status=button.dataset.offerStatus;
   if(!window.confirm(remove?uiLocale.t('حذف هذا العرض نهائيًا؟'):uiLocale.t('تغيير حالة العرض؟ تبقى الطلبات والتسجيلات السابقة محفوظة.')))return;
   const v=version,session=auth()?.getSessionVersion?.(),feedback=row.querySelector('[data-offer-action-feedback]');button.disabled=true;
   try{
     if(!(await authorize(v,session)))return;
     await request('/store/provider/'+row.dataset.type+'/'+encodeURIComponent(row.dataset.managedOffer)+(remove?'':'/status'),{method:remove?'DELETE':'PATCH',body:JSON.stringify({expectedUpdatedAt:row.dataset.revision,...(!remove?{status}:{})})});
     if(!live(v,session))return;
     void window.HydrolandStore?.reloadProducts?.();await open((remove?uiLocale.message('تم حذف العرض.'):uiLocale.message('تم تحديث حالة العرض.')));
   }catch(error){if(live(v,session))setLocalErrorText(feedback, error, '')}
   finally{button.disabled=false}
 }
 const preview=()=>{if(!eligible()){clear();return}clear();window.HydrolandWorkspaceUI?.show?.(store);void window.HydrolandStore?.reloadProducts?.()};
 toggle.addEventListener('click',()=>panel.hidden?void open():preview());
 panel.addEventListener('submit',event=>{const form=event.target.closest('[data-offer-form]');if(form){event.preventDefault();void save(form)}});
 panel.addEventListener('click',event=>{if(event.target.closest('[data-offer-refresh]'))void open();else if(event.target.closest('[data-offer-preview]'))preview();else if(event.target.closest('[data-offer-trips]'))void window.HydrolandCenterOperations?.open?.();else{const button=event.target.closest('[data-offer-status],[data-offer-delete]');if(button)void act(button)}});
 for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
 for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear();queueMicrotask(()=>{toggle.hidden=!eligible()})});
 toggle.hidden=!eligible();window.HydrolandStoreProvider=Object.freeze({open,openCourses:()=>open('', true)});
})();
