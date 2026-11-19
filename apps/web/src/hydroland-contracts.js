(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("contracts", {
  "شعار هيدرولاند": "Hydroland logo",
  "يستخدم اسم المركز المسجل عند تركه فارغًا": "Uses the registered center name when blank",
  "هيدرولاند": "Hydroland",
  "العقود والتوقيع الإلكتروني": "Contracts and electronic signatures",
  "بيانات العضوية والمركز تلقائيًا، ثم قبول الطرفين وتوقيعهما ومراجعة هيدرولاند.": "Membership and center data are filled automatically, followed by both parties' acceptance/signatures and Hydroland review.",
  "مكتبة العقود": "Contract library",
  "تحديث": "Refresh",
  "عقد تعاون محترف غوص جديد": "New diving-professional cooperation contract",
  "مركز الغوص": "Dive center",
  "البريد المسجل للمحترف": "Professional's registered email",
  "اسم المركز على المستند": "Center name on the document",
  "شعار المركز (PNG أو JPEG حتى 2 ميجابايت)": "Center logo (PNG or JPEG, up to 2 MB)",
  "يُحفظ اسم المركز وشعاره لهذا الإصدار. يظهر شعار هيدرولاند بوصفه الهوية الرئيسية.": "The center name and logo are saved for this version. The Hydroland logo is the primary identity.",
  "إنشاء العقد": "Create contract",
  "عقودي": "My contracts",
  "تحميل عقود أقدم": "Load older contracts",
  "اختر عقدًا لعرض بياناته وحالة التوقيع والاعتماد.": "Select a contract to view its data, signature and approval status.",
  "قيد التعبئة": "Being completed",
  "بانتظار توقيع الطرفين": "Awaiting both parties' signatures",
  "بانتظار اعتماد هيدرولاند": "Awaiting Hydroland approval",
  "معتمد من هيدرولاند": "Approved by Hydroland",
  "مرفوض من هيدرولاند": "Rejected by Hydroland",
  "سجّل الدخول للمتابعة.": "Sign in to continue.",
  "تعذر إكمال إجراء العقد.": "Could not complete the contract action.",
  "· الإصدار": "· Version",
  "لا توجد عقود متاحة لهذا الحساب.": "No contracts are available for this account.",
  "عقد تعاون محترف غوص": "Diving-professional cooperation contract",
  "الإصدار": "Version",
  "بنود التعاون": "Cooperation clauses",
  "التوقيع والاعتماد": "Signature and approval",
  "ختم مركز الغوص": "Dive-center seal",
  "ختم المركز مستقل عن اعتماد هيدرولاند. قبول العقد لدى الجهة المختصة يخضع لمتطلباتها.": "The center seal is separate from Hydroland approval. Acceptance by the competent authority is subject to that authority's requirements.",
  "بصمة الإصدار": "Version hash",
  "التوقيع باسم الحساب المتحقق منه. ختم هيدرولاند اعتماد داخلي للمنصة.": "Sign using the verified account name. The Hydroland seal is internal platform approval.",
  "شعار المركز": "Center logo",
  "معاينة بيانات غير محفوظة": "Unsaved data preview",
  "بيانات مركز الغوص": "Dive-center data",
  "بيانات المحترف": "Professional data",
  "نطاق التعاون والشروط المالية": "Cooperation scope and financial terms",
  "لم يُستكمل": "Not completed",
  "ممثل المركز": "Center representative",
  "المحترف": "Professional",
  "بانتظار التوقيع": "Awaiting signature",
  "معتمد": "Approved",
  "اعتماد المنصة": "Platform approval",
  "موضع ختم هيدرولاند": "Hydroland seal position",
  "العقد مرفوض": "Contract rejected",
  "بانتظار الاعتماد": "Awaiting approval",
  "ثبّته ممثل المركز عند توقيع هذا الإصدار ·": "Applied by the center representative when signing this version ·",
  "ختم مركز الغوص المثبت على هذا الإصدار": "Dive-center seal pinned to this version",
  "بانتظار ختم المركز عند توقيع ممثله": "Awaiting center seal when its representative signs",
  "لا يوجد ختم مركز مثبت في سجل هذا الإصدار السابق": "No center seal is recorded for this historical version",
  "تعذر تحميل شعار المركز.": "Could not load the center logo.",
  "تعذر تحميل ختم المركز.": "Could not load the center seal.",
  "تنزيل العقد PDF": "Download contract PDF",
  "بيانات الطرفين من ملف العضوية وملف المركز": "Both parties' data from membership and center profiles",
  "تُحفظ بياناتهما تلقائيًا في هذا الإصدار. تُصحح البيانات في ملفها الأصلي، ثم يُحدّث العقد قبل التوقيع.": "Their data is saved automatically in this version. Correct data in its original profile, then update the contract before signing.",
  "معاينة العقد": "Preview contract",
  "سجل الإصدارات والإجراءات": "Version and action history",
  "يلزم استكمال:": "Required to complete:",
  "تحديث بيانات العضوية والمركز": "Refresh membership and center data",
  "فتح ملف المركز": "Open center profile",
  "فتح ملف عضويتي": "Open my membership profile",
  "تغيرت بيانات المصدر؛ يلزم تحديث العقد ومراجعته.": "Source data changed. Update and review the contract.",
  "بيانات المركز": "Center data",
  "نطاق التعاون والشروط": "Cooperation scope and terms",
  "حفظ البيانات": "Save data",
  "إرسال العقد للطرفين للتوقيع": "Send contract to both parties for signing",
  "التوقيع الإلكتروني": "Electronic signature",
  "اسمك المسجل للتوقيع": "Your registered signing name",
  "أؤكد قبول العقد بعد مراجعة بياناته وبنوده، وأوافق على توقيع هذا الإصدار إلكترونيًا باسمي.": "I accept the contract after reviewing its data and clauses, and agree to sign this version electronically in my name.",
  "وقّع العقد": "Sign contract",
  "صورة ختم المركز لهذا الإصدار (PNG أو JPEG حتى 2 ميجابايت)": "Center seal image for this version (PNG or JPEG, up to 2 MB)",
  "أقر بتفويضي لاستخدام ختم المركز المرفق على هذا الإصدار مع توقيعي.": "I confirm that I am authorized to use the attached center seal on this version with my signature.",
  "سبب القرار أو الملاحظات": "Decision reason or notes",
  "راجعت العقد والإصدار الحالي. إعادة العقد تلغي توقيعات هذا الإصدار وتستلزم التوقيع من جديد.": "I have reviewed the contract and current version. Returning the contract invalidates this version's signatures and requires signing again.",
  "قرار هيدرولاند وملاحظاتها": "Hydroland decision and notes",
  "طلب تعديل العقد": "Request contract changes",
  "اعتماد وإضافة ختم هيدرولاند": "Approve and add Hydroland seal",
  "إعادة للتعديل": "Return for changes",
  "رفض العقد": "Reject contract",
  "إضافة ملاحظة": "Add note",
  "رفض هيدرولاند": "Hydroland rejection",
  "ملاحظة هيدرولاند": "Hydroland note",
  "إرسال للتوقيع": "Send for signing",
  "توقيع ممثل المركز": "Center representative signature",
  "توقيع المحترف": "Professional signature",
  "اعتماد هيدرولاند": "Hydroland approval",
  "جارٍ تحميل العقد…": "Loading contract…",
  "تم تحميل الإصدار الحالي ببياناته المسجلة.": "Current version loaded with its recorded data.",
  "جارٍ تحميل العقود…": "Loading contracts…",
  "اعتمادك يضيف الختم بعد توقيع الطرفين على الإصدار نفسه.": "Your approval adds the seal after both parties sign the same version.",
  "افتح العقد لتعبئة حقولك والتوقيع.": "Open the contract to complete your fields and sign.",
  "تم حفظ الإجراء وتحديث العقد.": "Action saved and contract refreshed.",
  "احفظ البيانات قبل إرسال العقد أو التوقيع.": "Save data before sending or signing the contract.",
  "اختر صورة PNG أو JPEG بحجم لا يتجاوز 2 ميجابايت.": "Select a PNG or JPEG image no larger than 2 MB.",
  "تم إنشاء العقد وإتاحته للمحترف لتعبئة بياناته.": "Contract created and made available to the professional to complete their data.",
  "اختر صورة ختم PNG أو JPEG حتى 2 ميجابايت.": "Select a PNG or JPEG seal image up to 2 MB.",
  "تعذر إعداد نسخة PDF.": "Could not prepare the PDF.",
  "تم تنزيل الإصدار المحفوظ من العقد.": "Saved contract version downloaded."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if(window.HydrolandContracts)return;
  const host=document.getElementById('role-console');if(!host)return;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel=document.createElement('section');panel.id='hl-contracts';panel.className='hl-contracts';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<header class="hl-contract-heading"><div class="hl-contract-brand"><img src="./assets/hydroland-mark-reference.webp" alt="شعار هيدرولاند"><div><b>HYDROLAND</b><span>هيدرولاند</span></div></div><div><h2>العقود والتوقيع الإلكتروني</h2><p>بيانات العضوية والمركز تلقائيًا، ثم قبول الطرفين وتوقيعهما ومراجعة هيدرولاند.</p></div><div><button type="button" data-contract-library>مكتبة العقود</button> <button type="button" data-contract-refresh>تحديث</button></div></header>
    <p data-contract-note role="status" aria-live="polite"></p>
    <form data-contract-create hidden><h3>عقد تعاون محترف غوص جديد</h3><div class="hl-contract-grid"><label>مركز الغوص<select name="organizationId" required></select></label><label>البريد المسجل للمحترف<input name="professionalEmail" type="email" required maxlength="254" autocomplete="off"></label><label>اسم المركز على المستند<input name="centerName" maxlength="160" placeholder="يستخدم اسم المركز المسجل عند تركه فارغًا"></label><label>شعار المركز (PNG أو JPEG حتى 2 ميجابايت)<input name="centerLogo" type="file" accept="image/png,image/jpeg"></label></div><p>يُحفظ اسم المركز وشعاره لهذا الإصدار. يظهر شعار هيدرولاند بوصفه الهوية الرئيسية.</p><button type="submit">إنشاء العقد</button></form>
    <div class="hl-contract-layout"><aside><h3>عقودي</h3><div data-contract-list></div><button type="button" data-contract-more hidden>تحميل عقود أقدم</button></aside><div data-contract-detail><p>اختر عقدًا لعرض بياناته وحالة التوقيع والاعتماد.</p></div></div>`);
  host.insertAdjacentElement('afterend',panel);
  for(const weight of ['Regular','Bold']){const font=document.createElement('link');font.rel='preload';font.as='font';font.type='font/woff';font.crossOrigin='anonymous';font.href='./assets/fonts/Amiri-Contract-'+weight+'.woff';document.head.appendChild(font);}
  const style=document.createElement('link');style.rel='stylesheet';style.href='./hydroland-contracts.css';document.head.appendChild(style);
  let generation=0,active=null,items=[],cursor=null,busy=false,dirty=false,logoUrl=null,sealUrl=null;
  const auth=()=>window.HydrolandAuth;
  const session=()=>auth()?.getSessionVersion?.();
  const current=(g,s)=>g===generation&&s===session()&&auth()?.isAuthenticated?.();
  const message=text=>{uiLocale.setMessage(panel.querySelector('[data-contract-note]'), text)};
  const labels={DRAFT:'قيد التعبئة',AWAITING_SIGNATURES:'بانتظار توقيع الطرفين',AWAITING_PLATFORM_APPROVAL:'بانتظار اعتماد هيدرولاند',APPROVED:'معتمد من هيدرولاند',REJECTED:'مرفوض من هيدرولاند'};
  const date=value=>new Date(value).toLocaleString('ar-SA',{timeZone:'Asia/Riyadh'});
  const request=async(path,method='GET',body)=>{
    if(!auth()?.isAuthenticated?.())throw localError(uiLocale.message('سجّل الدخول للمتابعة.'));
    const response=await auth().authorizedFetch(path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
    const result=await response.json().catch(()=>null);
    if(!response.ok){if([401,403].includes(response.status))clear();throw localError((Array.isArray(result?.message) ? result.message.join('، ') : (result?.message || uiLocale.message('تعذر إكمال إجراء العقد.'))));}
    return result;
  };
  const revokeLogo=()=>{if(logoUrl)URL.revokeObjectURL(logoUrl);logoUrl=null;if(sealUrl)URL.revokeObjectURL(sealUrl);sealUrl=null};
  function clear(){generation++;active=null;items=[];cursor=null;busy=false;dirty=false;revokeLogo();panel.hidden=true;panel.querySelector('[data-contract-create]').reset();panel.querySelector('[data-contract-create]').hidden=true;panel.querySelector('[data-contract-list]').replaceChildren();panel.querySelector('[data-contract-detail]').replaceChildren();message('')}
  function list(){uiLocale.setHTML(panel.querySelector('[data-contract-list]'), items.length?items.map(c=>uiLocale.html`<button class="hl-contract-list-item" type="button" data-contract-open="${esc(c.id)}"><strong>${esc(c.referenceNumber)}</strong><span>${esc(c.values.center.legalName)}</span><small>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(labels[c.status]) || c.status))} · الإصدار ${esc(c.version)}</small></button>`).join(''):uiLocale.html`<p>لا توجد عقود متاحة لهذا الحساب.</p>`);panel.querySelector('[data-contract-more]').hidden=!cursor}
  function fieldValues(){
    const values={center:{},professional:{},terms:{}};
    for(const field of active.fields){const input=panel.querySelector(`[name="${field.section}.${field.key}"]`);values[field.section][field.key]=input?.value??active.values[field.section][field.key]??''}
    return values;
  }
  function preview(){
    if(!active)return;
    const values=fieldValues(),box=panel.querySelector('[data-contract-preview]');if(!box)return;
    uiLocale.setHTML(box, uiLocale.html`<header class="hl-contract-paper-head"><div class="hl-contract-brand"><img src="./assets/hydroland-mark-reference.webp" alt="شعار هيدرولاند"><div><b>HYDROLAND</b><span>هيدرولاند</span><small>DIVE · EXPLORE · PROTECT · BELONG</small></div></div><div class="hl-contract-paper-title"><h3>عقد تعاون محترف غوص</h3><p>العقود والتوقيع الإلكتروني</p></div></header><div class="hl-contract-center-strip"><div class="hl-contract-center-identity">${logoUrl?uiLocale.html`<img src="${esc(logoUrl)}" alt="شعار المركز">`:''}<div><small>مركز الغوص</small><strong>${esc(active.branding.name||values.center.legalName)}</strong></div></div></div><div class="hl-contract-paper-meta"><span>${esc(active.referenceNumber)}</span><span>الإصدار ${esc(active.version)}</span><span>${uiLocale.messageHTML((dirty ? uiLocale.message('معاينة بيانات غير محفوظة') : esc(labels[active.status]||active.status)))}</span></div>
      ${['center','professional','terms'].map(section=>uiLocale.html`<section><h4>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))({center:'بيانات مركز الغوص',professional:'بيانات المحترف',terms:'نطاق التعاون والشروط المالية'}[section]))}</h4><dl>${active.fields.filter(f=>f.section===section).map(f=>uiLocale.html`<div><dt>${esc(f.label)}</dt><dd>${uiLocale.messageHTML((values[section][f.key] || uiLocale.message('لم يُستكمل')))}</dd></div>`).join('')}</dl></section>`).join('')}
      <section><h4>بنود التعاون</h4><ol>${active.clauses.map(c=>uiLocale.html`<li>${esc(c)}</li>`).join('')}</ol></section>
      <section><h4>التوقيع والاعتماد</h4><div class="hl-contract-signatures">${['CENTER','PROFESSIONAL'].map(role=>{const s=active.signatures.find(s=>s.role===role);return uiLocale.html`<article><b>${uiLocale.messageHTML((role==='CENTER' ? uiLocale.message('ممثل المركز') : uiLocale.message('المحترف')))}</b><p>${uiLocale.messageHTML((s ? esc(s.name) : uiLocale.message('بانتظار التوقيع')))}</p>${s?uiLocale.html`<small>${esc(date(s.at))}</small>`:''}</article>`}).join('')}<article>${active.seal?uiLocale.html`<div class="hl-contract-seal"><b>HYDROLAND</b><strong>معتمد</strong><small>اعتماد المنصة</small></div><p>${esc(date(active.seal.at))}</p><small>${esc(active.seal.decisionId)}</small>`:uiLocale.html`<div class="hl-contract-seal-position"><b>موضع ختم هيدرولاند</b><small>${uiLocale.messageHTML((active.status==='REJECTED' ? uiLocale.message('العقد مرفوض') : uiLocale.message('بانتظار الاعتماد')))}</small></div>`}</article></div></section>
      <section><h4>ختم مركز الغوص</h4>${active.centerSeal?uiLocale.html`${sealUrl?uiLocale.html`<img class="hl-contract-center-seal" src="${esc(sealUrl)}" alt="ختم مركز الغوص المثبت على هذا الإصدار">`:''}<p>ثبّته ممثل المركز عند توقيع هذا الإصدار · ${esc(date(active.centerSeal.at))}</p><small>${esc(active.centerSeal.sealId)}</small>`:uiLocale.html`<p>${uiLocale.messageHTML((active.centerSealRequired ? uiLocale.message('بانتظار ختم المركز عند توقيع ممثله') : uiLocale.message('لا يوجد ختم مركز مثبت في سجل هذا الإصدار السابق')))}</p>`}<p>ختم المركز مستقل عن اعتماد هيدرولاند. قبول العقد لدى الجهة المختصة يخضع لمتطلباتها.</p></section><footer>بصمة الإصدار <bdi>${esc(active.contentHash)}</bdi><p>التوقيع باسم الحساب المتحقق منه. ختم هيدرولاند اعتماد داخلي للمنصة.</p></footer>`);
  }
  async function loadLogo(g,s,id){
    if(active?.centerSeal)void loadSeal(g,s,id);
    if(!active?.branding.logoAssetId)return;
    try{const response=await auth().authorizedFetch(`/contracts/cooperation/${encodeURIComponent(id)}/logo`);if(!response.ok)throw localError(uiLocale.message('تعذر تحميل شعار المركز.'));const blob=await response.blob();if(!current(g,s)||active?.id!==id)return;logoUrl=URL.createObjectURL(blob);preview()}
    catch(error){if(current(g,s)&&active?.id===id)message(localErrorMessage(error))}
  }
  async function loadSeal(g,s,id){
    const sealId=active?.centerSeal?.sealId;
    try{const response=await auth().authorizedFetch(`/contracts/cooperation/${encodeURIComponent(id)}/center-seal`);if(!response.ok)throw localError(uiLocale.message('تعذر تحميل ختم المركز.'));const blob=await response.blob();if(!current(g,s)||active?.id!==id||active?.centerSeal?.sealId!==sealId)return;if(sealUrl)URL.revokeObjectURL(sealUrl);sealUrl=URL.createObjectURL(blob);preview()}
    catch(error){if(current(g,s)&&active?.id===id)message(localErrorMessage(error))}
  }
  function render(){
    if(!active)return;
    const c=active,cap=c.capabilities;
    const canEdit=cap.editTerms;
    const missing=c.sources?.missing||[];
    uiLocale.setHTML(panel.querySelector('[data-contract-detail]'), uiLocale.html`<header class="hl-contract-detail-heading"><div><h3>${esc(c.referenceNumber)}</h3><p>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(labels[c.status]) || c.status))} · الإصدار ${esc(c.version)}</p></div><button type="button" data-contract-pdf>تنزيل العقد PDF</button></header>
      <aside class="hl-contract-source-notice"><b>بيانات الطرفين من ملف العضوية وملف المركز</b><p>تُحفظ بياناتهما تلقائيًا في هذا الإصدار. تُصحح البيانات في ملفها الأصلي، ثم يُحدّث العقد قبل التوقيع.</p>${missing.length?uiLocale.html`<p>يلزم استكمال: ${missing.map(f=>esc(f.label)).join('، ')}.</p>`:''}${cap.sync?uiLocale.html`<button type="button" data-contract-sync>تحديث بيانات العضوية والمركز</button>`:''}${cap.manageCenterProfile?uiLocale.html`<button type="button" data-contract-center-profile>فتح ملف المركز</button>`:''}${cap.manageMemberProfile?uiLocale.html`<button type="button" data-contract-member-profile>فتح ملف عضويتي</button>`:''}${c.sources?.changed?uiLocale.html`<p>تغيرت بيانات المصدر؛ يلزم تحديث العقد ومراجعته.</p>`:''}</aside><form data-contract-fields>${['center','professional','terms'].map(section=>uiLocale.html`<fieldset><legend>${uiLocale.messageHTML((value=>value===undefined?value:uiLocale.message(value))({center:'بيانات المركز',professional:'بيانات المحترف',terms:'نطاق التعاون والشروط'}[section]))}</legend><div class="hl-contract-grid">${c.fields.filter(f=>f.section===section).map(f=>{const enabled=section==='terms'&&cap.editTerms,type=/Date$/.test(f.key)?'date':'text',value=c.values[section][f.key]||'';return uiLocale.html`<label>${esc(f.label)}${f.max>500?uiLocale.html`<textarea name="${f.section}.${f.key}" rows="3" maxlength="${f.max}" ${enabled?'':'disabled'}>${esc(value)}</textarea>`:uiLocale.html`<input name="${f.section}.${f.key}" type="${type}" maxlength="${f.max}" value="${esc(value)}" ${enabled?'':'disabled'}>`}</label>`}).join('')}</div></fieldset>`).join('')}${canEdit?uiLocale.html`<button type="submit" data-contract-save>حفظ البيانات</button>`:''}</form>
      ${cap.issue?uiLocale.html`<button type="button" data-contract-issue>إرسال العقد للطرفين للتوقيع</button>`:''}
      <details open><summary>معاينة العقد</summary><article class="hl-contract-paper" data-contract-preview dir="rtl"></article></details>
      ${cap.sign?uiLocale.html`<form data-contract-sign><h3>التوقيع الإلكتروني</h3><label>اسمك المسجل للتوقيع<input name="signatureName" value="${esc(c.signatureName)}" required maxlength="240" readonly></label><label class="hl-contract-check"><input type="checkbox" name="consent" required>أؤكد قبول العقد بعد مراجعة بياناته وبنوده، وأوافق على توقيع هذا الإصدار إلكترونيًا باسمي.</label>${c.centerSealRequired&&cap.applyCenterSeal?uiLocale.html`<label>صورة ختم المركز لهذا الإصدار (PNG أو JPEG حتى 2 ميجابايت)<input name="centerSeal" type="file" accept="image/png,image/jpeg" required></label><label class="hl-contract-check"><input name="centerSealConsent" type="checkbox" required>أقر بتفويضي لاستخدام ختم المركز المرفق على هذا الإصدار مع توقيعي.</label>`:''}<button type="submit">وقّع العقد</button></form>`:''}
      ${cap.review||cap.return?uiLocale.html`<form data-contract-decision><h3>${uiLocale.messageHTML((cap.review ? uiLocale.message('قرار هيدرولاند وملاحظاتها') : uiLocale.message('طلب تعديل العقد')))}</h3><label>سبب القرار أو الملاحظات<textarea name="reason" minlength="5" maxlength="1000" required></textarea></label><label class="hl-contract-check"><input name="reviewed" type="checkbox" required>راجعت العقد والإصدار الحالي. إعادة العقد تلغي توقيعات هذا الإصدار وتستلزم التوقيع من جديد.</label>${cap.approve?uiLocale.html`<button type="submit" name="decision" value="APPROVE">اعتماد وإضافة ختم هيدرولاند</button>`:''}${cap.return?uiLocale.html`<button type="submit" name="decision" value="RETURN">إعادة للتعديل</button>`:''}${cap.review?uiLocale.html`<button type="submit" name="decision" value="REJECT">رفض العقد</button><button type="submit" name="decision" value="COMMENT">إضافة ملاحظة</button>`:''}</form>`:''}
      <details><summary>سجل الإصدارات والإجراءات</summary><ul class="hl-contract-history">${c.history.map(h=>uiLocale.html`<li>${uiLocale.messageHTML(((value=>value===undefined?value:uiLocale.message(value))(({CONTRACT_SOURCES_SYNCED:'تحديث بيانات العضوية والمركز',CONTRACT_PLATFORM_REJECTED:'رفض هيدرولاند',CONTRACT_PLATFORM_COMMENTED:'ملاحظة هيدرولاند',CONTRACT_CREATED:'إنشاء العقد',CONTRACT_FIELDS_SAVED:'حفظ البيانات',CONTRACT_ISSUED:'إرسال للتوقيع',CONTRACT_SIGN_CENTER:'توقيع ممثل المركز',CONTRACT_SIGN_PROFESSIONAL:'توقيع المحترف',CONTRACT_RETURNED:'إعادة للتعديل',CONTRACT_PLATFORM_APPROVED:'اعتماد هيدرولاند'})[h.action]) || h.action))} · الإصدار ${esc(h.version)} · ${esc(date(h.at))}${h.reason?' · '+esc(h.reason):''}</li>`).join('')}</ul></details>`);
    dirty=false;preview();
  }
  async function select(id){
    const g=++generation,s=session();active=null;dirty=false;revokeLogo();uiLocale.setMessage(panel.querySelector('[data-contract-detail]'), uiLocale.message('جارٍ تحميل العقد…'));
    try{const value=await request(`/contracts/cooperation/${encodeURIComponent(id)}`);if(!current(g,s))return;active=value;if(value.status==='DRAFT'&&value.sources?.changed){const updated=await request(`/contracts/cooperation/${encodeURIComponent(id)}/sync`,'POST',{expectedVersion:value.version,expectedContentHash:value.contentHash});if(!current(g,s))return;active=updated;}render();void loadLogo(g,s,id);message(uiLocale.message('تم تحميل الإصدار الحالي ببياناته المسجلة.'))}catch(error){if(current(g,s)){active=null;panel.querySelector('[data-contract-detail]').replaceChildren();message(localErrorMessage(error))}}
  }
  async function refresh(append=false){
    const g=++generation,s=session();active=null;dirty=false;revokeLogo();panel.querySelector('[data-contract-detail]').replaceChildren();message(uiLocale.message('جارٍ تحميل العقود…'));
    if(!append){items=[];cursor=null;list();panel.querySelector('[data-contract-create]').hidden=true}
    try{const [workspace,result]=await Promise.all([request('/contracts/cooperation/workspace'),request('/contracts/cooperation'+(append&&cursor?'?cursor='+encodeURIComponent(cursor):''))]);if(!current(g,s))return;items=append?[...items,...result.items]:result.items;cursor=result.nextCursor;list();const form=panel.querySelector('[data-contract-create]');form.hidden=!workspace.centers.length;uiLocale.setHTML(form.querySelector('select'), workspace.centers.map(c=>uiLocale.html`<option value="${esc(c.id)}">${esc(c.displayName)}</option>`).join(''));message((workspace.owner ? uiLocale.message('اعتمادك يضيف الختم بعد توقيع الطرفين على الإصدار نفسه.') : uiLocale.message('افتح العقد لتعبئة حقولك والتوقيع.')))}catch(error){if(current(g,s)){items=[];list();panel.querySelector('[data-contract-create]').hidden=true;message(localErrorMessage(error))}}
  }
  function controls(disabled){panel.querySelectorAll('button').forEach(b=>{b.disabled=disabled});if(!disabled&&dirty)panel.querySelectorAll('[data-contract-sync],[data-contract-issue],[data-contract-sign] button,[data-contract-decision] button').forEach(b=>b.disabled=true)}
  async function mutate(path,method,body){
    if(busy)return;busy=true;controls(true);const g=generation,s=session();
    try{const value=await request(path,method,body);if(!current(g,s))return;const brandChanged=active?.branding.logoAssetId!==value.branding.logoAssetId||active?.centerSeal?.sealId!==value.centerSeal?.sealId;active=value;if(brandChanged){revokeLogo();void loadLogo(g,s,value.id)}const i=items.findIndex(c=>c.id===value.id);if(i>=0)items[i]=value;else items.unshift(value);list();render();message(uiLocale.message('تم حفظ الإجراء وتحديث العقد.'))}catch(error){if(current(g,s))message(localErrorMessage(error))}finally{if(current(g,s)){busy=false;controls(false)}}
  }
  const expected=()=>({expectedVersion:active.version,expectedContentHash:active.contentHash});
  panel.addEventListener('input',event=>{if(!active||!event.target.closest('[data-contract-fields]'))return;dirty=true;preview();controls(busy);message(uiLocale.message('احفظ البيانات قبل إرسال العقد أو التوقيع.'));});
  panel.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.target;if(busy)return;
    if(form.matches('[data-contract-create]')){
      const data=new FormData(form),file=data.get('centerLogo'),orgId=data.get('organizationId'),name=String(data.get('centerName')||'').trim();
      const g=generation,s=session();busy=true;controls(true);
      try{
        let logoAssetId;
        if(file?.size){if(!['image/png','image/jpeg'].includes(file.type)||file.size>2_000_000)throw localError(uiLocale.message('اختر صورة PNG أو JPEG بحجم لا يتجاوز 2 ميجابايت.'));const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));if(!current(g,s))return;const asset=await request(`/documents/organizations/${encodeURIComponent(orgId)}/logo`,'POST',{mimeType:file.type,base64:btoa(binary)});logoAssetId=asset.id;}
        if(!current(g,s))return;
        if(name||logoAssetId)await request(`/documents/organizations/${encodeURIComponent(orgId)}/branding`,'PUT',{...(name?{brandNameAr:name}:{}),...(logoAssetId?{logoAssetId}:{})});
        if(!current(g,s))return;
        const value=await request('/contracts/cooperation','POST',{organizationId:orgId,professionalEmail:data.get('professionalEmail')});if(!current(g,s))return;active=value;items.unshift(value);revokeLogo();list();render();void loadLogo(g,s,value.id);message(uiLocale.message('تم إنشاء العقد وإتاحته للمحترف لتعبئة بياناته.'));
      }catch(error){if(current(g,s))message(localErrorMessage(error))}finally{if(current(g,s)){busy=false;controls(false)}}return;
    }
    if(!active)return;
    const path='/contracts/cooperation/'+encodeURIComponent(active.id),data=new FormData(form);
    if(form.matches('[data-contract-fields]')){const all=fieldValues(),values={terms:all.terms};await mutate(path+'/fields','PUT',{...expected(),values});}
    if(form.matches('[data-contract-sign]')&&!dirty){
      const g=generation,s=session(),revision=expected(),id=active.id;let centerSeal;
      const file=data.get('centerSeal');
      try{
        if(file?.size){if(!['image/png','image/jpeg'].includes(file.type)||file.size>2_000_000)throw localError(uiLocale.message('اختر صورة ختم PNG أو JPEG حتى 2 ميجابايت.'));const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));centerSeal={mimeType:file.type,base64:btoa(binary)};}
        if(!current(g,s)||active?.id!==id||active.version!==revision.expectedVersion||active.contentHash!==revision.expectedContentHash||dirty)return;
        await mutate(path+'/sign','POST',{...revision,signatureName:data.get('signatureName'),consent:data.get('consent')==='on',...(centerSeal?{centerSeal,centerSealConsent:data.get('centerSealConsent')==='on'}:{})});
      }catch(error){if(current(g,s)&&active?.id===id)message(localErrorMessage(error))}
    }
    if(form.matches('[data-contract-decision]')&&!dirty)await mutate(path+'/decision','POST',{...expected(),action:event.submitter?.value,reason:data.get('reason'),reviewed:data.get('reviewed')==='on'});
  });
  panel.addEventListener('click',async event=>{
    const button=event.target.closest('button');if(!button||busy)return;
    if(button.hasAttribute('data-contract-sync')&&active){await mutate('/contracts/cooperation/'+encodeURIComponent(active.id)+'/sync','POST',expected());return}
    if(button.hasAttribute('data-contract-member-profile')){window.HydrolandProfile?.edit?.();return}
    if(button.hasAttribute('data-contract-center-profile')){window.HydrolandCenterBusinessProfile?.open?.();return}
    if(button.hasAttribute('data-contract-open')){await select(button.dataset.contractOpen);return}
    if(button.hasAttribute('data-contract-library')){window.HydrolandContractLibrary?.open?.();return}
    if(button.hasAttribute('data-contract-refresh')){await refresh();return}
    if(button.hasAttribute('data-contract-more')){await refresh(true);return}
    if(button.hasAttribute('data-contract-issue')&&active&&!dirty)await mutate('/contracts/cooperation/'+encodeURIComponent(active.id)+'/issue','POST',expected());
    if(button.hasAttribute('data-contract-pdf')&&active){const g=generation,s=session();busy=true;controls(true);try{const response=await auth().authorizedFetch('/documents/'+encodeURIComponent(active.id)+'/pdf');if(!response.ok)throw localError(uiLocale.message('تعذر إعداد نسخة PDF.'));const blob=await response.blob();if(!current(g,s))return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=active.referenceNumber+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message(uiLocale.message('تم تنزيل الإصدار المحفوظ من العقد.'))}catch(error){if(current(g,s))message(localErrorMessage(error))}finally{if(current(g,s)){busy=false;controls(false)}}}
  });
  for(const event of ['hydroland:profile-data-ready','hydroland:center-profile-saved'])document.addEventListener(event,()=>{if(active?.status==='DRAFT'&&!dirty&&!busy&&!panel.hidden)void select(active.id)});
  document.addEventListener('hydroland:auth-changed',clear);
  document.addEventListener('hydroland:portal-role-revoked',clear);
  document.addEventListener('hydroland:role-changed',clear);
  window.HydrolandContracts={open:()=>{if(!auth()?.isAuthenticated?.()||!['center','instructor','admin'].includes(window.HydrolandPortalAccess?.getCurrentRole?.()))return;window.HydrolandWorkspaceUI?.show?.(panel);panel.hidden=false;void refresh();panel.scrollIntoView({block:'start'})},close:clear};
})();
