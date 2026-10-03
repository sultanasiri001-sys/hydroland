(()=>{
  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  let section=null,viewVersion=0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
  const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('ar-SA')};
  const clear=()=>{viewVersion++;section?.remove();section=null};
  const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
  async function authorize(host,version,session){
    const centralized=access()?.authorizeRole;if(typeof centralized!=='function'){clear();return false}
    const valid=await centralized('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&version===viewVersion});
    if(!valid||!current(host,version,session)){if(host===section&&host.isConnected)clear();return false}return true
  }
  const identityFields=subject=>`<label>الرقم المرجعي الجديد <input name="referenceNumber" maxlength="120" required></label><label>عنوان السجل <input name="subject" maxlength="240" value="${esc(subject||'')}" required></label>`;
  const createForm=units=>units.length?`<details open><summary>إنشاء سجل رخصة جديد</summary><form data-license-create>${identityFields('')}<label>نوع السجل <select name="type"><option value="LICENSE">رخصة</option><option value="PERMIT">تصريح</option><option value="CERTIFICATE">شهادة</option><option value="REGULATORY_APPROVAL">موافقة تنظيمية</option></select></label><label>الوحدة المسؤولة <select name="unitId" required>${units.map(unit=>`<option value="${esc(unit.id)}">${esc(unit.nameAr||unit.nameEn||'وحدة')}</option>`).join('')}</select></label><button type="submit">إنشاء المسودة</button><p data-license-feedback role="status"></p></form></details>`:'<p>إنشاء سجل جديد يتطلب وحدة إدارية نشطة مرتبطة بالمركز.</p>';
  async function saveRecord(form){
    if(form.dataset.busy)return;
    const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=form.querySelector('[data-license-feedback]'),button=form.querySelector('[type="submit"]');
    const renewalId=form.dataset.licenseRenew,body={referenceNumber:form.elements.referenceNumber.value,subject:form.elements.subject.value};
    if(!renewalId){body.type=form.elements.type.value;body.unitId=form.elements.unitId.value}
    form.dataset.busy='true';button.disabled=true;
    try{
      if(!(await authorize(host,version,session)))return;
      const endpoint='/center/me/licenses'+(renewalId?'/'+encodeURIComponent(renewalId)+'/renew':'');
      const response=await auth().authorizedFetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      const data=await response.json().catch(()=>null);if(!current(host,version,session))return;
      if(!response.ok)throw new Error(response.status===409?'الرقم المرجعي مستخدم أو السجل السابق ما زال مسودة. اختر رقمًا جديدًا أو أكمل المسودة الموجودة.':data?.message||'تعذر إنشاء المسودة.');
      await open();
    }catch(error){if(current(host,version,session))feedback.textContent=error.message||'تعذر إنشاء المسودة.'}
    finally{delete form.dataset.busy;button.disabled=false}
  }
  const reviewControls=row=>{
    let html='';
    if(row.status==='DRAFT')html=row.licenseAssetId?`<form data-license-review-action="register" data-license-target="${esc(row.id)}"><p>تسجيل الرخصة يقفل المرفق والتواريخ. بعدها اختر وحدة المراجعة.</p><button type="submit">تسجيل الرخصة وقفل المرفق</button><p data-license-feedback role="status"></p></form>`:'<p>أرفق الرخصة وتواريخها قبل تسجيلها للمراجعة.</p>';
    const routes=Array.isArray(row.routings)?row.routings:[],units=Array.isArray(row.reviewUnits)?row.reviewUnits:[];
    if(row.status==='REGISTERED'&&!routes.some(x=>!x.decision))html+=units.length?`<form data-license-review-action="route" data-license-target="${esc(row.id)}"><label>وحدة المراجعة <select name="toUnitId" required>${units.map(unit=>`<option value="${esc(unit.id)}">${esc(unit.nameAr||unit.nameEn)}</option>`).join('')}</select></label><button type="submit">إرسال للمراجعة الداخلية</button><p data-license-feedback role="status"></p></form>`:'<p>الإرسال للمراجعة يتطلب وحدة نشطة أخرى داخل المركز.</p>';
    html+=routes.map(route=>{
      const options=Array.isArray(route.reviewerOptions)?route.reviewerOptions:[];
      let result=`<section data-license-review="${esc(route.id)}"><p>وحدة المراجعة: ${esc(route.unitName||'—')} · المراجع: ${esc(route.reviewerName||'غير معيّن')}</p><p>${route.decision==='APPROVE'?'قبول داخلي':route.decision==='REJECT'?'رفض داخلي':'قيد المراجعة'}</p>`;
      if(!route.decision){
        result+=options.length?`<form data-license-review-action="assign" data-license-target="${esc(route.id)}"><label>مراجع مستقل <select name="assigneeAccountId" required>${options.map(person=>`<option value="${esc(person.id)}">${esc(person.name)}</option>`).join('')}</select></label><button type="submit">تعيين المراجع</button><p data-license-feedback role="status"></p></form>`:'<p>لا يوجد مراجع مؤهل مستقل متاح في بوابة هذا المركز.</p>';
        if(route.canDecide)result+=`<form data-license-review-action="decide" data-license-target="${esc(route.id)}"><label>قرار المراجعة الداخلية <select name="decision" required><option value="">اختر القرار</option><option value="APPROVE">قبول</option><option value="REJECT">رفض</option></select></label><button type="submit">تسجيل القرار النهائي</button><p data-license-feedback role="status"></p></form>`;
      }
      return result+'</section>';
    }).join('');
    return html;
  };
  async function reviewAction(form){
    if(form.dataset.busy)return;
    const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=form.querySelector('[data-license-feedback]'),button=form.querySelector('[type="submit"]');
    const action=form.dataset.licenseReviewAction,id=encodeURIComponent(form.dataset.licenseTarget);
    const config={register:{path:'/licenses/'+id+'/register',method:'PATCH',body:{}},route:{path:'/licenses/'+id+'/reviews',method:'POST',body:{toUnitId:form.elements.toUnitId?.value}},assign:{path:'/license-reviews/'+id+'/assign',method:'PATCH',body:{assigneeAccountId:form.elements.assigneeAccountId?.value}},decide:{path:'/license-reviews/'+id+'/decision',method:'PATCH',body:{decision:form.elements.decision?.value}}}[action];
    if(!config)return;
    form.dataset.busy='true';button.disabled=true;
    try{
      if(!(await authorize(host,version,session)))return;
      const response=await auth().authorizedFetch('/center/me'+config.path,{method:config.method,headers:{'content-type':'application/json'},body:JSON.stringify(config.body)});
      const data=await response.json().catch(()=>null);if(!current(host,version,session))return;
      if(!response.ok)throw new Error(data?.message||'تعذر تنفيذ إجراء المراجعة. حدّث السجل وحاول مجددًا.');
      await open();
    }catch(error){if(current(host,version,session))feedback.textContent=error.message||'تعذر تنفيذ إجراء المراجعة.'}
    finally{delete form.dataset.busy;button.disabled=false}
  }
  const licenseCard=row=>{
    const today=new Date().toISOString().slice(0,10),expires=row.licenseExpiresAt?.slice(0,10);
    const validity=!expires?'الصلاحية غير موثقة':expires<today?'منتهية الصلاحية':row.licenseIssuedAt?.slice(0,10)>today?'لم تبدأ الصلاحية':'ضمن فترة الصلاحية';
    const routing=row.routings?.[0],review=!routing?'لم تُطلب مراجعة داخلية':routing.decision==='APPROVE'?'مقبولة بالمراجعة الداخلية':routing.decision==='REJECT'?'مرفوضة بالمراجعة الداخلية':'بانتظار المراجعة الداخلية';
    return `<article class="hl-course" data-center-license="${esc(row.id)}"><div class="hl-course-top"><div><b>${esc(row.subject||row.type||'سجل تنظيمي')}</b><small>${esc(row.referenceNumber||'بدون رقم مرجعي')} · ${esc(row.type||'RECORD')}</small></div><span>${esc(row.status||'—')}</span></div><p>${esc(validity)} · ${esc(review)}</p><small>الإصدار: ${esc(row.licenseIssuedAt?.slice(0,10)||'—')} · الانتهاء: ${esc(expires||'—')}</small><p>${row.licenseAssetId?`<button type="button" data-license-download="${esc(row.id)}">تنزيل المرفق</button>`:'لا يوجد مرفق مرتبط'}</p>${row.status==='DRAFT'?`<form data-license-attachment="${esc(row.id)}"><label>تاريخ الإصدار <input name="issuedAt" type="date" value="${esc(row.licenseIssuedAt?.slice(0,10)||'')}" required></label><label>تاريخ الانتهاء <input name="expiresAt" type="date" value="${esc(expires||'')}" required></label><label>مرفق الرخصة — PDF أو PNG أو JPEG، حتى 2 ميجابايت <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required></label><button type="submit">حفظ المرفق والصلاحية</button><p data-license-feedback role="status"></p></form>`:`<small>المرفق مقفل بعد تسجيل السجل.</small><details><summary>تجديد بسجل جديد</summary><p>تبقى الرخصة السابقة كما هي. أرفق نسخة الرخصة المجددة بعد إنشاء المسودة.</p><form data-license-renew="${esc(row.id)}">${identityFields(row.subject)}<button type="submit">إنشاء مسودة التجديد</button><p data-license-feedback role="status"></p></form></details>`}<small>آخر تحديث: ${esc(date(row.updatedAt||row.createdAt))}</small><p data-license-download-feedback role="status"></p>${reviewControls(row)}</article>`;
  };
  async function attach(form){
    if(form.dataset.busy)return;
    const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=form.querySelector('[data-license-feedback]'),button=form.querySelector('button[type="submit"]');
    const file=form.elements.file.files[0],issuedAt=form.elements.issuedAt.value,expiresAt=form.elements.expiresAt.value,id=form.dataset.licenseAttachment;
    form.dataset.busy='true';button.disabled=true;
    try{
      if(!file||!file.size||file.size>2000000)throw new Error('اختر ملفًا بحجم لا يتجاوز 2 ميجابايت.');
      if(!issuedAt||!expiresAt||expiresAt<=issuedAt)throw new Error('يجب أن يكون الانتهاء بعد الإصدار.');
      const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(new Error('تعذرت قراءة الملف.'));reader.readAsDataURL(file)});
      if(!(await authorize(host,version,session)))return;
      const response=await auth().authorizedFetch('/center/me/licenses/'+encodeURIComponent(id)+'/attachment',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({mimeType:file.type,base64,issuedAt,expiresAt})});
      const data=await response.json().catch(()=>null);
      if(!current(host,version,session))return;
      if(!response.ok)throw new Error(data?.message||'تعذر حفظ المرفق.');
      await open();
    }catch(error){if(current(host,version,session))feedback.textContent=error.message||'تعذر حفظ المرفق.'}
    finally{delete form.dataset.busy;button.disabled=false}
  }
  async function download(button){
    if(button.disabled)return;
    const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=button.closest('article').querySelector('[data-license-download-feedback]');
    button.disabled=true;
    try{
      if(!(await authorize(host,version,session)))return;
      const response=await auth().authorizedFetch('/center/me/licenses/'+encodeURIComponent(button.dataset.licenseDownload)+'/attachment');
      if(!current(host,version,session))return;
      if(!response.ok)throw new Error('تعذر تنزيل المرفق.');
      const blob=await response.blob();if(!current(host,version,session))return;
      const extension=blob.type==='application/pdf'?'pdf':blob.type==='image/png'?'png':'jpg';
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='license.'+extension;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){if(current(host,version,session))feedback.textContent=error.message||'تعذر تنزيل المرفق.'}
    finally{button.disabled=false}
  }
  const ensure=()=>{if(section?.isConnected)return section;section=document.createElement('section');section.className='hl-center-documents';section.id='hl-center-documents';section.hidden=true;section.innerHTML='<header><div><small>DIVE CENTER · مركز الغوص</small><h2>المستندات والتراخيص</h2><p>سجلات المركز التنظيمية والأصول المرفوعة ضمن نطاق المركز المُدار فقط.</p></div></header><div data-center-documents aria-live="polite"></div>';section.addEventListener('click',event=>{if(event.target.closest?.('[data-center-documents-retry]'))void open();const button=event.target.closest?.('[data-license-download]');if(button)void download(button)});section.addEventListener('submit',event=>{const reviewForm=event.target.closest?.('[data-license-review-action]');if(reviewForm){event.preventDefault();void reviewAction(reviewForm);return}const form=event.target.closest?.('[data-license-attachment]');if(form){event.preventDefault();void attach(form);return}const recordForm=event.target.closest?.('[data-license-create],[data-license-renew]');if(recordForm){event.preventDefault();void saveRecord(recordForm)}});document.getElementById('main')?.append(section);return section};
  async function open(){
    if(!eligible()){clear();return;}
    const host=ensure(),list=host.querySelector('[data-center-documents]'),version=++viewVersion,session=auth().getSessionVersion?.();
    host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');list.innerHTML='<p>جارٍ تحميل مستندات المركز...</p>';
    try{
      if(!(await authorize(host,version,session)))return;
      const response=await auth().authorizedFetch('/center/me/documents'),data=await response.json().catch(()=>null);
      if(!current(host,version,session))return;
      if(!response.ok)throw new Error(response.status===403?'لا تملك صلاحية عرض مستندات هذا المركز.':data?.message||'تعذر تحميل المستندات');
      if(!Array.isArray(data?.assets)||!Array.isArray(data?.licenses))throw new Error('استجابة مستندات المركز غير مكتملة. أعد المحاولة.');
      const assets=data.assets,licenses=data.licenses,units=Array.isArray(data.units)?data.units:[];
      list.innerHTML=createForm(units)+`<p>الملفات المرفوعة: ${assets.length} · التراخيص والتصاريح: ${licenses.length}</p><h3>التراخيص والتصاريح</h3><p>حالة المراجعة داخلية، ولا تمثل تحققًا من الجهة المصدرة للرخصة.</p>`+
        (licenses.length?licenses.map(licenseCard).join(''):'<p>لا توجد تراخيص أو تصاريح مرتبطة بهذا المركز.</p>')+
        '<h3>الملفات المرفوعة</h3>'+(assets.length?assets.map(row=>`<article class="hl-course" data-center-asset="${esc(row.id)}"><div class="hl-course-top"><div><b>${esc(row.kind||'مستند')}</b><small>${esc(row.mimeType||'ملف')} · ${Number.isFinite(Number(row.byteSize))?Number(row.byteSize).toLocaleString('ar-SA')+' بايت':'الحجم غير متاح'}</small></div><span>محفوظ</span></div><small>تاريخ الإضافة: ${esc(date(row.createdAt))}</small></article>`).join(''):'<p>لا توجد ملفات مرفوعة مرتبطة بهذا المركز.</p>');
    }catch(error){if(current(host,version,session))list.innerHTML=`<p role="alert">${esc(error instanceof Error?error.message:'تعذر تحميل المستندات')}</p><button type="button" data-center-documents-retry>إعادة المحاولة</button>`}
    finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
  }
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
  for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
  window.HydrolandCenterDocuments=Object.freeze({open});
})();