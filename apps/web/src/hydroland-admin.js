(() => {
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("admin", {
  "تفويض دفع حجوزات الجهات": "Organization booking payment mandate",
  "معرّف الجهة المصدرة": "Issuing organization ID",
  "معرّف المستند الموقّع": "Signed document ID",
  "مراجعة المستند": "Review signed document",
  "اعتماد القرار الموثق": "Approve documented decision",
  "المستند {0} · الإصدار {1} · وقّعه {2} في {3}": "Document {0} \u00b7 Version {1} \u00b7 Signed by {2} on {3}",
  "تعيين {0} بحد {1} هللة لكل عملية من {2} إلى {3}": "Appoint {0} with a limit of {1} halalas per payment from {2} until {3}",
  "إلغاء التفويض {0} للحساب {1}": "Revoke mandate {0} for account {1}",
  "اعتمدت المنصة القرار. معرّف التفويض {0}": "The platform approved the decision. Mandate ID {0}",
  "تعذرت مراجعة التفويض. تحقق من المعرّفات والصلاحية والتوقيع.": "Unable to review the mandate. Check identifiers, access and signature.",
  "تعذر اعتماد القرار. راجع الإصدار الحالي للمستند.": "Unable to approve the decision. Review the current document version.",
  "HYDROLAND / الإدارة": "HYDROLAND / Administration",
  "مركز التحكم التشغيلي": "Operational control center",
  "مراجعة الطلبات وإدارة الحسابات وسياسات التدقيق من بيانات المنصة الفعلية.": "Review requests and manage accounts and audit policies using actual platform data.",
  "تحديث البيانات": "Refresh data",
  "طلبات بانتظار المراجعة": "Requests awaiting review",
  "حجوزات نشطة": "Active bookings",
  "الحسابات المسجلة": "Registered accounts",
  "رحلات مفتوحة": "Open trips",
  "طابور المراجعة": "Review queue",
  "بانتظار الاتصال": "Awaiting connection",
  "سجّل الدخول بحساب إداري ثم حدّث البيانات لعرض الطلبات الفعلية.": "Sign in with an administrative account, then refresh to view actual requests.",
  "ضوابط الإدارة": "Administrative controls",
  "مفعل": "Enabled",
  "مركز سياسات التدقيق يتحكم في حالة كل شرط تشغيلي.": "The audit-policy center controls each operational requirement's status.",
  "كل بند يمكن أن يكون مفعّلًا أو موقوفًا أو تحت المراجعة.": "Each item can be enabled, paused or under review.",
  "كل تغيير في السياسة يُسجل في سجل التدقيق.": "Every policy change is recorded in the audit log.",
  "مراجعة الشهادات والمستندات": "Certificate and document review",
  "لا توجد بيانات محملة.": "No data loaded.",
  "بيانات الإدارة تظهر عند اتصال المنصة بخادم HYDROLAND.": "Administrative data appears when the platform connects to the HYDROLAND server.",
  "لا توجد طلبات معلقة حالياً.": "No requests are currently pending.",
  "حساب جديد": "New account",
  "طلب جهة / منظمة": "Organization request",
  "طلب تفعيل حساب": "Account activation request",
  "لا توجد شهادات بانتظار المراجعة.": "No certificates awaiting review.",
  "شهادة": "Certificate",
  "مستخدم": "User",
  "جهة غير محددة": "Organization not specified",
  "عرض:": "View:",
  "المستند": "Document",
  "تعذر إنشاء رابط المستند": "Could not create the document link",
  "تعذر فتح المستند": "Could not open the document",
  "لا يوجد مستند مرفق": "No document attached",
  "جهة التحقق الرسمية": "Official verification body",
  "رقم/مرجع التحقق": "Verification number/reference",
  "أدخل المرجع الظاهر في المصدر الرسمي": "Enter the reference shown in the official source",
  "مرجع التحقق الرسمي": "Official verification reference",
  "فتح التحقق الرسمي": "Open official verification",
  "حفظ دليل التحقق": "Save verification evidence",
  "سبب الرفض (5 أحرف على الأقل)": "Rejection reason (at least 5 characters)",
  "سبب رفض الشهادة": "Certificate rejection reason",
  "اعتماد الشهادة": "Approve certificate",
  "رفض الشهادة": "Reject certificate",
  "تعذر تحميل قائمة جهات التحقق الرسمية.": "Could not load official verification bodies.",
  "الشهادة الدولية لا تغني عن رخصة SWSDF للمحترف داخل السعودية.": "An international certificate does not replace an SWSDF license for professionals in Saudi Arabia.",
  "✓ دليل تحقق محفوظ": "✓ Verification evidence saved",
  "يلزم حفظ دليل تحقق رسمي قبل الاعتماد.": "Save official verification evidence before approval.",
  "أدخل مرجع تحقق من 3 أحرف على الأقل": "Enter a verification reference of at least 3 characters",
  "تم حفظ دليل التحقق الرسمي": "Official verification evidence saved",
  "تعذر حفظ دليل التحقق": "Could not save verification evidence",
  "احفظ دليل التحقق الرسمي قبل اعتماد الشهادة": "Save official verification evidence before approving the certificate",
  "اكتب سبب رفض من 5 أحرف على الأقل": "Enter a rejection reason of at least 5 characters",
  "تم اعتماد الشهادة": "Certificate approved",
  "تم رفض الشهادة": "Certificate rejected",
  "تعذر تحديث الشهادة": "Could not update the certificate",
  "يتطلب دخول إداري": "Administrative sign-in required",
  "جارٍ التحديث": "Refreshing",
  "متصل بالخادم": "Connected to server",
  "تعذر التحميل": "Could not load",
  "سجّل الدخول بحساب إداري لعرض البيانات الفعلية.": "Sign in with an administrative account to view actual data.",
  "تم تحديث بيانات الإدارة من خادم HYDROLAND.": "Administrative data refreshed from the HYDROLAND server.",
  "تعذر الاتصال": "Could not connect",
  "تعذر الوصول لخادم الإدارة. تأكد من تشغيل واجهة API وتسجيل الدخول بحساب إداري.": "Could not reach the administration server. Check that the API is running and you are signed in with an administrative account.",
  "{0} · {1}": "{0} · {1}",
  "عرض: {0}": "View: {0}",
  " الشهادة الدولية لا تغني عن رخصة SWSDF للمحترف داخل السعودية.": " An international certificate does not replace an SWSDF license for professionals in Saudi Arabia.",
  "✓ دليل تحقق محفوظ{0}": "✓ Verification evidence saved{0}"
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;


  if(!document.querySelector('script[src="./hydroland-warehouse-locations.js"]')){const node=document.createElement('script');node.src='./hydroland-warehouse-locations.js';node.defer=true;document.body.appendChild(node);}
  if(!document.querySelector('script[src="./hydroland-marketing-drafts.js"]')){const node=document.createElement('script');node.src='./hydroland-marketing-drafts.js';node.defer=true;document.body.appendChild(node);}
  for(const [tag,attribute,file] of [['link','href','hydroland-admin-accounts.css'],['script','src','hydroland-admin-accounts.js'],['link','href','hydroland-admin-employees.css'],['script','src','hydroland-admin-employees.js'],['script','src','hydroland-hr-control-review.js'],['script','src','hydroland-department-references.js'],['link','href','hydroland-admin-agents.css'],['script','src','hydroland-admin-agents.js']]){
    if(document.querySelector(`${tag}[${attribute}="./${file}"]`))continue;
    const node=document.createElement(tag);if(tag==='link')node.rel='stylesheet';else node.defer=true;node[attribute]='./'+file;(tag==='link'?document.head:document.body).appendChild(node);
  }
  if (!document.querySelector('link[href="./hydroland-training-certificate-admin.css"]')) {
    const link=document.createElement('link');link.rel='stylesheet';link.href='./hydroland-training-certificate-admin.css';document.head.appendChild(link);
  }
  if (!document.querySelector('script[src="./hydroland-training-certificate-admin.js"]')) {
    const module=document.createElement('script');module.src='./hydroland-training-certificate-admin.js';module.defer=true;document.body.appendChild(module);
  }
  if (!document.querySelector('script[src="./hydroland-payment-readiness.js"]')) {
    const module=document.createElement('script');module.src='./hydroland-payment-readiness.js';module.defer=true;document.body.appendChild(module);
  }
  if (!document.querySelector('script[src="./hydroland-center-license-admin.js"]')) {
    const module=document.createElement('script');module.src='./hydroland-center-license-admin.js';module.defer=true;document.body.appendChild(module);
  }
  if (!document.querySelector('script[src="./hydroland-booking-admin.js"]')) {
    const module = document.createElement('script'); module.src = './hydroland-booking-admin.js'; module.defer = true; document.body.appendChild(module);
  }
  if (!document.querySelector('script[src="./hydroland-weather-admin.js"]')) {
    const module = document.createElement('script'); module.src = './hydroland-weather-admin.js'; module.defer = true; document.body.appendChild(module);
  }
  if (!document.querySelector('script[src="./hydroland-calendar-admin.js"]')) {
    const module = document.createElement('script'); module.src = './hydroland-calendar-admin.js'; module.defer = true; document.body.appendChild(module);
  }
  if (!document.querySelector('link[href="./hydroland-policy-admin.css"]')) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = './hydroland-policy-admin.css'; document.head.appendChild(link);
  }
  if (!document.querySelector('script[src="./hydroland-policy-admin.js"]')) {
    const module = document.createElement('script'); module.src = './hydroland-policy-admin.js'; module.defer = true; document.body.appendChild(module);
  }

  const host = document.getElementById('role-console') || document.querySelector('main');
  if (!host) return;
  const box = document.createElement('section'); box.className = 'hl-admin'; box.hidden = true;
  uiLocale.setHTML(box, uiLocale.html`
    <div class="hl-admin__header"><div><span class="eyebrow">HYDROLAND / الإدارة</span><h2>مركز التحكم التشغيلي</h2><p>مراجعة الطلبات وإدارة الحسابات وسياسات التدقيق من بيانات المنصة الفعلية.</p></div><button class="btn btn-primary" type="button" data-admin-refresh>تحديث البيانات</button></div>
    <div class="hl-admin__metrics"><article><span>طلبات بانتظار المراجعة</span><strong data-admin-metric="pendingReviews">—</strong></article><article><span>حجوزات نشطة</span><strong data-admin-metric="activeBookings">—</strong></article><article><span>الحسابات المسجلة</span><strong data-admin-metric="accounts">—</strong></article><article><span>رحلات مفتوحة</span><strong data-admin-metric="openTrips">—</strong></article></div>
    <div class="hl-admin__grid"><article class="hl-admin__panel"><div class="hl-admin__panel-title"><h3>طابور المراجعة</h3><span data-admin-state>بانتظار الاتصال</span></div><div class="hl-admin__queue" data-admin-queue><p>سجّل الدخول بحساب إداري ثم حدّث البيانات لعرض الطلبات الفعلية.</p></div></article><article class="hl-admin__panel"><div class="hl-admin__panel-title"><h3>ضوابط الإدارة</h3><span>مفعل</span></div><ul><li>مركز سياسات التدقيق يتحكم في حالة كل شرط تشغيلي.</li><li>كل بند يمكن أن يكون مفعّلًا أو موقوفًا أو تحت المراجعة.</li><li>كل تغيير في السياسة يُسجل في سجل التدقيق.</li></ul></article><article class="hl-admin__panel hl-admin__credential-panel"><div class="hl-admin__panel-title"><h3>مراجعة الشهادات والمستندات</h3><span data-credential-review-state>بانتظار الاتصال</span></div><div class="hl-admin__queue" data-credential-review-list><p>لا توجد بيانات محملة.</p></div></article></div>
    <details class="hl-admin__panel" data-admin-mandate><summary>تفويض دفع حجوزات الجهات</summary>
      <form class="hl-admin__credential-card"><label>معرّف الجهة المصدرة <input name="issuer" required></label>
        <label>معرّف المستند الموقّع <input name="documentId" required></label>
        <button type="submit">مراجعة المستند</button><p data-mandate-document></p><p data-mandate-terms></p>
        <button type="button" data-mandate-approve disabled>اعتماد القرار الموثق</button><p role="status" data-mandate-status></p>
      </form></details>
    <p class="hl-admin__notice" data-admin-copy>بيانات الإدارة تظهر عند اتصال المنصة بخادم HYDROLAND.</p>`);
  host.insertAdjacentElement('afterend', box);

  const style=document.createElement('style');uiLocale.setMessage(style, `.hl-admin__credential-panel{grid-column:1/-1}.hl-admin__credential-card{display:grid;gap:.7rem;padding:.9rem;border:1px solid rgba(120,191,224,.18);border-radius:14px}.hl-admin__credential-card header{display:flex;justify-content:space-between;gap:1rem;align-items:start}.hl-admin__credential-card header small{display:block;color:#9fbccc;margin-top:.2rem}.hl-admin__credential-docs,.hl-admin__credential-actions,.hl-admin__credential-verify-actions{display:flex;gap:.45rem;flex-wrap:wrap}.hl-admin__credential-card button,.hl-admin__credential-card input,.hl-admin__credential-card select{border:1px solid rgba(120,191,224,.2);border-radius:10px;padding:.55rem .7rem;background:rgba(255,255,255,.045);color:#eaf7fb;font:inherit}.hl-admin__credential-card input,.hl-admin__credential-card select{min-width:min(260px,100%);flex:1}.hl-admin__credential-card button{font-weight:800}.hl-admin__credential-card button:disabled{opacity:.48;cursor:not-allowed}.hl-admin__credential-verification{display:grid;gap:.55rem;padding:.75rem;border:1px solid rgba(229,180,95,.24);border-radius:12px;background:rgba(229,180,95,.045)}.hl-admin__credential-verification-grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(220px,1fr);gap:.55rem}.hl-admin__credential-verification label{display:grid;gap:.25rem;font-size:.85rem;font-weight:800}.hl-admin__credential-verification small{color:#aac3d1;line-height:1.6}.hl-admin__credential-verification .ready{color:#b8e8c8;font-weight:800}.hl-admin__credential-verification .required{color:#f3d496;font-weight:800}@media(max-width:760px){.hl-admin__credential-verification-grid{grid-template-columns:1fr}}`);document.head.appendChild(style);
  const getBase = () => (window.HydrolandAuth?.apiBase || window.HYDROLAND_API_BASE || 'http://localhost:3001/api/v1').replace(/\/$/, '');
  const setNotice = message => { const notice=box.querySelector('[data-admin-copy]'); if(notice) uiLocale.setMessage(notice, message); };
  const renderQueue = items => { const queue=box.querySelector('[data-admin-queue]'); if(!queue)return; uiLocale.setMessage(queue, ''); if(!items.length){const empty=document.createElement('p');uiLocale.setMessage(empty, uiLocale.message('لا توجد طلبات معلقة حالياً.'));queue.appendChild(empty);return;} items.forEach(item=>{const name=item.account?.person?[item.account.person.firstName,item.account.person.lastName].filter(Boolean).join(' '):item.account?.email||uiLocale.t('حساب جديد');const type=item.type==='ORGANIZATION'?'طلب جهة / منظمة':'طلب تفعيل حساب';const article=document.createElement('article');article.className='hl-admin__queue-item';const strong=document.createElement('strong');uiLocale.setMessage(strong, name);const span=document.createElement('span');uiLocale.setMessage(span, uiLocale.message(type));article.append(strong,span);queue.appendChild(article);}); };
  const api=async(path,options={})=>{const client=window.HydrolandAuth?.authorizedFetch;if(!client)throw new Error('AUTH_REQUIRED');const response=await client(path,options),body=await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.message||`HTTP_${response.status}`);return body};
  const toast=message=>{const t=document.getElementById('toast');if(!t)return;uiLocale.setMessage(t, message);t.classList.add('visible');clearTimeout(window.__hlAdminCredentialToast);window.__hlAdminCredentialToast=setTimeout(()=>t.classList.remove('visible'),2400)};
  const mandateForm = box.querySelector('[data-admin-mandate] form');
  const approveMandate = mandateForm.querySelector('[data-mandate-approve]');
  const mandateStatus = mandateForm.querySelector('[data-mandate-status]');
  const documentSummary = mandateForm.querySelector('[data-mandate-document]');
  const termsSummary = mandateForm.querySelector('[data-mandate-terms]');
  let mandateReview = null;
  let mandateGeneration = 0;
  function clearMandate() {
    mandateGeneration++;
    mandateReview = null;
    approveMandate.disabled = true;
    for (const node of [documentSummary, termsSummary, mandateStatus]) uiLocale.setMessage(node, '');
  }
  function resetMandateForm() {
    clearMandate();
    mandateForm.reset();
    box.querySelector('[data-admin-mandate]').open = false;
  }
  mandateForm.addEventListener('input', clearMandate);
  for (const event of ['hydroland:auth-changed','hydroland:role-changed','hydroland:session-cleared','hydroland:portal-cleared']) {
    document.addEventListener(event, resetMandateForm);
  }
  mandateForm.addEventListener('submit', async event => {
    event.preventDefault();
    clearMandate();
    const generation = mandateGeneration;
    const organization = mandateForm.elements.issuer.value.trim();
    const documentId = mandateForm.elements.documentId.value.trim();
    if (!organization || !documentId || box.hidden) return;
    const path = '/organizations/' + encodeURIComponent(organization) + '/booking-payment-mandates/' + encodeURIComponent(documentId);
    try {
      const result = await api(path, {cache:'no-store'});
      if (generation !== mandateGeneration || box.hidden) return;
      const terms = result?.terms;
      if (result?.organizationId !== organization || result.documentId !== documentId || !Number.isSafeInteger(result.version)
        || !result.contentHash || !terms || !['APPOINT','REVOKE'].includes(terms.decision)) throw new Error('INVALID_PREVIEW');
      uiLocale.setMessage(documentSummary, uiLocale.message('المستند {0} · الإصدار {1} · وقّعه {2} في {3}', [result.referenceNumber,result.version,result.signedByAccountId,result.signedAt]));
      uiLocale.setMessage(termsSummary, terms.decision === 'APPOINT'
        ? uiLocale.message('تعيين {0} بحد {1} هللة لكل عملية من {2} إلى {3}', [terms.accountId,terms.limitMinor,terms.validFrom,terms.validUntil])
        : uiLocale.message('إلغاء التفويض {0} للحساب {1}', [terms.grantId,terms.accountId]));
      mandateReview = {path, version:result.version, hash:result.contentHash};
      approveMandate.disabled = false;
    } catch {
      if (generation === mandateGeneration) uiLocale.setMessage(mandateStatus, uiLocale.message('تعذرت مراجعة التفويض. تحقق من المعرّفات والصلاحية والتوقيع.'));
    }
  });
  approveMandate.addEventListener('click', async () => {
    if (!mandateReview || approveMandate.disabled || box.hidden) return;
    const generation = mandateGeneration, review = mandateReview;
    approveMandate.disabled = true;
    mandateReview = null;
    try {
      const receipt = await api(review.path + '/approve', {method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({expectedVersion:review.version,expectedContentHash:review.hash})});
      if (generation === mandateGeneration) uiLocale.setMessage(mandateStatus, uiLocale.message('اعتمدت المنصة القرار. معرّف التفويض {0}', [receipt.grantId]));
    } catch {
      if (generation === mandateGeneration) uiLocale.setMessage(mandateStatus, uiLocale.message('تعذر اعتماد القرار. راجع الإصدار الحالي للمستند.'));
    }
  });
  const reviewState={catalog:[]};
  const selectedCatalogEntry=select=>reviewState.catalog.find(item=>item.source===select.value)||reviewState.catalog[0]||null;

  function renderCredentialReviews(items){
    const list=box.querySelector('[data-credential-review-list]');if(!list)return;uiLocale.setMessage(list, '');
    if(!items.length){const empty=document.createElement('p');uiLocale.setMessage(empty, uiLocale.message('لا توجد شهادات بانتظار المراجعة.'));list.appendChild(empty);return}
    items.forEach(credential=>{
      const article=document.createElement('article');article.className='hl-admin__credential-card';article.dataset.credentialReview=credential.id;
      const header=document.createElement('header'),copy=document.createElement('div'),title=document.createElement('strong'),meta=document.createElement('small'),status=document.createElement('span');uiLocale.setMessage(title, (credential.title || uiLocale.message('شهادة')));const owner=[credential.person?.firstName,credential.person?.lastName].filter(Boolean).join(' ')||credential.person?.account?.email||uiLocale.t('مستخدم');uiLocale.setMessage(meta, uiLocale.message("{0} · {1}", [(credential.issuer || uiLocale.message('جهة غير محددة')), owner]));uiLocale.setMessage(status, (credential.verificationStatus || 'PENDING'));copy.append(title,meta);header.append(copy,status);article.appendChild(header);
      const docs=document.createElement('div');docs.className='hl-admin__credential-docs';(credential.documents||[]).forEach(documentRow=>{const button=document.createElement('button');button.type='button';uiLocale.setMessage(button, uiLocale.message("عرض: {0}", [(documentRow.originalName || uiLocale.message('المستند'))]));button.addEventListener('click',async()=>{button.disabled=true;try{const access=await api(`/credentials/admin/${encodeURIComponent(credential.id)}/documents/${encodeURIComponent(documentRow.id)}/access`);if(!access?.url)throw localError(uiLocale.message('تعذر إنشاء رابط المستند'));window.open(access.url,'_blank','noopener,noreferrer')}catch(error){toast((localErrorMessage(error) || uiLocale.message('تعذر فتح المستند')))}finally{button.disabled=false}});docs.appendChild(button)});if(!(credential.documents||[]).length){const empty=document.createElement('small');uiLocale.setMessage(empty, uiLocale.message('لا يوجد مستند مرفق'));docs.appendChild(empty)}article.appendChild(docs);

      const verification=document.createElement('section');verification.className='hl-admin__credential-verification';
      const verifyGrid=document.createElement('div');verifyGrid.className='hl-admin__credential-verification-grid';
      const sourceLabel=document.createElement('label');uiLocale.setMessage(sourceLabel, uiLocale.message('جهة التحقق الرسمية'));const source=document.createElement('select');uiLocale.setAttribute(source, "aria-label", 'جهة التحقق الرسمية');reviewState.catalog.forEach(entry=>{const option=document.createElement('option');option.value=entry.source;uiLocale.setMessage(option, `${entry.source} · ${entry.name}`);source.appendChild(option)});sourceLabel.appendChild(source);
      const referenceLabel=document.createElement('label');uiLocale.setMessage(referenceLabel, uiLocale.message('رقم/مرجع التحقق'));const reference=document.createElement('input');reference.placeholder=uiLocale.t('أدخل المرجع الظاهر في المصدر الرسمي');uiLocale.setAttribute(reference, "aria-label", 'مرجع التحقق الرسمي');referenceLabel.appendChild(reference);verifyGrid.append(sourceLabel,referenceLabel);verification.appendChild(verifyGrid);
      const sourceNote=document.createElement('small'),evidenceState=document.createElement('small');const verifyActions=document.createElement('div');verifyActions.className='hl-admin__credential-verify-actions';const openOfficial=document.createElement('button');openOfficial.type='button';uiLocale.setMessage(openOfficial, uiLocale.message('فتح التحقق الرسمي'));const saveEvidence=document.createElement('button');saveEvidence.type='button';uiLocale.setMessage(saveEvidence, uiLocale.message('حفظ دليل التحقق'));verifyActions.append(openOfficial,saveEvidence);verification.append(sourceNote,verifyActions,evidenceState);article.appendChild(verification);

      const actions=document.createElement('div');actions.className='hl-admin__credential-actions';const reason=document.createElement('input');reason.placeholder=uiLocale.t('سبب الرفض (5 أحرف على الأقل)');uiLocale.setAttribute(reason, "aria-label", 'سبب رفض الشهادة');const approve=document.createElement('button');approve.type='button';uiLocale.setMessage(approve, uiLocale.message('اعتماد الشهادة'));const reject=document.createElement('button');reject.type='button';uiLocale.setMessage(reject, uiLocale.message('رفض الشهادة'));actions.append(reason,approve,reject);article.appendChild(actions);

      const evidenceReady=()=>Boolean(credential.externalVerificationEvidenceRecordedAt);
      const syncEvidenceUi=()=>{const entry=selectedCatalogEntry(source);if(!entry){openOfficial.disabled=true;saveEvidence.disabled=true;approve.disabled=true;uiLocale.setMessage(sourceNote, uiLocale.message('تعذر تحميل قائمة جهات التحقق الرسمية.'));uiLocale.setMessage(evidenceState, '');return}openOfficial.disabled=false;saveEvidence.disabled=false;const professionalBoundary=entry.source!=='SWSDF'&&Array.isArray(entry.scope)&&entry.scope.includes('PROFESSIONAL')?uiLocale.t(' الشهادة الدولية لا تغني عن رخصة SWSDF للمحترف داخل السعودية.'):'';uiLocale.setMessage(sourceNote, `${entry.saudiEvidence||''}${professionalBoundary}`);approve.disabled=!evidenceReady();evidenceState.className=evidenceReady()?'ready':'required';uiLocale.setMessage(evidenceState, (evidenceReady() ? uiLocale.message("✓ دليل تحقق محفوظ{0}", [(credential.externalVerificationEvidenceRecordedAt ? ` · ${new Date(credential.externalVerificationEvidenceRecordedAt).toLocaleString('ar-SA')}` : '')]) : uiLocale.message('يلزم حفظ دليل تحقق رسمي قبل الاعتماد.')))};
      source.addEventListener('change',syncEvidenceUi);openOfficial.addEventListener('click',()=>{const entry=selectedCatalogEntry(source);if(entry?.verificationUrl)window.open(entry.verificationUrl,'_blank','noopener,noreferrer')});
      saveEvidence.addEventListener('click',async()=>{const entry=selectedCatalogEntry(source),value=reference.value.trim();if(!entry)return;if(value.length<3){toast(uiLocale.message('أدخل مرجع تحقق من 3 أحرف على الأقل'));reference.focus();return}saveEvidence.disabled=true;try{const result=await api(`/credentials/admin/${encodeURIComponent(credential.id)}/external-verification-evidence`,{method:'POST',body:JSON.stringify({source:entry.source,method:entry.methods?.[0],reference:value,verificationUrl:entry.verificationUrl})});credential.externalVerificationEvidenceRecordedAt=result?.evidence?.checkedAt||new Date().toISOString();syncEvidenceUi();toast(uiLocale.message('تم حفظ دليل التحقق الرسمي'))}catch(error){toast((localErrorMessage(error) || uiLocale.message('تعذر حفظ دليل التحقق')))}finally{saveEvidence.disabled=false}});
      const decide=async(outcome)=>{const rejectionReason=reason.value.trim();if(outcome==='VERIFIED'&&!evidenceReady()){toast(uiLocale.message('احفظ دليل التحقق الرسمي قبل اعتماد الشهادة'));return}if(outcome==='REJECTED'&&rejectionReason.length<5){toast(uiLocale.message('اكتب سبب رفض من 5 أحرف على الأقل'));reason.focus();return}approve.disabled=true;reject.disabled=true;try{await api(`/credentials/admin/${encodeURIComponent(credential.id)}/decision`,{method:'POST',body:JSON.stringify({outcome,...(outcome==='REJECTED'?{reason:rejectionReason}:{})})});toast((outcome==='VERIFIED' ? uiLocale.message('تم اعتماد الشهادة') : uiLocale.message('تم رفض الشهادة')));await refreshCredentialReviews()}catch(error){toast((localErrorMessage(error) || uiLocale.message('تعذر تحديث الشهادة')))}finally{reject.disabled=false;if(outcome!=='VERIFIED')syncEvidenceUi()}};
      approve.addEventListener('click',()=>void decide('VERIFIED'));reject.addEventListener('click',()=>void decide('REJECTED'));syncEvidenceUi();list.appendChild(article);
    });
  }

  async function refreshCredentialReviews(){const state=box.querySelector('[data-credential-review-state]');if(!window.HydrolandAuth?.isAuthenticated?.()){if(state)uiLocale.setMessage(state, uiLocale.message('يتطلب دخول إداري'));renderCredentialReviews([]);return}if(state)uiLocale.setMessage(state, uiLocale.message('جارٍ التحديث'));try{const [rows,catalog]=await Promise.all([api('/credentials/admin/pending'),api('/credentials/verification-organizations')]);reviewState.catalog=Array.isArray(catalog)?catalog:[];renderCredentialReviews(Array.isArray(rows)?rows:[]);if(state)uiLocale.setMessage(state, uiLocale.message('متصل بالخادم'))}catch(error){reviewState.catalog=[];if(state)uiLocale.setMessage(state, (error?.message==='AUTH_REQUIRED' ? uiLocale.message('يتطلب دخول إداري') : uiLocale.message('تعذر التحميل')));renderCredentialReviews([])}}

  async function refreshAdminOverview(){const token=window.HydrolandAuth?.getAccessToken?.();const state=box.querySelector('[data-admin-state]');if(!token){if(state)uiLocale.setMessage(state, uiLocale.message('يتطلب دخول إداري'));setNotice(uiLocale.message('سجّل الدخول بحساب إداري لعرض البيانات الفعلية.'));await refreshCredentialReviews();return;}if(state)uiLocale.setMessage(state, uiLocale.message('جارٍ التحديث'));try{const headers={Authorization:'Bearer '+token};const overviewResponse=await fetch(getBase()+'/admin/overview',{headers});if(!overviewResponse.ok)throw new Error('overview unavailable');const overview=await overviewResponse.json();Object.keys(overview).forEach(key=>{const metric=box.querySelector('[data-admin-metric="'+key+'"]');if(metric)uiLocale.setMessage(metric, String(overview[key]));});const queueResponse=await fetch(getBase()+'/admin/review-queue',{headers});if(queueResponse.ok)renderQueue(await queueResponse.json());if(state)uiLocale.setMessage(state, uiLocale.message('متصل بالخادم'));setNotice(uiLocale.message('تم تحديث بيانات الإدارة من خادم HYDROLAND.'));window.HydrolandOperationsCalendar?.reload?.();window.HydrolandPolicyAdmin?.reload?.();}catch(_){if(state)uiLocale.setMessage(state, uiLocale.message('تعذر الاتصال'));setNotice(uiLocale.message('تعذر الوصول لخادم الإدارة. تأكد من تشغيل واجهة API وتسجيل الدخول بحساب إداري.'));}finally{await refreshCredentialReviews()}}
  const show=()=>{box.hidden=false;refreshAdminOverview();};const hide=()=>{box.hidden=true;};
  document.addEventListener('hydroland:role-changed',event=>{if(event.detail?.role==='admin')show();else hide();});
  document.addEventListener('hydroland:auth-changed',()=>{if(!box.hidden)refreshAdminOverview();});
  box.querySelector('[data-admin-refresh]')?.addEventListener('click',refreshAdminOverview);
})();
