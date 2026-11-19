(()=>{
  // Only authored interface text is localized. Account and business values stay opaque.
  const uiLocale = (typeof window==='undefined'?globalThis:window).HydrolandI18n?.createScope("administrative-affairs", {
  "رقم الوارد أو كلمة من الموضوع": "Incoming reference or a word from the subject",
  "ADMINISTRATIVE AFFAIRS · الوارد والصادر": "ADMINISTRATIVE AFFAIRS · Incoming and outgoing records",
  "سجل المعاملات والإحالات": "Transaction and referral register",
  "كل معاملة مرتبطة بنسختها الموقعة وسجلها التشغيلي. تعتمد الصلاحيات النهائية من الخادم.": "Each transaction is linked to its signed version and operational log. Final permissions are determined by the server.",
  "تحديث": "Refresh",
  "الجهة": "Organization",
  "بحث بالمرجع أو الموضوع": "Search by reference or subject",
  "الحالة": "Status",
  "كل الحالات": "All statuses",
  "مسودة": "Draft",
  "مسجلة": "Registered",
  "مؤرشفة": "Archived",
  "بحث وتحديث": "Search and refresh",
  "إدارة المستندات الرسمية": "Official document management",
  "تسجيل مستند وارد أو صادر": "Register an incoming or outgoing document",
  "اختر مستندًا موقّعًا محفوظًا في إدارة الشؤون الإدارية؛ تحفظ المنصة مرجع النسخة وبصمتها دون إنشاء نسخة محتوى ثانية.": "Select a signed document saved under administrative affairs. The platform retains its version reference and hash without creating a second content copy.",
  "المستند الموقّع": "Signed document",
  "وحدة التسجيل": "Registering unit",
  "إنشاء سجل": "Create record",
  "خدمة المصادقة غير جاهزة.": "Authentication service is not ready.",
  "رفض الخادم العملية بسبب صلاحية الحساب أو نطاق الجهة.": "The server rejected the operation because of account authority or organization scope.",
  "تغيّرت حالة السجل؛ حدّث البيانات وأعد الإجراء.": "Record status changed. Refresh the data and retry the action.",
  "انتهت الجلسة؛ سجّل الدخول ثم حدّث الصفحة.": "Session expired. Sign in, then refresh the page.",
  "تعذر إكمال الطلب.": "Could not complete the request.",
  "اختر الوحدة": "Select unit",
  "اختر الموظف": "Select employee",
  "اختر مستندًا موقّعًا": "Select a signed document",
  "لا توجد معاملات مطابقة. اختر مستندًا موقّعًا لإنشاء سجل، أو غيّر البحث.": "No matching transactions. Select a signed document to create a record, or change the search.",
  "\">تفاصيل وسجل التشغيل": "Details and activity history",
  "تفاصيل وسجل التشغيل": "Details and activity history",
  "المستند المصدر:": "Source document:",
  "· الإصدار": "· Version",
  "إنشاء سجل من نسخة موقعة": "Create record from a signed version",
  "تسجيل المعاملة": "Register transaction",
  "إحالة المعاملة": "Refer transaction",
  "تعيين مسؤول": "Assign responsible person",
  "تسجيل الرد": "Record reply",
  "قرار قبول الإحالة": "Accept referral decision",
  "قرار رفض الإحالة": "Reject referral decision",
  "تأكيد التسليم": "Confirm handover",
  "أرشفة السجل": "Archive record",
  "مقبول": "Accepted",
  "مرفوض": "Rejected",
  "بانتظار القرار": "Awaiting decision",
  "إحالة إلى": "Refer to",
  "الحالة:": "Status:",
  "· تم التسليم في": "· Delivered on",
  "· لم يؤكد التسليم": "· Delivery not confirmed",
  "الرد:": "Reply:",
  "لم يسجل رد بعد": "No reply recorded",
  "المسؤول:": "Responsible person:",
  "غير معيّن": "Unassigned",
  "تعيين موظف<select data-a09-assignee=\"": "Assign employee",
  "تعيين موظف": "Assign employee",
  "\">تعيين": "Assign",
  "تعيين": "Assign",
  "الرد الموثق<textarea data-a09-reply=\"": "Documented reply",
  "الرد الموثق": "Documented reply",
  "\">حفظ الرد": "Save reply",
  "حفظ الرد": "Save reply",
  "\">قبول الإحالة": "Accept referral",
  "قبول الإحالة": "Accept referral",
  "\">رفض الإحالة": "Reject referral",
  "رفض الإحالة": "Reject referral",
  "\">تأكيد التسليم": "Confirm delivery",
  "الإحالة": "Referral",
  "· الرد": "· Reply",
  "· القرار": "· Decision",
  "لا توجد أحداث مسجلة.": "No recorded events.",
  "المرجع": "Reference",
  "· الوحدة": "· Unit",
  "· تم الإنشاء": "· Created",
  "المصدر الرسمي:": "Official source:",
  "· رقم المرجع": "· Reference number",
  "· الإصدار المثبت": "· Pinned version",
  "بصمة النسخة:": "Version hash:",
  "بصمة سجل الإصدار:": "Revision-record hash:",
  "غير متاحة": "Unavailable",
  "مراجع المرفقات:": "Attachment references:",
  "لا توجد مراجع مرفقات": "No attachment references",
  "الاحتفاظ: تحفظ النسخة المؤرشفة وسجل الإصدار دون حذف؛ لا يفرض النظام مدة احتفاظ من عنده. يسجل المرجع المعتمد في نموذج جدول الاحتفاظ بالشؤون الإدارية.": "Retention: the archived version and revision record are retained without deletion. The system does not invent a retention period. Record the approved reference in the administrative retention schedule.",
  "\">تسجيل الوارد": "Register incoming item",
  "تسجيل الوارد": "Register incoming item",
  "إحالة إلى وحدة": "Refer to a unit",
  "إنشاء إحالة": "Create referral",
  "\">أرشفة بعد اكتمال التسليمات": "Archive after all handovers are complete",
  "أرشفة بعد اكتمال التسليمات": "Archive after all handovers are complete",
  "الإحالات والردود والقرارات والتسليم": "Referrals, replies, decisions and handover",
  "لا توجد إحالات بعد.": "No referrals yet.",
  "سجل التشغيل والتدقيق": "Activity and audit log",
  "جارٍ تحميل سجل المعاملات والصلاحيات...": "Loading the transaction register and permissions...",
  "تم تحميل": "Loaded",
  "سجل · الجهة:": "records · Organization:",
  "جارٍ البحث...": "Searching...",
  "نتائج البحث:": "Search results:",
  "جارٍ قراءة الجهات المتاحة...": "Reading available organizations...",
  "لا توجد جهة نشطة متاحة لهذا الحساب.": "No active organization is available for this account.",
  "تم تحميل الإصدار المثبت وسجل التشغيل.": "Pinned version and activity log loaded.",
  "اختر الموظف المسؤول.": "Select the responsible employee.",
  "تم تنفيذ الإجراء وتحديث السجل.": "Action completed and register refreshed.",
  "اختر مستندًا موقّعًا ووحدة التسجيل.": "Select a signed document and registering unit.",
  "تم إنشاء سجل مرتبط بالنسخة الموقعة.": "Record created and linked to the signed version.",
  "تم إنشاء الإحالة.": "Referral created.",
  " · تم التسليم في {0}": " · Delivered on {0}",
  " · لم يؤكد التسليم": " · Delivery not confirmed",
  "تم تحميل {0} سجل · الجهة: {1}.": "Loaded {0} records · Organization: {1}.",
  "نتائج البحث: {0}.": "Search results: {0}."
}) || {t:value=>value,message(text,values=[]){return this.format(text,values)},messageHTML(value){return String(value??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},setMessage:(node,value)=>(node.textContent=value??''),attribute(name,text,values=[]){return name+'="'+this.format(text,values).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))+'"'},label(value,values=[]){return this.format(String(value??''),values).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))},format:(text,values=[])=>text.replace(/\{(\d+)\}/g,(token,i)=>i<values.length?String(values[i]??''):token),html:(parts,...values)=>parts.map((part,i)=>part+(i<values.length?String(values[i]??''):'')).join(''),bind:()=>{},setHTML:(node,value)=>(node.innerHTML=value),insertHTML:(node,position,value)=>node.insertAdjacentHTML(position,value),setText(node,text,values=[]){return node.textContent=this.format(text,values)},setAttribute(node,name,text,values=[]){node.setAttribute(name,this.format(text,values))}};

  // Local error identity retains authored text; server/provider messages stay opaque.
  const authoredErrors=new WeakMap();
  const localError=message=>{const error=new Error(String(message));authoredErrors.set(error,message);return error;};
  const localErrorMessage=error=>authoredErrors.get(error) ?? error?.message;

  const authoredStatusLabel = (s) => (((value=>value===undefined?value:uiLocale.message(value))({DRAFT:'مسودة',REGISTERED:'مسجلة',ARCHIVED:'مؤرشفة'}[s]) || s) || '—');
  const authoredActionLabel = (a) => ((value=>value===undefined?value:uiLocale.message(value))({ADMIN_RECORD_CREATED_FROM_DOCUMENT:'إنشاء سجل من نسخة موقعة',ADMIN_RECORD_REGISTERED:'تسجيل المعاملة',ADMIN_ROUTING_CREATED:'إحالة المعاملة',ADMIN_ROUTING_ASSIGNED:'تعيين مسؤول',ADMIN_ROUTING_REPLIED:'تسجيل الرد',ADMIN_ROUTING_APPROVE:'قرار قبول الإحالة',ADMIN_ROUTING_REJECT:'قرار رفض الإحالة',ADMIN_ROUTING_DELIVERED:'تأكيد التسليم',ADMIN_RECORD_ARCHIVED:'أرشفة السجل'}[a]) || a);

  const host=document.getElementById('role-console');
  if(!host||document.getElementById('hl-admin-affairs'))return;
  const style=document.createElement('style');
  uiLocale.setMessage(style, '.hl-a09{margin:1rem 0;padding:1rem;border:1px solid rgba(120,191,224,.2);border-radius:18px;background:rgba(3,25,39,.94);color:#eaf5fa}.hl-a09[hidden]{display:none}.hl-a09 header,.hl-a09 .a09-row,.hl-a09 .a09-actions{display:flex;gap:.65rem;align-items:center;justify-content:space-between;flex-wrap:wrap}.hl-a09 h3,.hl-a09 h4{margin:.3rem 0}.hl-a09 p,.hl-a09 small{color:#a9c1ce}.hl-a09 label{display:grid;gap:.35rem;min-width:170px;flex:1}.hl-a09 input,.hl-a09 select,.hl-a09 textarea{box-sizing:border-box;width:100%;padding:.65rem;border:1px solid rgba(120,191,224,.3);border-radius:10px;background:#08283b;color:#eff8fb}.hl-a09 button{border:1px solid rgba(120,191,224,.35);border-radius:10px;padding:.6rem .9rem;background:#103d56;color:#eff8fb;cursor:pointer}.hl-a09 button.primary{background:#126878}.hl-a09 .a09-card{margin:.7rem 0;padding:.8rem;border:1px solid rgba(120,191,224,.16);border-radius:14px;background:rgba(7,38,55,.76)}.hl-a09 .a09-route{margin:.5rem 0;padding:.65rem;border-inline-start:3px solid #52a6b4;background:rgba(5,28,42,.72);border-radius:8px}.hl-a09 .a09-note[role=status]{min-height:1.4em;color:#e5c889}.hl-a09 .a09-audit{border-top:1px solid rgba(120,191,224,.14);padding:.35rem 0;font-size:.9rem}.hl-a09 .a09-hash{overflow-wrap:anywhere;font-size:.78rem;color:#a8c2d0}.hl-a09 .a09-toolbar{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.6rem;margin:.6rem 0}.hl-a09 [data-a09-detail] section{margin:.7rem 0}');
  document.head.appendChild(style);
  const panel=document.createElement('section');
  panel.id='hl-admin-affairs';panel.className='hl-a09';panel.hidden=true;
  uiLocale.setHTML(panel, uiLocale.html`<header><div><small>ADMINISTRATIVE AFFAIRS · الوارد والصادر</small><h3>سجل المعاملات والإحالات</h3><p>كل معاملة مرتبطة بنسختها الموقعة وسجلها التشغيلي. تعتمد الصلاحيات النهائية من الخادم.</p></div><button type="button" data-a09-refresh>تحديث</button></header><div class="a09-toolbar"><label>الجهة<select data-a09-org></select></label><label>بحث بالمرجع أو الموضوع<input data-a09-query maxlength="160" placeholder="رقم الوارد أو كلمة من الموضوع"></label><label>الحالة<select data-a09-status><option value="">كل الحالات</option><option value="DRAFT">مسودة</option><option value="REGISTERED">مسجلة</option><option value="ARCHIVED">مؤرشفة</option></select></label></div><div class="a09-actions"><button type="button" data-a09-search>بحث وتحديث</button><button type="button" data-a09-open-docs>إدارة المستندات الرسمية</button></div><form class="a09-card" data-a09-create><h4>تسجيل مستند وارد أو صادر</h4><p>اختر مستندًا موقّعًا محفوظًا في إدارة الشؤون الإدارية؛ تحفظ المنصة مرجع النسخة وبصمتها دون إنشاء نسخة محتوى ثانية.</p><div class="a09-row"><label>المستند الموقّع<select data-a09-document required></select></label><label>وحدة التسجيل<select data-a09-unit required></select></label><button class="primary" type="submit">إنشاء سجل</button></div></form><p class="a09-note" role="status" data-a09-note aria-live="polite"></p><div data-a09-records></div><div data-a09-detail></div>`);
  const documentsPanel=document.getElementById('hl-documents');
  if(documentsPanel)documentsPanel.insertAdjacentElement('afterend',panel);else host.insertAdjacentElement('afterend',panel);
  const q=s=>panel.querySelector(s),state={generation:0,orgId:null,memberships:[],units:[],documents:[],members:[],records:[],detail:null};
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const session=()=>window.HydrolandAuth?.getSessionVersion?.();
  const current=c=>c.generation===state.generation&&c.orgId===state.orgId&&c.session===session()&&Boolean(window.HydrolandAuth?.isAuthenticated?.());
  const note=s=>{const el=q('[data-a09-note]');if(el)uiLocale.setMessage(el, (s || ''));};
  const api=async(path,options={})=>{
    const send=window.HydrolandAuth?.authorizedFetch;
    if(!send)throw localError(uiLocale.message('خدمة المصادقة غير جاهزة.'));
    const response=await send(path,options);
    const body=(response.headers.get('content-type')||'').includes('application/json')?await response.json().catch(()=>null):null;
    if(!response.ok){const error=new Error(body?.message||('HTTP '+response.status));error.status=response.status;throw error;}
    return body;
  };
  const fail=e=>e?.status===403?uiLocale.t('رفض الخادم العملية بسبب صلاحية الحساب أو نطاق الجهة.'):e?.status===409?uiLocale.t('تغيّرت حالة السجل؛ حدّث البيانات وأعد الإجراء.'):e?.status===401?uiLocale.t('انتهت الجلسة؛ سجّل الدخول ثم حدّث الصفحة.'):(e instanceof Error?e.message:uiLocale.t('تعذر إكمال الطلب.'));
  const orgLabel=id=>state.memberships.find(x=>x.organization?.id===id)?.organization?.displayName||id;
  const unitLabel=id=>{const u=state.units.find(x=>x.id===id);return u?(u.nameAr||u.nameEn||u.code||id):id;};
  const statusLabel=s=>({DRAFT:'مسودة',REGISTERED:'مسجلة',ARCHIVED:'مؤرشفة'}[s]||s||'—');
  const dateLabel=d=>{const n=new Date(d);return Number.isNaN(n.getTime())?'—':n.toLocaleString('ar-SA');};
  const unitOptions=selected=>uiLocale.html`<option value="">اختر الوحدة</option>${state.units.map(u=>uiLocale.html`<option value="${esc(u.id)}"${u.id===selected?' selected':''}>${esc(u.nameAr||u.nameEn||u.code)} · ${esc(u.type||'')}</option>`).join('')}`;
  const memberOptions=selected=>uiLocale.html`<option value="">اختر الموظف</option>${state.members.map(m=>{const a=m.account||{},p=a.person||{},name=[p.firstName,p.lastName].filter(Boolean).join(' ')||a.email||a.id;return uiLocale.html`<option value="${esc(a.id||m.accountId)}"${(a.id||m.accountId)===selected?' selected':''}>${esc(name)}</option>`;}).join('')}`;
  function renderSources(){
    const sel=q('[data-a09-document]');
    const docs=state.documents.filter(d=>d.status==='SIGNED'&&(d.department==='ADMIN_AFFAIRS_RECORDS'||d.template?.department==='ADMIN_AFFAIRS_RECORDS'));
    uiLocale.setHTML(sel, uiLocale.html`<option value="">اختر مستندًا موقّعًا</option>${docs.map(d=>uiLocale.html`<option value="${esc(d.id)}">${esc(d.template?.titleAr||d.referenceNumber)} · ${esc(d.referenceNumber)} · v${esc(d.version)}</option>`).join('')}`);
    uiLocale.setHTML(q('[data-a09-unit]'), unitOptions());
  }
  function renderRecords(){
    const target=q('[data-a09-records]');
    if(!state.records.length){uiLocale.setHTML(target, uiLocale.html`<article class="a09-card"><p>لا توجد معاملات مطابقة. اختر مستندًا موقّعًا لإنشاء سجل، أو غيّر البحث.</p></article>`);return;}
    uiLocale.setHTML(target, state.records.map(r=>uiLocale.html`<article class="a09-card"><div class="a09-row"><div><strong>${esc(r.subject||r.referenceNumber)}</strong><div class="a09-meta">${esc(r.referenceNumber)} · ${esc(r.type)} · ${esc(unitLabel(r.unitId))}</div></div><span>${uiLocale.messageHTML(authoredStatusLabel(r.status))}</span><button type="button" data-a09-action="detail" data-record="${esc(r.id)}">تفاصيل وسجل التشغيل</button></div><small>المستند المصدر: ${esc(r.managedDocument?.template?.titleAr||r.managedDocument?.referenceNumber||'—')} · الإصدار ${esc(r.managedDocumentVersion||'—')}</small></article>`).join(''));
  }
  const actionLabel=a=>({ADMIN_RECORD_CREATED_FROM_DOCUMENT:'إنشاء سجل من نسخة موقعة',ADMIN_RECORD_REGISTERED:'تسجيل المعاملة',ADMIN_ROUTING_CREATED:'إحالة المعاملة',ADMIN_ROUTING_ASSIGNED:'تعيين مسؤول',ADMIN_ROUTING_REPLIED:'تسجيل الرد',ADMIN_ROUTING_APPROVE:'قرار قبول الإحالة',ADMIN_ROUTING_REJECT:'قرار رفض الإحالة',ADMIN_ROUTING_DELIVERED:'تأكيد التسليم',ADMIN_RECORD_ARCHIVED:'أرشفة السجل'}[a]||a);
  function renderDetail(r){
    state.detail=r;const box=q('[data-a09-detail]');
    if(!r){box.replaceChildren();return;}
    const source=r.managedDocument||{},rev=(source.revisions||[]).find(x=>x.version===r.managedDocumentVersion);
    const attachments=Array.isArray(source.payload?.attachmentRefs)?source.payload.attachmentRefs:[];
    const audit=Array.isArray(r.auditEvents)?r.auditEvents:[];
    const routing=(r.routings||[]).map(x=>{
      const decision=x.decision==='APPROVE'?'مقبول':x.decision==='REJECT'?'مرفوض':'بانتظار القرار';
      return uiLocale.html`<article class="a09-route"><strong>إحالة إلى ${esc(unitLabel(x.toUnitId))}</strong><div>الحالة: ${uiLocale.messageHTML(uiLocale.message(decision))}${uiLocale.messageHTML((x.deliveredAt ? uiLocale.message(" · تم التسليم في {0}", [dateLabel(x.deliveredAt)]) : uiLocale.message(' · لم يؤكد التسليم')))}</div><p>الرد: ${uiLocale.messageHTML((x.replyText || uiLocale.message('لم يسجل رد بعد')))}</p><small>المسؤول: ${uiLocale.messageHTML(((state.members.find(m=>(m.account?.id||m.accountId)===x.assignedToAccountId)?.account?.person?.firstName || x.assignedToAccountId) || uiLocale.message('غير معيّن')))}</small><div class="a09-row"><label>تعيين موظف<select data-a09-assignee="${esc(x.id)}">${memberOptions(x.assignedToAccountId)}</select></label><button type="button" data-a09-action="assign" data-routing="${esc(x.id)}">تعيين</button></div><label>الرد الموثق<textarea data-a09-reply="${esc(x.id)}" rows="2" maxlength="5000"></textarea></label><div class="a09-actions"><button type="button" data-a09-action="reply" data-routing="${esc(x.id)}">حفظ الرد</button><button type="button" data-a09-action="approve" data-routing="${esc(x.id)}">قبول الإحالة</button><button type="button" data-a09-action="reject" data-routing="${esc(x.id)}">رفض الإحالة</button><button type="button" data-a09-action="deliver" data-routing="${esc(x.id)}">تأكيد التسليم</button></div><small>الإحالة ${esc(dateLabel(x.createdAt))} · الرد ${esc(dateLabel(x.repliedAt))} · القرار ${esc(dateLabel(x.decidedAt))}</small></article>`;
    }).join('');
    const timeline=audit.map(x=>uiLocale.html`<div class="a09-audit"><strong>${uiLocale.messageHTML(authoredActionLabel(x.action))}</strong><small> · ${esc(dateLabel(x.occurredAt))}</small></div>`).join('')||uiLocale.html`<p>لا توجد أحداث مسجلة.</p>`;
    uiLocale.setHTML(box, uiLocale.html`<article class="a09-card"><div class="a09-row"><h4>${esc(r.subject||r.referenceNumber)}</h4><span>${uiLocale.messageHTML(authoredStatusLabel(r.status))}</span></div><p>المرجع ${esc(r.referenceNumber)} · الوحدة ${esc(unitLabel(r.unitId))} · تم الإنشاء ${esc(dateLabel(r.createdAt))}</p><p>المصدر الرسمي: ${esc(source.template?.titleAr||source.referenceNumber||'—')} · رقم المرجع ${esc(source.referenceNumber||'—')} · الإصدار المثبت ${esc(r.managedDocumentVersion||'—')}</p><p class="a09-hash">بصمة النسخة: ${esc(r.managedDocumentContentHash||'—')}<br>بصمة سجل الإصدار: ${uiLocale.messageHTML((rev?.contentHash || uiLocale.message('غير متاحة')))}</p><p>مراجع المرفقات: ${uiLocale.messageHTML((attachments.join('، ') || uiLocale.message('لا توجد مراجع مرفقات')))}</p><p>الاحتفاظ: تحفظ النسخة المؤرشفة وسجل الإصدار دون حذف؛ لا يفرض النظام مدة احتفاظ من عنده. يسجل المرجع المعتمد في نموذج جدول الاحتفاظ بالشؤون الإدارية.</p>${r.status==='DRAFT'?uiLocale.html`<button type="button" data-a09-action="register" data-record="${esc(r.id)}">تسجيل الوارد</button>`:''}${r.status==='REGISTERED'?uiLocale.html`<form class="a09-row" data-a09-form="route" data-record="${esc(r.id)}"><label>إحالة إلى وحدة<select data-a09-route-unit required>${unitOptions()}</select></label><button class="primary" type="submit">إنشاء إحالة</button></form><button type="button" data-a09-action="archive" data-record="${esc(r.id)}">أرشفة بعد اكتمال التسليمات</button>`:''}<section><h4>الإحالات والردود والقرارات والتسليم</h4>${routing||uiLocale.html`<p>لا توجد إحالات بعد.</p>`}</section><section><h4>سجل التشغيل والتدقيق</h4>${timeline}</section></article>`);
  }
  async function loadOrganization(id){
    if(!id)return;
    state.generation++;state.orgId=id;const c={generation:state.generation,orgId:id,session:session()};state.detail=null;renderDetail(null);note(uiLocale.message('جارٍ تحميل سجل المعاملات والصلاحيات...'));
    try{
      const query='?organizationId='+encodeURIComponent(id);
      const results=await Promise.all([
        api('/administrative-affairs/units'+query),
        api('/administrative-affairs/records'+query+'&status='+encodeURIComponent(q('[data-a09-status]').value)),
        api('/documents/organizations/'+encodeURIComponent(id)+'/list').catch(()=>[]),
        api('/organizations/'+encodeURIComponent(id)+'/members').catch(()=>[])
      ]);
      if(!current(c))return;
      state.units=Array.isArray(results[0])?results[0]:[];
      state.records=Array.isArray(results[1])?results[1]:[];
      state.documents=Array.isArray(results[2])?results[2]:[];
      state.members=Array.isArray(results[3])?results[3].filter(m=>m.status==='ACTIVE'):[];
      renderSources();renderRecords();note(uiLocale.message("تم تحميل {0} سجل · الجهة: {1}.", [state.records.length, orgLabel(id)]));
    }catch(error){if(current(c)){state.records=[];renderRecords();note(fail(error));}}
  }
  async function searchRecords(){
    const id=state.orgId;if(!id)return;
    state.generation++;const c={generation:state.generation,orgId:id,session:session()};note(uiLocale.message('جارٍ البحث...'));
    try{
      const params=new URLSearchParams({organizationId:id,status:q('[data-a09-status]').value,q:q('[data-a09-query]').value.trim()});
      state.records=await api('/administrative-affairs/records?'+params.toString());
      if(!current(c))return;renderRecords();renderDetail(null);note(uiLocale.message("نتائج البحث: {0}.", [state.records.length]));
    }catch(error){if(current(c))note(fail(error));}
  }
  async function refresh(){
    state.generation++;const c={generation:state.generation,orgId:state.orgId,session:session()};
    if(!window.HydrolandAuth?.isAuthenticated?.()){panel.hidden=true;state.memberships=[];state.orgId=null;state.records=[];renderDetail(null);return;}
    note(uiLocale.message('جارٍ قراءة الجهات المتاحة...'));
    try{
      const memberships=await api('/documents/workspace');
      if(!current(c))return;
      state.memberships=(Array.isArray(memberships)?memberships:[]).filter(x=>x.status==='ACTIVE'&&x.organization?.id);
      const select=q('[data-a09-org]');
      uiLocale.setHTML(select, state.memberships.map(x=>uiLocale.html`<option value="${esc(x.organization.id)}">${esc(x.organization.displayName)} · ${esc(x.role)}</option>`).join(''));
      if(!state.memberships.length){state.orgId=null;note(uiLocale.message('لا توجد جهة نشطة متاحة لهذا الحساب.'));return;}
      const id=state.memberships.some(x=>x.organization.id===state.orgId)?state.orgId:state.memberships[0].organization.id;
      select.value=id;await loadOrganization(id);
    }catch(error){if(current(c))note(fail(error));}
  }
  async function act(button){
    if(button.disabled)return;button.disabled=true;const id=state.orgId,rid=button.dataset.routing,record=button.dataset.record,detailId=state.detail?.id||record;
    try{
      if(button.dataset.a09Action==='detail'){const detail=await api('/administrative-affairs/records/'+encodeURIComponent(record));if(id!==state.orgId)return;renderDetail(detail);note(uiLocale.message('تم تحميل الإصدار المثبت وسجل التشغيل.'));return;}
      if(button.dataset.a09Action==='register')await api('/administrative-affairs/records/'+encodeURIComponent(record)+'/register',{method:'PATCH'});
      else if(button.dataset.a09Action==='archive')await api('/administrative-affairs/records/'+encodeURIComponent(record)+'/archive',{method:'PATCH'});
      else if(button.dataset.a09Action==='assign'){const value=q('[data-a09-assignee="'+CSS.escape(rid)+'"]')?.value;if(!value)throw localError(uiLocale.message('اختر الموظف المسؤول.'));await api('/administrative-affairs/routings/'+encodeURIComponent(rid)+'/assign',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({assigneeAccountId:value})});}
      else if(button.dataset.a09Action==='reply'){const value=q('[data-a09-reply="'+CSS.escape(rid)+'"]')?.value||'';await api('/administrative-affairs/routings/'+encodeURIComponent(rid)+'/reply',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({replyText:value})});}
      else if(button.dataset.a09Action==='approve'||button.dataset.a09Action==='reject'){const decision=button.dataset.a09Action==='approve'?'APPROVE':'REJECT';await api('/administrative-affairs/routings/'+encodeURIComponent(rid)+'/decision',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({decision})});}
      else if(button.dataset.a09Action==='deliver')await api('/administrative-affairs/routings/'+encodeURIComponent(rid)+'/deliver',{method:'PATCH'});
      await loadOrganization(id);
      const selected=state.records.find(x=>x.id===detailId);
      if(selected)renderDetail(await api('/administrative-affairs/records/'+encodeURIComponent(selected.id)));
      note(uiLocale.message('تم تنفيذ الإجراء وتحديث السجل.'));
    }catch(error){note(fail(error));}
    finally{button.disabled=false;}
  }
  panel.addEventListener('change',event=>{
    const el=event.target;
    if(el.matches('[data-a09-org]')){state.orgId=el.value;void loadOrganization(el.value);}
  });
  panel.addEventListener('submit',async event=>{
    const form=event.target.closest('form[data-a09-form],form[data-a09-create]');
    if(!form)return;event.preventDefault();
    const id=state.orgId;
    try{
      if(form.matches('[data-a09-create]')){
        const managedDocumentId=q('[data-a09-document]').value,unitId=q('[data-a09-unit]').value;
        if(!managedDocumentId||!unitId)throw localError(uiLocale.message('اختر مستندًا موقّعًا ووحدة التسجيل.'));
        await api('/administrative-affairs/records',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId:id,unitId,managedDocumentId})});
        form.reset();await loadOrganization(id);note(uiLocale.message('تم إنشاء سجل مرتبط بالنسخة الموقعة.'));
      }else if(form.dataset.a09Form==='route'){
        const record=form.dataset.record,toUnitId=form.querySelector('[data-a09-route-unit]').value;
        await api('/administrative-affairs/records/'+encodeURIComponent(record)+'/routings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({toUnitId})});
        await loadOrganization(id);const detail=await api('/administrative-affairs/records/'+encodeURIComponent(record));renderDetail(detail);note(uiLocale.message('تم إنشاء الإحالة.'));
      }
    }catch(error){note(fail(error));}
  });
  panel.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button)return;
    if(button.matches('[data-a09-refresh]'))void refresh();
    else if(button.matches('[data-a09-search]'))void searchRecords();
    else if(button.matches('[data-a09-open-docs]'))window.HydrolandDocuments?.open?.({department:'ADMIN_AFFAIRS_RECORDS'});
    else if(button.dataset.a09Action)void act(button);
  });
  document.addEventListener('hydroland:role-changed',event=>{
    if(event.detail?.role==='organization'){panel.hidden=false;void refresh();}else panel.hidden=true;
  });
  document.addEventListener('hydroland:auth-changed',()=>{if(!window.HydrolandAuth?.isAuthenticated?.()){state.generation++;state.orgId=null;state.records=[];state.members=[];renderDetail(null);panel.hidden=true;}else if(!panel.hidden)void refresh();});
  for(const name of ['hydroland:session-cleared','hydroland:portal-cleared'])document.addEventListener(name,()=>{state.generation++;state.orgId=null;state.records=[];state.members=[];renderDetail(null);panel.hidden=true;});
  window.HydrolandAdministrativeAffairs={open:()=>{if(!window.HydrolandAuth?.isAuthenticated?.())return;panel.hidden=false;void refresh();},refresh};
  if(window.HydrolandPortalAccess?.getCurrentRole?.()==='organization'&&window.HydrolandAuth?.isAuthenticated?.()){panel.hidden=false;void refresh();}
})();