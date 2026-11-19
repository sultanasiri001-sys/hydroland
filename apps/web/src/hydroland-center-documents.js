(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("center-documents", {
  "الرقم المرجعي الجديد": "New reference number",
  "عنوان السجل": "Record title",
  "إضافة رخصة أو تصريح": "Add license or permit",
  "ارفع الرخصة — PDF أو PNG أو JPEG، حتى 2 ميجابايت": "Upload the license — PDF, PNG or JPEG, up to 2 MB",
  "اختر الملف لقراءة بياناته تلقائيًا، ثم راجعها قبل الحفظ.": "Select a file to read its data automatically, then review it before saving.",
  "إيقاف القراءة وإدخال البيانات يدويًا": "Stop reading and enter data manually",
  "راجع بيانات الرخصة": "Review license data",
  "نوع السجل": "Record type",
  "رخصة": "License",
  "تصريح": "Permit",
  "شهادة": "Certificate",
  "موافقة تنظيمية": "Regulatory approval",
  "الوحدة المسؤولة": "Responsible unit",
  "تاريخ الإصدار الميلادي": "Gregorian issue date",
  "تاريخ الانتهاء الميلادي": "Gregorian expiry date",
  "راجعت البيانات والتواريخ وطابقتها مع الملف": "I have reviewed the data and dates and checked them against the file",
  "حفظ الرخصة": "Save license",
  "وحدة": "Unit",
  "إضافة رخصة تتطلب وحدة إدارية نشطة مرتبطة بالمركز.": "Adding a license requires an active administrative unit linked to the center.",
  "تعذرت قراءة الملف.": "Could not read the file.",
  "أكمل التاريخين لتحديد الصلاحية.": "Complete both dates to determine validity.",
  "يجب أن يكون الانتهاء بعد الإصدار.": "Expiry must be after issue.",
  "منتهية الصلاحية": "Expired",
  "لم تبدأ الصلاحية": "Validity has not started",
  "سارية بحسب التواريخ المدخلة": "Valid according to entered dates",
  "اختر ملف PDF أو PNG أو JPEG حتى 2 ميجابايت.": "Select a PDF, PNG or JPEG file up to 2 MB.",
  "جارٍ تجهيز قراءة الملف…": "Preparing to read the file…",
  "تمت قراءة البيانات المتاحة. راجعها وأكمل الحقول الناقصة؛ التواريخ غير الواضحة أو الهجرية تحتاج إدخالًا ميلاديًا.": "Available data has been read. Review it and complete missing fields. Unclear or Hijri dates require Gregorian entry.",
  "لم تظهر بيانات مؤكدة. أدخل بيانات الرخصة والتواريخ الميلادية يدويًا.": "No confirmed data was found. Enter license data and Gregorian dates manually.",
  "تعذرت القراءة التلقائية. أدخل البيانات يدويًا.": "Automatic reading failed. Enter data manually.",
  "ارفع الملف وراجع البيانات قبل الحفظ.": "Upload the file and review its data before saving.",
  "الرقم المرجعي مستخدم أو السجل السابق ما زال مسودة. اختر رقمًا جديدًا أو أكمل المسودة الموجودة.": "The reference number is in use or the previous record is still a draft. Choose a new number or complete the existing draft.",
  "تعذر حفظ الرخصة.": "Could not save the license.",
  "بانتظار مراجعة إدارة المنصة": "Awaiting platform administration review",
  "معتمدة من إدارة المنصة": "Approved by platform administration",
  "مرفوضة من إدارة المنصة": "Rejected by platform administration",
  "ملاحظات الإدارة:": "Administration notes:",
  "تاريخ القرار:": "Decision date:",
  "أضف سجل تجديد بالملف المصحح لإرسال طلب جديد، مع الاحتفاظ بالقرار السابق.": "Add a renewal record with the corrected file to submit a new request. The previous decision is retained.",
  "إرسال الرخصة لإدارة المنصة يقفل الملف والتواريخ للمراجعة.": "Sending the license to platform administration locks its file and dates for review.",
  "إرسال لاعتماد إدارة المنصة": "Submit for platform administration approval",
  "احفظ ملف الرخصة وتواريخها لإرسالها لاعتماد إدارة المنصة.": "Save the license file and dates before submitting for platform administration approval.",
  "تسجيل الرخصة يقفل المرفق والتواريخ. بعدها اختر وحدة المراجعة.": "Registering the license locks its attachment and dates. Then select a review unit.",
  "تسجيل الرخصة وقفل المرفق": "Register license and lock attachment",
  "أرفق الرخصة وتواريخها قبل تسجيلها للمراجعة.": "Attach the license and dates before registering for review.",
  "وحدة المراجعة": "Review unit",
  "إرسال للمراجعة الداخلية": "Submit for internal review",
  "الإرسال للمراجعة يتطلب وحدة نشطة أخرى داخل المركز.": "Review submission requires another active unit within the center.",
  "وحدة المراجعة:": "Review unit:",
  "· المراجع:": "· Reviewer:",
  "غير معيّن": "Unassigned",
  "قبول داخلي": "Internal acceptance",
  "رفض داخلي": "Internal rejection",
  "قيد المراجعة": "Under review",
  "مراجع مستقل": "Independent reviewer",
  "تعيين المراجع": "Assign reviewer",
  "لا يوجد مراجع مؤهل مستقل متاح في بوابة هذا المركز.": "No qualified independent reviewer is available in this center portal.",
  "قرار المراجعة الداخلية": "Internal review decision",
  "اختر القرار": "Select decision",
  "قبول": "Accept",
  "رفض": "Reject",
  "تسجيل القرار النهائي": "Record final decision",
  "تعذر تنفيذ إجراء المراجعة. حدّث السجل وحاول مجددًا.": "Could not complete the review action. Refresh the register and retry.",
  "تعذر تنفيذ إجراء المراجعة.": "Could not complete the review action.",
  "الصلاحية غير موثقة": "Validity undocumented",
  "ضمن فترة الصلاحية": "Within validity period",
  "لم تُطلب مراجعة داخلية": "Internal review not requested",
  "مقبولة بالمراجعة الداخلية": "Accepted by internal review",
  "مرفوضة بالمراجعة الداخلية": "Rejected by internal review",
  "بانتظار المراجعة الداخلية": "Awaiting internal review",
  "الإصدار:": "Version:",
  "· الانتهاء:": "· Expiry:",
  "آخر تحديث:": "Last updated:",
  "سجل تنظيمي": "Regulatory record",
  "بدون رقم مرجعي": "No reference number",
  "محفوظ — قابل للتعديل": "Saved — editable",
  "محفوظ — مقفل للمراجعة": "Saved — locked for review",
  "تنزيل المرفق": "Download attachment",
  "لا يوجد مرفق مرتبط": "No linked attachment",
  "تاريخ الإصدار": "Issue date",
  "تاريخ الانتهاء": "Expiry date",
  "مرفق الرخصة — PDF أو PNG أو JPEG، حتى 2 ميجابايت": "License attachment — PDF, PNG or JPEG, up to 2 MB",
  "حفظ المرفق والصلاحية": "Save attachment and validity",
  "المرفق مقفل بعد تسجيل السجل.": "Attachment is locked after registration.",
  "تجديد بسجل جديد": "Renew through a new record",
  "تبقى الرخصة السابقة كما هي. أرفق نسخة الرخصة المجددة بعد حفظ الرخصة.": "The previous license remains unchanged. Attach the renewed license after saving the license record.",
  "حفظ سجل التجديد": "Save renewal record",
  "اختر ملفًا بحجم لا يتجاوز 2 ميجابايت.": "Select a file no larger than 2 MB.",
  "تعذر حفظ المرفق.": "Could not save the attachment.",
  "تعذر تنزيل المرفق.": "Could not download the attachment.",
  "DIVE CENTER · مركز الغوص": "DIVE CENTER · Dive center",
  "المستندات والتراخيص": "Documents and licenses",
  "سجلات المركز التنظيمية والأصول المرفوعة ضمن نطاق المركز المُدار فقط.": "Center regulatory records and uploaded assets are limited to the managed center's scope.",
  "أدخل بيانات الملف وتواريخه الميلادية ثم احفظ الرخصة.": "Enter file data and Gregorian dates, then save the license.",
  "جارٍ تحميل مستندات المركز...": "Loading center documents...",
  "لا تملك صلاحية عرض مستندات هذا المركز.": "You do not have permission to view this center's documents.",
  "تعذر تحميل المستندات": "Could not load documents",
  "استجابة مستندات المركز غير مكتملة. أعد المحاولة.": "The center-documents response is incomplete. Try again.",
  "الملفات المرفوعة:": "Uploaded files:",
  "· التراخيص والتصاريح:": "· Licenses and permits:",
  "التراخيص والتصاريح": "Licenses and permits",
  "حالة المراجعة داخلية، ولا تمثل تحققًا من الجهة المصدرة للرخصة.": "Review status is internal and does not represent verification by the license issuer.",
  "لا توجد تراخيص أو تصاريح مرتبطة بهذا المركز.": "No licenses or permits are linked to this center.",
  "الملفات المرفوعة": "Uploaded files",
  "محفوظ": "Saved",
  "تاريخ الإضافة:": "Added on:",
  "مستند": "Document",
  "ملف": "File",
  "بايت": "bytes",
  "الحجم غير متاح": "Size unavailable",
  "لا توجد ملفات مرفوعة مرتبطة بهذا المركز.": "No uploaded files are linked to this center.",
  "إعادة المحاولة": "Retry",
  "{0} بايت": "{0} bytes"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? readerAuthoredErrorMessage?.(error) ?? error?.message;
  let readerAuthoredErrorMessage=null;


  const auth=()=>window.HydrolandAuth,access=()=>window.HydrolandPortalAccess;
  let section=null,viewVersion=0,readerController=null;
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const eligible=()=>Boolean(auth()?.isAuthenticated?.()&&access()?.roleAllowed?.('center')&&access()?.getCurrentRole?.()==='center');
  const date=value=>{if(!value)return '—';const parsed=new Date(value);return Number.isNaN(parsed.getTime())?'—':parsed.toLocaleString('ar-SA')};
  const clear=()=>{readerController?.abort();readerController=null;viewVersion++;section?.remove();section=null};
  const current=(host,version,session)=>host===section&&host.isConnected&&version===viewVersion&&eligible()&&session===auth()?.getSessionVersion?.();
  async function authorize(host,version,session){
    const centralized=access()?.authorizeRole;if(typeof centralized!=='function'){clear();return false}
    const valid=await centralized('center',{sessionVersion:session,isCurrent:()=>host===section&&host.isConnected&&version===viewVersion});
    if(!valid||!current(host,version,session)){if(host===section&&host.isConnected)clear();return false}return true
  }
  const identityFields=subject=>uiLocale.html`<label>الرقم المرجعي الجديد <input name="referenceNumber" maxlength="120" required></label><label>عنوان السجل <input name="subject" maxlength="240" value="${esc(subject||'')}" required></label>`;
  const createForm=units=>units.length?uiLocale.html`<details open><summary>إضافة رخصة أو تصريح</summary><form data-license-create><label>ارفع الرخصة — PDF أو PNG أو JPEG، حتى 2 ميجابايت <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required></label><p data-license-reading role="status">اختر الملف لقراءة بياناته تلقائيًا، ثم راجعها قبل الحفظ.</p><button type="button" data-license-manual hidden>إيقاف القراءة وإدخال البيانات يدويًا</button><fieldset data-license-fields hidden><legend>راجع بيانات الرخصة</legend>${identityFields('')}<label>نوع السجل <select name="type"><option value="LICENSE">رخصة</option><option value="PERMIT">تصريح</option><option value="CERTIFICATE">شهادة</option><option value="REGULATORY_APPROVAL">موافقة تنظيمية</option></select></label><label>الوحدة المسؤولة <select name="unitId" required>${units.map(unit=>uiLocale.html`<option value="${esc(unit.id)}">${uiLocale.messageHTML(((unit.nameAr || unit.nameEn) || uiLocale.message('وحدة')))}</option>`).join('')}</select></label><label>تاريخ الإصدار الميلادي <input name="issuedAt" type="date" required></label><label>تاريخ الانتهاء الميلادي <input name="expiresAt" type="date" required></label><p data-license-validity role="status"></p><label><input name="confirmed" type="checkbox" required> راجعت البيانات والتواريخ وطابقتها مع الملف</label><button type="submit">حفظ الرخصة</button></fieldset><p data-license-feedback role="status"></p></form></details>`:uiLocale.html`<p>إضافة رخصة تتطلب وحدة إدارية نشطة مرتبطة بالمركز.</p>`;
  const fileBase64=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(localError(uiLocale.message('تعذرت قراءة الملف.')));reader.readAsDataURL(file)});
  function previewValidity(form){
    const output=form.querySelector('[data-license-validity]');if(!output)return;
    const issue=form.elements.issuedAt.value,expiry=form.elements.expiresAt.value,today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Riyadh'}).format(new Date());
    uiLocale.setMessage(output, (!issue||!expiry ? uiLocale.message('أكمل التاريخين لتحديد الصلاحية.') : (expiry<=issue ? uiLocale.message('يجب أن يكون الانتهاء بعد الإصدار.') : (expiry<today ? uiLocale.message('منتهية الصلاحية') : (issue>today ? uiLocale.message('لم تبدأ الصلاحية') : uiLocale.message('سارية بحسب التواريخ المدخلة'))))));
  }
  async function readFile(form){
    readerController?.abort();const controller=new AbortController();readerController=controller;
    const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),file=form.elements.file.files[0],status=form.querySelector('[data-license-reading]'),fields=form.querySelector('fieldset'),manual=form.querySelector('[data-license-manual]');
    for(const name of ['referenceNumber','subject','issuedAt','expiresAt'])form.elements[name].value='';form.elements.confirmed.checked=false;fields.hidden=true;manual.hidden=true;
    if(!file)return;
    if(!file.size||file.size>2000000||!['application/pdf','image/png','image/jpeg'].includes(file.type)){uiLocale.setMessage(status, uiLocale.message('اختر ملف PDF أو PNG أو JPEG حتى 2 ميجابايت.'));form.elements.file.value='';return}
    manual.hidden=false;uiLocale.setMessage(status, uiLocale.message('جارٍ تجهيز قراءة الملف…'));
    try{
      const {readLicense,authoredErrorMessage}=await import('./hydroland-license-reader.mjs');readerAuthoredErrorMessage=authoredErrorMessage;
      if(controller.signal.aborted||!current(host,version,session))return;
      const values=await readLicense(file,{signal:controller.signal,onProgress:message=>{if(current(host,version,session)&&!controller.signal.aborted)uiLocale.setMessage(status, message)}});
      if(!current(host,version,session)||controller.signal.aborted)return;
      for(const [name,value] of Object.entries(values))form.elements[name].value=value;
      uiLocale.setMessage(status, (Object.keys(values).length ? uiLocale.message('تمت قراءة البيانات المتاحة. راجعها وأكمل الحقول الناقصة؛ التواريخ غير الواضحة أو الهجرية تحتاج إدخالًا ميلاديًا.') : uiLocale.message('لم تظهر بيانات مؤكدة. أدخل بيانات الرخصة والتواريخ الميلادية يدويًا.')));
      fields.hidden=false;manual.hidden=true;previewValidity(form);
    }catch(error){if(current(host,version,session)&&!controller.signal.aborted){uiLocale.setMessage(status, (localErrorMessage(error) || uiLocale.message('تعذرت القراءة التلقائية. أدخل البيانات يدويًا.')));fields.hidden=false;manual.hidden=true;previewValidity(form)}}
  }
  async function saveRecord(form){
    if(form.dataset.busy)return;
    const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=form.querySelector('[data-license-feedback]'),button=form.querySelector('[type="submit"]');
    const renewalId=form.dataset.licenseRenew,body={referenceNumber:form.elements.referenceNumber.value,subject:form.elements.subject.value};
    if(!renewalId){body.type=form.elements.type.value;body.unitId=form.elements.unitId.value;body.issuedAt=form.elements.issuedAt.value;body.expiresAt=form.elements.expiresAt.value}
    const file=!renewalId?form.elements.file.files[0]:null;
    form.dataset.busy='true';button.disabled=true;
    try{
      if(!(await authorize(host,version,session)))return;
      if(!renewalId){
        if(!file||!form.elements.confirmed.checked)throw localError(uiLocale.message('ارفع الملف وراجع البيانات قبل الحفظ.'));
        if(!body.issuedAt||!body.expiresAt||body.expiresAt<=body.issuedAt)throw localError(uiLocale.message('يجب أن يكون الانتهاء بعد الإصدار.'));
        body.mimeType=file.type;body.base64=await fileBase64(file);
        if(!current(host,version,session))return;
      }
      const endpoint='/center/me/licenses'+(renewalId?'/'+encodeURIComponent(renewalId)+'/renew':'/save');
      const response=await auth().authorizedFetch(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      const data=await response.json().catch(()=>null);if(!current(host,version,session))return;
      if(!response.ok)throw localError((response.status===409 ? uiLocale.message('الرقم المرجعي مستخدم أو السجل السابق ما زال مسودة. اختر رقمًا جديدًا أو أكمل المسودة الموجودة.') : (data?.message || uiLocale.message('تعذر حفظ الرخصة.'))));
      await open();
    }catch(error){if(current(host,version,session))uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر حفظ الرخصة.')))}
    finally{delete form.dataset.busy;button.disabled=false}
  }
  const platformReview=row=>{
    const status=row.licenseReviewStatus;
    const labels={PENDING:'بانتظار مراجعة إدارة المنصة',APPROVED:'معتمدة من إدارة المنصة',REJECTED:'مرفوضة من إدارة المنصة'};
    if(status)return uiLocale.html`<section data-license-platform-status><b>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(labels[status]) || status))}</b>${row.licenseReviewReason?uiLocale.html`<p>ملاحظات الإدارة: ${esc(row.licenseReviewReason)}</p>`:''}${row.licenseReviewDecidedAt?uiLocale.html`<small>تاريخ القرار: ${esc(date(row.licenseReviewDecidedAt))}</small>`:''}${status==='REJECTED'?uiLocale.html`<p>أضف سجل تجديد بالملف المصحح لإرسال طلب جديد، مع الاحتفاظ بالقرار السابق.</p>`:''}</section>`;
    return row.licenseAssetId&&['DRAFT','REGISTERED'].includes(row.status)?uiLocale.html`<form data-license-review-action="submit" data-license-target="${esc(row.id)}"><p>إرسال الرخصة لإدارة المنصة يقفل الملف والتواريخ للمراجعة.</p><button type="submit">إرسال لاعتماد إدارة المنصة</button><p data-license-feedback role="status"></p></form>`:uiLocale.html`<p>احفظ ملف الرخصة وتواريخها لإرسالها لاعتماد إدارة المنصة.</p>`;
  };
  const reviewControls=row=>{
    let html='';
    if(row.status==='DRAFT')html=row.licenseAssetId?uiLocale.html`<form data-license-review-action="register" data-license-target="${esc(row.id)}"><p>تسجيل الرخصة يقفل المرفق والتواريخ. بعدها اختر وحدة المراجعة.</p><button type="submit">تسجيل الرخصة وقفل المرفق</button><p data-license-feedback role="status"></p></form>`:uiLocale.html`<p>أرفق الرخصة وتواريخها قبل تسجيلها للمراجعة.</p>`;
    const routes=Array.isArray(row.routings)?row.routings:[],units=Array.isArray(row.reviewUnits)?row.reviewUnits:[];
    if(row.status==='REGISTERED'&&!routes.some(x=>!x.decision))html+=units.length?uiLocale.html`<form data-license-review-action="route" data-license-target="${esc(row.id)}"><label>وحدة المراجعة <select name="toUnitId" required>${units.map(unit=>uiLocale.html`<option value="${esc(unit.id)}">${esc(unit.nameAr||unit.nameEn)}</option>`).join('')}</select></label><button type="submit">إرسال للمراجعة الداخلية</button><p data-license-feedback role="status"></p></form>`:uiLocale.html`<p>الإرسال للمراجعة يتطلب وحدة نشطة أخرى داخل المركز.</p>`;
    html+=routes.map(route=>{
      const options=Array.isArray(route.reviewerOptions)?route.reviewerOptions:[];
      let result=uiLocale.html`<section data-license-review="${esc(route.id)}"><p>وحدة المراجعة: ${esc(route.unitName||'—')} · المراجع: ${uiLocale.messageHTML((route.reviewerName || uiLocale.message('غير معيّن')))}</p><p>${uiLocale.messageHTML((route.decision==='APPROVE' ? uiLocale.message('قبول داخلي') : (route.decision==='REJECT' ? uiLocale.message('رفض داخلي') : uiLocale.message('قيد المراجعة'))))}</p>`;
      if(!route.decision){
        result+=options.length?uiLocale.html`<form data-license-review-action="assign" data-license-target="${esc(route.id)}"><label>مراجع مستقل <select name="assigneeAccountId" required>${options.map(person=>uiLocale.html`<option value="${esc(person.id)}">${esc(person.name)}</option>`).join('')}</select></label><button type="submit">تعيين المراجع</button><p data-license-feedback role="status"></p></form>`:uiLocale.html`<p>لا يوجد مراجع مؤهل مستقل متاح في بوابة هذا المركز.</p>`;
        if(route.canDecide)result+=uiLocale.html`<form data-license-review-action="decide" data-license-target="${esc(route.id)}"><label>قرار المراجعة الداخلية <select name="decision" required><option value="">اختر القرار</option><option value="APPROVE">قبول</option><option value="REJECT">رفض</option></select></label><button type="submit">تسجيل القرار النهائي</button><p data-license-feedback role="status"></p></form>`;
      }
      return result+uiLocale.html`</section>`;
    }).join('');
    return html;
  };
  async function reviewAction(form){
    if(form.dataset.busy)return;
    const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=form.querySelector('[data-license-feedback]'),button=form.querySelector('[type="submit"]');
    const action=form.dataset.licenseReviewAction,id=encodeURIComponent(form.dataset.licenseTarget);
    const config={submit:{path:'/licenses/'+id+'/submit',method:'POST',body:{}},register:{path:'/licenses/'+id+'/register',method:'PATCH',body:{}},route:{path:'/licenses/'+id+'/reviews',method:'POST',body:{toUnitId:form.elements.toUnitId?.value}},assign:{path:'/license-reviews/'+id+'/assign',method:'PATCH',body:{assigneeAccountId:form.elements.assigneeAccountId?.value}},decide:{path:'/license-reviews/'+id+'/decision',method:'PATCH',body:{decision:form.elements.decision?.value}}}[action];
    if(!config)return;
    form.dataset.busy='true';button.disabled=true;
    try{
      if(!(await authorize(host,version,session)))return;
      const response=await auth().authorizedFetch('/center/me'+config.path,{method:config.method,headers:{'content-type':'application/json'},body:JSON.stringify(config.body)});
      const data=await response.json().catch(()=>null);if(!current(host,version,session))return;
      if(!response.ok)throw localError((data?.message || uiLocale.message('تعذر تنفيذ إجراء المراجعة. حدّث السجل وحاول مجددًا.')));
      await open();
    }catch(error){if(current(host,version,session))uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر تنفيذ إجراء المراجعة.')))}
    finally{delete form.dataset.busy;button.disabled=false}
  }
  const licenseCard=row=>{
    const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Riyadh'}).format(new Date()),expires=row.licenseExpiresAt?.slice(0,10);
    const validity=!expires?'الصلاحية غير موثقة':expires<today?'منتهية الصلاحية':row.licenseIssuedAt?.slice(0,10)>today?'لم تبدأ الصلاحية':'ضمن فترة الصلاحية';
    const routing=row.routings?.[0],review=!routing?'لم تُطلب مراجعة داخلية':routing.decision==='APPROVE'?'مقبولة بالمراجعة الداخلية':routing.decision==='REJECT'?'مرفوضة بالمراجعة الداخلية':'بانتظار المراجعة الداخلية';
    return uiLocale.html`<article class="hl-course" data-center-license="${esc(row.id)}"><div class="hl-course-top"><div><b>${uiLocale.messageHTML(((row.subject || row.type) || uiLocale.message('سجل تنظيمي')))}</b><small>${uiLocale.messageHTML((row.referenceNumber || uiLocale.message('بدون رقم مرجعي')))} · ${esc(row.type||'RECORD')}</small></div><span>${uiLocale.messageHTML((((value=>value===undefined?value:uiLocale.message(value))(({DRAFT:'محفوظ — قابل للتعديل',REGISTERED:'محفوظ — مقفل للمراجعة'})[row.status]) || row.status) || '—'))}</span></div><p>${uiLocale.messageHTML(uiLocale.message(validity))} · ${uiLocale.messageHTML(uiLocale.message(review))}</p><small>الإصدار: ${esc(row.licenseIssuedAt?.slice(0,10)||'—')} · الانتهاء: ${esc(expires||'—')}</small><p>${row.licenseAssetId ? uiLocale.html`<button type="button" data-license-download="${esc(row.id)}">تنزيل المرفق</button>` : uiLocale.messageHTML(uiLocale.message('لا يوجد مرفق مرتبط'))}</p>${row.status==='DRAFT'?uiLocale.html`<form data-license-attachment="${esc(row.id)}"><label>تاريخ الإصدار <input name="issuedAt" type="date" value="${esc(row.licenseIssuedAt?.slice(0,10)||'')}" required></label><label>تاريخ الانتهاء <input name="expiresAt" type="date" value="${esc(expires||'')}" required></label><label>مرفق الرخصة — PDF أو PNG أو JPEG، حتى 2 ميجابايت <input name="file" type="file" accept="application/pdf,image/png,image/jpeg" required></label><button type="submit">حفظ المرفق والصلاحية</button><p data-license-feedback role="status"></p></form>`:uiLocale.html`<small>المرفق مقفل بعد تسجيل السجل.</small><details><summary>تجديد بسجل جديد</summary><p>تبقى الرخصة السابقة كما هي. أرفق نسخة الرخصة المجددة بعد حفظ الرخصة.</p><form data-license-renew="${esc(row.id)}">${identityFields(row.subject)}<button type="submit">حفظ سجل التجديد</button><p data-license-feedback role="status"></p></form></details>`}<small>آخر تحديث: ${esc(date(row.updatedAt||row.createdAt))}</small><p data-license-download-feedback role="status"></p>${platformReview(row)}${reviewControls(row)}</article>`;
  };
  async function attach(form){
    if(form.dataset.busy)return;
    const host=section,version=viewVersion,session=auth()?.getSessionVersion?.(),feedback=form.querySelector('[data-license-feedback]'),button=form.querySelector('button[type="submit"]');
    const file=form.elements.file.files[0],issuedAt=form.elements.issuedAt.value,expiresAt=form.elements.expiresAt.value,id=form.dataset.licenseAttachment;
    form.dataset.busy='true';button.disabled=true;
    try{
      if(!file||!file.size||file.size>2000000)throw localError(uiLocale.message('اختر ملفًا بحجم لا يتجاوز 2 ميجابايت.'));
      if(!issuedAt||!expiresAt||expiresAt<=issuedAt)throw localError(uiLocale.message('يجب أن يكون الانتهاء بعد الإصدار.'));
      const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(localError(uiLocale.message('تعذرت قراءة الملف.')));reader.readAsDataURL(file)});
      if(!(await authorize(host,version,session)))return;
      const response=await auth().authorizedFetch('/center/me/licenses/'+encodeURIComponent(id)+'/attachment',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({mimeType:file.type,base64,issuedAt,expiresAt})});
      const data=await response.json().catch(()=>null);
      if(!current(host,version,session))return;
      if(!response.ok)throw localError((data?.message || uiLocale.message('تعذر حفظ المرفق.')));
      await open();
    }catch(error){if(current(host,version,session))uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر حفظ المرفق.')))}
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
      if(!response.ok)throw localError(uiLocale.message('تعذر تنزيل المرفق.'));
      const blob=await response.blob();if(!current(host,version,session))return;
      const extension=blob.type==='application/pdf'?'pdf':blob.type==='image/png'?'png':'jpg';
      const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='license.'+extension;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(error){if(current(host,version,session))uiLocale.setMessage(feedback, (localErrorMessage(error) || uiLocale.message('تعذر تنزيل المرفق.')))}
    finally{button.disabled=false}
  }
  const ensure=()=>{if(section?.isConnected)return section;section=document.createElement('section');section.className='hl-center-documents';section.id='hl-center-documents';section.hidden=true;uiLocale.setHTML(section, uiLocale.html`<header><div><small>DIVE CENTER · مركز الغوص</small><h2>المستندات والتراخيص</h2><p>سجلات المركز التنظيمية والأصول المرفوعة ضمن نطاق المركز المُدار فقط.</p></div></header><div data-center-documents aria-live="polite"></div>`);section.addEventListener('change',event=>{const form=event.target.closest?.('[data-license-create]');if(!form)return;if(event.target.name==='file')void readFile(form);else if(['issuedAt','expiresAt'].includes(event.target.name)){form.elements.confirmed.checked=false;previewValidity(form)}});section.addEventListener('click',event=>{const manual=event.target.closest?.('[data-license-manual]');if(manual){readerController?.abort();const form=manual.closest('form');manual.hidden=true;form.querySelector('fieldset').hidden=false;uiLocale.setMessage(form.querySelector('[data-license-reading]'), uiLocale.message('أدخل بيانات الملف وتواريخه الميلادية ثم احفظ الرخصة.'));previewValidity(form)}if(event.target.closest?.('[data-center-documents-retry]'))void open();const button=event.target.closest?.('[data-license-download]');if(button)void download(button)});section.addEventListener('submit',event=>{const reviewForm=event.target.closest?.('[data-license-review-action]');if(reviewForm){event.preventDefault();void reviewAction(reviewForm);return}const form=event.target.closest?.('[data-license-attachment]');if(form){event.preventDefault();void attach(form);return}const recordForm=event.target.closest?.('[data-license-create],[data-license-renew]');if(recordForm){event.preventDefault();void saveRecord(recordForm)}});document.getElementById('main')?.append(section);return section};
  async function open(){
    if(!eligible()){clear();return;}
    readerController?.abort();
    const host=ensure(),list=host.querySelector('[data-center-documents]'),version=++viewVersion,session=auth().getSessionVersion?.();
    host.hidden=false;window.HydrolandWorkspaceUI?.show?.(host);list.setAttribute('aria-busy','true');uiLocale.setHTML(list, uiLocale.html`<p>جارٍ تحميل مستندات المركز...</p>`);
    try{
      if(!(await authorize(host,version,session)))return;
      const response=await auth().authorizedFetch('/center/me/documents'),data=await response.json().catch(()=>null);
      if(!current(host,version,session))return;
      if(!response.ok)throw localError((response.status===403 ? uiLocale.message('لا تملك صلاحية عرض مستندات هذا المركز.') : (data?.message || uiLocale.message('تعذر تحميل المستندات'))));
      if(!Array.isArray(data?.assets)||!Array.isArray(data?.licenses))throw localError(uiLocale.message('استجابة مستندات المركز غير مكتملة. أعد المحاولة.'));
      const assets=data.assets,licenses=data.licenses,units=Array.isArray(data.units)?data.units:[];
      uiLocale.setHTML(list, createForm(units)+uiLocale.html`<p>الملفات المرفوعة: ${assets.length} · التراخيص والتصاريح: ${licenses.length}</p><h3>التراخيص والتصاريح</h3><p>حالة المراجعة داخلية، ولا تمثل تحققًا من الجهة المصدرة للرخصة.</p>`+
        (licenses.length?licenses.map(licenseCard).join(''):uiLocale.html`<p>لا توجد تراخيص أو تصاريح مرتبطة بهذا المركز.</p>`)+
        uiLocale.html`<h3>الملفات المرفوعة</h3>`+(assets.length?assets.map(row=>uiLocale.html`<article class="hl-course" data-center-asset="${esc(row.id)}"><div class="hl-course-top"><div><b>${uiLocale.messageHTML((row.kind || uiLocale.message('مستند')))}</b><small>${uiLocale.messageHTML((row.mimeType || uiLocale.message('ملف')))} · ${uiLocale.messageHTML((Number.isFinite(Number(row.byteSize)) ? uiLocale.message("{0} بايت", [Number(row.byteSize).toLocaleString('ar-SA')]) : uiLocale.message('الحجم غير متاح')))}</small></div><span>محفوظ</span></div><small>تاريخ الإضافة: ${esc(date(row.createdAt))}</small></article>`).join(''):uiLocale.html`<p>لا توجد ملفات مرفوعة مرتبطة بهذا المركز.</p>`));
    }catch(error){if(current(host,version,session))uiLocale.setHTML(list, uiLocale.html`<p role="alert">${uiLocale.messageHTML((error instanceof Error ? localErrorMessage(error) : uiLocale.message('تعذر تحميل المستندات')))}</p><button type="button" data-center-documents-retry>إعادة المحاولة</button>`)}
    finally{if(current(host,version,session))list.removeAttribute('aria-busy')}
  }
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,clear);
  for(const name of ['hydroland:auth-changed','hydroland:role-changed','hydroland:profile-data-ready'])document.addEventListener(name,()=>{if(!eligible())clear()});
  window.HydrolandCenterDocuments=Object.freeze({open});
})();